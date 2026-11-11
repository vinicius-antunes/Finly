// Finly data binding of shadcn's chart-pie-donut example (MIT).
// Only out entries enter this chart: credit purchases and reimbursements excluded.
import { Pie, PieChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { LegacyEntry } from '@/lib/legacy';
import { formatMoney } from '@/lib/legacy';
export function categoryExpenses(entries: LegacyEntry[]) {
  const groups = new Map<string, number>();
  for (const e of entries.filter(e => e.kind === 'out')) {
    const category = (typeof e.category === 'string' ? e.category.trim() : '') || 'Sem categoria';
    groups.set(category, (groups.get(category) || 0) + Math.round(e.amount * 100));
  }
  return [...groups].filter(([,cents]) => cents > 0).sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0],'pt-BR'))
    .map(([category,cents],i) => ({ category, cents, fill: `var(--chart-${i%5+1})` }));
}
export function CategoryDonut({entries}: {entries: LegacyEntry[]}) {
 const data = categoryExpenses(entries);
 const total = data.reduce((s,e) => s+e.cents,0);
 return <section className="category-panel" aria-labelledby="category-title">
   <div className="section-heading"><div><p className="eyebrow">CATEGORIAS</p><h2 id="category-title">Para onde foram as despesas?</h2></div><span className="period-tag">Fora do cartão</span></div>
   <p className="muted chart-note">Despesas cadastradas na competência. Não inclui compras no cartão, receitas ou reembolsos; não é fluxo de caixa.</p>
   {!data.length ? <div className="empty-state">Sem despesas fora do cartão nesta competência.</div> : <div className="donut-body">
    <div className="donut-visual"><ChartContainer config={{cents:{label:'Valor cadastrado'}}} className="category-chart">
     <PieChart><ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => formatMoney(Number(value))} hideLabel />} />
      <Pie data={data} dataKey="cents" nameKey="category" innerRadius={70} outerRadius={94} strokeWidth={4} isAnimationActive={false} />
     </PieChart>
    </ChartContainer><div className="donut-center" aria-hidden="true"><span>Total cadastrado</span><strong>{formatMoney(total)}</strong></div></div>
    <ul className="category-legend">{data.map(e => <li key={e.category}><span className="category-dot" style={{background:e.fill}} /><span>{e.category}</span><strong>{formatMoney(e.cents)}</strong></li>)}</ul>
   </div>}
 </section>;
}
