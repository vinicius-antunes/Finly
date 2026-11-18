# Finly UI Lab

Workspace estático e independente para explorar referências, editar identidade visual e experimentar composições do Finly. **Não é uma aplicação financeira:** valores e registros do preview são fictícios e não são persistidos como transações. O código e o armazenamento do aplicativo financeiro permanecem intactos. O laboratório fica exclusivamente na branch `codex/finly-ui-lab` do repositório `vinicius-antunes/Finly`, com aplicação e histórico próprios.

## Executar

Requer Node 24 e npm.

```sh
npm ci
npm run dev
```

Abra a URL exibida pelo Vite. Navegação por hash permite links diretos sem servidor de aplicação. Não há autenticação, API financeira, telemetria, banco remoto ou fonte externa carregada em runtime.

## Ferramentas

- **Visão geral:** composição de entrada, cinco presets distintos e acesso direto às ferramentas.
- **Biblioteca:** 1.713 entradas de snapshots públicos, busca, filtros, paginação de 24 itens, favoritos, comparação de até três referências, links oficiais, código/origem e comandos. As miniaturas de referências são sinalizadas como referências; não pretendem reproduzir componentes não integrados.
- **Identidade:** tokens globais, sobrescritas por categoria e por instância; 36 cores, formatos CSS/HEX/RGB/HSL (incluindo transparência em CSS), cinco fontes locais, tamanhos, espaçamento, dimensões, bordas, sombras e opções de comportamento/modelos. Propriedades se aplicam aos elementos correspondentes; controles de gráfico não alteram elementos sem gráfico.
- **Playground:** 13 demonstrações compiladas, adição/remoção, dnd-kit para reorganização, seleção de instância, propriedades em tempo real, histórico de 50 etapas, desfazer/refazer, captura e comparação do estado anterior, fullscreen e larguras desktop/tablet/mobile. A comparação captura o design e os componentes, não uma imagem fabricada.
- **Preview:** dez contextos visuais — Home, Lançamentos, Parcelas, Cartões/contas, Planejamentos, Cofrinhos, Reembolsos, Calendário, Configurações e formulário. Busca e ordenação da tabela, eventos demonstrativos, detalhes e formulário com validação; modais Radix com foco/Escape. Sidebar com controle de fixação e hover quando disponível.
- **Presets/favoritos:** cinco estilos iniciais, cópia, renomeação, restauração e configurações independentes. Aplicação dos 36 temas oficiais TweakCN em variantes clara/escura, com mapeamento de tokens e preservação da licença Apache-2.0. Fontes comparáveis lado a lado.
- **Exportar design:** JSON versionado com tokens, overrides, layout, componentes, dependências, referências e animações; variáveis CSS; resumo Markdown para implementação posterior. Nenhum backup financeiro.

Preferências usam exclusivamente `finly-ui-lab:v1`. Há validação estrutural, limites, bloqueio de valores CSS perigosos, gravação adiada com flush ao fechar/recarregar e tratamento de quota. Um snapshot inválido é preservado até autorização explícita para novos ajustes. Limpar os dados do navegador elimina as preferências locais: exporte os designs que deseja guardar.

## Catálogo real e licenças

| Fonte | Entradas catalogadas | Demonstrações locais |
|---|---:|---:|
| shadcn/ui | 65 | 3 — Button, Card e Input originais, imports adaptados |
| React Bits | 1.278 variantes | 0 — licença restritiva para este tipo de ferramenta |
| Magic UI | 259 | 3 — Magic Card, Dot Pattern e Grid Pattern originais |
| TweakCN | 36 temas | aplicação dos tokens nos presets (não contada como demo de componente) |
| Recharts | 65 exemplos + 7 modelos locais | 7 — barras, linhas, área, donut, pizza, radial e combinado |
| Aceternity | 3 referências identificadas | 0 — enumeração bloqueada e redistribuição não autorizada |

**1.713 é o número de entradas/variantes, não 1.713 implementações ou componentes únicos.** Os modelos Recharts são composições da API original instalada, não cópias dos 65 exemplos. Componentes originais integrados ficam em `src/components/ui` e `src/vendor/magicui`; seus avisos estão em `docs/licenses`. Fontes são OFL e Recharts/Magic/shadcn são MIT; TweakCN é Apache-2.0.

A licença atual do React Bits contém Commons Clause e restrições específicas para UI kits, ferramentas e serviços semelhantes a seus laboratórios. Revisões anteriores examinadas também contêm restrições. Portanto **nenhum código React Bits foi incluído**. Aurora, Light Rays, partículas e demais efeitos dessa origem permanecem referências; não são imitados nem anunciados como integrados. O background de referência disponível utiliza padrões MIT originais e um gradiente CSS próprio, identificado separadamente. Aceternity retornou HTTP 403 e permanece somente referência; não se presume licença MIT nem disponibilidade gratuita/premium onde isso não foi verificado.

Atualizar snapshots:

```sh
npm run sync:catalog -- --fetch
```

Cada adaptador tem fonte oficial e fallback no snapshot local. Falhas de sincronização não impedem o build offline. `docs/catalog-sync.json` registra contagens e limitações. O build normal não busca nem executa código remoto. Importar novos componentes exige revisão manual, dependências, licença e compilação; nenhum registry desconhecido é executado no navegador.

## Verificações

```sh
npm run check
npm run lint
npm test
npm run build
npm run test:e2e
```

E2E usa Python Playwright e Chromium instalado em `/usr/bin/chromium` ou no cache do Playwright: `pip install playwright` e `python -m playwright install chromium`. Os testes verificam navegação, filtros, comparação, favoritos, adição, undo/redo, níveis de propriedades, persistência/reload, exportações e layouts em 1440/768/390/360 px. Auditoria axe AA automatizada não substitui avaliação humana de acessibilidade.

A folha do laboratório é isolada da superfície dos previews. Tokens alterados livremente pelo usuário podem resultar em contraste insuficiente; os temas iniciais não devem ser tomados como certificação de qualquer composição criada. Movimento reduzido desativa transições/animações; o Magic Card assume uma superfície estática shadcn/Card identificada quando o efeito é pausado; apenas um modelo de gráfico é carregado sob demanda por instância. A paginação evita renderizar o catálogo inteiro.

## Cloudflare Pages

1. Crie um projeto Pages próprio para o laboratório e conecte `vinicius-antunes/Finly`. Não altere o projeto Pages do aplicativo financeiro.
2. Branch de produção **desse projeto Pages do laboratório**: `codex/finly-ui-lab`. Root directory: `/` (o laboratório ocupa a raiz dessa branch).
3. Build: `npm run build`. Saída: `dist`. Defina `NODE_VERSION=24`.
4. O projeto não exige secrets, Functions ou backend. `_headers` e `_redirects` são copiados ao build.

Não foi realizado deploy por este ambiente. A opção de repositório separado foi substituída, por decisão do proprietário, por uma branch exclusiva no repositório existente. O conteúdo dessa branch é somente o UI Lab; `main`, `Finly-React` e `codex/finly-navegacao-ux` não recebem mudanças. Para obter o laboratório, use `git clone --single-branch --branch codex/finly-ui-lab https://github.com/vinicius-antunes/Finly.git Finly-UI-Lab`.

## Escopo e limites

Os componentes catalogados sem integração só abrem fontes oficiais. Não há renderização arbitrária de código remoto, editor de código, motor financeiro, upload de extratos ou armazenamento de transações. Dimensões mobile no preview são simulações por largura do contêiner, não emulação completa de um dispositivo. As páginas do preview são composições visuais com dados de exemplo, não réplicas funcionais do Finly. Efeitos que dependem de licença bloqueada não são substituídos por imitações. Veja `docs/DELIVERY.md` para resultados e pendências externos.
