import fs from "node:fs";
const sources = {
  shadcn: [
    "https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/public/r/index.json",
    "MIT",
  ],
  reactbits: [
    "https://raw.githubusercontent.com/DavidHDev/react-bits/main/public/r/registry.json",
    "MIT + Commons Clause (reference only)",
  ],
  magicui: [
    "https://raw.githubusercontent.com/magicuidesign/magicui/main/registry.json",
    "MIT",
  ],
  tweakcn: [
    "https://raw.githubusercontent.com/jnsahaj/tweakcn/main/public/r/registry.json",
    "Apache-2.0",
  ],
};
const integrated = {
  "shadcn:button": "button",
  "shadcn:card": "card",
  "shadcn:input": "input",
  "magicui:magic-card": "magic-card",
  "magicui:dot-pattern": "dot-pattern",
  "magicui:grid-pattern": "grid-pattern",
};
const category = (n) => {
 const rules=[[/card/i,'Cards'],[/bento|widget|stat|counter|number/i,'Widgets'],[/chart|graph|radial|^bar|^line|^area|^pie/i,'Gráficos'],[/light|spotlight|beam|rays/i,'Iluminação'],[/gradient|texture|noise|dither/i,'Gradientes e texturas'],[/background|aurora|particle|grid-pattern|dot-pattern|shader/i,'Backgrounds'],[/button/i,'Botões'],[/sidebar/i,'Sidebars'],[/tooltip/i,'Tooltips'],[/sonner|toast|notification/i,'Notificações'],[/dialog|modal|drawer/i,'Modais'],[/menu|popover|navigation/i,'Menus'],[/tabs/i,'Tabs'],[/table/i,'Tabelas'],[/icon/i,'Ícones'],[/input|text-field|textarea/i,'Inputs'],[/select|combobox|picker|calendar/i,'Seletores'],[/form|checkbox|radio|switch|label/i,'Formulários'],[/skeleton|loading|spinner/i,'Loading e skeletons'],[/landing|hero|footer|marquee/i,'Landing pages'],[/layout|dashboard|resizable|grid/i,'Layouts']];
 return rules.find(([re])=>re.test(n))?.[1]??'Microanimações';
};
const rows = [],
  report = [];
for (const [source, [url, license]] of Object.entries(sources)) {
  const file = `src/data/${source}-registry.json`;
  let status = "snapshot";
  if (process.argv.includes("--fetch"))
    try {
      const r = await fetch(url);
      if (!r.ok) throw Error(r.status);
      const d = await r.json();
      if (!d.items?.length) throw Error("empty");
      fs.writeFileSync(file, JSON.stringify(d, null, 2));
      status = "synchronized";
    } catch (e) {
      status = `snapshot; fetch failed: ${String(e)}`;
    }
  const raw = JSON.parse(fs.readFileSync(file));
  const data = Array.isArray(raw) ? { items: raw } : raw;
  for (const i of data.items) {
    if (i.name === "index") continue;
    const id = source + ":" + i.name;
    rows.push({
      id,
      originalId: i.name,
      name: i.title || i.name,
      source,
      category: source === "tweakcn" ? "Temas" : category(i.name),
      description:
        i.description ||
        "Item do registro oficial. Consulte a documentação para requisitos específicos.",
      official:
        source === "shadcn"
          ? `https://ui.shadcn.com/docs/components/${i.name}`
          : source === "reactbits"
            ? `https://reactbits.dev`
            : source === "tweakcn"
              ? "https://tweakcn.com/editor/theme"
              : `https://magicui.design/docs/components/${i.name}`,
      demo:
        source === "reactbits"
          ? "https://reactbits.dev"
          : source === "magicui"
            ? `https://magicui.design/docs/components/${i.name}`
            : source === "shadcn"
              ? `https://ui.shadcn.com/docs/components/${i.name}`
              : "https://tweakcn.com/editor/theme",
      code:
        source === "reactbits"
          ? `https://github.com/DavidHDev/react-bits/tree/main/src`
          : url,
      install:
        source === "shadcn"
          ? `npx shadcn@latest add ${i.name}`
          : source === "reactbits"
            ? `npx shadcn@latest add @react-bits/${i.name}`
            : source === "magicui"
              ? `npx shadcn@latest add @magicui/${i.name}`
              : `npx shadcn@latest add https://tweakcn.com/r/themes/${i.name}.json`,
      dependencies: i.dependencies || [],
      license,
      availability: source === "reactbits" ? "restricted" : "free",
      reference: url,
      status: integrated[id] ? "integrated" : "catalogued",
      component: integrated[id] || null,
      cssVars: source === "tweakcn" ? i.cssVars : null,
    });
  }
  report.push({
    source,
    url,
    status,
    count: data.items.filter((i) => i.name !== "index").length,
  });
}
// Examples enumerated from the official Recharts git tree, no hand-picked limit.
if (fs.existsSync("src/data/recharts-paths.json"))
  for (const path of JSON.parse(
    fs.readFileSync("src/data/recharts-paths.json"),
  )) {
    const name = path
      .split("/")
      .at(-1)
      .replace(/\.tsx$/, "");
    rows.push({
      id: "recharts:" + path,
      originalId: path,
      name,
      source: "recharts",
      category: "Gráficos",
      description:
        "Exemplo oficial Recharts; execução integrada disponível para os sete modelos do laboratório.",
      official: "https://recharts.github.io/en-US/examples/",
      demo: "https://recharts.github.io/en-US/examples/",
      code: "https://github.com/recharts/recharts/blob/main/" + path,
      install: "npm install recharts",
      dependencies: ["recharts", "react"],
      license: "MIT",
      availability: "free",
      status: "catalogued",
      component: null,
      reference: "recharts/recharts git tree",
    });
  }
for (const name of [
  "bar",
  "line",
  "area",
  "donut",
  "pie",
  "radial",
  "composed",
])
  rows.push({
    id: "recharts:model:" + name,
    originalId: name,
    name: "Recharts · " + name,
    source: "recharts",
    category: "Gráficos",
    description:
      "Modelo funcional composto com a API oficial instalada do Recharts, dados fictícios.",
    official: "https://recharts.github.io",
    demo: "https://recharts.github.io/en-US/examples/",
    code: "https://github.com/recharts/recharts",
    install: "npm install recharts",
    dependencies: ["recharts"],
    license: "MIT",
    availability: "free",
    status: "integrated",
    component: "chart-" + name,
    reference: "package-lock.json",
  });
for (const name of ["sidebar", "card-spotlight", "stateful-button"])
  rows.push({
    id: "aceternity:" + name,
    originalId: name,
    name,
    source: "aceternity",
    category: category(name),
    description:
      "Referência oficial. Acesso à enumeração bloqueado (HTTP 403); licença de redistribuição não confirmada. Não integrado.",
    official: "https://ui.aceternity.com/components/" + name,
    demo: "https://ui.aceternity.com/components/" + name,
    code: "https://ui.aceternity.com/components/" + name,
    install: null,
    dependencies: [],
    license: "Não verificada — referência apenas",
    availability: "unknown",
    status: "catalogued",
    component: null,
    reference: "URLs oficiais indicadas no pedido",
  });
fs.writeFileSync("src/data/catalog.json", JSON.stringify(rows));
fs.writeFileSync(
  "docs/catalog-sync.json",
  JSON.stringify(
    {
      sources: report,
      counts: Object.fromEntries(
        [...new Set(rows.map((x) => x.source))].map((s) => [
          s,
          rows.filter((x) => x.source === s).length,
        ]),
      ),
      integrated: rows.filter((x) => x.status === "integrated").length,
      limitations: [
        "Aceternity: enumeration blocked; 3 references only, not a complete catalogue",
        "React Bits current license restricts UI tools/redistribution; reference only",
      ],
    },
    null,
    2,
  ),
);
console.log(
  rows.length,
  "catalog entries;",
  rows.filter((x) => x.status === "integrated").length,
  "integrated",
);
