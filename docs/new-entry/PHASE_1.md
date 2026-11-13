# Novo lançamento — Fase 1: contratos e preparação de migração

**Entrega parcial. A reformulação completa e o formulário com cinco abas ainda não estão implementados.** Esta execução entrega os fundamentos isolados e testados, sem ativar um segundo modelo financeiro na aplicação. Base: `a088c314150a561c8e97b548dc97a34dc6257446`, exclusivamente em `codex/finly-navegacao-ux`.

O pedido permite encerrar uma execução em estado consistente: “Se não for possível concluir todas as fases com segurança na mesma execução, parar em um estado consistente, documentar claramente o que foi concluído e o que falta, sem apresentar funcionalidades incompletas como prontas.” A separação preserva o aplicativo funcional enquanto o novo domínio financeiro é construído e validado.

## Implementado nesta fase

### Contratos versionados

`src/finance/entry-system/contracts.ts` define identidades independentes para contas, cartões, categorias, operações, compras, liquidações, faturas, pagamentos de fatura, transferências, recorrências, responsáveis por reembolso, metadados de comprovantes e correções.

- Compra, entrada, parcelas, fatura e quitação têm vínculos distintos.
- Transferências possuem coleção própria, sem simular receita/despesa.
- Identificação salarial é explícita; não depende da descrição.
- Datas da operação, competência e vencimento são separadas. Datas desconhecidas podem permanecer ausentes.
- Cartões permitem fechamento, vencimento e regra no dia do fechamento ausentes; nenhum dado é inferido do cartão legado.
- Liquidações guardam conta, data, valor, método, observação e referência de estorno.
- Categorias possuem estado de arquivamento e tipos aplicáveis.
- Recorrências distinguem frequência, início, término, situação e ocorrências identificadas.
- Metadados de comprovantes distinguem identidade, operação, MIME, tamanho e SHA-256. **Isso não implementa upload nem verifica o conteúdo de arquivos.** O limite de contrato proposto é 10 MiB por arquivo e será revisto com limites agregados/ZIP na Fase 6.

Esses contratos são uma base técnica para as próximas fases, não operações novas disponíveis para o usuário.

### Validação estrutural e de vínculos

`schema.ts` verifica versão, coleções limitadas, IDs globais únicos, centavos inteiros seguros, datas civis reais (incluindo anos bissextos), competência, tipos e referências. Recusa transferências para a mesma conta, campos salariais incompatíveis, cartão em tipo errado, conta divergente do cartão, parcela de outra fatura, ocorrência duplicada, anexo HTML e metadados incompletos.

Pagamento de fatura tem entidade própria; uma liquidação de compra no cartão é recusada como substituto da quitação da fatura. Vínculos de estorno devem apontar à mesma obrigação e ao valor original.

**Validação estrutural não equivale às regras financeiras finais.** Saldos liquidados, limites de reembolso, soma contratual das parcelas, salário substituindo previsão, cancelamentos, ajustes em faturas quitadas e idempotência dos comandos financeiros serão implementados/testados nas fases seguintes. Não se deve gravar/ativar um ledger preenchido usando apenas este validador.

### Preparação segura, sem gravação

`migration.ts` oferece:

- `previewEntryMigration`: valida o v2 atual, calcula SHA-256 do estado completo, registra IDs legados, totais por competência/tipo e campos desconhecidos a complementar.
- O hash inclui configurações, faturas, pendências, cofrinhos, histórico, revisão e metadados existentes; uma alteração invalida a prévia.
- Não gera contas, cartões, compras, parcelas, datas ou pagamentos. O contrato novo começa vazio; o estado legado permanece como fonte protegida, sem duplicá-lo em operações novas.
- `confirmEntryMigration`: exige declarações explícitas de backup exportado e confirmação, recusa prévia alterada ou desatualizada e devolve uma cópia independente com estado `prepared`.
- As APIs são puras e não leem/escrevem localStorage, IndexedDB, arquivos ou rede. Não há ativação automática ou botão de migração novo nesta fase. As declarações de consentimento são requisitos da API; a futura interface deverá obter a confirmação real e realizar/verificar a exportação.

## Preservação

Não houve alteração em `State`, `metrics`, geração de parcelas existente, persistência, importação/exportação, componentes de Planejamentos, faturas, reembolsos, formulário ou demais telas. Os contratos novos não são importados pelo aplicativo em execução. Backups atuais continuam no mesmo formato; nenhum campo é acrescentado durante a inicialização. `saldoclaro-v1` e os cofrinhos permanecem intactos.

A migração efetiva de dados e sua persistência **não foram executadas**. O próximo estágio deverá integrar os novos contratos aos cálculos e ao fluxo explícito de ativação antes de aceitar dados novos nesse modelo.

## Testes

Todos os comandos abaixo passaram.

```sh
npm run check
npm run build
npm run test:static
node tests/check_entry_foundation.mjs
node tests/check_finance.mjs
node tests/check_backup.mjs
node tests/check_planning.mjs
node tests/check_entries.mjs
node tests/check_monthly_spending.mjs
python3 tests/check_public_release.py
python3 tests/check_planning_browser.py
python3 tests/check_finance_browser.py
python3 tests/check_backup_browser.py
python3 tests/check_navigation_ux.py
```

A suíte nova usa somente dados sintéticos: contratos completos, IDs repetidos, referências ausentes, centavos fracionários/inseguros, datas inválidas, bissexto, fechamento desconhecido, limites de metadados, salário explícito, separação de transferência/quitação, prévia determinística, consentimento ausente, revisão desatualizada, adulteração de IDs, cópia independente, cofrinhos e métricas preservados. Incluída no GitHub Actions.

Sem mudança visual nesta fase; capturas do novo formulário pertencem à Fase 5. Os testes Chromium executam a interface existente para verificar que os fundamentos não causaram regressão.

## Próximas fases — ainda pendentes

| Fase | Trabalho restante |
| --- | --- |
| 2 | Posting/ativação transacional, pagamentos e recebimentos parciais, salário, transferências, projeções e regras contra duplicidade |
| 3 | Cadastro/uso de múltiplos cartões, cálculo de competência, centavos na última parcela, juros contratados, entrada, recorrências mensais/anuais e alteração futura |
| 4 | Múltiplas pessoas/cronogramas/reembolsos parciais, limites vinculados e compra pelo novo fluxo integrada aos cofrinhos |
| 5 | Modal com cinco abas, campos contextuais, máscara, erros por campo, confirmação de descarte, prévias e edição/correção guiada |
| 6 | IndexedDB, inspeção de arquivos reais, integridade de binários, manifesto e ZIP com restauração confirmada |
| 7 | Regressões completas entre todas as abas, acessibilidade, temas e capturas desktop/mobile do novo fluxo |

A integração persistente deve ser revisada com as regras da Fase 2; não se pode ativar contratos que ainda não participam dos indicadores financeiros. Ainda não há transferência, múltiplos cartões ou comprovantes utilizáveis na interface.
