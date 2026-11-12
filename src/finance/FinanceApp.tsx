import { BackupImport } from "./BackupImport";
import { prepareBackup } from "./backup";
import { useNavigation, destinations, tabs } from "./navigation";
import { HomeOverview } from "./HomeOverview";
import {
  lazy,
  cloneElement,
  useId,
  type ReactElement,
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  FinanceSidebar,
  type Screen,
} from "@/components/navigation/FinanceSidebar";
import { RaysBackdrop } from "@/components/visual/RaysBackdrop";
import { MagicCard as Feature } from "@/components/magicui/magic-card";
import { RefundProgress } from "@/components/analytics/RefundProgress";
import { ProgressBar } from "@/components/tremor/ProgressBar";
import { savedTheme, PREF_KEY, type Theme } from "@/theme/theme";
import { type LegacyEntry } from "@/lib/legacy";
import {
  empty,
  money,
  cents,
  names,
  kinds,
  metrics,
  generate,
  csv,
  type State,
  type Entry,
  type Settings,
  type Kind,
} from "./model";
import { load, save, download, initialize } from "./storage";
const Donut = lazy(() =>
  import("@/components/analytics/CategoryDonut").then((m) => ({
    default: m.CategoryDonut,
  })),
);
function Field({
  label,
  children,
}: {
  label: string;
  children: ReactElement<{ id?: string }>;
}) {
  const id = useId();
  return (
    <div className="finance-field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  );
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog className="finance-dialog" ref={ref} onCancel={onClose}>
      <h2>{title}</h2>
      {children}
      <Button variant="outline" onClick={onClose}>
        Cancelar
      </Button>
    </dialog>
  );
}
export function FinanceRoot() {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [recovering, setRecovering] = useState(false),
    [notice, setNotice] = useState("");
  function start() {
    try {
      setState(initialize());
      setError("");
    } catch (e) {
      setError(String(e));
    }
  }
  useEffect(() => {
    start();
  }, []);
  if (state) return <FinanceApp initial={state} initialNotice={notice} />;
  if (!error)
    return (
      <main className="finance-recovery">
        <p role="status">Carregando seus dados locais…</p>
      </main>
    );
  return (
    <main className="finance-recovery">
      <h1>Não foi possível abrir seus dados</h1>
      <p role="alert">
        {error}. Os dados existentes não foram substituídos. O Finly não iniciou
        um modo de gravação temporário.
      </p>
      <p>
        Exporte o conteúdo existente antes de tentar restaurar um backup válido.
        Se o armazenamento estiver bloqueado, habilite-o neste navegador e tente
        novamente.
      </p>
      <Button onClick={start}>Tentar novamente</Button>
      <Button
        variant="outline"
        onClick={() => {
          try {
            const current = localStorage.getItem("finly-v2");
            if (current === null)
              throw Error("Não existem dados v2 salvos para exportar.");
            download(current, "Finly-v2-recuperacao.json");
          } catch (e) {
            setError(String(e));
          }
        }}
      >
        Exportar dados v2 para recuperação
      </Button>
      <Button onClick={() => setRecovering(true)}>Importar backup JSON</Button>
      {recovering && (
        <BackupImport
          onClose={() => setRecovering(false)}
          onRestored={(next) => {
            setNotice(
              `Backup importado com sucesso. ${next.transactions.length} lançamentos restaurados.`,
            );
            setState(next);
          }}
        />
      )}
    </main>
  );
}
const settingsLabels: Record<keyof Settings, string> = {
  salary: "Salário líquido",
  reserve: "Reserva protegida",
  cushion: "Margem pessoal",
  goal: "Meta à vista",
  installmentCap: "Teto mensal de parcelas",
  dueDay: "Dia de vencimento",
  cardLabel: "Nome do cartão",
  includeExpectedRefunds: "Incluir reembolsos previstos nas projeções",
};
function EntryForm({
  entry,
  initialKind,
  period,
  onSave,
  onClose,
}: {
  entry: Entry | null;
  initialKind: Kind;
  period: string;
  onSave: (rows: Entry[]) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<Kind>(entry?.legacyKind ?? initialKind),
    [parts, setParts] = useState(1),
    [repeat, setRepeat] = useState(1),
    [amount, setAmount] = useState(
      entry ? String(entry.amountCents / 100) : "",
    ),
    [error, setError] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const f = new FormData(e.currentTarget),
        description = String(f.get("description")).trim(),
        amountCents = cents(amount);
      if (!description || !amountCents)
        throw Error("Descrição e valor positivo obrigatórios");
      const input = {
        description,
        amountCents,
        period: String(f.get("period")),
        legacyKind: kind,
        category: String(f.get("category")),
        owner: kind === "credit" ? String(f.get("owner")) : "self",
        status: kind === "credit" ? "planned" : String(f.get("status")),
        confirmed: kind === "credit" ? f.has("confirmed") : true,
        note: String(f.get("note")),
      };
      onSave(
        entry
          ? [
              {
                ...entry,
                ...input,
                accountId: kind === "credit" ? "legacy-credit" : "legacy-cash",
              },
            ]
          : generate(input, parts, repeat, f.has("refund")),
      );
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <Modal
      title={entry ? "Editar lançamento" : "Novo lançamento"}
      onClose={onClose}
    >
      <form className="finance-form" onSubmit={submit}>
        <Field label="Descrição">
          <input
            name="description"
            required
            maxLength={100}
            defaultValue={entry?.description}
          />
        </Field>
        <Field label="Tipo">
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
          >
            {kinds.map((k) => (
              <option key={k} value={k}>
                {names[k]}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label={
            kind !== "credit"
              ? "Valor (R$)"
              : parts > 1 || (entry?.parts && entry.parts > 1)
                ? "Valor por parcela (R$)"
                : "Valor da compra (R$)"
          }
        >
          <input
            required
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Competência">
          <input
            required
            name="period"
            type="month"
            defaultValue={entry?.period ?? period}
          />
        </Field>
        <Field label="Categoria">
          <input name="category" defaultValue={entry?.category ?? "Compras"} />
        </Field>
        {kind === "credit" && (
          <>
            {" "}
            <Field label="Responsável">
              <select name="owner" defaultValue={entry?.owner ?? "self"}>
                <option value="self">Eu</option>
                <option value="third">Outra pessoa</option>
                <option value="unknown">A confirmar</option>
              </select>
            </Field>
          </>
        )}
        {kind !== "credit" && (
          <>
            {" "}
            <Field label="Situação">
              <select name="status" defaultValue={entry?.status ?? "planned"}>
                <option value="planned">Pendente / previsto</option>
                <option value="received">Pago / recebido</option>
              </select>
            </Field>
          </>
        )}{" "}
        {kind === "credit" && (
          <>
            <label>
              <input
                name="confirmed"
                type="checkbox"
                defaultChecked={entry?.confirmed ?? true}
              />{" "}
              Compra confirmada
            </label>
            {!entry && (
              <>
                <Field label="Parcelas">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={parts}
                    onChange={(e) => {
                      setParts(Number(e.target.value));
                      setRepeat(1);
                    }}
                  />
                </Field>
                <Field label="Ocorrências mensais (previsões após a primeira)">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={repeat}
                    onChange={(e) => {
                      setRepeat(Number(e.target.value));
                      setParts(1);
                    }}
                  />
                </Field>
                <label>
                  <input name="refund" type="checkbox" defaultChecked /> Gerar
                  reembolsos se responsável for outra pessoa
                </label>
                <p role="status">
                  {parts} parcelas × valor informado. Total:{" "}
                  {(() => {
                    try {
                      return money(cents(amount) * parts);
                    } catch {
                      return "—";
                    }
                  })()}
                </p>
              </>
            )}
          </>
        )}
        <Field label="Observação">
          <textarea name="note" maxLength={400} defaultValue={entry?.note} />
        </Field>
        {entry && (
          <p>A edição modifica somente este registro e preserva o ID/grupo.</p>
        )}
        {error && <p role="alert">{error}</p>}
        <Button type="submit">Salvar lançamento</Button>
      </form>
    </Modal>
  );
}
export function FinanceApp({
  initial,
  initialNotice = "",
}: {
  initial: State;
  initialNotice?: string;
}) {
  const [s, setS] = useState(initial),
    [theme, setTheme] = useState<Theme>(savedTheme),
    [effects, setEffects] = useState(true),
    [error, setError] = useState(""),
    [editing, setEditing] = useState<Entry | null | undefined>(undefined),
    [importing, setImporting] = useState(false),
    [notifications, setNotifications] = useState(false);
  const {
    screen,
    period,
    tab: settingsTab,
    setScreen,
    setPeriod,
    setTab,
  } = useNavigation();
  const [newKind, setNewKind] = useState<Kind>("credit");
  useEffect(() => {
    setEditing(undefined);
    setImporting(false);
    setNotifications(false);
    document.title =
      destinations.find((d) => d.id === screen)!.label + " — Finly";
    document
      .querySelector<HTMLElement>(".heading h1")
      ?.focus({ preventScroll: true });
  }, [screen]);
  const [notice, setNotice] = useState(initialNotice),
    [legacyImport, setLegacyImport] = useState<string | undefined>();
  const [initialRaw] = useState(() => {
    try {
      return localStorage.getItem("finly-v2");
    } catch {
      return null;
    }
  });
  const raw = useRef(initialRaw);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme =
      theme === "light" ? "light" : "dark";
    try {
      localStorage.setItem(PREF_KEY, theme);
    } catch {
      setError("Não foi possível salvar o tema");
    }
  }, [theme]);
  useEffect(() => {
    function changed(e: StorageEvent) {
      if (e.key === "finly-v2") {
        try {
          const next = load();
          if (!next) throw Error("Dados removidos em outra aba");
          raw.current = e.newValue;
          setS(next);
          setEditing(undefined);
        } catch (e) {
          setError(String(e));
        }
      }
    }
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, []);
  function commit(next: State) {
    try {
      next = { ...next, revision: s.revision + 1 };
      raw.current = save(next, raw.current);
      setS(next);
      setError("");
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    }
  }
  function remove(x: Entry) {
    if (confirm("Excluir " + x.description + "?"))
      commit({
        ...s,
        transactions: s.transactions.filter((e) => e.id !== x.id),
      });
  }
  function toggle(x: Entry) {
    commit({
      ...s,
      transactions: s.transactions.map((e) =>
        e.id === x.id
          ? { ...e, status: e.status === "received" ? "planned" : "received" }
          : e,
      ),
    });
  }
  const m = metrics(s, period),
    entries = s.transactions.filter((x) => x.period === period),
    legacy: LegacyEntry[] = entries.map((x) => ({
      id: x.id,
      description: x.description,
      amount: x.amountCents / 100,
      month: x.period,
      kind: x.legacyKind,
      category: x.category,
      status: x.status,
      confirmed: x.confirmed,
    }));
  const [query, setQuery] = useState(""),
    [type, setType] = useState("all"),
    [status, setStatus] = useState("all"),
    [all, setAll] = useState(false),
    [min, setMin] = useState(""),
    [max, setMax] = useState(""),
    [price, setPrice] = useState("1200"),
    [simParts, setSimParts] = useState(12);
  let filtered: Entry[] = [];
  try {
    filtered = (all ? s.transactions : entries)
      .filter(
        (x) =>
          (type === "all" || x.legacyKind === type) &&
          (status === "all" ||
            (status === "forecast"
              ? !x.confirmed
              : status === "received"
                ? x.legacyKind !== "credit" && x.status === "received"
                : x.legacyKind === "credit"
                  ? x.confirmed
                  : x.status !== "received")) &&
          (!min || x.amountCents >= cents(min)) &&
          (!max || x.amountCents <= cents(max)) &&
          (x.description + " " + x.category + " " + x.note)
            .toLocaleLowerCase("pt-BR")
            .includes(query.toLocaleLowerCase("pt-BR")),
      )
      .sort(
        (a, b) =>
          b.period.localeCompare(a.period) ||
          a.description.localeCompare(b.description),
      );
  } catch {
    /* Invalid filter remains visible without changing data. */
  }
  const alerts = [
    ...(m.invoice && s.invoiceStatuses[period] !== "paid"
      ? [
          {
            id: "invoice:" + period,
            text: "Fatura para conferir — " + money(m.invoice),
          },
        ]
      : []),
    ...entries
      .filter(
        (x) =>
          (x.legacyKind === "reimbursement" && x.status !== "received") ||
          (x.legacyKind === "credit" && !x.confirmed),
      )
      .map((x) => ({
        id: x.id,
        text:
          (x.legacyKind === "reimbursement"
            ? "Reembolso a receber: "
            : "Compra prevista: ") + x.description,
      })),
    ...s.pending.map((x) => ({
      id: x.id,
      text: "Competência a confirmar: " + x.description,
    })),
  ];
  const title = Object.fromEntries(
    destinations.map((d) => [d.id, d.label]),
  ) as Record<Screen, string>;
  function rows(es: Entry[]) {
    return (
      <div className="table-scroll">
        <table className="entries-table">
          <thead>
            <tr>
              <th>Descrição / competência</th>
              <th>Tipo / responsável</th>
              <th>Valor</th>
              <th>Situação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {es.map((x) => (
              <tr key={x.id}>
                <td>
                  <strong>{x.description}</strong>
                  <small>
                    {x.period} · {x.category}{" "}
                    {x.part ? `· ${x.part}/${x.parts}` : ""}
                  </small>
                  <small>{x.note}</small>
                </td>
                <td>
                  {names[x.legacyKind]} ·{" "}
                  {x.owner === "third"
                    ? "Outra pessoa"
                    : x.owner === "unknown"
                      ? "A confirmar"
                      : "Eu"}
                </td>
                <td>{money(x.amountCents)}</td>
                <td>
                  {!x.confirmed
                    ? "Previsão"
                    : x.status === "received"
                      ? "Pago / recebido"
                      : "Registrado / pendente"}
                </td>
                <td>
                  <div
                    className="finance-actions"
                    aria-label={"Ações de " + x.description}
                  >
                    <Button variant="outline" onClick={() => setEditing(x)}>
                      Editar
                    </Button>
                    <Button variant="outline" onClick={() => remove(x)}>
                      Excluir
                    </Button>
                    {x.legacyKind !== "credit" && (
                      <Button variant="outline" onClick={() => toggle(x)}>
                        {x.status === "received"
                          ? x.legacyKind === "out"
                            ? "Marcar pendente"
                            : "Desfazer recebimento"
                          : x.legacyKind === "out"
                            ? "Marcar pago"
                            : "Marcar recebido"}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!es.length && (
          <div className="empty-state">
            <p>
              Nenhum registro nesta lista. Ajuste os filtros ou cadastre seu
              primeiro lançamento.
            </p>
            <Button
              onClick={() => {
                setNewKind(screen === "refunds" ? "reimbursement" : "credit");
                setEditing(null);
              }}
            >
              Adicionar lançamento
            </Button>
          </div>
        )}
      </div>
    );
  }
  return (
    <SidebarProvider className="finly-shell finance-app">
      <RaysBackdrop theme={theme} enabled={effects} />
      <FinanceSidebar screen={screen} onNavigate={setScreen} period={period} />
      <div className="content">
        <header className="workspace-top">
          <SidebarTrigger className="finance-sidebar-trigger" />
          <span className="breadcrumbs">FINLY / {title[screen]}</span>
          <span className="home-local-status">
            <i /> Armazenamento local
          </span>
          <Button variant="outline" onClick={() => setNotifications(true)}>
            Notificações (
            {alerts.filter((a) => !s.notificationReads[a.id]).length})
          </Button>
        </header>
        <main>
          <div className="heading home-heading">
            <div>
              <p className="eyebrow">SEU ESPAÇO FINANCEIRO · LOCAL</p>
              <h1 tabIndex={-1}>{title[screen]}</h1>
              <p className="muted home-subtitle">
                {screen === "overview"
                  ? "Faturas, reembolsos e metas em um só lugar."
                  : "Organize seus registros e referências financeiras."}
              </p>
            </div>
            <div className="home-header-actions">
              {" "}
              <div className="finance-actions home-toolbar">
                <Field label="Competência">
                  <input
                    type="month"
                    value={period}
                    onChange={(e) => {
                      if (e.target.value) setPeriod(e.target.value);
                    }}
                  />
                </Field>
              </div>
              <div className="quick-entry">
                <Button
                  onClick={() => {
                    setNewKind("credit");
                    setEditing(null);
                  }}
                >
                  Novo lançamento
                </Button>
                <Field label="Criar por tipo">
                  <select
                    value=""
                    onChange={(e) => {
                      setNewKind(e.target.value as Kind);
                      setEditing(null);
                    }}
                  >
                    <option value="" disabled>
                      Escolher tipo…
                    </option>
                    {kinds.map((k) => (
                      <option key={k} value={k}>
                        {names[k]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </div>
          {error && (
            <p role="alert" className="warning-banner">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="backup-success">
              {notice}
            </p>
          )}
          {screen === "overview" && (
            <HomeOverview
              state={s}
              period={period}
              onEntries={() => setScreen("entries")}
              onSettings={() => {
                setScreen("settings");
                setTab("financeiro");
              }}
              onInvoicePage={() => setScreen("invoice")}
              onRefunds={() => setScreen("refunds")}
              onPlanning={() => setScreen("installments")}
              onToggle={toggle}
              onInvoice={(status) =>
                commit({
                  ...s,
                  invoiceStatuses: { ...s.invoiceStatuses, [period]: status },
                })
              }
              analytics={
                <div className="analytics-grid">
                  <Suspense fallback={<p>Carregando distribuição…</p>}>
                    <Donut entries={legacy} />
                  </Suspense>
                  <RefundProgress entries={legacy} />
                </div>
              }
            />
          )}
          {screen === "entries" && (
            <section className="table-card">
              <div className="finance-form">
                <Field label="Buscar descrição, categoria ou observação">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </Field>
                <Field label="Filtrar tipo">
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="all">Todos</option>
                    {kinds.map((k) => (
                      <option key={k} value={k}>
                        {names[k]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Filtrar situação">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {["all", "received", "pending", "forecast"].map((v, i) => (
                      <option key={v} value={v}>
                        {
                          [
                            "Todas",
                            "Pago / recebido",
                            "Registrado / pendente",
                            "Previsão",
                          ][i]
                        }
                      </option>
                    ))}
                  </select>
                </Field>
                <label>
                  <input
                    type="checkbox"
                    checked={all}
                    onChange={(e) => setAll(e.target.checked)}
                  />{" "}
                  Todos os meses
                </label>
                <Field label="Valor mínimo">
                  <input value={min} onChange={(e) => setMin(e.target.value)} />
                </Field>
                <Field label="Valor máximo">
                  <input value={max} onChange={(e) => setMax(e.target.value)} />
                </Field>
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setType("all");
                    setStatus("all");
                    setMin("");
                    setMax("");
                    setAll(false);
                  }}
                >
                  Limpar filtros
                </Button>
                <Button
                  onClick={() =>
                    download(
                      csv(filtered),
                      "Finly-filtrado.csv",
                      "text/csv;charset=utf-8",
                    )
                  }
                >
                  Exportar CSV filtrado
                </Button>
              </div>
              <p>
                {filtered.length} registros · soma descritiva{" "}
                {money(filtered.reduce((n, x) => n + x.amountCents, 0))}, não é
                saldo.
              </p>
              {rows(filtered)}
            </section>
          )}
          {screen === "invoice" && (
            <>
              {" "}
              <section className="category-panel">
                <h2>
                  {s.settings.cardLabel} · fatura de {period}
                </h2>
                <p>
                  Vencimento estimado dia {s.settings.dueDay} · total{" "}
                  {money(m.invoice)}
                </p>
                <Field label="Status da fatura">
                  <select
                    value={s.invoiceStatuses[period] ?? "unknown"}
                    onChange={(e) =>
                      commit({
                        ...s,
                        invoiceStatuses: {
                          ...s.invoiceStatuses,
                          [period]: e.target.value,
                        },
                      })
                    }
                  >
                    <option value="unknown">A confirmar</option>
                    <option value="unpaid">Em aberto</option>
                    <option value="paid">Paga</option>
                  </select>
                </Field>
                <p>Marcar paga não cria outra despesa.</p>
                <strong className="invoice-total">{money(m.invoice)}</strong>
                {rows(entries.filter((x) => x.legacyKind === "credit"))}
              </section>
            </>
          )}
          {screen === "installments" && (
            <>
              {" "}
              <section className="category-panel">
                <h2>Grupos de parcelas e recorrências</h2>
                {!s.transactions.some(
                  (x) => x.legacyKind === "credit" && x.groupId,
                ) && (
                  <div className="empty-state">
                    <p>
                      Você ainda não cadastrou grupos. Crie uma compra parcelada
                      ou ocorrências mensais previstas.
                    </p>
                    <Button
                      onClick={() => {
                        setNewKind("credit");
                        setEditing(null);
                      }}
                    >
                      Cadastrar compra parcelada
                    </Button>
                  </div>
                )}
                {Array.from(
                  new Set(
                    s.transactions
                      .filter((x) => x.legacyKind === "credit" && x.groupId)
                      .map((x) => x.groupId!),
                  ),
                ).map((id) => {
                  const es = s.transactions.filter((x) => x.groupId === id);
                  return (
                    <article key={id}>
                      <h3>{es[0].description}</h3>
                      <p>
                        {es.filter((x) => x.legacyKind === "credit").length}{" "}
                        compras registradas ·{" "}
                        {money(
                          es
                            .filter((x) => x.legacyKind === "credit")
                            .reduce((n, x) => n + x.amountCents, 0),
                        )}
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (
                            confirm(
                              "Excluir todo o grupo, incluindo reembolsos vinculados?",
                            )
                          )
                            commit({
                              ...s,
                              transactions: s.transactions.filter(
                                (x) => x.groupId !== id,
                              ),
                            });
                        }}
                      >
                        Excluir grupo
                      </Button>
                      <p className="muted">
                        Competências:{" "}
                        {Array.from(new Set(es.map((x) => x.period)))
                          .sort()
                          .join(" · ")}
                        . Reembolsos vinculados:{" "}
                        {
                          es.filter((x) => x.legacyKind === "reimbursement")
                            .length
                        }
                        .
                      </p>
                      {rows(es)}
                    </article>
                  );
                })}
              </section>
            </>
          )}
          {screen === "refunds" && (
            <>
              {" "}
              <section className="category-panel">
                <h2>
                  Reembolsos · total a receber{" "}
                  {money(
                    s.transactions
                      .filter(
                        (x) =>
                          x.legacyKind === "reimbursement" &&
                          x.status !== "received",
                      )
                      .reduce((n, x) => n + x.amountCents, 0),
                  )}
                </h2>
                <p>
                  Recebidos:{" "}
                  {money(
                    s.transactions
                      .filter(
                        (x) =>
                          x.legacyKind === "reimbursement" &&
                          x.status === "received",
                      )
                      .reduce((n, x) => n + x.amountCents, 0),
                  )}
                </p>
                <h3>Pendentes</h3>
                {rows(
                  s.transactions.filter(
                    (x) =>
                      x.legacyKind === "reimbursement" &&
                      x.status !== "received",
                  ),
                )}
                <h3>Recebidos</h3>
                {rows(
                  s.transactions.filter(
                    (x) =>
                      x.legacyKind === "reimbursement" &&
                      x.status === "received",
                  ),
                )}
              </section>
            </>
          )}{" "}
          {screen === "planning" && (
            <div className="feature-grid">
              <Feature
                className="feature-card magic-feature"
                appearance={theme}
              >
                <h2>Compra à vista</h2>
                <Button variant="outline" onClick={() => setScreen("settings")}>
                  Ajustar meta e referências
                </Button>
                <p>
                  Reserva protegida: {money(s.settings.reserve)}. Sobra
                  projetada: {money(m.available)}.
                </p>
                <p>
                  Meta: {money(s.settings.goal)} · falta{" "}
                  {money(
                    Math.max(0, s.settings.goal - Math.max(0, m.available)),
                  )}
                </p>
                <ProgressBar
                  value={
                    s.settings.goal
                      ? Math.min(
                          100,
                          (Math.max(0, m.available) / s.settings.goal) * 100,
                        )
                      : 0
                  }
                />
                <p>Projeção mensal, não dinheiro guardado.</p>
              </Feature>
              <Feature
                className="feature-card magic-feature"
                appearance={theme}
              >
                <h2>Simulador sem juros</h2>
                <Field label="Preço total no cartão">
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </Field>
                <Field label="Número de parcelas">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={simParts}
                    onChange={(e) => setSimParts(Number(e.target.value))}
                  />
                </Field>
                <p>
                  {(() => {
                    try {
                      if (
                        !Number.isInteger(simParts) ||
                        simParts < 1 ||
                        simParts > 120
                      )
                        throw Error();
                      const per = Math.round(cents(price) / simParts);
                      return `${money(per)} por mês · ${per <= s.settings.installmentCap ? "Dentro do teto" : "Acima do teto"} de ${money(s.settings.installmentCap)}. Total: ${money(cents(price))}.`;
                    } catch {
                      return "Informe valores válidos";
                    }
                  })()}
                </p>
                <p>
                  Estimativa arredondada; não cria compras e não usa a reserva.
                </p>
              </Feature>
            </div>
          )}
          {screen === "settings" && (
            <>
              <div
                role="tablist"
                aria-label="Seções de Configurações"
                className="settings-tabs"
              >
                {tabs.map((t, i) => (
                  <Button
                    key={t}
                    role="tab"
                    tabIndex={settingsTab === t ? 0 : -1}
                    id={"tab-" + t}
                    aria-controls={"panel-" + t}
                    aria-selected={settingsTab === t}
                    variant={settingsTab === t ? "default" : "outline"}
                    onClick={() => setTab(t)}
                    onKeyDown={(e) => {
                      if (
                        ["ArrowRight", "ArrowLeft", "Home", "End"].includes(
                          e.key,
                        )
                      ) {
                        e.preventDefault();
                        const index =
                          e.key === "Home"
                            ? 0
                            : e.key === "End"
                              ? 3
                              : (i + (e.key === "ArrowRight" ? 1 : 3)) % 4;
                        setTab(tabs[index]);
                        document.getElementById("tab-" + tabs[index])?.focus();
                      }
                    }}
                  >
                    {["Financeiro", "Aparência", "Backup", "Sobre"][i]}
                  </Button>
                ))}
              </div>
              <div
                role="tabpanel"
                id={"panel-" + settingsTab}
                aria-labelledby={"tab-" + settingsTab}
              >
                {settingsTab === "aparencia" && (
                  <>
                    {" "}
                    <section aria-label="Aparência">
                      <h2>Aparência</h2>{" "}
                      <div className="theme-panel">
                        <span>APARÊNCIA</span>
                        {(["graphite", "dark", "light"] as Theme[]).map(
                          (t, i) => (
                            <Button
                              key={t}
                              variant="ghost"
                              className={t === theme ? "theme-active" : ""}
                              aria-pressed={t === theme}
                              onClick={() => setTheme(t)}
                            >
                              {["Graphite Green", "Escuro Padrão", "Claro"][i]}
                            </Button>
                          ),
                        )}
                        <label>
                          <input
                            type="checkbox"
                            checked={effects}
                            onChange={(e) => setEffects(e.target.checked)}
                          />{" "}
                          Efeitos de luz
                        </label>
                      </div>
                    </section>
                  </>
                )}
                {settingsTab === "financeiro" && (
                  <>
                    {" "}
                    <section className="category-panel">
                      <h2>Referências financeiras</h2>
                      <form
                        className="finance-form"
                        key={s.revision}
                        onSubmit={(e) => {
                          e.preventDefault();
                          try {
                            const f = new FormData(e.currentTarget),
                              next = { ...s.settings };
                            for (const k of [
                              "salary",
                              "reserve",
                              "cushion",
                              "goal",
                              "installmentCap",
                            ] as const)
                              next[k] = cents(f.get(k));
                            if (next.goal <= 0 || next.installmentCap <= 0)
                              throw Error(
                                "Meta e teto de parcelas devem ser maiores que zero.",
                              );
                            next.dueDay = Number(f.get("dueDay"));
                            next.cardLabel = String(f.get("cardLabel")).trim();
                            next.includeExpectedRefunds = f.has(
                              "includeExpectedRefunds",
                            );
                            commit({ ...s, settings: next });
                          } catch (e) {
                            setError(String(e));
                          }
                        }}
                      >
                        {Object.entries(settingsLabels).map(([key, label]) => (
                          <Field key={key} label={label}>
                            {key === "includeExpectedRefunds" ? (
                              <input
                                name={key}
                                type="checkbox"
                                defaultChecked={
                                  s.settings.includeExpectedRefunds
                                }
                              />
                            ) : (
                              <input
                                required
                                name={key}
                                defaultValue={
                                  key === "cardLabel"
                                    ? s.settings.cardLabel
                                    : key === "dueDay"
                                      ? s.settings.dueDay
                                      : String(
                                          (s.settings[
                                            key as keyof Settings
                                          ] as number) / 100,
                                        )
                                }
                                inputMode={
                                  key === "cardLabel" ? "text" : "decimal"
                                }
                              />
                            )}
                          </Field>
                        ))}
                        <Button type="submit">Salvar ajustes</Button>
                      </form>
                    </section>
                  </>
                )}
                {settingsTab === "backup" && (
                  <>
                    {" "}
                    <section className="category-panel finance-stack">
                      <h2>Backup e importação</h2>
                      <p>
                        Exporte antes de substituir ou limpar. O JSON contém
                        seus dados privados; não publique. Outro domínio exige
                        importação manual.
                      </p>
                      <section className="backup-settings-group">
                        <h3>Salvar meus dados</h3>
                        <p>
                          Guarde uma cópia privada para recuperar seus registros
                          depois.
                        </p>
                        <div className="finance-actions">
                          <Button
                            onClick={() =>
                              download(
                                JSON.stringify(s, null, 2),
                                "Finly-v2-backup.json",
                              )
                            }
                          >
                            Exportar backup JSON
                          </Button>

                          <Button
                            onClick={() =>
                              download(
                                csv(s.transactions),
                                "Finly-lancamentos.csv",
                                "text/csv;charset=utf-8",
                              )
                            }
                          >
                            Exportar lançamentos CSV
                          </Button>
                          <Button onClick={() => window.print()}>
                            Imprimir
                          </Button>
                        </div>
                      </section>
                      <section className="backup-settings-group">
                        <h3>Recuperar meus dados</h3>
                        <p>
                          Restaure lançamentos e configurações de um backup
                          Finly. A substituição só acontece após sua
                          confirmação.
                        </p>
                        <Button
                          onClick={() => {
                            setLegacyImport(undefined);
                            setImporting(true);
                          }}
                        >
                          Importar backup JSON
                        </Button>
                        <LegacyBackupOption
                          onSelect={(raw) => {
                            setLegacyImport(raw);
                            setImporting(true);
                          }}
                        />
                      </section>
                      <div className="danger-zone">
                        <h3>Zona de cuidado</h3>
                        <p>Exporte um backup antes de limpar seus dados.</p>
                        <div className="finance-actions">
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (
                                confirm(
                                  "Exporte um backup antes. Limpar TODOS os dados v2? O legado permanecerá intacto.",
                                )
                              )
                                commit(empty());
                            }}
                          >
                            Limpar dados v2
                          </Button>
                        </div>
                      </div>
                    </section>
                  </>
                )}
                {settingsTab === "sobre" && (
                  <section className="category-panel">
                    <h2>Sobre o Finly</h2>
                    <p>
                      Finanças pessoais com armazenamento local. Os dados ficam
                      neste navegador; não há sincronização automática.
                    </p>
                    <p>
                      Um cartão de referência, parcelas, recorrências previstas
                      e reembolsos. Múltiplos cartões e assinaturas avançadas
                      continuam planejados.
                    </p>
                  </section>
                )}
              </div>
            </>
          )}{" "}
          {(screen === "overview" || screen === "invoice") &&
            s.pending.length > 0 && (
              <section className="category-panel">
                <h2>Pendências sem competência (fora da fatura)</h2>
                {s.pending.map((x) => (
                  <PendingRow
                    key={x.id}
                    x={x}
                    period={period}
                    assign={(p) => {
                      if (
                        confirm(
                          "Conferiu a fatura e verificou que não é duplicata?",
                        )
                      ) {
                        const row = generate({
                          description: x.description,
                          amountCents: x.amountCents,
                          period: p,
                          legacyKind: "credit",
                          category: "Assinatura",
                          owner: "self",
                          status: "planned",
                          confirmed: true,
                          note: x.note ?? "",
                        });
                        commit({
                          ...s,
                          transactions: [...s.transactions, ...row],
                          pending: s.pending.filter((a) => a.id !== x.id),
                        });
                      }
                    }}
                    discard={() => {
                      if (confirm("Descartar esta pendência?"))
                        commit({
                          ...s,
                          pending: s.pending.filter((a) => a.id !== x.id),
                        });
                    }}
                  />
                ))}
              </section>
            )}
          {screen === "overview" && (
            <section className="home-panel">
              <p className="eyebrow">UM PASSO DE CADA VEZ</p>
              <h2>Espaço para os seus próximos planos</h2>
              <p className="muted">
                Compare sua meta à vista e uma compra parcelada sem usar a
                reserva protegida.
              </p>
              <Button variant="outline" onClick={() => setScreen("planning")}>
                Planejamento atual →
              </Button>
            </section>
          )}
          {editing !== undefined && (
            <EntryForm
              entry={editing}
              initialKind={newKind}
              period={period}
              onClose={() => setEditing(undefined)}
              onSave={(rows) => {
                const next = editing
                  ? s.transactions.map((x) =>
                      x.id === editing.id ? rows[0] : x,
                    )
                  : [...s.transactions, ...rows];
                if (commit({ ...s, transactions: next })) {
                  setEditing(undefined);
                  setAll(true);
                  setQuery("");
                  setType("all");
                  setStatus("all");
                  setMin("");
                  setMax("");
                  setScreen("entries");
                } else
                  throw Error(
                    "Não foi possível salvar. Confira o armazenamento ou atualize os dados de outra aba.",
                  );
              }}
            />
          )}
          {importing && (
            <BackupImport
              legacyRaw={legacyImport}
              onClose={() => setImporting(false)}
              onRestored={(next, serialized) => {
                raw.current = serialized;
                setS(next);
                setImporting(false);
                setNotice(
                  `Backup importado com sucesso. ${next.transactions.length} lançamentos restaurados.`,
                );
              }}
            />
          )}
          {notifications && (
            <Modal
              title="Notificações locais"
              onClose={() => setNotifications(false)}
            >
              {alerts.map((a) => (
                <article key={a.id}>
                  <p>{a.text}</p>
                  <Button
                    disabled={s.notificationReads[a.id]}
                    onClick={() =>
                      commit({
                        ...s,
                        notificationReads: {
                          ...s.notificationReads,
                          [a.id]: true,
                        },
                      })
                    }
                  >
                    {s.notificationReads[a.id] ? "Lida" : "Marcar como lida"}
                  </Button>
                </article>
              ))}
              {!alerts.length && <p>Nenhum aviso para este período.</p>}
            </Modal>
          )}
        </main>
      </div>
    </SidebarProvider>
  );
}
function PendingRow({
  x,
  period,
  assign,
  discard,
}: {
  x: State["pending"][number];
  period: string;
  assign: (p: string) => void;
  discard: () => void;
}) {
  const [p, setP] = useState(period);
  return (
    <article className="finance-actions">
      <p>
        {x.description} · {money(x.amountCents)} · {x.chargedAt} · {x.note}
      </p>
      <input
        aria-label={"Competência de " + x.description}
        type="month"
        value={p}
        onChange={(e) => setP(e.target.value)}
      />
      <Button onClick={() => assign(p)}>Atribuir à fatura</Button>
      <Button variant="outline" onClick={discard}>
        Descartar
      </Button>
    </article>
  );
}

function LegacyBackupOption({ onSelect }: { onSelect: (raw: string) => void }) {
  const [raw, setRaw] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    try {
      const original = localStorage.getItem("saldoclaro-v1");
      if (
        original &&
        JSON.parse(original.replace(/^\uFEFF/, ""))?.version === 1
      )
        void prepareBackup(original)
          .then(() => {
            if (active) setRaw(original);
          })
          .catch(() => {});
    } catch {}
    return () => {
      active = false;
    };
  }, []);
  return raw ? (
    <details className="backup-advanced">
      <summary>Recuperação avançada</summary>
      <p>
        Há dados antigos compatíveis neste navegador. Eles não serão alterados
        nem apagados.
      </p>
      <Button variant="outline" onClick={() => onSelect(raw)}>
        Recuperar dados antigos deste navegador
      </Button>
    </details>
  ) : null;
}
