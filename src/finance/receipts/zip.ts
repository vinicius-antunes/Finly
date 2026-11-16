import { zip, Unzip, UnzipInflate, strToU8 } from "fflate";
import { validate, type State } from "../model.ts";
import { prepareBackup } from "../backup.ts";
import {
  allReceipts,
  verifyBlob,
  digest,
  TOTAL_LIMIT,
  COUNT_LIMIT,
  ZIP_LIMIT,
  type Receipt,
  type PendingReceipt,
} from "./model.ts";
import { getBlob } from "./storage.ts";
export { ZIP_LIMIT } from "./model.ts";
const JSON_LIMIT = 4 * 1024 * 1024,
  MANIFEST_LIMIT = 1024 * 1024;
type Manifest = {
  version: 1;
  exportedAt: string;
  backupSha256: string;
  count: number;
  totalBytes: number;
  attachments: {
    id: string;
    path: string;
    target: Receipt["target"];
    name: string;
    mime: string;
    size: number;
    sha256: string;
  }[];
};
const pathFor = (r: Receipt) =>
  `attachments/${[...new TextEncoder().encode(r.id)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
export async function prepareExport(s: State) {
  validate(s);
  const rows = allReceipts(s),
    pending: PendingReceipt[] = [],
    problems: string[] = [];
  for (const r of rows) {
    try {
      const blob = await getBlob(r.sha256);
      if (!blob) throw Error("arquivo ausente");
      await verifyBlob(r, blob);
      pending.push({ receipt: r, blob });
    } catch (e) {
      problems.push(
        `${r.name}: ${e instanceof Error ? e.message : "indisponível"}`,
      );
    }
  }
  return {
    pending,
    problems,
    count: rows.length,
    bytes: rows.reduce((n, r) => n + r.size, 0),
    records: s.transactions.length + (s.entryLedger?.operations.length ?? 0),
  };
}
export async function exportZip(s: State): Promise<Uint8Array<ArrayBuffer>> {
  const p = await prepareExport(s);
  if (p.problems.length)
    throw Error(
      "Backup completo bloqueado: há comprovantes ausentes ou corrompidos. " +
        p.problems.join("; "),
    );
  const backup = strToU8(JSON.stringify(s));
  if (backup.length > JSON_LIMIT) throw Error("O JSON ultrapassa 4 MiB.");
  const rows = allReceipts(s),
    paths = new Set<string>();
  const manifest: Manifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    backupSha256: await digest(backup),
    count: rows.length,
    totalBytes: p.bytes,
    attachments: rows.map((r) => ({
      id: r.id,
      path: pathFor(r),
      target: r.target,
      name: r.name,
      mime: r.mime,
      size: r.size,
      sha256: r.sha256,
    })),
  };
  const files: Record<string, Uint8Array> = {
    "backup.json": backup,
    "manifest.json": strToU8(JSON.stringify(manifest)),
  };
  if (files["manifest.json"].length > MANIFEST_LIMIT)
    throw Error("O manifesto ultrapassa 1 MiB.");
  for (const r of rows) {
    const path = pathFor(r);
    if (paths.has(path)) throw Error("Caminho de comprovante duplicado.");
    paths.add(path);
    files[path] = new Uint8Array(
      await p.pending.find((p) => p.receipt.id === r.id)!.blob.arrayBuffer(),
    );
  }
  return new Promise((resolve, reject) =>
    zip(files, { level: 0 }, (e, b) =>
      e
        ? reject(e)
        : b.length > ZIP_LIMIT
          ? reject(Error("ZIP excede 106 MiB."))
          : resolve(b as Uint8Array<ArrayBuffer>),
    ),
  );
}
/** Inspect the central directory BEFORE invoking any inflater/allocation based on untrusted sizes. ZIP64, encryption, multi-disk and duplicate/local overlapping entries are rejected. */
export function inspectZip(bytes: Uint8Array<ArrayBuffer>) {
  if (bytes.length > ZIP_LIMIT || bytes.length < 22)
    throw Error("ZIP inválido ou acima de 106 MiB.");
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (
      v.getUint32(i, true) === 0x06054b50 &&
      i + 22 + v.getUint16(i + 20, true) === bytes.length
    ) {
      end = i;
      break;
    }
  if (
    end < 0 ||
    v.getUint16(end + 4, true) !== 0 ||
    v.getUint16(end + 6, true) !== 0
  )
    throw Error("ZIP truncado ou multi-disco não suportado.");
  const count = v.getUint16(end + 10, true),
    start = v.getUint32(end + 16, true),
    length = v.getUint32(end + 12, true);
  if (
    count > COUNT_LIMIT + 2 ||
    count < 2 ||
    count !== v.getUint16(end + 8, true) ||
    start + length !== end
  )
    throw Error("Estrutura ou quantidade de arquivos ZIP inválida.");
  const decoder = new TextDecoder("utf-8", { fatal: true }),
    entries = new Map<string, number>(),
    ranges: { start: number; end: number }[] = [];
  let pos = start,
    total = 0;
  for (let i = 0; i < count; i++) {
    if (pos + 46 > end || v.getUint32(pos, true) !== 0x02014b50)
      throw Error("Diretório ZIP inválido.");
    const flags = v.getUint16(pos + 8, true),
      method = v.getUint16(pos + 10, true),
      compressed = v.getUint32(pos + 20, true),
      size = v.getUint32(pos + 24, true),
      n = v.getUint16(pos + 28, true),
      extra = v.getUint16(pos + 30, true),
      comment = v.getUint16(pos + 32, true),
      local = v.getUint32(pos + 42, true);
    if (pos + 46 + n + extra + comment > end)
      throw Error("Entrada ZIP truncada.");
    const name = decoder.decode(bytes.subarray(pos + 46, pos + 46 + n));
    const limit =
      name === "backup.json"
        ? JSON_LIMIT
        : name === "manifest.json"
          ? MANIFEST_LIMIT
          : 10 * 1024 * 1024;
    if (
      !/^(backup\.json|manifest\.json|attachments\/[a-zA-Z0-9_-]{1,4000})$/.test(
        name,
      ) ||
      entries.has(name) ||
      (flags & 1) !== 0 ||
      ![0, 8].includes(method) ||
      size > limit ||
      size === 0 ||
      compressed === 0 ||
      size / compressed > 200 ||
      v.getUint16(pos + 34, true) !== 0
    )
      throw Error(
        "Arquivo ZIP inesperado, duplicado ou limite de descompressão excedido.",
      );
    total += size;
    if (total > TOTAL_LIMIT + JSON_LIMIT + MANIFEST_LIMIT)
      throw Error("ZIP excede o limite agregado de descompressão.");
    if (
      local + 30 > start ||
      v.getUint32(local, true) !== 0x04034b50 ||
      v.getUint16(local + 6, true) !== flags ||
      v.getUint16(local + 8, true) !== method
    )
      throw Error("Cabeçalho ZIP inconsistente.");
    const localN = v.getUint16(local + 26, true),
      localExtra = v.getUint16(local + 28, true),
      dataStart = local + 30 + localN + localExtra,
      dataEnd = dataStart + compressed;
    if (
      dataEnd > start ||
      decoder.decode(bytes.subarray(local + 30, local + 30 + localN)) !==
        name ||
      ranges.some((r) => local < r.end && dataEnd > r.start)
    )
      throw Error("Caminhos ou dados ZIP sobrepostos.");
    if (
      !(flags & 8) &&
      (v.getUint32(local + 18, true) !== compressed ||
        v.getUint32(local + 22, true) !== size)
    )
      throw Error("Tamanhos ZIP inconsistentes.");
    ranges.push({ start: local, end: dataEnd });
    entries.set(name, size);
    pos += 46 + n + extra + comment;
  }
  if (
    pos !== end ||
    !entries.has("backup.json") ||
    !entries.has("manifest.json")
  )
    throw Error("ZIP não contém backup.json e manifest.json válidos.");
  return entries;
}
export async function importZip(
  file: Blob,
): Promise<{ state: State; pending: PendingReceipt[] }> {
  if (file.size > ZIP_LIMIT) throw Error("ZIP acima de 106 MiB.");
  const bytes = new Uint8Array(await file.arrayBuffer()),
    directory = inspectZip(bytes);
  const files: Record<string, Uint8Array<ArrayBuffer>> = {};
  const seen = new Set<string>();
  let expanded = 0;
  const unzip = new Unzip((file) => {
    const expected = directory.get(file.name);
    if (expected === undefined || seen.has(file.name))
      throw Error("Arquivo ZIP inesperado ou duplicado.");
    seen.add(file.name);
    const chunks: Uint8Array[] = [];
    let size = 0;
    file.ondata = (error, chunk, final) => {
      if (error) throw error;
      size += chunk.length;
      expanded += chunk.length;
      if (
        size > expected ||
        expanded > TOTAL_LIMIT + JSON_LIMIT + MANIFEST_LIMIT
      )
        throw Error("Descompressão excede o tamanho permitido.");
      chunks.push(chunk);
      if (final) {
        if (size !== expected)
          throw Error("Tamanho descompactado inconsistente.");
        const result = new Uint8Array(size);
        let offset = 0;
        for (const c of chunks) {
          result.set(c, offset);
          offset += c.length;
        }
        files[file.name] = result;
      }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  // Bounded compressed chunks cap work and temporary inflation buffers even when headers lie.
  for (let offset = 0; offset < bytes.length; offset += 1024) {
    if (offset > 0 && offset % (1024 * 1024) === 0)
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    unzip.push(
      bytes.subarray(offset, offset + 1024),
      offset + 1024 >= bytes.length,
    );
  }
  if (Object.keys(files).length !== directory.size)
    throw Error("Conteúdo ZIP inconsistente.");
  for (const [name, size] of directory)
    if (files[name]?.length !== size)
      throw Error("Tamanho descompactado inválido.");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const m: Manifest = JSON.parse(decoder.decode(files["manifest.json"]));
  if (
    !m ||
    m.version !== 1 ||
    typeof m.exportedAt !== "string" ||
    !Number.isFinite(Date.parse(m.exportedAt)) ||
    !Array.isArray(m.attachments) ||
    m.count !== m.attachments.length ||
    m.count > COUNT_LIMIT ||
    (await digest(files["backup.json"] as Uint8Array<ArrayBuffer>)) !==
      m.backupSha256
  )
    throw Error("Manifesto ou hash do backup inválido.");
  const state = await prepareBackup(decoder.decode(files["backup.json"])),
    rows = allReceipts(state);
  if (
    rows.length !== m.count ||
    directory.size !== m.count + 2 ||
    m.totalBytes !== rows.reduce((n, r) => n + r.size, 0)
  )
    throw Error("Quantidade ou tamanho do manifesto inconsistente.");
  const pending: PendingReceipt[] = [],
    ids = new Set<string>(),
    paths = new Set<string>();
  for (const r of rows) {
    const a = m.attachments.find((a) => a.id === r.id);
    if (
      !a ||
      ids.has(a.id) ||
      paths.has(a.path) ||
      a.path !== pathFor(r) ||
      a.size !== r.size ||
      a.sha256 !== r.sha256 ||
      a.mime !== r.mime ||
      a.name !== r.name ||
      a.target?.kind !== r.target.kind ||
      a.target?.id !== r.target.id ||
      !files[a.path]
    )
      throw Error("Vínculo ou arquivo do manifesto inconsistente.");
    ids.add(a.id);
    paths.add(a.path);
    const blob = new Blob([files[a.path] as Uint8Array<ArrayBuffer>], {
      type: r.mime,
    });
    await verifyBlob(r, blob);
    pending.push({ receipt: r, blob });
  }
  return { state, pending };
}
