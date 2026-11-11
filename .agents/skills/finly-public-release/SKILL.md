---
name: finly-public-release
description: Use antes de commit, push, Pages, PR ou release. Não ativar para leitura exploratória sem entrega.
---

# finly-public-release

Entrada: diff, staging e alvo da entrega. Leia docs/SECURITY_PRIVACY.md.
1. Execute `python3 tests/check_public_release.py` e `python3 tests/check_agent_setup.py`, além dos testes pertinentes.
2. Inspecione git status, git diff, git diff --cached --stat e git diff --cached. Confira arquivos não rastreados antes de adicionar.
3. Procure credenciais e arquivos financeiros privados: JSON de backup, CSV real, extrato, PDF pessoal e screenshots. Use somente fixtures sintéticas; nunca imprima valores sensíveis em relatórios.
4. Confira README consistente, escopo e resultado da CI. Diferencie CI ainda não executada de CI verde.
5. Trabalhe em codex/...; envie PR para main, aguarde revisão humana e merge manual.
Saída: PASS/FAIL, comandos, riscos e verificações não executadas. Dados reais ou segredos bloqueiam publicação. Não publique até removê-los com segurança; não exponha o conteúdo no relatório.
