import { describe, expect, it } from "vitest";
import { clusterOf } from "../../data/toolMap";
import { tools } from "../../data/tools";
import { forceLayout, NODE_H, NODE_W, toolMapLayout, type LayoutNode } from "../forceLayout";

const overlaps = (a: { x: number; y: number }, b: { x: number; y: number }, w: number, h: number) =>
  Math.abs(a.x - b.x) < w - 0.5 && Math.abs(a.y - b.y) < h - 0.5;

describe("forceLayout", () => {
  const nodes: LayoutNode[] = Array.from({ length: 12 }, (_, i) => ({ id: `n${i}`, group: i % 3 === 0 ? "a" : "b", w: 80, h: 40 }));
  const groups = [
    { id: "a", x: 0, y: 0 },
    { id: "b", x: 400, y: 0 },
  ];

  it("gives the same answer every time", () => {
    const one = forceLayout(nodes, groups);
    const two = forceLayout(nodes, groups);
    expect([...two]).toEqual([...one]);
  });

  it("separates boxes that start on top of each other", () => {
    const stacked = nodes.map((n) => ({ ...n, group: "a" }));
    const pos = forceLayout(stacked, groups);
    const list = [...pos.values()];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) expect(overlaps(list[i], list[j], 80, 40)).toBe(false);
  });

  it("rejects a node whose group doesn't exist", () => {
    expect(() => forceLayout([{ id: "x", group: "nope", w: 1, h: 1 }], groups)).toThrow(/nope/);
  });
});

describe("toolMapLayout", () => {
  const { nodes, centers, world: WORLD } = toolMapLayout();

  it("places every tool", () => {
    expect(nodes.size).toBe(tools.length);
    for (const t of tools) expect(nodes.has(t.id)).toBe(true);
  });

  it("never overlaps two nodes", () => {
    const list = [...nodes];
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const [a, pa] = list[i];
        const [b, pb] = list[j];
        expect(overlaps(pa, pb, NODE_W, NODE_H), `${a} overlaps ${b}`).toBe(false);
      }
  });

  it("keeps each tool near its own cluster, and nearer to it than to any other", () => {
    for (const [id, p] of nodes) {
      const own = centers.get(clusterOf[id])!;
      const d = Math.hypot(p.x - own.x, p.y - own.y);
      expect(d, `${id} is ${Math.round(d)} from its cluster`).toBeLessThan(260);
      for (const [cid, c] of centers) {
        if (cid === clusterOf[id]) continue;
        expect(Math.hypot(p.x - c.x, p.y - c.y), `${id} is closer to ${cid}`).toBeGreaterThan(d);
      }
    }
  });

  it("stays inside the world", () => {
    for (const [id, p] of nodes) {
      expect(p.x - NODE_W / 2, id).toBeGreaterThanOrEqual(0);
      expect(p.x + NODE_W / 2, id).toBeLessThanOrEqual(WORLD.w);
      expect(p.y - NODE_H / 2, id).toBeGreaterThanOrEqual(0);
      expect(p.y + NODE_H / 2, id).toBeLessThanOrEqual(WORLD.h);
    }
  });
});
