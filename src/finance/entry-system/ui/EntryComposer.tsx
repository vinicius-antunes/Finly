import { EntryTabs } from "./EntryTabs";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { State } from "../../model";
import { money } from "../../model";
import type { EntryType } from "../contracts";
import { EntryDialog } from "./EntryDialog";
import {
  initialDraft,
  draftKey,
  newPerson,
  prepareEntry,
  quoteDraft,
  FormProblem,
  type EntryDraft,
  type PreparedEntry,
} from "./draft";
import { FormField, MoneyInput, parseMoney } from "./fields";
import { recurrenceDates } from "../credit/recurrences";
import { dateInMonth } from "../credit/dates";
import { firstInvoice } from "../credit/dates";
import { CategoryPicker, CatalogSettings } from "./CatalogSettings";
import { PeopleFields } from "./PeopleFields";
import { Payments } from "./Payments";
import {
  InstallmentFields,
  PlanningFields,
  RecurrenceFields,
  EntryPreview,
} from "./EntrySections";
import { operationBalance } from "../finance";
export function EntryComposer({
  state,
  type,
  period,
  operationId,
  duplicate = false,
  onCommit,
  onClose,
  onSaved,
}: {
  state: State;
  type: EntryType;
  period: string;
  operationId?: string;
  duplicate?: boolean;
  onCommit: (s: State) => boolean;
  onClose: () => void;
  onSaved: (period: string) => void;
}) {
  const [d, setD] = useState(() =>
    initialDraft(state, type, period, operationId, duplicate),
  );
  const original = useRef(draftKey(d));
  const [paymentDirty, setPaymentDirty] = useState(false),
    [catalogDirty, setCatalogDirty] = useState(false);
  const dirty =
    draftKey(d) !== original.current || paymentDirty || catalogDirty;
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [preview, setPreview] = useState<PreparedEntry>(),
    [ack, setAck] = useState(false),
    [saving, setSaving] = useState(false),
    [catalog, setCatalog] = useState(false);
  const sent = useRef(false),
    body = useRef<HTMLDivElement>(null);
  const l = state.entryLedger!,
    old = !duplicate
      ? l.operations.find((o) => o.id === operationId)
      : undefined;
  const agreement = old
    ? l.agreements?.find((a) => a.operationIds.includes(old.id))
    : undefined;
  const signature = JSON.stringify([old, agreement?.terms]);
  const openingSignature = useRef(signature);
  const [conflict, setConflict] = useState(false);
  useEffect(() => {
    if (operationId && !duplicate && signature !== openingSignature.current) {
      setConflict(true);
      setPreview(undefined);
    }
  }, [signature, operationId, duplicate]);
  const isEdit = !!old;
  const paid =
    old && old.type !== "card" ? operationBalance(l, old.id) : undefined;
  useEffect(() => {
    if (!dirty) return;
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty]);
  function patch(v: Partial<EntryDraft>) {
    setD((x) => ({ ...x, ...v }));
    setPreview(undefined);
    setAck(false);
    setErrors({});
  }
  useEffect(() => {
    if (preview && preview.source !== JSON.stringify(state)) {
      setPreview(undefined);
      setAck(false);
      setErrors({
        _form:
          "Os dados foram atualizados. Confira os campos e gere outra prévia.",
      });
    }
  }, [state, preview]);
  const errorFocus = (e: Record<string, string>) => {
    setErrors(e);
    requestAnimationFrame(() => {
      const key = Object.keys(e)[0];
      const node =
        body.current?.querySelector<HTMLElement>(`[data-field="${key}"]`) ??
        body.current?.querySelector<HTMLElement>('[data-field="_form"]');
      node?.closest("details")?.setAttribute("open", "");
      node?.focus();
    });
  };
  function save(prepared: PreparedEntry) {
    if (sent.current) return;
    sent.current = true;
    setSaving(true);
    try {
      if (prepared.source !== JSON.stringify(state))
        throw Error("Os dados mudaram. Revise novamente.");
      if (!onCommit(prepared.next))
        throw Error(
          "Não foi possível salvar. Verifique o armazenamento e os dados de outra aba.",
        );
      const targetPeriod = old
        ? (prepared.next.entryLedger!.operations.find((o) => o.id === old.id)
            ?.period ?? d.period)
        : d.type === "transfer"
          ? d.date.slice(0, 7)
          : (prepared.rows[0]?.period ?? d.period);
      onSaved(targetPeriod);
    } catch (e) {
      errorFocus({
        _form: e instanceof Error ? e.message : "Não foi possível salvar.",
      });
      sent.current = false;
      setPreview(undefined);
    } finally {
      setSaving(false);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (sent.current || conflict) return;
    if (paymentDirty || catalogDirty) {
      errorFocus({
        _form:
          "Conclua ou limpe o pagamento ou cadastro em preenchimento antes de salvar o lançamento.",
      });
      return;
    }
    try {
      const p = prepareEntry(state, d, old?.id);
      if (p.complex) {
        setPreview(p);
        setAck(false);
      } else save(p);
    } catch (e) {
      errorFocus(
        e instanceof FormProblem
          ? e.fields
          : {
              _form:
                e instanceof Error
                  ? e.message
                  : "Confira os dados antes de salvar.",
            },
      );
    }
  }
  const text = (
    label: string,
    key: keyof EntryDraft,
    inputType = "text",
    wide = false,
  ) => (
    <FormField label={label} name={key} error={errors[key]} wide={wide}>
      {(p) => (
        <input
          {...p}
          type={inputType}
          maxLength={
            key === "description"
              ? 100
              : key === "note" || key === "reason"
                ? 500
                : undefined
          }
          disabled={
            key === "date" &&
            !!old &&
            (old.type === "card" || !!old.recurrenceId)
          }
          value={String(d[key])}
          onChange={(e) => patch({ [key]: e.target.value })}
        />
      )}
    </FormField>
  );
  const cash = l.accounts.filter(
    (a) => a.type !== "credit_card" && !a.archived,
  );
  const account = (
    label: string,
    key: "accountId" | "destinationId" | "downAccountId",
  ) => (
    <FormField label={label} name={key} error={errors[key]}>
      {(p) => (
        <select
          {...p}
          value={d[key]}
          onChange={(e) => patch({ [key]: e.target.value })}
        >
          <option value="">Selecione a conta</option>
          {old &&
            !cash.some((a) => a.id === d[key]) &&
            l.accounts.some((a) => a.id === d[key]) && (
              <option value={d[key]}>
                {l.accounts.find((a) => a.id === d[key])?.name} · arquivada
              </option>
            )}
          {cash.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}
    </FormField>
  );
  const monetary = (
    label: string,
    key:
      "amount" | "paymentAmount" | "down" | "original" | "final" | "useReserve",
  ) => (
    <FormField label={label} name={key} error={errors[key]}>
      {(p) => (
        <MoneyInput
          {...p}
          value={d[key]}
          onChange={(v) => patch({ [key]: v })}
        />
      )}
    </FormField>
  );
  const select = (
    label: string,
    key: keyof EntryDraft,
    options: [string, string][],
  ) => (
    <FormField label={label} name={key} error={errors[key]}>
      {(p) => (
        <select
          {...p}
          value={String(d[key])}
          onChange={(e) => patch({ [key]: e.target.value })}
        >
          {options.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      )}
    </FormField>
  );
  const close = () => {
    if (!dirty || confirm("Descartar as alterações não salvas?")) onClose();
  };
  function switchType(type: EntryType) {
    if (type === d.type) return;
    if (
      (d.people.length ||
        d.down ||
        d.goalId ||
        d.paymentMode !== "single" ||
        d.salary ||
        d.destinationId ||
        d.paymentAmount ||
        d.status !== "pending" ||
        d.categoryId) &&
      !confirm(
        "Trocar o tipo e limpar os campos específicos incompatíveis? Descrição, valor, data e observação serão preservados.",
      )
    )
      return;
    const base = initialDraft(state, type, d.period);
    patch({
      ...base,
      id: d.id,
      description: d.description,
      amount: d.amount,
      date: d.date,
      period: d.period,
      note: d.note,
      accountId: cash.some((a) => a.id === d.accountId)
        ? d.accountId
        : base.accountId,
      categoryId: l.categories
        .find((c) => c.id === d.categoryId)
        ?.types.includes(type)
        ? d.categoryId
        : "",
    });
  }
  let first = "",
    quote: ReturnType<typeof quoteDraft> | undefined,
    quoteError = "";
  if (d.type === "card" && !isEdit) {
    try {
      const card = l.cards.find((c) => c.id === d.cardId);
      if (card)
        first = firstInvoice(
          card,
          d.date,
          d.manualPeriod ? d.period : undefined,
        ).period;
    } catch (e) {
      first = e instanceof Error ? e.message : "Configure o cartão.";
    }
    if (d.paymentMode !== "recurring")
      try {
        quote = quoteDraft(d);
      } catch (e) {
        quoteError = e instanceof Error ? e.message : "Confira os valores.";
      }
  }
  let nextOccurrence = "Preencha as datas para conferir";
  if (d.paymentMode === "recurring")
    try {
      nextOccurrence =
        recurrenceDates(
          {
            startsOn: d.date,
            endsOn: d.endsOn || undefined,
            frequency: d.frequency,
          },
          d.date,
          dateInMonth(d.generateTo, 31),
        )[0] ?? "Nenhuma ocorrência neste intervalo";
    } catch {
      /* input errors are displayed on their fields */
    }
  return (
    <EntryDialog
      title={
        duplicate
          ? "Duplicar lançamento"
          : isEdit
            ? "Editar lançamento"
            : "Novo lançamento"
      }
      description={
        isEdit
          ? "Revise o impacto antes de confirmar. O histórico será preservado."
          : "Uma movimentação de cada vez, sem perder os detalhes."
      }
      dirty={dirty}
      onClose={onClose}
    >
      <EntryTabs value={d.type} editing={isEdit} onChange={switchType} />
      <form onSubmit={submit} noValidate>
        <div
          className="entry-body"
          ref={body}
          id="entry-panel"
          role="tabpanel"
          aria-labelledby={`entry-tab-${d.type}`}
        >
          {duplicate && (
            <p className="entry-hint">
              A cópia recebe novos IDs, sem pagamentos, parcelas ou vínculos
              originais.
            </p>
          )}
          {preview ? (
            <EntryPreview
              d={d}
              ledger={l}
              preview={preview}
              isEdit={isEdit}
              ack={ack}
              setAck={setAck}
            />
          ) : (
            <>
              <div className="entry-grid">
                {d.type !== "transfer" &&
                  text("Descrição", "description", "text", true)}
                {monetary(
                  d.type === "card" && d.valueMode === "installment" && !isEdit
                    ? "Valor por parcela"
                    : "Valor (R$)",
                  "amount",
                )}
                {(d.type !== "reimbursement" ||
                  !d.people[0] ||
                  d.people[0].mode === "single") &&
                  text(
                    d.type === "card"
                      ? "Data da compra"
                      : d.type === "income" || d.type === "reimbursement"
                        ? "Data prevista"
                        : "Data da operação",
                    "date",
                    "date",
                  )}
                {d.type === "card" ? (
                  <>
                    <FormField
                      label="Cartão utilizado"
                      name="cardId"
                      error={errors.cardId}
                    >
                      {(p) => (
                        <select
                          {...p}
                          disabled={isEdit}
                          value={d.cardId}
                          onChange={(e) => patch({ cardId: e.target.value })}
                        >
                          <option value="">Selecione o cartão</option>
                          {l.cards
                            .filter((c) => !c.archived || c.id === d.cardId)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                        </select>
                      )}
                    </FormField>
                    {isEdit || d.manualPeriod ? (
                      text("Primeira fatura", "period", "month")
                    ) : (
                      <div className="entry-field">
                        <label>Primeira fatura</label>
                        <p className="entry-preview" style={{ marginTop: 0 }}>
                          {first || "Selecione um cartão"}
                        </p>
                      </div>
                    )}
                    {!isEdit && (
                      <label>
                        <input
                          type="checkbox"
                          checked={d.manualPeriod}
                          onChange={(e) =>
                            patch({
                              manualPeriod: e.target.checked,
                              period: /^20\d\d-\d\d$/.test(first)
                                ? first
                                : d.period,
                            })
                          }
                        />{" "}
                        Ajustar primeira fatura manualmente
                      </label>
                    )}
                  </>
                ) : (
                  <>
                    {(d.type !== "reimbursement" ||
                      !d.people[0] ||
                      d.people[0].mode === "single") &&
                      text("Competência", "period", "month")}
                    {account(
                      d.type === "transfer"
                        ? "Conta de origem"
                        : d.type === "expense"
                          ? "Conta de pagamento"
                          : "Conta de recebimento",
                      "accountId",
                    )}
                  </>
                )}
                {d.type === "transfer" ? (
                  <>
                    {account("Conta de destino", "destinationId")}
                    <FormField label="Situação da transferência">
                      {(p) => (
                        <select
                          {...p}
                          value={d.confirmed ? "confirmed" : "planned"}
                          onChange={(e) =>
                            patch({ confirmed: e.target.value === "confirmed" })
                          }
                        >
                          <option value="planned">Prevista</option>
                          <option value="confirmed">Efetivada</option>
                        </select>
                      )}
                    </FormField>
                  </>
                ) : (
                  <>
                    <CategoryPicker
                      state={state}
                      type={d.type}
                      value={d.categoryId}
                      onChange={(categoryId) => patch({ categoryId })}
                      error={errors.categoryId}
                      onCreate={onCommit}
                    />
                    {d.paymentMode === "recurring" ? (
                      <p className="entry-hint">
                        As ocorrências serão previstas. Confirme cada compra ou
                        pagamento individualmente depois.
                      </p>
                    ) : d.type === "card" ? (
                      <FormField label="Situação da compra">
                        {(p) => (
                          <select
                            {...p}
                            value={d.confirmed ? "confirmed" : "planned"}
                            onChange={(e) =>
                              patch({
                                confirmed: e.target.value === "confirmed",
                              })
                            }
                          >
                            <option value="confirmed">Compra confirmada</option>
                            <option value="planned">Compra prevista</option>
                          </select>
                        )}
                      </FormField>
                    ) : (
                      !isEdit &&
                      select("Situação", "status", [
                        [
                          "pending",
                          d.type === "expense" ? "Pendente" : "Prevista",
                        ],
                        [
                          "partial",
                          d.type === "expense"
                            ? "Parcialmente paga"
                            : "Parcialmente recebida",
                        ],
                        ["paid", d.type === "expense" ? "Paga" : "Recebida"],
                        ...(d.type === "reimbursement"
                          ? []
                          : [["cancelled", "Cancelada"] as [string, string]]),
                      ])
                    )}
                  </>
                )}
                {d.type === "income" && (
                  <label>
                    <input
                      type="checkbox"
                      checked={d.salary}
                      onChange={(e) => patch({ salary: e.target.checked })}
                    />{" "}
                    Esta receita é salário
                  </label>
                )}
                {isEdit &&
                  (old?.purchaseId || old?.recurrenceId) &&
                  select(
                    "Aplicar alteração a",
                    "scope",
                    old.purchaseId
                      ? [
                          ["one", "Esta parcela"],
                          ["following", "Esta e as próximas"],
                          ["all", "Toda a compra"],
                        ]
                      : [
                          ["one", "Esta ocorrência"],
                          ["following", "Esta e as próximas"],
                        ],
                  )}
                {!isEdit && ["expense", "income", "card"].includes(d.type) && (
                  <div className="entry-wide">
                    {select("Forma de lançamento", "paymentMode", [
                      [
                        "single",
                        d.type === "card" ? "Pagamento único" : "Único",
                      ],
                      ...(d.type === "card"
                        ? [["installments", "Parcelado"] as [string, string]]
                        : []),
                      ["recurring", "Recorrente"],
                    ])}
                  </div>
                )}
                {!isEdit && d.paymentMode === "recurring" && (
                  <RecurrenceFields
                    d={d}
                    errors={errors}
                    patch={patch}
                    fields={{ text, select, account, monetary }}
                    nextOccurrence={nextOccurrence}
                  />
                )}
                {!isEdit &&
                  d.type === "card" &&
                  d.paymentMode !== "recurring" && (
                    <InstallmentFields
                      d={d}
                      errors={errors}
                      patch={patch}
                      fields={{ text, select, account, monetary }}
                      quote={quote}
                      quoteError={quoteError}
                      first={first}
                    />
                  )}
                {!isEdit &&
                  d.type === "card" &&
                  d.paymentMode !== "recurring" && (
                    <details className="entry-section">
                      <summary>Responsável e reembolso</summary>
                      {select("Responsabilidade da compra", "responsibility", [
                        ["personal", "Compra pessoal"],
                        ["other", "Compra para outra pessoa"],
                        ["shared", "Compra compartilhada"],
                      ])}
                      {d.responsibility !== "personal" && (
                        <>
                          <p className="entry-hint">
                            Deixe o nome vazio se a identificação ainda estiver
                            pendente.
                          </p>
                          <PeopleFields
                            people={d.people}
                            onChange={(people) => patch({ people })}
                            error={errors.people}
                          />
                          <p className="entry-hint">
                            Total dos acordos:{" "}
                            {(() => {
                              try {
                                return money(
                                  d.people.reduce(
                                    (n, p) => n + parseMoney(p.amount),
                                    0,
                                  ),
                                );
                              } catch {
                                return "Preencha os valores";
                              }
                            })()}
                          </p>
                        </>
                      )}
                    </details>
                  )}
                {d.type === "reimbursement" && (!isEdit || !!agreement) && (
                  <section className="entry-section">
                    <h3>Acordo de reembolso</h3>
                    {!isEdit &&
                      select("Origem do reembolso", "purchaseId", [
                        ["", "Reembolso avulso"],
                        ...l.purchases
                          .filter((p) => !p.cancelled)
                          .map(
                            (p) =>
                              [
                                p.id,
                                l.operations.find((o) => o.purchaseId === p.id)
                                  ?.description ?? "Compra",
                              ] as [string, string],
                          ),
                      ])}
                    <PeopleFields
                      people={
                        d.people.length
                          ? d.people
                          : [
                              {
                                ...newPerson(),
                                id: `agreement:${d.id}`,
                                personId: `person:${d.id}`,
                                amount: d.amount,
                                date: d.date,
                                period: d.period,
                              },
                            ]
                      }
                      onChange={(people) =>
                        patch({
                          people: people.map((p) => ({
                            ...p,
                            amount: d.amount,
                          })),
                        })
                      }
                      standalone
                      error={errors.people}
                    />
                  </section>
                )}
                {!isEdit &&
                  d.type !== "card" &&
                  d.type !== "transfer" &&
                  d.paymentMode !== "recurring" &&
                  (d.status === "partial" || d.status === "paid") && (
                    <section className="entry-section">
                      <h3>
                        {d.type === "expense"
                          ? "Pagamento confirmado"
                          : "Recebimento confirmado"}
                      </h3>
                      <div className="entry-grid">
                        {d.status === "partial" &&
                          monetary("Valor já pago / recebido", "paymentAmount")}
                        {text("Data efetiva", "paymentDate", "date")}
                        {text("Forma de pagamento / recebimento", "method")}
                      </div>
                      <p className="entry-hint">
                        O valor será registrado na conta selecionada.
                      </p>
                    </section>
                  )}
                {!isEdit &&
                  (d.type === "expense" || d.type === "card") &&
                  d.paymentMode !== "recurring" && (
                    <PlanningFields
                      d={d}
                      errors={errors}
                      patch={patch}
                      fields={{ text, select, account, monetary }}
                      state={state}
                    />
                  )}
                <details className="entry-section">
                  <summary>Detalhes adicionais</summary>
                  {text("Observação", "note", "text", true)}
                  <p className="entry-hint">
                    Comprovantes serão disponibilizados em uma próxima fase.
                  </p>
                </details>
                {isEdit && (
                  <section className="entry-section">
                    {text("Motivo da alteração", "reason", "text", true)}
                    {paid && (
                      <p className="entry-hint">
                        Total {money(paid.total)} · pago / recebido{" "}
                        {money(paid.paid)} · pendente {money(paid.remaining)}.
                        Alterações exigem revisão.
                      </p>
                    )}
                    {agreement && (
                      <p className="entry-hint">
                        A alteração do valor combinado é feita no total do
                        acordo. As previsões e seus recebimentos serão
                        preservados.
                      </p>
                    )}
                  </section>
                )}
              </div>
              {isEdit && old.type !== "card" && (
                <details className="entry-section">
                  <summary>Gerenciar pagamentos e histórico</summary>
                  <Payments
                    state={state}
                    operationId={old.id}
                    onDirtyChange={setPaymentDirty}
                    onCommit={onCommit}
                  />
                </details>
              )}
              {!isEdit && (
                <>
                  <div className="entry-inline-actions">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        if (
                          !catalog ||
                          !catalogDirty ||
                          confirm("Descartar o cadastro ainda não salvo?")
                        )
                          setCatalog(!catalog);
                      }}
                    >
                      {catalog
                        ? "Ocultar cadastros"
                        : "Cadastrar contas e cartões"}
                    </Button>
                  </div>
                  {catalog && (
                    <CatalogSettings
                      state={state}
                      onCommit={onCommit}
                      onDirtyChange={setCatalogDirty}
                    />
                  )}
                </>
              )}
            </>
          )}
          {conflict && (
            <p role="alert" className="field-error">
              Este registro foi alterado em outra ação ou aba. Seus campos foram
              preservados; feche e reabra o registro para revisar os dados
              atuais.
            </p>
          )}
          {Object.keys(errors).length > 0 && (
            <p
              role="alert"
              className="field-error"
              tabIndex={-1}
              data-field="_form"
            >
              {errors._form || Object.values(errors)[0]}
            </p>
          )}
          {errors.categoryId && (
            <p role="alert" className="field-error">
              {errors.categoryId}
            </p>
          )}
        </div>
        <footer className="entry-footer">
          <Button
            type="button"
            variant="outline"
            onClick={
              preview
                ? () => {
                    setPreview(undefined);
                    setAck(false);
                  }
                : close
            }
          >
            {preview ? "Voltar e ajustar" : "Cancelar"}
          </Button>
          {preview ? (
            <Button
              type="button"
              disabled={!ack || saving}
              onClick={() => save(preview)}
            >
              Confirmar e salvar
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={saving || !!old?.cancelled || conflict}
            >
              {isEdit ? "Revisar alterações" : "Salvar lançamento"}
            </Button>
          )}
        </footer>
      </form>
    </EntryDialog>
  );
}
