# Backup e importação — fluxo de três etapas

Branch exclusiva `codex/finly-navegacao-ux`, base `612cd3c`. Não houve alteração de `Finly-React`, main, cálculos financeiros, schema, rotas ou arquivos legados.

## Antes e depois

Antes, Configurações abria um Modal que continha BackupImport; a prévia abria outro Modal. O usuário via títulos, cancelamentos e overlays sobrepostos, além de uma soma que misturava tipos financeiros.

Agora, `BackupImport.tsx` é o único diálogo do fluxo:

1. **Importar backup:** seleção ou arraste de um JSON, nome/tamanho, compatibilidade v1/v2, limite de 4 MB e validação integral. Continuar só fica disponível com arquivo válido. Trocar o arquivo limpa candidato, erros, detalhes e confirmação; validações assíncronas antigas não substituem a seleção mais recente.
2. **Confira os dados do backup:** duas áreas, Dados do arquivo e Dados atuais. Mostram lançamentos, grupos, reembolsos, pendências sem competência, previsões, situações de fatura, competências e referências financeiras. Não há soma de receitas/despesas/reembolsos misturados, nem schema/IDs como informação principal. Nada é gravado.
3. **Confirmar restauração:** aviso de substituição, quantidade de lançamentos, download dos dados atuais e confirmação explícita quando existem registros/referências financeiras ou dados atuais inválidos. O botão Restaurar dados efetiva a operação. Após sucesso, o diálogo fecha e aparece a mensagem com a quantidade restaurada; todas as telas usam o novo estado imediatamente.

O download da cópia atual lê o conteúdo salvo mais recente e não importa dados. Um estado vazio padrão não exige um checkbox adicional, mas ainda exige a ação final Restaurar dados. Dados corrompidos nunca são classificados silenciosamente como estado vazio.

## Proteções preservadas

- `prepareBackup` só interpreta JSON, valida o formato e delega a conversão/validação financeira à função `migrate` existente. Não há execução de JavaScript nem coercões de formatos desconhecidos.
- Valores, parcelas, IDs, grupos e vínculos são preservados pelo modelo existente; duplicidades são recusadas, não deduplicadas silenciosamente.
- O limite é conferido em bytes antes de ler o arquivo e também no parser. Arquivos acima de 4 MB são recusados antes da prévia.
- A restauração usa `save` com o conteúdo v2 esperado na conferência. Se outra aba alterar os dados, o fluxo bloqueia a substituição e pede nova conferência. Falhas de acesso/quota não atualizam o estado da interface como se tivesse havido sucesso.
- O v1 original não é apagado nem sobrescrito. A recuperação local fica em **Recuperação avançada**, somente quando há v1 compatível nesta origem. Ainda exige as três etapas; uma alteração do legado durante a conferência também é recusada.
- Não existe exportação de `null` para um backup legado ausente. A exportação de recuperação v2 também recusa ausência de dados.
- Cancelar, Fechar, Escape e Voltar não escrevem no estado financeiro. Há foco no título de cada etapa, contenção de Tab/Shift+Tab, retorno de foco ao gatilho e rolagem interna em telas menores.

## Configurações

**Salvar meus dados:** Exportar backup JSON, Exportar lançamentos CSV e a impressão já existente.

**Recuperar meus dados:** Importar backup JSON, explicação de restauração e recuperação local avançada condicional. As ações destrutivas permanecem separadas na zona de cuidado. Não há opções de migração/exportação técnica na etapa de seleção do arquivo.

## Erro “Backup v1 incompatível”

A mensagem antiga era lançada quando `version` não era o número 1, `settings` não era um objeto ou `entries` não era uma lista, sem explicar qual formato era esperado. Um arquivo parcial, um JSON diferente ou um envelope desconhecido podia produzir essa mensagem genérica.

O novo parser distingue JSON corrompido, versão incompatível e backup v1 incompleto. Mantém mensagens simples e detalhes técnicos expansíveis. Backups válidos com `{version:1, settings, entries, invoiceStatuses, pending, noticeDismissed}` e backups v2 passam. Também é aceito BOM UTF-8 no início do arquivo. Formatos desconhecidos continuam sendo recusados, sem inventar transações ou configurações.

**Limite da investigação:** o arquivo financeiro original recuperado do SaldoClaro não estava disponível entre os anexos desta execução. Portanto, ele não foi analisado, copiado, usado como fixture ou declarado compatível. A compatibilidade foi verificada com a estrutura v1 informada no pedido e arquivos sintéticos v1/v2. Uma variante específica desse arquivo privado exige avaliação separada, sem publicação dos seus dados.

## Evidências visuais

Capturas reais do Chromium com dados inteiramente sintéticos:

|Comparação/etapa|Desktop|Celular|
|---|---|---|
|Antes: dois diálogos sobrepostos|[Antes](evidence/before-nested.png)|—|
|1 — Selecionar arquivo|[Captura](evidence/step-1-desktop.png)|[Captura](evidence/step-1-mobile.png)|
|2 — Conferir dados|[Captura](evidence/step-2-desktop.png)|[Captura](evidence/step-2-mobile.png)|
|3 — Confirmar restauração|[Captura](evidence/step-3-desktop.png)|[Captura](evidence/step-3-mobile.png)|

As imagens mobile representam a viewport real (390 × 844), não uma montagem da página inteira com o diálogo fixo deslocado. O diálogo permite rolar seu conteúdo quando a revisão excede a altura disponível.

## Arquivos

- `src/finance/BackupImport.tsx`: diálogo único, etapas, arquivo/drop, comparação, backup atual, confirmação, foco e erros.
- `src/finance/backup.ts`: compatibilidade, mensagens, snapshot atual, resumos e regra de confirmação.
- `src/finance/FinanceApp.tsx`: grupos de Configurações, importação/recuperação sem modal aninhado e mensagem de sucesso.
- `src/styles.css`: apresentação responsiva e legível do diálogo.
- `tests/fixtures/synthetic-backup-v1.json` e `synthetic-backup-v2.json`: arquivos de teste explicitamente sintéticos, fora do produto/public.
- `tests/check_backup.mjs`, `check_backup_browser.py`, `backup_helpers.py`: validação de formato e fluxo real; regressões anteriores ajustadas para as novas etapas sem remover verificações financeiras.
- `.github/workflows/react-check.yml`: testes de backup incluídos na verificação de domínio existente.

## Testes

```sh
npm run check
npm run build
npm run test:static
node tests/check_finance.mjs
node tests/check_backup.mjs
python3 tests/check_backup_browser.py
python3 tests/check_finance_browser.py
python3 tests/check_startup.py
python3 tests/check_navigation_ux.py
python3 tests/check_home.py
python3 tests/check_public_release.py
```

Cobertura nova: v1/v2 e BOM, arquivo incompatível/corrompido, duplicidade de IDs, valores inválidos, centavos, parcelas/reembolsos/pendências/faturas, limite de tamanho, arraste/seleção, limpeza de erros, prévia, Voltar/Cancelar, cópia atual sem importação, confirmação, persistência, concorrência, falha de quota, recuperação local somente compatível, único modal, foco/Tab/Escape e três temas em desktop/mobile.

`git diff --exit-code 612cd3c -- src/finance/model.ts src/finance/storage.ts src/finance/navigation.ts src/components/navigation/FinanceSidebar.tsx src/finance/HomeOverview.tsx public/legacy` confirma a preservação das regras, persistência, navegação e legado. Testes executados no build local do Chromium; não constituem auditoria contábil integral ou confirmação de deployment remoto.

**Resultado:** todos os comandos listados passaram, incluindo regressões financeiras, inicialização, navegação e Home. O build manteve os chunks lazy existentes, sem erros ou warning de chunk maior que 500 kB. As capturas foram inspecionadas e a comparação Git dos arquivos protegidos passou.
