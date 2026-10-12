import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EMPTY_DISCOVERED, EMPTY_TAXONOMY, type Source } from "../types";
import { discover, shouldTry, type Deps, type Inputs } from "../index";

const rss = readFileSync(new URL("../fixtures/rss.xml", import.meta.url), "utf8");
const vendor: Source = { id: "v", name: "Vendor blog", url: "https://v.example/feed", tier: "vendor" };
const dead: Source = { id: "d", name: "Dead feed", url: "https://d.example/feed", tier: "press" };
const inputs = (): Inputs => ({ discovered: EMPTY_DISCOVERED, taxonomy: EMPTY_TAXONOMY, overrides: { blockNames: [], blockIds: [], alias: {}, blockCategories: [] }, videos: null });
const deps = (over: Partial<Deps> = {}): Deps => ({
  now: new Date("2026-10-12T05:00:00Z"),
  sources: [vendor, dead],
  fetchText: async (url) => {
    if (url.includes("d.example")) throw new Error("HTTP 503");
    return rss;
  },
  page: async () => null,
  log: () => {},
  ...over,
});

describe("discovery run", () => {
  it("seeds the named tools and survives a dead feed", async () => {
    const s = await discover(deps(), inputs());
    expect(s.feeds).toEqual({ ok: 1, failed: 1, total: 2 });
    expect(s.discovered.tools.length).toBeGreaterThan(0);
    expect(s.discovered.sources.find((h) => h.id === "d")?.failures).toBe(1);
    expect(s.discovered.updatedAt).toBe("2026-10-12");
  });

  it("changes nothing but its warning when every feed fails", async () => {
    const s = await discover(deps({ fetchText: async () => { throw new Error("offline"); } }), inputs());
    expect(s.warnings.join(" ")).toMatch(/Every feed failed/);
    expect(s.added).toEqual([]);
  });

  it("files every seeded tool somewhere", async () => {
    const s = await discover(deps(), inputs());
    const ids = new Set(s.taxonomy.categories.map((c) => c.id));
    expect(s.discovered.tools.every((t) => t.tasks.length >= 0 && t.tasks.every((id) => typeof id === "string"))).toBe(true);
    expect(ids.size).toBeGreaterThanOrEqual(0);
  });

  it("tries a long-failing feed only about once a week", () => {
    const h = { id: "d", url: "", ok: false, lastOk: null, failures: 9, items: 0 };
    const tried = Array.from({ length: 14 }, (_, i) => shouldTry(h, "d", new Date(Date.UTC(2026, 9, 1 + i)))).filter(Boolean).length;
    expect(tried).toBe(2);
    expect(shouldTry(undefined, "d", new Date())).toBe(true);
  });
});
