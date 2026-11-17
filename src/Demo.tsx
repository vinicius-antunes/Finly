import * as Dialog from "@radix-ui/react-dialog";
import {
  lazy,
  Suspense,
  useState,
  Component,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  Wallet,
  ArrowUpRight,
  Plus,
  ChevronDown,
  ChevronRight,
  Home,
  Rows3,
  CreditCard,
  Target,
  CalendarDays,
  Settings,
  Repeat,
  Coins,
  ArrowLeftRight,
  PanelLeft,
  Gamepad2,
  Plane,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Card } from "./components/ui/card";
import { MagicCard } from "./vendor/magicui/magic-card";
import { DotPattern } from "./vendor/magicui/dot-pattern";
import { GridPattern } from "./vendor/magicui/grid-pattern";
import { cssVars, resolve, type Tokens, type Design } from "./model";
const Charts = lazy(() => import("./Charts"));
export class Boundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <p role="alert">
        Demonstração indisponível. As configurações foram preservadas.
      </p>
    ) : (
      this.props.children
    );
  }
}
export function Surface({
  design,
  children,
  category = "",
  id = "",
  className = "",
}: {
  design: Design;
  children: ReactNode;
  category?: string;
  id?: string;
  className?: string;
}) {
  const t = resolve(design, category, id);
  const light =
    String(t.primary).match(/^#[0-9a-f]{6}$/i) &&
    parseInt(String(t.primary).slice(1, 3), 16) < 100;
  return (
    <div
      data-motion={t.motion} className={"design-surface " + className}
      data-design-id={id}
      style={
        {
          ...cssVars(t),
          "--on-primary": light ? "#ffffff" : "#102014",
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
export function Background({ tokens: t }: { tokens: Tokens }) {
  return (
    <div
      className="demo-backdrop"
      aria-hidden
      style={{
        opacity: Number(t.intensity),
        filter: `blur(${t.blur}px)`,
        background:
          t.backgroundKind === "gradient"
            ? `linear-gradient(${t.direction}deg,transparent,${t.glow},transparent)`
            : undefined,
        backgroundPosition: `${t.effectX}% ${t.effectY}%`,
        animation:
          t.motion === "on" && t.backgroundKind === "gradient"
            ? `drift ${t.speed}s ease-in-out infinite alternate`
            : undefined,
      }}
    >
      {t.backgroundKind === "dots" && (
        <DotPattern
          width={Number(t.effectSize)}
          height={Number(t.effectSize)}
          glow={false}
          className="pattern"
        />
      )}
      {t.backgroundKind === "grid" && (
        <GridPattern
          width={Number(t.effectSize)}
          height={Number(t.effectSize)}
          className="pattern"
        />
      )}
    </div>
  );
}
export function Demo({
  component,
  tokens: t,
}: {
  component: string;
  tokens: Tokens;
}) {
  const [message, setMessage] = useState(""),
    [open, setOpen] = useState(false);
  if (component.startsWith("chart-"))
    return (
      <Suspense fallback={<div className="skeleton">Carregando gráfico…</div>}>
        <Charts kind={component.slice(6)} tokens={t} />
      </Suspense>
    );
  if (component === "dot-pattern" || component === "grid-pattern")
    return (
      <div className="pattern-demo">
        {component === "dot-pattern" ? (
          <DotPattern
            width={Number(t.effectSize)}
            height={Number(t.effectSize)}
            glow={
              t.motion === "on" &&
              !matchMedia("(prefers-reduced-motion:reduce)").matches
            }
          />
        ) : (
          <GridPattern />
        )}
        <span>Uma camada, infinitas possibilidades.</span>
      </div>
    );
  if (component === "button")
    return (
      <div className="button-demo">
        <Button onClick={() => setMessage("Ação demonstrativa executada.")}>
          <Plus size={16} />
          Criar projeto
        </Button>
        <Button variant="outline" onClick={() => setOpen(!open)}>
          Opções <ChevronDown size={16} />
        </Button>
        {open && (
          <div className="demo-dropdown">
            <button
              onClick={() => {
                setMessage("Variante selecionada.");
                setOpen(false);
              }}
            >
              Selecionar variante
            </button>
          </div>
        )}
        {message && <p role="status">{message}</p>}
      </div>
    );
  if (component === "input")
    return (
      <form
        className="demo-form"
        onSubmit={(e) => {
          e.preventDefault();
          setMessage(
            "Campos validados. Nenhuma informação financeira foi salva.",
          );
        }}
      >
        <label>
          Nome do projeto
          <Input placeholder="Minha próxima interface" required />
        </label>
        <label>
          Categoria
          <select required>
            <option value="">Selecione</option>
            <option>Design system</option>
            <option>Dashboard</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" required />
          Conferi a composição visual
        </label>
        <Button>Validar formulário</Button>
        <p role="status">{message}</p>
      </form>
    );
  const body = (
    <div
      className={
        "money-card " + (t.cardLayout === "horizontal" ? "horizontal" : "")
      }
    >
      <div className="money-heading">
        <span>Saldo disponível</span>
        {t.iconKind === "plane" ? (
          <Plane />
        ) : t.iconKind === "game" ? (
          <Gamepad2 />
        ) : (
          <Wallet />
        )}
      </div>
      <strong className="value">R$ 12.480,00</strong>
      <p
        className="positive"
        style={
          {
            "--positive": Number(t.variation) < 0 ? t.negative : t.positive,
          } as CSSProperties
        }
      >
        <ArrowUpRight size={14} />
        {t.variation}% <span>em relação ao mês anterior</span>
      </p>
      <div className="progress">
        <span style={{ width: t.progress + "%" }} />
      </div>
      <small>Composição demonstrativa · dados fictícios</small>
    </div>
  );
  return component === "magic-card" && t.motion==='on'&&!matchMedia('(prefers-reduced-motion:reduce)').matches ? (
    <MagicCard
      gradientColor={String(t.glow)}
      gradientFrom={String(t.primary)}
      gradientTo={String(t.glow)}
      gradientOpacity={Number(t.intensity)}
      className="magic-demo"
    >
      {body}
    </MagicCard>
  ) : (
    <Card>{body}{component==='magic-card'&&<small className="motion-notice">Efeito pausado · superfície estática shadcn/Card</small>}</Card>
  );
}
function PreviewEntryForm(){
 const [kind,setKind]=useState('Despesa'),[message,setMessage]=useState('');
 return <form className="demo-form" onSubmit={e=>{e.preventDefault();setMessage('Prévia validada. Nenhum lançamento ou pagamento foi salvo.');}}>
 <div className="entry-kind-tabs" role="group" aria-label="Tipo de lançamento demonstrativo">{['Despesa','Receita','Cartão','Reembolso','Transferência'].map(k=><button key={k} type="button" aria-pressed={kind===k} onClick={()=>{setKind(k);setMessage('');}}>{k}</button>)}</div>
 <label>Descrição<Input required placeholder="Ex.: assinatura de design"/></label><label>Valor demonstrativo (R$)<Input type="number" min="0.01" step="0.01" placeholder="0,00" required/></label><label>Data demonstrativa<Input type="date" defaultValue="2026-11-17" required/></label>
 <label>{kind==='Cartão'?'Cartão':'Conta de origem'}<select required><option value="">Selecione</option><option>Conta exemplo</option><option>Cartão exemplo</option></select></label>{kind==='Transferência'&&<label>Conta de destino<select required><option value="">Selecione</option><option>Reserva exemplo</option></select></label>}
 <label>Mês de referência<select defaultValue="2026-11"><option>2026-10</option><option>2026-11</option><option>2026-12</option></select></label><details><summary>Opções avançadas demonstrativas</summary><label>Observação<Input placeholder="Apenas para avaliar o layout"/></label><label className="check"><input type="checkbox"/>Marcação visual de confirmação</label></details>
 <Button>Validar prévia do formulário</Button><p role="status">{message}</p></form>;
}
const views = [
  ["Home", Home],
  ["Lançamentos", Rows3],
  ["Parcelas", Repeat],
  ["Cartões e contas", CreditCard],
  ["Planejamentos", Target],
  ["Cofrinhos", Coins],
  ["Reembolsos", ArrowLeftRight],
  ["Calendário", CalendarDays],
  ["Configurações", Settings],
  ["Novo lançamento", Plus],
] as const;
export function FinlyPreview({ design }: { design: Design }) {
  const [view, setView] = useState("Home"),
    [collapsed, setCollapsed] = useState(true),
    [pinned, setPinned] = useState(false),
    [submenu, setSubmenu] = useState(true),
    [month, setMonth] = useState("2026-11"),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState(false),
    [modal, setModal] = useState("");
  const t = design.tokens;
  const rows = [
    ["Mercado local", "Alimentação", "R$ 286,40", "Confirmado"],
    ["Studio assinatura", "Serviços", "R$ 49,90", "Previsto"],
    ["Projeto Horizonte", "Receita", "R$ 4.200,00", "Confirmado"],
    ["Café da esquina", "Alimentação", "R$ 24,00", "Confirmado"],
  ];
  const visible = rows.filter((x) =>
    x.join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  if (sort) visible.reverse();
  return (
    <Surface design={design} className="finly-preview">
      <Background tokens={t} />
      <aside
        className={"preview-sidebar " + (collapsed ? "collapsed" : "")}
        onMouseEnter={() => {
          if (t.hoverExpansion === "on" && matchMedia("(hover:hover)").matches)
            setCollapsed(false);
        }}
        onMouseLeave={() => {
          if (
            !pinned &&
            t.hoverExpansion === "on" &&
            matchMedia("(hover:hover)").matches
          )
            setCollapsed(true);
        }}
      >
        <button
          aria-label="Fixar menu do preview"
          onClick={() => {
            setPinned(!pinned);
            setCollapsed(pinned);
          }}
        >
          <PanelLeft />
          {!collapsed && <b>Finly</b>}
        </button>
        {views.map(([name, Icon]) => (
          <div key={name}>
            <button
              title={name}
              className={view === name ? "active" : ""}
              onClick={() => {
                setView(name);
                if (name === "Planejamentos") setSubmenu(!submenu);
              }}
            >
              <Icon />
              {!collapsed && <span>{name}</span>}
              {name === "Planejamentos" && !collapsed && (
                <ChevronRight size={12} />
              )}
            </button>
            {name === "Planejamentos" && !collapsed && submenu && (
              <button className="submenu" onClick={() => setView("Cofrinhos")}>
                Cofrinhos e objetivos
              </button>
            )}
          </div>
        ))}
      </aside>
      <div className="preview-main">
        <header>
          <div>
            <small>ESPAÇO DEMONSTRATIVO</small>
            <h2>{view === "Home" ? "Seu próximo capítulo." : view}</h2>
          </div>
          <label>
            Mês de referência
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
              {["2026-10", "2026-11", "2026-12", "2027-01"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <Button onClick={() => setModal("Novo lançamento")}>
            Novo lançamento <Plus size={14} />
          </Button>
        </header>
        {view === "Home" ? (
          <>
            <div className="preview-kpis">
              <Surface design={design} category="cards" id="balance">
                <Demo
                  component="magic-card"
                  tokens={resolve(design, "cards", "balance")}
                />
              </Surface>
              {[
                ["Receitas", "R$ 8.200,00"],
                ["Despesas", "R$ 3.920,00"],
              ].map(([name, val]) => (
                <Surface design={design} category="cards" key={name}>
                  <Card className="mini-kpi">
                    <span>{name}</span>
                    <strong className="value">{val}</strong>
                    <small>Mês de referência: {month}</small>
                  </Card>
                </Surface>
              ))}
            </div>
            <Surface design={design} category="charts" id="trend">
              <Card className="preview-chart">
                <h3>Evolução mensal</h3>
                <Demo
                  component={"chart-" + t.chartKind}
                  tokens={resolve(design, "charts", "trend")}
                />
              </Card>
            </Surface>
            <h3>Últimas movimentações</h3>
          </>
        ) : view === "Calendário" ? (
          <div className="demo-calendar">
            {Array.from({ length: 30 }, (_, i) => (
              <button
                key={i}
                onClick={() => setModal(`Agenda demonstrativa · dia ${i + 1}`)}
              >
                {i + 1}
                {[4, 12, 20].includes(i) && <span>Evento</span>}
              </button>
            ))}
          </div>
        ) : view === "Novo lançamento" ? (
          <PreviewEntryForm/>
        ) : view === "Configurações" ? (
          <Card className="mini-kpi">
            <h3>Preferências visuais</h3>
            <p>
              Use o editor de identidade ao lado para alterar esta composição.
            </p>
            <label className="check">
              <input type="checkbox" defaultChecked />
              Notificações demonstrativas
            </label>
          </Card>
        ) : [
            "Parcelas",
            "Planejamentos",
            "Cofrinhos",
            "Cartões e contas",
            "Reembolsos",
          ].includes(view) ? (
          <div className="context-cards">
            {(view === "Parcelas"
              ? ["Notebook · 3 de 10 parcelas", "Assinatura Studio · mensal"]
              : view === "Cartões e contas"
                ? ["Cartão cotidiano · final 2048", "Conta principal"]
                : view === "Reembolsos"
                  ? ["Jantar compartilhado · previsto", "Viagem · recebido"]
                  : ["Viagem ao litoral", "Reserva para novos planos"]
            ).map((name, i) => (
              <Card className="mini-kpi" key={name}>
                <h3>{name}</h3>
                <strong className="value">
                  {i ? "R$ 1.240,00" : "R$ 3.600,00"}
                </strong>
                <progress value={i ? 30 : 65} max={100} />
                <Button variant="outline" onClick={() => setModal(name)}>
                  Ver detalhes
                </Button>
              </Card>
            ))}
          </div>
        ) : null}
        {(view === "Home" || view === "Lançamentos") && (
          <div className="preview-table">
            <div className="table-toolbar">
              <Input
                aria-label="Pesquisar demonstrações"
                placeholder="Buscar uma movimentação…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button variant="outline" onClick={() => setSort(!sort)}>
                Inverter ordem
              </Button>
            </div>
            <table>
              <thead>
                <tr>
                  {["Descrição", "Categoria", "Valor", "Situação", ""].map(
                    (x, i) => (
                      <th key={i}>{x}</th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row[0]}>
                    {row.map((x, i) => (
                      <td key={i}>
                        {i === 3 ? <span className="demo-badge">{x}</span> : x}
                      </td>
                    ))}
                    <td>
                      <button
                        aria-label={"Ver " + row[0]}
                        onClick={() => setModal(row.join(" · "))}
                      >
                        •••
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer>
          Preview visual · nenhum dado financeiro real ou transação persistida.
        </footer>
      </div>
      <Dialog.Root
        open={!!modal}
        onOpenChange={(o) => {
          if (!o) setModal("");
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="demo-modal-backdrop" />
          <Dialog.Content
            className="demo-modal design-surface"
            style={
              {
                ...cssVars(t),
                "--on-primary": /^#[0-6]/.test(String(t.primary))
                  ? "#ffffff"
                  : "#102014",
              } as CSSProperties
            }
          >
            <Dialog.Title>{modal}</Dialog.Title>
            <Dialog.Description>
              Composição visual com dados fictícios. Nenhuma transação é
              persistida.
            </Dialog.Description>
            {modal==='Novo lançamento'?<PreviewEntryForm/>:<div className="demo-form"><p>Detalhe demonstrativo, somente leitura.</p><dl><dt>Referência visual</dt><dd>{modal}</dd><dt>Origem</dt><dd>Conjunto fictício do laboratório</dd></dl></div>}
            <Dialog.Close asChild>
              <Button variant="outline">Fechar</Button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Surface>
  );
}
