import { useEffect, useMemo, useState } from "react";
import {
  FlaskConical,
  LayoutDashboard,
  Shapes,
  Palette,
  MousePointer2,
  Monitor,
  Bookmark,
  Search,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Star,
  ExternalLink,
  Code2,
  Check,
  Undo2,
  Redo2,
  Download,
  GripVertical,
  Trash2,
  Maximize,
  PanelRightClose,
  PanelRightOpen,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import catalogData from "./data/catalog.json";
import sync from "../docs/catalog-sync.json";
import { useLab, activeDesign, allowPersistence } from "./store";
import {
  colors,
  labels,
  ranges,
  fonts,
  resolve,
  cssExport,
  exportDesign,
  type Design,
  type Item,
} from "./model";
import { Demo, Surface, Background, FinlyPreview, Boundary } from "./Demo";
import { Button } from "./components/ui/button";
const catalog = catalogData as unknown as Entry[];
type Entry = {
  id: string;
  name: string;
  source: string;
  category: string;
  description: string;
  official: string;
  demo: string;
  code: string;
  install: string | null;
  dependencies: string[];
  license: string;
  availability: string;
  status: string;
  component: string | null;
  reference: string;
  cssVars?: { light?: Record<string, string>; dark?: Record<string, string> };
};
const nav = [
  ["overview", "Visão geral", LayoutDashboard],
  ["library", "Biblioteca", Shapes],
  ["identity", "Identidade visual", Palette],
  ["playground", "Playground", MousePointer2],
  ["preview", "Preview do Finly", Monitor],
  ["presets", "Presets e favoritos", Bookmark],
] as const;
function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function ColorField({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [format, setFormat] = useState("CSS");
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : "#a9ed8a";
  function convert(mode: string) {
    setFormat(mode);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const c = canvas.getContext("2d", { willReadFrequently: true })!;
    c.fillStyle = value;
    c.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = c.getImageData(0, 0, 1, 1).data;
    if (mode === "RGB")
      setDraft(`rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})`);
    else if (mode === "HEX")
      setDraft(
        "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join(""),
      );
    else if (mode === "HSL") {
      const R = r / 255,
        G = g / 255,
        B = b / 255,
        max = Math.max(R, G, B),
        min = Math.min(R, G, B),
        d = max - min,
        l = (max + min) / 2,
        s = d ? d / (1 - Math.abs(2 * l - 1)) : 0,
        h = d
          ? (max === R
              ? ((G - B) / d + 6) % 6
              : max === G
                ? (B - R) / d + 2
                : (R - G) / d + 4) * 60
          : 0;
      setDraft(
        `hsla(${h.toFixed(0)}, ${(s * 100).toFixed(0)}%, ${(l * 100).toFixed(0)}%, ${(a / 255).toFixed(2)})`,
      );
    }
  }
  return (
    <div className="color-row">
      <label>
        {labels[name] ?? name}
        <input
          aria-label={"Cor " + (labels[name] ?? name)}
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      <div>
        <input
          aria-label={"Valor " + name}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (CSSglobal(e.target.value)) onChange(e.target.value);
          }}
          onBlur={() => {
            if (!CSSglobal(draft)) setDraft(value);
          }}
        />
        <select
          aria-label={"Formato " + name}
          value={format}
          onChange={(e) => convert(e.target.value)}
        >
          <option>CSS</option>
          <option>HEX</option>
          <option>RGB</option>
          <option>HSL</option>
        </select>
      </div>
    </div>
  );
}
function CSSglobal(v: string) {
  return window.CSS.supports("color", v) && v.length < 150 && !/[;{}]/.test(v);
}
function contrast(a: string, b: string) {
  const c = document
    .createElement("canvas")
    .getContext("2d", { willReadFrequently: true })!;
  function light(color: string) {
    c.clearRect(0, 0, 1, 1);
    c.fillStyle = color;
    c.fillRect(0, 0, 1, 1);
    const v = [...c.getImageData(0, 0, 1, 1).data].slice(0, 3).map((n) => {
      const x = n / 255;
      return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722;
  }
  const x = light(a),
    y = light(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function Inspector() {
  const s = useLab();
  const [scope, setScope] = useState("global");
  const d = activeDesign();
  const item = s.items.find((x) => x.id === s.selected);
  const t = resolve(
    d,
    scope === "individual" ? item?.category : scope,
    scope === "individual" ? s.selected : "",
  );
  const change = (k: string, v: string | number) => s.change(k, v, scope);
  return (
    <aside className="inspector">
      <header>
        <SlidersHorizontal size={16} />
        <h2>Propriedades</h2>
        <span className="live-dot">Live</span>
      </header>
      <label className="stack">
        Aplicar em
        <select
          aria-label="Aplicar em"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        >
          {[
            ["global", "Design global"],
            ["cards", "Categoria · cards"],
            ["buttons", "Categoria · botões"],
            ["forms", "Categoria · formulários"],
            ["charts", "Categoria · gráficos"],
            ["individual", "Instância selecionada"],
          ].map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      {scope === "individual" && (
        <label className="stack">
          Instância
          <select
            aria-label="Instância"
            value={s.selected}
            onChange={(e) => s.select(e.target.value)}
          >
            {s.items.map((x) => (
              <option key={x.id} value={x.id}>
                {x.component} · {x.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="contrast-check" role="status">
        Texto / fundo:{" "}
        {contrast(String(t.text), String(t.background)).toFixed(2)}:1 ·{" "}
        {contrast(String(t.text), String(t.background)) >= 4.5
          ? "AA para texto normal"
          : "Atenção: contraste abaixo de AA"}
      </div>
      <details open>
        <summary>
          Paleta e superfícies <span>{Object.keys(colors).length}</span>
        </summary>
        {Object.keys(colors).map((k) => (
          <ColorField
            key={k}
            name={k}
            value={String(t[k])}
            onChange={(v) => change(k, v)}
          />
        ))}
      </details>
      <details>
        <summary>Tipografia</summary>
        {[
          "font",
          "headingFont",
          "valueFont",
          "tableFont",
          "buttonFont",
          "menuFont",
        ].map((k, i) => (
          <label className="stack" key={k}>
            {["Texto", "Títulos", "Valores", "Tabelas", "Botões", "Menus"][i]}
            <select
              value={String(t[k])}
              onChange={(e) => change(k, e.target.value)}
            >
              {fonts.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
        ))}
      </details>
      <details open>
        <summary>Geometria e ritmo</summary>
        {Object.entries(ranges).map(([k, [label, min, max, step]]) => (
          <label className="range-row" key={k}>
            <span>
              {label}
              <output>{t[k]}</output>
            </span>
            <input
              aria-label={label}
              type="range"
              min={min}
              max={max}
              step={step}
              value={Number(t[k])}
              onChange={(e) => change(k, Number(e.target.value))}
            />
          </label>
        ))}
      </details>
      <details>
        <summary>Comportamento e modelos</summary>
        {Object.entries({
          backgroundKind: ["solid", "dots", "grid", "gradient"],
          chartKind: [
            "bar",
            "line",
            "area",
            "donut",
            "pie",
            "radial",
            "composed",
          ],
          iconKind: ["wallet", "plane", "game"],
          cardLayout: ["vertical", "horizontal"],
        }).map(([k, opts]) => (
          <label className="stack" key={k}>
            {
              {
                backgroundKind: "Background",
                chartKind: "Modelo do gráfico",
                iconKind: "Ícone do card",
                cardLayout: "Layout do card",
              }[k]
            }
            <select
              value={String(t[k])}
              onChange={(e) => change(k, e.target.value)}
            >
              {opts.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        ))}
        {[
          "motion",
          "hoverExpansion",
          "legend",
          "axes",
          "grid",
          "tooltip",
          "gradient",
        ].map((k) => (
          <label className="check" key={k}>
            <input
              type="checkbox"
              checked={t[k] === "on"}
              onChange={(e) => change(k, e.target.checked ? "on" : "off")}
            />
            {
              {
                motion: "Animações",
                hoverExpansion: "Expandir Sidebar por hover",
                legend: "Legenda",
                axes: "Eixos",
                grid: "Grade do gráfico",
                tooltip: "Tooltips",
                gradient: "Preenchimento suave",
              }[k]
            }
          </label>
        ))}
      </details>
      <p className="help">
        Ajustes por categoria e instância sobrescrevem o global. Componentes de
        terceiros mantêm os comportamentos da revisão integrada.
      </p>
    </aside>
  );
}
function Tile({
  entry: e,
  onCompare,
  compared = false,
}: {
  entry: Entry;
  onCompare: (e: Entry) => void;
  compared?: boolean;
}) {
  const s = useLab();
  return (
    <article className="catalog-tile">
      <div className={"catalog-thumb thumb-" + e.category}>
        <span>
          {e.category === "Gráficos" ? (
            <svg viewBox="0 0 200 80">
              <path
                d="M0 70 Q30 10 60 42 T120 20 T200 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          ) : e.category === "Cards" ? (
            <span className="thumb-card">
              <i />
              <b>Interface, com intenção.</b>
              <small>Referência do catálogo</small>
            </span>
          ) : e.category === "Backgrounds" ? (
            <span className="thumb-orb" />
          ) : (
            <Shapes size={32} />
          )}
        </span>
        <em>{e.status === "integrated" ? "Integrado" : "Referência"}</em>
        <button
          aria-label={"Favoritar " + e.name}
          className={s.favorites.includes(e.id) ? "favorited" : ""}
          onClick={() => s.favorite(e.id)}
        >
          <Star
            size={15}
            fill={s.favorites.includes(e.id) ? "currentColor" : "none"}
          />
        </button>
      </div>
      <div className="tile-info">
        <small>
          {e.source} <span>↗</span>
        </small>
        <h3>{e.name}</h3>
        <p>{e.description}</p>
        <div className="tile-meta">
          <span>
            {e.availability === "restricted"
              ? "Uso restrito"
              : e.availability === "unknown"
                ? "Licença a verificar"
                : "Gratuito"}
          </span>
          <span>{e.category}</span>
        </div>
        <div className="tile-actions">
          <button onClick={() => onCompare(e)} aria-pressed={compared}>
            {compared ? <Check size={13} /> : <Plus size={13} />}Comparar
          </button>
          <a href={e.demo} target="_blank" rel="noreferrer">
            Demo oficial <ArrowUpRight size={12} />
          </a>
        </div>
        {e.component && (
          <Button
            className="add-demo"
            variant="outline"
            onClick={() => {
              s.add(e.component!);
              s.message("Componente adicionado ao playground.");
            }}
          >
            Adicionar ao playground <Plus size={13} />
          </Button>
        )}
      </div>
    </article>
  );
}
function Catalog({ favoritesOnly = false }: { favoritesOnly?: boolean }) {
  const s = useLab();
  const [q, setQ] = useState(""),
    [source, setSource] = useState("all"),
    [category, setCategory] = useState("all"),
    [availability, setAvailability] = useState("all"),
    [page, setPage] = useState(0),
    [comparison, setComparison] = useState<Entry[]>([]);
  const filtered = useMemo(
    () =>
      catalog.filter(
        (e) =>
          (!favoritesOnly || s.favorites.includes(e.id)) &&
          (source === "all" || e.source === source) &&
          (category === "all" || e.category === category) &&
          (availability === "all" ||
            (availability === "integrated"
              ? e.status === "integrated"
              : e.availability === availability)) &&
          (e.name + " " + e.description)
            .toLowerCase()
            .includes(q.toLowerCase()),
      ),
    [q, source, category, availability, s.favorites, favoritesOnly],
  );
  function compare(e: Entry) {
    setComparison((c) =>
      c.some((x) => x.id === e.id)
        ? c.filter((x) => x.id !== e.id)
        : [...c.slice(-2), e],
    );
  }
  return (
    <>
      <div className="catalog-tools">
        <label className="search">
          <Search size={16} />
          <input
            aria-label="Buscar componentes"
            placeholder="Busque por componente, efeito ou ideia…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
          />
          <kbd>⌘ K</kbd>
        </label>
        {[
          [
            "Biblioteca",
            source,
            setSource,
            ["all", ...new Set(catalog.map((e) => e.source))],
          ],
          [
            "Categoria",
            category,
            setCategory,
            ["all", ...new Set(catalog.map((e) => e.category))],
          ],
          [
            "Disponibilidade",
            availability,
            setAvailability,
            ["all", "free", "premium", "restricted", "unknown", "integrated"],
          ],
        ].map(([label, value, set, options]) => (
          <select
            key={String(label)}
            aria-label={String(label)}
            value={String(value)}
            onChange={(e) => {
              (set as (v: string) => void)(e.target.value);
              setPage(0);
            }}
          >
            {(options as string[]).map((v) => (
              <option key={v} value={v}>
                {v === "all" ? String(label) : v}
              </option>
            ))}
          </select>
        ))}
      </div>
      <div className="section-caption">
        <span>
          {filtered.length} componentes <i>· snapshots locais</i>
        </span>
        <span>Referências reais. Integrações revisadas.</span>
      </div>
      <div className="catalog-grid">
        {filtered.slice(page * 24, page * 24 + 24).map((e) => (
          <Tile
            key={e.id}
            entry={e}
            onCompare={compare}
            compared={comparison.some((c) => c.id === e.id)}
          />
        ))}
      </div>
      {!filtered.length && (
        <div className="empty">
          Nenhum componente encontrado. Ajuste seus filtros.
        </div>
      )}
      <div className="pagination">
        <button disabled={page === 0} onClick={() => setPage(page - 1)}>
          Anterior
        </button>
        <span>
          {page + 1} / {Math.max(1, Math.ceil(filtered.length / 24))}
        </span>
        <button
          disabled={(page + 1) * 24 >= filtered.length}
          onClick={() => setPage(page + 1)}
        >
          Próxima
        </button>
      </div>
      {comparison.length > 0 && (
        <section className="comparison">
          <header>
            <h3>Comparar componentes</h3>
            <button onClick={() => setComparison([])}>Fechar</button>
          </header>
          <div>
            {comparison.map((e) => (
              <article key={e.id}>
                <b>{e.name}</b>
                <p>
                  {e.source} · {e.license}
                </p>
                <small>
                  {e.status === "integrated"
                    ? "Compilado e integrado"
                    : e.availability === "restricted"
                      ? "Referência: restrição de licença"
                      : "Apenas catalogado"}
                </small>
                <p>
                  {e.dependencies.join(", ") ||
                    "Dependências não declaradas no índice"}
                </p>
                <code>{e.install ?? "Comando não verificado"}</code>
                <a href={e.code} target="_blank" rel="noreferrer">
                  Ver origem <ExternalLink size={12} />
                </a>
                {e.component && (
                  <Surface design={activeDesign()}>
                    <Boundary>
                      <Demo
                        component={e.component}
                        tokens={activeDesign().tokens}
                      />
                    </Boundary>
                  </Surface>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
function SortableDemo({ item, design }: { item: Item; design: Design }) {
  const s = useLab();
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={"play-item " + (s.selected === item.id ? "selected" : "")}
      onClick={() => s.select(item.id)}
    >
      <header>
        <button
          aria-label={"Mover " + item.component}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={15} />
        </button>
        <small>{item.component}</small>
        <button
          aria-label={"Remover " + item.component}
          onClick={(e) => {
            e.stopPropagation();
            s.remove(item.id);
          }}
        >
          <Trash2 size={13} />
        </button>
      </header>
      <Surface design={design} category={item.category} id={item.id}>
        <Boundary>
          <Demo
            component={item.component}
            tokens={resolve(design, item.category, item.id)}
          />
        </Boundary>
      </Surface>
    </article>
  );
}
function Playground() {
  const s = useLab();
  const d = activeDesign();
  const [viewport, setViewport] = useState("100%"),
    [before, setBefore] = useState<{ design: Design; items: Item[] } | null>(
      null,
    ),
    [compare, setCompare] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  return (
    <>
      <div className="play-tools">
        <select
          aria-label="Adicionar componente integrado"
          value=""
          onChange={(e) => s.add(e.target.value)}
        >
          <option value="">+ Adicionar componente</option>
          {catalog
            .filter((e) => e.component)
            .map((e) => (
              <option key={e.id} value={e.component!}>
                {e.name}
              </option>
            ))}
        </select>
        <select
          aria-label="Viewport do playground"
          value={viewport}
          onChange={(e) => setViewport(e.target.value)}
        >
          <option value="100%">Desktop</option>
          <option value="768px">Tablet</option>
          <option value="390px">Mobile</option>
        </select>
        <button
          onClick={() => {
            if (!before) {
              setBefore({
                design: structuredClone(d),
                items: structuredClone(s.items),
              });
              s.message(
                "Estado capturado. Faça alterações e ative a comparação.",
              );
            } else setCompare(!compare);
          }}
        >
          {before ? "Comparar antes/depois" : "Capturar estado anterior"}
        </button>
        <button
          aria-label="Tela cheia"
          onClick={() => {
            const node = document.getElementById("play-canvas");
            if (document.fullscreenElement) void document.exitFullscreen();
            else
              void node
                ?.requestFullscreen()
                .catch(() =>
                  s.message("Tela cheia indisponível neste navegador."),
                );
          }}
        >
          <Maximize size={15} />
        </button>
      </div>
      <div className="canvas-scroller">
        <div id="play-canvas" style={{ width: viewport, maxWidth: "100%" }}>
          <Surface design={d} className="play-surface">
            <Background tokens={d.tokens} />
            <div className="canvas-label">
              <i /> COMPOSIÇÃO AO VIVO <span>{s.items.length} componentes</span>
            </div>
            {compare && before && (
              <Surface design={before.design}>
                <h3>Antes</h3>
                <div
                  className="play-grid"
                  style={{
                    gridTemplateColumns: `repeat(${Number(before.design.tokens.columns)},minmax(0,1fr))`,
                  }}
                >
                  {before.items.map((item) => (
                    <Surface
                      key={item.id}
                      design={before.design}
                      category={item.category}
                      id={item.id}
                    >
                      <small>{item.component}</small>
                      <Demo
                        component={item.component}
                        tokens={resolve(before.design, item.category, item.id)}
                      />
                    </Surface>
                  ))}
                </div>
                <h3>Depois</h3>
              </Surface>
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={({ active, over }) => {
                if (over) s.move(String(active.id), String(over.id));
              }}
            >
              <SortableContext
                items={s.items.map((x) => x.id)}
                strategy={rectSortingStrategy}
              >
                <div
                  className="play-grid"
                  style={{
                    gridTemplateColumns: `repeat(${Number(d.tokens.columns)}, minmax(0,1fr))`,
                  }}
                >
                  {s.items.map((item) => (
                    <SortableDemo key={item.id} item={item} design={d} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {!s.items.length && (
              <div className="empty">Adicione um componente para começar.</div>
            )}
          </Surface>
        </div>
      </div>
    </>
  );
}
export default function App() {
  const s = useLab();
  const [route, setRoute] = useState(location.hash.slice(1) || "overview"),
    [inspector, setInspector] = useState(true),
    [exportOpen, setExportOpen] = useState(false),
    [presetName, setPresetName] = useState("Meu design"),
    [themeMode, setThemeMode] = useState<"dark" | "light">("dark"),
    [favTab, setFavTab] = useState(false),
    [previewWidth, setPreviewWidth] = useState("100%");
  const d = activeDesign();
  useEffect(() => {
    const listener = () => setRoute(location.hash.slice(1) || "overview");
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        location.hash = "library";
        setTimeout(
          () =>
            document
              .querySelector<HTMLInputElement>(
                '[aria-label="Buscar componentes"]',
              )
              ?.focus(),
          50,
        );
      }
    };
    window.addEventListener("hashchange", listener);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("hashchange", listener);
      window.removeEventListener("keydown", key);
    };
  }, []);
  const title = nav.find((x) => x[0] === route)?.[1] ?? "Visão geral";
  function exportFile(kind: string) {
    const refs = catalog.filter((e) =>
      s.items.some((i) => i.component === e.component),
    );
    if (kind === "json")
      download(
        JSON.stringify(exportDesign(d, s.items, refs), null, 2),
        "finly-design.json",
        "application/json",
      );
    if (kind === "css") download(cssExport(d), "finly-theme.css", "text/css");
    if (kind === "summary")
      download(
        `# Finly — decisões visuais\n\nPreset: ${d.name}\n\n${s.items.map((i) => "- " + i.component).join("\n")}\n\nFontes: ${d.tokens.font}; títulos ${d.tokens.headingFont}; valores ${d.tokens.valueFont}.\n\n${refs.map((e) => `${e.name}: ${e.license}\n${e.code}\n${e.install}`).join("\n\n")}\n\nSem dados financeiros; implementar apenas decisões visuais.\n`,
        "finly-design.md",
        "text/markdown",
      );
    s.message("Design exportado.");
  }
  return (
    <div className={"lab-shell " + (!inspector ? "inspector-hidden" : "")}>
      <aside className="lab-sidebar">
        <a className="brand" href="#overview">
          <span>
            <FlaskConical size={23} />
          </span>
          <div>
            Finly <b>UI Lab</b>
            <small>DESIGN WORKSPACE</small>
          </div>
        </a>
        <div className="workspace-tag">
          <span>F</span>
          <div>
            Meu laboratório<small>Workspace local</small>
          </div>
          <ChevronRight size={13} />
        </div>
        <small className="nav-title">WORKSPACE</small>
        <nav>
          {nav.map(([id, label, Icon]) => (
            <a
              key={id}
              href={"#" + id}
              aria-label={label}
              aria-current={route === id ? "page" : undefined}
            >
              <Icon size={17} />
              <span>{label}</span>
              {id === "library" && (
                <small>{catalog.length.toLocaleString("pt-BR")}</small>
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-note">
          <i />
          Tudo fica no seu navegador.
          <p>
            Explore livremente.
            <br />
            Seu Finly continua intacto.
          </p>
        </div>
        <a
          className="source-link"
          href="https://github.com/vinicius-antunes/Finly-UI-Lab"
          target="_blank"
          rel="noreferrer"
        >
          <Code2 size={15} />
          Código e documentação
          <ArrowUpRight size={13} />
        </a>
      </aside>
      <header className="lab-topbar">
        <div className="breadcrumb">
          Workspace <ChevronRight size={12} />
          <b>{title}</b>
        </div>
        <div className="top-actions">
          <span className="local-badge">
            <i />
            Local-first
          </span>
          <button
            aria-label="Desfazer"
            disabled={!s.past.length}
            onClick={s.undo}
          >
            <Undo2 size={16} />
          </button>
          <button
            aria-label="Refazer"
            disabled={!s.future.length}
            onClick={s.redo}
          >
            <Redo2 size={16} />
          </button>
          <button
            aria-label="Alternar propriedades"
            onClick={() => setInspector(!inspector)}
          >
            {inspector ? (
              <PanelRightClose size={17} />
            ) : (
              <PanelRightOpen size={17} />
            )}
          </button>
          <button
            className="export-button"
            onClick={() => setExportOpen(!exportOpen)}
          >
            <Download size={14} />
            Exportar design
          </button>
        </div>
        {exportOpen && (
          <div className="export-menu">
            {[
              ["json", "JSON estruturado"],
              ["css", "Variáveis CSS"],
              ["summary", "Resumo para implementação"],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() => {
                  exportFile(v);
                  setExportOpen(false);
                }}
              >
                {l}
                <Download size={13} />
              </button>
            ))}
          </div>
        )}
      </header>
      <main className="lab-content">
        <div className="page-heading">
          <div>
            <small className="eyebrow">FINLY DESIGN SYSTEM / 01</small>
            <h1>
              {route === "overview"
                ? "Sua próxima interface começa aqui."
                : title}
            </h1>
            <p>
              {route === "overview"
                ? "Explore componentes. Encontre seu estilo. Construa com intenção."
                : route === "library"
                  ? "Uma biblioteca viva de referências e componentes originais."
                  : "Um espaço para experimentar, sem tocar nos seus dados."}
            </p>
          </div>
          <span className="version-pill">
            LAB v1.0 <i />
          </span>
        </div>
        {route === "overview" ? (
          <>
            <section className="welcome-grid">
              <article className="hero-card">
                <div className="hero-top">
                  <span className="green-label">
                    <i /> SEU ESPAÇO CRIATIVO
                  </span>
                  <FlaskConical size={20} />
                </div>
                <h2>
                  Menos achismo.
                  <br />
                  Mais <em>possibilidades.</em>
                </h2>
                <p>
                  Transforme referências em um design que é seu.
                  <br />
                  Do primeiro componente à visão completa.
                </p>
                <a href="#playground" className="primary-link">
                  Abrir playground <ArrowUpRight size={17} />
                </a>
                <div className="hero-bottom">
                  <span>COMPONENTES REAIS</span>
                  <span>DECISÕES VISUAIS</span>
                </div>
              </article>
              <article className="workspace-preview">
                <header>
                  <span>
                    <i /> LIVE PREVIEW
                  </span>
                  <span>Graphite / Finly</span>
                </header>
                <Surface design={d}>
                  <Demo component="magic-card" tokens={d.tokens} />
                  <div className="preview-mini-row">
                    <div>
                      <small>Receitas</small>
                      <b>R$ 8.200</b>
                      <span>+12,4%</span>
                    </div>
                    <div className="spark-bars">
                      {[22, 37, 30, 46, 40, 58, 50, 68, 62, 80].map((n, i) => (
                        <i key={i} style={{ height: n + "%" }} />
                      ))}
                    </div>
                  </div>
                </Surface>
                <footer>
                  O design muda. As possibilidades aumentam.{" "}
                  <ArrowUpRight size={14} />
                </footer>
              </article>
            </section>
            <div className="stat-strip">
              {[
                [String(catalog.length), "referências catalogadas"],
                [String(sync.integrated), "demonstrações integradas"],
                ["5", "presets de partida"],
                ["100%", "no seu navegador"],
              ].map(([n, l]) => (
                <div key={l}>
                  <b>{n}</b>
                  <span>{l}</span>
                </div>
              ))}
            </div>
            <section className="themes-section">
              <div className="section-title">
                <div>
                  <h2>Encontre seu ponto de partida</h2>
                  <p>
                    Uma identidade completa. Pronta para ganhar o seu toque.
                  </p>
                </div>
                <a href="#presets">
                  Explorar presets <ArrowRight size={14} />
                </a>
              </div>
              <div className="theme-grid">
                {s.designs.slice(0, 5).map((theme) => (
                  <button
                    key={theme.id}
                    className={
                      "theme-card " + (theme.id === s.current ? "chosen" : "")
                    }
                    onClick={() => s.pick(theme.id)}
                  >
                    <div
                      className="theme-mini"
                      style={{
                        background: String(theme.tokens.background),
                        color: String(theme.tokens.primary),
                      }}
                    >
                      <span
                        style={{ background: String(theme.tokens.sidebar) }}
                      />
                      <div>
                        <i
                          style={{ background: String(theme.tokens.primary) }}
                        />
                        <div>
                          <b
                            style={{ background: String(theme.tokens.card) }}
                          />
                          <b
                            style={{ background: String(theme.tokens.surface) }}
                          />
                        </div>
                        <em
                          style={{ borderColor: String(theme.tokens.primary) }}
                        />
                      </div>
                    </div>
                    <span>
                      {theme.name}
                      {theme.id === s.current && <Check size={14} />}
                    </span>
                  </button>
                ))}
              </div>
            </section>
            <section>
              <div className="section-title">
                <div>
                  <h2>Pequenos componentes. Grandes ideias.</h2>
                  <p>Seleções integradas para começar a experimentar agora.</p>
                </div>
                <a href="#library">
                  Ver biblioteca <ArrowRight size={14} />
                </a>
              </div>
              <div className="featured-grid">
                {catalog
                  .filter((e) => e.component)
                  .slice(0, 3)
                  .map((e) => (
                    <a
                      className="featured"
                      key={e.id}
                      href="#playground"
                      onClick={() => s.add(e.component!)}
                    >
                      <div>
                        {e.source === "shadcn" ? (
                          <Shapes size={28} />
                        ) : (
                          <MousePointer2 size={28} />
                        )}
                      </div>
                      <small>{e.source}</small>
                      <h3>{e.name}</h3>
                      <p>{e.description}</p>
                      <ArrowUpRight size={17} />
                    </a>
                  ))}
              </div>
            </section>
            <section className="reference-note">
              <b>Originalidade começa pela origem.</b>
              <span>
                Componentes catalogados não são integrações. Licenças e
                limitações acompanham cada referência.
              </span>
              <a href="#library">
                Explorar com contexto <ArrowUpRight size={13} />
              </a>
            </section>
          </>
        ) : route === "library" ? (
          <Catalog />
        ) : route === "playground" ? (
          <Playground />
        ) : route === "identity" ? (
          <>
            <div className="identity-bar">
              <Palette size={16} />
              <span>
                Editando <b>{d.name}</b>. Use o painel de propriedades para
                ajustar a identidade em tempo real.
              </span>
            </div>
            <FinlyPreview design={d} />
          </>
        ) : route === "preview" ? (
          <>
            <div className="play-tools">
              <label>
                Dispositivo{" "}
                <select
                  aria-label="Dispositivo do preview"
                  value={previewWidth}
                  onChange={(e) => setPreviewWidth(e.target.value)}
                >
                  <option value="100%">Desktop</option>
                  <option value="768px">Tablet</option>
                  <option value="390px">Mobile</option>
                </select>
              </label>
              <span>Dados fictícios · somente composição visual</span>
            </div>
            <div className="canvas-scroller">
              <div style={{ width: previewWidth, maxWidth: "100%" }}>
                <FinlyPreview design={d} />
              </div>
            </div>
          </>
        ) : route === "presets" ? (
          <>
            <div className="preset-tools">
              <button
                className={!favTab ? "active" : ""}
                onClick={() => setFavTab(false)}
              >
                Presets
              </button>
              <button
                className={favTab ? "active" : ""}
                onClick={() => setFavTab(true)}
              >
                Favoritos ({s.favorites.length})
              </button>
            </div>
            {favTab ? (
              <Catalog favoritesOnly />
            ) : (
              <>
                <div className="save-preset">
                  <label>
                    Temas oficiais TweakCN
                    <select
                      aria-label="Tema TweakCN"
                      defaultValue=""
                      onChange={(e) => {
                        const entry = catalog.find(
                          (x) => x.id === e.target.value,
                        );
                        const vars = entry?.cssVars?.[themeMode];
                        if (!entry || !vars) return;
                        const map: Record<string, string> = {
                          background: "background",
                          foreground: "text",
                          card: "card",
                          popover: "popover",
                          primary: "primary",
                          secondary: "surface",
                          "muted-foreground": "muted",
                          border: "border",
                          input: "input",
                          ring: "focus",
                          sidebar: "sidebar",
                          "chart-1": "chart",
                          "chart-2": "chartSecondary",
                        };
                        const tokens = Object.fromEntries(
                          Object.entries(vars)
                            .filter(([k]) => k in map)
                            .map(([k, v]) => [map[k], v]),
                        );
                        s.importTheme(
                          "TweakCN · " + entry.name + " · " + themeMode,
                          tokens,
                        );
                      }}
                    >
                      <option value="">Aplicar tema oficial…</option>
                      {catalog
                        .filter((e) => e.source === "tweakcn")
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Variante
                    <select
                      aria-label="Variante TweakCN"
                      value={themeMode}
                      onChange={(e) =>
                        setThemeMode(e.target.value as "dark" | "light")
                      }
                    >
                      <option value="dark">Escuro</option>
                      <option value="light">Claro</option>
                    </select>
                  </label>
                </div>
                <div className="save-preset">
                  <label>
                    Nome do preset
                    <input
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      maxLength={80}
                    />
                  </label>
                  <button
                    onClick={() => {
                      if (presetName.trim()) s.saveAs(presetName.trim());
                    }}
                  >
                    Salvar cópia
                  </button>
                  <button
                    onClick={() => {
                      if (presetName.trim()) s.rename(presetName.trim());
                    }}
                  >
                    Renomear atual
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Restaurar os ajustes do preset atual?"))
                        s.reset();
                    }}
                  >
                    Restaurar padrão
                  </button>
                </div>
                <div className="preset-list">
                  {s.designs.map((theme) => (
                    <button
                      key={theme.id}
                      className={theme.id === s.current ? "active" : ""}
                      onClick={() => s.pick(theme.id)}
                    >
                      <span
                        style={{ background: String(theme.tokens.primary) }}
                      />
                      {theme.name}
                      {theme.id === s.current && <Check size={16} />}
                    </button>
                  ))}
                </div>
                <p className="help">
                  Cada preset mantém cores e sobrescritas independentes. Ajustes
                  são salvos automaticamente neste navegador.
                </p>
                <div className="font-specimen">
                  {fonts.map((font) => (
                    <p key={font} style={{ fontFamily: font }}>
                      {font.replace(" Variable", "")}{" "}
                      <b>Seu dinheiro. Sua direção. 0123456789</b>
                    </p>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <p>
            Área não encontrada. <a href="#overview">Voltar ao início</a>
          </p>
        )}
        <footer className="lab-footer">
          <span>
            FINLY UI LAB <i>·</i> FEITO PARA EXPLORAR
          </span>
          <span>Sem dados reais. Sem limites para experimentar.</span>
        </footer>
      </main>
      {inspector && <Inspector />}
      {s.notice && (
        <div className="toast" role="status">
          <Check size={16} />
          <span>{s.notice}</span>
          <button onClick={() => s.message("")}>Fechar</button>
          {s.notice.includes("inválida") && (
            <button
              onClick={() => {
                allowPersistence();
                s.message("Persistência habilitada para novos ajustes.");
              }}
            >
              Habilitar novos ajustes
            </button>
          )}
        </div>
      )}
    </div>
  );
}
