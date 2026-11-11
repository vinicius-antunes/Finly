# Codex — como começar o desenvolvimento da v1.2

## Repositório e tarefa
- Repositório: `vinicius-antunes/Finly` (público).
- Planejamento geral: https://github.com/vinicius-antunes/Finly/issues/1
- Primeira tarefa: https://github.com/vinicius-antunes/Finly/issues/2
- Regras permanentes: `AGENTS.md`.

## Preparação no Codex Cloud
1. Abra Codex no ChatGPT, selecione `Work in > Cloud` e `Select environment > Create environment` (ou use um ambiente existente que inclua este repositório).
2. Conecte sua conta GitHub se solicitado e selecione **somente** `vinicius-antunes/Finly`.
3. Confirme o checkout e prepare o ambiente com Node.js e Python. O comando de validação é `python3 tests/check_public_release.py`.
4. Publique o ambiente e inicie uma tarefa com a mensagem abaixo.

## Primeiro prompt para o Codex

> No repositório público `vinicius-antunes/Finly`, execute APENAS a issue #2 (Fase 0 da v1.2), vinculada à epic #1. Leia primeiro `AGENTS.md` e toda a documentação indicada na issue. Preserve a versão funcional v1.1.1, não use dados pessoais, crie testes determinísticos com dados fictícios, implemente migração v1→v2 idempotente e reversível, sem iniciar as outras sete funcionalidades. Trabalhe em branch `codex/...`, rode os testes, faça commits, envie ao GitHub e abra uma pull request para `main`. Não faça merge automático. Apresente resumo dos testes, riscos e limitações.

## Depois que o Codex concluir
- Examine a pull request, especialmente diferenças de valores, parcelas e reembolsos.
- Confira resultados de testes automáticos e qualquer mudança na documentação.
- Execute casos manuais com um backup **fictício** antes de testar sua própria migração local.
- Só faça merge quando a migração estiver correta.
- Inicie a Fase 1 em uma tarefa separada, depois da Fase 0 revisada.

## Privacidade
Não envie backups pessoais, extratos reais ou capturas com dados financeiros ao Codex ou ao GitHub. Mantenha testes e exemplos públicos fictícios. O código-fonte do projeto é público; mantenha backups, extratos, recibos e todos os dados financeiros pessoais somente fora do GitHub.
