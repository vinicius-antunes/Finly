# Melhoria 02 — Mês de referência

Terminologia da interface React padronizada para **Mês de referência / Meses de referência**, incluindo cabeçalho, formulário, filtros, tabelas, gráfico acessível, planejamentos, prévias de backup e validações. Frases receberam concordância adequada (primeiro mês, meses abrangidos, mês previsto, mês inválido).

Os arquivos alterados estão concentrados em `src/finance` (FinanceApp, EntriesWorkspace, HomeOverview, MonthlySpendingChart, BackupImport, planejamento, componentes do formulário e mensagens de domínio) e `src/components/analytics/CategoryDonut.tsx`. Os seletores textuais dos testes foram atualizados. A classificação de erros do formulário aceita a mensagem nova e a antiga, preservando o direcionamento ao campo correto.

Não foram alterados identificadores, parâmetros de URL, contratos, armazenamento, regras financeiras ou o legado. O cabeçalho histórico **Competência** do CSV permanece igual por retrocompatibilidade. Dados pessoais e descrições cadastradas não são renomeados. A Melhoria 01 permanece preservada. Nenhum novo seletor ou redesenho foi implementado.

## Validação

- TypeScript e build de produção.
- Testes estáticos e `check_public_release.py`.
- `check_entry_ui.mjs` e `check_backup.mjs`: regras financeiras e backups preservados.
- Chromium: `check_empty_activation_browser.py`, `check_dashboard_widgets.py`, `check_entry_ui_browser.py`: formulário, dashboard, três temas, desktop/mobile, persistência, proteção legada e fluxo completo.

[Evidência desktop](improvement-02-evidence/empty-direct-form-desktop.png) · [mobile](improvement-02-evidence/empty-direct-form-mobile.png).

Não foram necessários ajustes de layout: a nomenclatura utiliza os componentes responsivos existentes. As verificações usam dados sintéticos em Chromium, sem ensaio em aparelho físico.
