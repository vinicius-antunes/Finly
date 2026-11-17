import { monthOffset } from "../credit/dates";
import type { ReactNode } from "react";
import { parseMoney } from "./money";
import { FormField, MoneyInput } from "./fields";
import { money, type State } from "../../model";
import { balance } from "../../planning/data";
import type { LedgerDraft } from "../contracts";
import type { EntryDraft, PreparedEntry, quoteDraft } from "./draft";
type Fields = {
  text: (
    label: string,
    key: keyof EntryDraft,
    type?: string,
    wide?: boolean,
  ) => ReactNode;
  select: (
    label: string,
    key: keyof EntryDraft,
    options: [string, string][],
  ) => ReactNode;
  account: (
    label: string,
    key: "accountId" | "destinationId" | "downAccountId",
  ) => ReactNode;
  monetary: (
    label: string,
    key:
      | "amount"
      | "paymentAmount"
      | "down"
      | "original"
      | "final"
      | "useReserve",
  ) => ReactNode;
};
type SectionProps = {
  d: EntryDraft;
  errors: Record<string, string>;
  patch: (v: Partial<EntryDraft>) => void;
  fields: Fields;
};
export function InstallmentFields({
  d,
  errors,
  patch,
  fields: { text, select, account, monetary },
  quote,
  quoteError,
  first,
}: SectionProps & {
  quote?: ReturnType<typeof quoteDraft>;
  quoteError: string;
  first: string;
}) {
  return (
    <details
      className="entry-section"
      open={d.paymentMode === "installments" || undefined}
    >
      <summary>Parcelamento e entrada</summary>
      <div className="entry-grid">
        {d.paymentMode === "installments" && (
          <>
            {select("Informar valor como", "valueMode", [
              ["total", "Valor total"],
              ["installment", "Valor da parcela"],
            ])}
            <FormField
              label="Quantidade de parcelas"
              error={errors.count}
              name="count"
            >
              {(p) => (
                <input
                  {...p}
                  type="number"
                  min={1}
                  max={120}
                  value={d.count}
                  onChange={(e) => {
                    if (
                      d.customInstallments.length &&
                      !confirm(
                        "Alterar a quantidade e limpar os ajustes individuais?",
                      )
                    )
                      return;
                    patch({
                      count: Number(e.target.value),
                      customInstallments: [],
                    });
                  }}
                />
              )}
            </FormField>
          </>
        )}
        {monetary("Valor da entrada (opcional)", "down")}
        {d.down && (
          <>
            {account("Conta da entrada", "downAccountId")}
            {text("Método da entrada", "downMethod")}
            {text("Data da entrada", "downDate", "date")}
            <label>
              <input
                type="checkbox"
                checked={d.downPaid}
                onChange={(e) => patch({ downPaid: e.target.checked })}
              />{" "}
              Entrada já paga
            </label>
          </>
        )}
        {select("Juros", "interestMethod", [
          ["none", "Sem taxa informada"],
          ["simple-monthly", "Simples mensal"],
          ["compound-monthly", "Composto mensal"],
        ])}
        {d.interestMethod !== "none" && (
          <>
            {text("Taxa mensal (%)", "rate")}
            {monetary("Valor original à vista", "original")}
          </>
        )}
        {monetary("Valor final contratado (opcional)", "final")}
      </div>
      {d.paymentMode === "installments" && (
        <details
          className="entry-section"
          tabIndex={-1}
          data-field="customInstallments"
        >
          <summary>Valores e competências individuais</summary>
          <label>
            <input
              type="checkbox"
              checked={d.customInstallments.length > 0}
              disabled={
                !d.customInstallments.length &&
                (!quote || !/^20\d\d-\d\d$/.test(first))
              }
              onChange={(e) => {
                if (
                  !e.target.checked &&
                  !confirm("Descartar os ajustes individuais das parcelas?")
                )
                  return;
                patch({
                  customInstallments: e.target.checked
                    ? quote!.installments.map((value, i) => ({
                        amount: money(value),
                        period: monthOffset(first, i),
                      }))
                    : [],
                });
              }}
            />{" "}
            Personalizar valores e competências
          </label>
          {d.customInstallments.map((r, i) => (
            <div className="entry-grid" key={i}>
              <FormField label={`Valor da parcela ${i + 1}`}>
                {(a) => (
                  <MoneyInput
                    {...a}
                    value={r.amount}
                    onChange={(amount) =>
                      patch({
                        customInstallments: d.customInstallments.map((p, n) =>
                          n === i ? { ...p, amount } : p,
                        ),
                      })
                    }
                  />
                )}
              </FormField>
              <FormField label={`Competência da parcela ${i + 1}`}>
                {(a) => (
                  <input
                    {...a}
                    type="month"
                    value={r.period}
                    onChange={(e) =>
                      patch({
                        customInstallments: d.customInstallments.map((p, n) =>
                          n === i ? { ...p, period: e.target.value } : p,
                        ),
                      })
                    }
                  />
                )}
              </FormField>
            </div>
          ))}
          {errors.customInstallments && (
            <p role="alert" className="field-error">
              {errors.customInstallments}
            </p>
          )}
          <p className="entry-hint">
            A soma deve fechar o total contratado; a data original da compra é
            preservada.
          </p>
        </details>
      )}
      {quote ? (
        <div className="entry-preview">
          <p>
            Original {money(quote.originalCents)} · Entrada{" "}
            {money(quote.downCents)}
          </p>
          <strong>Total contratado {money(quote.contractedCents)}</strong>
          <p>
            {quote.installments.length} parcela(s):{" "}
            {quote.installments.map(money).join(" + ")}
          </p>
          <p>Juros / diferença: {money(quote.interestCents)}</p>
          {d.interestMethod !== "none" && (
            <>
              <p>
                Estimativa pela taxa: {money(quote.estimatedCents)} ·
                Divergência para o contratado: {money(quote.divergenceCents)}
              </p>
              <p className="entry-hint">
                Taxa mensal aplicada ao principal após a entrada.{" "}
                {d.interestMethod === "simple-monthly"
                  ? "Simples: principal × (1 + taxa × meses)."
                  : "Composto: principal × (1 + taxa) elevado aos meses."}{" "}
                O total contratado informado prevalece. Não é CET ou sistema
                Price.
              </p>
            </>
          )}
          <p>Primeira fatura: {d.customInstallments[0]?.period ?? first}</p>
        </div>
      ) : (
        d.amount && <p className="field-error">{quoteError}</p>
      )}
    </details>
  );
}
export function PlanningFields({
  d,
  errors,
  patch,
  fields: { select, monetary },
  state,
}: SectionProps & { state: State }) {
  return (
    <details className="entry-section">
      <summary>Vincular a planejamento</summary>
      {select("Cofrinho", "goalId", [
        ["", "Sem vínculo"],
        ...(state.planning?.goals ?? [])
          .filter(
            (g) =>
              ["active", "paused"].includes(g.status) &&
              g.purchaseIds === undefined,
          )
          .map((g) => [g.id, g.name] as [string, string]),
      ])}
      {d.goalId && (
        <>
          <p>
            Reservado:{" "}
            {money(
              balance(state.planning!.goals.find((g) => g.id === d.goalId)!),
            )}
          </p>
          {monetary("Valor da reserva a utilizar", "useReserve")}
          <p>
            Saldo restante:{" "}
            {(() => {
              try {
                return money(
                  balance(
                    state.planning!.goals.find((g) => g.id === d.goalId)!,
                  ) - parseMoney(d.useReserve),
                );
              } catch {
                return "—";
              }
            })()}
          </p>
          <label>
            <input
              data-field="reserveConfirmed"
              type="checkbox"
              checked={d.reserveConfirmed}
              onChange={(e) => patch({ reserveConfirmed: e.target.checked })}
            />{" "}
            Confirmo utilizar esta reserva e concluir o planejamento ao salvar.
          </label>
          {errors.reserveConfirmed && (
            <p className="field-error">{errors.reserveConfirmed}</p>
          )}
        </>
      )}
    </details>
  );
}
export function RecurrenceFields({
  d,
  fields: { text, select },
  nextOccurrence,
}: SectionProps & { nextOccurrence: string }) {
  return (
    <section className="entry-section entry-grid">
      <h3 className="entry-wide">Repetição prevista</h3>
      {select("Frequência", "frequency", [
        ["monthly", "Mensal"],
        ["annual", "Anual"],
      ])}
      {text("Data de término (opcional)", "endsOn", "date")}
      {text("Gerar previsões até", "generateTo", "month")}
      <p className="entry-hint entry-wide">
        Próxima ocorrência prevista: {nextOccurrence}. Início em {d.date}. As
        próximas ocorrências serão previstas, sem pagamentos automáticos. Gere
        apenas o intervalo que deseja acompanhar (até 24 meses).
      </p>
    </section>
  );
}
export function EntryPreview({
  d,
  ledger: l,
  preview,
  isEdit,
  ack,
  setAck,
  paidAck,
  setPaidAck,
}: {
  d: EntryDraft;
  ledger: LedgerDraft;
  preview: PreparedEntry;
  isEdit: boolean;
  ack: boolean;
  setAck: (v: boolean) => void;
  paidAck: boolean;
  setPaidAck: (v: boolean) => void;
}) {
  return (
    <section className="entry-preview">
      <h3>Confira antes de salvar</h3>
      {preview.warnings?.map((w) => (
        <p role="status" key={w} className="warning-banner">
          {w}
        </p>
      ))}
      {!!preview.paidInvoiceImpacts?.length && (
        <section
          className="warning-banner"
          aria-label="Impacto em faturas com pagamentos"
        >
          <h4>Esta alteração afeta uma fatura com pagamentos</h4>
          {preview.paidInvoiceImpacts.map((i) => (
            <p key={i.id}>
              Total anterior {money(i.before)} → novo total {money(i.after)}.
              Pagamentos preservados: {money(i.paid)}. Restante após correção:{" "}
              {money(i.after - i.paid)}.
            </p>
          ))}
          <label>
            <input
              type="checkbox"
              checked={paidAck}
              onChange={(e) => setPaidAck(e.target.checked)}
            />{" "}
            Reconheço o impacto na fatura e a preservação dos pagamentos
            originais.
          </label>
        </section>
      )}
      {preview.rows.map((r, i) => (
        <div key={i} className="entry-summary-row">
          <span>
            {r.label} · {r.period}
          </span>
          <strong>
            {r.previousCents !== undefined && (
              <>de {money(r.previousCents)} para </>
            )}
            {money(r.amountCents)}
          </strong>
        </div>
      ))}
      {d.type === "transfer" && (
        <p>
          Transferir {d.amount} de{" "}
          {l.accounts.find((a) => a.id === d.accountId)?.name} para{" "}
          {l.accounts.find((a) => a.id === d.destinationId)?.name}. Sem receita
          ou despesa.
        </p>
      )}
      {d.people.length > 0 &&
        (d.type !== "card" || d.responsibility !== "personal") && (
          <p>
            {d.people.length} responsável(is). Os valores previstos não
            representam dinheiro recebido.
          </p>
        )}
      {d.goalId && (
        <p>
          Reserva a utilizar: {d.useReserve}. A compra será registrada uma única
          vez.
        </p>
      )}
      {isEdit && (
        <p>
          Motivo: {d.reason}. Pagamentos e vínculos serão mantidos. Faturas e
          acordos vinculados podem ser afetados; os acordos não serão
          redistribuídos automaticamente.
        </p>
      )}
      <label>
        <input
          type="checkbox"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
        />{" "}
        Conferi os valores, vínculos e o impacto financeiro.
      </label>
    </section>
  );
}
