import type { LedgerDraft } from "../contracts.ts";
import { dateOK, periodOK } from "../schema.ts";
import type { AgreementTerms } from "./contracts.ts";
export function validateTerms(t: AgreementTerms) {
  if (
    !t ||
    typeof t.personId !== "string" ||
    !t.personId.trim() ||
    t.personId.length > 200 ||
    typeof t.personLabel !== "string" ||
    t.personLabel.length > 100 ||
    typeof t.description !== "string" ||
    !t.description.trim() ||
    t.description.length > 500 ||
    typeof t.note !== "string" ||
    t.note.length > 500 ||
    !["single", "installments", "custom"].includes(t.mode) ||
    !Array.isArray(t.schedule) ||
    !t.schedule.length ||
    t.schedule.length > 120 ||
    (t.mode === "single" && t.schedule.length !== 1)
  )
    throw Error("Termos do reembolso inválidos");
  const ids = new Set();
  let total = 0;
  for (const r of t.schedule) {
    if (
      !r ||
      typeof r.id !== "string" ||
      !r.id ||
      ids.has(r.id) ||
      !Number.isSafeInteger(r.amountCents) ||
      r.amountCents <= 0 ||
      !periodOK(r.period) ||
      (r.expectedDate !== undefined && !dateOK(r.expectedDate))
    )
      throw Error("Cronograma inválido");
    ids.add(r.id);
    total += r.amountCents;
  }
  if (!Number.isSafeInteger(total) || total !== t.totalCents)
    throw Error("Total inseguro");
  return total;
}
export function validateAgreements(l: LedgerDraft) {
  const used = new Set<string>();
  const eventIds = new Set(
    Object.values(l).flatMap((v) =>
      Array.isArray(v) ? v.map((x) => x.id) : [],
    ),
  );
  for (const p of l.purchases)
    for (const r of p.revisions ?? []) eventIds.add(r.id);
  for (const r of l.recurrences)
    for (const e of r.events ?? []) eventIds.add(e.id);
  for (const a of l.agreements ?? []) {
    validateTerms(a.terms);
    if (
      !["purchase", "standalone"].includes(a.origin) ||
      (a.origin === "purchase") !== (a.purchaseId !== undefined) ||
      (a.purchaseId !== undefined &&
        !l.purchases.some((p) => p.id === a.purchaseId)) ||
      typeof a.creationKey !== "string" ||
      !a.creationKey ||
      !Array.isArray(a.operationIds) ||
      !a.operationIds.length ||
      new Set(a.operationIds).size !== a.operationIds.length ||
      !Array.isArray(a.events) ||
      a.events.length > 20000
    )
      throw Error("Acordo inválido");
    for (const id of a.operationIds) {
      const o = l.operations.find((o) => o.id === id);
      const claims = l.claims.filter((c) => c.operationId === id);
      const row = a.terms.schedule.find((r) => r.id === id);
      if (
        used.has(id) ||
        !o ||
        o.type !== "reimbursement" ||
        claims.length !== 1 ||
        claims[0].purchaseId !== a.purchaseId ||
        claims[0].personId !== a.terms.personId ||
        claims[0].personLabel !== a.terms.personLabel ||
        (!row && !o.cancelled) ||
        (row &&
          (o.amountCents !== row.amountCents ||
            o.period !== row.period ||
            o.expectedDate !== row.expectedDate ||
            o.accountId !== row.accountId))
      )
        throw Error("Vínculos do acordo inconsistentes");
      used.add(id);
    }
    if (a.terms.schedule.some((r) => !a.operationIds.includes(r.id)))
      throw Error("Previsão sem obrigação");
    for (const e of a.events) {
      if (
        !e ||
        !["correction", "cancel"].includes(e.kind) ||
        typeof e.id !== "string" ||
        !e.id ||
        eventIds.has(e.id) ||
        !dateOK(e.date) ||
        typeof e.reason !== "string" ||
        !e.reason.trim()
      )
        throw Error("Evento de acordo inválido");
      eventIds.add(e.id);
      validateTerms(e.previous);
      validateTerms(e.next);
    }
  }
  for (const p of l.purchases) {
    if (
      p.responsibility !== undefined &&
      !["personal", "other", "shared"].includes(p.responsibility)
    )
      throw Error("Responsabilidade inválida");
    if (
      p.responsibility === "personal" &&
      l.claims.some(
        (c) =>
          c.purchaseId === p.id &&
          !l.operations.find((o) => o.id === c.operationId)!.cancelled,
      )
    )
      throw Error("Compra pessoal não admite reembolso vinculado");
  }
}
