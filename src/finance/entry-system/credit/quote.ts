export type QuoteInput = {
  mode: "total" | "installment";
  valueCents: number;
  count: number;
  downCents?: number;
  originalCents?: number;
  finalCents?: number;
  interest?: {
    method: "simple-monthly" | "compound-monthly";
    ratePercent: string;
  };
  customInstallments?: number[];
};
const amount = (v: number) => {
  if (!Number.isSafeInteger(v) || v < 0) throw Error("Centavos inválidos");
  return v;
};
function rounded(n: bigint, d: bigint) {
  const v = Number((n + d / 2n) / d);
  return amount(v);
}
export function quotePurchase(input: QuoteInput) {
  const n = input.count,
    down = amount(input.downCents ?? 0),
    value = amount(input.valueCents);
  if (
    !["total", "installment"].includes(input.mode) ||
    !value ||
    !Number.isInteger(n) ||
    n < 1 ||
    n > 120
  )
    throw Error("Compra ou quantidade de parcelas inválida");
  const entered = input.mode === "total" ? value : amount(value * n + down),
    original = amount(input.originalCents ?? entered);
  if (!original || down >= original)
    throw Error("Entrada deve ser menor que o custo original");
  let estimated = entered;
  if (input.interest) {
    if (input.mode === "installment" && input.originalCents === undefined)
      throw Error("Informe o custo original para comparar juros");
    const { method, ratePercent } = input.interest;
    if (
      !["simple-monthly", "compound-monthly"].includes(method) ||
      !/^\d{1,3}([.,]\d{1,4})?$/.test(ratePercent)
    )
      throw Error("Método ou taxa inválida");
    const rate = BigInt(
      Math.round(Number(ratePercent.replace(",", ".")) * 10000),
    );
    if (rate > 1000000n) throw Error("Taxa máxima de 100% ao mês");
    const denominator = 1000000n,
      principal = BigInt(original - down);
    estimated =
      down +
      (method === "simple-monthly"
        ? rounded(principal * (denominator + rate * BigInt(n)), denominator)
        : rounded(
            principal * (denominator + rate) ** BigInt(n),
            denominator ** BigInt(n),
          ));
    amount(estimated);
  }
  const contracted = amount(
      input.finalCents ?? (input.mode === "installment" ? entered : estimated),
    ),
    financed = contracted - down;
  if (financed < n)
    throw Error(
      "Total deve permitir parcelas positivas; entrada não pode exceder o contrato",
    );
  const base = Math.floor(financed / n);
  const installments = input.customInstallments
    ? [...input.customInstallments]
    : Array.from({ length: n }, (_, i) =>
        i === n - 1 ? financed - base * (n - 1) : base,
      );
  if (
    installments.length !== n ||
    installments.some((x) => !Number.isSafeInteger(x) || x <= 0) ||
    installments.reduce((a, b) => amount(a + b), 0) !== financed
  )
    throw Error("Parcelas personalizadas não correspondem ao contrato");
  return {
    originalCents: original,
    enteredCents: entered,
    estimatedCents: estimated,
    contractedCents: contracted,
    downCents: down,
    installments,
    interestCents: contracted - original,
    divergenceCents: contracted - estimated,
    method:
      input.interest?.method ??
      (contracted !== original ? "contract-only" : "none"),
    ratePercent: input.interest?.ratePercent,
  };
}
