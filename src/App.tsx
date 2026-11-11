import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { formatMoney, monthNow, readLegacySnapshot, sumCents, LEGACY_KEY } from './lib/legacy';
import type { LegacyEntry, Snapshot } from './lib/legacy';

import { Button } from '@/components/ui/button';
import { MagicCard as MagicUICard } from '@/components/magicui/magic-card';
import { FinanceSidebar, type Screen } from '@/components/navigation/FinanceSidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { MagicCard } from '@/components/visual/MagicCard';
import { RaysBackdrop } from '@/components/visual/RaysBackdrop';
import { TextMorph } from '@/components/graphite/TextMorph';
const CategoryDonut = lazy(() => import('@/components/analytics/CategoryDonut').then(m => ({default:m.CategoryDonut})));
import { RefundProgress } from '@/components/analytics/RefundProgress';
import { savedTheme, PREF_KEY } from '@/theme/theme';
import type { Theme } from '@/theme/theme';
const choices: { id: Theme; label: string }[] = [
  { id: 'graphite', label: 'Graphite Green' },
  { id: 'dark', label: 'Escuro Padrão' },
  { id: 'light', label: 'Claro' },
];

function SummaryCard({ label, value, detail, tone }: {
  label: string; value: string; detail: string; tone?: 'positive' | 'warning';
}) {
  return <MagicCard className="summary-card">
    <p className="muted tiny">{label}</p>
    <strong className={tone ? 'tone-' + tone : ''}>{value}</strong>
    <span className="muted tiny">{detail}</span>
  </MagicCard>;
}

function FeatureCard({ title, children, theme }: { title: string; children: ReactNode; theme: Theme }) {
  return <MagicUICard className="feature-card magic-feature" appearance={theme} gradientSize={320}
    gradientColor={theme === 'light' ? '#6ab586' : theme === 'dark' ? '#9abfa8' : '#16e882'}
    gradientOpacity={theme === 'dark' ? 0.12 : theme === 'light' ? 0.16 : 0.24}
    gradientFrom="var(--primary)" gradientTo="var(--border)">
    <h3>{title}</h3>
    <div className="muted">{children}</div>
  </MagicUICard>;
}

const labels: Record<LegacyEntry['kind'], string> = {
  credit: 'Cartão', out: 'Despesa', income: 'Receita', reimbursement: 'Reembolso',
};
const menus: { id: Screen; label: string; symbol: string }[] = [
  { id: 'overview', label: 'Visão geral', symbol: '◫' },
  { id: 'entries', label: 'Lançamentos', symbol: '≡' },
  { id: 'planning', label: 'Planejamentos', symbol: '◎' },
  { id: 'about', label: 'Sobre a migração', symbol: '◈' },
];

function formatMonth(value: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value;
  const [year, month] = value.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(savedTheme);
  const [screen, setScreen] = useState<Screen>('overview');
  const [period, setPeriod] = useState<string>(monthNow);
  const [snapshot, setSnapshot] = useState<Snapshot>(readLegacySnapshot);
  const [effects, setEffects] = useState(true);
  const [themeFeedback, setThemeFeedback] = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#fdfdfd' : '#1b1b20');
    try { localStorage.setItem(PREF_KEY, theme); } catch { setThemeFeedback('Tema aplicado nesta sessão; o navegador não permitiu salvar a preferência.'); }
  }, [theme]);

  useEffect(() => {
    const refresh = () => setSnapshot(readLegacySnapshot());
    const onStorage = (event: StorageEvent) => {
      if (event.key === LEGACY_KEY || event.key === null) refresh();
      if (event.key === PREF_KEY && (event.newValue === 'aurora' || event.newValue === 'graphite' || event.newValue === 'dark' || event.newValue === 'light')) {
        setTheme(event.newValue === 'aurora' ? 'graphite' : event.newValue);
      }
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const entries = useMemo(() => snapshot.entries.filter(item => item.month === period), [snapshot, period]);
  const sorted = useMemo(() => [...entries].sort((a, b) =>
    a.description.localeCompare(b.description, 'pt-BR') || a.id.localeCompare(b.id)), [entries]);
  const receipts = sumCents(entries, 'income');
  const expenses = sumCents(entries, 'out');
  const credit = sumCents(entries, 'credit');
  const refundsReceived = sumCents(entries.filter(item => item.status === 'received'), 'reimbursement');

  function navigate(next: Screen) {
    setScreen(next);
  }

  return <SidebarProvider className="finly-shell">
    <FinanceSidebar screen={screen} onNavigate={navigate}/>
    <div className="content">
      <header className="workspace-top">
        <SidebarTrigger className="finance-sidebar-trigger" />
        <div className="breadcrumbs">FINLY <span>/</span> REACT LAB <span>/</span> {menus.find(item => item.id === screen)?.label}</div>
        <div className="preview-status"><span aria-hidden="true" /> PRÉVIA DE MIGRAÇÃO</div>
      </header>
      <main>
        <div className="heading">
          <div><p className="eyebrow">FINLY · PRÉVIA SOMENTE LEITURA</p>
            <h1>{menus.find(item => item.id === screen)?.label}</h1>
            <p className="muted">Nova experiência React, preservando as regras financeiras no aplicativo original.</p>
          </div>
          <Button asChild><a className="action-primary" href="/legacy/">Ir para o Finly funcional <span aria-hidden="true">↗</span></a></Button>
        </div>

        <div className="theme-panel" role="group" aria-label="Tema visual">
          <span className="muted tiny">APARÊNCIA</span>
          <div className="theme-options">{choices.map(option =>
            <Button variant="ghost" key={option.id} type="button" aria-pressed={theme === option.id}
              className={theme === option.id ? 'theme-active' : ''} onClick={() => setTheme(option.id)}>
              {option.label}
            </Button>)}</div>
          <label className="effects-toggle"><input type="checkbox" checked={effects} onChange={event => setEffects(event.target.checked)} /> Efeitos de luz <span className="muted">(nesta sessão)</span></label>
          {themeFeedback && <span role="status" className="muted tiny">{themeFeedback}</span>}
        </div>

        {snapshot.kind === 'invalid' && <section className="warning-banner" role="alert">{snapshot.message}</section>}
        {snapshot.kind === 'empty' && <section className="info-banner" role="status">
          Nenhum dado financeiro nesta origem. A prévia começa vazia. Se sua versão principal está em outro endereço,
          os dados não são compartilhados automaticamente. Não importe informações reais em prévias públicas.
        </section>}
        {screen === 'overview' && <>
          <div className="period-row">
            <div><h2>Seu mês em perspectiva.</h2><p className="muted">Indicadores descritivos dos lançamentos v1, sem estimar saldo ou fatura.</p></div>
            <label className="month-select">Competência <input aria-label="Competência" type="month" value={period} onChange={event => setPeriod(event.target.value)} /></label>
          </div>
          <div className="hero-grid">
            <section className="balance-hero">
              <span className="eyebrow bright">FINLY · NOVA EXPERIÊNCIA</span>
              <RaysBackdrop theme={theme} enabled={effects} />
              <strong>Seu dinheiro.<br /><em>Sua direção.</em></strong>
              <p>Clareza para acompanhar seus registros, sem perder de vista os próximos passos. As alterações continuam no Finly funcional.</p>
              <div className="hero-footer">
                <TextMorph as="span" className="period-morph">{formatMonth(period)}</TextMorph>
                <a href="/legacy/">Gerenciar lançamentos ↗</a>
              </div>
            </section>
            <div className="reading-note"><span className="record-count">{entries.length}</span><div><strong>Registros nesta competência</strong><p>Consulta local. Sem estimativa de saldo, caixa ou fatura.</p></div></div>
          </div>
          <div className="summary-grid">
            <SummaryCard label="RECEITAS CADASTRADAS" value={formatMoney(receipts)} detail="Registros de receita na competência" tone="positive"/>
            <SummaryCard label="DESPESAS CADASTRADAS" value={formatMoney(expenses)} detail="Fora do cartão; não é fluxo de caixa"/>
            <SummaryCard label="COMPRAS NO CARTÃO" value={formatMoney(credit)} detail="Registros do cartão, independentemente da fatura"/>
            <SummaryCard label="REEMBOLSOS RECEBIDOS" value={formatMoney(refundsReceived)} detail="Somente registros marcados como recebidos" tone="positive"/>
          </div>
          <div className="analytics-grid"><Suspense fallback={<div className="category-panel" role="status">Carregando distribuição…</div>}><CategoryDonut entries={entries} /></Suspense><RefundProgress entries={entries} /></div>
          <section className="table-card">
            <div className="card-header"><div><span className="eyebrow">ATIVIDADE</span><h2>Lançamentos da competência</h2></div>
              <Button variant="outline" className="subtle-btn" onClick={() => navigate('entries')}>Ver todos ↗</Button></div>
            <EntryList entries={sorted.slice(0, 6)} />
          </section>
          <section className="footnote">Os valores acima são somas descritivas dos registros; não representam saldo disponível, pagamento de fatura ou previsão de caixa. Nenhum registro é alterado nesta prévia.</section>
        </>}
        {screen === 'entries' && <section className="table-card">
          <div className="card-header"><div><span className="eyebrow">CONSULTA SOMENTE LEITURA</span><h2>Lançamentos registrados</h2><p className="muted">Período: {formatMonth(period)} · {entries.length} registros</p></div>
          <label className="month-select">Competência <input aria-label="Competência" type="month" value={period} onChange={event => setPeriod(event.target.value)} /></label></div>
          <EntryList entries={sorted} />
          <div className="card-bottom"><a href="/legacy/">Criar, editar e importar lançamentos na versão funcional ↗</a></div>
        </section>}
        {screen === 'planning' && <div className="feature-grid">
          <FeatureCard theme={theme} title="Metas múltiplas">A criação de metas, os depósitos e as retiradas serão migrados somente após definir e testar o modelo financeiro v2.</FeatureCard>
          <FeatureCard theme={theme} title="Simulações">O simulador antigo continua disponível no Finly funcional. Os cálculos financeiros ainda não foram transferidos para React.</FeatureCard>
          <FeatureCard theme={theme} title="Plano mensal">A alocação entre metas será implementada sem contabilizar planos como dinheiro efetivamente guardado.</FeatureCard>
        </div>}
        {screen === 'about' && <div className="feature-grid">
          <FeatureCard theme={theme} title="O que já funciona">React, TypeScript, Tailwind, layout responsivo, três temas, leitura de registros locais e acesso ao Finly original.</FeatureCard>
          <FeatureCard theme={theme} title="O que não foi migrado">Lançamentos editáveis, faturas, parcelas, backup, importação, reembolsos, contas e metas. Use a versão funcional.</FeatureCard>
          <FeatureCard theme={theme} title="Proteção de dados">A interface React não escreve na chave financeira v1 nem executa migração automática. Não há servidor ou sincronização externa.</FeatureCard>
          <FeatureCard theme={theme} title="Próximos passos">Extrair regras financeiras para módulos testáveis, executar testes de equivalência e só então substituir cada tela.</FeatureCard>
        </div>}
      </main>
    </div>
  </SidebarProvider>;
}

function EntryList({ entries }: { entries: LegacyEntry[] }) {
  if (!entries.length) return <div className="empty-state">Nenhum lançamento encontrado para esta competência.</div>;
  return <div className="table-scroll"><table className="entries-table">
    <thead><tr><th>Descrição</th><th>Tipo</th><th>Situação</th><th className="right">Valor</th></tr></thead>
    <tbody>{entries.map(item => <tr key={item.id}>
      <td><strong>{item.description}</strong><small>{item.category || 'Sem categoria'}{item.part && item.parts ? ' · ' + item.part + '/' + item.parts : ''}</small></td>
      <td>{labels[item.kind]}</td>
      <td><span className="status-pill">{item.status === 'received' ? 'Recebido' : item.status === 'paid' ? 'Pago' : item.confirmed === false ? 'Previsão' : 'Registrado'}</span></td>
      <td className="right amount">{formatMoney(Math.round(item.amount * 100))}</td>
    </tr>)}</tbody>
  </table></div>;
}
