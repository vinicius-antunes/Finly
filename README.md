# Finly — Controle financeiro pessoal

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
