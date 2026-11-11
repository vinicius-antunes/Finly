import { ProgressBar } from '@/components/tremor/ProgressBar';
import { formatMoney } from '@/lib/legacy';
import type { LegacyEntry } from '@/lib/legacy';
export function RefundProgress({entries}: {entries:LegacyEntry[]}) {
 const refunds = entries.filter(e => e.kind === 'reimbursement');
 const all = refunds.reduce((s,e)=>s+Math.round(e.amount*100),0);
 const received = refunds.filter(e=>e.status==='received').reduce((s,e)=>s+Math.round(e.amount*100),0);
 return <section className="refund-panel"><p className="eyebrow">ACOMPANHAMENTO</p><h2>Reembolsos registrados</h2>
  {all ? <><div className="refund-value">{formatMoney(received)}<span> de {formatMoney(all)}</span></div>
   <ProgressBar value={received} max={all} aria-label="Reembolsos recebidos em relação ao total cadastrado" />
   <div className="refund-split"><span>Recebidos <b>{Math.round(received/all*100)}%</b></span><span>A receber <b>{formatMoney(all-received)}</b></span></div></> : <div className="empty-state">Nenhum reembolso cadastrado no período.</div>}
  <p className="muted chart-note">O valor a receber é uma expectativa. Não foi somado a receitas ou saldo.</p>
 </section>;
}
