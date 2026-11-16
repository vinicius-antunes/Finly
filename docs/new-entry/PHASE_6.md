# Fase 6 — Comprovantes locais e backup completo

Base: `bda85674592067d6c47e84523669a63ddeadebd1` (Fase 5), branch exclusiva `codex/finly-navegacao-ux`. As cinco fases anteriores foram lidas e suas regressões executadas. Sem merge, mudança de branch de produto ou implementação da Fase 7.

## Interface entregue

- Bloco expansível **Comprovantes**, seleção múltipla e arrastar/soltar no Novo lançamento e nos pagamentos/recebimentos individuais.
- Imagens JPG/PNG/WebP com miniatura, ampliação no próprio bloco e download; PDF com identificação e download. A aplicação deliberadamente não incorpora um interpretador de PDF: não executa scripts do documento nem o injeta no HTML.
- Lista de arquivos com nome, tipo, tamanho, remoção antes do envio e proteção contra descarte. Validação pendente e gravação bloqueiam novos envios; refs síncronas impedem duplo clique.
- Clipe e quantidade nas linhas de lançamentos. Botões de consulta para lançamentos anteriores, transferências e histórico de pagamentos. O seletor em **Configurações → Backup → Armazenamento local** também permite consultar/adicionar arquivos a operações, contratos, parcelas individuais, liquidações e pagamentos de fatura.
- Cancelamento mantém os comprovantes. A duplicação financeira não copia seus vínculos. Remover um vínculo exige confirmação; o binário só é removido em uma limpeza confirmada de órfãos. A exclusão compatível de um registro antigo informa quantos vínculos serão removidos.
- Confirmação de restauração em três etapas, progresso, aviso de arquivos ausentes no JSON e prévia de quantidade de registros/comprovantes/tamanho antes do ZIP. Sucessos usam avisos fecháveis com duração limitada.

## Modelo e persistência

`State.receipts?` é um catálogo opcional no próprio `finly-v2`, sem mudar a versão financeira. Cada item tem `id`, `target {kind,id}`, nome seguro, MIME, tamanho, SHA-256 e data de inclusão quando conhecida. Os vínculos resolvem explicitamente para `legacy`, `operation`, `purchase`, `transfer`, `settlement` ou `invoicePayment`. Contratos parcelados recebem um único vínculo de compra; arquivos específicos podem ser vinculados a uma parcela ou pagamento.

O contrato anterior `entryLedger.attachments` continua legível e validado. `allReceipts` adapta seus metadados; a primeira edição explícita do catálogo move esses itens para `State.receipts` e esvazia a coleção anterior na mesma gravação. Não há duas cópias autoritativas do mesmo metadado, nem ativação automática do motor em registros antigos.

IndexedDB `finly-receipts`, versão 1:

- `files`: chave SHA-256, valor Blob. Conteúdo idêntico em vários vínculos compartilha o mesmo binário físico.
- `journal`: ID da preparação, hashes, data e estado de preparação. Não contém cópias dos dados financeiros.

Os arquivos nunca vão para Base64/localStorage, servidor ou serviço externo. URLs `blob:` são revogadas ao trocar/desmontar a visualização e após iniciar downloads. Nada altera `saldoclaro-v1`.

## Consistência, compensação e recuperação

Não existe transação atômica entre IndexedDB e localStorage. O protocolo é:

1. Capturar a revisão/serialização financeira esperada e validar o estado proposto.
2. Adquirir Web Lock da origem, compartilhado por gravações de arquivos, restaurações e limpeza.
3. Validar arquivos/hashes e quota agregada; preparar binários e diário em uma única transação IndexedDB.
4. Ler/verificar a gravação preparada; confirmar o financeiro com o compare-and-set já existente. Nenhum `await` separa a última conferência do CAS financeiro.
5. Encerrar o diário. Se essa última limpeza falhar após o financeiro ter sido salvo, a operação continua sendo sucesso: não provoca uma segunda liquidação.

Falhas anteriores à confirmação preservam o estado financeiro e o rascunho. A compensação é conservadora: arquivos preparados ficam recuperáveis como órfãos, em vez de apagar um binário que outra referência possa precisar. Uma tentativa posterior reutiliza o hash. **Verificar integridade** reconcilia diários e referências; mostra preparações com e sem vínculos confirmados, ausências, corrupção e órfãos. **Limpar arquivos órfãos** exige confirmação e nova verificação da base sob o mesmo lock; mantém qualquer arquivo ainda referenciado e encerra os diários revisados. Nenhum órfão é apagado automaticamente.

Uma interrupção antes da gravação financeira deixa a base anterior intacta; depois dela, os vínculos já confirmados permanecem válidos. Alterações de outra aba invalidam a tentativa e mantêm os arquivos selecionados. Navegadores sem Web Locks não recebem um fallback que prometa coordenação inexistente: a gravação coordenada informa a incompatibilidade.

## Validação e limites

- 10 MiB por arquivo; 200 vínculos e 100 MiB agregados no catálogo; 100 MiB físicos no IndexedDB, incluindo órfãos/preparações.
- Extensão, MIME, assinatura binária e terminadores/tamanho do contêiner devem concordar. Imagens têm dimensões limitadas a 40 megapixels e são decodificadas pelo navegador quando disponível. Rejeição de vazio, truncado, HTML, SVG e tipos não autorizados. Nomes são normalizados e sanitizados; React escapa os textos.
- Seleção repetida no rascunho é rejeitada. Conteúdo já armazenado pode ser vinculado a outro registro com aviso de reutilização.
- SHA-256 é conferido antes de salvar, ao consultar, na integridade e no ZIP. Detecta corrupção, não comprova autoria de um backup de terceiros.
- O painel mostra quantidade, bytes físicos e quota estimada quando disponível. A integridade completa é acionada pelo usuário para evitar decodificar todos os arquivos a cada abertura de tela.

## ZIP versão 1

```text
backup.json
manifest.json
attachments/<ID codificado em hexadecimal UTF-8>
```

O nome original seguro permanece nos metadados. O manifesto contém versão, data, hash dos bytes de `backup.json`, contagem/tamanho total e os IDs, caminhos, vínculos, nomes, MIME, tamanhos e SHA-256 de cada comprovante. O ZIP inclui todos os arquivos referenciados; se algum faltar ou estiver corrompido, a exportação completa é bloqueada.

`fflate` gera ZIP local sem compressão para reduzir trabalho e aceita STORE/DEFLATE na importação. O módulo ZIP é carregado sob demanda. Limites: 106 MiB de arquivo ZIP, JSON 4 MiB, manifesto 1 MiB, até 202 entradas e razão máxima de compressão 200:1. A importação examina diretório e cabeçalhos antes de inflar, rejeita ZIP64/múltiplos discos/criptografia, caminhos inesperados ou traversal, IDs/caminhos duplicados, sobreposições e tamanhos incompatíveis. A inflação recebe blocos de 1 KiB e limita a saída efetiva por entrada e no agregado; cabeçalhos falsos não autorizam expansão ilimitada. Arquivos e manifesto passam novamente pelo esquema financeiro e pelas verificações de vínculo, formato e hash antes da confirmação.

A restauração prepara e verifica todos os binários antes de substituir o financeiro, preserva arquivos locais anteriores e usa CAS. Não há mesclagem silenciosa. A quota precisa comportar a preparação junto dos arquivos já existentes; se não couber, a restauração é recusada sem apagar a base anterior.

## Compatibilidade

JSON v1/v2, ledger, cofrinhos e fluxo anterior de prévia/confirmação permanecem compatíveis. O JSON inclui metadados, nunca binários. Sua importação mantém arquivos locais; referências sem arquivo são apresentadas como ausentes, sem simular disponibilidade. CSV, legado e regras financeiras não receberam novo significado.

Backups são privados, sem criptografia ou sincronização automática. Limpar dados do navegador ou trocar de domínio pode perder arquivos: exporte o ZIP e guarde-o fora do repositório.

## Arquivos e dependências

Novos módulos: `src/finance/receipts/{model.ts,storage.ts,zip.ts,ReceiptFields.tsx,StoragePanel.tsx,receipts.css}`. Integrações: modelo financeiro, FinanceApp, EntriesWorkspace, BackupImport, EntryComposer, Payments e OperationsManager. Testes novos `tests/check_receipts.mjs` e `tests/check_receipts_browser.py`; helpers do backup atualizados para o seletor JSON/ZIP. Workflow inclui a suíte IndexedDB e o teste real Chromium.

Dependência de produção: `fflate` 0.8.3, MIT, [atribuição integral](../licenses/fflate.txt). Dependência apenas de teste: `fake-indexeddb` 6.2.8, Apache-2.0, [licença integral](../licenses/fake-indexeddb.txt). Teste visual usa Playwright/Pillow com arquivos gerados em memória. Nenhum comprovante ou backup particular é versionado.

## Validação

**Resultado final: aprovado.** TypeScript, build, testes estáticos, salvaguarda de publicação, 11 suítes Node e 11 suítes Chromium concluíram sem falhas no código final aplicável. As capturas usam exclusivamente registros e documentos sintéticos. Os ciclos iniciais encontraram seletores incorretos no teste novo e um overflow real do seletor/botões em 390 px; os seletores foram corrigidos e o layout foi ajustado e validado novamente.

- TypeScript, build de produção, scaffold estático e `check_public_release.py`.
- Suítes Node: finance, backup, planning, entries, monthly_spending, entry_foundation (Fase 1), entry_finance (Fase 2), credit (Fase 3), reimbursements (Fase 4), entry_ui (Fase 5) e receipts (Fase 6).
- Regressões Chromium: finance, backup, planning, entries, navigation_ux, entry_finance, credit, reimbursements, entry_ui_browser e entry_ui_management.
- Fase 6: arquivos reais PNG/JPEG/WebP/PDF sintéticos, assinatura/MIME/tamanho, múltiplos, preview/download/reload, cinco tipos, contratos, pagamento parcial, registro antigo, quota/retry, concorrência, duplicação sem anexos, JSON com referências ausentes, download ZIP/restauração em perfil vazio e SHA-256 dos blobs restaurados no IndexedDB, ZIP manipulado sem substituição.
- Testes de armazenamento também provocam falha de gravação financeira, interrupção após confirmação e antes de limpar diário, órfãos, referências compartilhadas, falsificação do tamanho descompactado, traversal, manifestos inválidos e caminhos/IDs duplicados.
- Três temas e larguras 1366, 1440, 390 e 768 px; sem overflow horizontal. Perfil de restauração móvel com movimento reduzido.

### Capturas

| Tema | Comprovantes desktop | Comprovantes mobile | Armazenamento desktop | Armazenamento mobile |
|---|---|---|---|---|
| Graphite Green | [1440](../assets/phase6/graphite-1440-comprovantes.png) | [390](../assets/phase6/graphite-390-comprovantes.png) | [1440](../assets/phase6/graphite-1440-armazenamento.png) | [390](../assets/phase6/graphite-390-armazenamento.png) |
| Escuro Padrão | [1440](../assets/phase6/dark-1440-comprovantes.png) | [390](../assets/phase6/dark-390-comprovantes.png) | [1440](../assets/phase6/dark-1440-armazenamento.png) | [390](../assets/phase6/dark-390-armazenamento.png) |
| Claro | [1440](../assets/phase6/light-1440-comprovantes.png) | [390](../assets/phase6/light-390-comprovantes.png) | [1440](../assets/phase6/light-1440-armazenamento.png) | [390](../assets/phase6/light-390-armazenamento.png) |

[ZIP restaurado em navegador vazio](../assets/phase6/zip-restaurado-mobile.png) · [Rejeição de arquivo acima do limite](../assets/phase6/validacao-limite.png).

## Limitações e próxima fase

- PDFs usam download como fallback seguro; não há visualizador ativo incorporado, antivírus, OCR ou promessa de higienização do conteúdo do PDF. Imagens preservam seus bytes e possíveis metadados; não há promessa de remover EXIF.
- Disponibilidade depende de IndexedDB, contexto seguro, Web Crypto e Web Locks para gravação coordenada; estimativas de quota são aproximadas. Não há garantia contra perda dos dados se o usuário limpar o perfil ou o navegador os descartar.
- O ZIP trabalha em memória dentro dos limites; não atende arquivos maiores ou ZIPs externos fora do formato Finly. A implementação verifica integridade, não identidade do exportador.
- Diários não recriam obrigações financeiras: o estado persistido é a autoridade. A recuperação/limpeza é explícita no painel, sem excluir arquivos automaticamente.
- Fase 7 permanece pendente, aguardando especificação/autorização. Nenhuma funcionalidade dela foi antecipada.
