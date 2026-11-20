import { describe, expect, it } from "vitest";
import { courseById } from "../../data/courses";
import type { CourseStatus } from "../../data/types";
import { live } from "../courses";

const status = (id: string, lessons: number, seconds: number): CourseStatus => ({
  generatedAt: "2026-09-27T00:00:00Z",
  via: "api",
  courses: { [id]: { ok: true, lessons, seconds } },
  curated: {},
});

describe("live course numbers", () => {
  it("uses the daily check's lesson count and hours", () => {
    const c = live(courseById.get("stanford-cs25")!, status("stanford-cs25", 17, 80_280));
    expect(c).toMatchObject({ lessons: 17, hours: 22.3, available: true });
  });
  it("keeps one year's numbers for a rolling playlist", () => {
    const mit = courseById.get("mit-6s191")!;
    const c = live(mit, status("mit-6s191", 90, 263_880));
    expect(c).toMatchObject({ lessons: mit.lessons, hours: mit.hours });
  });
  it("hides a course whose newest lesson is from before 2026", () => {
    const old = status("n8n-beginner", 5, 9000);
    old.courses["n8n-beginner"].published = "2025-06-01";
    expect(live(courseById.get("n8n-beginner")!, old).available).toBe(false);
    old.courses["n8n-beginner"].published = "2026-02-01";
    expect(live(courseById.get("n8n-beginner")!, old).available).toBe(true);
  });
  it("hides a course the check found missing", () => {
    const c = live(courseById.get("n8n-beginner")!, { ...status("x", 0, 0), courses: { "n8n-beginner": { ok: false, problem: "gone" } } });
    expect(c.available).toBe(false);
  });
});
