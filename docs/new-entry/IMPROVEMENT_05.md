# Melhoria 05 — tipografia e espaçamento

## Auditoria e alterações

O token original `--tracking-normal: -0.025em` comprimia todo o texto herdado. Alguns títulos ainda aplicavam valores negativos próprios, incluindo `-0.04em` no Novo lançamento. A revisão conserva Plus Jakarta Sans e normaliza o tracking de leitura, sem modificar cores, brilho, hover, bordas, sombras ou a organização das páginas.

Uma folha compartilhada estabelece corpo de 14 px, texto auxiliar de 13 px (12 px no dashboard de baixa altura), seções de 16 px e títulos de página entre 24 e 30 px. Títulos mantêm no máximo -0.01em; valores monetários usam tracking normal e números tabulares. Pesos, entrelinhas e rótulos seguem uma hierarquia comum. A escala de espaçamento utiliza 4 px, com 8 px para rótulos e 16 px para grupos.

Planejamentos recebe 16 px entre os quatro indicadores e o texto financeiro seguinte, com 8 px entre observação e explicação complementar. O conteúdo financeiro permanece integralmente igual. Os cards mantêm padding e proporções existentes, e os títulos/valores ganham separação consistente. Campos, erros, textos auxiliares, tabelas, estados vazios e notificações seguem a mesma escala. Textos pequenos da Sidebar também ganham legibilidade.

A composição de nove widgets continua limitada à altura disponível nos desktops compatíveis. As exceções de tipografia compacta em telas baixas são explícitas. Não foi antecipado o alinhamento específico do cabeçalho da Melhoria 06; não foram mudados seus controles, posicionamento ou estrutura.

## Arquivos

- `src/theme/typography.css`: tokens e estilos compartilhados, restritos à interface React e seus modais/popovers.
- `src/main.tsx`: importa a folha de revisão após os estilos existentes.
- `tests/check_typography.py`: comparação visual reproduzível, responsividade, ampliação de texto e preservação do estado.
- Este documento e a pasta de evidências.

Nenhum cálculo, contrato, dado, funcionalidade ou biblioteca foi alterado. O legado mantém seus próprios arquivos e estilos. Melhorias 01–04 preservadas.

## Verificações

TypeScript, build de produção, test:static e check_public_release.py aprovados. Regressões de domínio `check_finance.mjs`, `check_credit.mjs`, `check_backup.mjs` e `check_empty_activation.mjs` aprovadas.

O teste dedicado percorre oito páginas, três temas e larguras 1920, 1440, 1366, 1024, 768, 390 e 360 px. Confere ausência de rolagem horizontal, formulário com botão Salvar visível, igualdade dos dados financeiros e 200% no tamanho raiz do texto em viewport de 720 px (simulação de ampliação de texto, não uso do controle de zoom do navegador). Capturas são realizadas após fontes carregarem e com movimento reduzido.

Também foram executadas as regressões `check_dashboard_widgets.py` e `check_installments_workspace.py`, abrangendo widgets, efeitos, tabela/gráfico acessível, pesquisa, expansão, ações e registros antigos/novos/mistos. A auditoria `check_accessibility.py` usa axe-core AA, teclado, foco, Escape, touch e os cinco tipos do formulário, além de conferir sete larguras e os dados preservados. **Resultado: 39 execuções axe, zero violações AA detectadas.** Resultados detalhados constam em `accessibility.json` nesta pasta.

Os testes usam Chromium com dados exclusivamente sintéticos. Não se declara certificação WCAG humana, ensaio em leitor de tela, aparelhos físicos ou todos os navegadores.

## Dashboard compacto

Medições do limite inferior real dos widgets (px), com a mesma base sintética:

| Tema | Viewport | Antes | Depois |
|---|---|---|---|
| graphite | 1920 × 1080 | 924.78 | 862.52 |
| graphite | 1440 × 900 | 858.19 | 828.67 |
| graphite | 1366 × 768 | 737.20 | 742.56 |
| dark | 1920 × 1080 | 855.12 | 862.52 |
| dark | 1440 × 900 | 828.12 | 828.67 |
| dark | 1366 × 768 | 737.20 | 742.56 |
| light | 1920 × 1080 | 855.12 | 862.52 |
| light | 1440 × 900 | 828.12 | 828.67 |
| light | 1366 × 768 | 737.20 | 742.56 |

## Comparativos visuais

As capturas anteriores foram feitas antes da alteração, sobre o build da Melhoria 04 (`815161b`). As posteriores usam o build real desta melhoria, com os mesmos dados, tema, período e resolução. Não há remoção/injeção de estilos para fabricar o antes/depois. São 48 capturas das quatro áreas prioritárias.

| Tema / Página | Antes desktop / mobile | Depois desktop / mobile |
|---|---|---|
| graphite / Visão Geral | [desktop](improvement-05-evidence/before-graphite-visao-geral-1440.png) · [mobile](improvement-05-evidence/before-graphite-visao-geral-390.png) | [desktop](improvement-05-evidence/after-graphite-visao-geral-1440.png) · [mobile](improvement-05-evidence/after-graphite-visao-geral-390.png) |
| graphite / Planejamentos | [desktop](improvement-05-evidence/before-graphite-planejamentos-1440.png) · [mobile](improvement-05-evidence/before-graphite-planejamentos-390.png) | [desktop](improvement-05-evidence/after-graphite-planejamentos-1440.png) · [mobile](improvement-05-evidence/after-graphite-planejamentos-390.png) |
| graphite / Parcelamentos | [desktop](improvement-05-evidence/before-graphite-parcelas-1440.png) · [mobile](improvement-05-evidence/before-graphite-parcelas-390.png) | [desktop](improvement-05-evidence/after-graphite-parcelas-1440.png) · [mobile](improvement-05-evidence/after-graphite-parcelas-390.png) |
| graphite / Novo lançamento | [desktop](improvement-05-evidence/before-graphite-form-1440.png) · [mobile](improvement-05-evidence/before-graphite-form-390.png) | [desktop](improvement-05-evidence/after-graphite-form-1440.png) · [mobile](improvement-05-evidence/after-graphite-form-390.png) |
| dark / Visão Geral | [desktop](improvement-05-evidence/before-dark-visao-geral-1440.png) · [mobile](improvement-05-evidence/before-dark-visao-geral-390.png) | [desktop](improvement-05-evidence/after-dark-visao-geral-1440.png) · [mobile](improvement-05-evidence/after-dark-visao-geral-390.png) |
| dark / Planejamentos | [desktop](improvement-05-evidence/before-dark-planejamentos-1440.png) · [mobile](improvement-05-evidence/before-dark-planejamentos-390.png) | [desktop](improvement-05-evidence/after-dark-planejamentos-1440.png) · [mobile](improvement-05-evidence/after-dark-planejamentos-390.png) |
| dark / Parcelamentos | [desktop](improvement-05-evidence/before-dark-parcelas-1440.png) · [mobile](improvement-05-evidence/before-dark-parcelas-390.png) | [desktop](improvement-05-evidence/after-dark-parcelas-1440.png) · [mobile](improvement-05-evidence/after-dark-parcelas-390.png) |
| dark / Novo lançamento | [desktop](improvement-05-evidence/before-dark-form-1440.png) · [mobile](improvement-05-evidence/before-dark-form-390.png) | [desktop](improvement-05-evidence/after-dark-form-1440.png) · [mobile](improvement-05-evidence/after-dark-form-390.png) |
| light / Visão Geral | [desktop](improvement-05-evidence/before-light-visao-geral-1440.png) · [mobile](improvement-05-evidence/before-light-visao-geral-390.png) | [desktop](improvement-05-evidence/after-light-visao-geral-1440.png) · [mobile](improvement-05-evidence/after-light-visao-geral-390.png) |
| light / Planejamentos | [desktop](improvement-05-evidence/before-light-planejamentos-1440.png) · [mobile](improvement-05-evidence/before-light-planejamentos-390.png) | [desktop](improvement-05-evidence/after-light-planejamentos-1440.png) · [mobile](improvement-05-evidence/after-light-planejamentos-390.png) |
| light / Parcelamentos | [desktop](improvement-05-evidence/before-light-parcelas-1440.png) · [mobile](improvement-05-evidence/before-light-parcelas-390.png) | [desktop](improvement-05-evidence/after-light-parcelas-1440.png) · [mobile](improvement-05-evidence/after-light-parcelas-390.png) |
| light / Novo lançamento | [desktop](improvement-05-evidence/before-light-form-1440.png) · [mobile](improvement-05-evidence/before-light-form-390.png) | [desktop](improvement-05-evidence/after-light-form-1440.png) · [mobile](improvement-05-evidence/after-light-form-390.png) |
