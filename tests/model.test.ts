import { describe, it, expect } from "vitest";
import { initialDesigns, resolve, cssExport, exportDesign } from "../src/model";
import catalog from "../src/data/catalog.json";
describe("design contracts", () => {
  it("has independent themes and complete colors", () => {
    expect(initialDesigns).toHaveLength(5);
    expect(new Set(initialDesigns.map((x) => x.tokens.background)).size).toBe(
      5,
    );
  });
  it("resolves global/category/instance without mutation", () => {
    const d = structuredClone(initialDesigns[0]);
    d.categories.cards = { padding: 30 };
    d.individual.demo = { padding: 12 };
    expect(resolve(d, "cards", "demo").padding).toBe(12);
    expect(resolve(d, "cards").padding).toBe(30);
    expect(d.tokens.padding).toBe(20);
  });
  it("exports versioned visual-only JSON and CSS", () => {
    const d = initialDesigns[0],
      data = exportDesign(d, [], []);
    expect(data.version).toBe(1);
    expect(data.schema).toBe("finly-ui-lab/design");
    expect(cssExport(d)).toContain("--radius: 16px");
    expect(data).not.toHaveProperty("transactions");
  });
  it("catalogue has unique ids and genuine integration boundaries", () => {
    expect(new Set(catalog.map((x) => x.id)).size).toBe(catalog.length);
    expect(catalog.length).toBeGreaterThan(1500);
    expect(catalog.filter((x) => x.status === "integrated")).toHaveLength(13);
    expect(
      catalog
        .filter((x) => x.source === "reactbits")
        .every((x) => x.status === "catalogued"),
    ).toBe(true);
    expect(catalog.every((x) => x.official.startsWith("https://"))).toBe(true);
  });
});
import { validSaved } from "../src/model";
describe("local snapshot safety", () => {
  const valid = () => ({
    version: 1,
    designs: structuredClone(initialDesigns),
    current: "graphite",
    items: [{ id: "a", component: "card", category: "cards" }],
  });
  it("accepts versioned complete snapshots", () =>
    expect(validSaved(valid())).toBe(true));
  it("rejects damaged structure, code-like CSS and unreviewed components", () => {
    const a = valid();
    delete (a.designs[0] as Partial<(typeof a.designs)[0]>).categories;
    expect(validSaved(a)).toBe(false);
    const b = valid();
    b.designs[0].tokens.card = "url(https://bad.invalid)";
    expect(validSaved(b)).toBe(false);
    const c = valid();
    c.items[0].component = "remote-code";
    expect(validSaved(c)).toBe(false);
  });
});
