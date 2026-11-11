# Dark Aurora Premium — entrega visual e dependências

## Implementado nesta branch

Base: `codex/dark-aurora-theme`, evoluída em `codex/dark-aurora-premium-completo`. Não há framework, backend, fontes remotas nem dependências de produção. Copie `index.html` junto de `assets/`; o app continua estático e local-first.

### Diferenças observáveis

- **Dashboard recomposto:** hero amplo de saldo projetado, ornamentação leve em órbitas, reserva separada, faixa de quatro indicadores, orçamento com barra estática, atividade do mês e área operacional de faturas/reembolsos. Não é o grid antigo com outras cores.
- **Navegação:** marca com assinatura, separação de workspace, seleção com marcador ciano; menu mobile recolhível com Escape e fechamento ao navegar. Planejamentos mantém accordion e + independentes.
- **Formulário:** hierarquia numerada, cabeçalho, campos mais confortáveis e resumo de parcela × quantidade preservado. Cancelar continua sem gravações.
- **Lançamentos:** painel de busca e filtros por tipo, situação, competência selecionada/todos os meses e intervalo de valores. Limpar filtros, contagem e soma dos registros exibidos (explicitamente não saldo). Ordenação determinística por competência, descrição e ID.
- **Parcelas/reembolsos:** indicadores separados e painéis de créditos registrados versus recebimentos. O total dos grupos representa registros existentes, sem inventar parcelas ou vencimentos.
- **Notificações locais:** alertas derivados de fatura, reembolsos, previsões e pendências disponíveis, contador real e leitura persistida por ID. Sem push, polling ou serviço externo. Não representam confirmação bancária.
- **Ajustes:** composição em painéis, aparência com tema Escuro/Claro e backup claramente separado. Impressão clara, foco visível e redução de movimento.
- Checklist de compra deixou de ser bloco fixo; há ajuda contextual expansível. Removida a nota antiga de que dados foram preenchidos em conversa.

## Dados e temas

Escuro é padrão mesmo em sistema claro. `finly-theme` permanece separado do JSON financeiro; sincronização entre abas e fallback de sessão sem permissão para gravar foram preservados. `finly-notification-reads` guarda somente IDs e flags de leitura. Preferências de interface não fazem parte do backup financeiro v1.

Não foram alteradas as funções de cálculo, starter, validação do estado, criação/edição financeira, exportação, importação ou schema. `saldoclaro-v1` mantém o comportamento legado. Fatura paga não gera nova despesa e reembolso previsto continua distinto de recebido. Nenhum dado sintético é inserido em produção: as capturas usam contextos descartáveis do teste.

## Metas: dependência explícita, não concluídas

O contrato v2 e a migração da Issue #2 não estão integrados à main obtida por fetch nesta tarefa. Consultas à issue e PRs via API retornaram 403, portanto discussões remotas não foram verificadas. O redesign não implementa migração concorrente.

A entrega dependente C deverá implementar metas em centavos, criação rápida real, histórico, backup e páginas Resumo/Simulações/Plano mensal **após** revisão do contrato v2. A entrega D deverá implementar sugestões multi-meta limitadas pela margem e ajustáveis, sem transformar planos em depósitos. As invariantes e cenários estão em docs/MIGRATION_v1_to_v2.md e docs/ROADMAP_v1.2.md.

O + atualmente explica a dependência; não é formulário funcional de metas. O simulador legado permanece acessível para não retirar uma função existente antes da substituição segura. Não há metas prioritárias fictícias nem abas vazias apresentadas como prontas. Essas partes permanecem pendentes, conforme a autorização do brief para separar recursos dependentes; o redesign independente não foi bloqueado por elas.

## Evidências e testes

```sh
python3 tests/check_public_release.py
node --check assets/theme.js
python3 tests/check_theme.py
python3 tests/check_premium.py
```

Os dois testes de navegador usam Python Playwright e Chromium em `/usr/bin/chromium`, ferramentas apenas de desenvolvimento. Já estavam disponíveis no ambiente; não são necessárias para usar o aplicativo. O teste premium gera as capturas abaixo usando somente registros sintéticos e data fixa. Ele verifica composição, ambos os temas, filtros, pesquisa com texto de ataque sem execução, notificações/leitura após reload, invariância financeira, exportação JSON/CSV, importação, parcelas 3 × 19,99, mobile sem overflow externo e cancelamento. O teste de tema verifica também padrão, persistência, abas, Escape/foco, impressão, storage negado e 2 × 25 = 50.

| Tela | Escuro | Claro |
| --- | --- | --- |
| Dashboard desktop | [captura](screenshots/dark-desktop.png) | [captura](screenshots/light-desktop.png) |
| Dashboard mobile | [captura](screenshots/dark-mobile.png) | [captura](screenshots/light-mobile.png) |
| Lançamentos | [captura](screenshots/dark-entries.png) | [captura](screenshots/light-entries.png) |
| Parcelas | [captura](screenshots/dark-installments.png) | [captura](screenshots/light-installments.png) |
| Modal | [captura](screenshots/dark-form.png) | [captura](screenshots/light-form.png) |

Capturas foram inspecionadas visualmente. Não há certificação formal WCAG nem matriz de todos os navegadores; contraste integral e grandes volumes requerem revisão adicional. Os testes são funcionais, não um diff de pixels; imagens com fixtures não carregam dados reais do usuário.

## Visualizar no Cloudflare Pages

1. No projeto Pages conectado a `vinicius-antunes/Finly`, abra **Deployments** e encontre a branch `codex/dark-aurora-premium-completo` e o commit informado na entrega.
2. Abra a **Preview URL** desse deployment. Ela é diferente da produção ligada à `main`; copiar a URL de produção continuará mostrando o visual antigo até merge e deploy.
3. Se não surgir deployment, confira em Settings → Builds & deployments se **Preview deployments** inclui essa branch. Reexecute o deploy da branch após habilitar, se necessário.
4. Para site estático sem framework: raiz do repositório, sem comando de build (ou `exit 0` caso o painel exija), diretório de saída `.`. Devem estar publicados `index.html` e `assets/`. Não configure secrets para o app.
5. Confirme o hash do commit no painel. Use perfil limpo na preview ou um backup **fictício**: localStorage muda conforme a origem, e a preview não compartilha dados automaticamente com produção. Não envie backups para o deploy.

O projeto/URL Pages não está conectado às ferramentas desta sessão; nenhum deployment ou endereço específico foi verificado. O push prepara a branch para a integração Git já configurada. Nenhum merge automático foi realizado.
