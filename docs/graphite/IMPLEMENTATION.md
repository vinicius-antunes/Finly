# Graphite Green — escopo vigente e histórico da execução

Base 31b39c6, branch exclusiva Finly-React; não há PR, merge ou alteração da main.
Os anexos selection.json e tweakcn-original.css preservam os conteúdos originais; o CSS foi normalizado de CRLF para LF, sem mudar os tokens. A autorização posterior do proprietário supera o estado histórico false do JSON.

## Escopo vigente após decisão do proprietário

As duas substituições **shadcn/ui Sidebar e Magic UI Magic Card** foram aprovadas expressamente. **Stateful Button retirado do escopo.** As seis features anteriores permanecem, totalizando oito seleções no escopo atual. A implementação está disponível para revisão visual; não se presume aceite humano.

|Feature vigente|Situação|Código|
|---|---|---|
|Tweakcn Graphite Green/três temas|Preservado/testado|src/theme/|
|React Bits Light Rays|Background global da interface, contínuo na navegação; [correção e evidências](GLOBAL_LIGHT_RAYS.md)|src/components/visual/LightRays.tsx e RaysBackdrop.tsx|
|React Bits Magic Bento|Preservado/testado|src/components/visual/MagicCard.tsx|
|Magic UI Magic Card (substituição MIT aprovada)|Implementado/testado|src/components/magicui/magic-card.tsx|
|shadcn Donut|Preservado/testado|src/components/analytics/CategoryDonut.tsx|
|Tremor ProgressBar|Preservado/testado|src/components/tremor/ProgressBar.tsx|
|shadcn/ui Sidebar (substituição MIT aprovada)|Implementado/testado|src/components/ui/sidebar.tsx e navigation/FinanceSidebar.tsx|
|Motion Primitives Text Morph|Preservado/testado|src/components/graphite/TextMorph.tsx|
|Stateful Button|Retirado pelo proprietário|Não implementado|

[Fontes MIT, dependências, adaptações e provas das substituições](MIT_REPLACEMENTS.md). Nenhum código Aceternity foi publicado. As seções abaixo registram a decisão inicial e os bloqueios anteriores; não representam o escopo atual.

## Histórico: matriz de alocação definida antes do código

| # | Feature | Região | Função | Dependências | Demonstração |
|---|---|---|---|---|---|
|1|Tweakcn escolhido|Global|tokens e fontes, três temas|Tailwind/Plus Jakarta local|três capturas + mapa de tokens|
|2|React Bits Light Rays|hero do panorama|luz verde contida|WebGL2 nativo, lazy|vídeo e fallback reduced motion|
|3|React Bits Magic Bento|grid de indicadores|cartões assimétricos, spotlight/borda|componente adaptado existente|hover real + tamanhos diferentes|
|4|Aceternity Card Spotlight|contexto de leitura e Planejamentos|spotlight complementar|fonte/licença oficiais a verificar|ponteiro fora do Bento|
|5|shadcn Donut|distribuição de despesas fora do cartão|agrupamento por categoria|Recharts + ChartContainer|fixture com totais e estado vazio|
|6|Tremor ProgressBar|reembolsos na competência|fração recebida do total de reembolsos cadastrados|Tremor Raw + tailwind-variants|barra com valores reais lidos|
|7|Aceternity Sidebar|global|navegação expansível/mobile|Motion, fonte/licença oficiais|teclado, Escape, vídeo|
|8|Motion Primitives Text Morph|rótulo da competência|transição de contexto real|motion/react|troca de período + reduced motion|
|9|Aceternity Stateful Button|aparência|salvar preferência de tema real|Motion, fonte/licença oficiais|pending → sucesso/erro de storage|

Bloqueio inicial: ui.aceternity.com retornou 403 CONNECT no proxy. Não substituir componentes nem alegar integração enquanto os fontes/licença não puderem ser verificados. Demais implementações e testes prosseguem.

## Histórico: primeira execução parcial, antes das substituições MIT

|#|Situação|Código|Evidência/licença|
|---|---|---|---|
|1|Implementado/testado|src/theme/tweakcn-tokens.css, graphite-overrides.css, public/theme-init.js|TOKEN_MAP.md; fonte Plus Jakarta Sans local, SIL OFL em docs/licenses|
|2|Implementado/testado|src/components/visual/LightRays.tsx, RaysBackdrop.tsx|vídeo; React Bits MIT + Commons Clause preservada|
|3|Implementado/testado|src/components/visual/MagicCard.tsx, src/styles.css summary-grid|Bento assimétrico e hover no vídeo; React Bits|
|4|BLOQUEADO|não há componente Aceternity copiado|403 CONNECT; sem substituição aprovada|
|5|Implementado/testado|src/components/analytics/CategoryDonut.tsx, ui/chart.tsx|donut shadcn/Recharts, MIT; duas categorias, total R$400 sintético|
|6|Implementado/testado|src/components/tremor/ProgressBar.tsx, analytics/RefundProgress.tsx|Tremor Raw v0.0.3 adaptado, Apache-2.0 integral preservada; R$75 recebidos / R$100 cadastrados|
|7|BLOQUEADO|menu anterior preservado|403 CONNECT; não alegar nova Sidebar|
|8|Implementado/testado|src/components/graphite/TextMorph.tsx|competência real muda nov/dez no vídeo; Motion Primitives MIT|
|9|BLOQUEADO|preferência continua com comportamento existente|403 CONNECT; não há Stateful Button substituto fictício|

Não há exclusões por prioridade: as três seleções Aceternity continuam requisitos pendentes. A mudança de rede tentada pelo proprietário ainda não foi observada na máquina (revisão 1, lista adicional vazia na consulta após a tentativa). Precisamos dos fontes e licença oficiais acessíveis para concluir. Nenhuma implementação equivalente não autorizada foi criada.

## Fontes e dependências

- React Bits commit 9d9c687dc4f55b23539aa5417b703078047efa74: src/ts-default/Backgrounds/LightRays, substitui o Aurora antigo (removido para não empilhar fundos). WebGL2 nativo, sem novas dependências de renderer. Wrapper carrega lazy e usa fundo estático em mobile/reduced-motion/saveData; fonte oficial controla viewport/aba oculta e limpeza.
- Tremor Raw commit ca4d588f47820ff3d514d37fa4ee08a4222dec11: src/components/ProgressBar/ProgressBar.tsx. Alterados import cx e cores para tokens Finly; lógica e estrutura preservadas, indicador identificado por tremor-id. Não foi instalado framework Tremor inteiro.
- Motion Primitives commit 120f64f6ca60348e251f929e9c81f11ccbe45eda: components/core/text-morph.tsx; acrescentado fallback estático via useReducedMotion.
- shadcn/ui: ui/chart.tsx e charts/chart-pie-donut.tsx do registry new-york-v4 oficiais. Removidos dados demo e bindings substituídos por despesas reais lidas, sem alterar src/lib/legacy.ts.
- Novas dependências diretas: motion (Text Morph), recharts (donut shadcn), tailwind-variants (Tremor Raw), @fontsource-variable/plus-jakarta-sans (fontes servidas localmente). @types/node só desenvolvimento para metadados de build. Licenças dos fontes em docs/licenses; lockfile contém versões/integridades.

## Significado dos dados

O donut soma somente kind=out em centavos por categoria na competência. Compras no cartão, receitas e reembolsos não entram. Não se trata de caixa confirmado nem saldo. Não existem pagamentos de fatura criados pela prévia. Reembolsos recebidos usam status=received; a ProgressBar compara recebidos e total de reembolsos cadastrados, mantendo pendentes como expectativa. Nenhum dado de teste é incluído em src ou no storage de produção.

## Testes e evidências

- npm run check, build, test:static, teste público e node --check legado passaram. npm audit --omit=dev: zero vulnerabilidades na consulta. npm ci foi reexecutado com sucesso na checagem final.
- tests/check_react_visual.py foi adaptado para os nomes novos e valores OKLCH, preservando testes de dados, preferências antigas, storage negado, WebGL, responsividade e contraste 4,5:1 dos pares semânticos. As capturas desse teste agora vão para /tmp para não sobrescrever histórico anterior.
- tests/check_graphite.py gera comparações da mesma fixture, competência e viewport. Valida somas 1000/400/500/75, duas categorias e total400, Tremor 7500/10000 centavos, período vazio, morph/reduced motion, quatro viewports e JSON financeiro invariável. Vídeo real capturado via CDP e codificado pelo FFmpeg do sistema, sem dependência de download do FFmpeg Playwright.
- Testes check_theme.py e check_premium.py existentes passaram sobre public/legacy. Módulo financeiro e cópia legada permanecem byte a byte iguais à base.
- Chart e Light Rays têm chunks separados. Build aproximado: principal 466kB/154kB gzip; donut 342kB/102kB gzip; Light Rays 14kB/5,5kB gzip; fonte27kB; CSS43kB/9kB gzip. Sem aumentar limite de warning artificialmente.

|Tema|Antes desktop|Depois desktop|Antes mobile|Depois mobile|
|---|---|---|---|---|
|Customizado (antigo Aurora → Graphite)|[antes](evidence/before-graphite-desktop.png)|[depois](evidence/after-graphite-desktop.png)|[antes](evidence/before-graphite-mobile.png)|[depois](evidence/after-graphite-mobile.png)|
|Escuro Padrão|[antes](evidence/before-dark-desktop.png)|[depois](evidence/after-dark-desktop.png)|[antes](evidence/before-dark-mobile.png)|[depois](evidence/after-dark-mobile.png)|
|Claro|[antes](evidence/before-light-desktop.png)|[depois](evidence/after-light-desktop.png)|[antes](evidence/before-light-mobile.png)|[depois](evidence/after-light-mobile.png)|

[Vídeo real das interações disponíveis](evidence/interactions-graphite.webm). Não demonstra os três componentes bloqueados; não constitui evidência de 9/9 nem aceite humano.

## Histórico: bloqueios de deploy e retomada anteriores

Projeto Pages informado pelo proprietário: finlyr. A tentativa de consultar a URL padrão finlyr.pages.dev foi bloqueada por 403 CONNECT; não foi possível confirmar conteúdo, deployment ou correspondência de SHA. Não se apresenta esse endereço como preview confirmado.

O build agora gera build-info.json com SHA/branch do Cloudflare (CF_PAGES_COMMIT_SHA/CF_PAGES_BRANCH) ou Git local. Ao liberar acesso, comparar esse arquivo no deployment da Finly-React com o SHA enviado, sem alterar o projeto da main.

Para concluir: liberar ui.aceternity.com no ambiente em execução ou disponibilizar os fontes e licença oficiais de Sidebar/Card Spotlight/Stateful Button; integrar os três nas regiões já definidas, completar teste/gravação, verificar deployment e submeter 9/9 ao aceite humano. Não é necessária nova autorização genérica de escopo: ela já foi dada.
