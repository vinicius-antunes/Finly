import { useState, lazy, Suspense } from "react";
import { cents, money, type State } from "../model";
import { balance, type Goal } from "./data";
import { simulate, purchase, forecast } from "./rules";
const Impact = lazy(() =>
  import("./SimulationChart").then((m) => ({ default: m.SimulationChart })),
);
export function Simulator({
  state,
  goal,
  period,
  commit,
}: {
  state: State;
  goal: Goal;
  period: string;
  commit: (s: State) => boolean;
}) {
  const [mode, setMode] = useState("credit"),
    [price, setPrice] = useState(String(goal.target / 100)),
    [parts, setParts] = useState(10),
    [rate, setRate] = useState("0"),
    [down, setDown] = useState("0"),
    [first, setFirst] = useState(period),
    [create, setCreate] = useState(false),
    [error, setError] = useState("");
  let result: ReturnType<typeof simulate> | null = null;
  const v = {
    price: 0,
    down: 0,
    parts: mode === "cash" ? 1 : parts,
    rate: Number(rate.replace(",", ".")),
    period: first,
    cash: mode === "cash",
  };
  try {
    v.price = cents(price);
    v.down =
      mode === "cash"
        ? Math.min(balance(goal), v.price)
        : mode === "down"
          ? cents(down)
          : 0;
    result = simulate(state, goal, v);
  } catch {}
  function finish() {
    try {
      if (!result) throw Error("Confira a simulação");
      if (
        !confirm(
          `Compra ${mode === "cash" ? "à vista" : mode === "down" ? "com entrada" : "parcelada"}: ${money(result.total)}. Usar ${money(v.down)} do cofrinho; restarão ${money(balance(goal) - v.down)}. ${create ? "Criar lançamentos conforme autorização marcada." : "Sem lançamentos: a projeção não incluirá esta compra."} Confirmar?`,
        )
      )
        return;
      commit(
        purchase(state, goal, v, create, new Date().toISOString().slice(0, 10)),
      );
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <section className="planning-simulator">
      <h2>Simular compra</h2>
      <p>
        Simulação não grava lançamentos nem garante disponibilidade bancária.
      </p>
      <div className="planning-form">
        <label>
          Modalidade
          <select
            aria-label="Modalidade"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="cash">À vista</option>
            <option value="credit">Parcelado</option>
            <option value="down">Entrada + parcelas</option>
          </select>
        </label>
        <label>
          Preço total no cartão
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
          />
        </label>
        {mode !== "cash" && (
          <>
            <label>
              Número de parcelas
              <input
                type="number"
                min="1"
                max="120"
                value={parts}
                onChange={(e) => setParts(Number(e.target.value))}
              />
            </label>
            <label>
              Juros simples mensais (%)
              <input
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                inputMode="decimal"
              />
            </label>
          </>
        )}
        {mode === "down" && (
          <label>
            Entrada reservada
            <input
              value={down}
              onChange={(e) => setDown(e.target.value)}
              inputMode="decimal"
            />
          </label>
        )}
        <label>
          Primeira competência
          <input
            type="month"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
          />
        </label>
      </div>
      <p>
        À vista: reservado {money(balance(goal))} · falta{" "}
        {money(Math.max(0, v.price - balance(goal)))} · contribuição{" "}
        {money(goal.monthly)} · prazo{" "}
        {forecast({ ...goal, target: v.price || goal.target }, period).months ??
          "indefinido"}{" "}
        meses. Informe um preço menor para simular desconto.
      </p>
      <div className="planning-table">
        <table aria-label="Comparação das modalidades">
          <thead>
            <tr>
              <th>Modalidade</th>
              <th>Total</th>
              <th>Entrada</th>
              <th>Parcela</th>
              <th>Juros e arredondamento</th>
            </tr>
          </thead>
          <tbody>
            {["cash", "credit", "down"].map((k) => {
              try {
                const r = simulate(state, goal, {
                  ...v,
                  cash: k === "cash",
                  parts: k === "cash" ? 1 : parts,
                  down:
                    k === "cash"
                      ? Math.min(balance(goal), v.price)
                      : k === "down"
                        ? cents(down)
                        : 0,
                });
                return (
                  <tr key={k}>
                    <td>
                      {k === "cash"
                        ? "À vista"
                        : k === "credit"
                          ? "Parcelado"
                          : "Entrada + parcelas"}
                    </td>
                    <td>{money(r.total)}</td>
                    <td>
                      {money(
                        k === "cash"
                          ? Math.min(balance(goal), v.price)
                          : k === "down"
                            ? cents(down)
                            : 0,
                      )}
                    </td>
                    <td>{money(r.per)}</td>
                    <td>{money(r.interest)}</td>
                  </tr>
                );
              } catch {
                return (
                  <tr key={k}>
                    <td>{k}</td>
                    <td colSpan={4}>Confira os parâmetros</td>
                  </tr>
                );
              }
            })}
          </tbody>
        </table>
      </div>
      {result ? (
        <>
          <p role="status">
            Total {money(result.total)} · entrada {money(v.down)} · parcela{" "}
            {money(result.per)} · juros/arredondamento {money(result.interest)}
          </p>
          <p>
            Parcelas iguais, arredondadas para cima em centavos. Juros simples
            mensais sobre o principal, sem CET. Teto compara todas as compras do
            cartão já registradas.
          </p>
          <Suspense fallback={<p>Carregando impacto…</p>}>
            <Impact data={result.impact} />
          </Suspense>
          <p>
            Gráfico: primeiras 12 competências. Tabela: todas as parcelas
            simuladas.
          </p>
          <div className="planning-table">
            <table>
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Compromissos existentes</th>
                  <th>Hipótese</th>
                  <th>Livre estimado</th>
                  <th>Teto do cartão</th>
                </tr>
              </thead>
              <tbody>
                {result.impact.map((x) => (
                  <tr key={x.period}>
                    <td>{x.period}</td>
                    <td>{money(x.existing)}</td>
                    <td>{money(x.hypothetical)}</td>
                    <td>{money(x.free)}</td>
                    <td>{x.capExceeded ? "Acima" : "Dentro"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label>
            <input
              type="checkbox"
              checked={create}
              onChange={(e) => setCreate(e.target.checked)}
            />
            Autorizo separadamente criar os lançamentos financeiros desta compra
          </label>
          <button
            onClick={finish}
            disabled={
              goal.purchaseIds !== undefined ||
              ["purchased", "cancelled", "archived"].includes(goal.status)
            }
          >
            Compra realizada
          </button>
        </>
      ) : (
        <p role="alert">Informe valores válidos para simular.</p>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
