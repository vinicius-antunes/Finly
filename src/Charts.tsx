import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import type { Tokens } from "./model";
const data = [
  { month: "Jun", receitas: 6200, despesas: 3400 },
  { month: "Jul", receitas: 5800, despesas: 2800 },
  { month: "Ago", receitas: 7100, despesas: 4200 },
  { month: "Set", receitas: 6400, despesas: 3100 },
  { month: "Out", receitas: 7800, despesas: 4600 },
  { month: "Nov", receitas: 8200, despesas: 3900 },
];
export default function Charts({
  kind = "bar",
  tokens: t,
}: {
  kind?: string;
  tokens: Tokens;
}) {
  const animate =
    t.motion === "on" && !matchMedia("(prefers-reduced-motion:reduce)").matches;
  const chartProps = { data };
  const extras = (
    <>
      {t.grid === "on" && (
        <CartesianGrid stroke={String(t.border)} strokeDasharray="3 3" />
      )}
      {t.axes === "on" && (
        <>
          <XAxis
            dataKey="month"
            stroke={String(t.muted)}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke={String(t.muted)}
            width={42}
            tickLine={false}
            axisLine={false}
          />
        </>
      )}
      {t.tooltip === "on" && (
        <Tooltip
          contentStyle={{
            background: String(t.popover),
            color: String(t.text),
            borderColor: String(t.border),
            borderRadius: 8,
          }}
        />
      )}
      {t.legend === "on" && <Legend />}
    </>
  );
  const bar = (
    <Bar
      dataKey="receitas"
      fill={String(t.chart)}
      radius={Number(t.barRadius)}
      isAnimationActive={animate}
    />
  );
  return (
    <div
      className="chart"
      role="img"
      aria-label="Gráfico demonstrativo com dados fictícios"
    >
      <ResponsiveContainer width="100%" height="100%">
        {kind === "line" ? (
          <LineChart {...chartProps}>
            {extras}
            <Line
              dataKey="receitas"
              stroke={String(t.chart)}
              strokeWidth={Number(t.chartStroke)}
              isAnimationActive={animate}
            />
          </LineChart>
        ) : kind === "area" ? (
          <AreaChart {...chartProps}>
            {extras}
            <Area
              dataKey="receitas"
              stroke={String(t.chart)}
              fill={String(t.chart)}
              fillOpacity={t.gradient === "on" ? 0.2 : 0.6}
              strokeWidth={Number(t.chartStroke)}
              isAnimationActive={animate}
            />
          </AreaChart>
        ) : kind === "radial" ? (
          <RadialBarChart
            data={data.map((x, i) => ({
              ...x,
              fill: i % 2 ? String(t.chartSecondary) : String(t.chart),
            }))}
            innerRadius="25%"
            outerRadius="95%"
            startAngle={180}
            endAngle={0}
          >
            <RadialBar dataKey="receitas" isAnimationActive={animate} />
          </RadialBarChart>
        ) : kind === "pie" || kind === "donut" ? (
          <PieChart>
            <Pie
              data={data}
              dataKey="despesas"
              nameKey="month"
              innerRadius={kind === "donut" ? 55 : 0}
              outerRadius={90}
              isAnimationActive={animate}
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={i % 2 ? String(t.chartSecondary) : String(t.chart)}
                  opacity={1 - i * 0.08}
                />
              ))}
            </Pie>
            {t.tooltip === "on" && <Tooltip />}
            {t.legend === "on" && <Legend />}
          </PieChart>
        ) : kind === "composed" ? (
          <ComposedChart {...chartProps}>
            {extras}
            {bar}
            <Line
              dataKey="despesas"
              stroke={String(t.chartSecondary)}
              isAnimationActive={animate}
            />
          </ComposedChart>
        ) : (
          <BarChart {...chartProps}>
            {extras}
            {bar}
            <Bar
              dataKey="despesas"
              fill={String(t.chartSecondary)}
              radius={Number(t.barRadius)}
              isAnimationActive={animate}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
