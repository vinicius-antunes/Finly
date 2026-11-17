import {
  ReceiptFields,
  SavedReceipts,
  ReceiptManager,
} from "../../receipts/ReceiptFields";
import {
  allReceipts,
  withReceipts,
  type PendingReceipt,
  type Target,
} from "../../receipts/model";
import { coordinatedSave, currentSnapshot } from "../../receipts/storage";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { State } from "../../model";
import { money } from "../../model";
import { operationBalance, invoiceBalance } from "../finance";
import {
  recordSettlement,
  recordInvoicePayment,
  cancelOperation,
} from "../commands";
import { receiveAgreement, cancelAgreement } from "../reimbursements/commands";
import { MoneyInput, FormField, parseMoney, today } from "./fields";
import { EntryDialog } from "./EntryDialog";
export function Payments({
  state,
  operationId,
  invoiceId,
  onCommit,
  onDirtyChange,
}: {
  state: State;
  operationId?: string;
  invoiceId?: string;
  onCommit: (s: State) => boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const l = state.entryLedger!,
    agreement = l.agreements?.find((a) =>
      a.operationIds.includes(operationId ?? ""),
    );
  const [target, setTarget] = useState(operationId ?? ""),
    [value, setValue] = useState(""),
    [date, setDate] = useState(today),
    [account, setAccount] = useState(
      l.accounts.find((a) => a.type !== "credit_card" && !a.archived)?.id ?? "",
    ),
    [method, setMethod] = useState("Pix"),
    [note, setNote] = useState(""),
    [error, setError] = useState(""),
    [id, setId] = useState(() => crypto.randomUUID()),
    [busy, setBusy] = useState(false);
  const [filesValidating, setFilesValidating] = useState(false);
  const [files, setFiles] = useState<PendingReceipt[]>([]);
  const sending = useRef(false);
  const [receiptTarget, setReceiptTarget] = useState<Target>();
  const snapshot = JSON.stringify({ value, date, account, method, note });
  const baseline = useRef(snapshot);
  const dirty =
    snapshot !== baseline.current || files.length > 0 || filesValidating;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  function mark(
    next: Partial<{
      value: string;
      date: string;
      account: string;
      method: string;
      note: string;
    }>,
  ) {
    onDirtyChange?.(
      files.length > 0 ||
        filesValidating ||
        JSON.stringify({ value, date, account, method, note, ...next }) !==
          baseline.current,
    );
  }
  const op = l.operations.find((o) => o.id === target);
  const ids = agreement?.operationIds ?? [target];
  const b = invoiceId
    ? invoiceBalance(l, invoiceId)
    : operationBalance(l, target);
  const history = invoiceId
    ? l.invoicePayments.filter((p) => p.invoiceId === invoiceId)
    : l.settlements.filter((p) => ids.includes(p.operationId));
  const total = agreement
    ? ids.reduce(
        (n, id) =>
          n +
          (l.operations.find((o) => o.id === id)?.cancelled
            ? 0
            : l.operations.find((o) => o.id === id)!.amountCents),
        0,
      )
    : b.total;
  const received = agreement
    ? ids.reduce((n, id) => n + operationBalance(l, id).paid, 0)
    : b.paid;
  const apply = async (fn: () => NonNullable<State["entryLedger"]>) => {
    if (sending.current || filesValidating) return;
    sending.current = true;
    setBusy(true);
    try {
      const next = { ...state, entryLedger: fn() };
      const t = {
        kind: invoiceId ? ("invoicePayment" as const) : ("settlement" as const),
        id,
      };
      if (files.length)
        await coordinatedSave(
          withReceipts(next, [
            ...allReceipts(next),
            ...files.map((p) => ({ ...p.receipt, target: t })),
          ]),
          files,
          currentSnapshot(state),
          onCommit,
        );
      else if (!onCommit(next))
        throw Error(
          "Não foi possível salvar. Confira o armazenamento ou atualize os dados.",
        );
      setFiles([]);
      setId(crypto.randomUUID());
      baseline.current = JSON.stringify({
        value: "",
        date,
        account,
        method,
        note: "",
      });
      setValue("");
      setNote("");
      onDirtyChange?.(false);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível registrar.");
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="entry-history">
      {receiptTarget && (
        <ReceiptManager
          state={state}
          target={receiptTarget}
          onCommit={onCommit}
          onClose={() => setReceiptTarget(undefined)}
        />
      )}
      <h3>
        {invoiceId
          ? "Pagamentos da fatura"
          : op?.type === "expense"
            ? "Pagamentos"
            : "Recebimentos"}
      </h3>
      <div className="entry-balance">
        <span>
          Total<strong>{money(total)}</strong>
        </span>
        <span>
          {op?.type === "expense" || invoiceId ? "Pago" : "Recebido"}
          <strong>{money(received)}</strong>
        </span>
        <span>
          Pendente<strong>{money(total - received)}</strong>
        </span>
      </div>
      {agreement && (
        <FormField label="Previsão a receber">
          {(p) => (
            <select
              {...p}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              {agreement.terms.schedule.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.period} · {money(operationBalance(l, r.id).remaining)}{" "}
                  pendentes
                </option>
              ))}
            </select>
          )}
        </FormField>
      )}
      <div className="entry-grid">
        <FormField label="Valor do pagamento / recebimento">
          {(p) => (
            <MoneyInput
              {...p}
              value={value}
              onChange={(v) => {
                mark({ value: v });
                setValue(v);
              }}
            />
          )}
        </FormField>
        <FormField label="Data efetiva">
          {(p) => (
            <input
              {...p}
              type="date"
              value={date}
              onChange={(e) => {
                mark({ date: e.target.value });
                setDate(e.target.value);
              }}
            />
          )}
        </FormField>
        <FormField label="Conta efetiva">
          {(p) => (
            <select
              {...p}
              value={account}
              onChange={(e) => {
                mark({ account: e.target.value });
                setAccount(e.target.value);
              }}
            >
              <option value="">Selecione</option>
              {l.accounts
                .filter((a) => a.type !== "credit_card" && !a.archived)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          )}
        </FormField>
        <FormField label="Método efetivo">
          {(p) => (
            <input
              {...p}
              value={method}
              onChange={(e) => {
                mark({ method: e.target.value });
                setMethod(e.target.value);
              }}
            />
          )}
        </FormField>
        <FormField label="Observação do pagamento" wide>
          {(p) => (
            <input
              {...p}
              value={note}
              onChange={(e) => {
                mark({ note: e.target.value });
                setNote(e.target.value);
              }}
            />
          )}
        </FormField>
      </div>
      <ReceiptFields
        pending={files}
        onChange={setFiles}
        onBusyChange={setFilesValidating}
        known={allReceipts(state)}
        disabled={busy}
      />
      <div className="entry-inline-actions">
        <Button
          type="button"
          disabled={busy || filesValidating || b.remaining <= 0}
          onClick={() =>
            apply(() => {
              const base = {
                id,
                amountCents: parseMoney(value),
                date,
                accountId: account,
                method,
                note,
              };
              return invoiceId
                ? recordInvoicePayment(l, { ...base, invoiceId })
                : agreement
                  ? receiveAgreement(l, agreement.id, {
                      ...base,
                      operationId: target,
                    })
                  : recordSettlement(l, { ...base, operationId: target });
            })
          }
        >
          Registrar{" "}
          {invoiceId || op?.type === "expense" ? "pagamento" : "recebimento"}
        </Button>
        {!invoiceId && (
          <Button
            type="button"
            variant="ghost"
            disabled={busy || files.length > 0}
            onClick={() => {
              if (
                confirm(
                  "Cancelar a obrigação? Recebimentos ou pagamentos precisam ser regularizados antes.",
                )
              )
                apply(() =>
                  agreement
                    ? cancelAgreement(l, agreement.id, {
                        id,
                        date,
                        reason: note || "Cancelamento confirmado pelo usuário",
                        confirmed: true,
                      })
                    : cancelOperation(l, target),
                );
            }}
          >
            Cancelar obrigação
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <h4>Histórico</h4>
      {history.length ? (
        history.map((p) => (
          <div key={p.id} className="catalog-row">
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setReceiptTarget({
                  kind: invoiceId ? "invoicePayment" : "settlement",
                  id: p.id,
                })
              }
            >
              Comprovantes deste registro
            </Button>
            <SavedReceipts
              state={state}
              targets={[
                { kind: invoiceId ? "invoicePayment" : "settlement", id: p.id },
              ]}
              onCommit={onCommit}
            />
            <span>
              {p.reversesId ? "Estorno" : "Confirmado"} · {money(p.amountCents)}{" "}
              · {p.date} · {l.accounts.find((a) => a.id === p.accountId)?.name}{" "}
              · {p.method} · {p.note}
            </span>
            {!p.reversesId && !history.some((r) => r.reversesId === p.id) && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy || files.length > 0}
                onClick={() => {
                  if (
                    confirm(
                      "Estornar este registro? O original ficará no histórico.",
                    )
                  )
                    apply(() => {
                      const reversal = {
                        ...p,
                        id,
                        reversesId: p.id,
                        date,
                        note: note || "Estorno confirmado",
                      };
                      return invoiceId
                        ? recordInvoicePayment(l, { ...reversal, invoiceId })
                        : agreement
                          ? receiveAgreement(
                              l,
                              agreement.id,
                              {
                                ...reversal,
                                operationId: (p as { operationId: string })
                                  .operationId,
                              },
                              true,
                            )
                          : recordSettlement(l, {
                              ...reversal,
                              operationId: (p as { operationId: string })
                                .operationId,
                            });
                    });
                }}
              >
                Estornar
              </Button>
            )}
          </div>
        ))
      ) : (
        <p>Nenhum pagamento ou recebimento confirmado.</p>
      )}
    </section>
  );
}
export function InvoicePayments({
  state,
  invoiceId,
  onCommit,
  onClose,
}: {
  state: State;
  invoiceId: string;
  onCommit: (s: State) => boolean;
  onClose: () => void;
}) {
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty]);

  const close = () => {
    if (!dirty || confirm("Descartar o pagamento ainda não registrado?"))
      onClose();
  };
  return (
    <EntryDialog
      title="Conferir fatura"
      description="Pagamentos da fatura são separados das compras e reembolsos."
      onClose={onClose}
      dirty={dirty}
    >
      <div className="entry-body">
        <Payments
          state={state}
          invoiceId={invoiceId}
          onCommit={onCommit}
          onDirtyChange={setDirty}
        />
      </div>
      <footer className="entry-footer">
        <Button onClick={close}>Concluir</Button>
      </footer>
    </EntryDialog>
  );
}
