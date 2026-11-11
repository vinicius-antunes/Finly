# Home direta e inicialização segura

Alteração exclusivamente na branch `Finly-React`, base `491301d`. A inicialização vazia automática foi autorizada expressamente neste pedido; a importação/migração continua sendo uma operação separada e confirmada.

## Experiência atual

- O React abre diretamente em **Visão geral**. Não há prévia somente leitura, tela de ativação ou escolha obrigatória de dados.
- `initialize()` primeiro carrega e valida a chave `finly-v2`. Se existir, retorna o estado sem normalizar, regravar ou alterar seus bytes. Somente quando a chave estiver ausente cria `empty()`, usando a gravação com controle de concorrência já existente, e confirma que o estado pode ser lido de volta.
- O efeito de inicialização pode ser repetido pelo StrictMode: o teste confirma apenas **uma gravação** num navegador limpo, e zero gravações financeiras ao carregar um estado existente.
- Sem dados, a Home começa com projeção, referência mensal, margem, reserva, fatura, despesas, entradas e reembolsos em R$ 0,00. Nenhuma transação é gerada. As referências de meta/teto mantêm os defaults já existentes do modelo, sem participar dos indicadores iniciais da Home.
- Corrupção, acesso negado e quota insuficiente não abrem uma aplicação aparentemente persistente. A tela de recuperação explica o erro, oferece nova tentativa, exportação do conteúdo v2 original e importação/restauração com validação, prévia e confirmação. Um v2 inválido nunca é substituído automaticamente.
- `saldoclaro-v1` nunca é migrado, escrito ou removido durante a inicialização. A migração local opcional continua dentro do fluxo de backup, somente após ação explícita.

## Home e navegação

O bloco “Mais clareza hoje / Mais possibilidades amanhã” e a descrição associada foram removidos, junto com a etiqueta redundante de competência. O cabeçalho mantém título/subtítulo, um único campo mensal e Novo lançamento. Os botões Mês anterior/Próximo mês foram removidos; o seletor nativo permite escolher competências anteriores e futuras.

Não há links para `/legacy/` na interface, nem chamadas para abrir o programa antigo. O título da aba e a descrição HTML também deixaram de identificar o app como prévia. `public/legacy/` permanece intacto no repositório como referência técnica.

A importação é opcional em **Ajustes e backup → Backup e importação → Importar / restaurar backup**. Esse fluxo mantém o backup atual, limite/validação de arquivo, prévia, aviso de substituição, confirmação e proteção contra alterações concorrentes. O botão de iniciar vazio foi retirado do importador; limpeza continua disponível somente como a ação própria já confirmada dos Ajustes.

Home baseada na main, temas, Sidebar hover/drawer, Light Rays global, Bento, Magic Card, gráficos e operações financeiras foram preservados. O modelo e as regras de cálculo em `model.ts` não foram alterados.

## Arquivos

- `src/App.tsx`: entrada única no aplicativo funcional, sem a prévia anterior.
- `src/finance/storage.ts`: inicializador idempotente, somente para chave ausente.
- `src/finance/FinanceApp.tsx`: entrada/recuperação, importador opcional, campo de competência e remoção do link legado.
- `src/finance/HomeOverview.tsx`: remoção da introdução/etiqueta redundante.
- `src/components/navigation/FinanceSidebar.tsx`: remoção do redirecionamento legado; fechamento do drawer preservado.
- `src/styles.css`, `index.html`: espaçamentos, recuperação e identidade do documento.
- `tests/check_startup.py` e testes financeiros/Home ajustados: cobertura da experiência atual.

## Evidências

Capturas reais e completas no Chromium, somente com dados sintéticos em contextos descartáveis:

|Estado|Desktop|Celular|
|---|---|---|
|Vazio|[Captura](startup-evidence/empty-desktop.png)|[Captura](startup-evidence/empty-mobile.png)|
|Com primeiro lançamento sintético|[Captura](startup-evidence/populated-1440.png)|[Captura](startup-evidence/populated-390.png)|

[Recuperação de estado corrompido](startup-evidence/corrupt-recovery.png). As capturas vazias usam dezembro de 2030 para demonstrar a consulta de competências futuras, sem adicionar qualquer transação fictícia ao produto.

## Validação

```sh
npm run check
npm run build
npm run test:static
node tests/check_finance.mjs
python3 tests/check_startup.py
python3 tests/check_finance_browser.py
python3 tests/check_home.py
python3 tests/check_public_release.py
```

O teste de inicialização verifica os 12 critérios do pedido junto com a suíte de Home: entrada direta, zeros, ausência de ativação, primeiro lançamento/reload, estado válido preservado byte a byte, corrupção sem escrita, acesso negado/quota, importação opcional/restauração explícita, ausência de links legados/introdução/setas e seleção mensal. A Home verifica três temas e viewports 1440/1366/768/390. A suíte financeira mantém cálculos, parcelas, vínculos, CRUD, faturas, backup, importação e invariantes v1. `git diff --exit-code 491301d -- src/finance/model.ts public/legacy` confirma a preservação do modelo e do legado.

Não há alteração da main nem merge. A verificação é local, sobre build de produção; não confirma publicação no Cloudflare.

**Resultado:** todos os comandos listados passaram. As capturas foram inspecionadas; o build não apresentou erros nem aviso de chunk acima de 500 kB. Testes históricos que pressupõem a prévia somente leitura/ativação deixam de descrever a entrada atual; as suítes de inicialização, Home e operações financeiras documentadas acima são a cobertura do fluxo atual.
