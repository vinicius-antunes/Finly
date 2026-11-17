# Fase 7 — Integração, auditoria e validação final

Base remota e local conferida: `3f26f44bc4c91448853050003d715e57c0855f44`, entrega da Fase 6. Trabalho exclusivamente em `codex/finly-navegacao-ux`, preservando `main`, `Finly-React` e o legado. Sem merge, PR, alteração de versão pública ou criação de release.

## Consolidação das sete fases

| Fase | Entrega consolidada |
|---|---|
| 1 | Contratos versionados, identidades/vínculos, centavos/datas e prévia de migração sem gravação. |
| 2 | Liquidações parciais, salário identificado, transferências neutras, correções e projeções compartilhadas. |
| 3 | Cartões, calendário da fatura, contratos exatos, juros/entrada e recorrências explícitas. |
| 4 | Acordos por responsável, cronogramas, recebimentos e vínculo transacional com os cofrinhos. |
| 5 | Modal operacional com cinco abas, prévias, cadastros, edição guiada, histórico e consultas integradas. |
| 6 | Comprovantes locais, IndexedDB, SHA-256, diagnóstico/recuperação e ZIP completo. |
| 7 | Auditoria funcional, fechamento das lacunas de interface, métricas explícitas, desempenho, acessibilidade e regressões consolidadas. |

Os relatórios [1](PHASE_1.md), [2](PHASE_2.md), [3](PHASE_3.md), [4](PHASE_4.md), [5](PHASE_5.md) e [6](PHASE_6.md) foram lidos antes das alterações. O desenvolvimento anterior foi preservado. A retomada após o limite de uso aproveitou os arquivos, resultados e medições existentes.

## Problemas encontrados e correções

1. **Duplicatas:** o motor possuía uma função de diagnóstico sem aviso operacional. O formulário agora apresenta a possibilidade de duplicata na prévia, com confirmação que permite continuar legitimamente. A comparação considera cartão, conta, competência e data conhecida, evitando avisos entre cartões diferentes.
2. **Fatura com pagamentos:** a aprovação financeira interna existia, mas a prévia era genérica. Agora mostra total anterior/novo, pagamentos preservados e restante, exigindo reconhecimento específico além da confirmação geral. Não sobrescreve a quitação original.
3. **Parcelas individuais:** as APIs aceitavam valores/competências personalizados sem cadastro completo na interface. O bloco avançado agora permite informá-los, valida a soma exata e preserva a data original. Alterar quantidade/modalidade exige descartar explicitamente os ajustes. A comparação da taxa com o valor contratado também aparece na interface com explicação de método.
4. **Exclusão:** operações novas sem vínculos tinham apenas comando interno. O formulário passou a oferecer exclusão definitiva confirmada; contratos, recorrências, liquidações, correções e comprovantes continuam protegidos. Cancelamento preserva o histórico.
5. **Origens sugeridas:** a inicialização agora considera a última conta válida por tipo e descarta cartões arquivados como sugestão para um novo cadastro. Histórico existente não é reescrito.
6. **Home:** passou a mostrar a variação efetiva registrada, receitas previstas, despesa paga/pendente e saldo dos cofrinhos junto das informações já existentes. Projeção, referência geral e cofrinhos permanecem conceitos separados. Os valores principais de compromisso e projeção mantêm as regras aprovadas.
7. **Acessibilidade:** o rótulo do gráfico estava num `div` sem papel ARIA válido. O contêiner passou a uma região nomeada. Os testes automatizados AA passaram nas três identidades visuais.
8. **Persistência:** o token de compare-and-set dos comprovantes agora preserva a serialização bruta anterior, incluindo JSON antigo formatado com espaços. A restauração detecta alteração em outra aba ocorrida após a gravação e antes do retorno à interface, evitando apresentar uma cópia desatualizada como atual. Não remove Web Locks nem as proteções existentes.
9. **Comprovantes:** a verificação reutiliza o resultado da inspeção para conferir o hash, eliminando a leitura e o hash duplicados do mesmo Blob.
10. **Desempenho:** índices de liquidações/categorias/vínculos substituem buscas repetidas na validação e nos adaptadores. A Home e o gráfico memorizam preparações que dependem do estado. Lançamentos renderiza 50 registros por página; busca, contadores, totais e CSV continuam abrangendo todo o conjunto filtrado.
11. **Recuperação:** o botão da tela de dados corrompidos passou a anunciar JSON ou ZIP, ambos aceitos pela janela de recuperação.
12. **Desktop baixo:** a verificação explícita em 1366 × 768 identificou 56 px de excesso de altura. A regra CSS limitada a desktops com até 800 px de altura ajusta espaçamento e proporções sem ocultar widgets; o painel de referência passou de terminar em y=824 para y=740.
13. **Testes históricos:** seis verificações ainda esperavam o catálogo antigo, um donut na Home, `period-morph`, itens como botões ou ausência de inicialização v2. Foram alinhadas à navegação e Home aprovadas: sete links, tabela acessível do gráfico mensal, competências/URL, inicialização vazia única e controles de aparência em Configurações. Mantêm verificações de valores, ausência de gravações financeiras após a preparação da fixture, hover/fixação, teclado, toque, foco, contraste, efeitos e preservação do legado. Nenhuma suíte foi removida.

## Matriz dos requisitos

A01–A58 são identificadores desta auditoria, organizados a partir do pedido consolidado que reúne as cinco rodadas. A seção de origem é indicada por §. **Implementado** exige vínculo com um fluxo exercitado, não somente a existência do componente ou de uma API.

Legenda das evidências:

- **FOUND**: `check_entry_foundation.mjs`; **FIN2**: `check_entry_finance.mjs`/`check_entry_finance_browser.py`.
- **CR3**: `check_credit.mjs`/`check_credit_browser.py`; **RE4**: `check_reimbursements.mjs`/`check_reimbursements_browser.py`.
- **DOM5**: `check_entry_ui.mjs`; **UI5**: `check_entry_ui_browser.py`; **MG5**: `check_entry_ui_management.py`.
- **REC**: `check_receipts.mjs`; **RC6**: `check_receipts_browser.py`; **BACK**: `check_backup.mjs`/`check_backup_browser.py`.
- **PLAN**: `check_planning.mjs`/`check_planning_browser.py`; **SPEND**: `check_monthly_spending.mjs`.
- **INT**: `check_integration.mjs`; **S1–S7**: `check_integration_browser.py` e o cenário ZIP de RC6. **S8**: REC/RC6/MG5/BACK.
- **A11Y**: `check_accessibility.py`; **NAV**: `check_navigation_cards.py`, `check_sidebar_alignment.py`, `check_navigation_ux.py`.
- **RAYS/GRAPHITE/THEME**: respectivas suítes `check_global_rays.py`, `check_graphite.py`, `check_react_visual.py`, `check_theme.py`.
- **HEADER/START**: `check_header.py`, `check_startup.py`; **PERF**: `benchmark_finance.mjs`, `benchmark_browser.py`.

| ID | Requisito e origem | Implementação | Evidência funcional | Situação |
|---|---|---|---|---|
| A01 | Modal direto e cinco abas, com entrada contextual (§1) | `EntryComposer, EntryTabs; FinanceApp` | UI5, S1–S5 | Implementado |
| A02 | Desktop central e mobile com altura limitada, rolagem interna e Salvar acessível (§1) | `EntryDialog; entry.css` | A11Y: sete larguras / cinco abas | Implementado |
| A03 | Campos básicos compactos e blocos avançados contextuais (§1) | `EntrySections, EntryComposer` | UI5, A11Y, S2/S4 | Implementado |
| A04 | Preservação de campos compatíveis e confirmação de descarte ao mudar tipo (§1–2) | `EntryComposer.switchType` | UI5 | Implementado |
| A05 | Descrição, valor e data obrigatórios; categoria opcional e campos dependentes do tipo (§2) | `draft.prepareEntry, fields` | UI5, DOM5, INT | Implementado |
| A06 | Máscara brasileira, colagem e centavos inteiros seguros (§2) | `ui/money, MoneyInput; contratos` | DOM5, FIN2 | Implementado |
| A07 | Separação de data real, competência, previsão, vencimento e liquidação (§2–3) | `credit/dates; draft; finance` | CR3, FIN2, S1/S2 | Implementado |
| A08 | Erros específicos, rótulos e foco no primeiro campo inválido (§2) | `FormField; EntryComposer.errorFocus` | UI5, A11Y | Implementado |
| A09 | Confirmação em Escape, fechar, clique externo e saída com rascunho (§2) | `EntryDialog, Payments, ReceiptManager` | UI5, RC6, A11Y | Implementado |
| A10 | Tab/Shift+Tab, contenção/restauração de foco e alternativas sem mouse (§2) | `Radix Dialog; SidebarProvider` | A11Y, NAV, UI5 | Implementado |
| A11 | Salvamento simples direto e prévia confirmada para operações complexas (§2) | `prepareEntry; EntryPreview` | UI5, S2/S3/S7 | Implementado |
| A12 | Duplo envio bloqueado e sucesso discreto, temporário e fechável (§2) | `refs de envio; SuccessToast, StoragePanel` | MG5, RC6, HEADER | Implementado |
| A13 | Cadastro de contas e cartões reais e arquivamento sem apagar histórico (§3,7) | `CatalogSettings; catalog, credit/dates` | MG5, CR3 | Implementado |
| A14 | Sugestão de última conta/cartão válidos por tipo de cadastro (§7) | `initialDraft` | INT, S1; validação de origens arquivadas | Implementado |
| A15 | Conta indefinida em previsão quando admitida, obrigatória na liquidação (§2,7) | `draft, schema, Payments` | FIN2, DOM5; transferências conservam origem/destino explícitos | Implementado |
| A16 | Transferência própria prevista/efetivada, neutra e idempotente (§7) | `commands; coleção transfers` | FIN2, INT; UI5/RC6 | Implementado |
| A17 | Cartões independentes, fechamento, vencimento e regra no próprio dia (§3) | `credit/dates, purchases` | CR3, S2 | Implementado |
| A18 | Competência automática ou manual, sem inventar datas históricas (§3,13) | `firstInvoice, migration; EntryComposer` | CR3, FOUND, S2 | Implementado |
| A19 | Compra única, parcelada e recorrente com campos exclusivos (§3–4) | `EntryComposer, EntrySections` | UI5, S2/S4 | Implementado |
| A20 | Total/parcela, custo contratado e centavos restantes na última parcela (§3) | `quotePurchase` | CR3, DOM5, S2: 1000,01 em três | Implementado |
| A21 | Valores personalizados de parcelas, positivos e com soma contratual exata (§3) | `customInstallments → quotePurchase` | INT, S2 ampliado / captura custom-installments-interest | Implementado |
| A22 | Competências individuais avançadas, IDs e vínculos preservados (§3,10) | `draft.periods; preview/applyInstallments` | CR3, MG5, INT, S2 ampliado | Implementado |
| A23 | Juros simples/compostos explícitos, método explicado e total real prioritário (§3) | `quotePurchase; InstallmentFields` | CR3, INT, S2 ampliado | Implementado |
| A24 | Entrada vinculada e independente sem somar o contrato outra vez (§3,14) | `purchases; downPayment` | CR3, UI5, S2 ampliado | Implementado |
| A25 | Compra prevista/confirmada separada de fatura aberta/parcial/paga (§5) | `invoiceBalance; InvoicePayments` | FIN2, UI5, S2 | Implementado |
| A26 | Despesa pendente, parcial, paga e cancelada (§5) | `operationBalance, Payments` | FIN2, DOM5, MG5 | Implementado |
| A27 | Receita prevista, parcial, recebida e cancelada (§5) | `operationBalance, Payments` | FIN2, UI5, S1 | Implementado |
| A28 | Salário identificado substitui referência, sem identificação textual ou duplicação (§6) | `ledgerProjection; metrics` | FIN2, INT, S1 | Implementado |
| A29 | Liquidações individuais em contas/métodos diferentes com teto e histórico (§5) | `recordSettlement; Payments` | FIN2, MG5, S1/S3 | Implementado |
| A30 | Recorrências mensais/anuais e último dia válido de cada mês (§4) | `credit/recurrences, dates` | CR3, UI5, S4 | Implementado |
| A31 | Pausa, retomada, cancelamento e término preservam histórico (§4) | `changeRecurrence` | CR3, MG5, S4 | Implementado |
| A32 | Geração explícita, limitada e idempotente, sem pagamentos automáticos (§4) | `generateOccurrences` | CR3, INT, S4 | Implementado |
| A33 | Alterar ocorrência ou próximas, preservando liquidações já existentes (§4) | `changeRecurrence; escopos do formulário` | CR3, MG5, INT | Implementado |
| A34 | Reembolso avulso ou vinculado, integral ou parcial (§8) | `reimbursements; PeopleFields` | RE4, UI5, S3 | Implementado |
| A35 | Compra pessoal/terceiro/compartilhada, várias pessoas ou identificação pendente (§8) | `PersonDraft, agreements, claims` | RE4, DOM5, S3 | Implementado |
| A36 | Reembolso único, acompanhando parcelas ou cronograma personalizado (§8) | `installmentSchedule; agreement terms` | RE4, MG5, DOM5 | Implementado |
| A37 | Recebimentos reais individualizados, saldo por responsável e teto contratado (§8,14) | `receiveAgreement; agreementBalance` | RE4, INT, S3 | Implementado |
| A38 | Categoria pesquisável e criação rápida dentro do modal (§9) | `CategoryPicker; CatalogSettings` | MG5, DOM5 | Implementado |
| A39 | Renomear, arquivar, reclassificar e excluir categoria sem apagar histórico (§9) | `catalog; snapshots de correção` | DOM5, MG5; categoria com histórico exige arquivamento | Implementado |
| A40 | Edição desta parcela/próximas/compra inteira com prévia e IDs estáveis (§10) | `previewInstallments, applyInstallments` | CR3, MG5 | Implementado |
| A41 | Correção de fatura paga com impacto numérico, consentimento específico e pagamentos preservados (§10) | `paidInvoiceImpacts, EntryPreview` | INT, S7 | Implementado |
| A42 | Cancelamento e exclusão autorizada distintos; vínculos/histórico protegem exclusão (§10) | `deleteOperation; ações do registro` | FIN2, RC6, S7 ampliado / exclusão UI | Implementado |
| A43 | Aviso real de possíveis duplicatas com opção de continuar (§10) | `possibleDuplicates; EntryPreview.warnings` | INT, S7 ampliado / duplicação deliberada | Implementado |
| A44 | Reutilizar Planejamentos: objetivos, aportes manuais e simulação sem gravar (§11) | `planning/GoalForm, Movements, Simulator` | PLAN, S5 | Implementado |
| A45 | Uso confirmado e único de reserva, histórico e vínculo em uma gravação financeira (§11,14) | `confirmPlannedPurchase; entry-links` | RE4, INT, S5 | Implementado |
| A46 | JPG/PNG/WebP/PDF múltiplos; extensão/MIME/assinatura, tamanho e limites (§12) | `receipts/model, ReceiptFields` | REC, RC6 | Implementado |
| A47 | Binários no IndexedDB; metadados no estado financeiro, sem Base64 (§12) | `receipts/storage, allReceipts` | REC, RC6 | Implementado |
| A48 | Miniatura/ampliação/download, PDF por fallback e liberação de URLs temporárias (§12) | `FilePreview, SavedFile` | RC6; PDF sem interpretador ativo incorporado | Implementado |
| A49 | Comprovantes em registros antigos, parcelas, contratos e pagamentos; compartilhamento seguro (§12) | `Target, ReceiptManager, SavedReceipts` | REC, RC6 | Implementado |
| A50 | Preparação/confirmação/compensação/recuperação, quota, concorrência e duplo clique (§12–14) | `coordinatedSave, Web Locks, journal` | REC, RC6, MG5 | Implementado |
| A51 | Diagnóstico local de quantidade/espaço/quota/integridade/órfãos e limpeza confirmada (§12) | `StoragePanel; storageHealth` | REC, RC6 | Implementado |
| A52 | JSON v1/v2 preservado; metadados sem arquivos indicam ausência sem apagar binários locais (§12–13) | `BackupImport, prepareBackup` | BACK, REC, RC6, START | Implementado |
| A53 | ZIP completo com dados/manifesto/arquivos, versões, prévia e SHA-256 (§12) | `receipts/zip, StoragePanel` | REC, RC6 / roundtrip e bytes reais | Implementado |
| A54 | Restauração validada antes de substituir, limites durante inflação, CAS e confirmação (§12–13) | `inspectZip, importZip, coordinatedSave` | REC, RC6; hashes/manifesto/traversal/bombas | Implementado |
| A55 | Legado/IDs/valores/períodos/grupos/configurações/cofrinhos preservados e ativação explícita (§13) | `model, migration, Activation` | FOUND, BACK, START, UI5, RC6 | Implementado |
| A56 | Integração Home/listas/faturas/reembolsos/cofrinhos/gráfico com um motor e sem dupla contagem (§14) | `metrics, overviewDetails, ledgerChartEntries` | INT, S1–S7, SPEND, PLAN | Implementado |
| A57 | Três temas, brilho/Light Rays opcionais, Sidebar por hover, touch e movimento reduzido (§15) | `theme; RaysBackdrop; Sidebar; tokens` | A11Y, NAV, RAYS, GRAPHITE, THEME | Implementado |
| A58 | Módulos separados, desempenho medido, privacidade/licenças e regressão/CI (§15,17–19) | `módulos de domínio, paginação, workflow` | PERF, A11Y, todas as suítes; publicação e npm audit | Implementado |

## Cenários completos

| Cenário | Ações e resultado verificado |
|---|---|
| S1 — Salário | Previsão de R$ 1.000,00, recebimento de R$ 400,00 na conta A e R$ 600,00 na B. A referência não se soma novamente; Home, histórico e variação das contas acompanham os eventos. |
| S2 — Cartão | R$ 1.000,01 em três parcelas: R$ 333,33 + R$ 333,33 + R$ 333,35, competências novembro/dezembro/janeiro com fechamento informado. Quitar a primeira fatura não cria outra despesa. Caso adicional: original R$ 100,00, entrada R$ 10,00, total contratado R$ 110,00, parcelas R$ 20/30/50 em competências ajustadas, taxa explícita e divergência visível. |
| S3 — Compartilhada | Compra com duas pessoas, valores R$ 40 e R$ 30; recebimentos R$ 10 e R$ 20 em contas diferentes. Os saldos individuais somam R$ 40; excedentes são recusados. |
| S4 — Recorrência | Dia 31: janeiro 31, fevereiro 28, março 31 e abril 30; alteração, pausa, retomada e cancelamento preservam os IDs e não geram liquidações automáticas. Anual/bissexto e geração idempotente também passam pelas regressões. |
| S5 — Cofrinho | Objetivo, aporte manual de R$ 80, simulação sem gravação e uso confirmado de R$ 40. Restam R$ 40 no histórico; há vínculo com a compra e nenhuma receita/despesa adicional por movimentar a reserva. |
| S6 — ZIP | Imagem/PDF em registro persistido, ZIP baixado pela interface, restauração em perfil vazio, igualdade do estado financeiro completo e SHA-256 dos Blobs reais restaurados. |
| S7 — Histórico | Correção de parcela em fatura quitada mostra impacto e exige consentimento, mantém os pagamentos e registra motivo. Exclusão sem vínculos é confirmada; exclusão com histórico é recusada. Duplicata legítima pode ser salva após aviso. |
| S8 — Falhas | Quota, falha de IndexedDB/localStorage, interrupção do diário, duas abas, revisão desatualizada, duplo clique, ZIP adulterado/traversal/bomba e JSON inválido não substituem silenciosamente a base nem duplicam a obrigação. |

## Regras financeiras preservadas

- Centavos inteiros, contratos e somas exatas; transferências e pagamentos de fatura não viram despesas novas.
- Reembolso prometido só é caixa após recebimento. A projeção condicional, quando solicitada, considera apenas o restante.
- O primeiro recebimento salarial líquido substitui a referência da competência, inclusive parcial; o restante da referência não é somado à projeção.
- Obrigações previstas comprometem a projeção conforme a regra aprovada; liquidações têm datas efetivas independentes. Não são transformadas em pagamentos automaticamente.
- `overviewDetails` apresenta dados do motor compartilhado; não muda `metrics` nem o saldo do cofrinho. Referência geral de reserva e cofrinhos não são somados por suposição.
- **Saldo atual registrado** é variação líquida do período, não saldo bancário ou saldo de abertura inferido. Dados antigos sem data de pagamento usam apenas a situação e competência conhecidas.
- Nenhuma alteração de schema financeiro externo/interno ou migração automática. `customInstallments` é rascunho de interface e usa os contratos já existentes. `saldoclaro-v1` permanece intacta.

## Arquivos entregues

- `src/finance/overview.ts`, `HomeOverview`, `MonthlySpendingChart` e `src/styles.css`: leitura integrada de métricas, memorização, região acessível do gráfico e regra de desktop baixo.
- `entry-system/{finance,state,commands}.ts` e `ui/views.ts`: índices de leitura e diagnóstico de duplicatas contextualizado, preservando os resultados monetários.
- `ui/{draft,EntrySections,EntryComposer}.tsx/ts` e `FinanceApp.tsx`: parcelas individuais, juros explicados, confirmação específica de fatura e exclusão protegida.
- `EntriesWorkspace.tsx`: paginação de 50 linhas, com busca/totais/CSV integrais e contexto preservado.
- `receipts/{storage,model}.ts`, `ReceiptFields`, `StoragePanel`, `Payments` e `BackupImport`: token bruto de revisão, verificação sem leitura duplicada e retorno seguro da restauração.
- `tests/check_integration.mjs`, `check_integration_browser.py`, `check_accessibility.py`, fixtures/helpers, benchmarks e `capture_compact_comparison.py`: cenários, medições e evidências reproduzíveis. As suítes visuais históricas foram atualizadas conforme descrito acima.
- README, este relatório, `package.json`/lock, licença do axe-core, `.gitignore` para cache Python e workflow: documentação e validação. Nenhum arquivo do legado foi alterado.

## Testes, segurança e evidências

**Resultado local final: aprovado no escopo testado.** 58 verificações da matriz implementadas e validadas pelos fluxos relacionados; nenhuma marcada como parcial, pendente ou incorreta após as correções. Passaram:

- `npm run check`, build de produção, scaffold, verificação de publicação e JavaScript/artefatos legados.
- **13 suítes Node**: 12 de domínio/integração e a verificação de scaffold.
- **25 scripts Python**: 24 suites com Chromium, incluindo integração e acessibilidade, mais `check_public_release.py`.
- **39 execuções axe-core**, cobrindo oito destinos/configurações e cinco abas, nos três temas, com **zero violações AA**; teclado real, foco, Escape, toque e movimento reduzido também verificados. As larguras são 1920, 1440, 1366, 1024, 768, 390 e 360 px; desktop inclui conferência explícita da altura disponível.
- npm audit completo: **zero vulnerabilidades conhecidas** na consulta efetuada, incluindo dependências de desenvolvimento.
- Medições Node e Chromium com 100/1.000/5.000 registros; paginação, busca fora da primeira página, CSV integral e estado financeiro intocado.

A última alteração de CSS compacto foi seguida de nova execução da auditoria de acessibilidade e das suítes Home, widgets, navegação/cartões, Graphite e regressão visual. O ensaio de Light Rays foi repetido após corrigir o helper de navegação mobile; passou integralmente. Os resultados acima são de execução local nesta sessão, sem afirmar aprovação remota do GitHub Actions.

Foram usados somente dados sintéticos em perfis descartáveis. Os relatórios de execução estão em [test-results.json](phase-7-evidence/test-results.json), a auditoria automatizada em [accessibility.json](phase-7-evidence/accessibility.json) e as medições em [performance.json](phase-7-evidence/performance.json) e [browser-performance.json](phase-7-evidence/browser-performance.json).

A auditoria utiliza `axe-core` somente em desenvolvimento/testes (MPL-2.0, [licença](../licenses/axe-core.txt)); nenhum novo pacote de produção foi acrescentado. O workflow passou a executar os testes integrados e de acessibilidade, com Python configurado explicitamente. npm audit é uma consulta de vulnerabilidades conhecidas, não prova de ausência de falhas. O hash do backup detecta corrupção, não autentica sua origem.

### Capturas atuais

| Tema | Home desktop / mobile | Novo lançamento desktop / mobile | Planejamentos desktop / mobile |
|---|---|---|---|
| Graphite Green | [desktop](phase-7-evidence/graphite-visao-geral-desktop.png) · [mobile](phase-7-evidence/graphite-visao-geral-mobile.png) | [desktop](phase-7-evidence/graphite-form-1440.png) · [mobile](phase-7-evidence/graphite-form-390.png) | [desktop](phase-7-evidence/graphite-planejamentos-desktop.png) · [mobile](phase-7-evidence/graphite-planejamentos-mobile.png) |
| Escuro Padrão | [desktop](phase-7-evidence/dark-visao-geral-desktop.png) · [mobile](phase-7-evidence/dark-visao-geral-mobile.png) | [desktop](phase-7-evidence/dark-form-1440.png) · [mobile](phase-7-evidence/dark-form-390.png) | [desktop](phase-7-evidence/dark-planejamentos-desktop.png) · [mobile](phase-7-evidence/dark-planejamentos-mobile.png) |
| Claro | [desktop](phase-7-evidence/light-visao-geral-desktop.png) · [mobile](phase-7-evidence/light-visao-geral-mobile.png) | [desktop](phase-7-evidence/light-form-1440.png) · [mobile](phase-7-evidence/light-form-390.png) | [desktop](phase-7-evidence/light-planejamentos-desktop.png) · [mobile](phase-7-evidence/light-planejamentos-mobile.png) |

[Salário com recebimentos concluídos](phase-7-evidence/salary-partials-complete.png) · [Correção de fatura paga](phase-7-evidence/paid-invoice-correction.png) · [Reembolso compartilhado](phase-7-evidence/shared-reimbursements.png) · [Parcelas personalizadas e juros](phase-7-evidence/custom-installments-interest.png). O comparativo usa os mesmos dados e JavaScript. A captura anterior remove somente a nova regra CSS na página descartável; a posterior usa o build real. O procedimento é reproduzível em `python3 tests/capture_compact_comparison.py`.

[Compactação 1366 × 768 antes](phase-7-evidence/compact-before.png) · [depois](phase-7-evidence/compact-after.png). Capturas e detalhes adicionais do ZIP constam na [Fase 6](PHASE_6.md).

## Desempenho medido

| Operações | Validação Node antes → depois (ms) | Preparação do gráfico antes → depois (ms) | Lista Chromium antes → depois (ms) | Linhas desktop antes → depois |
|---|---|---|---|---|
| 100 | 7.01 → 3.93 | 0.25 → 0.24 | 1571.8 → 364.0 | 100 → 50 |
| 1000 | 32.6 → 15.4 | 13.76 → 0.47 | 6351.0 → 485.4 | 1000 → 50 |
| 5000 | 575.88 → 107.71 | 255.17 → 3.85 | 34035.3 → 570.4 | 5000 → 50 |

O ensaio Node anterior usa o código financeiro da Fase 6. O ensaio de navegador anterior foi feito antes da paginação e da otimização de `entryViews`, já com as primeiras otimizações de domínio da Fase 7. `metrics` em 5.000 operações passou de 1,54 para 4,08 ms, com o custo de montar o índice compartilhado; a redução relevante está na validação, no adaptador e na renderização da lista. Todas as serializações financeiras permaneceram idênticas durante o ensaio de navegação.

Medições locais em Node 24 e Chromium, com dados sintéticos de 100, 1.000 e 5.000 operações/liquidações. Os tempos dependem de CPU/carga, cache e concorrência dos testes; não são SLA nem medições em aparelho físico. O benchmark de funções registra a média de três execuções; o de navegador inclui navegação/renderização real com movimento reduzido. Os scripts permitem repetir o ensaio.

A paginação mantém 50 linhas por layout, com primeira/anterior/próxima/última página. Pesquisa e exportação percorrem todos os registros filtrados. O teste navega à última página, procura um registro fora da primeira e confere o CSV completo e a serialização financeira intacta.

## Limitações conhecidas e operação segura

- Sem saldos bancários iniciais, conciliação, servidor, sincronização, autenticação, OCR ou importação bancária automática. Não foram acrescentados recursos fora do escopo.
- Contas indefinidas são admitidas nas previsões previstas pelo contrato; transferências conservam origem/destino explícitos. Arquivar não altera origens históricas. Categorias com uso/histórico devem ser arquivadas; a proteção não é contornada para permitir apagamento físico de referências auditadas.
- Juros simples/compostos são estimativas explícitas, não Price/CET/IOF/feriados. O total contratado informado prevalece.
- IndexedDB/Web Crypto/Web Locks e contexto seguro continuam necessários às gravações coordenadas. Não há atomicidade entre localStorage e IndexedDB: preparação, diário e compensação conservadora são mantidos. Nenhuma limpeza de arquivos ocorre automaticamente.
- Limites da Fase 6 continuam: 10 MiB por arquivo, 200 vínculos, 100 MiB físicos/agregados, JSON de 4 MiB, manifesto de 1 MiB e ZIP de 106 MiB. O ZIP usa memória; a preparação precisa caber junto dos arquivos locais já existentes.
- PDFs usam download, sem interpretador ativo incorporado; não há antivírus ou remoção prometida de EXIF. SHA-256 não é assinatura digital e o armazenamento local não garante permanência.
- Acessibilidade automatizada e testes de teclado/contraste foram executados em Chromium. Não constituem certificação humana WCAG, ensaio em leitor de tela real, Safari/Firefox ou aparelho físico.
- Resultados de desempenho abrangem os volumes e cenários descritos; não representam todas as combinações de dezenas de milhares de contratos/faturas/anexos.

Antes de substituir dados, exporte um **ZIP completo** em Configurações → Backup e guarde-o em local privado fora do repositório. Confira a prévia da restauração. JSON sozinho preserva metadados, mas não os arquivos; referências ausentes são sinalizadas. Após restauração, verifique a integridade local. Não use GitHub como armazenamento de backups pessoais.

## Parecer e pendências

**Candidato estável para revisão e integração controlada desta branch, dentro dos cenários e limites documentados.** Não restaram falhas críticas conhecidas de integridade, segurança ou funcionamento nas verificações executadas. As 58 linhas da matriz estão validadas; as oito jornadas solicitadas têm evidência funcional, e não somente implementações isoladas.

Não há pendência de implementação identificada no escopo consolidado desta fase. Permanecem os limites explícitos acima e a revisão humana do proprietário antes de integrar ou lançar uma versão pública. Não se declara certificação universal de acessibilidade, segurança, durabilidade do navegador ou suporte a plataformas não ensaiadas.

A integração definitiva permanece sob decisão do proprietário. Não foi realizado merge, PR ou release automática; `main` e `Finly-React` permanecem preservadas.
