# Finly React: fases visuais 0–2

## Auditoria antes da implementação

Base remota: 913bfa9, branch existente Finly-React. O checkout local desse mesmo ramo foi estabelecido para acompanhar o remoto; nenhum ramo remoto novo será criado. A instrução explícita do proprietário substitui a recomendação genérica codex/... de AGENTS.md. main não será alterada nem receberá PR.

Arquitetura: React 19, TS, Tailwind 4 via plugin Vite 7; App contém temas, navegação, hero, quatro somatórios descritivos e listagem. src/lib/legacy.ts é somente leitura; public/legacy contém a versão funcional. Não havia lockfile, componentes shadcn, alias @ ou Aurora/Magic Bento reais. Barras existentes são decorativas; substituir por estado neutro para evitar leitura financeira incorreta.

Critérios definidos antes da implementação: manter bytes do legado e módulo financeiro; três temas persistentes com fallback original; aplicar tema antes do paint; Button/Card shadcn realmente usados; Aurora oficial localizado atrás do hero, sem executar fora da viewport/aba, DPR limitado, fallback sem WebGL/movimento reduzido e controle de efeitos; Magic Bento reduzido a pointer coordinates, spotlight e borda, sem tilt/partículas; quatro tamanhos de viewport, storage inválido/negado sem escrita, mesmas somas e /legacy no build.

Fontes consultadas em 11/11/2026: repositórios oficiais DavidHDev/react-bits (src/ts-default/Backgrounds/Aurora e Components/MagicBento), shadcn-ui/ui (apps/v4/registry/new-york-v4/ui/button.tsx e card.tsx). Licenças integrais preservadas em docs/licenses. React Bits usa MIT + Commons Clause: permitido dentro desta aplicação, proibida revenda/redistribuição dos componentes isolados; não tratar como MIT irrestrita. shadcn: MIT, copyright 2023 shadcn. Tweakcn Midnight Bloom/Northern Lights são referências de composição/paleta, sem importação de framework. Motion/Aceternity/Magic UI/Charts não serão instalados: fases 3–5 não autorizadas.

Riscos: WebGL em mobile, loops reduzidos, CSS global, perda de preferência/FOUC e dados insuficientes. Mitigações e resultados finais abaixo após testes.

## Procedência e adaptações

| Componente | Fonte fixada | Adaptação usada |
| --- | --- | --- |
| Aurora | React Bits `9d9c687dc4f55b23539aa5417b703078047efa74`, src/ts-default/Backgrounds/Aurora | Shader e renderer oficiais locais; wrapper lazy, DPR 1, velocidade 0,15, opacidade baixa; fallback CSS para mobile, reduced motion, saveData ou ausência/perda de contexto. Eventos/RAF limpos no unmount e pausados por visibilidade/intersection. Sem ogl/GSAP. |
| Magic Bento | Mesmo commit, src/ts-default/Components/MagicBento | Apenas coordenadas locais do ponteiro e gradiente radial/máscara da borda; não copiar demos, springs ou partículas. DOM informativo, sem onClick/tab artificial. Sem loops por quadro. |
| Button / Card | shadcn-ui/ui `dd41d19e2f80ff6891951f7ced74c2c9a650b065`, apps/v4/registry/new-york-v4/ui | Button com variants/CVA e Slot dedicado em vez do agregador radix-ui. Card retém só primitive usado. Imports @/lib/utils, tokens Tailwind v4, data-slot; usados no seletor, ação real, resumo e telas informativas. |

Hashes SHA-256 dos fontes consultados (antes das adaptações):

- `Aurora.tsx`: `1571a3ed7bb71bf74990c82a386b35faa71596505e95476ebc4769631537c611`
- `MagicBento.tsx`: `e0b422ca17c1494b905fb8483413823a3215d5ee65d7cfc9c71c4116fd3c69f4`
- `MagicBento.css`: `5ccc3d3d1a9eb9899635eef390a524428622a66e190e573e1d212e71fb1d1cb6`
- `button.tsx`: `79dd6f75f8136394442202d6b8b922fb269eaad0a5dba579397c9d5b41f893bb`
- `card.tsx`: `ef8305b12c3112dab42a4708b41b1ebcc042fa5ab4c20f039da8d45b09ed5059`

## Dependências e desempenho

Adições diretas usadas: @radix-ui/react-slot (composição acessível de link no Button), class-variance-authority (variants oficiais), clsx e tailwind-merge (cn shadcn). Nenhuma biblioteca de animação/gráfico/serviço. Vite/React/Tailwind existentes foram resolvidos pelo primeiro lockfile; versões exatas e integridades estão em package-lock.json. CI usa npm ci. O Aurora consultado já usa WebGL2 nativo e não requer ogl.

Baseline após instalação: check/build/test:static, teste público e node --check legado passaram. npm install precisou cache gravável em /workspace/.npm-cache; a primeira tentativa no cache padrão falhou por permissão/caminho, sem mudar verificação TLS.

Build final aproximado: JS principal 272 kB (86 kB gzip), Aurora lazy 11,6 kB (5 kB gzip), CSS principal 31,7 kB (7,7 kB gzip). Baseline: JS 235 kB (73,7 kB gzip), CSS 15,5 kB (4,4 kB gzip). Sem aviso de chunk grande. npm audit --omit=dev: zero vulnerabilidades no momento da consulta; não é garantia futura.

## Evidências e limites

- tests/check_react_visual.py serve dist e verifica três temas/persistência/fallback antigo, valores fixos 100/20/30/5 com reembolso prometido excluído, ausência de escrita financeira, telas existentes, quatro viewports, hover, reduced motion/touch, storage inválido/negado, falta de WebGL e bytes servidos do legado. Usa somente fixture sintética em contexto descartável.
- Pares de tokens semânticos texto/fundo, atenuado/card, positivo/card e primário/foreground são verificados com razão mínima 4,5:1. Isso não constitui certificação WCAG integral. WebGL2 disponível e contexto não perdido verificados no preview de produção no Chromium do ambiente; não há benchmark de GPU física de celular. Mobile usa fallback deliberadamente.
- Card informativo não ganhou ação nem parada extra de Tab. Foco segue disponível nos controles reais; spotlight não cobre texto nem intercepta ponteiro.
- Legado e src/lib/legacy.ts permanecem idênticos aos da base; build contém dist/legacy/ completo. Dados só são compartilhados entre React e legado quando origem é a mesma; /legacy é apenas um caminho dessa origem. Origem da produção antiga permanece isolada.

| Evidência | Desktop | Mobile |
| --- | --- | --- |
| Antes (vazio) | [antes](react-visual/before-desktop.png) | [antes](react-visual/before-mobile.png) |
| Depois (vazio, comparável ao antes) | [depois](react-visual/after-empty-desktop.png) | [depois](react-visual/after-empty-mobile.png) |
| Aurora (fixture sintética) | [depois](react-visual/aurora-1440.png) | [depois](react-visual/aurora-390.png) |
| Escuro Padrão | [depois](react-visual/dark-1440.png) | [depois](react-visual/dark-390.png) |
| Claro | [depois](react-visual/light-1440.png) | [depois](react-visual/light-390.png) |

[Hover Aurora](react-visual/aurora-hover.png). Antes vazio e depois sintético têm conteúdos diferentes; não se trata de comparação de pixel financeira.

Fases 3, 4 e 5 permanecem **somente planejadas**: sidebar/abas animadas, gráficos/tickers com dados validados e migração das telas funcionais, respectivamente. Nenhum dado v2 ou função financeira nova foi criado. A prévia não substitui o Finly funcional. Aguarda revisão visual e autorização do proprietário antes de avançar.

Cloudflare: manter projeto antigo/main; projeto React separado usa branch Finly-React, npm run build, saída dist, raiz do repo. Nenhuma URL de deployment foi confirmada por ferramenta nesta sessão, portanto não há link de preview inventado.

Resultado final: npm ci, check, build, test:static, teste público e node --check legado passaram. Teste visual React passou, assim como check_theme.py e check_premium.py existentes sobre a cópia legada. Nenhum assert existente foi removido.
