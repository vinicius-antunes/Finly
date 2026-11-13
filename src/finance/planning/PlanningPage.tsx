import { useState } from "react";
import { MagicCard } from "@/components/visual/MagicCard";
import { ProgressBar } from "@/components/tremor/ProgressBar";
import { money, type State } from "../model";
import { balance, type Goal } from "./data";
import { planningTotals, forecast } from "./rules";
import { GoalForm } from "./GoalForm";
import { Movements } from "./Movements";
import { Simulator } from "./Simulator";
const statuses = {
  active: "Em andamento",
  paused: "Pausado",
  purchased: "Compra realizada",
  cancelled: "Cancelado",
  archived: "Arquivado",
};
export function PlanningPage({
  state,
  period,
  commit,
}: {
  state: State;
  period: string;
  commit: (s: State) => boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null),
    [form, setForm] = useState(false),
    [editing, setEditing] = useState(false),
    [filter, setFilter] = useState("active"),
    [error, setError] = useState("");
  const goals = state.planning?.goals ?? [],
    g = goals.find((x) => x.id === selected),
    totals = planningTotals(state, period);
  function save(goal: Goal) {
    if (
      !commit({
        ...state,
        planning: {
          version: 1,
          goals: goals.some((x) => x.id === goal.id)
            ? goals.map((x) => (x.id === goal.id ? goal : x))
            : [...goals, goal],
        },
      })
    )
      throw Error("Não foi possível salvar. Dados preservados.");
    setForm(false);
    setEditing(false);
  }
  return (
    <div className="planning-page">
      <div className="planning-summary">
        {[
          [
            "Objetivos ativos",
            goals.filter((x) => x.status === "active").length,
          ],
          ["Total reservado", money(totals.reserved)],
          [
            "Falta nas metas ativas",
            money(
              goals
                .filter((x) => x.status === "active")
                .reduce((n, g) => n + Math.max(0, g.target - balance(g)), 0),
            ),
          ],
          ["Contribuições planejadas", money(totals.planned)],
        ].map(([name, value]) => (
          <MagicCard key={name} className="planning-stat">
            <h2>{name}</h2>
            <strong>{value}</strong>
          </MagicCard>
        ))}
      </div>
      <p>
        Saldo projetado original: {money(totals.free + totals.allocation)} ·
        alocação líquida em {period}: {money(totals.allocation)} ·
        disponibilidade livre estimada: <strong>{money(totals.free)}</strong>.
      </p>
      <p className="muted">
        Estimativa de planejamento, não saldo bancário. Reserva protegida não é
        origem automática. Saldos históricos não são descontados novamente a
        cada mês.
      </p>
      {error && <p role="alert">{error}</p>}
      {form || editing ? (
        <GoalForm
          goal={editing ? g : undefined}
          period={period}
          save={save}
          cancel={() => {
            setForm(false);
            setEditing(false);
          }}
        />
      ) : g ? (
        <>
          <button onClick={() => setSelected(null)}>
            Voltar aos planejamentos
          </button>
          <h2>{g.name}</h2>
          <p>
            {g.note} · Meta {money(g.target)} ·{" "}
            {g.deadline && `Data desejada: ${g.deadline}`}
          </p>
          <button onClick={() => setEditing(true)}>Editar planejamento</button>
          <label>
            Situação do objetivo
            <select
              aria-label="Situação do objetivo"
              value={g.status}
              onChange={(e) => {
                try {
                  if (
                    g.purchaseIds !== undefined &&
                    e.target.value !== "archived"
                  )
                    throw Error("Compra concluída mantém seu histórico");
                  if (
                    confirm(
                      "Alterar situação? Os valores permanecem reservados. Para liberar, registre uma retirada explícita.",
                    )
                  )
                    save({ ...g, status: e.target.value as Goal["status"] });
                } catch (e) {
                  setError(String(e));
                }
              }}
            >
              {Object.entries(statuses)
                .filter(([k]) =>
                  g.purchaseIds !== undefined
                    ? ["purchased", "archived"].includes(k)
                    : k !== "purchased",
                )
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
            </select>
          </label>
          <p>
            Contribuição de {period}:{" "}
            {g.months[period]
              ? {
                  confirmed: "Confirmada",
                  deferred: "Adiada",
                  skipped: "Ignorada",
                }[g.months[period].status]
              : "Aguardando confirmação"}{" "}
            · {money(g.monthly)}. Pausa/arquivamento não libera dinheiro.
          </p>
          {g.status === "active" && !g.months[period] && (
            <div>
              {["deferred", "skipped"].map((status, i) => (
                <button
                  key={status}
                  onClick={() => {
                    try {
                      save({
                        ...g,
                        months: {
                          ...g.months,
                          [period]: {
                            status: status as "deferred" | "skipped",
                          },
                        },
                      });
                    } catch (e) {
                      setError(String(e));
                    }
                  }}
                >
                  {i ? "Ignorar neste mês" : "Adiar contribuição"}
                </button>
              ))}
            </div>
          )}
          <Movements key={g.id} goal={g} period={period} save={save} />
          <Simulator
            key={g.id + "sim"}
            goal={g}
            state={state}
            period={period}
            commit={commit}
          />
        </>
      ) : (
        <>
          <div className="planning-toolbar">
            <button onClick={() => setForm(true)}>Novo planejamento</button>
            <label>
              Mostrar objetivos
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="active">Ativos</option>
                <option value="all">Todos, incluindo históricos</option>
                {Object.entries(statuses)
                  .filter(([k]) => k !== "active")
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <div className="planning-goals">
            {goals
              .filter((g) => filter === "all" || g.status === filter)
              .map((g) => {
                const reserved = balance(g),
                  remaining = Math.max(0, g.target - reserved),
                  f = forecast(g, period);
                return (
                  <MagicCard className="planning-goal" key={g.id}>
                    <span>{g.category}</span>
                    <h2>{g.name}</h2>
                    <strong>
                      {money(reserved)} <small>de {money(g.target)}</small>
                    </strong>
                    <ProgressBar
                      value={Math.min(100, (reserved / g.target) * 100)}
                    />
                    <p>
                      {Math.round((reserved / g.target) * 100)}% · falta{" "}
                      {money(remaining)}
                    </p>
                    <p>
                      {g.status === "active" && !remaining
                        ? "Meta atingida"
                        : statuses[g.status]}
                    </p>
                    <p>
                      Estimativa condicional:{" "}
                      {f.months === null
                        ? "defina contribuição mensal"
                        : `${f.months} meses · ${f.period}`}
                    </p>
                    <button onClick={() => setSelected(g.id)}>
                      Gerenciar cofrinho
                    </button>
                    <details>
                      <summary>Mais ações</summary>
                      <button
                        onClick={() => {
                          setSelected(g.id);
                          setEditing(true);
                        }}
                      >
                        Editar objetivo
                      </button>
                      <button onClick={() => setSelected(g.id)}>
                        Simular compra
                      </button>
                    </details>
                  </MagicCard>
                );
              })}
          </div>
          {!goals.length && (
            <p>Nenhum planejamento. Crie seu primeiro objetivo.</p>
          )}
        </>
      )}
    </div>
  );
}
