import { useId } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { useReducedMotion } from "motion/react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { money, type Entry } from "./model";
import { monthlySpending } from "./monthlySpending";
const config = {
  total: { label: "Gastos", color: "var(--primary)" },
} satisfies ChartConfig;
export function MonthlySpendingChart({
  entries,
  period,
}: {
  entries: Entry[];
  period: string;
}) {
  const gradient = "spending-" + useId().replace(/:/g, "");
  const data = monthlySpending(entries, period),
    reduce = useReducedMotion();
  return (
    <section className="home-panel monthly-spending">
      <h2>Gastos mensais</h2>
      <p className="muted">Últimas seis competências · despesas registradas</p>
      <ChartContainer
        config={config}
        className="monthly-bars"
        aria-label="Gastos das últimas seis competências"
      >
        <BarChart
          accessibilityLayer
          data={data}
          margin={{ top: 8, left: 8, right: 8, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-total)"
                stopOpacity={0.95}
              />
              <stop
                offset="100%"
                stopColor="var(--color-total)"
                stopOpacity={0.65}
              />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="period"
            tickLine={false}
            axisLine={false}
            tickFormatter={(p) => data.find((x) => x.period === p)?.label ?? p}
            tickMargin={8}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(p) =>
                  new Intl.DateTimeFormat("pt-BR", {
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(String(p) + "-01T12:00:00Z"))
                }
                formatter={(v) => money(Number(v))}
              />
            }
          />
          <Bar
            dataKey="total"
            fill={`url(#${gradient})`}
            radius={[4, 4, 0, 0]}
            isAnimationActive={!reduce}
            animationDuration={350}
          />
        </BarChart>
      </ChartContainer>
      <details className="chart-values">
        <summary>Valores do gráfico</summary>
        <ul>
          {data.map((x) => (
            <li key={x.period}>
              {x.period}: {money(x.total)}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
