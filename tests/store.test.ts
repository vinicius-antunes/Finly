import { it, expect } from "vitest";
// Browser lifecycle is covered by Playwright; pure persistence contracts are covered here.
import { validSaved, initialDesigns, cssVars } from "../src/model";
it("serialized presets and overrides roundtrip", () => {
  const design = structuredClone(initialDesigns[0]);
  design.categories.cards = { padding: 30 };
  design.individual.balance = { padding: 12 };
  const saved = JSON.parse(
    JSON.stringify({
      version: 1,
      designs: [design],
      items: [{ id: "balance", component: "magic-card", category: "cards" }],
    }),
  );
  expect(validSaved(saved)).toBe(true);
});
it("exports correct dimensions, time, angle and position units", () => {
  const css = cssVars(initialDesigns[0].tokens);
  expect(css["--duration"]).toBe("180ms");
  expect(css["--direction"]).toBe("120deg");
  expect(css["--effectX"]).toBe("50%");
  expect(css["--speed"]).toBe("8s");
});
it("keeps icon color distinct from icon selection", () => {
  expect(initialDesigns[0].tokens.icon).toMatch(/^#/);
  expect(initialDesigns[0].tokens.iconKind).toBe("wallet");
});
