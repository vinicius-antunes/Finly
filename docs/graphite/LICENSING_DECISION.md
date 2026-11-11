# Decisão de licenciamento: Aceternity e substituições

O proprietário forneceu registries de Sidebar e Card Spotlight (este inclui CanvasRevealEffect, não Stateful Button). Os registries não continham licença de redistribuição. Os termos oficiais indicados pelo proprietário são https://ui.aceternity.com/licence e https://ui.aceternity.com/terms; ele determinou que não se publicassem os fontes no repositório público sem autorização inequívoca. Não foram classificados como MIT.

As extrações temporárias foram removidas antes de qualquer commit. Nenhum registry, CanvasRevealEffect ou fonte Aceternity foi publicado. As dependências experimentais Three/Fiber/Tabler foram removidas.

Após a apresentação de alternativas, o proprietário escolheu expressamente **shadcn/ui Sidebar e Magic UI Magic Card**, com verificação das licenças MIT. O **Stateful Button foi removido do escopo**, portanto não foi implementado nem simulado. Não há fonte protegido ou substituição silenciosa.

A implementação e as atribuições oficiais estão documentadas em [MIT_REPLACEMENTS.md](MIT_REPLACEMENTS.md). Os componentes mantêm o visual Graphite Green e os comportamentos oficiais adaptados. As seis features anteriores foram preservadas. Legado e módulo de leitura financeira permanecem inalterados.
