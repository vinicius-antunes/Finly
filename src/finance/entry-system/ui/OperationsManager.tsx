import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { State } from "../../model";
import { money } from "../../model";
import { confirmTransfer } from "../commands";
import { invoiceBalance } from "../finance";
import { changeRecurrence, generateOccurrences } from "../credit/recurrences";
import { cancelPurchase } from "../credit/purchases";
import { InvoicePayments } from "./Payments";
import { MoneyInput, parseMoney, today } from "./fields";
import { dateInMonth } from "../credit/dates";
export function OperationsManager({
  state,
  period,
  screen,
  onCommit,
  onEdit,
  onNewTransfer,
}: {
  state: State;
  period: string;
  screen: string;
  onCommit: (s: State) => boolean;
  onEdit: (id: string) => void;
  onNewTransfer: () => void;
}) {
  const [error, setError] = useState(""),
    [invoice, setInvoice] = useState<string>();
  const l = state.entryLedger;
  if (!l) return null;
  function apply(fn: () => NonNullable<State["entryLedger"]>) {
    try {
      if (!onCommit({ ...state, entryLedger: fn() }))
        throw Error(
          "Os dados não puderam ser salvos. Atualize e tente novamente.",
        );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confira os dados.");
    }
  }
  return (
    <>
      {screen === "entries" && (
        <section className="category-panel">
          <div className="entry-inline-actions">
            <h2>Transferências entre contas</h2>
            <Button variant="outline" onClick={onNewTransfer}>
              Nova transferência
            </Button>
          </div>
          {l.transfers
            .filter((t) => t.date.slice(0, 7) === period)
            .map((t) => (
              <article key={t.id} className="catalog-row">
                <div>
                  <strong>
                    {l.accounts.find((a) => a.id === t.fromAccountId)?.name} →{" "}
                    {l.accounts.find((a) => a.id === t.toAccountId)?.name}
                  </strong>
                  <p>
                    {money(t.amountCents)} · {t.date} ·{" "}
                    {t.confirmed ? "Efetivada" : "Prevista"} · {t.note}
                  </p>
                </div>
                {!t.confirmed && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (
                        confirm(
                          `Efetivar a transferência de ${money(t.amountCents)}? Não haverá receita nem despesa.`,
                        )
                      )
                        apply(() => confirmTransfer(l, t.id));
                    }}
                  >
                    Efetivar transferência
                  </Button>
                )}
              </article>
            ))}
        </section>
      )}
      {screen === "invoice" &&
        l.invoices
          .filter((i) => i.period === period)
          .map((i) => {
            const b = invoiceBalance(l, i.id);
            return (
              <section key={i.id} className="category-panel">
                <h2>
                  {l.cards.find((c) => c.id === i.cardId)?.name} · {i.period}
                </h2>
                <p>
                  Total {money(b.total)} · Pago {money(b.paid)} · Pendente{" "}
                  {money(b.remaining)}
                </p>
                <Button variant="outline" onClick={() => setInvoice(i.id)}>
                  Gerenciar pagamentos da fatura
                </Button>
                {i.installmentIds.map((id) => {
                  const o = l.operations.find((o) => o.id === id)!;
                  return (
                    <article className="catalog-row" key={id}>
                      <span>
                        {o.description} · {money(o.amountCents)} ·{" "}
                        {o.confirmed ? "Confirmada" : "Prevista"}
                        {o.cancelled ? " · Cancelada" : ""}
                      </span>
                      <Button variant="ghost" onClick={() => onEdit(id)}>
                        Editar compra
                      </Button>
                    </article>
                  );
                })}
              </section>
            );
          })}
      {screen === "installments" && (
        <>
          <section className="category-panel">
            <h2>Gerenciar compras e parcelas</h2>
            {l.purchases.map((p) => (
              <article className="catalog-row" key={p.id}>
                <div>
                  <strong>
                    {l.operations.find((o) => o.purchaseId === p.id)
                      ?.description ?? "Compra"}
                  </strong>
                  <p>
                    {money(p.contractedCents)} · {p.installmentIds.length || 1}{" "}
                    parcela(s){p.goalId ? " · Planejamento vinculado" : ""}
                    {p.cancelled ? " · Cancelada" : ""}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    onEdit(p.installmentIds[0] ?? p.downPaymentEntryId!)
                  }
                >
                  Editar parcelas
                </Button>
                {!p.cancelled && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const reason = prompt("Motivo do cancelamento da compra");
                      if (
                        reason &&
                        confirm(
                          "Cancelar a compra? Pagamentos e acordos ativos deverão ser regularizados antes. A reserva do cofrinho não será devolvida automaticamente.",
                        )
                      )
                        apply(() =>
                          cancelPurchase(l, p.id, {
                            id: crypto.randomUUID(),
                            date: today(),
                            reason,
                            confirmed: true,
                          }),
                        );
                    }}
                  >
                    Cancelar compra
                  </Button>
                )}
              </article>
            ))}
          </section>
          <section className="category-panel">
            <h2>Gerenciar recorrências</h2>
            {l.recurrences.map((r) => (
              <RecurrenceControls
                key={r.id}
                state={state}
                id={r.id}
                onApply={apply}
                onEdit={onEdit}
              />
            ))}
          </section>
        </>
      )}
      {error && (
        <p role="alert" className="warning-banner">
          {error}
        </p>
      )}
      {invoice && (
        <InvoicePayments
          state={state}
          invoiceId={invoice}
          onCommit={onCommit}
          onClose={() => setInvoice(undefined)}
        />
      )}
    </>
  );
}
function RecurrenceControls({
  state,
  id,
  onApply,
  onEdit,
}: {
  state: State;
  id: string;
  onApply: (fn: () => NonNullable<State["entryLedger"]>) => void;
  onEdit: (id: string) => void;
}) {
  const l = state.entryLedger!,
    r = l.recurrences.find((r) => r.id === id)!;
  const [date, setDate] = useState(today()),
    [to, setTo] = useState(today().slice(0, 7)),
    [amount, setAmount] = useState(""),
    [scope, setScope] = useState("amount");
  const event = (
    kind: "pause" | "resume" | "cancel" | "amount" | "override",
  ) => {
    if (
      confirm(
        `${kind === "pause" ? "Pausar" : kind === "resume" ? "Retomar" : kind === "cancel" ? "Cancelar" : "Alterar valor de"} esta recorrência a partir de ${date}? O histórico confirmado será preservado.`,
      )
    )
      onApply(() =>
        changeRecurrence(
          l,
          id,
          {
            id: crypto.randomUUID(),
            kind,
            effectiveOn: date,
            ...(["amount", "override"].includes(kind)
              ? { amountCents: parseMoney(amount) }
              : {}),
          },
          true,
        ),
      );
  };
  return (
    <article className="entry-subcard">
      <h3>{r.description}</h3>
      <p>
        {r.frequency === "monthly" ? "Mensal" : "Anual"} ·{" "}
        {r.status === "active"
          ? "Ativa"
          : r.status === "paused"
            ? "Pausada"
            : "Cancelada"}{" "}
        · {money(r.amountCents)} · início {r.startsOn}
      </p>
      <details>
        <summary>Alterar recorrência e consultar ocorrências</summary>
        <label>
          Data da alteração
          <input
            aria-label="Data da alteração da recorrência"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <div className="entry-inline-actions">
          {r.status !== "cancelled" && (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  event(r.status === "paused" ? "resume" : "pause")
                }
              >
                {r.status === "paused" ? "Retomar" : "Pausar"}
              </Button>
              <Button variant="outline" onClick={() => event("cancel")}>
                Cancelar recorrência
              </Button>
            </>
          )}
        </div>
        {r.status !== "cancelled" && (
          <>
            <MoneyInput
              aria-label="Novo valor da recorrência"
              value={amount}
              onChange={setAmount}
            />
            <select
              aria-label="Escopo da recorrência"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="override">Somente a ocorrência desta data</option>
              <option value="amount">Esta e as próximas</option>
            </select>
            <Button
              variant="outline"
              onClick={() => event(scope as "amount" | "override")}
            >
              Revisar valor da recorrência
            </Button>
            <label>
              Prever até
              <input
                aria-label="Gerar ocorrências até"
                type="month"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <Button
              variant="outline"
              onClick={() => {
                if (
                  confirm(
                    `Gerar previsões de ${date} até ${to}? Nenhum pagamento será confirmado.`,
                  )
                )
                  onApply(() =>
                    generateOccurrences(
                      l,
                      id,
                      date,
                      dateInMonth(to, 31),
                      {},
                      {
                        acknowledgePaidInvoices: true,
                        correctionDate: today(),
                      },
                    ),
                  );
              }}
            >
              Gerar previsões
            </Button>
          </>
        )}
        {r.occurrences.map((x) => {
          const o = l.operations.find((o) => o.id === x.operationId)!;
          return (
            <div className="catalog-row" key={o.id}>
              <span>
                {x.scheduledOn} · {money(o.amountCents)} ·{" "}
                {o.cancelled
                  ? "Cancelada"
                  : o.confirmed
                    ? "Confirmada"
                    : "Prevista"}
              </span>
              <Button variant="ghost" onClick={() => onEdit(o.id)}>
                Editar ocorrência
              </Button>
            </div>
          );
        })}
      </details>
    </article>
  );
}
