import { empty } from "../../src/finance/model.ts";
import { emptyLedgerDraft } from "../../src/finance/entry-system/contracts.ts";
import { initialDraft } from "../../src/finance/entry-system/ui/draft.ts";
export function phase7State() {
  const s = empty();
  s.settings.salary = 100000;
  s.settings.reserve = 20000;
  s.settings.cushion = 0;
  s.entryLedger = emptyLedgerDraft();
  s.entryLedger.accounts = [
    { id: "a", name: "Conta sintética A", type: "bank", archived: false },
    { id: "b", name: "Conta sintética B", type: "cash", archived: false },
    {
      id: "cc",
      name: "Conta do cartão sintético",
      type: "credit_card",
      archived: false,
    },
  ];
  s.entryLedger.cards = [
    {
      id: "card",
      name: "Cartão de auditoria",
      accountId: "cc",
      closingDay: 10,
      dueDay: 20,
      onClosingDay: "next",
      archived: false,
    },
  ];
  s.planning = { version: 1, goals: [] };
  return s;
}
export const phase7Draft = (s, type, extra = {}) => ({
  ...initialDraft(s, type, "2026-11"),
  description: "Movimentação sintética " + type,
  amount: "100",
  date: "2026-11-09",
  paymentDate: "2026-11-09",
  period: "2026-11",
  accountId: "a",
  downAccountId: "a",
  cardId: "card",
  ...extra,
});
