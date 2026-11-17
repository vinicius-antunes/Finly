# Finly — Controle financeiro pessoal

Esta branch, `codex/finly-navegacao-ux`, contém a aplicação React e a consolidação das sete fases de **Novo lançamento**. A integração com `main` ou `Finly-React` e qualquer release pública dependem de autorização. A versão pública não foi alterada por esta entrega.

## Executar a aplicação React

Requer Node.js 24 e npm.

```sh
npm ci
npm run dev -- --port 5173
```

Abra o endereço informado pelo Vite. Para hospedagem estática, execute `npm run build` e publique `dist/`. Não há backend, login, integração bancária, telemetria ou sincronização automática. Uma instalação nova começa vazia; dados existentes nunca são substituídos durante a inicialização.

## Funcionalidades disponíveis nesta branch

- Visão Geral compacta com projeção, variação efetiva registrada, referências de reserva, cofrinhos, compromissos e gastos por competência.
- Navegação com sete destinos, Sidebar por hover/fixação/teclado e drawer em dispositivos touch.
- Novo lançamento com cinco abas: Despesa, Receita, Cartão, Reembolso e Transferência; campos contextuais, prévias e proteção contra descarte.
- Contas, cartões e categorias personalizados; sugestões da última origem válida e campos desconhecidos mantidos como desconhecidos.
- Pagamentos/recebimentos parciais, identificação salarial explícita, transferências neutras e histórico de estornos/correções.
- Contratos de cartão com fechamento/vencimento, centavos finais exatos, entrada, estimativas de juros, total contratado e ajustes individuais de parcelas/competências.
- Recorrências mensais/anuais, previsão sob comando explícito, alteração de valor, pausa, retomada e cancelamento sem pagamentos automáticos.
- Reembolsos por responsável, vários cronogramas e recebimentos, sem confundir promessa com dinheiro recebido.
- Planejamentos com aportes manuais, histórico, simulação e uso confirmado da reserva em uma única gravação financeira.
- Comprovantes locais em IndexedDB, miniaturas/download, integridade, diagnóstico de órfãos e backup completo ZIP.
- Lançamentos paginados com busca, totais e CSV sobre **todos os resultados filtrados**, preservando o contexto da edição.
- Graphite Green, Escuro Padrão e Claro, com preferências locais, efeitos de luz opcionais e movimento reduzido.

O novo motor é preparado **explicitamente** em Novo lançamento, com exportação, prévia e confirmação. Registros anteriores mantêm edição compatível; não são recriados nem convertidos silenciosamente.

## Dinheiro registrado, projeção e reservas

Valores são calculados e persistidos em centavos inteiros. Compra, parcela, pagamento da fatura, reembolso e transferência são entidades distintas. A quitação não cria outra despesa; transferências e aportes não criam receitas/despesas. Salário recebido identificado substitui a referência da competência, inclusive quando parcial, conforme a regra aprovada.

**Saldo atual registrado** é a variação líquida dos eventos efetivos do período, não o saldo bancário: não são inventados saldos de abertura. No legado sem data efetiva, somente situações explicitamente recebidas/pagas são consideradas na competência conhecida. **Saldo projetado** segue as regras aprovadas de compromissos e previsão; não representa dinheiro disponível no banco. Referência geral de reserva e saldos dos cofrinhos aparecem separadamente; o Finly não presume que sejam valores adicionais ou sobrepostos.

O gráfico mostra seis competências de despesas registradas e compras confirmadas. Não inclui quitação, transferência, receita ou reembolso como despesa, nem contém exemplos financeiros na instalação pública.

## Backup e proteção dos dados

Em **Configurações → Backup**:

1. **JSON:** dados financeiros e metadados dos comprovantes, sem binários. Aceita backups v1/v2 com prévia e confirmação.
2. **Backup completo ZIP:** dados, comprovantes e manifesto SHA-256; valida todos os arquivos antes de restaurar. Não realiza mesclagem silenciosa.
3. **Armazenamento local:** quantidade, espaço, quota estimada, integridade, ausências e órfãos. Limpeza definitiva exige confirmação.

Limites iniciais: 10 MiB por arquivo, 200 vínculos, 100 MiB de comprovantes locais, 4 MiB por JSON e 106 MiB por ZIP. JPG/PNG/WebP têm prévia; PDF usa download sem interpretador ativo incorporado. Gravação coordenada de arquivos requer IndexedDB, Web Crypto, Web Locks e contexto seguro (HTTPS ou localhost).

Guarde backups privados fora do repositório. Limpar o navegador, trocar de domínio/dispositivo ou o descarte de armazenamento pelo navegador pode remover dados. Não há criptografia, garantia de permanência ou prova de autenticidade do exportador pelo hash. A chave antiga `saldoclaro-v1` permanece intacta.

## Verificação e relatórios

```sh
npm run check
npm run build
npm run test:static
node tests/check_integration.mjs
python3 tests/check_integration_browser.py
python3 tests/check_accessibility.py
python3 tests/check_public_release.py
```

Testes Chromium usam Python Playwright, Pillow e Chromium; `axe-core` é dependência somente de teste. A matriz completa, as demais suítes, medições, capturas e o parecer técnico estão na [Fase 7](docs/new-entry/PHASE_7.md).

[Fundamentos e migração](docs/new-entry/PHASE_1.md) · [Motor financeiro](docs/new-entry/PHASE_2.md) · [Cartões e recorrências](docs/new-entry/PHASE_3.md) · [Reembolsos e cofrinhos](docs/new-entry/PHASE_4.md) · [Formulário](docs/new-entry/PHASE_5.md) · [Comprovantes e ZIP](docs/new-entry/PHASE_6.md).

## Legado e planejamento futuro

`index.html` e `public/legacy/` preservam a aplicação HTML de referência v1.1.1. Ela pode ser aberta separadamente e mantém seu próprio armazenamento. Documentos antigos descrevem etapas históricas; o estado atual desta branch é o relatório da Fase 7. O [roadmap v1.2](docs/ROADMAP_v1.2.md) inclui outros recursos planejados e não deve ser confundido com a entrega destas sete fases. Não há importação bancária CSV, integração automática, OCR ou serviço de nuvem implementado.

## Privacidade e licenças

Nunca publique dados reais, credenciais, comprovantes, extratos, backups ou capturas privadas. Veja [segurança e privacidade](docs/SECURITY_PRIVACY.md). As dependências e componentes externos mantêm suas [licenças e atribuições](docs/licenses/). O projeto não concede uma licença própria de reutilização neste estágio.
