# Origens e atribuições

- shadcn/ui (MIT): Button, Card, Input de `https://github.com/shadcn-ui/ui/tree/main/apps/v4/registry/new-york-v4/ui`. Imports `cn` e `radix-ui` adaptados aos módulos locais/Radix Slot instalados. Sem mudança no comportamento.
- Magic UI (MIT): MagicCard, DotPattern, GridPattern de `https://github.com/magicuidesign/magicui/tree/main/apps/www/registry/magicui`. Arquivos originais preservados; props e tokens aplicados pelo laboratório.
- Recharts (MIT): pacote instalado e modelos da API, não cópias dos exemplos catalogados. Exemplos enumerados pelo Git da origem `recharts/recharts`.
- TweakCN (Apache-2.0): snapshot do registry público e aplicação dos tokens light/dark com mapeamento para as superfícies do laboratório. Os demais tokens do laboratório são configurações próprias.
- Geist, Inter, Manrope, Plus Jakarta Sans e DM Sans: pacotes Fontsource com licenças OFL preservadas.
- Lucide, Motion, Zustand, dnd-kit e Radix: dependências distribuídas com seus avisos via npm; versões exatas no lockfile.
- React Bits e Aceternity: somente metadados e links de referência; nenhum código protegido integrado. O arquivo de licença React Bits foi guardado como evidência de revisão, não como alegação de licença MIT irrestrita.

Os arquivos de licença estão em `docs/licenses`. O inventário `vendor-provenance.json` registra SHA-256 dos fontes vendorizados após as adaptações declaradas; URLs com `main` são referências de obtenção, não versões imutáveis alegadas.
