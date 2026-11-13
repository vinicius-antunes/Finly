export type Movement = {
  id: string;
  delta: number;
  date: string;
  period: string;
  note: string;
  reversalOf?: string;
  purchase?: boolean;
};
export type Goal = {
  id: string;
  name: string;
  category: string;
  target: number;
  monthly: number;
  deadline: string;
  note: string;
  status: "active" | "paused" | "purchased" | "cancelled" | "archived";
  movements: Movement[];
  months: Record<
    string,
    { status: "confirmed" | "deferred" | "skipped"; movementId?: string }
  >;
  purchaseIds?: string[];
};
export type Planning = { version: 1; goals: Goal[] };
export const balance = (g: Goal) =>
  g.movements.reduce((n, m) => n + m.delta, 0);
export function validatePlanning(p: unknown): asserts p is Planning {
  const fail = () => {
    throw Error("Planejamentos ou histórico inválidos");
  };
  if (!p || typeof p !== "object") return fail();
  const q = p as Planning;
  if (q.version !== 1 || !Array.isArray(q.goals) || q.goals.length > 1000)
    return fail();
  const ids = new Set<string>();
  const id = (s: unknown) => {
    if (typeof s !== "string" || !s || ids.has(s)) fail();
    ids.add(s as string);
  };
  const amount = (v: number) => {
    if (!Number.isSafeInteger(v) || v < 0) fail();
  };
  for (const g of q.goals) {
    if (!g || typeof g !== "object") fail();
    id(g.id);
    if (
      ["name", "category", "deadline", "note"].some(
        (k) => typeof g[k as keyof Goal] !== "string",
      ) ||
      !g.name.trim() ||
      !["active", "paused", "purchased", "cancelled", "archived"].includes(
        g.status,
      )
    )
      fail();
    amount(g.target);
    amount(g.monthly);
    if (!g.target || (g.deadline && !/^20\d\d-\d\d-\d\d$/.test(g.deadline)))
      fail();
    if (
      !Array.isArray(g.movements) ||
      g.movements.length > 20000 ||
      !g.months ||
      typeof g.months !== "object" ||
      Array.isArray(g.months)
    )
      fail();
    let running = 0;
    const prior = new Map<string, Movement>(),
      undone = new Set<string>();
    for (const m of g.movements) {
      id(m.id);
      if (
        !Number.isSafeInteger(m.delta) ||
        !m.delta ||
        !/^20\d\d-(0[1-9]|1[0-2])$/.test(m.period) ||
        !/^20\d\d-\d\d-\d\d$/.test(m.date) ||
        new Date(m.date + "T12:00:00Z").toISOString().slice(0, 10) !== m.date ||
        typeof m.note !== "string" ||
        (m.purchase !== undefined && typeof m.purchase !== "boolean")
      )
        fail();
      if (m.reversalOf) {
        const old = prior.get(m.reversalOf);
        if (
          !old ||
          old.purchase ||
          undone.has(old.id) ||
          old.delta !== -m.delta
        )
          fail();
        undone.add(m.reversalOf);
      }
      running += m.delta;
      if (!Number.isSafeInteger(running) || running < 0) fail();
      prior.set(m.id, m);
    }
    for (const [period, v] of Object.entries(g.months)) {
      if (
        !/^20\d\d-(0[1-9]|1[0-2])$/.test(period) ||
        !v ||
        !["confirmed", "deferred", "skipped"].includes(v.status) ||
        (v.status === "confirmed" &&
          (!v.movementId || !prior.has(v.movementId)))
      )
        fail();
    }
    if (
      g.purchaseIds !== undefined &&
      (!Array.isArray(g.purchaseIds) ||
        g.purchaseIds.some((x) => typeof x !== "string") ||
        new Set(g.purchaseIds).size !== g.purchaseIds.length)
    )
      fail();
  }
  const allocations = new Map<string, number>();
  for (const g of q.goals)
    for (const m of g.movements) {
      const n = (allocations.get(m.period) ?? 0) + m.delta;
      if (!Number.isSafeInteger(n)) fail();
      allocations.set(m.period, n);
    }
  const total = q.goals.reduce((n, g) => n + balance(g), 0);
  amount(total);
}
