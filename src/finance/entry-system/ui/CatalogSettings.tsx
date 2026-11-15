import { useEffect, useState, useId } from "react";
import { Button } from "@/components/ui/button";
import type { State } from "../../model";
import {
  configureAccount,
  configureCategory,
  deleteCategory,
  reclassifyCategory,
} from "../catalog";
import { configureCard } from "../credit/dates";
import { FormField } from "./fields";
import type { EntryType } from "../contracts";
export function CatalogSettings({
  state,
  onCommit,
  onDirtyChange,
}: {
  state: State;
  onCommit: (s: State) => boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const l = state.entryLedger;
  const [name, setName] = useState(""),
    [type, setType] = useState<"bank" | "cash" | "savings" | "credit_card">(
      "bank",
    ),
    [cardName, setCardName] = useState(""),
    [account, setAccount] = useState(""),
    [close, setClose] = useState("10"),
    [due, setDue] = useState("20"),
    [rule, setRule] = useState<"current" | "next">("next"),
    [category, setCategory] = useState(""),
    [error, setError] = useState("");
  const dirty = !!(name || cardName || category);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  if (!l) return null;
  function apply(fn: () => NonNullable<State["entryLedger"]>) {
    try {
      if (!onCommit({ ...state, entryLedger: fn() }))
        throw Error("Não foi possível salvar. Os dados foram preservados.");
      setError("");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confira os dados.");
      return false;
    }
  }
  const field = (
    label: string,
    value: string,
    set: (v: string) => void,
    inputType = "text",
  ) => (
    <FormField label={label}>
      {(p) => (
        <input
          {...p}
          value={value}
          type={inputType}
          onChange={(e) => {
            if (set === setName || set === setCardName || set === setCategory)
              onDirtyChange?.(
                !!(
                  e.target.value ||
                  (set !== setName && name) ||
                  (set !== setCardName && cardName) ||
                  (set !== setCategory && category)
                ),
              );
            set(e.target.value);
          }}
        />
      )}
    </FormField>
  );
  return (
    <section className="entry-catalog">
      <h2>Contas, cartões e categorias</h2>
      <p className="entry-hint">
        Cadastre as informações reais que você deseja usar. Os dados anteriores
        permanecem preservados.
      </p>
      <details>
        <summary>Gerenciar contas</summary>
        <div className="entry-grid">
          {field("Nome da conta", name, setName)}
          <FormField label="Tipo de conta">
            {(p) => (
              <select
                {...p}
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
              >
                <option value="bank">Conta bancária</option>
                <option value="cash">Dinheiro</option>
                <option value="savings">Poupança</option>
                <option value="credit_card">Conta de cartão</option>
              </select>
            )}
          </FormField>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (!name.trim()) {
              setError("Informe o nome da conta.");
              return;
            }
            const saved = apply(() =>
              configureAccount(l, {
                id: crypto.randomUUID(),
                name: name.trim(),
                type,
                archived: false,
              }),
            );
            if (saved) setName("");
          }}
        >
          Adicionar conta
        </Button>
        {l.accounts.map((a) => (
          <div className="catalog-row" key={a.id}>
            <strong>
              {a.name}
              {a.archived ? " · Arquivada" : ""}
            </strong>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const name = prompt("Novo nome da conta", a.name);
                if (name?.trim())
                  apply(() => configureAccount(l, { ...a, name: name.trim() }));
              }}
            >
              Renomear
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                apply(() =>
                  configureAccount(l, { ...a, archived: !a.archived }),
                )
              }
            >
              {a.archived ? "Reativar" : "Arquivar"}
            </Button>
          </div>
        ))}
      </details>
      <details>
        <summary>Gerenciar cartões</summary>
        <div className="entry-grid">
          {field("Nome do cartão", cardName, setCardName)}
          <FormField label="Conta do cartão">
            {(p) => (
              <select
                {...p}
                value={account}
                onChange={(e) => setAccount(e.target.value)}
              >
                <option value="">Selecione</option>
                {l.accounts
                  .filter((a) => a.type === "credit_card" && !a.archived)
                  .map((a) => (
                    <option value={a.id} key={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            )}
          </FormField>
          {field("Dia do fechamento", close, setClose, "number")}
          {field("Dia do vencimento", due, setDue, "number")}
          <FormField label="Compra no fechamento">
            {(p) => (
              <select
                {...p}
                value={rule}
                onChange={(e) => setRule(e.target.value as typeof rule)}
              >
                <option value="next">Próxima fatura</option>
                <option value="current">Fatura atual</option>
              </select>
            )}
          </FormField>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const saved = apply(() =>
              configureCard(l, {
                id: crypto.randomUUID(),
                name: cardName,
                accountId: account,
                closingDay: Number(close),
                dueDay: Number(due),
                onClosingDay: rule,
                archived: false,
              }),
            );
            if (saved) setCardName("");
          }}
        >
          Adicionar cartão
        </Button>
        {l.cards.map((c) => (
          <div className="catalog-row" key={c.id}>
            <strong>
              {c.name} · fechamento {c.closingDay ?? "?"} · vencimento{" "}
              {c.dueDay ?? "?"}
            </strong>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const name = prompt("Nome do cartão", c.name);
                if (!name) return;
                const closingDay = Number(
                  prompt("Dia de fechamento", String(c.closingDay ?? 10)),
                );
                const dueDay = Number(
                  prompt("Dia de vencimento", String(c.dueDay ?? 20)),
                );
                if (
                  confirm(
                    "Atualizar o cartão? As faturas históricas permanecem nas competências originais.",
                  )
                )
                  apply(() =>
                    configureCard(l, { ...c, name, closingDay, dueDay }),
                  );
              }}
            >
              Editar cartão
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                apply(() => configureCard(l, { ...c, archived: !c.archived }))
              }
            >
              {c.archived ? "Reativar" : "Arquivar"}
            </Button>
          </div>
        ))}
      </details>
      <details>
        <summary>Gerenciar categorias</summary>
        {field("Nova categoria", category, setCategory)}
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const saved = apply(() =>
              configureCategory(l, {
                id: crypto.randomUUID(),
                name: category,
                types: ["expense", "income", "card", "reimbursement"],
                archived: false,
              }),
            );
            if (saved) setCategory("");
          }}
        >
          Adicionar categoria
        </Button>
        {l.categories.map((c) => (
          <div className="catalog-row" key={c.id}>
            <strong>
              {c.name}
              {c.archived ? " · Arquivada" : ""}
            </strong>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const name = prompt("Nome da categoria", c.name);
                if (name) apply(() => configureCategory(l, { ...c, name }));
              }}
            >
              Renomear
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                apply(() =>
                  configureCategory(l, { ...c, archived: !c.archived }),
                )
              }
            >
              {c.archived ? "Reativar" : "Arquivar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const to = prompt(
                  "Reclassificar para qual categoria? Digite o nome da categoria ativa.",
                );
                const target = l.categories.find(
                  (x) => x.name === to && !x.archived,
                );
                if (
                  target &&
                  confirm(
                    "Reclassificar os registros desta categoria? Os demais dados serão preservados.",
                  )
                )
                  apply(() => reclassifyCategory(l, c.id, target.id, true));
                else if (to)
                  setError("Selecione uma categoria ativa existente.");
              }}
            >
              Reclassificar
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (
                  confirm(
                    "Excluir esta categoria? Categorias em uso serão protegidas.",
                  )
                )
                  apply(() => deleteCategory(l, c.id));
              }}
            >
              Excluir
            </Button>
          </div>
        ))}
      </details>
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </section>
  );
}
export function CategoryPicker({
  state,
  type,
  value,
  onChange,
  onCreate,
  error: fieldError,
}: {
  state: State;
  type: EntryType;
  value: string;
  onChange: (v: string) => void;
  onCreate: (s: State) => boolean;
  error?: string;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const l = state.entryLedger!;
  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
    setError("");
  };
  const choices = [
    ...(query.trim()
      ? []
      : [{ label: "Sem categoria", run: () => choose("") }]),
    ...l.categories
      .filter(
        (c) =>
          !c.archived &&
          c.types.includes(type) &&
          c.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
      )
      .map((c) => ({ label: c.name, run: () => choose(c.id) })),
  ];
  if (
    query.trim() &&
    !l.categories.some(
      (c) => c.name.toLocaleLowerCase() === query.trim().toLocaleLowerCase(),
    )
  )
    choices.push({
      label: `Criar “${query.trim()}”`,
      run: () => {
        try {
          const id = crypto.randomUUID();
          const next = configureCategory(l, {
            id,
            name: query.trim(),
            types: [type],
            archived: false,
          });
          if (!onCreate({ ...state, entryLedger: next })) throw Error();
          choose(id);
        } catch {
          setError("Não foi possível criar a categoria.");
        }
      },
    });
  if (!choices.length)
    choices.push({
      label: "Sem categorias ativas — manter sem categoria",
      run: () => choose(""),
    });
  const selected = Math.min(active, choices.length - 1);
  return (
    <div>
      <FormField
        label="Categoria (opcional)"
        name="categoryId"
        error={fieldError}
      >
        {(p) => (
          <input
            {...p}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open ? `${listId}-${selected}` : undefined}
            value={
              open
                ? query
                : (l.categories.find((c) => c.id === value)?.name ?? "")
            }
            placeholder="Pesquisar ou criar categoria"
            onFocus={() => {
              setQuery("");
              setActive(0);
              setOpen(true);
            }}
            onBlur={() => setOpen(false)}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
              }
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setOpen(true);
                setActive(
                  (selected +
                    (e.key === "ArrowDown" ? 1 : choices.length - 1)) %
                    choices.length,
                );
              }
              if (e.key === "Enter" && open) {
                e.preventDefault();
                choices[selected].run();
              }
            }}
          />
        )}
      </FormField>
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label="Categorias disponíveis"
          className="entry-category-results"
        >
          {choices.map((choice, i) => (
            <button
              key={choice.label}
              type="button"
              role="option"
              id={`${listId}-${i}`}
              aria-selected={selected === i}
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choice.run()}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
