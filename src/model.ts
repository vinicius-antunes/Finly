export type Tokens = Record<string, string | number>;
export type Design = {
  id: string;
  name: string;
  tokens: Tokens;
  categories: Record<string, Tokens>;
  individual: Record<string, Tokens>;
};
export type Item = { id: string; component: string; category: string };
export const colors = {
  background: "#111714",
  surface: "#19211c",
  card: "#202a23",
  sidebar: "#101812",
  header: "#19211c",
  elevated: "#26342b",
  modal: "#202a23",
  popover: "#26342b",
  dropdown: "#26342b",
  input: "#18201b",
  primary: "#a9ed8a",
  secondary: "#314337",
  destructive: "#e78484",
  text: "#edf3ee",
  muted: "#a5b4a8",
  title: "#f6faf6",
  icon: "#c3d0c5",
  border: "#35493b",
  divider: "#35493b",
  link: "#c5f5af",
  selection: "#527b40",
  chart: "#a9ed8a",
  chartSecondary: "#5e9e88",
  positive: "#a9ed8a",
  negative: "#f29494",
  success: "#a9ed8a",
  warning: "#e9c37d",
  error: "#ef9999",
  info: "#91bacd",
  hover: "#2a3d30",
  focus: "#d4ffbd",
  active: "#8dc86e",
  disabled: "#65756a",
  scrollbar: "#4e6755",
  glow: "#80e761",
  shadow: "#000000",
};
export const labels: Record<string, string> = {
  background: "Fundo principal",
  surface: "Fundo secundário",
  card: "Cards",
  sidebar: "Sidebar",
  header: "Cabeçalho",
  elevated: "Superfície elevada",
  modal: "Modais",
  popover: "Popovers",
  dropdown: "Dropdowns",
  input: "Campos",
  primary: "Primário",
  secondary: "Secundário",
  destructive: "Destrutivo",
  text: "Texto",
  muted: "Texto secundário",
  title: "Títulos",
  icon: "Ícones",
  border: "Bordas",
  divider: "Divisores",
  link: "Links",
  selection: "Seleção",
  chart: "Gráfico principal",
  chartSecondary: "Gráfico secundário",
  positive: "Positivo",
  negative: "Negativo",
  success: "Sucesso",
  warning: "Alerta",
  error: "Erro",
  info: "Informação",
  hover: "Hover",
  focus: "Foco",
  active: "Ativo",
  disabled: "Desabilitado",
  scrollbar: "Scrollbar",
  glow: "Iluminação",
  shadow: "Sombra",
};
export const fonts = [
  "Plus Jakarta Sans Variable",
  "Geist Variable",
  "Inter Variable",
  "Manrope Variable",
  "DM Sans Variable",
];
export const ranges: Record<string, [string, number, number, number]> = {
  radius: ["Arredondamento", 0, 32, 1],
  padding: ["Padding", 8, 40, 2],
  gap: ["Espaçamento", 4, 32, 2],
  bodySize: ["Texto", 12, 20, 1],
  headingSize: ["Títulos", 18, 40, 1],
  valueSize: ["Valores", 18, 44, 1],
  tableSize: ["Tabelas", 11, 20, 1],
  buttonSize: ["Botões", 12, 20, 1],
  menuSize: ["Menus", 12, 20, 1],
  weight: ["Peso", 400, 800, 50],
  lineHeight: ["Entrelinha", 1.1, 2, 0.1],
  tracking: ["Entreletras", -0.5, 2, 0.1],
  opacity: ["Opacidade", 0.3, 1, 0.05],
  shadowSize: ["Sombra", 0, 40, 2],
  borderWidth: ["Borda", 0, 4, 1],
  cardHeight: ["Altura mínima", 100, 320, 10],
  cardWidth: ["Largura máxima", 220, 1000, 20],
  sidebarWidth: ["Sidebar expandida", 180, 300, 10],
  sidebarCollapsed: ["Sidebar recolhida", 48, 96, 4],
  iconSize: ["Ícones", 14, 28, 1],
  rowHeight: ["Densidade de linhas", 28, 64, 4],
  progress: ["Progresso demonstrativo", 0, 100, 5],
  variation: ["Variação demonstrativa", -30, 30, 1],
  intensity: ["Intensidade do fundo", 0, 1, 0.05],
  blur: ["Desfoque", 0, 40, 2],
  speed: ["Velocidade", 1, 20, 1],
  direction: ["Direção", 0, 360, 15],
  effectSize: ["Escala do fundo", 8, 64, 4],
  effectX: ["Posição X", 0, 100, 5],
  effectY: ["Posição Y", 0, 100, 5],
  chartStroke: ["Espessura gráfico", 1, 6, 1],
  barRadius: ["Raio das barras", 0, 16, 1],
  columns: ["Colunas", 1, 3, 1],
  duration: ["Transição (ms)", 0, 500, 25],
};
const defaults: Tokens = {
  ...colors,
  radius: 16,
  padding: 20,
  gap: 16,
  bodySize: 14,
  headingSize: 26,
  valueSize: 30,
  tableSize: 13,
  buttonSize: 14,
  menuSize: 13,
  weight: 600,
  lineHeight: 1.5,
  tracking: 0,
  opacity: 1,
  shadowSize: 12,
  borderWidth: 1,
  cardHeight: 160,
  cardWidth: 1000,
  sidebarWidth: 224,
  sidebarCollapsed: 60,
  iconSize: 18,
  rowHeight: 44,
  progress: 64,
  variation: 12,
  intensity: 0.25,
  blur: 0,
  speed: 8,
  direction: 120,
  effectSize: 24,
  effectX: 50,
  effectY: 0,
  chartStroke: 2,
  barRadius: 6,
  columns: 2,
  duration: 180,
  font: fonts[0],
  headingFont: fonts[0],
  valueFont: fonts[0],
  tableFont: fonts[0],
  buttonFont: fonts[0],
  menuFont: fonts[0],
  backgroundKind: "dots",
  motion: "on",
  hoverExpansion: "on",
  chartKind: "bar",
  legend: "on",
  axes: "on",
  grid: "on",
  tooltip: "on",
  gradient: "on",
  iconKind: "wallet",
  cardLayout: "vertical",
};
export const initialDesigns: Design[] = [
  ["graphite", "Graphite garden", {}],
  [
    "obsidian",
    "Obsidian",
    {
      background: "#090b0a",
      surface: "#121513",
      card: "#191d1a",
      primary: "#e5e9e5",
      chart: "#e5e9e5",
      glow: "#91a797",
      radius: 8,
      backgroundKind: "solid",
      font: fonts[1],
    },
  ],
  [
    "dark",
    "Midnight ledger",
    {
      background: "#151d26",
      surface: "#1d2833",
      card: "#243340",
      primary: "#9fc7de",
      chart: "#9fc7de",
      glow: "#7fb9c9",
      backgroundKind: "grid",
      radius: 12,
    },
  ],
  [
    "light",
    "Paper & sage",
    {
      background: "#f4f6ef",
      surface: "#eef1e8",
      card: "#ffffff",
      sidebar: "#e7eddf",
      header: "#eef1e8",
      text: "#26332a",
      title: "#15291d",
      muted: "#57695b",
      primary: "#2e633c",
      chart: "#2e633c",
      border: "#c3cfbd",
      input: "#f1f5ed",
      popover: "#fff",
      modal: "#fff",
      dropdown: "#fff",
      positive: "#2e633c",
      negative: "#a43131",
      backgroundKind: "solid",
    },
  ],
  [
    "aurora",
    "Aurora garden",
    {
      background: "#0d2019",
      card: "#173b2b",
      surface: "#142e22",
      primary: "#baf89d",
      glow: "#7cffae",
      backgroundKind: "gradient",
      intensity: 0.4,
      radius: 24,
    },
  ],
].map(([id, name, tokens]) => ({
  id: String(id),
  name: String(name),
  tokens: { ...defaults, ...(tokens as Tokens) },
  categories: {},
  individual: {},
}));
export function resolve(d: Design, category = "", id = ""): Tokens {
  return { ...d.tokens, ...d.categories[category], ...d.individual[id] };
}
export const cssVars = (tokens: Tokens) =>
  Object.fromEntries(
    Object.entries(tokens).map(([k, v]) => [
      "--" + k,
      typeof v === "number" &&
      ![
        "weight",
        "lineHeight",
        "opacity",
        "intensity",
        "progress",
        "variation",
        "columns",
      ].includes(k)
        ? String(v) +
          ((
            {
              direction: "deg",
              speed: "s",
              duration: "ms",
              effectX: "%",
              effectY: "%",
            } as Record<string, string>
          )[k] ?? "px")
        : String(v),
    ]),
  );
export function exportDesign(d: Design, items: Item[], references: unknown[]) {
  return {
    schema: "finly-ui-lab/design",
    version: 1,
    design: d,
    layout: items,
    animations: {
      motion: d.tokens.motion,
      duration: d.tokens.duration,
      speed: d.tokens.speed,
    },
    references,
  };
}
export const cssExport = (d: Design) =>
  `:root {\n${Object.entries(cssVars(d.tokens))
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n")}\n}\n` +
  Object.entries(d.categories)
    .map(
      ([k, v]) =>
        `.category-${k} {${Object.entries(cssVars(v))
          .map(([n, x]) => `${n}:${x};`)
          .join("")}}`,
    )
    .join("\n") +
  Object.entries(d.individual)
    .map(
      ([k, v]) =>
        `[data-design-id="${k}"] {${Object.entries(cssVars(v))
          .map(([n, x]) => `${n}:${x};`)
          .join("")}}`,
    )
    .join("\n");
export function validSaved(value: unknown): boolean {
  const record = (v: unknown): v is Record<string, unknown> =>
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.keys(v).every(
      (k) => !["__proto__", "constructor", "prototype"].includes(k),
    );
  const tokenSet = (v: unknown) =>
    record(v) &&
    Object.entries(v).every(([k, x]) => {
      if (!(k in defaults)) return false;
      if (typeof x === "number")
        return (
          Number.isFinite(x) &&
          (!(k in ranges) || (x >= ranges[k][1] && x <= ranges[k][2]))
        );
      if (
        typeof x !== "string" ||
        x.length > 150 ||
        /[;{}]|url\(|var\(/i.test(x)
      )
        return false;
      if (k in colors)
        return typeof CSS === "undefined"
          ? /^(#[a-f\d]{3,8}|[a-z]+|[a-z]+\([a-z\d%., /+-]+\))$/i.test(x)
          : CSS.supports("color", x);
      if (k.endsWith("Font") || k === "font") return fonts.includes(x);
      return (
        x === "on" ||
        x === "off" ||
        [
          "solid",
          "dots",
          "grid",
          "gradient",
          "bar",
          "line",
          "area",
          "donut",
          "pie",
          "radial",
          "composed",
          "wallet",
          "plane",
          "game",
          "vertical",
          "horizontal",
        ].includes(x)
      );
    });
  const overrides = (v: unknown) =>
    record(v) &&
    Object.keys(v).length <= 500 &&
    Object.entries(v).every(
      ([k, x]) => /^[a-z\d_-]{1,100}$/i.test(k) && tokenSet(x),
    );
  return (
    record(value) &&
    value.version === 1 &&
    Array.isArray(value.designs) &&
    value.designs.length > 0 &&
    value.designs.length <= 100 &&
    value.designs.every(
      (d) =>
        record(d) &&
        typeof d.id === "string" &&
        /^[a-z\d_-]{1,100}$/i.test(d.id) &&
        typeof d.name === "string" &&
        d.name.length <= 100 &&
        tokenSet(d.tokens) &&
        Object.keys(defaults).every((k) => k in (d.tokens as object)) &&
        overrides(d.categories) &&
        overrides(d.individual),
    ) &&
    Array.isArray(value.items) &&
    value.items.length <= 200 &&
    value.items.every(
      (x) =>
        record(x) &&
        typeof x.id === "string" &&
        /^[a-z\d_-]{1,100}$/i.test(x.id) &&
        typeof x.component === "string" &&
        /^(magic-card|card|button|input|dot-pattern|grid-pattern|chart-(bar|line|area|donut|pie|radial|composed))$/.test(
          x.component,
        ) &&
        typeof x.category === "string" &&
        /^[a-z]+$/.test(x.category),
    )
  );
}
