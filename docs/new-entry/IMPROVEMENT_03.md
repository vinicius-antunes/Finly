# Melhoria 03 — seletor mensal compartilhado

`src/components/ui/month-picker.tsx` e seu CSS implementam um MonthPicker próprio com Button shadcn/ui, Lucide e Popover API do navegador, sem nova biblioteca. O README oficial do monthpicker shadcn foi consultado; Mantine e Date Picker permanecem referências de composição indicadas no pedido, cujas páginas não ficaram disponíveis via curl nesta sessão. Nenhum fonte externo foi incorporado. A implementação usa grade 3 × 4, ano central, navegação anual, mês atual local, limpeza opcional e destaque pelos tokens dos três temas.

Integrado em FinanceApp (cabeçalho, cadastro anterior e pendências), EntryComposer (campos mensais dinâmicos), EntrySections (parcelas/recorrências), PeopleFields (reembolsos), OperationsManager (previsões), Movements e Simulator. Datas completas continuam nativas. Valores são strings YYYY-MM; não há conversão UTC. Campo nativo não interativo mantém nome, valor, limites e validação de formulário; o calendário nativo não é exposto. Nenhum motor, contrato, backup ou parâmetro de URL foi alterado.

O popover usa a camada superior do navegador para evitar clipping em cartões e modais, reposiciona-se dentro do viewport e fecha por seleção, clique fora ou Escape. Escape é interceptado enquanto aberto para preservar o modal pai. Foco retorna ao campo após seleção/Escape; setas navegam pelos meses. Transições respeitam movimento reduzido. Exige navegador moderno com Popover API (Chromium testado); não se declara teste em aparelho físico.

## Validação

TypeScript, build, test:static, check_public_release.py e testes de domínio check_entry_ui.mjs, check_credit.mjs e check_planning.mjs executados. Teste dedicado `check_month_picker.py` cobre os 12 meses, troca de ano sem alteração financeira, dezembro/janeiro, período atual local, URL, Escape/foco, modal com datas completas, três temas e larguras 1440/390. `month_picker_helpers.py` atualiza as interações dos testes existentes para o controle visível. Nenhum dado real utilizado. A regressão completa `check_entry_ui_browser.py` também verifica formulários, pagamentos, parcelas, reembolsos, recorrências e preservação do legado.

## Evidências

- Graphite Green: [desktop](improvement-03-evidence/graphite-1440.png) · [mobile](improvement-03-evidence/graphite-390.png).
- Escuro: [desktop](improvement-03-evidence/dark-1440.png) · [mobile](improvement-03-evidence/dark-390.png).
- Claro: [desktop](improvement-03-evidence/light-1440.png) · [mobile](improvement-03-evidence/light-390.png).
