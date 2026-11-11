# Light Rays como background global

O efeito React Bits existente saiu do `balance-hero` e passou a ser um filho direto do SidebarProvider em `App.tsx`. A camada cobre a viewport inteira, permanece fixa durante a rolagem e mantém a mesma instância WebGL entre Visão geral, Lançamentos e Planejamentos. O banner mantém seu fundo de superfície, sem iluminação localizada duplicada.

## Composição e desempenho

- `.finly-shell` cria um contexto com `isolation:isolate`, sem transformar ou recortar a viewport. O backdrop tem `position:fixed`, `inset:0`, `z-index:0`, `pointer-events:none` e `aria-hidden`. O conteúdo tem z-index 1; a Sidebar desktop mantém 10 e o Sheet/overlay móvel mantém 50 no portal Radix. Nenhum z-index negativo ou overlay sobre controles.
- Graphite Green usa os raios verdes discretos com opacidade 0,28 e velocidade 0,25. Cartões mantêm superfícies opacas; o efeito aparece no espaço entre as superfícies, inclusive no cabeçalho. Escuro Padrão e Claro ocultam a camada inteira e desmontam a animação, sem impor iluminação verde.
- **Efeitos de luz** ativa/desativa tanto a animação quanto o fundo estático, em todas as telas, durante a sessão. Desativar também desmonta o canvas. Não há nova chave de armazenamento.
- O wrapper é memoizado: navegação e filtros não renderizam novamente o efeito se seus parâmetros não mudaram. Não há nova biblioteca nem alteração do fonte/licença React Bits.
- O chunk LightRays continua lazy. Até 600 px, com movimento reduzido ou `navigator.connection.saveData`, o chunk não é solicitado e o fundo é um gradiente estático discreto. Mudanças nessas preferências são observadas, com limpeza dos listeners. Em 768 px a animação continua elegível, salvo movimento reduzido/economia de dados; o menu segue usando o drawer.
- Sem WebGL2, o gradiente global permanece visível. As proteções existentes continuam: DPR máximo 1, amostragem adaptativa, orçamento de 2,4 milhões de pixels, pausa em aba oculta, ResizeObserver/IntersectionObserver e limpeza de recursos. Não há múltiplas instâncias por tela. Não foi realizado benchmark em GPU física de celular.

## Comparativo visual

Capturas reais do Chromium, somente com registros sintéticos em contextos descartáveis. O antes corresponde à base `73a2299`; o depois usa a mesma fixture, tema e dimensões. No desktop, a iluminação deixa o banner e aparece ao fundo do cabeçalho e espaços da interface. No celular de 390 px, o comparativo mostra o fallback estático passando de localizado para global, sem custo WebGL.

|Viewport|Antes: efeito no banner|Depois: fundo global|
|---|---|---|
|Desktop 1440 × 1000|[Antes](global-rays/before-desktop.png)|[Depois](global-rays/after-desktop.png)|
|Mobile 390 × 844|[Antes](global-rays/before-mobile.png)|[Depois](global-rays/after-mobile.png)|

|Navegação|Desktop|Mobile|
|---|---|---|
|Lançamentos|[Captura](global-rays/after-desktop-entries.png)|[Captura](global-rays/after-mobile-entries.png)|
|Planejamentos|[Captura](global-rays/after-desktop-planning.png)|[Captura](global-rays/after-mobile-planning.png)|

[Drawer sobre o fundo](global-rays/after-mobile-drawer.png), [movimento reduzido](global-rays/after-reduced-motion.png), [Escuro Padrão](global-rays/escuro-desktop.png) e [Claro](global-rays/claro-desktop.png).

## Testes

```sh
npm run check
npm run build
npm run test:static
python3 tests/check_global_rays.py
python3 tests/check_react_visual.py
python3 tests/check_navigation_cards.py
python3 tests/check_graphite.py
python3 tests/check_theme.py
python3 tests/check_premium.py
python3 tests/check_public_release.py
```

**Resultado:** todos os comandos passaram. TypeScript e build sem erros; build manteve os chunks lazy e não apresentou aviso de chunk maior que 500 kB. As verificações de interface foram executadas no Chromium real, sobre o build de produção.

O novo teste verifica dimensões/cobertura após rolagem, parent global fora do banner, mesma identidade do canvas durante navegação, no máximo um canvas, cliques/camadas, Sidebar hover e Sheet, checkbox nas outras telas, três temas, quatro viewports (1366/1440/768/390), fallback sem WebGL, reduced motion e economia de dados (inclusive mudanças em execução). Também verifica ausência de carregamento do chunk nos modos econômicos e zero escritas financeiras, com JSON original preservado.

`--before` é apenas o modo de captura da base anterior, executado antes da alteração; não executa as asserções do posicionamento global. As regressões existentes continuam verificando somas, preferência de tema, gráficos, hover/fixação/teclado e legado.

## Arquivos e fronteira

- `src/App.tsx`: realoca uma única instância do backdrop para o shell global.
- `src/components/visual/RaysBackdrop.tsx`: memoização, ocultação por tema/checkbox e atualização de economia de dados.
- `src/styles.css`: camada fixa, contexto de empilhamento e remoção da composição localizada do banner.
- `tests/check_global_rays.py`: testes de interface e evidências dedicadas.
- README, índice Graphite e este relatório: comportamento atual e comparativo.

Trabalho exclusivo na branch existente `Finly-React`. `src/lib/legacy.ts`, `public/legacy/` e o armazenamento financeiro não foram alterados. Sem mudança na main, migração ou funcionalidade financeira nova. As evidências locais não confirmam um deployment Cloudflare; ao revisar no Pages, abra o deployment correspondente ao commit enviado nesta branch.
