import { BarChart, Bar, XAxis, CartesianGrid } from "recharts";
import { useReducedMotion } from "motion/react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { money } from "../model";
export function SimulationChart({
  data,
}: {
  data: { period: string; existing: number; hypothetical: number }[];
}) {
  const reduce = useReducedMotion();
  return (
    <ChartContainer
      className="planning-impact"
      config={{
        existing: { label: "Registrado", color: "var(--muted-foreground)" },
        hypothetical: { label: "Hipótese", color: "var(--primary)" },
      }}
    >
      <BarChart data={data.slice(0, 12)} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="period" />
        <ChartTooltip
          content={<ChartTooltipContent formatter={(v) => money(Number(v))} />}
        />
        <Bar
          dataKey="existing"
          fill="var(--color-existing)"
          isAnimationActive={!reduce}
        />
        <Bar
          dataKey="hypothetical"
          fill="var(--color-hypothetical)"
          isAnimationActive={!reduce}
        />
      </BarChart>
    </ChartContainer>
  );
}
