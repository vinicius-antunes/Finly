import type { LedgerDraft } from "./contracts.ts";
type Obj = Record<string, unknown>;
const object = (v: unknown): v is Obj =>
  !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, max = 500): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= max;
const optionalText = (v: unknown) => v === undefined || text(v);
export const dateOK = (v: unknown): v is string =>
  typeof v === "string" &&
  /^20\d\d-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(v) &&
  Number.isFinite(Date.parse(v + "T12:00:00Z")) &&
  new Date(v + "T12:00:00Z").toISOString().slice(0, 10) === v;
export const periodOK = (v: unknown): v is string =>
  typeof v === "string" && /^20\d\d-(0[1-9]|1[0-2])$/.test(v);
const money = (v: unknown) =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const kinds = ["expense", "income", "card", "reimbursement", "transfer"];
const require = (valid: unknown, message: string) => {
  if (!valid) throw Error(message);
};
/** Structural/link validation only. Posting, projections and payment rules belong to phase 2. */
export function validateLedgerDraft(
  input: unknown,
): asserts input is LedgerDraft {
  require(object(input), "Contrato deve ser objeto");
  const s = input as Obj;
  const lists = [
    "invoices",
    "invoicePayments",
    "accounts",
    "cards",
    "categories",
    "operations",
    "purchases",
    "settlements",
    "transfers",
    "recurrences",
    "claims",
    "attachments",
    "corrections",
  ] as const;
  require(s.version === 1, "Versão de contrato não suportada");
  require(Object.keys(s).every(
    (k) => k === "version" || lists.includes(k as (typeof lists)[number]),
  ), "Coleção desconhecida");
  const ids = new Set<string>();
  const maps = new Map<string, Map<string, Obj>>();
  for (const key of lists) {
    require(Array.isArray(s[key]) &&
      (s[key] as unknown[]).length <= 20000, "Coleção inválida: " + key);
    const map = new Map<string, Obj>();
    for (const row of s[key] as unknown[]) {
      require(object(row) && text(row.id, 200), "Identidade inválida: " + key);
      const x = row as Obj;
      require(!ids.has(x.id as string), "ID duplicado");
      ids.add(x.id as string);
      map.set(x.id as string, x);
    }
    maps.set(key, map);
  }
  const rows = (key: (typeof lists)[number]) => [...maps.get(key)!.values()];
  const ref = (key: (typeof lists)[number], id: unknown, optional = false) =>
    require((optional && id === undefined) ||
      (typeof id === "string" && maps.get(key)!.has(id)), "Vínculo inválido: " +
      key);
  const flag = (v: unknown) => typeof v === "boolean";
  for (const a of rows("accounts"))
    require(text(a.name, 100) &&
      ["bank", "cash", "savings", "credit_card"].includes(String(a.type)) &&
      flag(a.archived), "Conta inválida");
  for (const c of rows("cards")) {
    ref("accounts", c.accountId);
    require(maps.get("accounts")!.get(String(c.accountId))!.type ===
      "credit_card" && text(c.name, 100), "Cartão sem conta de cartão");
    for (const k of ["closingDay", "dueDay"])
      require(c[k] === undefined ||
        (Number.isInteger(c[k]) &&
          Number(c[k]) >= 1 &&
          Number(c[k]) <= 31), "Dia de cartão inválido");
    require(c.onClosingDay === undefined ||
      ["current", "next"].includes(
        String(c.onClosingDay),
      ), "Regra de fechamento inválida");
  }
  for (const c of rows("cards"))
    require(c.archived === undefined ||
      flag(c.archived), "Situação de cartão inválida");
  for (const o of rows("operations")) {
    require(o.cancelledByRecurrence === undefined ||
      (text(o.cancelledByRecurrence) &&
        o.cancelled === true &&
        typeof o.recurrenceId ===
          "string"), "Cancelamento recorrente inválido");
    if (o.installmentNumber !== undefined || o.installmentCount !== undefined)
      require(Number.isInteger(o.installmentNumber) &&
        Number(o.installmentNumber) > 0 &&
        Number.isInteger(o.installmentCount) &&
        Number(o.installmentCount) >= Number(o.installmentNumber) &&
        Number(o.installmentCount) <= 120 &&
        typeof o.purchaseId === "string", "Identificação de parcela inválida");
  }
  for (const p of rows("purchases")) {
    require(p.creationKey === undefined ||
      text(p.creationKey, 100000), "Origem da compra inválida");
    require(p.cancelled === undefined ||
      flag(p.cancelled), "Cancelamento de compra inválido");
    if (p.revisions !== undefined) {
      require(Array.isArray(p.revisions), "Histórico contratual inválido");
      for (const revision of p.revisions as unknown[]) {
        require(object(revision) &&
          text(revision.id) &&
          dateOK(revision.at) &&
          text(revision.reason) &&
          money(revision.previousCents), "Revisão inválida");
        const r = revision as Obj;
        require(!ids.has(String(r.id)), "ID de revisão duplicado");
        ids.add(String(r.id));
      }
    }
    if (p.quote !== undefined) {
      require(object(p.quote), "Prévia contratual inválida");
      const q = p.quote as Obj;
      for (const k of [
        "originalCents",
        "enteredCents",
        "estimatedCents",
        "contractedCents",
        "downCents",
      ])
        require(money(q[k]), "Valor contratual inválido");
      require(Array.isArray(q.installments) &&
        q.installments.every((x) => money(x) && Number(x) > 0) &&
        q.installments.length > 0 &&
        q.installments.length <= 120 &&
        Number.isSafeInteger(q.interestCents) &&
        Number.isSafeInteger(q.divergenceCents) &&
        [
          "none",
          "contract-only",
          "simple-monthly",
          "compound-monthly",
        ].includes(String(q.method)), "Parcelas ou juros inválidos");
      require(q.interestCents ===
        Number(q.contractedCents) - Number(q.originalCents) &&
        q.divergenceCents ===
          Number(q.contractedCents) -
            Number(q.estimatedCents), "Diferença contratual inconsistente");
      require((q.installments as number[]).reduce(
        (a, b) => a + b,
        Number(q.downCents),
      ) === q.contractedCents, "Prévia não soma contrato");
    }
  }
  for (const r of rows("recurrences")) {
    require(r.description === undefined ||
      text(r.description, 100), "Descrição recorrente inválida");
    require(r.operationType === undefined ||
      ["expense", "income", "card", "reimbursement"].includes(
        String(r.operationType),
      ), "Tipo recorrente inválido");
    require(r.initialStatus === undefined ||
      ["active", "paused"].includes(
        String(r.initialStatus),
      ), "Situação inicial inválida");
    if (r.events !== undefined) {
      require(Array.isArray(r.events), "Eventos inválidos");
      let last = "";
      for (const item of r.events as unknown[]) {
        require(object(item) &&
          text(item.id) &&
          dateOK(item.effectiveOn) &&
          ["pause", "resume", "cancel", "amount", "override"].includes(
            String(item.kind),
          ), "Evento inválido");
        const e = item as Obj;
        require(!ids.has(String(e.id)) &&
          String(e.effectiveOn) >= last &&
          String(e.effectiveOn) >=
            String(r.startsOn), "Evento duplicado ou retroativo");
        ids.add(String(e.id));
        last = String(e.effectiveOn);
        require(["amount", "override"].includes(String(e.kind))
          ? money(e.amountCents) && Number(e.amountCents) > 0
          : e.amountCents === undefined, "Valor de evento inválido");
      }
    }
  }
  for (const c of rows("categories"))
    require(text(c.name, 100) &&
      Array.isArray(c.types) &&
      c.types.length > 0 &&
      c.types.every((t) => kinds.includes(String(t))) &&
      new Set(c.types).size === c.types.length &&
      flag(c.archived), "Categoria inválida");
  for (const o of rows("operations")) {
    require(kinds.includes(String(o.type)) &&
      text(o.description, 100) &&
      money(o.amountCents) &&
      Number(o.amountCents) > 0 &&
      periodOK(o.period) &&
      flag(o.cancelled), "Operação inválida");
    for (const k of ["operationDate", "expectedDate", "dueDate"])
      require(o[k] === undefined || dateOK(o[k]), "Data inválida");
    ref("accounts", o.accountId, true);
    ref("cards", o.cardId, true);
    ref("categories", o.categoryId, true);
    ref("purchases", o.purchaseId, true);
    ref("recurrences", o.recurrenceId, true);
    require(o.salary === undefined ||
      (flag(o.salary) &&
        o.type === "income"), "Identificação salarial inválida");
    require(o.type === "card" ||
      o.cardId === undefined, "Cartão em tipo incompatível");
    if (o.cardId !== undefined && o.accountId !== undefined)
      require(maps.get("cards")!.get(String(o.cardId))!.accountId ===
        o.accountId, "Conta não corresponde ao cartão");
    require(o.type !==
      "transfer", "Transferência deve usar coleção própria, fora de receitas/despesas");
  }
  for (const p of rows("purchases")) {
    require(money(p.originalCents) &&
      money(p.contractedCents) &&
      Array.isArray(p.installmentIds) &&
      p.installmentIds.length <= 120 &&
      new Set(p.installmentIds).size === p.installmentIds.length &&
      optionalText(p.goalId), "Compra inválida");
    ref("operations", p.downPaymentEntryId, true);
    for (const id of p.installmentIds as unknown[]) {
      ref("operations", id);
      const o = maps.get("operations")!.get(String(id))!;
      require(o.type === "card" &&
        o.purchaseId === p.id, "Parcela incompatível com compra");
    }
    if (p.downPaymentEntryId) {
      const o = maps.get("operations")!.get(String(p.downPaymentEntryId))!;
      require(o.type === "expense" &&
        o.purchaseId === p.id, "Entrada incompatível");
    }
  }
  for (const invoice of rows("invoices")) {
    ref("cards", invoice.cardId);
    require(periodOK(invoice.period) &&
      Array.isArray(invoice.installmentIds) &&
      new Set(invoice.installmentIds).size ===
        invoice.installmentIds.length, "Fatura inválida");
    for (const id of invoice.installmentIds as unknown[]) {
      ref("operations", id);
      const op = maps.get("operations")!.get(String(id))!;
      require(op.type === "card" &&
        op.period === invoice.period &&
        op.cardId === invoice.cardId, "Parcela de outra fatura");
    }
  }
  for (const payment of rows("invoicePayments")) {
    ref("invoices", payment.invoiceId);
    ref("accounts", payment.accountId);
    require(money(payment.amountCents) &&
      Number(payment.amountCents) > 0 &&
      dateOK(payment.date) &&
      text(payment.method, 100) &&
      typeof payment.note === "string", "Pagamento de fatura inválido");
  }
  for (const p of rows("settlements")) {
    ref("operations", p.operationId);
    ref("accounts", p.accountId);
    require(maps.get("operations")!.get(String(p.operationId))!.type !==
      "card", "Compra não é pagamento de fatura");
    require(money(p.amountCents) &&
      Number(p.amountCents) > 0 &&
      dateOK(p.date) &&
      text(p.method, 100) &&
      typeof p.note === "string", "Liquidação inválida");
    ref("settlements", p.reversesId, true);
    if (p.reversesId) {
      const original = maps.get("settlements")!.get(String(p.reversesId))!;
      require(original.operationId === p.operationId &&
        original.amountCents === p.amountCents &&
        original.reversesId === undefined &&
        original.id !== p.id, "Estorno incompatível");
    }
  }
  for (const t of rows("transfers")) {
    ref("accounts", t.fromAccountId);
    ref("accounts", t.toAccountId);
    require(t.fromAccountId !== t.toAccountId &&
      money(t.amountCents) &&
      Number(t.amountCents) > 0 &&
      dateOK(t.date) &&
      typeof t.note === "string" &&
      flag(t.confirmed), "Transferência inválida");
  }
  for (const r of rows("recurrences")) {
    require(["monthly", "annual"].includes(String(r.frequency)) &&
      ["active", "paused", "cancelled"].includes(String(r.status)) &&
      dateOK(r.startsOn) &&
      (r.endsOn === undefined ||
        (dateOK(r.endsOn) && r.endsOn >= String(r.startsOn))) &&
      money(r.amountCents) &&
      Number(r.amountCents) > 0 &&
      Array.isArray(r.occurrences), "Recorrência inválida");
    ref("accounts", r.accountId, true);
    ref("cards", r.cardId, true);
    ref("categories", r.categoryId, true);
    const dates = new Set<string>();
    for (const item of r.occurrences as unknown[]) {
      require(object(item) && dateOK(item.scheduledOn), "Ocorrência inválida");
      const o = item as Obj;
      ref("operations", o.operationId);
      require(maps.get("operations")!.get(String(o.operationId))!
        .recurrenceId === r.id &&
        !dates.has(
          String(o.scheduledOn),
        ), "Ocorrência duplicada ou incompatível");
      dates.add(String(o.scheduledOn));
    }
  }
  for (const c of rows("claims")) {
    ref("operations", c.operationId);
    ref("purchases", c.purchaseId, true);
    require(maps.get("operations")!.get(String(c.operationId))!.type ===
      "reimbursement" &&
      text(c.personId, 200) &&
      text(c.personLabel, 100), "Reembolso inválido");
  }
  for (const a of rows("attachments")) {
    ref("operations", a.operationId);
    require(text(a.name, 255) &&
      ["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
        String(a.mime),
      ) &&
      Number.isSafeInteger(a.size) &&
      Number(a.size) > 0 &&
      Number(a.size) <= 10 * 1024 * 1024 &&
      typeof a.sha256 === "string" &&
      /^[a-f0-9]{64}$/.test(a.sha256), "Metadados de anexo inválidos");
  }
  for (const c of rows("corrections")) {
    ref("operations", c.operationId);
    require(dateOK(c.at) &&
      text(c.reason) &&
      money(c.previousAmountCents) &&
      money(c.nextAmountCents), "Correção inválida");
  }
}
