import type { Card, LedgerDraft } from "../contracts.ts";
import { dateOK, periodOK } from "../schema.ts";
import { validateFinancialLedger } from "../finance.ts";
export function monthOffset(period: string, delta: number) {
  if (!periodOK(period) || !Number.isInteger(delta))
    throw Error("Competência inválida");
  const [y, m] = period.split("-").map(Number),
    d = new Date(Date.UTC(y, m - 1 + delta, 1));
  const result = d.toISOString().slice(0, 7);
  if (!periodOK(result)) throw Error("Competência fora do intervalo suportado");
  return result;
}
export function dateInMonth(period: string, day: number) {
  if (!periodOK(period) || !Number.isInteger(day) || day < 1 || day > 31)
    throw Error("Data inválida");
  const [y, m] = period.split("-").map(Number),
    last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${period}-${String(Math.min(day, last)).padStart(2, "0")}`;
}
export function firstInvoice(card: Card, date: string, manualPeriod?: string) {
  if (!dateOK(date)) throw Error("Data da compra inválida");
  if (manualPeriod !== undefined) {
    if (!periodOK(manualPeriod)) throw Error("Competência manual inválida");
    return {
      period: manualPeriod,
      dueDate: card.dueDay ? dateInMonth(manualPeriod, card.dueDay) : undefined,
      manual: true,
    };
  }
  if (!card.closingDay || !card.dueDay || !card.onClosingDay)
    throw Error(
      "Configure fechamento, vencimento e regra de fechamento, ou informe a competência manual",
    );
  let closingMonth = date.slice(0, 7);
  const closing = dateInMonth(closingMonth, card.closingDay);
  if (date > closing || (date === closing && card.onClosingDay === "next"))
    closingMonth = monthOffset(closingMonth, 1);
  const period =
    dateInMonth(closingMonth, card.dueDay) <=
    dateInMonth(closingMonth, card.closingDay)
      ? monthOffset(closingMonth, 1)
      : closingMonth;
  return { period, dueDate: dateInMonth(period, card.dueDay), manual: false };
}
export function configureCard(l: LedgerDraft, card: Card) {
  const account = l.accounts.find((x) => x.id === card.accountId);
  if (!account || account.type !== "credit_card")
    throw Error("Selecione uma conta de cartão existente");
  const old = l.cards.find((x) => x.id === card.id);
  if (
    old &&
    old.accountId !== card.accountId &&
    l.operations.some((x) => x.cardId === card.id)
  )
    throw Error("Cartão com histórico não pode trocar de conta");
  const next = {
    ...l,
    cards: old
      ? l.cards.map((x) => (x.id === card.id ? structuredClone(card) : x))
      : [...l.cards, structuredClone(card)],
  };
  validateFinancialLedger(next);
  return next;
}
