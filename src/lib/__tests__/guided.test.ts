import { describe, expect, it } from "vitest";
import type { LessonQuestion } from "../../data/guided/types";
import { drawCheck, shuffle } from "../guided";

const bank: LessonQuestion[] = Array.from({ length: 12 }, (_, i) => ({
  id: `q${i}`,
  prompt: `Question ${i}`,
  options: [`right ${i}`, `wrong a ${i}`, `wrong b ${i}`, `wrong c ${i}`],
  answer: 0,
  explain: "Because it is the right one.",
}));

/** A seeded random source so tests are repeatable. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32;
    return seed / 2 ** 32;
  };
}

describe("drawCheck", () => {
  it("draws the requested number of distinct questions", () => {
    const qs = drawCheck(bank, 4, {}, seeded(1));
    expect(qs).toHaveLength(4);
    expect(new Set(qs.map((q) => q.id)).size).toBe(4);
  });

  it("keeps the correct answer correct after shuffling options", () => {
    for (let s = 1; s < 30; s++)
      for (const q of drawCheck(bank, 4, {}, seeded(s))) expect(q.options[q.answer]).toBe(`right ${q.id.slice(1)}`);
  });

  it("actually moves the correct option around", () => {
    const positions = new Set<number>();
    for (let s = 1; s < 40; s++) for (const q of drawCheck(bank, 4, {}, seeded(s))) positions.add(q.answer);
    expect(positions.size).toBe(4);
  });

  it("avoids the previous check's questions when the bank allows", () => {
    const first = drawCheck(bank, 4, {}, seeded(3)).map((q) => q.id);
    const second = drawCheck(bank, 4, { lastDrawn: first }, seeded(4)).map((q) => q.id);
    expect(second.some((id) => first.includes(id))).toBe(false);
  });

  it("brings back missed questions, but no more than half the check", () => {
    const missed = ["q1", "q2", "q3", "q4", "q5"];
    const qs = drawCheck(bank, 4, { missed }, seeded(7)).map((q) => q.id);
    expect(qs.filter((id) => missed.includes(id))).toHaveLength(2);
  });

  it("varies between draws", () => {
    const draws = new Set(Array.from({ length: 10 }, (_, s) => drawCheck(bank, 4, {}, seeded(s + 1)).map((q) => q.id).sort().join()));
    expect(draws.size).toBeGreaterThan(5);
  });
});

describe("shuffle", () => {
  it("keeps every element", () => {
    expect(shuffle([1, 2, 3, 4, 5], seeded(9)).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
