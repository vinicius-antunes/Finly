import type { State } from "../../model";
import { money } from "../../model";
export function CreditActivity({
  state,
  settings = false,
}: {
  state: State;
  settings?: boolean;
}) {
  const l = state.entryLedger;
  if (!l) return null;
  return (
    <section
      className="category-panel"
      style={{ minWidth: 0, overflowWrap: "anywhere" }}
    >
      <h2>
        {settings
          ? "Cartões do novo motor"
          : "Contratos e recorrências do novo motor"}
      </h2>
      <p>
        Consulta dos registros da Fase 3. O cadastro e a edição pelo novo modal
        serão integrados na Fase 5.
      </p>
      {settings ? (
        l.cards.map((c) => (
          <article key={c.id}>
            <h3>{c.name}</h3>
            <p>
              {c.archived ? "Arquivado" : "Ativo"} · fechamento{" "}
              {c.closingDay ?? "a configurar"} · vencimento{" "}
              {c.dueDay ?? "a configurar"} · dia do fechamento:{" "}
              {c.onClosingDay === "current"
                ? "fatura atual"
                : c.onClosingDay === "next"
                  ? "próxima fatura"
                  : "a configurar"}
            </p>
          </article>
        ))
      ) : (
        <>
          {l.purchases.map((p) => (
            <article key={p.id}>
              <h3>Compra {p.id}</h3>
              <p>
                Contrato {money(p.contractedCents)} · original{" "}
                {money(p.originalCents)} ·{" "}
                {p.cancelled ? "Cancelada" : "Registrada"}
              </p>
              <details>
                <summary>Parcelas e revisões</summary>
                {p.installmentIds.map((id) => {
                  const o = l.operations.find((x) => x.id === id)!;
                  return (
                    <p key={id}>
                      {o.description} · {o.installmentNumber ?? "?"} /{" "}
                      {o.installmentCount ?? "?"} · {o.period} ·{" "}
                      {money(o.amountCents)} ·{" "}
                      {o.cancelled
                        ? "Cancelada"
                        : o.confirmed
                          ? "Confirmada"
                          : "Prevista"}
                    </p>
                  );
                })}
                {p.revisions?.map((r) => (
                  <p key={r.id}>
                    {r.at} · {r.reason} · contrato anterior{" "}
                    {money(r.previousCents)}
                  </p>
                ))}
              </details>
            </article>
          ))}
          {l.recurrences.map((r) => (
            <article key={r.id}>
              <h3>{r.description ?? "Recorrência sem descrição informada"}</h3>
              <p>
                {r.frequency === "annual" ? "Anual" : "Mensal"} ·{" "}
                {r.status === "active"
                  ? "Ativa"
                  : r.status === "paused"
                    ? "Pausada"
                    : "Cancelada"}{" "}
                · início {r.startsOn} · término {r.endsOn ?? "não informado"}
              </p>
              <details>
                <summary>Ocorrências e alterações</summary>
                {r.occurrences.map((o) => (
                  <p key={o.operationId}>
                    {o.scheduledOn} ·{" "}
                    {money(
                      l.operations.find((x) => x.id === o.operationId)!
                        .amountCents,
                    )}{" "}
                    · ID {o.operationId}
                  </p>
                ))}
                {r.events?.map((e) => (
                  <p key={e.id}>
                    {e.effectiveOn} · {e.kind} ·{" "}
                    {e.amountCents !== undefined ? money(e.amountCents) : ""}
                  </p>
                ))}
              </details>
            </article>
          ))}
        </>
      )}
    </section>
  );
}
