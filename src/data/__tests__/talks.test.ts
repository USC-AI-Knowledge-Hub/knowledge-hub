import { describe, expect, it } from "vitest";
import { liveTalk } from "../../lib/courses";
import { courses } from "../courses";
import { modules } from "../learn";
import { TALK_KINDS, talks, talksFor } from "../talks";
import type { CourseStatus } from "../types";

const moduleIds = new Set(modules.map((m) => m.id));

describe("talks catalog", () => {
  it("has unique IDs and exactly one well-formed YouTube source per talk", () => {
    expect(new Set(talks.map((t) => t.id)).size).toBe(talks.length);
    const sources = talks.map((t) => t.video ?? t.playlist);
    expect(new Set(sources).size, "a video appears twice").toBe(talks.length);
    for (const t of talks) {
      expect(t.id, t.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(Boolean(t.video) !== Boolean(t.playlist), t.id).toBe(true);
      if (t.video) expect(t.video, t.id).toMatch(/^[\w-]{11}$/);
      if (t.playlist) expect(t.playlist, t.id).toMatch(/^PL[\w-]{16,40}$/);
    }
  });

  it("links only to real modules", () => {
    for (const t of talks) {
      expect(t.modules.length, t.id).toBeGreaterThan(0);
      for (const m of t.modules) expect(moduleIds.has(m), `${t.id} → ${m}`).toBe(true);
    }
  });

  it("fills every field and keeps summaries to one plain sentence", () => {
    for (const t of talks) {
      expect(TALK_KINDS, t.id).toContain(t.kind);
      expect(t.channel.trim(), t.id).not.toBe("");
      expect(t.speakers.length, t.id).toBeGreaterThan(0);
      expect(t.year, t.id).toBeGreaterThanOrEqual(2010);
      expect(t.minutes, t.id).toBeGreaterThan(0);
      expect(t.tags.length, t.id).toBeGreaterThan(0);
      expect(t.summary, t.id).toMatch(/^[A-Z"].*\.$/);
      expect(t.summary, t.id).not.toMatch(/!/);
    }
  });

  it("covers every kind and stays a curated size", () => {
    expect(talks.length).toBeGreaterThanOrEqual(25);
    expect(talks.length).toBeLessThanOrEqual(40);
    for (const k of TALK_KINDS) expect(talks.some((t) => t.kind === k), k).toBe(true);
  });

  it("doesn't repeat a course or an editors' pick", () => {
    const taken = new Set([...courses.map((c) => c.video), ...modules.flatMap((m) => m.curated.map((v) => v.id))]);
    for (const t of talks) expect(taken.has(t.video), t.id).toBe(false);
  });

  it("finds talks for a module", () => {
    expect(talksFor("ethics-integrity").length).toBeGreaterThan(0);
    expect(talksFor("no-such-module")).toEqual([]);
  });
});

describe("liveTalk", () => {
  const t = talks[0];
  const status = (check: CourseStatus["curated"][string]): CourseStatus => ({
    generatedAt: "",
    via: "api",
    courses: {},
    curated: {},
    talks: { [t.id]: check },
  });

  it("counts unchecked talks, and status files from before talks, as available", () => {
    expect(liveTalk(t, null).available).toBe(true);
    expect(liveTalk(t, { generatedAt: "", via: "oembed", courses: {}, curated: {} }).available).toBe(true);
  });

  it("hides talks the check found gone and uses the live length", () => {
    expect(liveTalk(t, status({ ok: false, problem: "not found" })).available).toBe(false);
    expect(liveTalk(t, status({ ok: true, seconds: 1234 })).minutes).toBe(21);
    expect(liveTalk(t, status({ ok: true })).minutes).toBe(t.minutes);
  });
});
