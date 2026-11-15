export type ScheduleRow = {
  id: string;
  amountCents: number;
  period: string;
  expectedDate?: string;
  accountId?: string;
};
export type AgreementTerms = {
  totalCents: number;
  personId: string;
  personLabel: string; // empty means identification pending, never a fabricated name
  description: string;
  note: string;
  mode: "single" | "installments" | "custom";
  schedule: ScheduleRow[];
};
export type Agreement = {
  id: string;
  purchaseId?: string;
  origin: "purchase" | "standalone";
  creationKey: string;
  terms: AgreementTerms;
  operationIds: string[]; // includes retired rows to preserve payment history
  events: {
    id: string;
    kind: "correction" | "cancel";
    date: string;
    reason: string;
    previous: AgreementTerms;
    next: AgreementTerms;
  }[];
};
