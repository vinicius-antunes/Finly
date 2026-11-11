import type { ReactNode } from "react";
import {
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MagicCard } from "@/components/visual/MagicCard";
import { TextMorph } from "@/components/graphite/TextMorph";
import { ProgressBar } from "@/components/tremor/ProgressBar";
import { metrics, money, type State, type Entry } from "./model";

type Props = {
  state: State;
  period: string;
  onEntries: () => void;
  onSettings: () => void;
  onPlanning: () => void;
  onToggle: (x: Entry) => void;
  onInvoice: (status: string) => void;
  analytics: ReactNode;
};
function Ledger({
  entries,
  empty,
  toggle,
}: {
  entries: Entry[];
  empty: string;
  toggle?: (x: Entry) => void;
}) {
  return entries.length ? (
    <div className="home-ledger">
      {entries.map((x) => (
        <article key={x.id}>
          <div>
            <strong>{x.description}</strong>
            <small>
              {x.period} · {x.category}
              {x.part ? ` · ${x.part}/${x.parts}` : ""}
              {x.legacyKind === "credit"
                ? ` · ${x.owner === "third" ? "Outra pessoa" : x.owner === "unknown" ? "Responsável a confirmar" : "Minha compra"}`
                : ""}
              {!x.confirmed ? " · Previsão" : ""}
            </small>
            {x.note && <small>{x.note}</small>}
          </div>
          <div className="home-ledger-value">
            <strong>{money(x.amountCents)}</strong>
            {toggle ? (
              <Button variant="ghost" onClick={() => toggle(x)}>
                {x.status === "received"
                  ? "Desfazer recebimento / pagamento"
                  : x.legacyKind === "out"
                    ? "Marcar pago"
                    : "Marcar recebido"}
              </Button>
            ) : null}
            {x.legacyKind !== "credit" && (
              <small>
                {x.status === "received"
                  ? "Pago / recebido"
                  : "Pendente / previsto"}
              </small>
            )}
          </div>
        </article>
      ))}
    </div>
  ) : (
    <p className="home-empty">{empty}</p>
  );
}
export function HomeOverview({
  state: s,
  period,
  onEntries,
  onSettings,
  onPlanning,
  onToggle,
  onInvoice,
  analytics,
}: Props) {
  const m = metrics(s, period),
    a = s.transactions.filter((x) => x.period === period),
    cards = a
      .filter((x) => x.legacyKind === "credit")
      .sort((a, b) => a.description.localeCompare(b.description, "pt-BR")),
    outs = a.filter((x) => x.legacyKind === "out"),
    refunds = a.filter((x) => x.legacyKind === "reimbursement");
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(period + "-01T12:00:00Z"));
  return (
    <div className="home-overview">
      <section className="home-intro">
        <div>
          <h2>
            Mais clareza hoje.
            <br />
            <span>Mais possibilidades amanhã.</span>
          </h2>
          <p>Seu mês em perspectiva, sem perder de vista o que importa.</p>
        </div>
        <TextMorph as="span" className="home-period">
          {label}
        </TextMorph>
      </section>
      <div className="home-primary-grid">
        <MagicCard className="home-balance">
          <p className="eyebrow">
            <Wallet aria-hidden="true" /> Saldo projetado do mês{" "}
            <span className="home-badge">PROJEÇÃO</span>
          </p>
          <strong
            className={m.available < 0 ? "home-negative" : "tone-positive"}
          >
            {money(m.available)}
          </strong>
          <p className="muted">
            Estimativa após obrigações e margem. Não é saldo bancário.
          </p>
          <div className="home-balance-bottom">
            <div>
              <span>Referência mensal</span>
              <strong>{money(s.settings.salary)}</strong>
            </div>
            <div>
              <span>Margem de segurança</span>
              <strong>{money(s.settings.cushion)}</strong>
            </div>
            <Button variant="outline" onClick={onEntries}>
              Explorar lançamentos
            </Button>
          </div>
        </MagicCard>
        <MagicCard className="home-reserve">
          <div className="home-section-heading">
            <ShieldCheck aria-hidden="true" />
            <span className="home-badge">VALOR INFORMADO</span>
          </div>
          <h2>Sua reserva protegida</h2>
          <strong>{money(s.settings.reserve)}</strong>
          <p className="muted">Separada da projeção. Você mantém o controle.</p>
          <Button variant="ghost" onClick={onSettings}>
            Ajustar referências →
          </Button>
        </MagicCard>
      </div>
      <div className="home-indicators">
        {[
          {
            label: "Fatura do cartão",
            value: m.invoice,
            detail: money(m.unconfirmed) + " em previsões",
            Icon: CreditCard,
          },
          {
            label: "Fora do cartão",
            value: m.cash,
            detail: "Despesas do período",
            Icon: ArrowUpRight,
          },
          {
            label: "Entradas recebidas",
            value: m.income + m.received,
            detail: "Além da referência mensal",
            Icon: ArrowDownLeft,
          },
          {
            label: "Reembolsos a receber",
            value: m.pending,
            detail: s.settings.includeExpectedRefunds
              ? "Incluídos na projeção por sua escolha"
              : "Separados do saldo projetado",
            Icon: RefreshCw,
          },
        ].map(({ label, value, detail, Icon }) => (
          <MagicCard key={label} className="home-indicator">
            <Icon aria-hidden="true" />
            <div>
              <h3>{label}</h3>
              <strong>{money(value)}</strong>
              <small>{detail}</small>
            </div>
          </MagicCard>
        ))}
      </div>
      <div className="home-middle-grid">
        <section className="home-panel">
          <p className="eyebrow">EQUILÍBRIO DO MÊS</p>
          <h2>Seu orçamento, por inteiro</h2>
          <strong className="home-budget-value">{money(m.commitment)}</strong>
          <p className="muted">Em obrigações e margem</p>
          <ProgressBar
            aria-label="Comprometimento do orçamento"
            value={
              m.revenue ? Math.min(100, (m.commitment / m.revenue) * 100) : 0
            }
          />
          <div className="home-budget-legend">
            <span>
              Cartão <b>{money(m.invoice)}</b>
            </span>
            <span>
              Fora do cartão <b>{money(m.cash)}</b>
            </span>
            <span>
              Margem <b>{money(s.settings.cushion)}</b>
            </span>
          </div>
          <p className="home-note">
            {m.revenue
              ? `${Math.round((m.commitment / m.revenue) * 100)}% dos recursos considerados na projeção.`
              : "Configure sua referência mensal para comparar o orçamento."}{" "}
            A reserva não participa deste cálculo.
          </p>
        </section>
        <section className="home-panel">
          <div className="home-section-heading">
            <div>
              <p className="eyebrow">MOVIMENTAÇÃO</p>
              <h2>Registros do mês</h2>
            </div>
            <Button variant="ghost" onClick={onEntries}>
              Ver todos →
            </Button>
          </div>
          <Ledger
            entries={a.slice(-4).reverse()}
            empty="Seu histórico começa com o primeiro lançamento."
          />
          <p className="muted tiny">Ordem de cadastro · competência {label}.</p>
        </section>
      </div>
      <div className="home-section-heading home-radar-heading">
        <div>
          <p className="eyebrow">NO SEU RADAR</p>
          <h2>Compromissos e recebimentos</h2>
        </div>
        <Button variant="outline" onClick={onPlanning}>
          Parcelas e reembolsos
        </Button>
      </div>
      <div className="home-obligations-grid">
        <section className="home-panel">
          <div className="home-section-heading">
            <div>
              <h2>Fatura de {label}</h2>
              <p className="muted tiny">
                Vencimento estimado: dia {s.settings.dueDay} ·{" "}
                {s.settings.cardLabel}
              </p>
            </div>
            <strong>{money(m.invoice)}</strong>
          </div>
          <label className="finance-field">
            Status da fatura
            <select
              aria-label="Status da fatura na Home"
              value={s.invoiceStatuses[period] ?? "unknown"}
              onChange={(e) => onInvoice(e.target.value)}
            >
              <option value="unknown">A confirmar</option>
              <option value="unpaid">Em aberto</option>
              <option value="paid">Paga</option>
            </select>
          </label>
          <p className="muted tiny">
            Marcar paga não desconta a fatura duas vezes na projeção.
          </p>
          <Ledger
            entries={cards}
            empty="Nenhuma compra no cartão cadastrada neste mês."
          />
          {m.third > 0 && (
            <p className="home-note">
              {money(m.third)} da fatura são de outra pessoa. O banco cobra a
              fatura completa; o reembolso é acompanhado separadamente.
            </p>
          )}
          {m.unknown > 0 && (
            <p className="home-note">
              {money(m.unknown)} em compras com responsável não identificado.
            </p>
          )}
        </section>
        <section className="home-panel">
          <h2>Fora do cartão e reembolsos</h2>
          <p className="muted tiny">Evite contar despesas duas vezes.</p>
          <Ledger
            entries={outs}
            toggle={onToggle}
            empty="Sem despesas fora do cartão."
          />
          <h3>Reembolsos</h3>
          <Ledger
            entries={refunds}
            toggle={onToggle}
            empty="Sem reembolsos para este mês."
          />
          {m.pending > 0 && (
            <p className="home-note">
              {money(m.pending)} aguardando recebimento;{" "}
              {s.settings.includeExpectedRefunds
                ? "incluídos somente na projeção por sua escolha"
                : "não incluídos na sobra conservadora"}
              .
            </p>
          )}
        </section>
      </div>
      <section className="home-future home-panel">
        <h2>Compromissos futuros registrados</h2>
        <p className="muted">
          {
            s.transactions.filter(
              (x) => x.legacyKind === "credit" && x.period > period,
            ).length
          }{" "}
          compras/parcelas em competências posteriores. Inclui previsões
          cadastradas.
        </p>
        <Button variant="outline" onClick={onPlanning}>
          Conferir parcelas e recorrências
        </Button>
      </section>
      <section className="home-analytics">
        <h2>Distribuição e recebimentos</h2>
        {analytics}
      </section>
    </div>
  );
}
