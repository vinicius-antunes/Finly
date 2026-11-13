import { money, type State } from "../model";
import { operationBalance, invoiceBalance } from "./finance";
const situation: Record<string, string> = {
  pending: "Pendente",
  partial: "Parcialmente liquidado",
  settled: "Liquidado",
  cancelled: "Cancelado",
  open: "Em aberto",
  paid: "Paga",
};
export function LedgerActivity({
  state,
  period,
  screen,
}: {
  state: State;
  period: string;
  screen: string;
}) {
  const l = state.entryLedger;
  if (!l) return null;
  const operations = l.operations.filter(
    (o) =>
      o.period === period &&
      (screen === "invoice"
        ? o.type === "card"
        : screen === "refunds"
          ? o.type === "reimbursement"
          : true),
  );
  return (
    <section
      className="category-panel"
      style={{ minWidth: 0, overflowWrap: "anywhere" }}
    >
      <h2>Operações do novo motor financeiro</h2>
      <p>
        Histórico financeiro da Fase 2. O cadastro e a edição pelo novo
        formulário serão integrados na Fase 5.
      </p>
      {operations.map((o) => (
        <article key={o.id}>
          <strong>
            {o.description} · {money(o.amountCents)}
          </strong>
          <p>
            {o.type === "card"
              ? o.confirmed
                ? "Compra confirmada; quitação separada"
                : "Compra prevista"
              : `${situation[operationBalance(l, o.id).status]} · liquidado ${money(operationBalance(l, o.id).paid)} · restante ${money(operationBalance(l, o.id).remaining)}`}
          </p>
          <details>
            <summary>Histórico de liquidações</summary>
            {l.settlements
              .filter((p) => p.operationId === o.id)
              .map((p) => (
                <p key={p.id}>
                  {p.reversesId ? "Estorno" : "Liquidação"} ·{" "}
                  {money(p.amountCents)} · {p.date} ·{" "}
                  {l.accounts.find((a) => a.id === p.accountId)?.name} ·{" "}
                  {p.method} · {p.note} · ID {p.id}
                </p>
              ))}
          </details>
        </article>
      ))}
      {screen === "invoice" &&
        l.invoices
          .filter((i) => i.period === period)
          .map((i) => (
            <p key={i.id}>
              Fatura {l.cards.find((c) => c.id === i.cardId)?.name}:{" "}
              {situation[invoiceBalance(l, i.id).status]} · pago{" "}
              {money(invoiceBalance(l, i.id).paid)}
            </p>
          ))}
      {screen === "entries" &&
        l.transfers
          .filter((t) => t.date.slice(0, 7) === period)
          .map((t) => (
            <p key={t.id}>
              Transferência: {money(t.amountCents)} ·{" "}
              {t.confirmed ? "Efetivada" : "Prevista"} · sem receita ou despesa
            </p>
          ))}
    </section>
  );
}
