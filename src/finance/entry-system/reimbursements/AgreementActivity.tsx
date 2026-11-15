import { money } from "../../model";
import type { LedgerDraft } from "../contracts";
import { agreementBalance } from "./commands";
const labels: Record<string, string> = {
  planned: "Previsto",
  pending: "Pendente",
  partial: "Parcialmente recebido",
  received: "Totalmente recebido",
  cancelled: "Cancelado",
};
export function AgreementActivity({
  ledger: l,
  asOf,
}: {
  ledger: LedgerDraft;
  asOf: string;
}) {
  if (!l.agreements?.length) return null;
  return (
    <section className="category-panel">
      <h2>Acordos de reembolso</h2>
      {l.agreements.map((a) => {
        const b = agreementBalance(l, a.id, asOf);
        return (
          <article key={a.id}>
            <h3>
              {a.terms.description} ·{" "}
              {a.terms.personLabel || "Identificação pendente"}
            </h3>
            <p>
              {a.origin === "standalone"
                ? "Reembolso avulso"
                : `Compra ${a.purchaseId}`}{" "}
              · Responsável ID {a.terms.personId} · {labels[b.status]}
            </p>
            <p>
              Combinado {money(b.total)} · Recebido {money(b.received)} ·
              Pendente {money(b.pending)} · Cancelado {money(b.cancelled)}
            </p>
            <details>
              <summary>Cronograma e histórico do acordo</summary>
              <p>{a.terms.note}</p>
              {a.terms.schedule.map((r) => (
                <p key={r.id}>
                  {r.period} · {r.expectedDate || "Data a definir"} ·{" "}
                  {money(r.amountCents)} · Obrigação {r.id}
                </p>
              ))}
              {a.events.map((e) => (
                <p key={e.id}>
                  {e.date} · {e.kind === "cancel" ? "Cancelamento" : "Correção"}{" "}
                  · {e.reason} · ID {e.id}
                </p>
              ))}
              {l.settlements
                .filter((p) => a.operationIds.includes(p.operationId))
                .map((p) => (
                  <p key={p.id}>
                    {p.reversesId ? "Estorno" : "Recebimento"} ·{" "}
                    {money(p.amountCents)} · {p.date} ·{" "}
                    {l.accounts.find((c) => c.id === p.accountId)?.name} ·{" "}
                    {p.method} · {p.note} · ID {p.id}
                  </p>
                ))}
            </details>
          </article>
        );
      })}
    </section>
  );
}
