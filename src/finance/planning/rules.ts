import { metrics, offset, generate, type State } from "../model.ts";
import { balance, type Goal, type Movement } from "./data.ts";
export function planningTotals(s: State, period: string) {
  const goals = s.planning?.goals ?? [],
    allocation = goals
      .flatMap((g) => g.movements)
      .filter((m) => m.period === period)
      .reduce((n, m) => n + m.delta, 0);
  return {
    reserved: goals.reduce((n, g) => n + balance(g), 0),
    allocation,
    free: metrics(s, period).available - allocation,
    planned: goals
      .filter((g) => g.status === "active" && !g.months[period])
      .reduce((n, g) => n + g.monthly, 0),
  };
}
export function move(
  g: Goal,
  delta: number,
  date: string,
  period: string,
  note: string,
  extra: Partial<Movement> = {},
): Goal {
  if (!Number.isSafeInteger(delta) || !delta || balance(g) + delta < 0)
    throw Error("Valor inválido ou saldo insuficiente");
  return {
    ...g,
    movements: [
      ...g.movements,
      { ...extra, id: crypto.randomUUID(), delta, date, period, note },
    ],
  };
}
export function monthly(g: Goal, value: number, date: string, period: string) {
  if (value <= 0 || g.status !== "active" || g.months[period])
    throw Error("Contribuição já tratada ou objetivo inativo");
  const next = move(g, value, date, period, "Contribuição mensal confirmada");
  return {
    ...next,
    months: {
      ...g.months,
      [period]: {
        status: "confirmed" as const,
        movementId: next.movements.at(-1)!.id,
      },
    },
  };
}
export function undo(g: Goal, id: string, date: string, period: string) {
  const m = g.movements.find((x) => x.id === id);
  if (
    !m ||
    m.purchase ||
    m.reversalOf ||
    g.movements.some((x) => x.reversalOf === id)
  )
    throw Error("Movimentação já desfeita ou vinculada à compra");
  return move(g, -m.delta, date, period, "Estorno: " + m.note, {
    reversalOf: id,
  });
}
export function forecast(g: Goal, period: string) {
  const months = g.monthly
    ? Math.ceil(Math.max(0, g.target - balance(g)) / g.monthly)
    : null;
  return { months, period: months === null ? null : offset(period, months) };
}
export type Simulation = {
  price: number;
  down: number;
  parts: number;
  rate: number;
  period: string;
  cash?: boolean;
};
export function simulate(s: State, g: Goal, v: Simulation) {
  if (
    !Number.isSafeInteger(v.price) ||
    v.price <= 0 ||
    !Number.isSafeInteger(v.down) ||
    v.down < 0 ||
    v.down > balance(g) ||
    v.down > v.price ||
    !Number.isInteger(v.parts) ||
    v.parts < 1 ||
    v.parts > 120 ||
    !Number.isFinite(v.rate) ||
    v.rate < 0 ||
    v.rate > 100
  )
    throw Error("Preço, entrada, parcelas ou taxa inválidos");
  const principal = v.price - v.down,
    per = v.cash
      ? 0
      : Math.ceil((principal * (1 + (v.rate / 100) * v.parts)) / v.parts),
    total = v.cash ? v.price : per * v.parts + v.down;
  if (!Number.isSafeInteger(total)) throw Error("Total excede limite");
  const impact = Array.from({ length: v.cash ? 1 : v.parts }, (_, i) => {
    const period = offset(v.period, i),
      m = metrics(s, period),
      existing = s.transactions
        .filter((x) => x.period === period && x.legacyKind === "credit")
        .reduce((n, x) => n + x.amountCents, 0);
    return {
      period,
      existing: m.commitment,
      hypothetical: v.cash ? v.price : per,
      free: planningTotals(s, period).free - (v.cash ? v.price - v.down : per),
      card: existing + per,
      capExceeded: existing + per > s.settings.installmentCap,
    };
  });
  return { per, total, interest: total - v.price, impact };
}
export function purchase(
  s: State,
  g: Goal,
  v: Simulation,
  create: boolean,
  date: string,
) {
  if (
    s.planning?.goals.find((x) => x.id === g.id)?.status === "purchased" ||
    g.purchaseIds !== undefined ||
    g.status === "purchased" ||
    g.status === "cancelled" ||
    g.status === "archived"
  )
    throw Error("Compra já concluída ou objetivo encerrado");
  const current = s.planning?.goals.find((x) => x.id === g.id);
  if (!current || JSON.stringify(current) !== JSON.stringify(g))
    throw Error("Objetivo mudou. Atualize antes de confirmar.");
  const sim = simulate(s, g, v);
  let next = v.down
    ? move(g, -v.down, date, v.period, "Uso confirmado na compra", {
        purchase: true,
      })
    : g;
  let rows: State["transactions"] = [];
  if (create) {
    if (v.cash)
      rows.push(
        ...generate({
          description: g.name,
          amountCents: v.price,
          period: v.period,
          legacyKind: "out",
          category: g.category,
          owner: "self",
          status: "received",
          confirmed: true,
          note: "Planejamento " + g.id,
        }),
      );
    else if (v.down)
      rows.push(
        ...generate({
          description: "Entrada — " + g.name,
          amountCents: v.down,
          period: v.period,
          legacyKind: "out",
          category: g.category,
          owner: "self",
          status: "received",
          confirmed: true,
          note: "Planejamento " + g.id,
        }),
      );
    if (sim.per)
      rows.push(
        ...generate(
          {
            description: g.name,
            amountCents: sim.per,
            period: v.period,
            legacyKind: "credit",
            category: g.category,
            owner: "self",
            status: "planned",
            confirmed: true,
            note: "Planejamento " + g.id,
          },
          v.parts,
        ),
      );
  }
  next = { ...next, status: "purchased", purchaseIds: rows.map((x) => x.id) };
  return {
    ...s,
    transactions: [...s.transactions, ...rows],
    planning: {
      version: 1 as const,
      goals: (s.planning?.goals ?? []).map((x) => (x.id === g.id ? next : x)),
    },
  };
}
