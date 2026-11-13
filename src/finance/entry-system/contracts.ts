/** Versioned contracts. Financial validation is required before activation/posting. */
export type Money = number; // validators require safe, nonnegative integer cents
export type EntryType =
  "expense" | "income" | "card" | "reimbursement" | "transfer";
export type Account = {
  id: string;
  name: string;
  type: "bank" | "cash" | "savings" | "credit_card";
  archived: boolean;
};
export type Card = {
  id: string;
  accountId: string;
  name: string;
  closingDay?: number;
  dueDay?: number;
  onClosingDay?: "current" | "next";
  archived?: boolean;
};
export type Category = {
  id: string;
  name: string;
  types: EntryType[];
  archived: boolean;
};
export type Operation = {
  id: string;
  type: EntryType;
  description: string;
  amountCents: Money;
  operationDate?: string;
  expectedDate?: string;
  period: string;
  dueDate?: string;
  accountId?: string;
  cardId?: string;
  categoryId?: string;
  purchaseId?: string;
  recurrenceId?: string;
  salary?: boolean;
  confirmed?: boolean;
  installmentNumber?: number;
  installmentCount?: number;
  cancelledByRecurrence?: string;
  cancelled: boolean;
};
export type Purchase = {
  creationKey?: string;
  cancelled?: boolean;
  quote?: ReturnType<typeof import("./credit/quote.ts").quotePurchase>;
  revisions?: {
    id: string;
    at: string;
    reason: string;
    previousCents: number;
  }[];
  id: string;
  originalCents: Money;
  contractedCents: Money;
  downPaymentEntryId?: string;
  installmentIds: string[];
  goalId?: string;
};
export type Settlement = {
  id: string;
  operationId: string;
  amountCents: Money;
  date: string;
  accountId: string;
  method: string;
  note: string;
  reversesId?: string;
};
export type Transfer = {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amountCents: Money;
  date: string;
  note: string;
  confirmed: boolean;
};
export type RecurrenceEvent = {
  id: string;
  kind: "pause" | "resume" | "cancel" | "amount" | "override";
  effectiveOn: string;
  amountCents?: number;
};
export type Recurrence = {
  description?: string;
  operationType?: "expense" | "income" | "card" | "reimbursement";
  initialStatus?: "active" | "paused";
  events?: RecurrenceEvent[];
  id: string;
  frequency: "monthly" | "annual";
  startsOn: string;
  endsOn?: string;
  amountCents: Money;
  accountId?: string;
  cardId?: string;
  categoryId?: string;
  status: "active" | "paused" | "cancelled";
  occurrences: { operationId: string; scheduledOn: string }[];
};
export type ReimbursementClaim = {
  id: string;
  operationId: string;
  purchaseId?: string;
  personId: string;
  personLabel: string;
};
export type AttachmentMetadata = {
  id: string;
  operationId: string;
  name: string;
  mime: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  size: number;
  sha256: string;
};
export type Correction = {
  id: string;
  operationId: string;
  at: string;
  reason: string;
  previousAmountCents: Money;
  nextAmountCents: Money;
};
export type Invoice = {
  id: string;
  cardId: string;
  period: string;
  installmentIds: string[];
};
export type InvoicePayment = {
  id: string;
  invoiceId: string;
  accountId: string;
  amountCents: Money;
  date: string;
  method: string;
  note: string;
  reversesId?: string;
};
export type LedgerDraft = {
  invoices: Invoice[];
  invoicePayments: InvoicePayment[];
  version: 1;
  accounts: Account[];
  cards: Card[];
  categories: Category[];
  operations: Operation[];
  purchases: Purchase[];
  settlements: Settlement[];
  transfers: Transfer[];
  recurrences: Recurrence[];
  claims: ReimbursementClaim[];
  attachments: AttachmentMetadata[];
  corrections: Correction[];
};
export function emptyLedgerDraft(): LedgerDraft {
  return {
    version: 1,
    invoices: [],
    invoicePayments: [],
    accounts: [],
    cards: [],
    categories: [],
    operations: [],
    purchases: [],
    settlements: [],
    transfers: [],
    recurrences: [],
    claims: [],
    attachments: [],
    corrections: [],
  };
}
