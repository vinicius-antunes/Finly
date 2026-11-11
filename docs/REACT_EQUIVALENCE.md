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
