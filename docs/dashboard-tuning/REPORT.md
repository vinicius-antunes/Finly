# Visão Geral — proporções e brilho dos widgets

Branch exclusiva: `codex/finly-navegacao-ux`. Base: `f8c8ed6e78e88c6dca989154db2e321304a1dacc`.

- Mantidas as três linhas e seus nove widgets, sem novas seções.
- Padding, altura mínima dos indicadores e da terceira linha e altura do gráfico
  se adaptam moderadamente à altura útil no desktop, com `clamp`. Limites evitam
  crescimento exagerado; alturas mínimas permitem que o conteúdo cresça sem cortes.
  Notebook continua compacto e mobile mantém empilhamento/rolagem natural.
- Gastos mensais, orçamento e atenção agora reutilizam exatamente
  `src/components/visual/MagicCard.tsx`, como os outros seis cartões. O componente
  compartilhado não foi modificado nem duplicado. Camadas de brilho não recebem
  eventos de ponteiro. Seu comportamento existente de touch e movimento reduzido
  foi preservado.
- Removidos `details.chart-values`, o texto “Valores do gráfico”, a lista expansível
  e seus estilos de posicionamento. O gráfico continua com tooltip e navegação por
  teclado do Recharts; uma tabela semanticamente estruturada, visualmente oculta,
  oferece as seis competências/valores para tecnologias assistivas. Não ocupa
  espaço nem cria painel sobre outros widgets.
- Agregação mensal, modelo financeiro, armazenamento, backup, demais páginas e
  dependências permanecem inalterados.

## Evidências sintéticas

[Desktop 1920 × 1080](evidence/desktop.png) ·
[Notebook 1366 × 768](evidence/notebook.png) ·
[Mobile 390 × 844](evidence/mobile.png) ·
[Brilho no gráfico](evidence/glow-chart.png) ·
[Tooltip funcionando](evidence/tooltip.png)

[Graphite](evidence/graphite.png) · [Escuro](evidence/dark.png) ·
[Claro](evidence/light.png)

[Medições](layout.json): o dashboard mede 722 px de altura no monitor grande e
611 px no notebook, com a mesma organização. Não houve rolagem horizontal nos
três tamanhos. No celular, a rolagem vertical continua natural.

## Testes

Todos os comandos abaixo passaram.

```sh
npm run check
npm run build
npm run test:static
node tests/check_finance.mjs
node tests/check_backup.mjs
node tests/check_entries.mjs
node tests/check_monthly_spending.mjs
python3 tests/check_public_release.py
python3 tests/check_dashboard_widgets.py
python3 tests/check_home.py
python3 tests/check_navigation_ux.py
python3 tests/check_backup_browser.py
python3 tests/check_finance_browser.py
python3 tests/check_entries_browser.py
python3 tests/check_startup.py
python3 tests/check_header.py
```

A nova suíte Chromium verifica nove MagicCards ativos por movimento do mouse,
camada visual com `pointer-events:none`, tooltip, teclado no gráfico, tabela
acessível de seis competências, ausência do expansível, proporções adaptativas,
três temas, movimento reduzido e botão de acesso à fatura. Confere que as
interações não alteram o estado financeiro salvo. A suíte Home foi atualizada
para consultar os dados pela tabela acessível, preservando as verificações
monetárias e os demais fluxos. Demais regressões preservam os testes financeiros,
de armazenamento, navegação e importação existentes. Capturas e interações são
sintéticas em Chromium automatizado; não houve ensaio em aparelho físico.

## Arquivos

`src/finance/HomeOverview.tsx`, `src/finance/MonthlySpendingChart.tsx`,
`src/styles.css`, `tests/check_home.py`, `tests/check_dashboard_widgets.py`,
README e documentação/evidências desta entrega.

`main` e `Finly-React` preservadas. Sem merge e sem bibliotecas adicionais.
