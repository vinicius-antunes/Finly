# Finly-React — migração incremental (fase 1)

**Branch:** `Finly-React` (criada a partir da `main`, preservada separadamente).
**Status:** protótipo funcional da interface React, **não é substituto completo da v1.1.1**.

## Implementado

- Base React + TypeScript + Tailwind CSS v4 + Vite.
- Identidade Dark Aurora Premium com **três temas distintos**: Dark Aurora, Escuro Padrão e Claro. A preferência visual usa `finly-react-theme`, independente de dados financeiros.
- Layout adaptativo, cartões de leitura, listagem de lançamentos da competência e navegação React.
- Leitura **somente leitura** de `saldoclaro-v1` quando o app React e os dados estiverem na mesma origem. A React **não grava** essa chave, nem cria `finly-v2`.
- O aplicativo v1 integral foi preservado com os **mesmos bytes** em `public/legacy/index.html`, com CSS/JS em `public/legacy/assets/`. Em desenvolvimento e produção Vite, acessar `/legacy/` para todos os recursos financeiros, backup JSON, importação e ajustes.
- Indicação explícita de dados ausentes/corrompidos e de funcionalidades pendentes.
- Grupos monetários no painel React são **somatórios descritivos dos registros**, não saldo, fatura, caixa ou projeção. Recebimentos previstos não entram em "reembolsos recebidos".

## NÃO implementado (não alegar conclusão)

- Migração dos cálculos, criadores de lançamentos, faturas, parcelas, metas, simulações, importação, backup e despesas recorrentes para componentes React.
- Migração financeira v1 → v2, metas múltiplas e contas/cartões.
- PWA/offline instalável, gráficos com dados auditados, nova interface de formulário.
- Testes de navegador e build executados nesta etapa: dependem da instalação npm em ambiente com acesso ao registro.

## Comandos

Requisitos: Node.js compatível com a versão instalada do Vite.

```sh
npm install
npm run dev
npm run check
npm run build
npm run test:static
```

A aplicação de produção gerada fica em `dist/` e inclui `dist/legacy/`.

### Atenção ao Cloudflare Pages existente

**Não mude ainda as configurações da hospedagem da `main`.**
O projeto Pages atual usa a `main` estática (`exit 0`, saída `.`); trocar sua configuração global por `npm run build` + `dist` antes de integrar a migração poderia interromper a publicação de produção.

Para visualizar a migração sem afetar a versão atual, crie **outro projeto Cloudflare Pages** conectado ao **mesmo GitHub `vinicius-antunes/Finly`**, com branch de produção `Finly-React`, build `npm run build`, pasta `dist` e raiz do repositório. É um segundo deployment, **não um segundo repositório**.

Alternativamente execute `npm run dev` localmente. Não inventar URL de prévia antes de o Cloudflare confirmar um deployment.

### Dados e segurança

- Evite usar backups reais em domínios de prévia; `localStorage` é separado por origem e não sincroniza entre URLs.
- Não execute `localStorage.clear()`, não altere `saldoclaro-v1` e não substitua a `main` antes de testes de equivalência.
- Para qualquer migração v2, seguir `docs/MIGRATION_v1_to_v2.md`: prévia, backup, confirmação explícita, validação de IDs, centavos inteiros, invariantes de fatura e reembolso.
- Nenhum dado financeiro privado, fixture pessoal ou backup deve entrar no GitHub.

## Próximas etapas

1. Em ambiente com npm, gerar e versionar `package-lock.json`, executar `npm run check` e `npm run build`; resolver quaisquer incompatibilidades.
2. Automatizar testes equivalentes entre legado e React com **dados sintéticos**, inclusive import/export e parcelas.
3. Extrair módulos de regras financeiras existentes preservando funções, validações e os dados.
4. Migrar tela a tela: lançamentos, parcelas/reembolsos, metas/planejamentos, configurações/backup.
5. Implementar v2 com migração explícita; verificar acessibilidade, performance e modo offline opcional.
6. Solicitar revisão visual e funcional antes de merge na `main`.

**Não apagar nem mesclar automaticamente a `main`; enviar commits ao GitHub na branch `Finly-React`.**
