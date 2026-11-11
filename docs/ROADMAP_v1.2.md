# Finly v1.2 — Roadmap técnico

**Status:** planejamento aprovado como escopo funcional; **implementação pendente**. Base do repositório: v1.1.1 pública sem dados pessoais.

## Princípios

- Local-first, sem login e sem backend obrigatório.
- Valores monetários como centavos inteiros em armazenamento v2.
- Cada informação financeira tem identidade e origem únicas.
- Separar **movimento**, **compra**, **parcela**, **fatura**, **pagamento**, **reembolso** e **previsão**; evitar contagem dupla.
- Preferir IndexedDB para volumes maiores e anexos; exportação privada robusta e migração reversível.
- Não exigir integração bancária, IA, Nextcloud, serviços pagos ou sincronização externa.

## Fases e dependências

| Fase | Recursos entregáveis | Depende de | Critério de pronto |
| --- | --- | --- | --- |
| 0 | Baseline v1.1.1 limpo, testes de regressão, backup, contrato de dados v2 | v1.1 | Instalação começa vazia; legado importa; valores e parcelas preservados |
| 1 | **Contas e cartões**: carteira, conta, cartão, limite, fechamento e vencimento; transações vinculadas à origem | 0 | Cada compra tem cartão; transferências não alteram despesas; fatura não é paga duas vezes |
| 2 | **Assinaturas avançadas**: periodicidade, status ativo/pausado/cancelado, próxima cobrança, histórico; **limites por categoria** com gastos reais e projetados separados | 1 | Cancelamento impede novas previsões; categorias respeitam orçamento sem duplicar compras |
| 3 | **Calendário financeiro** e **projeções avançadas** com cenários, salários, vencimentos, parcelas, recebimentos e reservas protegidas | 1,2 | Visualização diária e mensal; reembolso só vira saldo efetivo quando recebido |
| 4 | **Importação CSV bancário** com mapeamento de colunas, prévia, normalização e deduplicação | 1,2 | Nenhuma alteração antes da confirmação; importação repetida não duplica |
| 5 | **Comprovantes** em IndexedDB (PDF/imagem), associados a transações; inclusão no backup privado | 1,4 | Abrir/remover/anexar comprovante; export/import recupera anexos |
| 6 | **Dashboard personalizável**: widgets reordenáveis, métricas corretas, filtros por conta/período e configurações locais | 1–5 | Reordenar widgets sem afetar dados; totais iguais aos relatórios |

Uma fase pode ser lançada em pequenas versões (v1.2.0, v1.2.1...), em vez de esperar todas as oito funcionalidades.

## Histórias e limites das oito funcionalidades

### Múltiplos cartões e contas (alicerce)
- Entidades `accounts`: `id`, `type` (`bank`, `cash`, `credit_card`, `savings`), `name`, `currency`, `active`; cartão adiciona `closingDay`, `dueDay` e `limitCents` opcionais.
- Os registros não misturam débito na conta com despesa no cartão: compra cria obrigação; pagamento da fatura transfere caixa para quitar a obrigação, sem duplicar gasto de categoria.
- Transferência entre contas diminui uma e aumenta outra, mas não altera receitas nem despesas totais.
- Permitir registrar cartão emprestado como despesa a reembolsar, sem inventar saldo bancário de terceiros.

### Assinaturas avançadas
- `subscriptions` contém plano, valor previsto, meio de pagamento, recorrência, datas de renovação e cancelamento, `status`, `nextChargeDate`.
- Cancelar não remove cobranças históricas nem faturas já existentes; previsões após o fim são interrompidas.
- Previsões devem ser substituídas ou vinculadas ao lançamento confirmado, nunca somadas em duplicidade.

### Limites por categoria
- `categoryBudgets`: `categoryId`, período, `limitCents`, opção de acumular saldo (pode ser posterior), escopo por conta opcional.
- Mostrar gastos confirmados vs previstos; não descontar pagamento de fatura uma segunda vez.
- Avisos locais para 80%, 100% e acima do limite, com limites configuráveis posteriormente.

### Calendário financeiro
- Calendário mês/semana com salário previsto, parcelas, vencimentos, recorrências, obrigações pagas e reembolsos.
- Exibir **data da compra**, **mês da fatura**, **data de vencimento** e **data de pagamento** como conceitos distintos.
- A previsão só utiliza datas de fechamento/vencimento configuradas; se ausentes, mostra `a confirmar`.

### Importar extratos CSV
- Fluxo: selecionar conta → escolher CSV → prévia → reconhecer separador/codificação → mapear data/descrição/valor → detectar duplicados → confirmar.
- Não enviar arquivos para servidor. Suportar formatos com valores positivos e negativos, ponto ou vírgula decimal e cabeçalhos variados.
- Deduplicação por identidade disponível (quando banco oferece ID) ou combinação de data/valor/descrição/conta; duplicações duvidosas exigem confirmação.
- Importação não altera o saldo automaticamente até a confirmação explícita.

### Dashboard personalizável
- Layout de widgets com drag & drop acessível + reordenação por botões; salva configuração por dispositivo.
- Widgets: caixa disponível, fatura a vencer, orçamento consumido, gastos por categoria, 6 meses de evolução, assinaturas, metas.
- Filtros por mês/conta e distinção visível entre confirmado, previsto e recebido.

### Anexar comprovantes
- IndexedDB para `Blob` e metadados; permitir PDF/JPEG/PNG, limitar tamanho e validar MIME, não interpretar arquivos como HTML.
- Um comprovante pode vincular-se a uma compra ou ao pagamento; remoção deve atualizar vínculos.
- JSON isolado **não incluirá binários**; criar backup completo (ZIP) protegido por escolha do usuário, com manifesto e anexos. Se não houver ZIP ainda, mostrar aviso claro de que o backup é somente de dados financeiros.

### Projeções avançadas
- Cenários: comprar à vista x parcelar, manter reserva mínima, valores futuros recorrentes, taxas, categorias, entradas e saídas previstas.
- Exibir projeção pessimista (sem reembolsos prometidos) e condicional (com recebimentos confirmáveis).
- Não confundir projeção de salário com dinheiro recebido; não contar transferência nem quitação da fatura como nova despesa.
- Tratar datas e arredondamento em centavos e aplicar vencimentos corretamente, inclusive quando mudarem de mês.

## Fora do escopo da v1.2

- API bancária, Open Finance automático, OCR/IA, multiusuário, servidor, autenticação, notificações push e sincronização entre dispositivos.
- Importação direta de PDF bancário (diferente de anexar comprovantes PDF).

## Riscos técnicos importantes

1. **LocalStorage:** limitado; usar IndexedDB para anexos. Persistência depende do navegador e do endereço de acesso.
2. **Início de vigência dos cartões:** não inferir fechamentos históricos; manter períodos legados como lançados.
3. **Histórico parcelado incompleto:** v1 só pode ter a última parcela; não reconstruir meses ausentes por suposição.
4. **Privacidade:** publicar só código, nunca backup, extrato ou comprovante pessoal.
5. **Inconsistência de cadastro:** desvincular cartão de uma compra exige preservar rastreabilidade ou solicitar migração explícita.

## Critério de release v1.2

- Importação v1 aprovada e reversível, testes de regressão executados, dados públicos fictícios, recursos funcionais documentados e backup da versão nova validado.
