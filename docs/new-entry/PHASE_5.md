# Novo lançamento — Fase 5: interface e operações persistentes

Base remota conferida: `74b0010c4fa5794aa79d48ed7eab88d07ef87369`, Fase 4 publicada na branch `codex/finly-navegacao-ux`. AGENTS.md, documentação técnica e relatórios das quatro fases foram revisados. Antes da implementação passaram TypeScript, build, testes estáticos, financeiros, migração, backup, Planejamentos e Chromium da Fase 4. Trabalho exclusivo na branch autorizada, sem alterar `main`/`Finly-React` ou realizar merge.

## Interface entregue

O botão **Novo lançamento** abre diretamente o modal. O menu intermediário foi removido. Depois da preparação explícita, o modal tem cinco abas funcionais: Despesa, Receita, Cartão, Reembolso e Transferência. Ações em Fatura, Reembolsos e listas vazias iniciam no tipo correspondente. Cada aba reutiliza campos e o mesmo padrão visual.

Dialog usa os primitivos Radix/shadcn já instalados, Button/Input existentes e tokens dos três temas. Cabeçalho, abas e rodapé permanecem disponíveis; só o conteúdo tem rolagem interna. Desktop usa duas colunas e mobile uma coluna. Escape, X, clique fora e Cancelar passam pela confirmação de descarte quando existem alterações. Fechar sem alterações restaura o foco ao acionador. A formatação monetária equivalente não conta como alteração. Há proteção de saída da página, foco visível, contenção de foco pelo Radix, rótulos associados, mensagens anunciáveis, abas com setas/Home/End e suporte a movimento reduzido.

Descrição, valor, data, competência e observação compatíveis são preservados ao trocar o tipo; configurações específicas exigem confirmação antes de serem descartadas. Categorias incompatíveis não são levadas ao outro tipo. Erros ficam nos campos e em um resumo; o foco vai ao primeiro campo inválido. Falhas não limpam o formulário. Rascunhos dos painéis de pagamento e de cadastros internos também participam da proteção de descarte; é necessário concluí-los ou limpá-los antes de salvar a edição principal.

Campo monetário reutilizável aceita digitação/colagem brasileira e formata em reais ao sair. Parsing e formatação do campo usam inteiros/BigInt, incluindo o limite seguro máximo; não fazem multiplicação de moeda em ponto flutuante. O estado financeiro continua contendo apenas centavos inteiros.

## Ativação segura

Sem `entryLedger`, Novo lançamento abre a preparação:

1. Exportar um backup JSON do estado atual.
2. Validar e conferir a prévia da Fase 1.
3. Confirmar que o backup foi guardado e autorizar a preparação.
4. Executar `activateEntryLedger` e persistir o resultado validado.

Backup e prévia são vinculados ao snapshot completo. Se o estado mudar, é necessário exportar novamente e revisar. O motor não é ativado no primeiro acesso nem ao apenas abrir o modal. Não cria contas/cartões, não converte lançamentos antigos e preserva cofrinhos/configurações. Falha de gravação não conclui a ativação. Antes da ativação há a opção explícita **Continuar no cadastro anterior**; ela não prepara o ledger.

Contas, cartões e categorias são cadastrados explicitamente no próprio modal ou em Configurações → Financeiro. Nome e informações são fornecidos pelo usuário. Nenhuma informação de conta ou fechamento é inferida do cartão legado.

## Funcionalidades conectadas

| Tipo | Comportamento persistente |
| --- | --- |
| Despesa | Obrigação pendente, parcial, paga ou inicialmente cancelada; pagamentos com valor/data/conta/método/nota, saldo e histórico separados da despesa |
| Receita | Previsão, parcial ou recebida, com data efetiva distinta; identificação explícita de salário e regra da Fase 2 para substituir a referência salarial |
| Cartão | Seleção de cartão, sugestão a partir do uso existente, primeira fatura pelo fechamento ou ajuste manual, compra prevista/confirmada, total ou valor por parcela, entrada, juros e total final contratado |
| Reembolso | Origem avulsa ou compra existente, responsável opcionalmente identificado, acordo único/parcelas/customizado, recebimentos parciais em contas distintas, saldo e histórico |
| Transferência | Origem/destino diferentes, previsão ou efetivação, persistência idempotente na coleção própria; nenhum registro de receita/despesa |

Parcelamentos e juros reutilizam `quotePurchase`, `registerPurchase`, `previewInstallments` e `applyInstallments`. Não existe segunda calculadora. A prévia mostra original, entrada, total contratado, parcelas com ajuste exato de centavos e primeira competência. A confirmação da compra não quita fatura.

Compras pessoais ocultam os acordos. Compras para terceiros/compartilhadas aceitam vários responsáveis, cada um com identidade independente, valor e modalidade de recebimento. Nome vazio representa identificação pendente. A soma é validada pelo teto contratual da Fase 4, sem somar entrada duas vezes. Cronogramas customizados permitem datas opcionais e competências distintas. Data prevista não gera dinheiro recebido.

`Payments` registra pagamentos/recebimentos adicionais e seus estornos pelas APIs anteriores, preservando o evento original e impedindo estorno duplicado/excedentes. Em acordos com várias previsões, o usuário escolhe qual obrigação receber. Cancelar exige regularização dos recebimentos líquidos. Fatura tem gerenciamento próprio de pagamentos/estornos, independente dos reembolsos.

Recorrências mensais/anuais mostram a próxima data pelo calendário do motor, início, término opcional e intervalo explícito de previsões até 24 meses. As ocorrências são previstas, sem pagamentos automáticos. Parcelas e recorrências permite gerar novas previsões, pausar, retomar, cancelar e alterar o valor de uma ocorrência ou desta e das próximas. Datas/IDs anteriores são preservados; ocorrência confirmada/liquidada usa correção individual guiada, conforme a Fase 3.

Categorias podem ser pesquisadas/criadas no formulário. Configurações permite renomear, arquivar/reativar, reclassificar e excluir com proteção. Renomear preserva nomes anteriores; reclassificar operações gera correções com snapshots da classificação anterior e nova. Categoria com uso/histórico não pode ser excluída. O gerenciamento cobre as categorias por identidade do novo motor; categorias textuais antigas continuam no fluxo compatível, sem conversão implícita.

## Planejamentos

Compra à vista aceita data efetiva de pagamento distinta da data da operação (`CashPurchaseInput.cash.paymentDate` opcional, mantendo o padrão anterior quando ausente). Despesa à vista e compra no cartão podem selecionar um cofrinho existente. O formulário mostra reservado, valor solicitado e saldo restante. A utilização e a conclusão exigem confirmação explícita própria, além da prévia final. `previewPlannedPurchase`/`confirmPlannedPurchase` montam o mesmo estado que contém a compra e a movimentação do objetivo.

Selecionar/simular não grava. Salvar grava uma única vez em `finly-v2`, preservando aportes, reserva geral e vínculos. O movimento da reserva não é despesa adicional. Objetivos concluídos pelo fluxo antigo ou pelo novo não podem ser usados para concluir a mesma compra outra vez. Compra vinculada pode ser consultada em Planejamentos. Cancelar não devolve reserva automaticamente.

## Prévia, concorrência e edição

Operações com cartão, parcelas, juros, entrada, recorrência, múltiplos responsáveis, cronograma customizado, cofrinho ou edição passam por prévia legível. Transferências também usam confirmação. A prévia lista operações, valores anteriores/novos nas correções e pagamentos/recebimentos que serão confirmados, com conta e data. Não exibe JSON.

A confirmação guarda o snapshot completo e é invalidada quando o estado muda. Mudança externa no próprio registro em edição bloqueia salvar até reabri-lo, mantendo os campos para consulta. `commit` verifica que a base do chamador ainda corresponde ao snapshot carregado e usa o compare-and-set existente. Todas as partes de uma operação composta são preparadas antes da gravação única; falha de quota/concorrência mantém a versão persistida anterior. IDs estáveis no rascunho e trava de envio evitam repetição do mesmo salvamento.

- Operações simples: descrição, valor, competência, nota, categoria e campos aplicáveis passam por correção com motivo, snapshots anterior/novo e confirmação; pagamentos originais permanecem intactos.
- Cartão parcelado: escopos esta parcela, esta e próximas ou toda a compra. Escopo altera valores/competências; descrição, categoria e situação referem-se apenas ao registro selecionado. A data original e o cartão ficam protegidos. Impacto em fatura paga/reembolso é validado pelas APIs anteriores.
- Reembolso: edição do acordo preserva identidade e previsões históricas. Não redistribui automaticamente um acordo acompanhando parcelas quando apenas o responsável é editado. Alterar cronograma/total passa pelas regras da Fase 4.
- Recorrência: valor pode atingir só esta ocorrência ou esta e próximas; confirmação de uma compra/pagamento é individual. Metadados referem-se à ocorrência selecionada.
- Duplicação: novos IDs e registro independente; não copia liquidações, parcelas, acordos ou vínculos com cofrinho. Salário exige nova identificação explícita na cópia.
- Legado: edição/duplicação continuam no formulário compatível, identificado como cadastro anterior. Abrir a edição não migra nem recria parcelas/pagamentos antigos. Proteção de descarte também foi aplicada a esse formulário. Mudança em outra aba mantém o rascunho aberto e impede sobrescrever um registro antigo alterado desde a abertura.

## Integração e dados

Depois de salvar, a lista abre na competência do registro (inclusive primeira fatura no mês seguinte), preservando os filtros ativos. Lançamentos recebe operações antigas e novas pelo adaptador `entryViews`, com os mesmos filtros, busca, ações e CSV. Parcial e cancelado possuem filtros/situações próprios. Totais usam recebimentos/pagamentos líquidos reais; cancelamentos do novo motor não entram como compromissos ativos. Textos de situação antigos desconhecidos não são reinterpretados como novos eventos financeiros. Transferências têm seção própria no mesmo destino, com origem/destino, valor e efetivação, sem fingir que são receitas.

Reembolsos agrega os dois modelos e mostra acordos/obrigações nas consultas principais. Fatura mostra as compras dos cartões e seus pagamentos, preservando o controle legado separado. Parcelas e recorrências tem gerenciamento e consulta do contrato original. Visão Geral continua usando o motor financeiro compartilhado; o adaptador de gráficos agora resolve o nome das categorias novas. Configurações inclui os cadastros reais. Exportação JSON preserva todas as coleções; CSV de lançamentos inclui as operações dos dois modelos (transferências continuam entidades separadas).

Extensões opcionais, sem mudar a versão externa 2/interna 1:

- `Operation.note`.
- `Recurrence.salary` e `Recurrence.note`, propagados para suas novas previsões.
- `Correction.previousOperation`/`nextOperation`, snapshots validados quando presentes.
- `Category.previousNames`, histórico de renomeação.

`Entry.ledgerManaged` e `ledgerPaidCents` são propriedades somente das consultas, nunca cópias persistidas em `transactions`. Backups antigos sem os campos novos continuam aceitos. `saldoclaro-v1` permanece intacta. Não houve migração de dados reais ou ativação automática.

## Componentes e arquivos

- `ui/EntryDialog`, `EntryTabs`, `EntryComposer`: modal, navegação acessível e coordenação do formulário.
- `ui/fields`, `money`, `CatalogSettings`: campos, entrada monetária, categorias, contas e cartões.
- `ui/EntrySections`: componentes de parcelamento, recorrência, planejamento e confirmação.
- `ui/PeopleFields`, `Payments`, `OperationsManager`: acordos, liquidações, estornos, transferências, compras, faturas e recorrências.
- `ui/Activation`, `draft`, `views`, `entry.css`: preparação explícita, validação/composição pura, consultas e temas/responsividade.
- `entry-system/catalog`, contratos/schema, recorrências e adaptador de gráficos: extensões necessárias sobre o domínio existente.
- `FinanceApp`, `EntriesWorkspace`, `entries`: abertura direta, integração das consultas/ações e persistência protegida.
- Novas suítes e ajustes dos helpers de regressão/seletores para a abertura direta e para as consultas integradas. Nenhum teste financeiro foi removido.

## Testes e evidências

Somente dados sintéticos. A entrega executou TypeScript, build, testes estáticos, release pública, dez suítes Node de finanças/migração/backup/Planejamentos/domínio/formulários e os testes Chromium anteriores, além de duas suítes novas de fluxos reais:

- `check_entry_ui.mjs`: moedas em inteiros até o limite seguro, cinco tipos persistentes, salário, parcial, total/parcela/juros/entrada, centavos exatos, vários responsáveis/custom, transferência neutra, recorrências mensais/anuais, uso atômico de objetivo, correção auditada, cópia independente e categorias protegidas.
- `check_entry_ui_browser.py`: ativação com download/validação/confirmação, cinco abas, campos preservados, descarte/foco/erros, criação real de todos os tipos, recebimentos e pagamentos parciais, edição, prévia, temas/mobile e reload.
- `check_entry_ui_management.py`: escopos de parcelas, cópia sem vínculos, cronograma customizado, clique duplo, quota com preservação/repetição, mudança em outra aba invalidando prévia, cadastros dentro do modal sem submissão acidental, pagamento/estorno de fatura e pausa/retomada/cancelamento e preservação de rascunho legado diante de edição concorrente.

Regressões Node: `check_finance`, `check_backup`, `check_planning`, `check_entries`, `check_monthly_spending`, `check_entry_foundation`, `check_entry_finance`, `check_credit`, `check_reimbursements`. Chromium: reembolsos Fase 4, crédito, motor Fase 2, finanças, backup, Planejamentos, Lançamentos, navegação, Home, inicialização e cabeçalho. TypeScript, build, testes estáticos, financeiros e regressões listadas passaram. Também passaram as verificações adicionais de widgets do dashboard, tema e layout premium legado. Não foram usados dados financeiros reais.

[Graphite desktop](phase-5-evidence/graphite-desktop.png) · [Escuro desktop](phase-5-evidence/dark-desktop.png) · [Claro desktop](phase-5-evidence/light-desktop.png)

[Graphite mobile](phase-5-evidence/graphite-mobile.png) · [Escuro mobile](phase-5-evidence/dark-mobile.png) · [Claro mobile](phase-5-evidence/light-mobile.png)

## Limites e Fase 6

- Transferências efetivadas são consultáveis e previsões podem ser efetivadas; não há edição destrutiva de uma transferência já realizada. Regularizações devem ser movimentações explícitas, preservando o histórico.
- Cartão/data original de contrato e histórico de pagamentos não podem ser substituídos diretamente. Alterar o total de uma compra à vista já vinculada exige regularização do contrato; o formulário recusa quebrar esse vínculo. Faturas pagas e obrigações já recebidas mantêm as proteções financeiras anteriores.
- Categorias antigas permanecem textuais; não existe conversão automática para categorias por ID. O formulário compatível continua necessário para registros legados.
- Não há upload operacional, binários em localStorage, anexos falsos ou ZIP. IndexedDB, inspeção de arquivos, integridade dos comprovantes e backup/restauração com binários são o escopo da Fase 6.
- Capturas e fluxos foram exercitados em Chromium desktop/mobile simulado, sem teste em dispositivo físico. Regras de juros/feriados continuam nos limites documentados na Fase 3.
