import { useState, type FormEvent } from "react";
import { cents } from "../model";
import { move } from "./rules";
import type { Goal } from "./data";
export function GoalForm({
  goal,
  period,
  save,
  cancel,
}: {
  goal?: Goal;
  period: string;
  save: (g: Goal) => void;
  cancel: () => void;
}) {
  const [error, setError] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const f = new FormData(e.currentTarget),
        text = (k: string) => String(f.get(k) ?? ""),
        initial = goal ? 0 : cents(text("initial") || "0");
      if (initial && !f.has("separated"))
        throw Error("Confirme que o dinheiro inicial já está separado");
      const g: Goal = {
        ...(goal ?? {
          id: crypto.randomUUID(),
          status: "active",
          movements: [],
          months: {},
        }),
        name: text("name").trim(),
        category: text("category"),
        target: cents(text("target")),
        monthly: cents(text("monthly") || "0"),
        deadline: text("deadline"),
        note: text("note"),
      };
      if (!g.name || !g.target)
        throw Error("Nome e meta positiva obrigatórios");
      save(
        initial
          ? move(
              g,
              initial,
              new Date().toISOString().slice(0, 10),
              period,
              "Aporte inicial confirmado",
            )
          : g,
      );
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <form className="planning-form" onSubmit={submit}>
      <h2>{goal ? "Editar planejamento" : "Novo planejamento"}</h2>
      <label>
        Nome do objetivo
        <input name="name" required maxLength={100} defaultValue={goal?.name} />
      </label>
      <label>
        Categoria
        <input
          aria-label="Categoria"
          name="category"
          list="goal-categories"
          defaultValue={goal?.category ?? "Eletrônicos"}
        />
        <datalist id="goal-categories">
          {["Eletrônicos", "Viagem", "Veículo", "Estudos", "Casa", "Lazer"].map(
            (x) => (
              <option key={x}>{x}</option>
            ),
          )}
        </datalist>
      </label>
      <label>
        Preço estimado
        <input
          name="target"
          inputMode="decimal"
          required
          defaultValue={goal ? goal.target / 100 : ""}
        />
      </label>
      <label>
        Contribuição mensal
        <input
          name="monthly"
          inputMode="decimal"
          defaultValue={(goal?.monthly ?? 0) / 100}
        />
      </label>
      {!goal && (
        <>
          <label>
            Valor inicial
            <input name="initial" inputMode="decimal" defaultValue="0" />
          </label>
          <label>
            <input name="separated" type="checkbox" />O dinheiro inicial já foi
            separado
          </label>
        </>
      )}
      <label>
        Data desejada
        <input name="deadline" type="date" defaultValue={goal?.deadline} />
      </label>
      <label>
        Observações
        <textarea name="note" maxLength={400} defaultValue={goal?.note} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit">Salvar planejamento</button>
      <button type="button" onClick={cancel}>
        Cancelar
      </button>
    </form>
  );
}
