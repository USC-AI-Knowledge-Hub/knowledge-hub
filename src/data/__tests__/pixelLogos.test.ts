import { describe, expect, it } from "vitest";
import { pixelUnit } from "../../components/PixelMark";
import { PIXEL_LOGOS } from "../pixelLogos";
import { tools } from "../tools";

describe("pixel logos", () => {
  it("covers every tool", () => {
    for (const t of tools) expect(PIXEL_LOGOS[t.id], t.id).toBeDefined();
  });

  it("has no logos for tools that don't exist", () => {
    const ids = new Set(tools.map((t) => t.id));
    for (const id of Object.keys(PIXEL_LOGOS)) expect(ids.has(id), id).toBe(true);
  });

  for (const [id, logo] of Object.entries(PIXEL_LOGOS)) {
    it(`${id}: 16×16, outline ring left clear, every color defined`, () => {
      expect(logo.grid).toHaveLength(16);
      logo.grid.forEach((row, y) => {
        expect(row, `${id} row ${y}`).toHaveLength(16);
        for (const [x, c] of [...row].entries()) {
          if (c === ".") continue;
          expect(logo.palette[c], `${id} "${c}" at ${x},${y}`).toMatch(/^#[0-9a-fA-F]{6}$/);
          // The tile's outline owns the outer ring.
          expect(x > 0 && x < 15 && y > 0 && y < 15, `${id} draws on the outline at ${x},${y}`).toBe(true);
        }
      });
      // Not blank, and not a solid block either.
      const lit = logo.grid.join("").replace(/\./g, "").length;
      expect(lit).toBeGreaterThan(12);
    });
  }

  it("snaps to crisp sizes", () => {
    expect(pixelUnit(48)).toBe(3);
    expect(pixelUnit(160)).toBe(10);
    expect(pixelUnit(32)).toBe(2);
    expect(pixelUnit(24)).toBe(1.5);
    expect(pixelUnit(22)).toBe(1);
  });
});
