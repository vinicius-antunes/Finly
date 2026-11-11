# Migração funcional React — inventário e matriz

Base: ba45899. Exclusivamente Finly-React; sem PR/merge. O legado continua intacto.

|Área original|Referência no legado|Destino React|
|---|---|---|
|Persistência e backup|starter/load/save/validState/exportJSON/import-file|finance/model, storage, transferência explícita|
|Lançamentos e filtros|openEntry/handleSaveEntry/renderEntries|formulário e tabela React|
|Parcelas/recorrências|handleSaveEntry/renderInstallments|geração mensal em centavos, grupos e edição individual|
|Faturas|metrics/renderOverview/invoice-status|fatura por competência sem nova despesa ao quitar|
|Reembolsos|toggle/renderInstallments|previsto/recebido, vínculo e reversão|
|Dashboard|metrics/renderOverview|projeção, reserva separada, compromissos e gráficos|
|Planejamento|renderGoal/updateSimulator|meta e simulação sem gravar compras|
|Configurações|renderSettings/settings-form|referências financeiras e preferências|
|Pendências|assign-pending/dismiss-pending|atribuição explícita e descarte|
|Notificações|localAlerts/notificationReads|avisos locais e leitura persistida|
|Exportações|exportCSV/exportJSON/print|CSV, JSON e impressão|

Status de cada área, resultados e evidências serão registrados ao validar cada etapa. Não pressupõe conclusão funcional.

## Implementação entregue

As áreas da matriz estão integradas ao modo funcional v2. Na primeira visita, **Ativar Finly funcional** apresenta migração local, importação manual ou início vazio. Nenhuma gravação v2 ocorre antes da confirmação. A prévia antiga continua disponível enquanto a ativação não for concluída; avisos de somente leitura desaparecem quando o modo funcional está ativo.

### Importar o Finly original

1. Na versão original, exporte seu backup JSON e guarde-o em local privado.
2. Abra o deployment desta branch. Em **Ativar Finly funcional**, escolha os dados locais ou o arquivo JSON. Outro domínio não compartilha localStorage.
3. Confira quantidade de lançamentos/pendências/faturas, soma descritiva e exporte a prévia se desejar. O total da prévia não representa saldo bancário.
4. Confirme que guardou o backup e selecione **Confirmar ativação**. A origem v1 não é alterada. O manifesto v2 inclui hash SHA-256, data e original integral para rastreabilidade.
5. Para restaurar/substituir posteriormente, use **Ajustes e backup → Importar / restaurar backup**. Exporte primeiro o estado atual. Há nova prévia e confirmação; não há mesclagem silenciosa.

### Equivalência e limites

- Tipos, IDs, competências, parcelas isoladas, grupos, notas, categorias, responsáveis e previsões são preservados. Campos legados adicionais permanecem no original arquivado; nenhum histórico ausente é reconstruído.
- Valores são centavos inteiros. Ao criar parcelas, informa-se o valor de cada parcela. Recorrências criam somente as ocorrências solicitadas; após a primeira ficam previstas, como no legado.
- A projeção considera salário, entradas recebidas, reembolsos recebidos, fatura completa, despesas fora do cartão e margem. Reembolsos pendentes entram apenas por escolha explícita. Reserva é informada separadamente. Quitar fatura não gera despesa.
- Edição é individual. Exclusão de grupo inclui seus reembolsos e exige confirmação; exclusão individual também exige confirmação.
- Metas e simulação são os recursos da v1.1.1. Não há metas múltiplas, depósitos por meta, contas múltiplas, novos cartões, importação de extrato CSV, anexos, calendário, assinaturas avançadas, projeções avançadas ou widgets personalizáveis.
- Dados e backups ficam no navegador; JSON não é criptografado e pode conter o original completo. Limites: arquivos de importação até 4 MB, menos de 20 mil lançamentos, criação de até 120 parcelas/ocorrências por operação. Valores inválidos, duplicidade de IDs e totais fora do limite seguro abortam a operação.
- Existe controle de concorrência antes de gravar; atualização de outra aba carrega o estado validado e encerra uma edição aberta. Não há sincronização entre origens/dispositivos.
- Imprimir usa a impressão do navegador; CSV pode representar todos os registros ou a tabela filtrada e protege prefixos de fórmulas.
- Testes foram feitos no Chromium, não constituem certificação WCAG ou auditoria contábil integral. Não houve uso de dados pessoais nem validação do deployment Cloudflare por API.

## Arquivos

- `src/finance/model.ts`: tipos, validação, centavos, migração/backup, parcelas, métricas e CSV.
- `src/finance/storage.ts`: leitura validada, gravação com controle de concorrência e download local.
- `src/finance/FinanceApp.tsx`: ativação, formulários, lançamentos/filtros, faturas, grupos, reembolsos, planejamento, ajustes, backup e notificações.
- `src/App.tsx`: alterna prévia/ativação e aplicação funcional.
- `src/components/navigation/FinanceSidebar.tsx`: seções funcionais, mantendo hover/drawer e marca textual.
- `src/styles.css`: formulários, diálogos, responsividade e impressão usando os temas existentes.
- Testes: `tests/check_finance.mjs`, `tests/check_finance_browser.py`, atualizações de asserções de scaffold e alertas de armazenamento.

## Validação e evidências

Comandos usados:

```sh
npm ci --cache /tmp/finly-npm-cache
npm run check
npm run build
npm run test:static
node tests/check_finance.mjs
python3 tests/check_finance_browser.py
python3 tests/check_react_visual.py
python3 tests/check_navigation_cards.py
python3 tests/check_public_release.py
```

O cache padrão não era gravável neste ambiente; a instalação reproduzível passou usando cache em /tmp. Nenhuma dependência de produção foi adicionada.

Os testes de domínio comparam a função `metrics` do próprio legado com os novos cálculos, validam 2 × 33 / 3 × 19,99 / terceiros 3 × 25, vínculos, recebimentos separados, fatura sem duplicação, edição individual, backup roundtrip, idempotência, corrupção/IDs repetidos, concorrência e falha de quota. O navegador executa migração com confirmação, CRUD, filtros, grupos, status, ajustes, exportação/importação real, persistência, simulador, temas e drawer móvel. Também verifica que `saldoclaro-v1` permanece byte a byte igual.

Evidências sintéticas: [dashboard desktop](finance-evidence/dashboard-desktop.png), [mobile](finance-evidence/dashboard-mobile.png), [planejamento Graphite](finance-evidence/Graphite-planning.png), [Escuro Padrão](finance-evidence/Escuro-planning.png), [Claro](finance-evidence/Claro-planning.png).

### Resultado final e preservação

Todos os comandos listados passaram. O navegador também confirmou início vazio somente após confirmação, corrupção v2 sem substituição automática e acesso negado ao armazenamento sem falha da interface. O teste de quota confirmou erro visível dentro do formulário e estado salvo inalterado.

`git diff --exit-code ba45899 -- public/legacy src/lib/legacy.ts` passou. SHA-256 de `public/legacy/index.html`: `2203a28b9939f78342831bd248cd671734adc4501336636ecd376927cd290b06`. A verificação em navegador comparou o conteúdo completo da chave v1 antes e depois das operações v2, sem alterações. O arquivo de backup usado no teste de importação foi gerado e consumido em contexto temporário, sem dados pessoais.

Commits por etapa: `b21c4cf` (modelo, persistência, migração e testes de domínio), `5220bfd` (integração das operações e telas React, com testes de domínio no CI Node 24), seguido do commit de testes/evidências/documentação desta entrega. Os recursos avançados do roadmap v1.2 permanecem pendentes por escopo; não há PR nem merge autorizado.
