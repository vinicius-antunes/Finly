import type { LedgerDraft, Account, Category } from "./contracts.ts";
import { validateFinancialLedger } from "./finance.ts";
export function configureAccount(l: LedgerDraft, account: Account) {
  const old = l.accounts.find((a) => a.id === account.id);
  if (old && old.type !== account.type)
    throw Error("O tipo da conta não pode mudar. Crie outra conta.");
  const next = {
    ...l,
    accounts: old
      ? l.accounts.map((a) => (a.id === account.id ? { ...account } : a))
      : [...l.accounts, { ...account }],
  };
  validateFinancialLedger(next);
  return next;
}
export function configureCategory(l: LedgerDraft, category: Category) {
  const old = l.categories.find((c) => c.id === category.id);
  if (old && old.name !== category.name)
    category = {
      ...category,
      previousNames: [...(old.previousNames ?? []), old.name],
    };
  const next = {
    ...l,
    categories: l.categories.some((c) => c.id === category.id)
      ? l.categories.map((c) => (c.id === category.id ? { ...category } : c))
      : [...l.categories, { ...category }],
  };
  validateFinancialLedger(next);
  return next;
}
export function deleteCategory(l: LedgerDraft, id: string) {
  if (
    l.operations.some((o) => o.categoryId === id) ||
    l.recurrences.some((r) => r.categoryId === id) ||
    l.corrections.some((c) => c.previousOperation?.categoryId === id)
  )
    throw Error(
      "Categoria com registros ou histórico. Arquive para preservar as classificações.",
    );
  const next = { ...l, categories: l.categories.filter((c) => c.id !== id) };
  validateFinancialLedger(next);
  return next;
}
export function reclassifyCategory(
  l: LedgerDraft,
  from: string,
  to: string,
  confirmed: boolean,
) {
  if (
    !confirmed ||
    from === to ||
    !l.categories.some((c) => c.id === to && !c.archived)
  )
    throw Error("Escolha outra categoria ativa e confirme a reclassificação.");
  const at = new Date().toLocaleDateString("sv-SE");
  const target = l.categories.find((c) => c.id === to)!;
  if (
    l.operations.some(
      (o) => o.categoryId === from && !target.types.includes(o.type),
    ) ||
    l.recurrences.some(
      (r) =>
        r.categoryId === from &&
        r.operationType &&
        !target.types.includes(r.operationType),
    )
  )
    throw Error(
      "A categoria de destino precisa aceitar os tipos dos registros selecionados.",
    );
  const revision = crypto.randomUUID();
  const next = {
    ...l,
    corrections: [
      ...l.corrections,
      ...l.operations
        .filter((o) => o.categoryId === from)
        .map((o) => ({
          id: `category:${revision}:${o.id}`,
          operationId: o.id,
          at,
          reason: `Reclassificação confirmada de ${l.categories.find((c) => c.id === from)?.name ?? from}`,
          previousAmountCents: o.amountCents,
          nextAmountCents: o.amountCents,
          previousOperation: structuredClone(o),
          nextOperation: { ...o, categoryId: to },
        })),
    ],
    operations: l.operations.map((o) =>
      o.categoryId === from ? { ...o, categoryId: to } : o,
    ),
    recurrences: l.recurrences.map((r) =>
      r.categoryId === from ? { ...r, categoryId: to } : r,
    ),
  };
  validateFinancialLedger(next);
  return next;
}
