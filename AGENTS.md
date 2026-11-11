# AGENTS.md — Finly

## Objetivo
Finly é um aplicativo local-first de controle financeiro pessoal. A versão funcional de referência é v1.1.1 (`index.html`); a v1.2 está planejada em `docs/ROADMAP_v1.2.md`. Não apresente recursos planejados como implementados.

## Antes de alterar código
- Leia `README.md`, `docs/ROADMAP_v1.2.md`, `docs/MIGRATION_v1_to_v2.md`, `docs/ACCEPTANCE_TESTS.md` e `docs/SECURITY_PRIVACY.md`.
- Implemente uma fase por vez. Preserve funcionamento local, sem servidor, login, integração bancária, telemetria ou serviço pago obrigatório.
- Mantenha `main` estável. Use branches `codex/...` e pull requests, sem merge automático.
- Caso divida `index.html`, preserve execução simples em navegador e documente como testar e publicar site estático.

## Regras financeiras inegociáveis
- No modelo v2 use valores em centavos inteiros (`amountCents`), nunca float para cálculo e armazenamento.
- Distinga data da compra, competência da fatura, vencimento, pagamento e situação de confirmação.
- Separe compra, parcela, lançamento, fatura, pagamento, transferência, reembolso e previsão. Quitar fatura ou transferir entre contas não cria segunda despesa.
- Parcelamento: `totalCents = installmentCents * installmentCount`. Preserve meses originais, IDs e números de parcelas; não recrie parcelas ausentes.
- Reembolso prometido não é dinheiro recebido. Assinatura cancelada mantém histórico e não cria novas cobranças posteriores ao fim.
- Não invente transações, datas, saldos ou cartões durante migração; sinalize informações incertas.

## Dados e privacidade
- Nunca publique dados financeiros reais, e-mails pessoais, extratos, backups, capturas privadas, comprovantes reais ou credenciais. Use somente dados sintéticos nos testes.
- Preserve a chave legada `saldoclaro-v1`, sem alterá-la ou apagá-la. Grave dados v2 em `finly-v2` somente após migração explícita e validação integral.
- Antes de migrar, ofereça backup, prévia e confirmação. Compare IDs, quantidade de registros, totais por período, faturas e reembolsos. A migração deve ser idempotente.
- Anexos devem permanecer locais; valide tipo/tamanho dos arquivos e não execute conteúdo de arquivos importados.

## Qualidade e entrega
- Execute `python3 tests/check_public_release.py` e testes novos de regras monetárias, parcelamentos, reembolsos, assinaturas e migração.
- Não remova testes para esconder defeitos. Documente decisões, limitações e atualize README e documentação.
- Ao finalizar cada fase, informe alterações, resultados dos testes e riscos. **Envie commits ao GitHub e abra pull request para `main`**; aguarde revisão antes do merge.

## Agentes e Skills de desenvolvimento
- Principal coordena e implementa; revisores apenas analisam e não escrevem código. Uma mudança de código por responsável de cada vez; nunca editores concorrentes no mesmo arquivo.
- Delegue questões delimitadas: `finance_architect` para regras financeiras; `frontend_reviewer` para interação/acessibilidade; `test_analyst` para regressões; `privacy_reviewer` para privacidade/publicação. Use `explorer`/`worker` embutidos quando suficientes. Mudanças simples não precisam de subagentes.
- Skills em `.agents/skills/<nome>/SKILL.md`: `finly-financial-invariants` (lógica financeira), `finly-safe-migration` (schema/importação/persistência), `finly-browser-qa` (UI/fluxos de backup) e `finly-public-release` (antes de commit/push/PR/release).
- Antes de PR, execute testes adequados, `python3 tests/check_agent_setup.py` e auditoria de privacidade do diff/staging. Não modifique `main` diretamente nem faça merge automático.
- Detalhes, fallback manual e limites reais: `docs/AGENT_WORKFLOW.md`.
