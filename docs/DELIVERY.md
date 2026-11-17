# Entrega — Finly UI Lab

## Resultado

Aplicação independente em `/workspace/Finly-UI-Lab`, branch local `main`. O repositório original Finly permaneceu limpo no commit `07e6a2b38c6b1c22cfb83ef4cb606ed5578399df`, sem alterações de código, branches ou dados. Não houve publicação/deploy do Finly.

As dez etapas de desenvolvimento estão registradas em [PROGRESS.md](PROGRESS.md). Há seis áreas de navegação, editor visual com três níveis, playground com componentes compilados, dez contextos de preview fictícios, temas, favoritos, comparação, histórico, reordenação por ponteiro/teclado e exportações de design. Formulários do preview são demonstrativos e não criam transações.

### Stack

React 19, TypeScript, Vite 7, Tailwind 4, componentes shadcn/ui MIT, Radix Dialog/Slot, Motion, Magic UI MIT, Recharts, Zustand, dnd-kit, Lucide, Fontsource, Vitest e Playwright Python. Versões exatas no lockfile. Fontes locais: Plus Jakarta Sans, Geist, Inter, Manrope e DM Sans.

### Catálogo

- shadcn/ui: 65 entradas; 3 demonstrações originais integradas.
- React Bits: 1.278 variantes de registry; **somente referências** por restrições de licença.
- Magic UI: 259 entradas; 3 demonstrações originais integradas.
- TweakCN: 36 temas Apache-2.0, aplicáveis nas variantes clara/escura.
- Recharts: 65 referências de exemplos oficiais e 7 modelos funcionais locais da API original.
- Aceternity: 3 referências oficiais identificadas; a enumeração completa não ficou acessível.

Total: **1.713 entradas de catálogo, 13 demonstrações de componentes/modelos compilados e 36 temas aplicáveis**. Variantes não são contadas como componentes únicos. Não existe alegação de 1.713 demonstrações locais. O catálogo distingue referência, integração, licença restritiva e disponibilidade desconhecida. O filtro premium não inventa itens premium a partir de metadados insuficientes.

## Testes finais

- TypeScript: aprovado.
- ESLint: aprovado.
- Vitest: 9 testes aprovados, incluindo resolução dos níveis, temas independentes, exportação, unidades CSS, unicidade do catálogo e recusa de configuração inválida.
- Build de produção: aprovado. Catálogo separado em chunk de aproximadamente 73 KB gzip; runtime React ~69 KB gzip; gráficos ~146 KB gzip sob demanda. Há aviso de tamanho bruto dos chunks de catálogo/Recharts, sem falha de build. Paginação limita a renderização a 24 entradas e o playground limita composições a 24 instâncias.
- Chromium — `tests/browser.py`: seis áreas, busca/filtros, comparação, favorito, adição, undo/redo, estilos por categoria/instância, persistência/reload e exportações JSON/CSS; larguras 1440, 768, 390 e 360 px; sem erros JavaScript ou overflow horizontal de documento.
- Chromium — `tests/advanced.py`: reordenação por teclado e undo, sete modelos de gráfico, comparação de snapshot, aplicação TweakCN, foco/Tab/Escape de modal Radix, dez contextos de preview, armazenamento corrompido preservado e quota com aviso. Rodada adicional conferiu o Magic Card original com movimento normal/ponteiro e o desligamento explícito para a superfície estática identificada.
- Axe — `tests/accessibility.py`: **12 varreduras AA**, seis áreas × desktop/mobile, sem violações detectadas no tema inicial. O teste principal também executa varredura AA da Home. Relatórios em `docs/evidence`.
- `npm audit --omit=dev`: zero vulnerabilidades conhecidas nas dependências de produção.

Temas arbitrariamente editados pelo usuário podem perder contraste; o painel calcula a relação texto/fundo ao vivo. A avaliação automatizada não é certificação humana WCAG e não inclui leitor de tela ou aparelho físico. Não foi alegada validação de cada combinação possível de tokens.

## Evidências

- [Home desktop](evidence/overview-desktop.png) · [mobile](evidence/overview-mobile.png).
- [Biblioteca desktop](evidence/library-desktop.png) · [mobile](evidence/library-mobile.png).
- [Playground desktop](evidence/playground-desktop.png) · [mobile](evidence/playground-mobile.png).
- [Identidade desktop](evidence/identity-desktop.png) · [mobile](evidence/identity-mobile.png).
- [Preview desktop](evidence/preview-desktop.png) · [mobile](evidence/preview-mobile.png).
- [Formulário demonstrativo](evidence/entry-form-desktop.png).
- [Magic Card original com movimento normal](evidence/magic-card-motion.png).
- [Presets mobile](evidence/presets-mobile.png).

Todos os valores são sintéticos. Nenhum extrato, anexo ou backup pessoal foi utilizado.

## Limitações externas e itens não declarados como concluídos

1. **GitHub:** mesmo após o proprietário informar a criação do repositório, o acesso Git pelo ambiente retornou `Repository not found`. A API também retornou `Forbidden`. Isso impede confirmar o remoto e fazer push; não indica que o repositório não exista para o proprietário. Commits e pacote locais ficam preservados para envio quando este ambiente tiver acesso ao repositório independente.
2. **React Bits:** a licença atual e revisões anteriores examinadas contêm restrições de redistribuição/UI kits e ferramentas semelhantes. Nenhum código foi incorporado. Aurora, Light Rays e demais efeitos desta fonte não foram implementados por imitação nem declarados integrados.
3. **Aceternity:** HTTP 403 impediu enumeração e licença adequada não foi confirmada. Apenas referências conhecidas são apresentadas, sem copiar código ou presumir gratuidade/MIT.
4. **Catálogo:** snapshots não asseguram que todos os produtos externos existentes estejam listados. A enumeração cobre os índices oficiais acessíveis e a árvore de exemplos Recharts obtida; dependências ausentes nos índices são explicitadas, não inventadas.
5. **Previews:** são composições visuais, com dados e interações demonstrativos, não o Finly funcional nem um segundo motor financeiro. Fundos sólidos/gradiente próprio e padrões MIT são executáveis; efeitos restritos ficam apenas referenciados.

## Publicação

Cloudflare Pages: conectar `Finly-UI-Lab`, branch `main`, raiz `/`, Node 24, comando `npm run build`, saída `dist`. Sem secrets/backend. Não houve deploy automático. Ver README para execução e sincronização de catálogos.
