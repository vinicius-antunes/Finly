import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EntryDialog } from "./EntryDialog";
import type { State } from "../../model";
import { download } from "../../storage";
import { previewEntryMigration, type MigrationPreview } from "../migration";
import { activateEntryLedger, isEmptyEntryInstallation } from "../state";
export function Activation(props: Parameters<typeof ProtectedActivation>[0]) {
  // Storage access failure is an error, never evidence of an empty installation.
  const [status, setStatus] = useState<"checking" | "legacy" | "error">(
    "checking",
  );
  useEffect(() => {
    let live = true;
    async function prepare() {
      try {
        const legacyRaw = localStorage.getItem("saldoclaro-v1");
        if (!isEmptyEntryInstallation(props.state, legacyRaw)) {
          if (live) setStatus("legacy");
          return;
        }
        const next = await activateEntryLedger(props.state, null, {
          emptyInstallation: true,
          legacyRaw,
        });
        if (!live) return;
        if (
          localStorage.getItem("saldoclaro-v1") !== legacyRaw ||
          !props.onCommit(next)
        )
          throw Error("Não foi possível salvar");
      } catch {
        if (live) setStatus("error");
      }
    }
    void prepare();
    return () => {
      live = false;
    };
  }, []);
  if (status === "legacy") return <ProtectedActivation {...props} />;
  return (
    <EntryDialog
      title="Novo lançamento"
      description="Inicialização segura do formulário."
      onClose={props.onClose}
    >
      <div className="entry-body">
        {status === "checking" ? (
          <p role="status">Abrindo formulário…</p>
        ) : (
          <p role="alert">
            Não foi possível inicializar o formulário. Seus dados foram
            preservados. Atualize a página antes de tentar novamente.
          </p>
        )}
      </div>
    </EntryDialog>
  );
}
function ProtectedActivation({
  state,
  onCommit,
  onClose,
  onLegacy,
}: {
  state: State;
  onCommit: (s: State) => boolean;
  onClose: () => void;
  onLegacy: () => void;
}) {
  const [backupSource, setBackupSource] = useState("");
  useEffect(() => {
    if (backupSource && backupSource !== JSON.stringify(state)) {
      setBackup(false);
      setPreview(undefined);
      setAck(false);
      setError(
        "Os dados mudaram. Exporte um novo backup antes de preparar o sistema.",
      );
    }
  }, [state, backupSource]);
  const [backup, setBackup] = useState(false),
    [preview, setPreview] = useState<MigrationPreview>(),
    [source, setSource] = useState(""),
    [ack, setAck] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <EntryDialog
      title="Preparar Novo lançamento"
      description="Ative os novos formulários com seus dados protegidos."
      onClose={onClose}
    >
      <div className="entry-body">
        <p>
          Seus lançamentos antigos, cofrinhos e configurações serão preservados.
          Nenhuma conta, data ou compra será criada a partir deles.
        </p>
        <ol className="activation-steps">
          <li>
            <Button
              variant="outline"
              onClick={() => {
                try {
                  download(
                    JSON.stringify(state, null, 2),
                    "Finly-antes-novo-lancamento.json",
                  );
                  setBackupSource(JSON.stringify(state));
                  setBackup(true);
                  setPreview(undefined);
                  setAck(false);
                } catch {
                  setError("Não foi possível exportar o backup.");
                }
              }}
            >
              1. Exportar backup de segurança
            </Button>
          </li>
          <li>
            <Button
              variant="outline"
              disabled={!backup || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const raw = JSON.stringify(state);
                  const p = await previewEntryMigration(state);
                  setPreview(p);
                  setSource(raw);
                  setAck(false);
                  setError("");
                } catch {
                  setError(
                    "Confira a integridade dos dados antes de continuar.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              2. Validar e conferir
            </Button>
          </li>
        </ol>
        {preview && (
          <section className="entry-preview">
            <h3>Dados preservados</h3>
            <p>
              {state.transactions.length} lançamentos ·{" "}
              {state.planning?.goals.length ?? 0} planejamentos · configurações
              atuais.
            </p>
            <p>
              O novo sistema começa vazio. Cadastre suas contas e cartões com as
              informações corretas.
            </p>
            <label>
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />{" "}
              Guardei o backup e confirmo a preparação do novo sistema.
            </label>
          </section>
        )}
        {error && (
          <p role="alert" className="field-error">
            {error}
          </p>
        )}
      </div>
      <footer className="entry-footer">
        <Button variant="ghost" onClick={onLegacy}>
          Continuar no cadastro anterior
        </Button>
        <Button
          disabled={!preview || !ack || busy}
          onClick={async () => {
            setBusy(true);
            try {
              if (JSON.stringify(state) !== source || backupSource !== source)
                throw Error();
              const next = await activateEntryLedger(state, preview!, {
                backupExported: backup,
                confirmed: ack,
              });
              if (!onCommit(next)) throw Error();
            } catch {
              setError(
                "Os dados mudaram ou não puderam ser salvos. Exporte um backup e revise novamente.",
              );
              setPreview(undefined);
              setAck(false);
            } finally {
              setBusy(false);
            }
          }}
        >
          Ativar novo formulário
        </Button>
      </footer>
    </EntryDialog>
  );
}
