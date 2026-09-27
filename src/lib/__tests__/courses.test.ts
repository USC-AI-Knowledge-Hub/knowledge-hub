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
    const c = live(courseById.get("stanford-cs336")!, status("stanford-cs336", 17, 80_280));
    expect(c).toMatchObject({ lessons: 17, hours: 22.3, available: true });
  });
  it("keeps one year's numbers for a rolling playlist", () => {
    const mit = courseById.get("mit-6s191")!;
    const c = live(mit, status("mit-6s191", 90, 263_880));
    expect(c).toMatchObject({ lessons: mit.lessons, hours: mit.hours });
  });
  it("hides a course the check found missing", () => {
    const c = live(courseById.get("cs50-ai")!, { ...status("x", 0, 0), courses: { "cs50-ai": { ok: false, problem: "gone" } } });
    expect(c.available).toBe(false);
  });
});
