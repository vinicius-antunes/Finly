import type { State } from "../model.ts";
export const FILE_LIMIT = 10 * 1024 * 1024;
export const TOTAL_LIMIT = 100 * 1024 * 1024;
export const COUNT_LIMIT = 200;
export const ZIP_LIMIT = TOTAL_LIMIT + 6 * 1024 * 1024;
export type Target = {
  kind:
    | "legacy"
    | "operation"
    | "purchase"
    | "transfer"
    | "settlement"
    | "invoicePayment";
  id: string;
};
export type Receipt = {
  id: string;
  target: Target;
  name: string;
  mime: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  size: number;
  sha256: string;
  addedAt?: string;
};
export type PendingReceipt = { receipt: Omit<Receipt, "target">; blob: Blob };
export function allReceipts(s: State): Receipt[] {
  return [
    ...(s.receipts ?? []),
    ...(s.entryLedger?.attachments ?? []).map((a) => {
      const { operationId, ...rest } = a;
      return {
        ...rest,
        target: { kind: "operation" as const, id: operationId },
      };
    }),
  ];
}
export function targetExists(s: State, t: Target) {
  if (t.kind === "legacy") return s.transactions.some((x) => x.id === t.id);
  const l = s.entryLedger;
  if (!l) return false;
  const rows = {
    operation: l.operations,
    purchase: l.purchases,
    transfer: l.transfers,
    settlement: l.settlements,
    invoicePayment: l.invoicePayments,
  };
  return rows[t.kind]?.some((x) => x.id === t.id) ?? false;
}
export function validateReceipts(s: State) {
  if (s.receipts !== undefined && !Array.isArray(s.receipts))
    throw Error("Catálogo de comprovantes inválido.");
  const rows = allReceipts(s),
    ids = new Set<string>();
  if (
    rows.length > COUNT_LIMIT ||
    rows.reduce((n, r) => n + r.size, 0) > TOTAL_LIMIT
  )
    throw Error("Limite de comprovantes: 200 arquivos / 100 MiB.");
  for (const r of rows) {
    if (
      !r ||
      typeof r.id !== "string" ||
      !r.id ||
      r.id.length > 500 ||
      ids.has(r.id) ||
      !r.target ||
      !targetExists(s, r.target) ||
      typeof r.name !== "string" ||
      !r.name.trim() ||
      r.name.length > 255 ||
      !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
        r.mime,
      ) ||
      !Number.isSafeInteger(r.size) ||
      r.size < 1 ||
      r.size > FILE_LIMIT ||
      typeof r.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(r.sha256) ||
      (r.addedAt !== undefined &&
        (typeof r.addedAt !== "string" ||
          !Number.isFinite(Date.parse(r.addedAt))))
    )
      throw Error("Metadados ou vínculo de comprovante inválidos.");
    ids.add(r.id);
  }
}
export function withReceipts(s: State, rows: Receipt[]): State {
  return {
    ...s,
    receipts: rows,
    ...(s.entryLedger
      ? { entryLedger: { ...s.entryLedger, attachments: [] } }
      : {}),
  };
}
export function linked(s: State, target: Target): Receipt[] {
  return allReceipts(s).filter(
    (r) => r.target.kind === target.kind && r.target.id === target.id,
  );
}
export function entryTargets(s: State, id: string): Target[] {
  const o = s.entryLedger?.operations.find((o) => o.id === id);
  return o
    ? [
        { kind: "operation", id },
        ...(o.purchaseId
          ? [{ kind: "purchase" as const, id: o.purchaseId }]
          : []),
      ]
    : [{ kind: "legacy", id }];
}
export function safeName(name: string) {
  return (
    name
      .normalize("NFC")
      .replace(
        /[\\/<>:"|?*\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,
        "_",
      )
      .replace(/^\.+/, "_")
      .slice(-255)
      .trim() || "comprovante"
  );
}
export const bytesLabel = (n: number) =>
  n < 1048576
    ? `${(n / 1024).toFixed(1)} KiB`
    : `${(n / 1048576).toFixed(1)} MiB`;
export async function digest(bytes: Uint8Array<ArrayBuffer> | ArrayBuffer) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
/** Checks container signatures, declared container length/end marker, extension and MIME independently. Never interprets document content. */
export async function inspectFile(
  file: Blob,
  name: string,
  mime: string,
): Promise<PendingReceipt> {
  if (!file.size) throw Error("O arquivo está vazio.");
  if (file.size > FILE_LIMIT)
    throw Error("Cada comprovante pode ter no máximo 10 MiB.");
  const b = new Uint8Array(await file.arrayBuffer()),
    view = new DataView(b.buffer);
  const text = (start: number, end: number) =>
    new TextDecoder("latin1").decode(b.subarray(start, end));
  let detected: Receipt["mime"] | undefined;
  if (
    b.length >= 24 &&
    b.slice(0, 8).every((v, i) => v === [137, 80, 78, 71, 13, 10, 26, 10][i]) &&
    text(12, 16) === "IHDR" &&
    view.getUint32(16) > 0 &&
    view.getUint32(20) > 0 &&
    text(b.length - 8, b.length - 4) === "IEND"
  )
    detected = "image/png";
  if (
    b.length >= 12 &&
    b[0] === 255 &&
    b[1] === 216 &&
    b[2] === 255 &&
    b[b.length - 2] === 255 &&
    b[b.length - 1] === 217
  )
    detected = "image/jpeg";
  if (
    b.length >= 20 &&
    text(0, 4) === "RIFF" &&
    text(8, 12) === "WEBP" &&
    view.getUint32(4, true) + 8 === b.length &&
    ["VP8 ", "VP8L", "VP8X"].includes(text(12, 16))
  )
    detected = "image/webp";
  if (
    b.length >= 16 &&
    /^%PDF-1\.[0-7]|^%PDF-2\.0/.test(text(0, 8)) &&
    /%%EOF\s*$/.test(text(Math.max(0, b.length - 1024), b.length))
  )
    detected = "application/pdf";
  const extensions: Record<Receipt["mime"], RegExp> = {
    "image/png": /\.png$/i,
    "image/jpeg": /\.jpe?g$/i,
    "image/webp": /\.webp$/i,
    "application/pdf": /\.pdf$/i,
  };
  if (!detected || detected !== mime || !extensions[detected].test(name))
    throw Error(
      "Formato inválido: extensão, tipo e conteúdo devem corresponder a JPG, PNG, WebP ou PDF.",
    );
  // Reject huge raster dimensions before asking the native image decoder to allocate a bitmap.
  let dimensions: [number, number] | undefined;
  if (detected === "image/png")
    dimensions = [view.getUint32(16), view.getUint32(20)];
  if (detected === "image/jpeg") {
    for (let pos = 2; pos + 8 < b.length; ) {
      if (b[pos++] !== 255) break;
      while (b[pos] === 255) pos++;
      const marker = b[pos++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (pos + 2 > b.length) break;
      const length = view.getUint16(pos);
      if (length < 2 || pos + length > b.length) break;
      if (
        [
          0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
          0xce, 0xcf,
        ].includes(marker)
      ) {
        dimensions = [view.getUint16(pos + 5), view.getUint16(pos + 3)];
        break;
      }
      pos += length;
    }
  }
  if (detected === "image/webp") {
    if (text(12, 16) === "VP8X" && b.length >= 30)
      dimensions = [
        1 + b[24] + (b[25] << 8) + (b[26] << 16),
        1 + b[27] + (b[28] << 8) + (b[29] << 16),
      ];
    if (text(12, 16) === "VP8L" && b.length >= 25 && b[20] === 47) {
      const bits = view.getUint32(21, true);
      dimensions = [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
    }
    if (
      text(12, 16) === "VP8 " &&
      b.length >= 30 &&
      b[23] === 157 &&
      b[24] === 1 &&
      b[25] === 42
    )
      dimensions = [
        view.getUint16(26, true) & 0x3fff,
        view.getUint16(28, true) & 0x3fff,
      ];
  }
  if (
    detected.startsWith("image/") &&
    (!dimensions ||
      dimensions.some((n) => n <= 0) ||
      dimensions[0] * dimensions[1] > 40000000)
  )
    throw Error("Imagem inválida ou acima de 40 megapixels.");
  if (
    detected.startsWith("image/") &&
    typeof createImageBitmap === "function"
  ) {
    if (
      detected === "image/png" &&
      view.getUint32(16) * view.getUint32(20) > 40000000
    )
      throw Error("Imagem excede 40 megapixels.");
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw Error("A imagem está danificada ou não pode ser decodificada.");
    }
    const pixels = bitmap.width * bitmap.height;
    bitmap.close();
    if (pixels > 40000000) throw Error("Imagem excede 40 megapixels.");
  }
  return {
    blob: file.slice(0, file.size, detected),
    receipt: {
      id: crypto.randomUUID(),
      name: safeName(name),
      mime: detected,
      size: b.length,
      sha256: await digest(b),
      addedAt: new Date().toISOString(),
    },
  };
}
export async function verifyBlob(r: Receipt, blob: Blob) {
  if (
    blob.size !== r.size ||
    (await digest(await blob.arrayBuffer())) !== r.sha256
  )
    throw Error(`Integridade inválida: ${r.name}`);
  await inspectFile(blob, r.name, r.mime);
}
