# Dark Aurora — etapas e validação

## A: temas e navegação (implementada nesta branch)

Dark Aurora é o padrão, independentemente do sistema operacional. Ajustes e backup → Aparência permite escolher Claro. A preferência `finly-theme` é separada do estado financeiro e aplicada por script local antes da pintura. Sem permissão para persistir, a escolha vale para a sessão. Outras abas recebem a preferência via evento storage.

Os tokens de assets/aurora.css adaptam componentes existentes, impressão e movimento reduzido. assets/theme.js controla apenas preferências e a gaveta de Planejamentos. Distribua index.html **junto da pasta assets** para execução local ou site estático. Não há dependências de produção.

Planejamentos abre uma gaveta com estado vazio verdadeiro; + abre uma explicação da dependência v2, não um formulário que prometa salvar metas indisponíveis. O planejamento/simulador legado permanece acessível para preservar funcionalidade. Não houve alteração nas funções financeiras, schema, importação ou exportação.

## Próximas etapas (não implementadas)

B: dashboard e UX de lançamentos/parcelas, notificações locais com leitura persistida e filtros avançados. Deve partir da etapa A revisada para evitar PRs sobrepostas no mesmo index.html.

C: metas reais, modal de criação, histórico e abas Resumo/Simulações/Plano mensal, após integração do contrato/migração v2 da Issue #2. Não gravar metas no legado nem duplicar reserva. O simulador legado só será movido após equivalência funcional comprovada.

D: distribuição multi-meta em centavos, margem explicável e ajustes manuais, após C revisada. Planos não são depósitos.

Nenhuma migração v2 está integrada à main verificada nesta tarefa. Consultas de Issues/PRs retornaram 403; o estado remoto dessas discussões não pôde ser confirmado. Revisão/merge das etapas dependentes deve ocorrer pelo proprietário, nunca automaticamente.

## Testes

- `python3 tests/check_public_release.py`
- `node --check assets/theme.js`
- `python3 tests/check_theme.py` (desenvolvimento opcional: Python Playwright e Chromium em /usr/bin/chromium; já disponíveis no ambiente usado)

O teste de navegador cria servidor temporário e contextos descartáveis: padrão escuro, persistência, sincronização de abas, invariância do JSON financeiro, gaveta/+ independentes, Escape/foco, telas legadas, cancelamento, mobile, impressão e falha de gravação da preferência. Não limpa dados de perfis existentes. A inspeção visual/contraste integral e regressão de todos os fluxos financeiros continuam verificações distintas.

Para revisão manual, teste ambos os temas em desktop e celular, percorra navegação por teclado, abra/cancele um lançamento e compare backup sintético antes/depois da troca de tema. Não use backups reais na revisão pública.
