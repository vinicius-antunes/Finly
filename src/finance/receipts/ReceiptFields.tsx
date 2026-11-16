import { useEffect, useId, useRef, useState } from "react";
import { Paperclip, FileText, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  inspectFile,
  FILE_LIMIT,
  COUNT_LIMIT,
  TOTAL_LIMIT,
  bytesLabel,
  safeName,
  allReceipts,
  withReceipts,
  linked,
  verifyBlob,
  type PendingReceipt,
  type Receipt,
  type Target,
} from "./model";
import { getBlob, coordinatedSave } from "./storage";
import type { State } from "../model";
import { EntryDialog } from "../entry-system/ui/EntryDialog";
export function FilePreview({
  blob,
  meta,
}: {
  blob?: Blob;
  meta: Pick<Receipt, "name" | "mime">;
}) {
  const [url, setUrl] = useState(""),
    [large, setLarge] = useState(false);
  useEffect(() => {
    if (!blob) return;
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  if (!url) return <FileText aria-hidden="true" />;
  return (
    <>
      {meta.mime.startsWith("image/") ? (
        <button
          type="button"
          className="receipt-thumbnail"
          onClick={() => setLarge(!large)}
          aria-label={"Ampliar " + meta.name}
          aria-expanded={large}
        >
          <img
            className={large ? "receipt-large" : ""}
            src={url}
            alt={meta.name}
          />
        </button>
      ) : (
        <FileText aria-hidden="true" />
      )}
      <a
        className="receipt-download"
        href={url}
        download={safeName(meta.name)}
        aria-label={"Baixar " + meta.name}
      >
        <Download aria-hidden="true" />
        <span>Baixar</span>
      </a>
      {meta.mime === "application/pdf" && (
        <small>PDF · download seguro; não executado na aplicação.</small>
      )}
    </>
  );
}
export function ReceiptFields({
  pending,
  onChange,
  disabled = false,
  known = [],
  onBusyChange,
}: {
  pending: PendingReceipt[];
  onChange: (p: PendingReceipt[]) => void;
  disabled?: boolean;
  known?: Receipt[];
  onBusyChange?: (busy: boolean) => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const id = useId(),
    running = useRef(false);
  async function add(files: File[]) {
    if (running.current || disabled) return;
    running.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setError("");
    try {
      if (files.length + pending.length + known.length > COUNT_LIMIT)
        throw Error("Limite de 200 comprovantes.");
      const added = [...pending];
      for (const f of files) {
        if (f.size > FILE_LIMIT)
          throw Error(`${f.name}: limite de 10 MiB por arquivo.`);
        const p = await inspectFile(f, f.name, f.type);
        if (
          added.map((a) => a.receipt).some((a) => a.sha256 === p.receipt.sha256)
        )
          throw Error(
            `${f.name}: este comprovante já foi selecionado ou vinculado.`,
          );
        added.push(p);
      }
      if (
        [...added.map((p) => p.receipt), ...known].reduce(
          (n, r) => n + r.size,
          0,
        ) > TOTAL_LIMIT
      )
        throw Error("Limite agregado de 100 MiB.");
      onChange(added);
      if (added.some((p) => known.some((r) => r.sha256 === p.receipt.sha256)))
        setError(
          "Arquivo já armazenado: o binário existente será reutilizado para este vínculo.",
        );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível selecionar o arquivo.",
      );
    } finally {
      running.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return (
    <details className="entry-section receipt-fields">
      <summary>
        <Paperclip aria-hidden="true" /> Comprovantes{" "}
        {pending.length > 0 && `(${pending.length})`}
      </summary>
      <div
        className="receipt-drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void add([...e.dataTransfer.files]);
        }}
      >
        <label htmlFor={id}>Selecionar comprovantes ou arrastar aqui</label>
        <input
          id={id}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          disabled={disabled || busy}
          onChange={(e) => {
            void add([...(e.currentTarget.files ?? [])]);
            e.currentTarget.value = "";
          }}
        />
        <small>
          JPG, PNG, WebP ou PDF · até 10 MiB por arquivo · somente neste
          navegador.
        </small>
      </div>
      {busy && <p role="status">Validando arquivos…</p>}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <ul className="receipt-list">
        {pending.map((p) => (
          <li key={p.receipt.id}>
            <FilePreview blob={p.blob} meta={p.receipt} />
            <span>
              {p.receipt.name}
              <small>
                {p.receipt.mime} · {bytesLabel(p.receipt.size)} · ainda não
                salvo
              </small>
            </span>
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              aria-label={"Remover " + p.receipt.name}
              onClick={() => onChange(pending.filter((x) => x !== p))}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
    </details>
  );
}
function SavedFile({ r }: { r: Receipt }) {
  const [blob, setBlob] = useState<Blob>(),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const b = await getBlob(r.sha256);
        if (!b) throw Error("Arquivo ausente. Restaure o backup completo ZIP.");
        await verifyBlob(r, b);
        if (active) setBlob(b);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Indisponível");
      }
    })();
    return () => {
      active = false;
    };
  }, [r]);
  return (
    <>
      <FilePreview blob={blob} meta={r} />
      <span>
        {r.name}
        <small>
          {bytesLabel(r.size)} · {r.target.kind}
          {r.addedAt && ` · ${new Date(r.addedAt).toLocaleDateString("pt-BR")}`}
        </small>
        {error && <small role="alert">{error}</small>}
      </span>
    </>
  );
}
export function SavedReceipts({
  state,
  targets,
  onCommit,
}: {
  state: State;
  targets: Target[];
  onCommit: (s: State) => boolean;
}) {
  const rows = targets.flatMap((t) => linked(state, t)),
    [error, setError] = useState("");
  if (!rows.length) return null;
  return (
    <section className="receipt-saved">
      <h4>Comprovantes salvos ({rows.length})</h4>
      <ul className="receipt-list">
        {rows.map((r) => (
          <li key={r.id}>
            <SavedFile r={r} />
            <Button
              type="button"
              variant="ghost"
              aria-label={"Excluir comprovante " + r.name}
              onClick={() => {
                if (
                  confirm(
                    `Excluir o vínculo de ${r.name} com ${r.target.kind} ${r.target.id}? O binário compartilhado será preservado até uma limpeza confirmada, sem remover outros vínculos.`,
                  )
                ) {
                  if (
                    !onCommit(
                      withReceipts(
                        state,
                        allReceipts(state).filter((x) => x.id !== r.id),
                      ),
                    )
                  )
                    setError("Não foi possível excluir. Atualize os dados.");
                }
              }}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
export function ReceiptManager({
  state,
  target,
  onCommit,
  onClose,
}: {
  state: State;
  target: Target;
  onCommit: (s: State) => boolean;
  onClose: () => void;
}) {
  const [pending, setPending] = useState<PendingReceipt[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [validating, setValidating] = useState(false);
  const lock = useRef(false),
    base = useRef(JSON.stringify(state));
  useEffect(() => {
    if (!pending.length && !validating) return;
    const protect = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [pending.length, validating]);
  async function submit() {
    if (lock.current || validating) return;
    lock.current = true;
    setBusy(true);
    try {
      if (JSON.stringify(state) !== base.current)
        throw Error(
          "Os dados mudaram. Reabra para conferir; os arquivos selecionados continuam neste formulário.",
        );
      const next = withReceipts(state, [
        ...allReceipts(state),
        ...pending.map((p) => ({ ...p.receipt, target })),
      ]);
      await coordinatedSave(next, pending, base.current, onCommit);
      setPending([]);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <EntryDialog
      title="Comprovantes do registro"
      description="Arquivos locais. Nenhum saldo será alterado."
      onClose={() => {
        if (!busy && !validating) onClose();
      }}
      dirty={pending.length > 0 || busy || validating}
    >
      <div className="entry-body">
        <SavedReceipts
          state={state}
          targets={[target]}
          onCommit={(s) => {
            const ok = onCommit(s);
            if (ok)
              base.current = JSON.stringify({
                ...s,
                revision: state.revision + 1,
              });
            return ok;
          }}
        />
        <ReceiptFields
          pending={pending}
          onChange={setPending}
          onBusyChange={setValidating}
          known={allReceipts(state)}
          disabled={busy}
        />
        {error && <p role="alert">{error}</p>}
      </div>
      <footer className="entry-footer">
        <Button
          disabled={busy || validating || !pending.length}
          onClick={() => void submit()}
        >
          {busy ? "Salvando arquivos…" : "Salvar comprovantes"}
        </Button>
        <Button
          variant="ghost"
          disabled={busy || validating}
          onClick={() => {
            if (
              !pending.length ||
              confirm("Descartar os comprovantes ainda não salvos?")
            )
              onClose();
          }}
        >
          Concluir
        </Button>
      </footer>
    </EntryDialog>
  );
}
