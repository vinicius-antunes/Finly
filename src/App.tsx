import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { formatMoney, monthNow, readLegacySnapshot, sumCents, LEGACY_KEY } from './lib/legacy';
import type { LegacyEntry, Snapshot } from './lib/legacy';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MagicCard } from '@/components/visual/MagicCard';
import { AuroraBackdrop } from '@/components/visual/AuroraBackdrop';
import { savedTheme, PREF_KEY } from '@/theme/theme';
import type { Theme } from '@/theme/theme';
type Screen = 'overview' | 'entries' | 'planning' | 'about';
const choices: { id: Theme; label: string }[] = [
  { id: 'aurora', label: 'Dark Aurora Premium' },
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

function FeatureCard({ title, children }: { title: string; children: ReactNode }) {
  return <Card className="feature-card">
    <h3>{title}</h3>
    <div className="muted">{children}</div>
  </Card>;
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#f7f9ff' : '#0b1020');
    try { localStorage.setItem(PREF_KEY, theme); } catch { setThemeFeedback('Tema aplicado nesta sessão; o navegador não permitiu salvar a preferência.'); }
  }, [theme]);

  useEffect(() => {
    const refresh = () => setSnapshot(readLegacySnapshot());
    const onStorage = (event: StorageEvent) => {
      if (event.key === LEGACY_KEY || event.key === null) refresh();
      if (event.key === PREF_KEY && (event.newValue === 'aurora' || event.newValue === 'dark' || event.newValue === 'light')) {
        setTheme(event.newValue);
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
    setMenuOpen(false);
  }

  return <div className="shell">
    <aside className={'sidebar ' + (menuOpen ? 'menu-open' : '')}>
      <a className="identity" href="/" aria-label="Finly — início" onClick={event => { event.preventDefault(); navigate('overview'); }}>
        <span className="identity-mark">F</span>
        <span><strong>Finly</strong><small>FINANÇAS COM CLAREZA</small></span>
      </a>
      <p className="nav-kicker">WORKSPACE</p>
      <nav aria-label="Navegação principal">
        {menus.map(item => <button key={item.id} className={'nav-link ' + (screen === item.id ? 'selected' : '')}
          aria-current={screen === item.id ? 'page' : undefined} onClick={() => navigate(item.id)}>
          <span className="nav-symbol" aria-hidden="true">{item.symbol}</span>{item.label}
          {item.id === 'planning' && <span className="soon-tag">Em breve</span>}
        </button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="privacy-dot"><span aria-hidden="true">●</span> Dados apenas neste navegador</div>
        <a className="legacy-link" href="/legacy/">Abrir Finly completo <span aria-hidden="true">↗</span></a>
      </div>
    </aside>

    <div className="content">
      <header className="workspace-top">
        <button className="mobile-toggle" onClick={() => setMenuOpen(value => !value)} aria-expanded={menuOpen} aria-label="Abrir ou fechar menu">☰</button>
        <div className="breadcrumbs">FINLY <span>/</span> REACT LAB <span>/</span> {menus.find(item => item.id === screen)?.label}</div>
        <div className="preview-status"><span aria-hidden="true" /> PRÉVIA DE MIGRAÇÃO</div>
      </header>
      <main>
        <div className="heading">
          <div><p className="eyebrow">DARK AURORA PREMIUM · VERSÃO EXPERIMENTAL</p>
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
          <label className="effects-toggle"><input type="checkbox" checked={effects} onChange={event => setEffects(event.target.checked)} /> Efeitos Aurora <span className="muted">(nesta sessão)</span></label>
          {themeFeedback && <span role="status" className="muted tiny">{themeFeedback}</span>}
        </div>

        {snapshot.kind === 'invalid' && <section className="warning-banner" role="alert">{snapshot.message}</section>}
        {snapshot.kind === 'empty' && <section className="info-banner" role="status">
          Nenhum dado financeiro nesta origem. A prévia começa vazia. Se sua versão principal está em outro endereço,
          os dados não são compartilhados automaticamente. Não importe informações reais em prévias públicas.
        </section>}
        {screen === 'overview' && <>
          <div className="period-row">
            <div><h2>Seu espaço financeiro, evoluindo.</h2><p className="muted">Indicadores descritivos dos lançamentos v1, sem estimar saldo ou fatura.</p></div>
            <label className="month-select">Competência <input aria-label="Competência" type="month" value={period} onChange={event => setPeriod(event.target.value)} /></label>
          </div>
          <div className="hero-grid">
            <section className="balance-hero">
              <span className="eyebrow bright">FINLY · NOVA EXPERIÊNCIA</span>
              <AuroraBackdrop theme={theme} enabled={effects} />
              <strong>Finanças mais claras.<br /><em>Controle em primeiro lugar.</em></strong>
              <p>Esta é a primeira etapa da migração para React, TypeScript e Tailwind. O painel é de leitura; alterações financeiras continuam na versão original.</p>
              <div className="hero-footer">
                <span>{formatMonth(period)}</span>
                <a href="/legacy/">Gerenciar lançamentos ↗</a>
              </div>
            </section>
            <section className="glance-card">
              <span className="eyebrow">REGISTROS DO MÊS</span>
              <strong className="glance-number">{entries.length}</strong>
              <p className="muted">Lançamentos encontrados no armazenamento local v1</p>
              <div className="records-note"><span aria-hidden="true">◇</span> Apenas registros existentes.<br />Sem projeção de caixa nesta prévia.</div>
            </section>
          </div>
          <div className="summary-grid">
            <SummaryCard label="RECEITAS CADASTRADAS" value={formatMoney(receipts)} detail="Registros de receita na competência" tone="positive"/>
            <SummaryCard label="DESPESAS CADASTRADAS" value={formatMoney(expenses)} detail="Fora do cartão; não é fluxo de caixa"/>
            <SummaryCard label="COMPRAS NO CARTÃO" value={formatMoney(credit)} detail="Registros do cartão, independentemente da fatura"/>
            <SummaryCard label="REEMBOLSOS RECEBIDOS" value={formatMoney(refundsReceived)} detail="Somente registros marcados como recebidos" tone="positive"/>
          </div>
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
          <FeatureCard title="Metas múltiplas">A criação de metas, os depósitos e as retiradas serão migrados somente após definir e testar o modelo financeiro v2.</FeatureCard>
          <FeatureCard title="Simulações">O simulador antigo continua disponível no Finly funcional. Os cálculos financeiros ainda não foram transferidos para React.</FeatureCard>
          <FeatureCard title="Plano mensal">A alocação entre metas será implementada sem contabilizar planos como dinheiro efetivamente guardado.</FeatureCard>
        </div>}
        {screen === 'about' && <div className="feature-grid">
          <FeatureCard title="O que já funciona">React, TypeScript, Tailwind, layout responsivo, três temas, leitura de registros locais e acesso ao Finly original.</FeatureCard>
          <FeatureCard title="O que não foi migrado">Lançamentos editáveis, faturas, parcelas, backup, importação, reembolsos, contas e metas. Use a versão funcional.</FeatureCard>
          <FeatureCard title="Proteção de dados">A interface React não escreve na chave financeira v1 nem executa migração automática. Não há servidor ou sincronização externa.</FeatureCard>
          <FeatureCard title="Próximos passos">Extrair regras financeiras para módulos testáveis, executar testes de equivalência e só então substituir cada tela.</FeatureCard>
        </div>}
      </main>
    </div>
  </div>;
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
