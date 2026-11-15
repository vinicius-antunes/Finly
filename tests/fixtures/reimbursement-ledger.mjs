import { syntheticCreditState } from "./credit-ledger.mjs";
import {
  registerAgreement,
  receiveAgreement,
} from "../../src/finance/entry-system/reimbursements/commands.ts";
import {
  previewPlannedPurchase,
  confirmPlannedPurchase,
} from "../../src/finance/planning/entry-purchase.ts";
export function syntheticReimbursementState() {
  let s = syntheticCreditState();
  s.entryLedger = registerAgreement(s.entryLedger, {
    id: "synthetic-agreement",
    purchaseId: "synthetic-contract",
    terms: {
      totalCents: 4500,
      personId: "synthetic-person",
      personLabel: "Pessoa sintética",
      description: "Acordo sintético compartilhado",
      note: "Sem dados reais",
      mode: "custom",
      schedule: [
        {
          id: "synthetic-schedule",
          amountCents: 4500,
          period: "2026-11",
          expectedDate: "2026-11-20",
          accountId: "cash-a",
        },
      ],
    },
  });
  s.entryLedger = receiveAgreement(s.entryLedger, "synthetic-agreement", {
    id: "synthetic-receipt",
    operationId: "synthetic-schedule",
    amountCents: 1000,
    date: "2026-11-14",
    accountId: "cash-a",
    method: "Pix",
    note: "Recebimento sintético parcial",
  });
  const input = {
    goalId: "synthetic-goal",
    useCents: 4000,
    date: "2026-11-14",
    period: "2026-11",
    purchase: {
      id: "synthetic-goal-purchase",
      description: "Compra planejada sintética",
      operationDate: "2026-11-14",
      confirmed: true,
      cash: {
        amountCents: 5000,
        accountId: "cash-a",
        method: "Pix",
        period: "2026-11",
      },
    },
  };
  return confirmPlannedPurchase(s, previewPlannedPurchase(s, input), true);
}
