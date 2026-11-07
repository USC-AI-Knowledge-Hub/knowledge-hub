import { describe, expect, it } from "vitest";
import { PAIRS, differences, pairSlug, pairsFor, parsePair, textRows, toolsFor } from "../compare";
import { toolById } from "../tools";

describe("comparisons", () => {
  it("only pairs tools that exist, once each", () => {
    const seen = new Set<string>();
    for (const [a, b] of PAIRS) {
      expect(toolById.has(a), a).toBe(true);
      expect(toolById.has(b), b).toBe(true);
      expect(a).not.toBe(b);
      const key = [a, b].sort().join("|");
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });

  it("reads a pair address in either order, and nothing else", () => {
    expect(parsePair("chatgpt-vs-claude")).toEqual(["chatgpt", "claude"]);
    expect(parsePair("claude-vs-chatgpt")).toEqual(["claude", "chatgpt"]);
    expect(parsePair("chatgpt-vs-nope")).toBeNull();
    expect(parsePair("")).toBeNull();
    expect(pairSlug("a", "b")).toBe("a-vs-b");
  });

  it("lists the tools a tool is compared with", () => {
    expect(pairsFor("claude")).toEqual(expect.arrayContaining(["chatgpt", "gemini", "perplexity"]));
    expect(pairsFor("zapier")).toEqual(["n8n"]);
    expect(pairsFor("not-a-tool")).toEqual([]);
  });

  it("states what differs using only the reviews' own fields", () => {
    const [a, b] = toolsFor(["chatgpt", "claude"]);
    const diff = differences([a, b]);
    expect(diff).toHaveLength(3);
    expect(diff.join(" ")).toMatch(/Cost:/);
    expect(diff.join(" ")).toMatch(/Getting started:/);
    expect(diff.join(" ")).toMatch(/USC access:/);
    const same = differences(toolsFor(["gemini", "copilot"]));
    expect(same.join(" ")).toMatch(/both/);
    expect(differences([a])).toEqual([]);
  });

  it("gives every pair written rows for the prerendered page", () => {
    for (const [x, y] of PAIRS) {
      const rows = textRows(toolsFor([x, y]));
      expect(rows.length).toBeGreaterThan(4);
      for (const r of rows) expect(r.items.every((i) => i.length > 3)).toBe(true);
    }
  });
});
