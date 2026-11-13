# Finly — Controle financeiro pessoal

> **Entrada atual:** o Finly React abre diretamente na Home. Um v2 vazio é criado somente se a chave estiver ausente; dados existentes são preservados. Importação é opcional em Ajustes. [Inicialização, recuperação e testes](docs/DIRECT_HOME_STARTUP.md). Instruções anteriores de ativação descrevem o fluxo histórico, já substituído.


> **Atualização funcional na Finly-React:** o modo v2 agora permite operações diretamente no React após ativação explícita. Consulte [matriz, importação, testes e limites](docs/REACT_EQUIVALENCE.md). Os trechos antigos que descrevem a prévia somente de leitura registram a etapa anterior; ela permanece disponível antes da ativação. O legado e a main continuam preservados.


Aplicação web local, com HTML, CSS e JavaScript, sem instalação, servidor ou conta. Este repositório contém uma **base pública higienizada v1.1.1** e o **plano da v1.2**. As funcionalidades v1.2 descritas no roadmap **ainda não foram implementadas**.

## Executar

1. Abra `index.html` em um navegador moderno, ou publique os arquivos estáticos no GitHub Pages.
2. Ao iniciar pela primeira vez, o aplicativo não contém transações pessoais nem dados bancários.
3. Acesse **Ajustes e backup** para configurar renda, reserva, cartão, vencimento e metas.
4. Se usava a v1.1, exporte o backup JSON **no arquivo antigo**, guarde-o localmente e importe no Finly. Nunca envie o backup para um repositório público.

## Recursos existentes

- Lançamentos de cartão, despesas fora do cartão, receitas e reembolsos.
- Parcelamento: ao selecionar mais de uma parcela, informa-se **o valor por parcela**; o total é multiplicado automaticamente e cada parcela entra no mês seguinte.
- Faturas mensais com situação manual, previsões recorrentes e compras de terceiros.
- Controle simples de reserva e simulação de compra à vista/parcelada.
- Backup JSON, importação JSON e exportação CSV.
- Dados salvos apenas no `localStorage` do navegador.

Não existe sincronização automática, integração com bancos, anexos, múltiplos cartões, importação de **extratos** CSV ou dashboard personalizável nesta versão. A exportação de lançamentos em CSV **já existe**, mas a importação de extratos é parte do plano v1.2.


## Dados e segurança

O projeto **não acompanha informações financeiras reais**. Um backup exportado contém dados pessoais em texto legível; não envie esse JSON, prints reais, extratos ou comprovantes para o GitHub. O `localStorage` não é criptografado. Para troca de dispositivo ou migração para Pages, exporte e importe o backup manualmente. O app não envia dados a serviços externos nesta versão.


## Licenciamento

O projeto não inclui licença de código nesta preparação. Escolha uma licença antes de convidar contribuições ou permitir reutilização. Ideias funcionais de outros aplicativos não exigem copiar código; caso copie trechos de um projeto AGPL, verifique obrigações de licença antes.

## Aviso

Projeções são estimativas com dados inseridos manualmente; não substituem o extrato bancário ou aconselhamento financeiro.

## Aparência

Dark Aurora é o tema padrão. Em **Ajustes e backup → Aparência**, escolha Escuro ou Claro; a preferência fica salva separadamente dos dados financeiros. Mantenha a pasta `assets` ao copiar ou publicar o aplicativo. Veja [etapas do redesign e testes](docs/DARK_AURORA.md); metas múltiplas e plano mensal continuam dependentes da migração v2.

O redesign Premium reorganiza dashboard, navegação mobile, formulário, tabelas e filtros; inclui notificações locais, sem push. Consulte [as capturas com dados fictícios e as instruções do Cloudflare Pages](docs/DARK_AURORA.md). A prévia da branch é independente da produção em `main`.

## React: fases visuais 0–2

Somente na branch existente `Finly-React`: três temas, shadcn Button/Card, Aurora e spotlight discreto dos cartões. A interface continua prévia somente de leitura, com versão completa em `/legacy/`. [Auditoria, licenças e capturas](docs/REACT_VISUAL_PHASES.md). Fases 3–5 aguardam autorização. Para instalar de forma reproduzível, use `npm ci`. A hospedagem da `main` permanece independente.

## Graphite Green — execução autorizada das nove seleções

A identidade vigente passa a Graphite Green usando o CSS Tweakcn fornecido; o antigo valor de preferência `aurora` continua aceito como alias. As seis integrações iniciais foram preservadas (tema, Light Rays, Bento, donut, Tremor e Text Morph). Por decisão posterior do proprietário, Sidebar e Card Spotlight da Aceternity foram substituídos por **shadcn/ui Sidebar e Magic UI Magic Card**, com fontes e licenças MIT verificados. O Stateful Button foi removido do escopo. [Adaptações e evidências das substituições](docs/graphite/MIT_REPLACEMENTS.md). O legado e a leitura financeira continuam preservados. [Matriz, mapa de tokens, testes e evidências](docs/graphite/IMPLEMENTATION.md).

Na `Finly-React`, a Sidebar inicia recolhida e expande ao passar o mouse. O botão **Alternar menu** permite fixá-la aberta; touch continua usando o drawer. [Comportamento, testes e vídeo](docs/graphite/SIDEBAR_HOVER.md).

O Light Rays agora é o fundo global da interface Graphite Green, contínuo entre as telas React. O checkbox **Efeitos de luz** controla também o fallback estático. [Camadas, desempenho e comparativo antes/depois](docs/graphite/GLOBAL_LIGHT_RAYS.md).

A Home funcional React segue a organização da main, com aparência Graphite Green e controles de tema em Ajustes. [Comparação estrutural, capturas completas e testes](docs/HOME_MAIN_REACT.md).

Na branch isolada `codex/finly-navegacao-ux`, a navegação tem sete destinos, histórico do navegador e Configurações por abas. [Mapa, evidências e testes](docs/navigation-ux/REPORT.md).

Na branch `codex/finly-navegacao-ux`, backup e importação usam uma única janela com seleção, conferência e confirmação. [Fluxo, segurança, antes/depois e testes](docs/backup-import/REPORT.md).

Na mesma branch, Lançamentos usa filtros compactos, indicadores separados, tabela no desktop e cartões no celular. Edição preserva o contexto, e ações de situação e duplicação respeitam os vínculos financeiros. [Correções, capturas e testes](docs/entries/REPORT.md).

O cabeçalho adapta o botão de menu à capacidade de hover, usa sino com contador e painel de notificações locais e apresenta sucessos em toast temporário. [Comportamento, capturas e testes](docs/header/REPORT.md).

A Visão Geral agora é um dashboard executivo em três linhas, com seis meses de gastos registrados e atalhos para os detalhes. [Cálculos, comparação visual e testes](docs/dashboard/REPORT.md).

A Visão Geral adapta as proporções à altura do desktop e compartilha o brilho MagicCard entre os nove widgets. Os dados do gráfico permanecem acessíveis sem lista expansível. [Evidências e testes](docs/dashboard-tuning/REPORT.md).

Planejamentos agora reúne objetivos e cofrinhos com histórico confirmado, alocação por competência e simulações à vista/parceladas/com entrada. O saldo projetado original permanece separado. [Regras, compatibilidade, capturas, testes e limites](docs/planning/REPORT.md).

A reformulação completa de Novo lançamento está em execução por fases. A Fase 1 prepara contratos e prévia de migração isolados, sem ativação ou mudança visual. [Escopo entregue, testes e fases pendentes](docs/new-entry/PHASE_1.md).

A Fase 2 de Novo lançamento acrescenta o motor opcional de liquidações parciais, salário identificado, transferências neutras e correções auditadas, com integração de projeções e backup. O novo cadastro visual permanece na Fase 5. [Regras, testes e limites](docs/new-entry/PHASE_2.md).
