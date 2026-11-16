import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { State } from "../model";
import { bytesLabel, allReceipts, type Target } from "./model";
import { storageHealth, cleanOrphans, listBlobs } from "./storage";
import type { prepareExport } from "./zip";
import { ReceiptManager } from "./ReceiptFields";
export function StoragePanel({
  state,
  onCommit,
}: {
  state: State;
  onCommit: (s: State) => boolean;
}) {
  const [health, setHealth] =
      useState<Awaited<ReturnType<typeof storageHealth>>>(),
    [quota, setQuota] = useState<StorageEstimate>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [preview, setPreview] =
      useState<Awaited<ReturnType<typeof prepareExport>>>(),
    [previewSource, setPreviewSource] = useState(""),
    [selected, setSelected] = useState(""),
    [manager, setManager] = useState<Target>();
  const [usage, setUsage] = useState<{ count: number; bytes: number }>();
  useEffect(() => {
    let active = true;
    void listBlobs()
      .then((rows) => {
        if (active)
          setUsage({
            count: rows.length,
            bytes: rows.reduce((n, r) => n + r.blob.size, 0),
          });
      })
      .catch(() => {
        if (active)
          setError(
            "Armazenamento de comprovantes indisponível neste navegador.",
          );
      });
    void navigator.storage
      ?.estimate?.()
      .then((q) => {
        if (active) setQuota(q);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [state]);
  const running = useRef(false);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(t);
  }, [notice]);
  async function run(fn: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Armazenamento indisponível.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  const check = async () => {
    setHealth(await storageHealth(state));
    if (navigator.storage?.estimate)
      setQuota(await navigator.storage.estimate());
  };
  useEffect(() => {
    setHealth(undefined);
    setPreview(undefined);
  }, [state]);
  const l = state.entryLedger;
  const targets: { target: Target; label: string }[] = [
    ...state.transactions.map((o) => ({
      target: { kind: "legacy" as const, id: o.id },
      label: o.description + " · registro anterior",
    })),
    ...(l?.operations ?? []).map((o) => ({
      target: { kind: "operation" as const, id: o.id },
      label: o.description + " · " + o.period,
    })),
    ...(l?.purchases ?? []).map((o) => ({
      target: { kind: "purchase" as const, id: o.id },
      label:
        "Contrato · " +
        (l?.operations.find((x) => x.purchaseId === o.id)?.description ?? o.id),
    })),
    ...(l?.transfers ?? []).map((o) => ({
      target: { kind: "transfer" as const, id: o.id },
      label: "Transferência · " + o.date + " · " + o.note,
    })),
    ...(l?.settlements ?? []).map((o) => ({
      target: { kind: "settlement" as const, id: o.id },
      label: "Pagamento / recebimento · " + o.date + " · " + o.note,
    })),
    ...(l?.invoicePayments ?? []).map((o) => ({
      target: { kind: "invoicePayment" as const, id: o.id },
      label: "Pagamento da fatura · " + o.date,
    })),
  ];
  return (
    <section
      className="category-panel finance-stack receipt-storage"
      aria-label="Armazenamento local"
    >
      <h2>Armazenamento local</h2>
      <p>
        Comprovantes ficam somente neste navegador. Limpar os dados do navegador
        pode removê-los. Guarde um backup completo ZIP em local privado.
      </p>
      <div className="storage-summary">
        <span>
          Comprovantes<strong>{allReceipts(state).length}</strong>
        </span>
        {!health && usage && (
          <span>
            Espaço utilizado
            <strong>
              {usage.count} arquivos · {bytesLabel(usage.bytes)}
            </strong>
            <small>Integridade ainda não verificada</small>
          </span>
        )}
        {health && (
          <>
            <span>
              Arquivos físicos
              <strong>
                {health.physicalCount} · {bytesLabel(health.bytes)}
              </strong>
            </span>
            <span>
              Problemas<strong>{health.problems.length}</strong>
            </span>
            <span>
              Órfãos<strong>{health.orphans.length}</strong>
            </span>
            <span>
              Gravações a recuperar<strong>{health.recovered.length}</strong>
            </span>
          </>
        )}
        {quota?.quota !== undefined && (
          <span>
            Espaço disponível estimado
            <strong>
              {bytesLabel(Math.max(0, quota.quota - (quota.usage ?? 0)))}
            </strong>
          </span>
        )}
      </div>
      <div className="finance-actions">
        <Button
          disabled={busy}
          variant="outline"
          onClick={() => void run(check)}
        >
          Verificar integridade
        </Button>
        <Button
          disabled={
            busy ||
            !health ||
            (!health.orphans.length && !health.recovered.length)
          }
          variant="outline"
          onClick={() =>
            void run(async () => {
              if (
                !confirm(
                  `Remover definitivamente ${health!.orphans.length} arquivos sem vínculo e encerrar ${health!.recovered.length} registros de recuperação? Arquivos compartilhados com referências válidas serão mantidos.`,
                )
              )
                return;
              await cleanOrphans(JSON.stringify(state));
              await check();
              setNotice("Arquivos órfãos removidos.");
            })
          }
        >
          Limpar arquivos órfãos
        </Button>
      </div>
      {health && (
        <>
          {health.problems.length > 0 && (
            <details>
              <summary>
                Arquivos ausentes ou corrompidos ({health.problems.length})
              </summary>
              <ul>
                {health.problems.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </details>
          )}
          {health.recovered.length > 0 && (
            <p role="status">
              Gravações interrompidas identificadas:{" "}
              {health.recovered.filter((r) => r.committed).length} com vínculos
              confirmados; {health.recovered.filter((r) => !r.committed).length}{" "}
              sem confirmação. Os arquivos íntegros permanecem disponíveis. A
              limpeza remove somente os órfãos e encerra os registros de
              recuperação.
            </p>
          )}
        </>
      )}
      <label>
        Consultar comprovantes por registro
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Selecione um registro</option>
          {targets.map((t, i) => (
            <option key={t.target.kind + t.target.id} value={i}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <Button
        disabled={selected === ""}
        variant="outline"
        onClick={() => setManager(targets[Number(selected)].target)}
      >
        Gerenciar comprovantes do registro
      </Button>
      <section className="backup-settings-group">
        <h3>Backup completo (.zip)</h3>
        <p>
          Inclui dados financeiros, manifesto SHA-256 e todos os comprovantes.
          JSON e CSV não incluem os arquivos binários.
        </p>
        <Button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const { prepareExport } = await import("./zip");
              const p = await prepareExport(state);
              setPreview(p);
              setPreviewSource(JSON.stringify(state));
            })
          }
        >
          Conferir backup completo
        </Button>
        {preview && (
          <div className="backup-warning">
            <p>
              {preview.records} registros · {preview.count} comprovantes ·
              aproximadamente{" "}
              {bytesLabel(
                preview.bytes +
                  new TextEncoder().encode(JSON.stringify(state)).length,
              )}
              .
            </p>
            {preview.problems.length > 0 ? (
              <>
                <p role="alert">
                  O backup completo está bloqueado: restaure os arquivos
                  ausentes ou corrompidos antes de exportar.
                </p>
                <ul>
                  {preview.problems.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </>
            ) : (
              <Button
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    if (
                      previewSource !== JSON.stringify(state) ||
                      localStorage.getItem("finly-v2") !== previewSource
                    )
                      throw Error(
                        "Os dados mudaram. Confira o backup novamente.",
                      );
                    const { exportZip } = await import("./zip");
                    const b = await exportZip(state);
                    const url = URL.createObjectURL(
                      new Blob([b], { type: "application/zip" }),
                    );
                    try {
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "Finly-backup-completo.zip";
                      a.click();
                      setNotice(
                        "Backup completo gerado. Guarde o arquivo em local privado.",
                      );
                    } finally {
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }
                  })
                }
              >
                Exportar backup completo ZIP
              </Button>
            )}
          </div>
        )}
      </section>
      {busy && <p role="status">Conferindo dados e arquivos…</p>}
      {error && <p role="alert">{error}</p>}
      {notice && (
        <p role="status">
          {notice}{" "}
          <Button
            variant="ghost"
            aria-label="Fechar aviso de armazenamento"
            onClick={() => setNotice("")}
          >
            ×
          </Button>
        </p>
      )}
      {manager && (
        <ReceiptManager
          state={state}
          target={manager}
          onCommit={onCommit}
          onClose={() => setManager(undefined)}
        />
      )}
    </section>
  );
}
