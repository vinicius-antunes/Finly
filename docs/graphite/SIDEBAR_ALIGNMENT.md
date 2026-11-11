# Centralização de Planejamentos

Correção visual pontual sobre a base `a415a49`, exclusivamente na branch existente `Finly-React`.

## Causa e ajuste

O `CollapsibleTrigger asChild` injeta `data-slot="collapsible-trigger"` nas props do SidebarMenuButton. O spread dessas props sobrescrevia `data-slot="sidebar-menu-button"`. Por isso Planejamentos não recebia os estilos dos demais botões: largura mínima de 44 px, alinhamento centralizado, tamanho do ícone e ocultação do texto. O texto era recortado, mas ainda ocupava espaço no flex; a seta já estava oculta.

Em `src/components/ui/sidebar.tsx`, o atributo canônico `data-slot="sidebar-menu-button"` passa a ser aplicado após o spread. Os eventos, `aria-expanded`, `aria-controls`, `data-state` e as props Radix continuam preservados. `FinanceSidebar.tsx` e os estilos existentes foram inspecionados e não precisam de alterações: os mesmos seletores agora também alcançam Planejamentos.

Nenhum padding compensatório ou deslocamento artificial foi adicionado. O ícone, texto, seta e destaque usam as dimensões dos demais itens, tanto no desktop quanto no drawer. Dashboard, Light Rays, lógica financeira, dependências e armazenamento permanecem inalterados.

## Medições no Chromium

|Estado recolhido|Antes|Depois|
|---|---|---|
|Centro horizontal do Target|25,26 px|30 px|
|Centro horizontal dos outros três ícones|30 px|30 px|
|Largura do botão de Planejamentos|34,55 px|44 px|
|Centro do destaque ativo de Planejamentos|25,27 px|30 px|
|Texto fora do layout|Não|Sim (`display:none`)|

Valores iguais nos três temas, com Planejamentos selecionado ou não. Durante a expansão e o recolhimento, amostras por `requestAnimationFrame` mostraram **0 px de diferença relativa** entre os centros dos quatro ícones. Expandido, texto/seta voltam a aparecer e o submenu permanece utilizável.

## Capturas antes/depois

Capturas reais, sem dados financeiros, com recorte da mesma região (340 × 500 px) na viewport de 1440 × 1000 px. A área útil da Sidebar recolhida continua com 60 px.

|Tema|Antes, inativo|Depois, inativo|Antes, ativo|Depois, ativo|Depois, expandido|
|---|---|---|---|---|---|
|Graphite Green|[Antes](sidebar-alignment/graphite-before-inactive.png)|[Depois](sidebar-alignment/graphite-after-inactive.png)|[Antes](sidebar-alignment/graphite-before-active.png)|[Depois](sidebar-alignment/graphite-after-active.png)|[Expandido](sidebar-alignment/graphite-after-expanded.png)|
|Escuro Padrão|[Antes](sidebar-alignment/dark-before-inactive.png)|[Depois](sidebar-alignment/dark-after-inactive.png)|[Antes](sidebar-alignment/dark-before-active.png)|[Depois](sidebar-alignment/dark-after-active.png)|[Expandido](sidebar-alignment/dark-after-expanded.png)|
|Claro|[Antes](sidebar-alignment/light-before-inactive.png)|[Depois](sidebar-alignment/light-after-inactive.png)|[Antes](sidebar-alignment/light-before-active.png)|[Depois](sidebar-alignment/light-after-active.png)|[Expandido](sidebar-alignment/light-after-expanded.png)|

Medições reproduzíveis: [antes](sidebar-alignment/before-measurements.json) e [depois](sidebar-alignment/after-measurements.json).

## Validação

```sh
npm run check
npm run build
npm run test:static
python3 tests/check_sidebar_alignment.py
python3 tests/check_navigation_cards.py
python3 tests/check_public_release.py
```

**Resultado:** todos os comandos passaram. Build e TypeScript sem erros; testes reais de interface executados no Chromium.

O teste de alinhamento compara os quatro centros, centro/largura do destaque ativo, estados selecionado e não selecionado, texto/seta fora do layout, submenu expandido e frames da transição, nos três temas. O modo `--before` foi usado apenas para registrar a base antes do ajuste e não executa as asserções da correção.

A regressão de navegação cobre hover, saída do contêiner, fixação/desfixação, teclado, submenu, drawer móvel 390/768 px, Escape/foco, movimento reduzido e zero gravações financeiras. A comparação Git também verifica que `src/App.tsx`, `src/styles.css`, `FinanceSidebar.tsx`, `src/lib/legacy.ts` e `public/legacy/` permanecem idênticos à base.
