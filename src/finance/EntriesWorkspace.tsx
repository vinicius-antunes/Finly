import { useId, useEffect } from "react";
import {
  Pencil,
  MoreHorizontal,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { money, csv, names, type Entry, type Kind } from "./model";
import { download } from "./storage";
import {
  initialFilters,
  selectEntries,
  filteredTotals,
  entrySituation,
  categoryOptions,
  type EntryFilters,
} from "./entries";
export function EntriesWorkspace({
  entries,
  period,
  filters,
  setFilters,
  onEdit,
  onDuplicate,
  onRemove,
  onToggle,
  onNew,
}: {
  entries: Entry[];
  period: string;
  filters: EntryFilters;
  setFilters: (next: EntryFilters) => void;
  onEdit: (x: Entry) => void;
  onDuplicate: (x: Entry) => void;
  onRemove: (x: Entry) => void;
  onToggle: (x: Entry) => void;
  onNew: () => void;
}) {
  useEffect(() => {
    const close = (event?: Event) =>
      document
        .querySelectorAll<HTMLDetailsElement>(".entry-menu[open]")
        .forEach((e) => {
          if (
            !event ||
            !(event.target instanceof Node) ||
            !e.contains(event.target)
          )
            e.open = false;
        });
    const dismiss = () => close();
    document.addEventListener("pointerdown", close);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, []);
  const id = useId(),
    update = (patch: Partial<EntryFilters>) =>
      setFilters({ ...filters, ...patch });
  let selected: Entry[] = [],
    error = "";
  try {
    selected = selectEntries(entries, period, filters);
  } catch (e) {
    error = e instanceof Error ? e.message : "Confira os filtros de valor.";
  }
  const totals = filteredTotals(selected),
    groups = filters.all
      ? Array.from(new Set(selected.map((x) => x.period))).sort((a, b) =>
          filters.order === "period-asc"
            ? a.localeCompare(b)
            : b.localeCompare(a),
        )
      : [period];
  const kinds: { id: Kind | "all"; label: string }[] = [
    { id: "all", label: "Todos" },
    { id: "out", label: "Despesas" },
    { id: "income", label: "Receitas" },
    { id: "credit", label: "Cartão" },
    { id: "reimbursement", label: "Reembolsos" },
  ];
  function actions(x: Entry) {
    return (
      <div className="entry-actions">
        <Button
          variant="ghost"
          onClick={() => onEdit(x)}
          aria-label={"Editar " + x.description}
        >
          <Pencil aria-hidden="true" />
          <span>Editar</span>
        </Button>
        <details
          className="entry-menu"
          onToggle={(e) => {
            if (!e.currentTarget.open) return;
            const menu =
                e.currentTarget.querySelector<HTMLElement>(":scope>div"),
              button = e.currentTarget.querySelector("summary");
            if (menu && button) {
              const r = button.getBoundingClientRect(),
                m = menu.getBoundingClientRect();
              menu.style.left =
                Math.max(
                  12,
                  Math.min(innerWidth - m.width - 12, r.right - m.width),
                ) + "px";
              menu.style.top =
                Math.max(
                  12,
                  r.bottom + m.height + 8 > innerHeight
                    ? r.top - m.height - 8
                    : r.bottom + 6,
                ) + "px";
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.currentTarget.removeAttribute("open");
              e.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary aria-label={"Mais ações de " + x.description}>
            <MoreHorizontal aria-hidden="true" />
          </summary>
          <div>
            <button
              onClick={(e) => {
                e.currentTarget.closest("details")?.removeAttribute("open");
                onToggle(x);
              }}
            >
              {entrySituation(x).action}
            </button>
            <button
              onClick={(e) => {
                e.currentTarget.closest("details")?.removeAttribute("open");
                onDuplicate(x);
              }}
            >
              Duplicar lançamento
            </button>
            <button
              onClick={(e) => {
                e.currentTarget.closest("details")?.removeAttribute("open");
                onRemove(x);
              }}
            >
              Excluir lançamento
            </button>
          </div>
        </details>
      </div>
    );
  }
  function kindLabel(x: Entry) {
    const Icon =
      x.legacyKind === "credit"
        ? CreditCard
        : x.legacyKind === "out"
          ? ArrowUpRight
          : x.legacyKind === "income"
            ? ArrowDownLeft
            : RefreshCw;
    return (
      <span className="entry-kind">
        <Icon aria-hidden="true" />
        {names[x.legacyKind]}
      </span>
    );
  }
  function description(x: Entry) {
    return (
      <>
        <strong>{x.description}</strong>
        <small>
          {x.category || "Sem categoria"} · {x.period}
          {x.part ? ` · Parcela ${x.part}/${x.parts}` : ""}
        </small>
        {x.note && <small>{x.note}</small>}
      </>
    );
  }
  function status(x: Entry) {
    return (
      <span
        className={
          "entry-status " +
          ((x.legacyKind === "credit" ? x.confirmed : x.status === "received")
            ? "done"
            : "pending")
        }
        data-kind={x.legacyKind}
      >
        {entrySituation(x).label}
      </span>
    );
  }
  const cards = [
    {
      label: "Receitas",
      value: totals.income,
      detail: `Recebidas: ${money(totals.incomeReceived)} · A receber: ${money(totals.income - totals.incomeReceived)}`,
      Icon: ArrowDownLeft,
    },
    {
      label: "Despesas fora do cartão",
      value: totals.out,
      detail: `Pagas: ${money(totals.outPaid)} · Pendentes: ${money(totals.out - totals.outPaid)}`,
      Icon: ArrowUpRight,
    },
    {
      label: "Compras no cartão",
      value: totals.credit,
      detail: "Inclui previstas e confirmadas. Pagamento da fatura é separado.",
      Icon: CreditCard,
    },
    ...(selected.some((x) => x.legacyKind === "reimbursement")
      ? [
          {
            label: "Reembolsos recebidos",
            value: totals.refundReceived,
            detail: `A receber: ${money(totals.refundPending)}`,
            Icon: RefreshCw,
          },
        ]
      : []),
  ];
  return (
    <section
      className="entries-workspace"
      aria-label="Gerenciamento de lançamentos"
    >
      <p className="entries-context" role="status">
        {selected.length} lançamentos ·{" "}
        {filters.all
          ? "Todos os meses, agrupados por competência"
          : `Competência ${period}`}{" "}
        · Indicadores dos registros filtrados, não representam saldo.
      </p>
      <div className="entries-indicators">
        {cards.map(({ label, value, detail, Icon }) => (
          <article key={label}>
            <div>
              <Icon aria-hidden="true" />
              <h2>{label}</h2>
            </div>
            <strong>{money(value)}</strong>
            <p>{detail}</p>
          </article>
        ))}
      </div>
      <div className="entries-controls">
        <label className="entries-search" htmlFor={id + "-search"}>
          Buscar lançamentos
          <input
            id={id + "-search"}
            type="search"
            placeholder="Descrição, categoria ou observação"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
          />
        </label>
        <div
          className="entries-quick"
          role="group"
          aria-label="Filtrar por tipo"
        >
          {kinds.map((k) => (
            <Button
              key={k.id}
              variant={filters.kind === k.id ? "default" : "outline"}
              aria-pressed={filters.kind === k.id}
              onClick={() => update({ kind: k.id })}
            >
              {k.label}
            </Button>
          ))}
        </div>
        <details className="entries-advanced">
          <summary>Filtros avançados</summary>
          <div className="entries-filter-grid">
            <label>
              Situação
              <select
                aria-label="Situação"
                value={filters.status}
                onChange={(e) => update({ status: e.target.value })}
              >
                {["all", "pending", "received", "forecast", "confirmed"].map(
                  (s, i) => (
                    <option value={s} key={s}>
                      {
                        [
                          "Todas",
                          "Pendentes / a receber",
                          "Pagos / recebidos",
                          "Cartão previsto",
                          "Cartão confirmado",
                        ][i]
                      }
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              Valor mínimo
              <input
                aria-label="Valor mínimo"
                inputMode="decimal"
                value={filters.min}
                onChange={(e) => update({ min: e.target.value })}
              />
            </label>
            <label>
              Valor máximo
              <input
                aria-label="Valor máximo"
                inputMode="decimal"
                value={filters.max}
                onChange={(e) => update({ max: e.target.value })}
              />
            </label>
            <label>
              Período da listagem
              <select
                aria-label="Período da listagem"
                value={filters.all ? "all" : "current"}
                onChange={(e) => update({ all: e.target.value === "all" })}
              >
                <option value="current">Competência atual</option>
                <option value="all">Todos os meses</option>
              </select>
            </label>
            <label>
              Categoria
              <select
                aria-label="Categoria"
                value={filters.category}
                onChange={(e) => update({ category: e.target.value })}
              >
                <option value="">Todas as categorias</option>
                {categoryOptions(entries).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ordenação
              <select
                aria-label="Ordenação"
                value={filters.order}
                onChange={(e) => update({ order: e.target.value })}
              >
                <option value="period-desc">Competência mais recente</option>
                <option value="period-asc">Competência mais antiga</option>
                <option value="description">Descrição A–Z</option>
                <option value="amount-asc">Menor valor</option>
                <option value="amount-desc">Maior valor</option>
              </select>
            </label>
            <Button
              variant="outline"
              onClick={() => setFilters({ ...initialFilters })}
            >
              Limpar filtros
            </Button>
          </div>
        </details>
        <details className="entries-secondary">
          <summary>Opções da lista</summary>
          <Button
            variant="ghost"
            disabled={!!error}
            onClick={() =>
              download(
                csv(selected),
                "Finly-filtrado.csv",
                "text/csv;charset=utf-8",
              )
            }
          >
            Exportar CSV
          </Button>
        </details>
      </div>
      {error && <p role="alert">{error}</p>}
      {!selected.length ? (
        <div className="empty-state">
          <h2>Nenhum lançamento encontrado</h2>
          <p>
            Cadastre uma movimentação ou ajuste os filtros para encontrar seus
            registros.
          </p>
          <Button onClick={onNew}>Novo registro</Button>
          <Button
            variant="outline"
            onClick={() => setFilters({ ...initialFilters })}
          >
            Limpar filtros
          </Button>
        </div>
      ) : (
        <>
          <div className="entries-desktop">
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Tipo / responsável</th>
                  <th>Valor</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              {groups.map((p) => (
                <tbody key={p}>
                  {filters.all && (
                    <tr className="entry-group">
                      <th colSpan={5}>
                        Competência {p} ·{" "}
                        {selected.filter((x) => x.period === p).length}{" "}
                        registros
                      </th>
                    </tr>
                  )}
                  {selected
                    .filter((x) => x.period === p)
                    .map((x) => (
                      <tr key={x.id} className="entry-row" data-entry-id={x.id}>
                        <td>{description(x)}</td>
                        <td>
                          {kindLabel(x)}
                          <small>
                            {x.legacyKind === "credit"
                              ? x.owner === "third"
                                ? "Outra pessoa"
                                : x.owner === "unknown"
                                  ? "A confirmar"
                                  : "Eu"
                              : "—"}
                          </small>
                        </td>
                        <td className="entry-value">{money(x.amountCents)}</td>
                        <td>{status(x)}</td>
                        <td>{actions(x)}</td>
                      </tr>
                    ))}
                </tbody>
              ))}
            </table>
          </div>
          <div className="entries-mobile">
            {groups.map((p) => (
              <section key={p}>
                {filters.all && <h2>Competência {p}</h2>}
                {selected
                  .filter((x) => x.period === p)
                  .map((x) => (
                    <article
                      className="entry-card"
                      key={x.id}
                      data-entry-id={x.id}
                    >
                      <div className="entry-card-head">
                        <div>{description(x)}</div>
                        <strong className="entry-value">
                          {money(x.amountCents)}
                        </strong>
                      </div>
                      <div className="entry-card-meta">
                        <span>
                          {kindLabel(x)}
                          {x.legacyKind === "credit"
                            ? ` · ${x.owner === "third" ? "Outra pessoa" : x.owner === "unknown" ? "A confirmar" : "Eu"}`
                            : ""}
                        </span>
                        {status(x)}
                      </div>
                      {actions(x)}
                    </article>
                  ))}
              </section>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
