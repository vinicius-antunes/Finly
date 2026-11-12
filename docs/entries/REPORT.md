# Lançamentos — reformulação funcional e visual

Implementado exclusivamente em `codex/finly-navegacao-ux`, a partir de
`17ca444925b29f9887a716090b7cc3085f200882`. Nenhuma biblioteca adicionada;
`Finly-React`, `main`, aplicação legada, schema, modelo financeiro, armazenamento
e importação não foram modificados por esta entrega.

## Defeito de edição reproduzido

Na versão anterior, o callback de salvamento limpava busca, tipo, situação e
limites de valor, ativava todos os meses e navegava para Lançamentos, inclusive
ao editar. Com uma parcela sintética importada de v1, buscar `Parcela`, editar a
descrição e salvar resultava em busca vazia e todos os meses ativados.
[Registro da reprodução](before-edit-defect.json).

Nesse cenário a descrição **era persistida**; o defeito observado foi a perda do
contexto da lista. Não foi reproduzida uma falha genérica de gravação.

Agora salvar uma edição mantém página, competência, busca, tipo, filtros e
ordenação. O formulário abre com os campos reais, valida e substitui apenas o ID
editado, usando o commit validado já existente. Preserva metadados e conta para
o mesmo tipo, incluindo `groupId`, `part`, `parts`, `purchaseId` e informações da
migração. Se o registro sair do filtro, a confirmação explica por que desapareceu.
Cancelar não grava. O diálogo tem título acessível, foco contido e restauração
de foco ao fechar.

## Interface e regras

- Desktop: tabela com descrição, categoria, competência, parcela, tipo,
  responsável, valor, situação, Editar e menu de três pontos. Até 1050 px, cartões
  substituem a tabela, mantendo as mesmas operações.
- Pesquisa compacta, cinco filtros rápidos, filtros avançados recolhidos e CSV
  em Opções da lista. Filtros combináveis usam a mesma seleção no CSV e na tela.
  Valores inválidos são sinalizados e impedem exportação enganosa.
- Todos os meses agrupa registros por competência, em ordem cronológica. A
  ordenação por valor ou descrição ocorre dentro de cada competência. Filtros
  permanecem em memória ao navegar e editar; recarregar reinicia filtros, sem
  alterar registros.
- Indicadores separados: receitas (recebidas/a receber), despesas fora do cartão
  (pagas/pendentes), compras de cartão e reembolsos recebidos/a receber quando
  pertinentes. Não representam saldo; o período e o escopo filtrado são explícitos.
- Novo lançamento concentra as quatro opções. Formulário contextual com
  sugestões nativas de categoria, permitindo texto personalizado. Normalização
  de capitalização, espaços e acentos reutiliza categorias existentes somente
  no registro salvo. Categorias antigas não são reclassificadas.
- Duplicar abre o formulário, mas não grava nem gera IDs até salvar. Gera um
  registro independente, sem copiar vínculos de compra, parcela, reembolso ou
  origem legada. Parcelas/recorrência começam em 1 e geração de reembolsos fica
  desmarcada; o usuário pode solicitá-las explicitamente no formulário.
- Excluir requer confirmação. Registros vinculados exibem aviso; somente o ID
  selecionado é excluído, preservando os demais.

| Tipo | Situações apresentadas | Campo existente utilizado |
| --- | --- | --- |
| Despesa | Pendente / Paga | `status`: `planned` / `received` |
| Receita | A receber / Recebida | `status`: `planned` / `received` |
| Cartão | Prevista / Confirmada | `confirmed`: `false` / `true` |
| Reembolso | A receber / Recebido | `status`: `planned` / `received` |

Não foram criados novos estados financeiros. Confirmar compra não paga fatura;
o pagamento continua na página Fatura do cartão. Situações importadas fora das
duas opções usuais são preservadas na edição sem mudança de situação. Projeções
e inclusão condicional de reembolsos continuam sob as regras existentes.

## Evidências sintéticas em Chromium

| Evidência | Captura |
| --- | --- |
| Antes: filtros extensos | [Antes](evidence/before-filters.png) |
| Depois: tabela e barra compacta | [Desktop](evidence/after-desktop.png) |
| Formulário preenchido de parcela importada | [Editar](evidence/edit-desktop.png) |
| Agrupamento por competência | [Todos os meses](evidence/after-grouped-desktop.png) |
| Despesa marcada como paga | [Situação aplicada](evidence/status-paid-desktop.png) |
| Graphite Green, cartões no celular | [Graphite](evidence/Graphite-mobile.png) |
| Escuro Padrão no celular | [Escuro](evidence/Escuro-mobile.png) |
| Claro no celular | [Claro](evidence/Claro-mobile.png) |
| Menu secundário por toque e Escape | [Ações no celular](evidence/mobile-actions.png) |

## Validação

Comandos executados com sucesso:

```sh
npm run check
npm run build
npm run test:static
node tests/check_entries.mjs
node tests/check_finance.mjs
node tests/check_backup.mjs
python3 tests/check_entries_browser.py
python3 tests/check_finance_browser.py
python3 tests/check_navigation_ux.py
python3 tests/check_startup.py
python3 tests/check_backup_browser.py
python3 tests/check_home.py
python3 tests/check_public_release.py
```

O novo teste de navegador cria os quatro tipos, edita parcela importada de v1,
altera valor/categoria/competência/situação, cancela edição, mantém filtros,
executa e desfaz as quatro ações de situação, preserva faturas e outras parcelas,
duplica sem vínculos, cancela e confirma exclusão, combina filtros, exporta CSV,
agrupa meses, recarrega e verifica persistência. Exercita Tab/Shift+Tab no diálogo,
Escape no menu, três temas e larguras 1440, 1366, 768 e 390 px, sem rolagem
horizontal ou erros JavaScript. Um contexto adicional com touch e movimento
reduzido executa a ação de situação por toque, sem hover. Dados são exclusivamente sintéticos e a chave
legada sentinela permanece intacta.

As regressões existentes verificam cálculos em centavos, projeções, parcelas,
reembolsos, fatura, migração, idempotência, quota, inicialização, backup,
concorrência, navegação/histórico e Sidebar desktop/mobile. O teste unitário novo
também foi incluído no GitHub Actions. O diff dos arquivos de modelo, storage,
backup/importação e legado contra o commit-base é vazio.

## Arquivos principais

- `src/finance/EntriesWorkspace.tsx`: apresentação e ações da lista.
- `src/finance/entries.ts`: seleção, categorias, situações e indicadores filtrados.
- `src/finance/FinanceApp.tsx`: integração, formulário, duplicação e salvamento.
- `src/styles.css`: estilos responsivos usando os tokens dos três temas.
- `tests/check_entries.mjs`, `tests/check_entries_browser.py`,
  `tests/entries_helpers.py`: nova cobertura e auxiliares.
- Testes de finanças, navegação e inicialização: seletores atualizados, mantendo
  as verificações financeiras existentes.
- `.github/workflows/react-check.yml`, `README.md` e este relatório.

Limite da validação visual: Chromium automatizado com viewports de desktop e
celular, sem ensaio em aparelho físico ou outros motores de navegador.
