# Sidebar: hover, fixação e teclado

Alteração somente em Finly-React, sobre os componentes shadcn/ui MIT existentes. Nenhum fonte Aceternity foi adicionado. Não há nova biblioteca, persistência de navegação ou mudança financeira.

[Correção posterior da centralização de Planejamentos, com medições e antes/depois](SIDEBAR_ALIGNMENT.md).

O monograma verde com a letra F foi removido. No estado recolhido, cabeçalho e separador superior não ocupam espaço; expandido e no drawer móvel, o botão de início mantém Finly e FINANÇAS COM CLAREZA. Os ícones de navegação permanecem intactos. A regressão de navegação verifica ausência do monograma, cabeçalho recolhido oculto e marca textual visível nos três temas e no mobile. TypeScript, build, testes estáticos, navegação Chromium e validação pública passaram nesta alteração.

## Comportamento

- Desktop começa recolhido, com **60 px** e ícones/seleção visíveis. Ponteiro de mouse em dispositivo com hover e pointer:fine expande para **288 px**, em **220 ms**. O espaço do conteúdo acompanha a mesma transição, sem sobreposição.
- Os handlers ficam apenas no contêiner completo `[data-slot=sidebar-container]`. Movimento entre itens e submenu não fecha a Sidebar. A saída confere `relatedTarget` e só encerra o hover quando o destino está fora do contêiner.
- O SidebarProvider continua sendo a fonte do estado. A abertura efetiva combina fixação manual, hover e foco de teclado. Hover nunca altera a fixação.
- O botão **Alternar menu** fixa a Sidebar aberta; outro clique desfaz a fixação. `aria-pressed` indica a fixação, `aria-expanded` indica a abertura efetiva. Enter/Space e Ctrl/Cmd+B continuam disponíveis.
- Navegação de teclado expande os rótulos ao receber foco visível. Enquanto o foco permanece na Sidebar, ela fica aberta para não esconder controles focados; ao transferir o foco para fora, recolhe se não estiver fixada ou sob o mouse. Cliques comuns com mouse não deixam esse estado de foco preso.
- Planejamentos mantém seu Collapsible e pode ser usado com mouse ou teclado. Abrir Planejamentos não fixa a Sidebar por acidente; ao reentrar, seu submenu mantém o estado anterior.
- Tooltips são suprimidos quando a expansão automática por mouse está disponível: os rótulos aparecem no próprio menu, evitando um portal disputar o ponteiro com o contêiner.
- Até **768 px**, o controle abre o Sheet móvel existente. Touch não dispara hover. Overlay, trap de foco, Escape, retorno de foco e fechamento após navegação foram preservados. Ao voltar ao desktop, a escolha manual de fixação permanece em memória.
- `prefers-reduced-motion: reduce` remove a transição, mantendo a expansão e o conteúdo utilizáveis.

## Arquivos alterados

- `src/components/ui/sidebar.tsx`: estado manual/transitório, eventos no contêiner, dimensões, rótulos e tooltips.
- `src/components/navigation/FinanceSidebar.tsx`: remove a fixação incidental ao abrir Planejamentos.
- `src/hooks/use-mobile.ts`: inclui 768 px no drawer móvel.
- `src/styles.css`: dimensões internas dos ícones, ocultação dos rótulos e transição/reduced motion.
- `tests/check_navigation_cards.py`: regressões reais de hover, fixação, teclado, submenu, três temas e touch, mantendo os testes do Magic Card e dados.

## Verificação no Chromium

```sh
npm run check
npm run build
npm run test:static
python3 tests/check_navigation_cards.py
python3 tests/check_react_visual.py
python3 tests/check_graphite.py
python3 tests/check_public_release.py
```

Todos os comandos acima passaram nesta entrega, incluindo as verificações reais de interface no Chromium.

O teste de navegação mede 60/288 px, move o mouse entre itens e para fora, confirma fixação/desfixação sem conflito, usa Enter/Space/Ctrl+B/Tab/Escape e verifica layouts 1366/1440 desktop e 390/768 mobile. Também verifica movimento reduzido sem transição, touch sem hover, zero gravações financeiras e JSON inalterado. Fixtures são inteiramente sintéticas, em contextos descartáveis. Não representa certificação integral WCAG ou testes em todos os navegadores.

|Tema|Recolhida|Expandida|Drawer mobile|
|---|---|---|---|
|Graphite Green|[captura](replacements/graphite-sidebar-collapsed.png)|[captura](replacements/graphite-sidebar-expanded.png)|[captura](replacements/graphite-mobile-drawer.png)|
|Escuro Padrão|[captura](replacements/dark-sidebar-collapsed.png)|[captura](replacements/dark-sidebar-expanded.png)|[captura](replacements/dark-mobile-drawer.png)|
|Claro|[captura](replacements/light-sidebar-collapsed.png)|[captura](replacements/light-sidebar-expanded.png)|[captura](replacements/light-mobile-drawer.png)|

[Vídeo real: entrar/sair, itens, Planejamentos e fixação](replacements/navigation-magic-card.webm). O vídeo inclui a interface e interações do Magic Card já existente; não há dados pessoais.

As funções financeiras e `public/legacy/` permanecem idênticas à base. Nenhuma mudança na main, PR ou merge.
