import type { State } from "../model.ts";
export function validatePlanningLinks(s: State) {
  for (const g of s.planning?.goals ?? []) {
    if (g.ledgerPurchaseId !== undefined) {
      const p = s.entryLedger?.purchases.find(
        (p) => p.id === g.ledgerPurchaseId,
      );
      if (
        !["purchased", "archived"].includes(g.status) ||
        !p ||
        p.goalId !== g.id ||
        p.planningCompletionKey !== g.completionKey ||
        typeof g.completionKey !== "string" ||
        !g.completionKey ||
        !g.purchaseIds ||
        g.purchaseIds.length
      )
        throw Error("Compra do planejamento inconsistente");
    }
    if (g.completionKey !== undefined && !g.ledgerPurchaseId)
      throw Error("Conclusão sem compra");
    const uses = g.movements.filter((m) => m.ledgerPurchaseId !== undefined);
    if (
      uses.length > 1 ||
      (uses.length &&
        -uses[0].delta >
          (s.entryLedger?.purchases.find((p) => p.id === g.ledgerPurchaseId)
            ?.contractedCents ?? 0))
    )
      throw Error("Uso duplicado ou excedente");
    for (const m of g.movements)
      if (
        m.ledgerPurchaseId !== undefined &&
        (!m.purchase ||
          m.delta >= 0 ||
          m.ledgerPurchaseId !== g.ledgerPurchaseId)
      )
        throw Error("Uso da reserva sem vínculo");
  }
  for (const p of s.entryLedger?.purchases ?? [])
    if (
      p.planningCompletionKey !== undefined &&
      (typeof p.planningCompletionKey !== "string" ||
        !p.planningCompletionKey ||
        !s.planning?.goals.some(
          (g) =>
            g.id === p.goalId &&
            g.ledgerPurchaseId === p.id &&
            g.completionKey === p.planningCompletionKey,
        ))
    )
      throw Error("Planejamento sem vínculo recíproco");
}
