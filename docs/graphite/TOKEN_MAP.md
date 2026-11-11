# Mapa auditável dos tokens

O CSS anexado é preservado em tweakcn-original.css. Os tokens aplicáveis foram extraídos sem mudar valores em src/theme/tweakcn-tokens.css. A tabela lista cada diferença do resultado final em src/theme/graphite-overrides.css.

Identidade: violeta/azul de destaque é trocado por verde/cores neutras ou terrosas. Contraste: texto sobre verde vivo muda de branco para carvão; verde do Claro é escurecido. Escuro Padrão usa superfícies acromáticas e verde dessaturado. Fontes, radius 1.4rem e sombras exportadas permanecem. --font-sans é servido localmente via Fontsource, sem requisições a terceiros. Lora e IBM Plex Mono permanecem como tokens de referência sem baixar fontes não usadas.

|Tema|Token|Original|Aplicado|
|---|---|---|---|
|light|`--primary`|`oklch(0.5393 0.2713 286.7462)`|`oklch(.43 .11 155)`|
|light|`--primary-foreground`|`oklch(1.0000 0 0)`|`oklch(1 0 0)`|
|light|`--secondary`|`oklch(0.9540 0.0063 255.4755)`|`oklch(.96 .003 155)`|
|light|`--secondary-foreground`|`oklch(0.1344 0 0)`|`oklch(.2 0 0)`|
|light|`--accent`|`oklch(0.9393 0.0288 266.3680)`|`oklch(.95 .015 155)`|
|light|`--accent-foreground`|`oklch(0.5445 0.1903 259.4848)`|`oklch(.32 .07 155)`|
|light|`--border`|`oklch(0.9300 0.0094 286.2156)`|`oklch(.9 .003 155)`|
|light|`--ring`|`oklch(0 0 0)`|`oklch(.43 .11 155)`|
|light|`--chart-1`|`oklch(0.7459 0.1483 156.4499)`|`oklch(.47 .12 155)`|
|light|`--chart-2`|`oklch(0.5393 0.2713 286.7462)`|`oklch(.59 .1 100)`|
|light|`--chart-3`|`oklch(0.7336 0.1758 50.5517)`|`oklch(.57 .12 45)`|
|light|`--chart-4`|`oklch(0.5828 0.1809 259.7276)`|`oklch(.5 .01 155)`|
|light|`--chart-5`|`oklch(0.5590 0 0)`|`oklch(.68 .04 155)`|
|light|`--sidebar`|`oklch(0.9777 0.0051 247.8763)`|`oklch(.98 .002 155)`|
|light|`--sidebar-primary`|`oklch(0 0 0)`|`oklch(.43 .11 155)`|
|light|`--sidebar-accent`|`oklch(0.9401 0 0)`|`oklch(.94 .025 155)`|
|light|`--sidebar-accent-foreground`|`oklch(0 0 0)`|`oklch(.3 .07 155)`|
|light|`--sidebar-ring`|`oklch(0 0 0)`|`oklch(.43 .11 155)`|
|light|`--glow-rgb`|`novo token local`|`25,130,75`|
|graphite|`--primary-foreground`|`oklch(1.0000 0 0)`|`oklch(.16 .02 155)`|
|graphite|`--accent`|`oklch(0.2795 0.0368 260.0310)`|`oklch(.29 .012 155)`|
|graphite|`--accent-foreground`|`oklch(0.7857 0.1153 246.6596)`|`oklch(.87 .1 155)`|
|graphite|`--ring`|`oklch(0.6132 0.2294 291.7437)`|`oklch(.8 .15 155)`|
|graphite|`--chart-2`|`oklch(0.6132 0.2294 291.7437)`|`oklch(.78 .09 100)`|
|graphite|`--chart-4`|`oklch(0.6691 0.1569 260.1063)`|`oklch(.64 .02 155)`|
|graphite|`--sidebar-primary`|`oklch(0.6132 0.2294 291.7437)`|`oklch(.8786 .216 155.299)`|
|graphite|`--sidebar-primary-foreground`|`oklch(1.0000 0 0)`|`oklch(.16 .02 155)`|
|graphite|`--sidebar-accent`|`oklch(0.2940 0.0130 272.9312)`|`oklch(.29 .015 155)`|
|graphite|`--sidebar-accent-foreground`|`oklch(0.6132 0.2294 291.7437)`|`oklch(.8786 .216 155.299)`|
|graphite|`--sidebar-ring`|`oklch(0.6132 0.2294 291.7437)`|`oklch(.8 .15 155)`|
|graphite|`--glow-rgb`|`novo token local`|`98,247,153`|
|dark|`--background`|`oklch(0.2223 0.0060 271.1393)`|`oklch(.19 0 0)`|
|dark|`--foreground`|`oklch(0.9551 0 0)`|`oklch(.95 0 0)`|
|dark|`--card`|`oklch(0.2568 0.0076 274.6528)`|`oklch(.24 0 0)`|
|dark|`--card-foreground`|`oklch(0.9551 0 0)`|`oklch(.95 0 0)`|
|dark|`--primary`|`oklch(0.8786 0.2160 155.2990)`|`oklch(.83 .02 155)`|
|dark|`--primary-foreground`|`oklch(1.0000 0 0)`|`oklch(.18 0 0)`|
|dark|`--secondary`|`oklch(0.2940 0.0130 272.9312)`|`oklch(.29 0 0)`|
|dark|`--muted`|`oklch(0.2940 0.0130 272.9312)`|`oklch(.29 0 0)`|
|dark|`--muted-foreground`|`oklch(0.7058 0 0)`|`oklch(.75 0 0)`|
|dark|`--accent`|`oklch(0.2795 0.0368 260.0310)`|`oklch(.29 0 0)`|
|dark|`--accent-foreground`|`oklch(0.7857 0.1153 246.6596)`|`oklch(.95 0 0)`|
|dark|`--border`|`oklch(0.3289 0.0092 268.3843)`|`oklch(.34 0 0)`|
|dark|`--input`|`oklch(0.3289 0.0092 268.3843)`|`oklch(.34 0 0)`|
|dark|`--ring`|`oklch(0.6132 0.2294 291.7437)`|`oklch(.83 .02 155)`|
|dark|`--chart-2`|`oklch(0.6132 0.2294 291.7437)`|`oklch(.78 .09 100)`|
|dark|`--chart-4`|`oklch(0.6691 0.1569 260.1063)`|`oklch(.64 .02 155)`|
|dark|`--sidebar`|`oklch(0.2011 0.0039 286.0396)`|`oklch(.16 0 0)`|
|dark|`--sidebar-primary`|`oklch(0.6132 0.2294 291.7437)`|`oklch(.8786 .216 155.299)`|
|dark|`--sidebar-primary-foreground`|`oklch(1.0000 0 0)`|`oklch(.16 .02 155)`|
|dark|`--sidebar-accent`|`oklch(0.2940 0.0130 272.9312)`|`oklch(.29 0 0)`|
|dark|`--sidebar-accent-foreground`|`oklch(0.6132 0.2294 291.7437)`|`oklch(.95 0 0)`|
|dark|`--sidebar-ring`|`oklch(0.6132 0.2294 291.7437)`|`oklch(.8 .15 155)`|
|dark|`--glow-rgb`|`novo token local`|`170,190,175`|

Aliases para a interface antiga: --bg → --background; --text → --foreground; --line → --border; --elevated → --secondary; --positive → --primary; --cyan → --ring; --soft-shadow → --shadow-md. A antiga chave aurora é aceita como alias de Graphite Green, sem escrever no armazenamento financeiro.
