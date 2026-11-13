import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { State } from "./model";
import { save, download } from "./storage";
import {
  BACKUP_LIMIT,
  BackupError,
  prepareBackup,
  readCurrentBackup,
  needsAcknowledgment,
  backupSummary,
  type CurrentBackup,
} from "./backup";
function Summary({ state }: { state: State }) {
  const s = backupSummary(state);
  return (
    <>
      <dl className="backup-summary">
        {[
          ["Lançamentos encontrados", s.entries],
          ["Planejamentos preservados", s.goals],
          ["Grupos de parcelas / recorrências", s.groups],
          ["Reembolsos", s.refunds],
          ["Pendências sem competência", s.pending],
          ["Compras previstas a conferir", s.forecasts],
          ["Situações de faturas", s.invoices],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p>
        <strong>Competências abrangidas</strong>
        <br />
        {s.periods.length
          ? s.periods.join(" · ")
          : "Nenhuma competência registrada."}
      </p>
      <p>
        <strong>Configurações financeiras incluídas</strong>
        <br />
        Salário, reserva, margem, meta, teto de parcelas, cartão, vencimento e
        preferência de projeção.
      </p>
    </>
  );
}
type Prepared = { state: State; current: CurrentBackup };
export function BackupImport({
  onClose,
  onRestored,
  legacyRaw,
}: {
  onClose: () => void;
  onRestored: (s: State, raw: string) => void;
  legacyRaw?: string;
}) {
  const [step, setStep] = useState(1),
    [selected, setSelected] = useState<{ name: string; size: number } | null>(
      null,
    ),
    [prepared, setPrepared] = useState<Prepared | null>(null),
    [error, setError] = useState(""),
    [details, setDetails] = useState(""),
    [busy, setBusy] = useState(false),
    [ack, setAck] = useState(false),
    [downloadError, setDownloadError] = useState("");
  const ref = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null),
    sequence = useRef(0),
    legacySource = useRef<string | null>(null),
    id = useId();
  function fail(e: unknown) {
    if (e instanceof BackupError) {
      setError(e.message);
      setDetails(e.details);
    } else {
      setError(
        "Não foi possível concluir a operação. Confira se o armazenamento está disponível e tente novamente. Nenhum dado foi substituído.",
      );
      setDetails(e instanceof Error ? e.message : "Erro desconhecido.");
    }
  }
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => {
      sequence.current++;
      ref.current?.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  async function select(file: File, local = false) {
    legacySource.current = local ? (legacyRaw ?? null) : null;
    const token = ++sequence.current;
    setSelected({ name: file.name, size: file.size });
    setPrepared(null);
    setError("");
    setDetails("");
    setDownloadError("");
    setAck(false);
    setBusy(true);
    try {
      if (file.size > BACKUP_LIMIT)
        throw new BackupError("O arquivo ultrapassa o limite de 4 MB.");
      if (!/\.json$/i.test(file.name))
        throw new BackupError(
          "Selecione um arquivo de backup com extensão .json.",
        );
      const current = readCurrentBackup();
      const state = await prepareBackup(await file.text());
      if (token === sequence.current) setPrepared({ state, current });
    } catch (e) {
      if (token === sequence.current) fail(e);
    } finally {
      if (token === sequence.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (legacyRaw)
      void select(
        new File([legacyRaw], "backup-local-v1.json", {
          type: "application/json",
        }),
        true,
      );
  }, [legacyRaw]);
  useEffect(() => {
    heading.current?.focus();
    if (ref.current) ref.current.scrollTop = 0;
  }, [step]);
  function restore() {
    if (!prepared || busy || (needsAcknowledgment(prepared.current) && !ack))
      return;
    try {
      setError("");
      setDetails("");
      if (
        legacySource.current !== null &&
        localStorage.getItem("saldoclaro-v1") !== legacySource.current
      )
        throw new BackupError(
          "Os dados antigos mudaram. Selecione novamente a recuperação avançada antes de restaurar.",
        );
      const serialized = save(prepared.state, prepared.current.raw);
      onRestored(prepared.state, serialized);
    } catch (e) {
      if (localStorageAvailableChanged(prepared.current.raw)) {
        setError(
          "Os dados atuais mudaram desde a conferência. Volte à seleção e confira o backup novamente antes de restaurar.",
        );
        setDetails(e instanceof Error ? e.message : "Alteração concorrente.");
        setPrepared(null);
      } else fail(e);
    }
  }
  const title =
    step === 1
      ? "Importar backup"
      : step === 2
        ? "Confira os dados do backup"
        : "Confirmar restauração";
  return (
    <dialog
      ref={ref}
      className="finance-dialog backup-dialog"
      aria-labelledby={id + "-title"}
      aria-describedby={id + "-description"}
      onCancel={onClose}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const nodes = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],summary,[tabindex]:not([tabindex="-1"])',
          ),
        ).filter((e) => e.getClientRects().length > 0);
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      <div className="backup-top">
        <span>Etapa {step} de 3</span>
        <Button
          variant="ghost"
          onClick={onClose}
          aria-label="Fechar importação"
        >
          Fechar
        </Button>
      </div>
      <h2 ref={heading} tabIndex={-1} id={id + "-title"}>
        {title}
      </h2>
      <p id={id + "-description"}>
        {step === 1
          ? "Selecione um arquivo de backup do Finly para recuperar seus lançamentos e configurações."
          : step === 2
            ? "Veja o que será recuperado antes de continuar."
            : "Confira a substituição e restaure somente quando estiver pronto."}
      </p>
      {step === 1 && (
        <>
          <div
            className="backup-drop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = e.dataTransfer.files;
              if (files.length !== 1) {
                sequence.current++;
                setBusy(false);
                setSelected(null);
                setDetails("");
                setAck(false);
                legacySource.current = null;
                setError("Selecione somente um arquivo JSON por vez.");
                setPrepared(null);
                return;
              }
              void select(files[0]);
            }}
          >
            <label htmlFor={id + "-file"}>
              Selecionar arquivo JSON ou arrastar aqui
            </label>
            <input
              id={id + "-file"}
              type="file"
              accept=".json,application/json"
              aria-label="Selecionar arquivo JSON"
              onChange={(e) => {
                const f = e.currentTarget.files?.[0];
                if (f) void select(f);
                e.currentTarget.value = "";
              }}
            />
            <p>Compatível com backups Finly v1 e v2 · limite de 4 MB.</p>
          </div>
          {selected && (
            <p className="backup-file">
              <strong>{selected.name}</strong> ·{" "}
              {(selected.size / 1024).toLocaleString("pt-BR", {
                maximumFractionDigits: 1,
              })}{" "}
              KB
            </p>
          )}
          {busy && <p role="status">Conferindo o arquivo…</p>}
          {prepared && (
            <p role="status">Arquivo válido. Você pode continuar.</p>
          )}
        </>
      )}
      {step === 2 && prepared && (
        <div className="backup-compare">
          <section aria-label="Dados do arquivo">
            <h3>Dados do arquivo</h3>
            <Summary state={prepared.state} />
          </section>
          <section aria-label="Dados atuais">
            <h3>Dados atuais</h3>
            {prepared.current.state ? (
              <Summary state={prepared.current.state} />
            ) : (
              <p>
                {prepared.current.invalid
                  ? "Os dados atuais não puderam ser lidos. Baixe uma cópia na próxima etapa antes de substituir."
                  : "Não existem dados financeiros salvos nesta origem."}
              </p>
            )}
          </section>
        </div>
      )}
      {step === 3 && prepared && (
        <>
          <p className="backup-warning">
            {prepared.current.raw !== null
              ? "Os dados atuais deste navegador serão substituídos pelos dados do backup selecionado."
              : "O backup será salvo neste navegador."}
          </p>
          <p>
            Serão restaurados{" "}
            <strong>{prepared.state.transactions.length} lançamentos</strong> e
            suas configurações.
          </p>
          {prepared.current.raw !== null && (
            <Button
              variant="outline"
              onClick={() => {
                try {
                  const latest=localStorage.getItem('finly-v2');
                  if(latest===null)throw Error('Não existem dados atuais para baixar.');
                  download(latest, "Finly-dados-atuais.json");
                  setDownloadError("");
                } catch {
                  setDownloadError(
                    "Não foi possível baixar a cópia. Tente novamente antes de restaurar.",
                  );
                }
              }}
            >
              Baixar backup dos dados atuais
            </Button>
          )}
          {downloadError && <p role="alert">{downloadError}</p>}
          {needsAcknowledgment(prepared.current) && (
            <label className="backup-ack">
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />{" "}
              Entendo que meus dados atuais serão substituídos pelos dados deste
              backup.
            </label>
          )}
        </>
      )}
      {error && (
        <div role="alert" className="backup-error">
          <p>{error}</p>
          {details && (
            <details>
              <summary>Detalhes técnicos</summary>
              <p>{details}</p>
            </details>
          )}
        </div>
      )}
      <footer className="backup-actions">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        {step > 1 && (
          <Button
            variant="outline"
            onClick={() => {
              setStep(step - 1);
              setError("");
              setDetails("");
            }}
          >
            Voltar
          </Button>
        )}
        {step < 3 ? (
          <Button
            disabled={!prepared || busy}
            onClick={() => setStep(step + 1)}
          >
            Continuar
          </Button>
        ) : (
          <Button
            disabled={
              !prepared ||
              busy ||
              (needsAcknowledgment(prepared.current) && !ack)
            }
            onClick={restore}
          >
            Restaurar dados
          </Button>
        )}
      </footer>
    </dialog>
  );
}
function localStorageAvailableChanged(expected: string | null) {
  try {
    return localStorage.getItem("finly-v2") !== expected;
  } catch {
    return false;
  }
}
