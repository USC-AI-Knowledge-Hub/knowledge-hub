import { describe, expect, it } from "vitest";
import { courses, coursesFor } from "../courses";
import { modules } from "../learn";
import { toolById, tools } from "../tools";

const moduleIds = new Set(modules.map((m) => m.id));

describe("course catalog", () => {
  it("has unique IDs and exactly one YouTube source per course", () => {
    expect(new Set(courses.map((c) => c.id)).size).toBe(courses.length);
    for (const c of courses) {
      expect(Boolean(c.playlist) !== Boolean(c.video), c.id).toBe(true);
      if (c.playlist) expect(c.playlist, c.id).toMatch(/^PL[\w-]{16,40}$/);
      if (c.video) expect(c.video, c.id).toMatch(/^[\w-]{11}$/);
      if (c.cover) expect(c.cover, c.id).toMatch(/^[\w-]{11}$/);
    }
  });

  it("only points at real modules and tools", () => {
    for (const c of courses) {
      expect(c.modules.length, c.id).toBeGreaterThan(0);
      for (const m of c.modules) expect(moduleIds.has(m), `${c.id} → ${m}`).toBe(true);
      for (const t of c.tools ?? []) expect(toolById.has(t), `${c.id} → ${t}`).toBe(true);
    }
  });

  it("gives every module at least two full courses", () => {
    for (const m of modules) expect(coursesFor(m.id).length, m.id).toBeGreaterThanOrEqual(2);
  });

  it("doesn't repeat a course as an editors' pick", () => {
    const courseVideos = new Set(courses.map((c) => c.video).filter(Boolean));
    for (const m of modules) for (const v of m.curated) expect(courseVideos.has(v.id), `${m.id}: ${v.id}`).toBe(false);
  });
});

describe("tool catalog", () => {
  it("has unique IDs and valid match patterns", () => {
    expect(new Set(tools.map((t) => t.id)).size).toBe(tools.length);
    for (const t of tools) for (const p of [...t.match, ...(t.exclude ?? [])]) expect(() => new RegExp(p, "i"), `${t.id}: ${p}`).not.toThrow();
  });

  it("every tool a module mentions exists", () => {
    for (const m of modules) for (const t of m.tools) expect(toolById.has(t), `${m.id} → ${t}`).toBe(true);
  });
});
