# Privacidade e preparação para GitHub público

## O que foi removido nesta base

- Valores reais e descrições de despesas pré-cadastradas.
- Histórico personalizado, previsões de assinaturas e datas de faturas anteriores.
- Exemplos ligados a situações financeiras específicas.

O projeto público carrega lista vazia em uma instalação nova, mas **não apaga** backups ou dados já existentes na origem do navegador. O identificador legado `saldoclaro-v1` foi mantido para compatibilidade.

## O que nunca deve ir ao repositório

- JSON exportado com dados reais, CSV bancário, notas de compra, comprovantes, PDFs, prints de aplicativos e dados de contas.
- Senhas, tokens, client secrets, `.env`, cookies e chaves.
- Dados pessoais em README, testes, screenshots, exemplos e mensagens de commit.

`.gitignore` reduz o risco, mas **não impede** um upload manual pelo site, nem limpa arquivos que já tenham entrado no histórico Git.

## Checklist antes do primeiro push

1. Inspecionar `git status`, `git diff --cached --stat` e `git diff --cached`.
2. Procurar descrições privadas, valores e nomes próprios em todo o projeto.
3. Confirmar que nenhum JSON real foi adicionado, inclusive em `docs/` e `tests/`.
4. Manter backups privados fora da pasta do projeto. Nunca usar o repositório como backup financeiro.
5. Se informações privadas já foram publicadas em commits anteriores, criar histórico limpo ou reescrever o histórico adequadamente. Apagar apenas o último arquivo não elimina commits anteriores.
6. Confirmar um teste de primeiro acesso com o navegador em perfil limpo.

## Modelo de ameaças resumido

- **GitHub Pages:** hospeda apenas arquivos estáticos da aplicação; os dados de usuário ficam no navegador e não são protegidos por senha no `localStorage`.
- **Dispositivo compartilhado:** quem usa o mesmo perfil de navegador pode acessar os dados persistidos. Não usar em máquinas públicas.
- **Falhas ou limpeza do navegador:** informações podem ser perdidas; exportar backup privado regularmente.
- **Importação de terceiros:** validar formato e tamanho, nunca executar código de um JSON/CSV, escapar valores em HTML.
- **Comprovantes v1.2:** armazenamento local de arquivos e backup privado; validar tipo e tamanho; apagar metadados sensíveis quando possível, sem prometer criptografia inexistente.

## Licenças

Não foi incluída licença de código: autor deve escolher antes de conceder permissão de reutilização. Se incorporar código de outros projetos, conferir as licenças, sobretudo AGPL.
