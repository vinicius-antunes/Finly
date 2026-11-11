# Substituições MIT aprovadas — Sidebar e Magic Card

## Escopo e procedência

O proprietário escolheu expressamente **shadcn/ui Sidebar + Magic UI Magic Card**. O Stateful Button foi removido do escopo. Não são componentes Aceternity e não são apresentados como tal. A implementação é oferecida para revisão visual, sem presumir aceite humano.

Nenhum registry ou fonte Aceternity/CanvasRevealEffect foi commitado ou publicado. As extrações temporárias de auditoria foram removidas do checkout antes de commits. @react-three/fiber, three, @types/three e @tabler/icons-react foram removidos e não fazem parte da entrega. Os anexos originais do proprietário permanecem fora do repositório.

| Seleção aprovada | Fonte oficial consultada | Código e uso no Finly | Licença |
|---|---|---|---|
|shadcn/ui Sidebar|shadcn-ui/ui, commit dd41d19e2f80ff6891951f7ced74c2c9a650b065, apps/v4/registry/new-york-v4/ui/sidebar.tsx e hooks/use-mobile.ts|src/components/ui/sidebar.tsx; src/components/navigation/FinanceSidebar.tsx monta os primitives oficiais na aplicação|MIT, copyright 2023 shadcn; docs/licenses/shadcn-ui.txt|
|Magic UI Magic Card|magicuidesign/magicui, commit 1ac985adca3cdfab9b1739253fd14209687c4e9c, apps/www/registry/magicui/magic-card.tsx|src/components/magicui/magic-card.tsx; FeatureCard em Planejamentos e Sobre a migração|MIT, copyright Magic UI; docs/licenses/magic-ui.txt|

Os fontes oficiais foram baixados de raw.githubusercontent.com. Imports, avisos e adaptações foram conferidos; não houve reaproveitamento do código Aceternity fornecido.

## Adaptações concretas

- Sidebar preserva Provider, estados expanded/collapsed, variante icon, Sheet no mobile, atalho Ctrl/Cmd+B, Tooltip e primitives de menu oficiais. Planejamentos usa o Collapsible oficial, com expansão independente e indicação honesta de que metas aguardam migração. Não há metas falsas ou botão que finja criar registros.
- O hook de breakpoint oficial distingue desktop e mobile. O Sheet/Radix controla foco modal, Tab, Escape e overlay. Rótulos foram traduzidos; o foco retorna ao botão de menu após fechar. O controle é um botão de verdade, com aria-expanded e nome acessível.
- O cookie opcional do exemplo foi removido; o estado de navegação é mantido somente em memória. Não se alteram preferências ou chaves financeiras.
- Primitives auxiliares oficiais copiados: Sheet, Tooltip, Separator, Input, Skeleton, Collapsible. O Sidebar os referencia; não há instalação de framework paralelo.
- Magic Card mantém useMotionValue, useMotionTemplate, springs, reset ao sair/perder foco/ocultar aba e gradientes de superfície/borda do fonte oficial. Usa modo gradient; o modo orb do fonte não é ativado. O tema é recebido do contrato já existente, substituindo next-themes para evitar outro provedor.
- Cores originais violeta/rosa foram substituídas por verde semântico. O texto informativo foi aproximado do foreground para manter legibilidade no ponto mais iluminado do hover. O brilho de superfície é 0,24 em Graphite, 0,12 em Escuro Padrão e 0,16 em Claro. O componente é usado somente nos cartões informativos, separado do Magic Bento financeiro.
- Reduced motion não atualiza coordenadas de hover; camadas decorativas ficam ocultas em reduced motion e touch. Os cartões continuam legíveis e não viram botões. Selecionar/copiar texto continua possível.

## Dependências efetivamente usadas

Adicionadas: @radix-ui/react-dialog (Sheet acessível), @radix-ui/react-tooltip, @radix-ui/react-separator, @radix-ui/react-collapsible, lucide-react (ícones usados pela Sidebar/Sheet) e tw-animate-css (animações oficiais do Sheet). Motion, CVA, Radix Slot, cn e Tailwind já existiam.

Foram usados módulos Radix dedicados no lugar do agregador radix-ui do registry. Licenças/atribuições das dependências de apoio estão em docs/licenses/sidebar-dependencies.txt; Lucide usa ISC e os demais MIT. package-lock.json conserva versões e integridades. Não foram instalados next-themes, Three ou um renderer 3D.

## Validação e evidências

Comandos: npm ci; npm run check; npm run build; npm run test:static; python3 tests/check_public_release.py; node --check public/legacy/assets/theme.js; python3 tests/check_react_visual.py; python3 tests/check_graphite.py; python3 tests/check_navigation_cards.py. Os testes de navegador requerem ferramentas locais de desenvolvimento já disponíveis (Python Playwright, Chromium e FFmpeg), não dependências do app.

O novo teste verifica três temas, quatro viewports, alternância por clique/Enter/Ctrl+B, Planejamentos por Space, tooltip/nomes acessíveis preservados, trap de Tab, Escape, retorno de foco, navegação fechando drawer, hover real, seleção de texto, reduced motion, touch e nenhuma escrita financeira. O JSON financeiro permanece idêntico. Os testes anteriores cobrem as seis features já publicadas, preferências antigas, storage inválido/negado, parcelas e backup do legado.

| Evidência sintética | Graphite | Escuro Padrão | Claro |
|---|---|---|---|
|Cartões e Sidebar desktop|[captura](replacements/graphite-cards-desktop.png)|[captura](replacements/dark-cards-desktop.png)|[captura](replacements/light-cards-desktop.png)|
|Drawer mobile|[captura](replacements/graphite-mobile-drawer.png)|[captura](replacements/dark-mobile-drawer.png)|[captura](replacements/light-mobile-drawer.png)|
|Cartões mobile|[captura](replacements/graphite-cards-mobile.png)|[captura](replacements/dark-cards-mobile.png)|[captura](replacements/light-cards-mobile.png)|

[Gravação real: Sidebar, expansão, navegação e hover do Magic Card](replacements/navigation-magic-card.webm). Todas as imagens/gravações usam fixtures fictícias em contextos descartáveis. Não contêm backups nem dados pessoais.

Build com runtime React compartilhado em chunk próprio para cache estável entre mudanças de UI; não se aumentou o limite de warning. Aproximadamente: JS principal342kB/118kB gzip, runtime222kB/69kB gzip, donut lazy342kB/102kB gzip, Light Rays lazy14kB/5,5kB gzip; CSS71kB/13,5kB gzip. Não há warning de chunk maior que 500kB. Sem certificação WCAG integral ou benchmark em GPU física de celular.

Branch exclusiva Finly-React. Nenhum PR, merge ou alteração da main. Não há deployment Cloudflare confirmado nesta sessão; os arquivos build-info.json no deployment permitem conferir SHA/branch quando houver acesso. O produto continua prévia somente de leitura, com a versão completa preservada em /legacy/.
