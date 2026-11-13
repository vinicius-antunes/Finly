import { combinedInvoiceStatus, settled } from "./entry-system/finance";
import { ledgerChartEntries } from "./entry-system/state";
import { lazy, Suspense } from "react";
import {
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MagicCard } from "@/components/visual/MagicCard";
import { ProgressBar } from "@/components/tremor/ProgressBar";
import { metrics, money, type State } from "./model";
const Chart = lazy(() =>
  import("./MonthlySpendingChart").then((m) => ({
    default: m.MonthlySpendingChart,
  })),
);
type Props = {
  state: State;
  period: string;
  onEntries: () => void;
  onSettings: () => void;
  onInvoicePage: () => void;
  onRefunds: () => void;
};
export function HomeOverview({
  state: s,
  period,
  onEntries,
  onSettings,
  onInvoicePage,
  onRefunds,
}: Props) {
  const m = metrics(s, period),
    a = s.transactions.filter((x) => x.period === period),
    pending =
      (s.entryLedger?.operations.filter(
        (o) =>
          o.type === "reimbursement" &&
          o.period === period &&
          !o.cancelled &&
          settled(s.entryLedger!, o.id) < o.amountCents,
      ).length ?? 0) +
      a.filter(
        (x) => x.legacyKind === "reimbursement" && x.status !== "received",
      ).length;
  const status = combinedInvoiceStatus(
    s.entryLedger,
    period,
    s.transactions
      .filter((x) => x.period === period && x.legacyKind === "credit")
      .reduce((n, x) => n + x.amountCents, 0),
    s.invoiceStatuses[period],
  );
  const attention = [
    ...(m.invoice > 0 && status !== "Paga"
      ? [{ text: "Fatura em aberto ou a confirmar", action: onInvoicePage }]
      : []),
    ...(pending
      ? [{ text: `${pending} reembolsos pendentes`, action: onRefunds }]
      : []),
    ...(m.unconfirmed > 0
      ? [{ text: "Compras previstas para confirmar", action: onEntries }]
      : []),
    ...(s.pending.length
      ? [
          {
            text: `${s.pending.length} pendências sem competência`,
            action: onInvoicePage,
          },
        ]
      : []),
  ];
  return (
    <div className="home-overview executive-dashboard">
      <div className="home-primary-grid">
        <MagicCard className="home-balance">
          <h2>Saldo projetado</h2>
          <strong
            className={m.available < 0 ? "home-negative" : "tone-positive"}
          >
            {money(m.available)}
          </strong>
          <p className="muted">{period} · Projeção, não é saldo bancário.</p>
          <div className="home-balance-bottom">
            <div>
              <span>Referência mensal</span>
              <strong>{money(s.settings.salary)}</strong>
            </div>
            <div>
              <span>Margem de segurança</span>
              <strong>{money(s.settings.cushion)}</strong>
            </div>
          </div>
        </MagicCard>
        <MagicCard className="home-reserve">
          <h2>Reserva protegida</h2>
          <strong>{money(s.settings.reserve)}</strong>
          <p className="muted">Separada da projeção.</p>
          <Button variant="ghost" onClick={onSettings}>
            Ajustar referências →
          </Button>
        </MagicCard>
        <Suspense
          fallback={
            <section className="home-panel">
              <h2>Gastos mensais</h2>
              <p>Carregando gráfico…</p>
            </section>
          }
        >
          <Chart entries={ledgerChartEntries(s)} period={period} />
        </Suspense>
      </div>
      <div className="home-indicators">
        {[
          {
            label: "Fatura do cartão",
            value: m.invoice,
            detail: status,
            Icon: CreditCard,
            action: onInvoicePage,
          },
          {
            label: "Despesas fora do cartão",
            value: m.cash,
            detail: "Registradas no período",
            Icon: ArrowUpRight,
            action: onEntries,
          },
          {
            label: "Entradas recebidas",
            value: m.income + m.received,
            detail: s.entryLedger?.operations.some(
              (o) =>
                o.type === "income" &&
                o.salary &&
                o.period === period &&
                !o.cancelled &&
                settled(s.entryLedger!, o.id) > 0,
            )
              ? "Salário recebido substitui a previsão"
              : "Além da referência mensal",
            Icon: ArrowDownLeft,
            action: onEntries,
          },
          {
            label: "Reembolsos a receber",
            value: m.pending,
            detail: `${pending} pendentes`,
            Icon: RefreshCw,
            action: onRefunds,
          },
        ].map(({ label, value, detail, Icon, action }) => (
          <MagicCard key={label} className="home-indicator">
            <Icon aria-hidden="true" />
            <div>
              <h3>{label}</h3>
              <strong>{money(value)}</strong>
              <small>{detail}</small>
              <Button
                variant="ghost"
                onClick={action}
                aria-label={`Consultar ${label}`}
              >
                Ver detalhes →
              </Button>
            </div>
          </MagicCard>
        ))}
      </div>
      <div className="home-middle-grid">
        <MagicCard className="home-panel">
          <h2>Comprometimento do orçamento</h2>
          <div className="budget-amount">
            <strong>{money(m.commitment)}</strong>
            <span>
              {m.revenue
                ? `${Math.round((m.commitment / m.revenue) * 100)}%`
                : "Sem referência"}
            </span>
          </div>
          <ProgressBar
            aria-label="Comprometimento do orçamento"
            value={
              m.revenue ? Math.min(100, (m.commitment / m.revenue) * 100) : 0
            }
          />
          <p className="muted">
            Obrigações e margem. A reserva não participa deste cálculo.
          </p>
        </MagicCard>
        <MagicCard className="home-panel home-attention">
          <h2>Atenção do mês</h2>
          {attention.length ? (
            <ul>
              {attention.map((x) => (
                <li key={x.text}>
                  <Button variant="ghost" onClick={x.action}>
                    {x.text} →
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Tudo em dia</p>
          )}
        </MagicCard>
      </div>
    </div>
  );
}
