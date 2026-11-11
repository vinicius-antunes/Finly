# Desenvolvimento assistido do Finly

Esta infraestrutura preserva v1.1.1. A Issue #2 (Fase 0/migração) é independente; nenhuma funcionalidade v1.2 é implementada aqui.

## Camadas e economia de contexto

`AGENTS.md` contém regras permanentes. `.codex/config.toml` registra quatro papéis em `[agents]`, com até três threads concorrentes; arquivos em `.codex/agents/` fornecem instruções específicas. Modelo e raciocínio são herdados. Revisores não editam; isso é uma instrução, não um sandbox de leitura separado.

Skills em `.agents/skills/` carregam procedimentos conforme a tarefa: invariantes financeiras, migração segura, QA de navegador e publicação pública. CI valida configuração e a base pública. MCP conectaria ferramentas externas; não é necessário nem foi adicionado.

O principal lê a issue e arquivos relevantes, delimita escopo e implementa. Para correção simples, não delegue. Use `explorer`/`worker` embutidos quando suficientes. Delegue somente perguntas delimitadas: finanças ao `finance_architect`, interação ao `frontend_reviewer`; em mudanças significativas, `test_analyst` e `privacy_reviewer` podem analisar independentemente. Aguarde relatórios antes da entrega. Um único responsável edita código por vez; não envie todo o repositório a cada revisor. Peça severidade, arquivo/símbolo, evidência breve e próxima ação.

## Prompts de uso

> Solicite ao finance_architect uma revisão somente de leitura de handleSaveEntry: o campo é valor por parcela? Retorne invariante, localização e um exemplo sintético; não edite arquivos.

> Solicite ao test_analyst um caso determinístico para 3 × R$ 19,99 a partir de 2025-12. Não implemente testes; indique entradas, meses, IDs e total esperado.

> Use $finly-browser-qa para revisar a interação alterada. Peça ao frontend_reviewer uma revisão de teclado e foco, sem edição, distinguindo constatações de hipóteses.

> Agente principal: implemente somente a correção descrita na issue selecionada em uma branch codex/..., use $finly-financial-invariants se afetar cálculos e $finly-safe-migration se afetar persistência. Preserve o legado. Execute testes e $finly-public-release; envie PR sem merge automático.

## Descoberta e compatibilidade

Em cliente Codex compatível, abra uma nova sessão confiável na raiz do checkout. Peça que informe quais instruções de AGENTS.md foram carregadas, liste as Skills e invoque uma explicitamente por `$nome`. Confirme que os quatro papéis aparecem nas ferramentas de delegação antes de usá-los. A confiança no projeto e a versão do cliente podem impedir configuração local; não reduza permissões de segurança para contornar isso. Validar TOML não comprova descoberta ou execução do runtime.

Foram consultados o [schema oficial](https://github.com/openai/codex/blob/main/codex-rs/core/config.schema.json) e as referências oficiais de [configuração](https://developers.openai.com/codex/config-reference), [agentes](https://developers.openai.com/codex/subagents) e [Skills](https://developers.openai.com/codex/skills). O schema confirmou `[agents]`, `config_file` e `max_concurrent_threads_per_session`. O site de documentação retornou HTTP 403 nesta sessão; referências não acessíveis não foram consideradas verificadas integralmente. Os TOMLs têm os metadados solicitados `name`, `description` e `developer_instructions`; compatibilidade integral do carregador destes arquivos depende do cliente e não foi testada por CLI/IDE.

Nesta sessão Cloud, duas delegações genéricas somente de leitura executaram os papéis finance_architect e test_analyst. Não houve comprovação de descoberta automática dos novos arquivos: a ferramenta disponível aceita uma tarefa textual, não seleção desses TOMLs. O primeiro confirmou valor por parcela e meses consecutivos em handleSaveEntry; o segundo propôs 3 × 19,99 em dezembro/janeiro/fevereiro, total 5997 centavos, IDs únicos, mesmo grupo, primeira parcela confirmada e seguintes previstas. Não se trata de teste financeiro automatizado.

Sem runtime de subagentes, leia o `developer_instructions` do TOML como checklist manual e aplique a Skill relevante no principal. Registre explicitamente que foi revisão manual. Não alegue execução de agentes ou descoberta de Skills sem evidência.

## Testes e privacidade

Requisitos de desenvolvimento: Python >= 3.11 (tomllib) e Node.js para validar JavaScript. Não há dependências novas, backend ou npm install para usar o app.

```bash
python3 tests/check_public_release.py
python3 tests/check_agent_setup.py
```

O primeiro verifica sintaxe JS e instalação pública vazia, sem substituir QA funcional ou auditoria de dados pessoais. O segundo valida TOMLs, Skills, caminhos e comandos, incluindo amostras inválidas isoladas em diretório temporário. Não modifica o checkout. Erros exibem caminho e motivo; sucesso lista configuração válida e rejeições esperadas. Os testes não usam rede, horário, credenciais ou dados reais.

Para UI, use contexto descartável e dados sintéticos; nunca limpe localStorage de um perfil existente. Playwright é opcional. Não publique backups, extratos, PDFs pessoais, tokens ou capturas privadas. Auditoria humana continua necessária: validadores estáticos não certificam ausência de todos os segredos.

## Entrega

Issue → branch `codex/...` → implementação pequena → testes → auditoria do diff/staging → commit → push → PR para `main` → revisão humana → merge manual. Não altere main diretamente. Antes de commit e push, aplique a Skill finly-public-release. Na PR, abra Checks → Validate e confira os dois comandos, distinguindo falha de check não executado. O workflow usa somente leitura, Python e Node, sem secrets nem serviços externos.

Na descoberta desta tarefa, fetch e leitura de refs Git funcionaram; consultas de Issues/PRs por gh/REST retornaram 403. Portanto não foi possível confirmar o conteúdo remoto da Issue #2 ou PR concorrente pela API. Nenhum escopo financeiro foi alterado para compensar essa limitação.
