import { describe, expect, it } from "vitest";
import { PROMPTS, PROMPT_CATEGORIES, blanks, fill, isLong, searchPrompts } from "../prompts";

describe("the prompt library", () => {
  it("has a useful number of prompts in every category, with unique ids", () => {
    expect(new Set(PROMPTS.map((p) => p.id)).size).toBe(PROMPTS.length);
    for (const c of PROMPT_CATEGORIES) expect(PROMPTS.filter((p) => p.category === c.id).length, c.id).toBeGreaterThanOrEqual(4);
  });

  it("gives every prompt a reason to use it, something to fill in, and a check", () => {
    for (const p of PROMPTS) {
      expect(p.when.length, p.id).toBeGreaterThan(15);
      expect(p.check.length, p.id).toBeGreaterThan(30);
      expect(blanks(p.prompt).length, `${p.id} has no blanks`).toBeGreaterThan(0);
      expect(p.title, p.id).not.toMatch(/[A-Z]{4,}/);
    }
  });

  it("never asks for work to be handed in as the student's own", () => {
    for (const p of PROMPTS) expect(p.prompt.toLowerCase(), p.id).not.toMatch(/write my (essay|assignment|paper|homework)|do my homework/);
  });

  it("finds the blanks, once each, and which want a longer text", () => {
    expect(blanks("Explain [topic] for [major]. More on [topic].")).toEqual(["topic", "major"]);
    expect(isLong("paste your notes")).toBe(true);
    expect(isLong("topic")).toBe(false);
  });

  it("fills in what's typed and leaves the rest visible", () => {
    expect(fill("Explain [topic] for [major].", { topic: "entropy", major: "  " })).toBe("Explain entropy for [major].");
    expect(fill("[a] [a]", { a: "x" })).toBe("x x");
  });

  it("searches titles, purposes and the prompts themselves, within a category", () => {
    expect(searchPrompts("debug", null).map((p) => p.id)).toContain("debug");
    expect(searchPrompts("", "study").every((p) => p.category === "study")).toBe(true);
    expect(searchPrompts("interview", "study")).toEqual([]);
    expect(searchPrompts("zzzzqq", null)).toEqual([]);
  });
});
