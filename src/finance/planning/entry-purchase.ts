import {
  registerCashPurchase,
  type CashPurchaseInput,
} from "../entry-system/cash-purchase.ts";
import { validate, type State } from "../model.ts";
import { save } from "../storage.ts";
import { balance } from "./data.ts";
import {
  registerPurchase,
  type PurchaseInput,
} from "../entry-system/credit/purchases.ts";
import { dateOK, periodOK } from "../entry-system/schema.ts";
export type PlannedPurchase = {
  goalId: string;
  useCents: number;
  date: string;
  period: string;
  purchase: PurchaseInput | CashPurchaseInput;
};
export function previewPlannedPurchase(s: State, input: PlannedPurchase) {
  validate(s);
  const g = s.planning?.goals.find((g) => g.id === input.goalId);
  if (
    !s.entryLedger ||
    !g ||
    !["active", "paused"].includes(g.status) ||
    g.purchaseIds !== undefined ||
    g.ledgerPurchaseId ||
    s.entryLedger.purchases.some((p) => p.goalId === g.id) ||
    !Number.isSafeInteger(input.useCents) ||
    input.useCents < 0 ||
    input.useCents > balance(g) ||
    !dateOK(input.date) ||
    !periodOK(input.period)
  )
    throw Error("Objetivo indisponível ou reserva insuficiente");
  if (s.entryLedger.purchases.some((p) => p.id === input.purchase.id))
    throw Error("Compra já existente");
  const ledger =
    "cash" in input.purchase
      ? registerCashPurchase(s.entryLedger, input.purchase)
      : registerPurchase(s.entryLedger, input.purchase);
  const p = ledger.purchases.find((p) => p.id === input.purchase.id)!;
  if (input.useCents > p.contractedCents)
    throw Error("Uso da reserva excede o custo");
  return {
    source: JSON.stringify(s),
    input: structuredClone(input),
    reservedCents: balance(g),
    remainingCents: balance(g) - input.useCents,
    contractedCents: p.contractedCents,
  };
}
export function confirmPlannedPurchase(
  s: State,
  preview: ReturnType<typeof previewPlannedPurchase>,
  confirmed: boolean,
): State {
  if (!confirmed)
    throw Error("Confirme explicitamente o uso da reserva e a conclusão");
  const key = JSON.stringify(preview.input);
  const prior = s.planning?.goals.find((g) => g.id === preview.input.goalId);
  if (prior?.completionKey) {
    if (prior.completionKey !== key) throw Error("Conclusão duplicada");
    return s;
  }
  if (JSON.stringify(s) !== preview.source)
    throw Error("Estado mudou; atualize a prévia");
  previewPlannedPurchase(s, preview.input);
  const next = structuredClone(s),
    i = preview.input;
  next.entryLedger =
    "cash" in i.purchase
      ? registerCashPurchase(next.entryLedger!, i.purchase)
      : registerPurchase(next.entryLedger!, i.purchase);
  next.entryLedger.purchases.find((p) => p.id === i.purchase.id)!.goalId =
    i.goalId;
  next.entryLedger.purchases.find(
    (p) => p.id === i.purchase.id,
  )!.planningCompletionKey = key;
  const g = next.planning!.goals.find((g) => g.id === i.goalId)!;
  if (i.useCents)
    g.movements.push({
      id: `goal-use:${i.purchase.id}`,
      delta: -i.useCents,
      date: i.date,
      period: i.period,
      note: "Uso confirmado na compra",
      purchase: true,
      ledgerPurchaseId: i.purchase.id,
    });
  g.status = "purchased";
  g.purchaseIds = [];
  g.ledgerPurchaseId = i.purchase.id;
  g.completionKey = key;
  validate(next);
  return next;
}
/** One compare-and-set saves both modules, or throws without returning a saved result. */
export function persistPlannedPurchase(
  s: State,
  preview: ReturnType<typeof previewPlannedPurchase>,
  confirmed: boolean,
  expectedRaw: string,
) {
  if (JSON.stringify(s) !== expectedRaw) throw Error("Snapshot divergente");
  const next = confirmPlannedPurchase(s, preview, confirmed);
  if (next === s) return { state: s, raw: save(s, expectedRaw) };
  const updated = { ...next, revision: s.revision + 1 };
  return { state: updated, raw: save(updated, expectedRaw) };
}
