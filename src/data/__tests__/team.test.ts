import { describe, expect, it } from "vitest";
import { BOARDS, BUCKETS, COURSE_BOARDS, COURSE_TOPICS, TOOLS_BOARD, TOOL_TOPICS, boardFor } from "../team";

describe("AI Team boards", () => {
  it("has a board for each of the 15 courses in the three buckets, and one for tools", () => {
    expect(BUCKETS.map((b) => b.id)).toEqual([1, 2, 3]);
    expect(BUCKETS.map((b) => COURSE_BOARDS.filter((c) => c.bucket === b.id).length)).toEqual([4, 6, 5]);
    expect(BOARDS).toHaveLength(16);
    expect(TOOLS_BOARD.kind).toBe("tools");
  });

  it("gives every board a safe, unique id the database will accept", () => {
    const ids = BOARDS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]{1,40}$/);
    for (const t of [...COURSE_TOPICS, ...TOOL_TOPICS]) expect(t.id).toMatch(/^[a-z0-9-]{1,40}$/);
  });

  it("links every course to its own page over https", () => {
    for (const c of COURSE_BOARDS) {
      expect(c.url?.startsWith("https://")).toBe(true);
      expect(c.provider).toBeTruthy();
      expect(c.topics).toBe(COURSE_TOPICS);
    }
    expect(new Set(COURSE_BOARDS.map((c) => c.url)).size).toBe(COURSE_BOARDS.length);
  });

  it("finds a board from an address value", () => {
    expect(boardFor("claude-101")?.title).toBe("Claude 101");
    expect(boardFor("nope")).toBeNull();
    expect(boardFor(null)).toBeNull();
  });
});
