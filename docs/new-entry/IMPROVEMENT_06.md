# Melhoria 06 — alinhamento do cabeçalho

A correção é compartilhada em `src/styles.css`, na estrutura `.home-heading .home-header-actions` já usada por todas as páginas. Grid organiza o campo mensal (com rótulo acima) e o botão, com alinhamento pela base e altura comum de 42 px. O gap horizontal é de 16 px; até 640 px os controles ficam em coluna, com 12 px de separação. Não há margens negativas, deslocamentos absolutos ou regras por página.

O seletor MonthPicker, cores, bordas, animações, títulos, descrições, navegação e contextos de Novo lançamento permanecem preservados. Nenhum componente financeiro ou armazenamento foi alterado. Melhorias 01–05 mantidas.

## Verificação

- TypeScript, build de produção, test:static e check_public_release.py aprovados.
- `tests/check_header_alignment.py`: 3 temas × 7 páginas × 7 larguras (1920, 1440, 1366, 1024, 768, 390 e 360). Mede caixas dos controles, equivalência de altura e alinhamento em linha; confere overflow, dashboard dentro de 1366 × 768 e ausência de gravações financeiras ao navegar.
- Interações reais no Chromium: abertura/Escape do MonthPicker, abertura direta do Novo lançamento, fechamento e drawer da Sidebar.
- `tests/check_header.py`: regressão de cabeçalho, notificações, toast, teclado, temas, mobile e preservação de dados.

Capturas anteriores usam o build publicado da Melhoria 05; posteriores usam o build real desta alteração, com os mesmos dados sintéticos vazios, temas e resoluções. JSONs before/after-geometry registram as medições por página. Testes em Chromium, sem ensaio em aparelho físico.

## Comparativos

| Tema | Antes desktop / mobile | Depois desktop / mobile |
|---|---|---|
| graphite | [desktop](improvement-06-evidence/before-graphite-1440.png) · [mobile](improvement-06-evidence/before-graphite-390.png) | [desktop](improvement-06-evidence/after-graphite-1440.png) · [mobile](improvement-06-evidence/after-graphite-390.png) |
| dark | [desktop](improvement-06-evidence/before-dark-1440.png) · [mobile](improvement-06-evidence/before-dark-390.png) | [desktop](improvement-06-evidence/after-dark-1440.png) · [mobile](improvement-06-evidence/after-dark-390.png) |
| light | [desktop](improvement-06-evidence/before-light-1440.png) · [mobile](improvement-06-evidence/before-light-390.png) | [desktop](improvement-06-evidence/after-light-1440.png) · [mobile](improvement-06-evidence/after-light-390.png) |
