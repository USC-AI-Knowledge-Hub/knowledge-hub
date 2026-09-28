import { describe, expect, it } from "vitest";
import { moduleById, pathById } from "../../learn";
import { guidedLessons } from "../index";
import { guidedPaths, pathModules } from "../paths";
import { CHECK_SIZE } from "../types";

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

describe("guided lessons", () => {
  it("covers each module at most once", () => {
    const ids = guidedLessons.map((l) => l.module);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(moduleById.has(id), id).toBe(true);
  });

  for (const l of guidedLessons) {
    describe(l.module, () => {
      it("has objectives, 3–5 sections of teachable length, an example and a reflection", () => {
        expect(l.objectives.length).toBe(3);
        expect(l.sections.length).toBeGreaterThanOrEqual(3);
        expect(l.sections.length).toBeLessThanOrEqual(5);
        for (const s of l.sections) {
          expect(words(s.body), s.heading).toBeGreaterThanOrEqual(80);
          expect(words(s.body), s.heading).toBeLessThanOrEqual(230);
          expect(s.ask, s.heading).toMatch(/\?$/);
        }
        expect(words(l.example.body)).toBeGreaterThanOrEqual(60);
        expect(l.reflect.length).toBeGreaterThan(30);
        expect(l.deliverable.length).toBeGreaterThan(20);
      });

      it("has a question bank big enough to randomize, each with one valid answer", () => {
        expect(l.questions.length).toBeGreaterThanOrEqual(CHECK_SIZE * 2 + 2);
        expect(new Set(l.questions.map((q) => q.id)).size).toBe(l.questions.length);
        for (const q of l.questions) {
          expect(q.options.length, q.id).toBeGreaterThanOrEqual(3);
          expect(q.options.length, q.id).toBeLessThanOrEqual(4);
          expect(q.answer, q.id).toBeGreaterThanOrEqual(0);
          expect(q.answer, q.id).toBeLessThan(q.options.length);
          expect(new Set(q.options).size, `${q.id}: duplicate options`).toBe(q.options.length);
          expect(q.explain.length, q.id).toBeGreaterThan(20);
        }
      });

      it("credits its sources with a license", () => {
        expect(l.sources.length).toBeGreaterThan(0);
        for (const s of l.sources) {
          expect(s.url, s.title).toMatch(/^https:\/\//);
          expect(s.license, s.title).toMatch(/^(MIT|CC BY 4\.0|CC BY-SA 4\.0|CC BY-NC-SA 4\.0|Original)$/);
        }
      });
    });
  }
});

describe("learn paths match the guided courses", () => {
  it("lists the same modules in the same order", () => {
    for (const p of guidedPaths) expect(pathById.get(p.path)?.steps.map((s) => s.module)).toEqual(pathModules(p));
  });
});
