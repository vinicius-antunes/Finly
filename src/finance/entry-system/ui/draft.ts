import type { State } from "../../model.ts";
import type { EntryType, Settlement, Operation } from "../contracts.ts";
import type { AgreementTerms } from "../reimbursements/contracts.ts";
import {
  registerAgreement,
  installmentSchedule,
  correctAgreement,
  previewAgreement,
} from "../reimbursements/commands.ts";
import {
  registerPurchase,
  previewInstallments,
  applyInstallments,
} from "../credit/purchases.ts";
import { quotePurchase } from "../credit/quote.ts";
import { monthOffset, dateInMonth } from "../credit/dates.ts";
import {
  registerRecurrence,
  generateOccurrences,
  changeRecurrence,
} from "../credit/recurrences.ts";
import {
  recordSettlement,
  recordTransfer,
  correctOperation,
} from "../commands.ts";
import { validateFinancialLedger } from "../finance.ts";
import { validate } from "../../model.ts";
import {
  confirmPlannedPurchase,
  previewPlannedPurchase,
} from "../../planning/entry-purchase.ts";
import { parseMoney, decimal, today } from "./money.ts";
import { dateOK, periodOK } from "../schema.ts";
export type PersonDraft = {
  id: string;
  personId: string;
  name: string;
  amount: string;
  mode: "single" | "installments" | "custom";
  date: string;
  period: string;
  rows: { id: string; amount: string; date: string; period: string }[];
};
export const newPerson = (): PersonDraft => ({
  id: crypto.randomUUID(),
  personId: crypto.randomUUID(),
  name: "",
  amount: "",
  mode: "single",
  date: today(),
  period: today().slice(0, 7),
  rows: [],
});
export type EntryDraft = {
  id: string;
  type: EntryType;
  description: string;
  amount: string;
  date: string;
  period: string;
  categoryId: string;
  accountId: string;
  cardId: string;
  method: string;
  note: string;
  status: "pending" | "partial" | "paid" | "cancelled";
  paymentAmount: string;
  paymentDate: string;
  salary: boolean;
  destinationId: string;
  confirmed: boolean;
  paymentMode: "single" | "installments" | "recurring";
  count: number;
  valueMode: "total" | "installment";
  down: string;
  downAccountId: string;
  downMethod: string;
  downDate: string;
  downPaid: boolean;
  interestMethod: "none" | "simple-monthly" | "compound-monthly";
  rate: string;
  original: string;
  final: string;
  manualPeriod: boolean;
  responsibility: "personal" | "other" | "shared";
  people: PersonDraft[];
  purchaseId: string;
  frequency: "monthly" | "annual";
  endsOn: string;
  generateTo: string;
  goalId: string;
  useReserve: string;
  reserveConfirmed: boolean;
  reason: string;
  scope: "one" | "following" | "all";
};
export function initialDraft(
  s: State,
  type: EntryType,
  period: string,
  operationId?: string,
  duplicate = false,
): EntryDraft {
  const l = s.entryLedger!,
    o = l?.operations.find((o) => o.id === operationId),
    a = l?.agreements?.find((a) => a.operationIds.includes(operationId ?? ""));
  const d: EntryDraft = {
    id: crypto.randomUUID(),
    type: o?.type ?? type,
    description: o?.description ?? "",
    amount: o ? decimal(o.amountCents) : "",
    date: o?.operationDate ?? o?.expectedDate ?? today(),
    period: o?.period ?? period,
    categoryId: o?.categoryId ?? "",
    accountId:
      (o?.type === "card" ? undefined : o?.accountId) ??
      l?.accounts.find((a) => a.type !== "credit_card" && !a.archived)?.id ??
      "",
    cardId:
      o?.cardId ??
      l?.operations.filter((o) => o.cardId).at(-1)?.cardId ??
      l?.cards.find((c) => !c.archived)?.id ??
      "",
    method: "Pix",
    note: o?.note ?? "",
    status: "pending",
    paymentAmount: "",
    paymentDate: today(),
    salary: o?.salary ?? false,
    destinationId: "",
    confirmed: o?.confirmed ?? true,
    paymentMode: "single",
    count: 1,
    valueMode: "total",
    down: "",
    downAccountId:
      l?.accounts.find((a) => a.type !== "credit_card" && !a.archived)?.id ??
      "",
    downMethod: "Pix",
    downDate: today(),
    downPaid: false,
    interestMethod: "none",
    rate: "",
    original: "",
    final: "",
    manualPeriod: !!o,
    responsibility: "personal",
    people: [],
    purchaseId: "",
    frequency: "monthly",
    endsOn: "",
    generateTo: monthOffset(today().slice(0, 7), 5),
    goalId: "",
    useReserve: "",
    reserveConfirmed: false,
    reason: "",
    scope: "one",
  };
  if (a && !duplicate) {
    d.purchaseId = a.purchaseId ?? "";
    d.description = a.terms.description;
    d.note = a.terms.note;
    d.amount = decimal(a.terms.totalCents);
    d.people = [
      {
        ...newPerson(),
        id: a.id,
        personId: a.terms.personId,
        name: a.terms.personLabel,
        amount: decimal(a.terms.totalCents),
        mode: a.terms.mode,
        date: a.terms.schedule[0].expectedDate ?? "",
        period: a.terms.schedule[0].period,
        rows: a.terms.schedule.map((r) => ({
          id: r.id,
          amount: decimal(r.amountCents),
          date: r.expectedDate ?? "",
          period: r.period,
        })),
      },
    ];
  }
  if (duplicate) {
    d.salary = false;
    d.purchaseId = "";
    d.people = [];
    d.confirmed = false;
  }
  return d;
}
export class FormProblem extends Error {
  fields: Record<string, string>;
  constructor(fields: Record<string, string>) {
    super(Object.values(fields)[0]);
    this.fields = fields;
  }
}
function amount(v: string, field: string, zero = false) {
  try {
    const n = parseMoney(v);
    if (n === 0 && !zero) throw Error();
    return n;
  } catch {
    throw new FormProblem({
      [field]: zero
        ? "Informe um valor válido."
        : "Informe um valor maior que zero, com até duas casas decimais.",
    });
  }
}
export function quoteDraft(d: EntryDraft) {
  return quotePurchase({
    mode: d.valueMode,
    valueCents: amount(d.amount, "amount"),
    count: d.paymentMode === "installments" ? d.count : 1,
    downCents: d.down ? amount(d.down, "down", true) : 0,
    originalCents: d.original ? amount(d.original, "original") : undefined,
    finalCents: d.final ? amount(d.final, "final") : undefined,
    interest:
      d.interestMethod !== "none"
        ? { method: d.interestMethod, ratePercent: d.rate }
        : undefined,
  });
}
export type PreparedEntry = {
  source: string;
  next: State;
  complex: boolean;
  rows: {
    label: string;
    amountCents: number;
    period: string;
    previousCents?: number;
  }[];
};
function prepareEntryUnsafe(
  s: State,
  d: EntryDraft,
  editId?: string,
): PreparedEntry {
  validate(s);
  if (!s.entryLedger)
    throw new FormProblem({
      _form: "Prepare o novo formulário antes de continuar.",
    });
  const errors: Record<string, string> = {};
  if (d.type !== "transfer" && !d.description.trim())
    errors.description = "Informe a descrição.";
  if (!dateOK(d.date)) errors.date = "Informe uma data válida.";
  if (!periodOK(d.period)) errors.period = "Informe uma competência válida.";
  const cash = s.entryLedger.accounts.filter(
    (a) => a.type !== "credit_card" && !a.archived,
  );
  if (
    d.type !== "card" &&
    !cash.some((a) => a.id === d.accountId) &&
    !(
      editId &&
      s.entryLedger.operations.find((o) => o.id === editId)?.accountId ===
        d.accountId
    )
  )
    errors.accountId = "Selecione uma conta ativa.";
  if (
    d.type === "transfer" &&
    (!cash.some((a) => a.id === d.destinationId) ||
      d.destinationId === d.accountId)
  )
    errors.destinationId = "Escolha uma conta de destino diferente da origem.";
  if (
    d.type === "card" &&
    !s.entryLedger.cards.some((c) => c.id === d.cardId && !c.archived) &&
    !(
      editId &&
      s.entryLedger.operations.find((o) => o.id === editId)?.cardId === d.cardId
    )
  )
    errors.cardId = "Selecione ou cadastre um cartão ativo.";
  if (
    d.categoryId &&
    !s.entryLedger.categories.some(
      (c) =>
        c.id === d.categoryId &&
        (editId || !c.archived) &&
        c.types.includes(d.type),
    )
  )
    errors.categoryId = "Escolha uma categoria disponível para este tipo.";
  if (editId && !d.reason.trim())
    errors.reason = "Explique o motivo da alteração.";
  if (
    d.type === "card" &&
    d.paymentMode === "installments" &&
    (!Number.isInteger(d.count) || d.count < 1 || d.count > 120)
  )
    errors.count = "Use de 1 a 120 parcelas.";
  if (
    d.type === "card" &&
    d.responsibility !== "personal" &&
    d.paymentMode !== "recurring" &&
    !editId &&
    !d.people.length
  )
    errors.people = "Adicione um responsável ou escolha compra pessoal.";
  if (
    !editId &&
    d.paymentMode !== "recurring" &&
    (d.status === "partial" || d.status === "paid") &&
    !dateOK(d.paymentDate)
  )
    errors.paymentDate = "Informe a data efetiva do pagamento ou recebimento.";
  if (d.type === "card" && d.down && amount(d.down, "down", true) > 0) {
    if (!dateOK(d.downDate)) errors.downDate = "Informe a data da entrada.";
    if (!cash.some((a) => a.id === d.downAccountId))
      errors.downAccountId = "Selecione uma conta ativa para a entrada.";
    if (!d.downMethod.trim())
      errors.downMethod = "Informe o método da entrada.";
  }
  if (Object.keys(errors).length) throw new FormProblem(errors);
  const value = amount(d.amount, "amount");
  let next = structuredClone(s),
    l = next.entryLedger!;
  const date = today();
  const old = editId ? l.operations.find((o) => o.id === editId) : undefined;
  const linkedAgreement = old
    ? l.agreements?.find((a) => a.operationIds.includes(old.id))
    : undefined;
  if (old) {
    if (old.cancelled)
      throw new FormProblem({
        _form:
          "Este registro foi cancelado. Duplique para criar um novo lançamento.",
      });
    if (old.type === "card" && old.purchaseId) {
      const p = previewInstallments(l, old.id, d.scope, {
        amountCents: value,
        firstPeriod: d.period,
      });
      l = applyInstallments(l, p, {
        id: d.id,
        confirmed: true,
        date,
        reason: d.reason,
        acknowledgePaidInvoices: true,
        acknowledgeReimbursements: true,
      });
      // Scope controls amounts/competences; descriptive metadata belongs only to the selected installment.
      l.operations = l.operations.map((o) =>
        o.id === old.id
          ? {
              ...o,
              description: d.description,
              note: d.note,
              categoryId: d.categoryId || undefined,
              confirmed: d.confirmed,
            }
          : o,
      );
    } else if (old.recurrenceId && d.scope !== "one") {
      l = changeRecurrence(
        l,
        old.recurrenceId,
        {
          id: d.id,
          kind: "amount",
          effectiveOn: old.expectedDate ?? d.date,
          amountCents: value,
        },
        true,
      );
      l.operations = l.operations.map((o) =>
        o.id === old.id
          ? {
              ...o,
              description: d.description,
              note: d.note,
              categoryId: d.categoryId || undefined,
              ...(old.type === "income" ? { salary: d.salary } : {}),
              ...(old.type === "card" ? { confirmed: d.confirmed } : {}),
            }
          : o,
      );
    } else if (linkedAgreement) {
      const p = d.people[0];
      const terms = personTerms(
        d,
        { ...p, amount: d.amount },
        l,
        linkedAgreement.purchaseId,
        linkedAgreement.id,
      );
      l = correctAgreement(l, previewAgreement(l, linkedAgreement.id, terms), {
        id: d.id,
        date,
        reason: d.reason,
        confirmed: true,
        acknowledgeReceipts: true,
      });
    } else {
      if (old.purchaseId && value !== old.amountCents)
        throw new FormProblem({
          amount:
            "Compra vinculada: preserve o valor e regularize o contrato antes de alterar.",
        });
      const patch: Operation = {
        ...old,
        description: d.description,
        note: d.note,
        amountCents: value,
        period: d.period,
        accountId: old.type === "card" ? old.accountId : d.accountId,
        categoryId: d.categoryId || undefined,
        ...(old.operationDate
          ? { operationDate: d.date }
          : { expectedDate: d.date }),
        ...(old.type === "income" ? { salary: d.salary } : {}),
        ...(old.type === "card" ? { confirmed: d.confirmed } : {}),
      };
      l = correctOperation(
        l,
        {
          id: d.id,
          operationId: old.id,
          at: date,
          reason: d.reason,
          previousAmountCents: old.amountCents,
          nextAmountCents: value,
          previousOperation: structuredClone(old),
          nextOperation: patch,
        },
        true,
      );
      l.operations = l.operations.map((o) => (o.id === old.id ? patch : o));
    }
  } else if (d.type === "transfer") {
    l = recordTransfer(l, {
      id: d.id,
      fromAccountId: d.accountId,
      toAccountId: d.destinationId,
      amountCents: value,
      date: d.date,
      note: d.note,
      confirmed: d.confirmed,
    });
  } else if (d.paymentMode === "recurring" && d.type !== "reimbursement") {
    if (d.goalId || d.people.length)
      throw new FormProblem({
        _form:
          "Vínculos de compra e reembolsos devem ser cadastrados em uma compra única ou parcelada.",
      });
    if (!periodOK(d.generateTo) || d.generateTo < d.date.slice(0, 7))
      throw new FormProblem({
        generateTo: "Escolha o último mês da previsão, a partir do início.",
      });
    if (d.endsOn && (!dateOK(d.endsOn) || d.endsOn < d.date))
      throw new FormProblem({
        endsOn: "O término deve ser igual ou posterior ao início.",
      });
    l = registerRecurrence(l, {
      id: d.id,
      description: d.description,
      note: d.note,
      operationType: d.type,
      frequency: d.frequency,
      startsOn: d.date,
      endsOn: d.endsOn || undefined,
      amountCents: value,
      accountId: d.type === "card" ? undefined : d.accountId,
      cardId: d.type === "card" ? d.cardId : undefined,
      categoryId: d.categoryId || undefined,
      salary: d.type === "income" ? d.salary : undefined,
      initialStatus: "active",
      status: "active",
      occurrences: [],
      events: [],
    });
    const overrides =
      d.type === "card" && d.manualPeriod ? { [d.date]: d.period } : {};
    l = generateOccurrences(
      l,
      d.id,
      d.date,
      dateInMonth(d.generateTo, 31),
      overrides,
      { acknowledgePaidInvoices: true, correctionDate: date },
    );
  } else if (d.type === "card" || d.goalId) {
    const q = d.type === "card" ? quoteDraft(d) : undefined;
    const purchase =
      d.type === "card"
        ? {
            id: d.id,
            description: d.description,
            cardId: d.cardId,
            operationDate: d.date,
            firstPeriod: d.manualPeriod ? d.period : undefined,
            confirmed: d.confirmed,
            responsibility: d.responsibility,
            quote: {
              mode: d.valueMode,
              valueCents: value,
              count: d.paymentMode === "installments" ? d.count : 1,
              downCents: q!.downCents,
              originalCents: d.original
                ? amount(d.original, "original")
                : undefined,
              finalCents: d.final ? amount(d.final, "final") : undefined,
              interest:
                d.interestMethod !== "none"
                  ? { method: d.interestMethod, ratePercent: d.rate }
                  : undefined,
            },
            downPayment: q!.downCents
              ? {
                  accountId: d.downAccountId,
                  method: d.downMethod,
                  date: d.downDate,
                  confirmed: d.downPaid,
                }
              : undefined,
            acknowledgePaidInvoices: true,
            acknowledgementDate: date,
          }
        : {
            id: d.id,
            description: d.description,
            operationDate: d.date,
            confirmed: d.status === "paid",
            cash: {
              paymentDate: d.status === "paid" ? d.paymentDate : undefined,
              amountCents: value,
              accountId: d.accountId,
              method: d.method,
              period: d.period,
            },
          };
    if (d.goalId) {
      if (d.type === "expense" && d.status === "cancelled")
        throw new FormProblem({
          status: "Uma compra cancelada não pode concluir um planejamento.",
        });
      if (!d.reserveConfirmed)
        throw new FormProblem({
          reserveConfirmed: "Confirme explicitamente a utilização da reserva.",
        });
      if (d.status === "partial" && d.type === "expense")
        throw new FormProblem({
          status:
            "Registre a compra pendente e adicione pagamentos individuais depois.",
        });
      next = confirmPlannedPurchase(
        next,
        previewPlannedPurchase(next, {
          goalId: d.goalId,
          useCents: amount(d.useReserve, "useReserve", true),
          date: d.date,
          period: d.period,
          purchase,
        }),
        true,
      );
      l = next.entryLedger!;
    } else
      l = registerPurchase(
        l,
        purchase as Parameters<typeof registerPurchase>[1],
      );
    l.operations = l.operations.map((o) =>
      o.purchaseId === d.id
        ? { ...o, note: d.note, categoryId: d.categoryId || undefined }
        : o,
    );
    if (d.type === "card" && d.responsibility !== "personal")
      for (const p of d.people)
        l = registerAgreement(l, {
          id: p.id,
          purchaseId: d.id,
          terms: personTerms(d, p, l, d.id, p.id),
        });
  } else if (d.type === "reimbursement") {
    const p = d.people[0] ?? {
      ...newPerson(),
      id: `agreement:${d.id}`,
      personId: `person:${d.id}`,
      name: "",
      amount: d.amount,
      mode: "single" as const,
      date: d.date,
      period: d.period,
      rows: [],
    };
    const id = p.id;
    l = registerAgreement(l, {
      id,
      purchaseId: d.purchaseId || undefined,
      terms: personTerms(
        d,
        { ...p, amount: d.amount },
        l,
        d.purchaseId || undefined,
        id,
      ),
    });
    if (d.status === "paid" || d.status === "partial") {
      const rows = l.agreements!.find((a) => a.id === id)!.terms.schedule;
      let remaining =
        d.status === "paid" ? value : amount(d.paymentAmount, "paymentAmount");
      for (const r of rows) {
        const v = Math.min(remaining, r.amountCents);
        if (v > 0) {
          l = recordSettlement(l, receipt(d, r.id, v));
          remaining -= v;
        }
      }
      if (remaining)
        throw new FormProblem({
          paymentAmount:
            "O recebimento não pode ultrapassar o valor combinado.",
        });
    }
  } else {
    const o: Operation = {
      id: d.id,
      type: d.type,
      description: d.description.trim(),
      amountCents: value,
      operationDate: d.type === "expense" ? d.date : undefined,
      expectedDate: d.type === "income" ? d.date : undefined,
      period: d.period,
      accountId: d.accountId,
      categoryId: d.categoryId || undefined,
      salary: d.type === "income" ? d.salary : undefined,
      cancelled: d.status === "cancelled",
      note: d.note,
    };
    // postOperation requires an operation date; forecasts are validated without fabricating an actual date.
    l = { ...l, operations: [...l.operations, o] };
    validateFinancialLedger(l);
    if (d.status === "paid" || d.status === "partial")
      l = recordSettlement(
        l,
        receipt(
          d,
          o.id,
          d.status === "paid"
            ? value
            : amount(d.paymentAmount, "paymentAmount"),
        ),
      );
  }
  if (old && !linkedAgreement) {
    const after = l.operations.find((o) => o.id === old.id)!;
    l.corrections = l.corrections.map((c) =>
      c.id === d.id || c.id === `${d.id}:${old.id}`
        ? {
            ...c,
            previousOperation: structuredClone(old),
            nextOperation: structuredClone(after),
          }
        : c,
    );
  }
  next.entryLedger = l;
  validate(next);
  const changed = l.operations.filter(
    (o) =>
      !s.entryLedger!.operations.some((x) => x.id === o.id) ||
      JSON.stringify(o) !==
        JSON.stringify(s.entryLedger!.operations.find((x) => x.id === o.id)),
  );
  return {
    source: JSON.stringify(s),
    next,
    complex:
      !!old ||
      d.type === "card" ||
      d.type === "transfer" ||
      d.people.length > 1 ||
      d.people.some((p) => p.mode === "custom") ||
      !!d.goalId ||
      d.paymentMode === "recurring",
    rows: [
      ...changed.map((o) => ({
        label:
          (o.type === "reimbursement"
            ? "Reembolso previsto · "
            : o.type === "card"
              ? "Compra · "
              : o.type === "income"
                ? "Receita · "
                : "Despesa · ") + o.description,
        amountCents: o.amountCents,
        previousCents: s.entryLedger!.operations.find((x) => x.id === o.id)
          ?.amountCents,
        period: o.period,
      })),
      ...l.settlements
        .filter((p) => !s.entryLedger!.settlements.some((x) => x.id === p.id))
        .map((p) => ({
          label: `${l.operations.find((o) => o.id === p.operationId)?.type === "expense" ? "Pagamento" : "Recebimento"} confirmado · ${l.accounts.find((a) => a.id === p.accountId)?.name} · ${p.method} · ${p.date}`,
          amountCents: p.amountCents,
          period: p.date.slice(0, 7),
        })),
    ],
  };
}
function receipt(
  d: EntryDraft,
  operationId: string,
  amountCents: number,
): Settlement {
  return {
    id: `receipt:${d.id}:${operationId}`,
    operationId,
    amountCents,
    date: d.paymentDate,
    accountId: d.accountId,
    method: d.method,
    note: d.note,
  };
}
function personTerms(
  d: EntryDraft,
  p: PersonDraft,
  l: NonNullable<State["entryLedger"]>,
  purchaseId: string | undefined,
  id: string,
): AgreementTerms {
  const total = amount(p.amount, "people");
  let schedule;
  if (
    p.mode === "installments" &&
    p.rows.length &&
    p.rows.reduce((n, r) => n + amount(r.amount, "people"), 0) === total
  ) {
    schedule = p.rows.map((r) => ({
      id: r.id,
      amountCents: amount(r.amount, "people"),
      period: r.period,
      expectedDate: r.date || undefined,
      accountId: d.accountId || undefined,
    }));
  } else if (p.mode === "installments") {
    if (!purchaseId)
      throw new FormProblem({
        people: "Para acompanhar parcelas, selecione uma compra parcelada.",
      });
    schedule = installmentSchedule(l, purchaseId, total, id);
  } else if (p.mode === "custom")
    schedule = p.rows.map((r) => ({
      id: r.id,
      amountCents: amount(r.amount, "people"),
      period: r.period,
      expectedDate: r.date || undefined,
      accountId: d.accountId || undefined,
    }));
  else
    schedule = [
      {
        id: p.rows[0]?.id ?? `schedule:${id}`,
        amountCents: total,
        period: d.type === "reimbursement" ? d.period : p.period,
        expectedDate:
          (d.type === "reimbursement" ? d.date : p.date) || undefined,
        accountId: d.accountId || undefined,
      },
    ];
  return {
    totalCents: total,
    personId: p.personId,
    personLabel: p.name,
    description: d.description,
    note: d.note,
    mode: p.mode,
    schedule,
  };
}

export function prepareEntry(
  s: State,
  d: EntryDraft,
  editId?: string,
): PreparedEntry {
  try {
    return prepareEntryUnsafe(s, d, editId);
  } catch (e) {
    if (e instanceof FormProblem) throw e;
    const message =
      e instanceof Error ? e.message : "Confira os dados antes de salvar.";
    const field = /taxa|juros/i.test(message)
      ? "rate"
      : /reserva|objetivo/i.test(message)
        ? "useReserve"
        : /reembolso|acordo|cronograma/i.test(message)
          ? "people"
          : /fatura|fechamento|competência/i.test(message)
            ? "period"
            : /liquidação|pagamento.*excede/i.test(message)
              ? "paymentAmount"
              : /parcela|quantidade/i.test(message)
                ? "count"
                : /data/i.test(message)
                  ? "date"
                  : "_form";
    throw new FormProblem({ [field]: message });
  }
}

/** Presentation-only currency formatting must not count as an unsaved change. */
export function draftKey(d: EntryDraft) {
  const copy = structuredClone(d) as unknown as Record<string, unknown>;
  const normalize = (v: string) => {
    try {
      return v.trim() ? parseMoney(v) : null;
    } catch {
      return v;
    }
  };
  for (const key of [
    "amount",
    "paymentAmount",
    "down",
    "original",
    "final",
    "useReserve",
  ])
    copy[key] = normalize(String(copy[key]));
  copy.people = d.people.map((p) => ({
    ...p,
    amount: normalize(p.amount),
    rows: p.rows.map((r) => ({ ...r, amount: normalize(r.amount) })),
  }));
  return JSON.stringify(copy);
}
