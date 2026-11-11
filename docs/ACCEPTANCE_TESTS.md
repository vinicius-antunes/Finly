# Plano de testes de aceitação do Finly v1.2

## Regressão 1.1

1. Instalação nova sem dados pessoais: 0 lançamentos, nenhum nome de empresa ou valor real.
2. Compra 2 × R$ 33,00: valor da parcela = R$ 33,00 em dois meses; soma do grupo = R$ 66,00.
3. Compra 3 × R$ 19,99: soma = R$ 59,97, sem erro de arredondamento.
4. Compra de terceiro 3 × R$ 25,00: 3 parcelas e 3 reembolsos, pagos não são contados antes do recebimento.
5. Exportar backup, importar em navegador limpo: mesmas entradas, datas, valores, IDs, categorias, status e totais.
6. Não permitir que reset da instalação pública carregue dados pessoais de exemplo.

## Novos recursos v1.2

7. Cartões A e B com fechamentos e vencimentos diferentes: compra pertence à fatura certa sem antecipar mês de forma silenciosa.
8. Transferir R$ 100 de conta A a conta B: saldos variam ±R$ 100, despesas totais não mudam.
9. Pagar uma fatura que já agrupa as compras: saldo bancário reduz, dívida do cartão reduz, soma de despesas não aumenta.
10. Assinatura cancelada em 10/11, renovação em 20/11: nenhuma nova cobrança prevista depois do fim informado; histórico anterior preservado.
11. Limite de categoria R$ 200: compras de R$ 150 e R$ 60 mostram R$ 210 gastos; pagamento da fatura não eleva para R$ 420.
12. Calendário: distinguir data da compra, mês da fatura e vencimento com fatura mudando de mês.
13. Projeção: salário previsto não é valor recebido; reembolso previsto só entra em cenário condicional.
14. CSV repetido: prévia sinaliza duplicados e reimportação não altera extrato sem confirmação.
15. CSV com decimal brasileiro, sinal negativo, BOM e `;`: valores importados corretos em centavos.
16. Comprovante PDF + imagem: associação com transação e restauração integral por backup contendo anexos.
17. Dashboard: mesma soma financeira do relatório para todo filtro e reordenação salva por dispositivo.
18. Migração v1→v2: mesmas entradas, IDs legados, parcelas, reembolsos, pending, settings e status de fatura.
19. Falha na migração: nenhum dado v1 alterado; nenhum estado v2 parcial persistido.
20. GitHub Pages em perfil limpo: nenhuma movimentação pessoal exibida; importação manual de backup aceita após confirmação.
