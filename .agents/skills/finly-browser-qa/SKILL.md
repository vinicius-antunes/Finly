---
name: finly-browser-qa
description: Use para alterações em HTML, CSS, JS de interface ou exportação/importação. Não ativar para infraestrutura sem efeito na interface.
---

# finly-browser-qa

Entrada: diff e fluxos afetados. Execute `python3 tests/check_public_release.py`.
- Use perfil/contexto descartável vazio; nunca limpe localStorage de um perfil existente.
- Abra index.html em navegador ou sirva a pasta com Python se file:// for bloqueado. Não exija npm install para o app.
- Verifique teclado, foco, labels, feedback, viewport estreito e desktop.
- Exercite apenas fluxos afetados com dados sintéticos, incluindo persistência após recarregar e exportação/importação se alteradas.
- Registre erros JS e preserve dados existentes. Não salve screenshots privadas.
Saída: cenários executados e não executados, resultados e reprodução. Playwright é opcional; se indisponível, registre teste manual ou bloqueio, sem alegar execução.
