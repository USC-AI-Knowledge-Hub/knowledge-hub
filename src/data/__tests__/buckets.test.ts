import { describe, expect, it } from "vitest";
import { BUCKETS, BUCKET_COURSES, SELF_RATING, coursesIn, placeFor, type Answers } from "../buckets";
import { COURSE_BOARDS } from "../team";
import { parse } from "../../lib/bucketProgress";

const answers = (weekly: string, prompting: string, critical: string, advanced: string) => ({ weekly, prompting, critical, advanced }) as Answers;

describe("the buckets", () => {
  it("has 15 courses in the three buckets, each linked over https, and a board for each", () => {
    expect(BUCKETS.map((b) => coursesIn(b.id).length)).toEqual([4, 6, 5]);
    expect(BUCKET_COURSES).toHaveLength(15);
    expect(BUCKET_COURSES.every((c) => c.url.startsWith("https://") && c.provider && c.title)).toBe(true);
    expect(new Set(BUCKET_COURSES.map((c) => c.id)).size).toBe(15);
    expect(COURSE_BOARDS.map((b) => b.id).sort()).toEqual(BUCKET_COURSES.map((c) => c.id).sort());
  });
});

describe("where to start", () => {
  it("waits until every question is answered", () => {
    expect(placeFor({})).toBeNull();
    expect(placeFor({ weekly: "yes", prompting: "yes", critical: "yes" })).toBeNull();
    expect(SELF_RATING).toHaveLength(4);
  });

  it("starts at Bucket 1 without weekly use, whatever else is said", () => {
    expect(placeFor(answers("no", "yes", "yes", "yes"))?.bucket).toBe(1);
    expect(placeFor(answers("unsure", "yes", "yes", "yes"))?.bucket).toBe(1);
  });

  it("starts at Bucket 2 with weekly use but no advanced work", () => {
    expect(placeFor(answers("yes", "no", "no", "no"))?.bucket).toBe(2);
    expect(placeFor(answers("yes", "yes", "yes", "no"))?.bucket).toBe(2);
  });

  it("needs advanced work plus careful prompting or checking for Bucket 3", () => {
    expect(placeFor(answers("yes", "yes", "no", "yes"))?.bucket).toBe(3);
    expect(placeFor(answers("yes", "no", "yes", "yes"))?.bucket).toBe(3);
    expect(placeFor(answers("yes", "no", "no", "yes"))?.bucket).toBe(2);
  });

  it("treats not sure as no, so a doubtful answer starts lower", () => {
    expect(placeFor(answers("yes", "unsure", "unsure", "yes"))?.bucket).toBe(2);
    expect(placeFor(answers("yes", "yes", "unsure", "unsure"))?.bucket).toBe(2);
  });
});

describe("saved progress", () => {
  it("reads what was saved and drops anything it doesn't recognise", () => {
    expect(parse(null)).toEqual({ bucket: null, done: [] });
    expect(parse("not json")).toEqual({ bucket: null, done: [] });
    expect(parse(JSON.stringify({ bucket: 2, done: ["claude-101", "claude-101", "gone", 7] }))).toEqual({ bucket: 2, done: ["claude-101"] });
    expect(parse(JSON.stringify({ bucket: 9, done: "x" }))).toEqual({ bucket: null, done: [] });
  });
});
