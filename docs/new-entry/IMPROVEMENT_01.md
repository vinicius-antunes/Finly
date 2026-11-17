# Melhoria 01 — abertura direta do Novo lançamento

## Alteração

Instalações comprovadamente vazias inicializam o ledger ao abrir Novo lançamento, sem backup, confirmação ou opção de cadastro anterior. A inicialização continua passando por `activateEntryLedger`, `emptyLedgerDraft`, validação integral e pelo `commit` existente em FinanceApp (revisão e comparação do snapshot salvo). Não cria contas, cartões, categorias ou eventos no ledger. O formulário, tipos contextuais, comprovantes e regras financeiras permanecem os mesmos.

A identificação considera o estado completo, independentemente do mês, filtros e totais. Transações, pendências, metas (inclusive arquivadas), comprovantes, situações de fatura, reserva informada, histórico de migração, contas diferentes dos marcadores legados originais e campos desconhecidos impedem a inicialização automática. Preferências, notificações e configurações são preservadas. Por cautela, qualquer chave `saldoclaro-v1` existente exige o fluxo protegido; conteúdo inválido não é tratado como ausência. As contas marcadoras já existentes em `empty()` são preservadas, não copiadas para o ledger.

Bases com ledger seguem diretamente para o formulário e não são regravadas pela abertura. Importações antigas continuam explícitas e conservam o procedimento protegido quando contêm dados/histórico. Bases inválidas continuam no mecanismo de recuperação. Erros de acesso/gravação exibem aviso e não abrem um formulário temporário com dados não persistidos. Outra aba pode invalidar o snapshot; o mecanismo existente recusa a gravação obsoleta. Reabrir após falha requer atualizar a página, conforme aviso. A inicialização bem-sucedida ocorre uma vez, na primeira abertura, não em toda visita à Home.

## Arquivos

- `src/finance/entry-system/state.ts`: predicado conservador e modalidade vazia na função existente de ativação; fluxo de migração explícita preservado.
- `src/finance/entry-system/ui/Activation.tsx`: preparação automática segura e tratamento de erro; preparação protegida preservada para as demais bases. FinanceApp já centraliza todos os pontos de abertura neste componente, sem mudança de layout.
- `tests/check_empty_activation.mjs`: elegibilidade, configurações, histórico, falhas, idempotência e concorrência por snapshot.
- `tests/check_empty_activation_browser.py`: abertura real, cinco abas, recarga, preferências, duas abas, páginas contextuais e falha de persistência; capturas sintéticas.

## Verificações executadas

Todos aprovados:

- `npm run check`, `npm run build`, `npm run test:static`.
- `python3 tests/check_public_release.py`.
- `node tests/check_empty_activation.mjs`.
- `node tests/check_entry_foundation.mjs` — migração, IDs, campos incertos, consentimento, prévia obsoleta e idempotência.
- `node tests/check_backup.mjs` — backups v1/v2 e rejeição de corrupção.
- `node tests/check_entry_ui.mjs` — cinco tipos, parcelas, prévias, alterações e vínculos.
- `python3 tests/check_empty_activation_browser.py` — primeira utilização, configurações personalizadas, cinco tipos, ledger vazio, recarga sem nova gravação, duas abas compartilhando estado, abertura pela Home/Lançamentos/Fatura/Reembolsos/Planejamentos e falha de quota sem substituição.
- `python3 tests/check_entry_ui_browser.py` — proteção do legado, backup/validação/consentimento, formulários completos, temas e mobile.
- `python3 tests/check_backup_browser.py` — importação antiga, restauração explícita, concorrência, recarga e preservação.
- `python3 tests/check_startup.py` — inicialização, dados existentes, recuperação de corrupção, acesso negado e quota.

Planejamentos sem transações e históricos arquivados são cobertos no teste de elegibilidade; bases existentes e importadas são cobertas também pelas regressões de migração/backup. Foram usados exclusivamente dados sintéticos e Chromium de desktop com viewport móvel; não foi realizado ensaio em aparelho físico. Nenhuma regra monetária ou estrutura financeira foi alterada.

## Evidências

[Formulário direto em instalação vazia — desktop](improvement-01-evidence/empty-direct-form-desktop.png) · [mobile](improvement-01-evidence/empty-direct-form-mobile.png).

As capturas mostram o novo formulário com Despesa, Receita, Cartão, Reembolso e Transferência, sobre uma Home vazia. O teste confirma ausência de janela de preparação e de eventos fictícios no ledger.
