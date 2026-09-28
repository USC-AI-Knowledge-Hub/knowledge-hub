import { describe, expect, it } from "vitest";
import { navigationRequest, searchSite } from "../../lib/siteSearch";
import { GOVERNANCE, GREEN_TASKS, HABITS, PROMPT_FIGURES, SOURCES, DATA_CENTRES, TRAINING, ledMinutes, recommend, sourceById } from "../green";
import { toolById } from "../tools";

describe("right-size picker", () => {
  it("has a recommendation for every task", () => {
    expect(GREEN_TASKS.map((t) => t.id)).toEqual(["quick", "summarize", "study", "code", "research", "image", "video"]);
    for (const t of GREEN_TASKS) {
      expect(recommend(t.id)).toBe(t);
      expect(t.pick.length).toBeGreaterThan(0);
      expect(t.reason.length).toBeGreaterThan(0);
      expect(t.stepUp.length).toBeGreaterThan(0);
      expect(t.skip.length).toBeGreaterThan(0);
      expect([1, 2, 3, 4]).toContain(t.weight);
    }
  });

  it("only links to tools in the catalog", () => {
    for (const t of GREEN_TASKS) {
      expect(t.tools.length).toBeGreaterThan(0);
      for (const id of t.tools) expect(toolById.has(id), `${t.id} → ${id}`).toBe(true);
    }
  });

  it("falls back to the first task for unknown or missing IDs", () => {
    expect(recommend(null)).toBe(GREEN_TASKS[0]);
    expect(recommend("nope")).toBe(GREEN_TASKS[0]);
  });

  it("ranks text lighter than images, and images no heavier than video", () => {
    const w = (id: string) => recommend(id).weight;
    expect(w("quick")).toBeLessThan(w("image"));
    expect(w("image")).toBeLessThanOrEqual(w("video"));
    expect(w("video")).toBe(4);
  });

  it("suggests the on-device tutor for light tasks only", () => {
    for (const t of GREEN_TASKS.filter((x) => x.tutor)) expect(t.weight).toBe(1);
  });
});

describe("figures and sources", () => {
  it("cites a real source for every figure", () => {
    const cited = [DATA_CENTRES.source, TRAINING.source, ...PROMPT_FIGURES.map((f) => f.source), ...GOVERNANCE.flatMap((g) => (g.source ? [g.source] : []))];
    for (const id of cited) expect(sourceById.has(id), id).toBe(true);
    for (const s of SOURCES) expect(s.url).toMatch(/^https:\/\//);
  });

  it("keeps the agreed numbers", () => {
    expect(DATA_CENTRES.points.map((p) => p.twh)).toEqual([415, 945]);
    expect(PROMPT_FIGURES.map((f) => f.wh)).toEqual([0.24, 0.34]);
    expect(TRAINING.mwh).toBe(1287);
  });

  it("puts a prompt in LED-bulb minutes", () => {
    expect(ledMinutes(0.3)).toBeCloseTo(1.8);
    expect(ledMinutes(0.34)).toBeCloseTo(2.04);
  });

  it("has unique habit IDs", () => {
    expect(new Set(HABITS.map((h) => h.id)).size).toBe(HABITS.length);
  });
});

describe("site search", () => {
  it("finds the Green AI page by the words people use", () => {
    for (const q of ["green", "sustainability", "energy", "climate", "governance", "responsible ai", "environment"]) {
      expect(searchSite(q)[0]?.route, q).toBe("/green");
    }
  });

  it("works for tutor navigation", () => {
    const target = navigationRequest("take me to green ai")!;
    expect(searchSite(target)[0]?.route).toBe("/green");
  });
});
