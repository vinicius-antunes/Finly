import { useState, type FormEvent } from "react";
import { cents, money } from "../model";
import { balance, type Goal } from "./data";
import { move, monthly, undo } from "./rules";
export function Movements({
  goal,
  period,
  save,
}: {
  goal: Goal;
  period: string;
  save: (g: Goal) => void;
}) {
  const [kind, setKind] = useState("deposit"),
    [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const f = new FormData(e.currentTarget),
        value = cents(String(f.get("value"))),
        date = String(f.get("date")),
        p = String(f.get("period"));
      if (!value || !f.has("confirmed"))
        throw Error("Valor positivo e confirmação obrigatórios");
      let next: Goal;
      if (kind === "correction") {
        const id = String(f.get("original"));
        next = move(
          undo(goal, id, date, p),
          goal.movements.find((x) => x.id === id)!.delta > 0 ? value : -value,
          date,
          p,
          "Correção de " + id,
        );
      } else
        next =
          kind === "monthly"
            ? monthly(goal, value, date, p)
            : move(
                goal,
                kind === "withdraw" ? -value : value,
                date,
                p,
                String(f.get("note")),
              );
      save(next);
      setError("");
    } catch (e) {
      setError(String(e));
    }
  }
  let running = 0;
  return (
    <section>
      <h2>Gerenciar cofrinho</h2>
      <p>
        Reservado: {money(balance(goal))}. Aportes não são despesas. Datas são
        informativas; saldos seguem a ordem de registro.
      </p>
      <form className="planning-form" onSubmit={submit}>
        <label>
          Operação
          <select
            aria-label="Operação"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="deposit">Reservar dinheiro</option>
            <option value="withdraw">Retirar dinheiro</option>
            <option value="monthly">Confirmar contribuição mensal</option>
            <option value="correction">Corrigir movimentação</option>
          </select>
        </label>
        <label>
          Valor do aporte ou retirada
          <input
            name="value"
            inputMode="decimal"
            required
            defaultValue={goal.monthly / 100}
          />
        </label>
        <label>
          Data
          <input type="date" name="date" defaultValue={today} required />
        </label>
        <label>
          Competência financeira
          <input type="month" name="period" defaultValue={period} required />
        </label>
        {kind === "correction" && (
          <label>
            Movimentação original
            <select aria-label="Movimentação original" name="original">
              {goal.movements
                .filter(
                  (m) =>
                    !m.purchase &&
                    !m.reversalOf &&
                    !goal.movements.some((x) => x.reversalOf === m.id),
                )
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.note} · {money(m.delta)}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label>
          Observação
          <input name="note" maxLength={400} />
        </label>
        <label>
          <input type="checkbox" name="confirmed" required />
          Confirmo que esta movimentação realmente ocorreu
        </label>
        <button type="submit">Confirmar movimentação</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <h3>Histórico de aportes e retiradas</h3>
      <div className="planning-table">
        <table>
          <thead>
            <tr>
              <th>Data / competência</th>
              <th>Tipo / observação / ID</th>
              <th>Valor</th>
              <th>Saldo resultante</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {goal.movements.map((m) => {
              running += m.delta;
              return (
                <tr key={m.id}>
                  <td>
                    {m.date} · {m.period}
                  </td>
                  <td>
                    {m.reversalOf
                      ? "Ajuste"
                      : m.delta > 0
                        ? "Aporte"
                        : "Retirada"}{" "}
                    · {m.note}
                    <small>{m.id}</small>
                  </td>
                  <td>{money(m.delta)}</td>
                  <td>{money(running)}</td>
                  <td>
                    {!m.purchase &&
                      !m.reversalOf &&
                      !goal.movements.some((x) => x.reversalOf === m.id) && (
                        <button
                          onClick={() => {
                            try {
                              if (
                                confirm(
                                  "Desfazer com lançamento de estorno, preservando o histórico?",
                                )
                              )
                                save(undo(goal, m.id, today, period));
                            } catch (e) {
                              setError(String(e));
                            }
                          }}
                        >
                          Desfazer
                        </button>
                      )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
