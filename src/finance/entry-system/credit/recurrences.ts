import type { LedgerDraft, Recurrence, RecurrenceEvent } from "../contracts.ts";
import {
  validateFinancialLedger,
  settled,
  invoiceBalance,
} from "../finance.ts";
import { dateOK } from "../schema.ts";
import { dateInMonth, monthOffset, firstInvoice } from "./dates.ts";
import { syncInvoices } from "./purchases.ts";
export function registerRecurrence(l: LedgerDraft, r: Recurrence) {
  if (
    !r.description?.trim() ||
    !r.operationType ||
    !r.initialStatus ||
    r.occurrences.length ||
    r.events?.length
  )
    throw Error(
      "Descrição, tipo e situação inicial obrigatórios; histórico novo deve estar vazio",
    );
  if (
    r.status !== r.initialStatus ||
    (r.operationType !== "card" && r.cardId !== undefined)
  )
    throw Error("Configuração inicial incompatível");
  const existing = l.recurrences.find((x) => x.id === r.id);
  if (existing) {
    if (JSON.stringify(existing) !== JSON.stringify(r))
      throw Error("Identidade de recorrência reutilizada");
    return l;
  }
  if (
    r.operationType === "card" &&
    !l.cards.some((c) => c.id === r.cardId && !c.archived)
  )
    throw Error("Cartão ativo obrigatório");
  const next = { ...l, recurrences: [...l.recurrences, structuredClone(r)] };
  validateFinancialLedger(next);
  return next;
}
function schedule(r: Recurrence, from: string, to: string) {
  if (
    !dateOK(from) ||
    !dateOK(to) ||
    from > to ||
    (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 +
      Number(to.slice(5, 7)) -
      Number(from.slice(5, 7)) >
      24
  )
    throw Error("Janela máxima de geração: 24 meses");
  const dates: string[] = [];
  const start = r.startsOn.slice(0, 7),
    day = Number(r.startsOn.slice(-2));
  const distance =
    (Number(to.slice(0, 4)) - Number(start.slice(0, 4))) * 12 +
    Number(to.slice(5, 7)) -
    Number(start.slice(5, 7));
  for (
    let i = 0;
    i <= Math.floor(distance / (r.frequency === "annual" ? 12 : 1));
    i++
  ) {
    const period = monthOffset(start, i * (r.frequency === "annual" ? 12 : 1));
    if (period > to.slice(0, 7)) break;
    const date = dateInMonth(period, day);
    if (
      date >= r.startsOn &&
      date >= from &&
      date <= to &&
      (!r.endsOn || date <= r.endsOn)
    )
      dates.push(date);
  }
  return dates;
}
function configurationAt(r: Recurrence, date: string) {
  let status: string = r.initialStatus ?? r.status,
    amount = r.amountCents;
  for (const e of r.events ?? []) {
    if (e.effectiveOn > date) continue;
    if (e.kind === "pause") status = "paused";
    if (e.kind === "resume") status = "active";
    if (e.kind === "cancel") status = "cancelled";
    if (e.kind === "amount") amount = e.amountCents!;
  }
  const override = r.events
    ?.filter((e) => e.kind === "override" && e.effectiveOn === date)
    .at(-1);
  return { status, amount: override?.amountCents ?? amount };
}
export function generateOccurrences(
  l: LedgerDraft,
  id: string,
  from: string,
  to: string,
  periodOverrides: Record<string, string> = {},
  approval: { acknowledgePaidInvoices?: boolean; correctionDate?: string } = {},
) {
  const next = structuredClone(l),
    r = next.recurrences.find((x) => x.id === id);
  if (!r || !r.description || !r.operationType)
    throw Error("Configure a recorrência antes de gerar");
  for (const date of schedule(r, from, to)) {
    if (r.occurrences.some((x) => x.scheduledOn === date)) continue;
    const config = configurationAt(r, date);
    if (config.status !== "active") continue;
    const card = r.cardId
      ? next.cards.find((c) => c.id === r.cardId)
      : undefined;
    if (
      card?.archived ||
      next.accounts.find((a) => a.id === (card?.accountId ?? r.accountId))
        ?.archived
    )
      throw Error("Origem arquivada");
    const period =
      r.operationType === "card"
        ? firstInvoice(card!, date, periodOverrides[date]).period
        : date.slice(0, 7);
    const paidInvoice = card
      ? l.invoices.find((i) => i.cardId === card.id && i.period === period)
      : undefined;
    if (
      paidInvoice &&
      invoiceBalance(l, paidInvoice.id).paid > 0 &&
      (!approval.acknowledgePaidInvoices || !dateOK(approval.correctionDate))
    )
      throw Error(
        "Geração em fatura com pagamentos exige confirmação explícita",
      );
    const operationId = `recurrence:${id}:${date}`;
    next.operations.push({
      id: operationId,
      type: r.operationType,
      description: r.description,
      amountCents: config.amount,
      expectedDate: date,
      period,
      dueDate: card?.dueDay ? dateInMonth(period, card.dueDay) : undefined,
      recurrenceId: r.id,
      accountId: card?.accountId ?? r.accountId,
      cardId: card?.id,
      categoryId: r.categoryId,
      cancelled: false,
      ...(r.operationType === "card" ? { confirmed: false } : {}),
    });
    if (paidInvoice && invoiceBalance(l, paidInvoice.id).paid > 0)
      next.corrections.push({
        id: `recurrence-paid:${operationId}`,
        operationId,
        at: approval.correctionDate!,
        reason: "Previsão adicionada explicitamente a fatura com pagamentos",
        previousAmountCents: 0,
        nextAmountCents: config.amount,
      });
    r.occurrences.push({ operationId, scheduledOn: date });
  }
  const result = syncInvoices(next);
  validateFinancialLedger(result);
  return result;
}
export function changeRecurrence(
  l: LedgerDraft,
  id: string,
  event: RecurrenceEvent,
  confirmed: boolean,
) {
  if (!confirmed || !dateOK(event.effectiveOn))
    throw Error("Confirme a alteração e a data");
  const next = structuredClone(l),
    r = next.recurrences.find((x) => x.id === id);
  if (!r) throw Error("Recorrência inexistente");
  const existing = r.events?.find((x) => x.id === event.id);
  if (existing) {
    if (JSON.stringify(existing) !== JSON.stringify(event))
      throw Error("ID de alteração reutilizado");
    return l;
  }
  if (
    (r.events ?? []).some((e) => e.kind === "cancel") ||
    r.status === "cancelled"
  )
    throw Error("Recorrência encerrada");
  if (r.events?.some((e) => e.effectiveOn > event.effectiveOn))
    throw Error("Alteração retroativa exige revisão explícita do histórico");
  if (
    ["amount", "override"].includes(event.kind) &&
    (!Number.isSafeInteger(event.amountCents) || event.amountCents! <= 0)
  )
    throw Error("Valor inválido");
  const base = r.initialStatus ?? (r.status === "paused" ? "paused" : "active");
  r.initialStatus = base;
  r.events = [...(r.events ?? []), structuredClone(event)];
  if (event.kind === "pause") r.status = "paused";
  if (event.kind === "resume") r.status = "active";
  if (event.kind === "cancel") r.status = "cancelled";
  for (const occurrence of r.occurrences.filter((x) =>
    event.kind === "override"
      ? x.scheduledOn === event.effectiveOn
      : x.scheduledOn >= event.effectiveOn,
  )) {
    const op = next.operations.find((x) => x.id === occurrence.operationId)!;
    const invoice = next.invoices.find((x) => x.installmentIds.includes(op.id));
    const actual =
      op.type === "card"
        ? !!op.confirmed || !!(invoice && invoiceBalance(next, invoice.id).paid)
        : settled(next, op.id) > 0;
    if (event.kind === "amount" || event.kind === "override") {
      if (actual)
        throw Error("Ocorrência confirmada/liquidada exige correção guiada");
      next.corrections.push({
        id: `${event.id}:${op.id}`,
        operationId: op.id,
        at: event.effectiveOn,
        reason: "Alteração confirmada da recorrência",
        previousAmountCents: op.amountCents,
        nextAmountCents: event.amountCents!,
      });
      op.amountCents = event.amountCents!;
    }
    if (
      (event.kind === "pause" || event.kind === "cancel") &&
      !actual &&
      !op.cancelled
    ) {
      op.cancelled = true;
      op.cancelledByRecurrence = event.id;
    }
    if (
      event.kind === "resume" &&
      op.cancelledByRecurrence &&
      r.events.some(
        (e) => e.id === op.cancelledByRecurrence && e.kind === "pause",
      )
    ) {
      op.cancelled = false;
      delete op.cancelledByRecurrence;
    }
  }
  validateFinancialLedger(next);
  return next;
}
