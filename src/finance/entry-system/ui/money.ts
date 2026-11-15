/** Decimal parsing in integers: never round a binary floating point currency input. */
export function parseMoney(value: string): number {
  let s = value.trim().replace(/R\$|\s/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s))
    throw Error("Informe um valor em reais, com até duas casas decimais.");
  const [integer, fraction = ""] = s.split(".");
  const n = BigInt(integer) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (n > BigInt(Number.MAX_SAFE_INTEGER))
    throw Error("Valor acima do limite permitido.");
  return Number(n);
}
export const decimal = (cents: number) =>
  `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, "0")}`;
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatMoney(cents: number) {
  const n = BigInt(cents);
  const absolute = n < 0n ? -n : n;
  return `${n < 0n ? "-" : ""}R$ ${(absolute / 100n).toLocaleString("pt-BR")},${String(absolute % 100n).padStart(2, "0")}`;
}
