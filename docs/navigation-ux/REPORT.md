# Navegação, usabilidade e legibilidade

## Isolamento da etapa 0

Antes de editar arquivos do projeto: `git fetch origin`, confirmação de `origin/Finly-React` em **48f3f373aa126162bed2c505c673397306ecd765**, seguida de `git switch -c codex/finly-navegacao-ux origin/Finly-React`. A árvore inicial estava limpa. Toda a reformulação foi feita nessa nova branch; as instruções do anexo que citavam trabalho direto na Finly-React foram substituídas pela instrução mais recente do proprietário. Sem PR ou merge.

## Mapa anterior → atual

|Antes|Agora|
|---|---|
|Visão geral|Visão geral, com atalhos para lançamentos, fatura, referências e reembolsos|
|Lançamentos|Lançamentos com busca/filtros destacados, ações contextuais e retorno após salvar|
|Parcelas e reembolsos: fatura, grupos e recebimentos na mesma página|Fatura do cartão; Parcelas e recorrências; Reembolsos — três telas próprias|
|Planejamentos → Recursos disponíveis|Planejamentos em um clique, sem submenu redundante; meta e simulador separados|
|Ajustes e backup: formulário longo e todas as seções expostas|Configurações → Financeiro / Aparência / Backup / Sobre|
|Sobre a migração na Sidebar|Sobre o Finly dentro de Configurações|
|Tela selecionada somente em memória|URLs identificáveis, acesso direto, reload e histórico Voltar/Avançar|

## Endereços

Rotas hash não exigem configuração adicional de rewrite no Pages. O parâmetro `competencia` acompanha navegação e histórico, sem gravar dados financeiros:

|Tela|Exemplo|
|---|---|
|Visão geral|`/#/visao-geral?competencia=2026-11`|
|Lançamentos|`/#/lancamentos?competencia=2026-11`|
|Fatura|`/#/fatura?competencia=2026-11`|
|Parcelas e recorrências|`/#/parcelas?competencia=2026-11`|
|Reembolsos|`/#/reembolsos?competencia=2026-11`|
|Planejamentos|`/#/planejamentos?competencia=2026-11`|
|Configurações|`/#/configuracoes/financeiro?competencia=2026-11`|
|Aparência, backup e sobre|Substituir `financeiro` por `aparencia`, `backup` ou `sobre`|

Links da Sidebar suportam abrir em outra aba, identificam a página atual com `aria-current` e mantêm hover/fixação desktop e drawer móvel. Título da aba e breadcrumb refletem a tela. A competência é preservada também no acesso direto. Hash inválido tem fallback seguro para Visão geral; não afeta os dados.

## Operações e leitura

- Novo lançamento continua abrindo o formulário existente; **Criar por tipo** oferece receita, despesa, cartão e reembolso com o tipo já selecionado. O rótulo do valor distingue compra/parcela e outros valores. Responsável aparece para cartão; situação aparece para tipos que realmente usam esse controle.
- Salvar criação/edição com sucesso retorna à listagem, mostrando os registros e preservando IDs. Falhas permanecem no formulário com erro; filtros são limpos para não esconder o registro salvo.
- Fatura destaca total, competência, vencimento e situação. Alterar status usa o callback financeiro existente.
- Parcelas informa grupos, ocorrências, valores, competências e quantidade de reembolsos vinculados. Exclusão continua exigindo confirmação.
- Reembolsos separa pendentes e recebidos, com totais e ações de confirmação/desfazer. As listas preservam os registros de todas as competências, como na tela anterior.
- Configurações usa abas reais com painel, seleção, foco e teclado (setas/Home/End). A limpeza fica numa zona de cuidado separada; backup/importação mantém o fluxo com prévia e confirmação.
- Textos principais em 14–16 px, auxiliares em 13–14 px, títulos de cartões em 16–20 px e páginas em 26–32 px. Valores destacados mantêm hierarquia. Escalas menores permanecem apenas em elementos de marca sem informação financeira.
- Tabelas têm espaçamento e números tabulares, com rolagem interna quando necessário. Home e cabeçalho se adaptam aos viewports menores. Não há nova biblioteca.

Graphite Green, Escuro Padrão, Claro, Plus Jakarta Sans, Light Rays global, Magic Bento, Magic UI Magic Card, gráficos e simulador permanecem. Não há gerenciamento de múltiplos cartões, assinaturas avançadas ou outro recurso futuro apresentado como pronto.

## Evidências reais

As capturas usam exclusivamente fixture sintética em contexto descartável do Chromium:

|Tela|Captura|
|---|---|
|Home|[Visão geral](evidence/visao-geral.png)|
|Lançamentos|[Tabela e filtros](evidence/lancamentos.png)|
|Fatura do cartão|[Fatura](evidence/fatura.png)|
|Parcelas e recorrências|[Grupos e vínculos](evidence/parcelas.png)|
|Reembolsos|[Pendentes e recebidos](evidence/reembolsos.png)|
|Planejamentos|[Meta e simulador](evidence/planejamentos.png)|
|Configurações|[Financeiro](evidence/settings-Financeiro.png), [Aparência](evidence/settings-Aparência.png), [Backup](evidence/settings-Backup.png), [Sobre](evidence/settings-Sobre.png)|
|Mobile e temas|[Graphite](evidence/Graphite-mobile.png), [Escuro Padrão](evidence/Escuro-mobile.png), [Claro](evidence/Claro-mobile.png), [Reembolsos mobile](evidence/refunds-mobile.png)|

## Testes e preservação

```sh
npm run check
npm run build
npm run test:static
node tests/check_finance.mjs
python3 tests/check_navigation_ux.py
python3 tests/check_finance_browser.py
python3 tests/check_startup.py
python3 tests/check_public_release.py
```

A suíte nova verifica as sete rotas, acesso direto, seleção da Sidebar, competência, Voltar/Avançar, dados inalterados durante navegação, abas/foco por teclado, criação rápida, edição com ID preservado, retorno à listagem, fatura/grupos/reembolsos separados, exportação/restauração real de backup, três temas, viewports 1440/1366/768/390, hover/fixação, toque, Escape e ausência de erros JavaScript. As regressões financeiras e de inicialização continuam sendo executadas; seus seletores foram atualizados para refletir a navegação e os rótulos novos, mantendo as asserções de dados.

`src/finance/model.ts`, `src/finance/storage.ts` e `public/legacy/` permanecem idênticos à base. Não houve alteração do schema, cálculos, importação, migração ou persistência. O teste confere o v2 completo durante navegação/troca visual e o conteúdo v1 intacto após operações financeiras intencionais.

Limites: testes no Chromium, sem certificação integral WCAG ou validação em todos os navegadores físicos. Capturas/testes são do build local e não confirmam um deployment remoto. Nenhuma publicação ou merge de outras branches foi solicitado.

**Resultado:** todos os comandos de validação listados passaram. TypeScript/build sem erros e sem warning de chunk acima de 500 kB. A comparação Git de modelo, persistência e legado com `48f3f37` passou. O workflow de validação existente foi habilitado também para pushes desta nova branch; não publica nem faz merge.
