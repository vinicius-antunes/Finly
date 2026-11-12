# Cabeçalho, notificações e avisos

Implementação exclusiva em `codex/finly-navegacao-ux`, sem novas dependências.

## Alterações

- O botão de menu é ocultado somente em desktop com hover e ponteiro preciso.
  Continua visível em celulares e telas touch largas. A Sidebar mantém hover,
  expansão por foco, links acessíveis, drawer móvel e atalho Ctrl/Cmd+B.
- Sucessos usam um toast compacto, com confirmação visual, fechamento manual,
  expiração após 5 segundos e animações discretas de entrada/saída. Movimento
  reduzido remove as animações. A importação exibe “Backup importado!” e a
  quantidade real restaurada, somente após o callback de persistência existente.
  O aviso não é salvo nem recriado no reload. Erros continuam persistentes.
- Sino Lucide com tooltip nativo, contador calculado e painel compacto com
  destaque de não lidas. Marcar como lida mantém a persistência existente.
  Contador desaparece ao zerar. Painel fecha por X, Escape e clique fora,
  contém foco e devolve foco ao sino. Tem rolagem interna e três temas.
- Não houve mudança no modelo, storage, importação, legado ou cálculos.

## Arquivos

`src/finance/FinanceApp.tsx`, `src/styles.css`, `tests/check_header.py`,
`tests/check_backup_browser.py` (novo texto de sucesso),
`tests/check_navigation_ux.py` (fixação pelo atalho, sem botão desktop), README
 e este relatório.

## Evidências sintéticas

- [Toast desktop](evidence/toast-desktop.png)
- [Notificações não lidas](evidence/notifications-desktop.png)
- [Graphite Green](evidence/Graphite-panel.png)
- [Escuro Padrão](evidence/Escuro-panel.png)
- [Claro](evidence/Claro-panel.png)
- [Celular sem notificações](evidence/mobile.png)

## Validação

Todos os comandos abaixo passaram.

```sh
npm run check
npm run build
npm run test:static
node tests/check_finance.mjs
node tests/check_backup.mjs
node tests/check_entries.mjs
python3 tests/check_public_release.py
python3 tests/check_header.py
python3 tests/check_backup_browser.py
python3 tests/check_navigation_ux.py
python3 tests/check_home.py
python3 tests/check_finance_browser.py
python3 tests/check_entries_browser.py
python3 tests/check_startup.py
```

O teste novo usa Chromium real, dados sintéticos, hover, foco no menu sem botão,
atalho, importação, contagem restaurada, expiração, X e reload, sino/contador,
leitura, fechamento por três meios, restauração de foco, três temas e touch
390/1200 px com movimento reduzido. Compara registros e estados das faturas
antes e depois das ações de leitura. Regressões de backup cobrem erros,
corrupção, concorrência e quota sem dispensar falhas automaticamente.

Capturas foram verificadas no navegador automatizado. Sem ensaio em aparelho
físico. A gravação opcional não foi gerada: o runtime Playwright não dispõe do
binário ffmpeg necessário; as evidências são capturas e testes de interação.
