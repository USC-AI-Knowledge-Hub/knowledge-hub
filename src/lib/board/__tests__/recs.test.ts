import { describe, expect, it } from "vitest";
import { decodeRec, encodeRec, leaders, rankRecs, recProblem, recsFrom, thumbUrl, youtubeId, type Rec } from "../recs";
import type { Post } from "../store";

const ID = "dQw4w9WgXcQ";

describe("youtubeId", () => {
  it.each([
    [`https://www.youtube.com/watch?v=${ID}`],
    [`https://youtube.com/watch?v=${ID}&t=42s&list=PL123`],
    [`https://m.youtube.com/watch?v=${ID}`],
    [`https://youtu.be/${ID}?si=abc`],
    [`youtu.be/${ID}`],
    [`https://www.youtube.com/shorts/${ID}`],
    [`https://www.youtube.com/embed/${ID}`],
    [`https://www.youtube.com/live/${ID}?feature=share`],
    [`https://www.youtube-nocookie.com/embed/${ID}`],
    [`  https://www.youtube.com/watch?v=${ID}  `],
  ])("reads %s", (url) => expect(youtubeId(url)).toBe(ID));

  it.each([
    ["https://vimeo.com/123"],
    [`https://evil.example/watch?v=${ID}`],
    [`https://youtube.com.evil.example/watch?v=${ID}`],
    ["https://www.youtube.com/watch?v=short"],
    ["https://www.youtube.com/watch?v=<script>alert</s"],
    ["https://www.youtube.com/@channel"],
    ["not a link"],
    [""],
  ])("rejects %s", (url) => expect(youtubeId(url)).toBe(""));
});

describe("encode and decode", () => {
  it("round-trips a pick, with and without a note", () => {
    const r = {
      headline: "The clearest intro to transformers",
      videoId: ID,
      why: "Watch the first 10 minutes.\nThen the demo.",
    };
    expect(decodeRec(encodeRec(r))).toEqual(r);
    expect(decodeRec(encodeRec({ ...r, why: "  " }))).toEqual({
      ...r,
      why: "",
    });
    expect(encodeRec({ ...r, why: "" })).toBe(`The clearest intro to transformers\nhttps://www.youtube.com/watch?v=${ID}`);
  });

  it("keeps the headline on one line", () => {
    expect(decodeRec(encodeRec({ headline: "Two\nlines", videoId: ID, why: "" }))?.headline).toBe("Two lines");
  });

  it("ignores bodies that aren't picks and trims long ones", () => {
    expect(decodeRec("just a comment")).toBeNull();
    expect(decodeRec(`Headline\nhttps://example.com/x`)).toBeNull();
    expect(decodeRec(`\nhttps://youtu.be/${ID}`)).toBeNull();
    const long = decodeRec(`${"h".repeat(200)}\nhttps://youtu.be/${ID}\n\n${"w".repeat(900)}`);
    expect(long?.headline).toHaveLength(90);
    expect(long?.why).toHaveLength(400);
  });

  it("builds the thumbnail from the id only", () => {
    expect(thumbUrl(ID)).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
  });
});

describe("recProblem", () => {
  const ok = ["Ana", `https://youtu.be/${ID}`, "Best 5-minute RAG explainer", ""] as const;
  it("accepts a good pick", () => expect(recProblem(...ok)).toBe(""));
  it("says what's missing or wrong", () => {
    expect(recProblem("", ok[1], ok[2], "")).toMatch(/name/);
    expect(recProblem("www.spam.com", ok[1], ok[2], "")).toMatch(/links/);
    expect(recProblem(ok[0], "", ok[2], "")).toMatch(/YouTube link/);
    expect(recProblem(ok[0], "https://vimeo.com/1", ok[2], "")).toMatch(/isn't a YouTube/);
    expect(recProblem(ok[0], ok[1], "  ", "")).toMatch(/headline/);
    expect(recProblem(ok[0], ok[1], "x".repeat(91), "")).toMatch(/1 over/);
    expect(recProblem(ok[0], ok[1], "see https://x.com", "")).toMatch(/video box/);
    expect(recProblem(ok[0], ok[1], ok[2], "w".repeat(401))).toMatch(/note/);
    expect(recProblem(ok[0], ok[1], ok[2], "more at www.x.com")).toMatch(/Leave links/);
  });
});

const post = (over: Partial<Post>): Post => ({
  id: "p",
  board: "video-recs",
  topic: "found",
  parentId: null,
  name: "Ana",
  body: encodeRec({ headline: "Good one", videoId: ID, why: "" }),
  createdAt: "2026-11-01T00:00:00Z",
  editedAt: null,
  deleted: false,
  reactions: {},
  ...over,
});

describe("recsFrom", () => {
  it("keeps picks and counts only the vote reaction", () => {
    const recs = recsFrom([
      post({ id: "a", reactions: { "👍": 3, "❤️": 9 } }),
      post({ id: "b", topic: "hub" }),
      post({ id: "reply", parentId: "a" }),
      post({ id: "gone", deleted: true }),
      post({ id: "other-topic", topic: "questions" }),
      post({ id: "not-a-pick", body: "hello" }),
    ]);
    expect(recs.map((r) => [r.id, r.source, r.votes])).toEqual([
      ["a", "found", 3],
      ["b", "hub", 0],
    ]);
  });
});

const rec = (id: string, votes: number, createdAt: string, name = "Ana"): Rec => ({
  id,
  votes,
  createdAt,
  name,
  headline: id,
  videoId: ID,
  why: "",
  source: "found",
  editedAt: null,
});

describe("rankRecs", () => {
  const now = new Date("2026-11-10T00:00:00Z").getTime();
  const list = [
    rec("old-top", 9, "2026-10-01T00:00:00Z"),
    rec("new-low", 1, "2026-11-09T00:00:00Z"),
    rec("new-mid", 4, "2026-11-08T00:00:00Z"),
    rec("tie-newer", 4, "2026-11-09T12:00:00Z"),
  ];
  it("ranks by votes, newer first on a tie", () => expect(rankRecs(list, "top", now).map((r) => r.id)).toEqual(["old-top", "tie-newer", "new-mid", "new-low"]));
  it("ranks only the last week for this week", () => expect(rankRecs(list, "week", now).map((r) => r.id)).toEqual(["tie-newer", "new-mid", "new-low"]));
  it("lists newest first", () => expect(rankRecs(list, "new", now).map((r) => r.id)).toEqual(["tie-newer", "new-low", "new-mid", "old-top"]));
  it("doesn't change the list it was given", () => {
    const copy = [...list];
    rankRecs(list, "top", now);
    expect(list).toEqual(copy);
  });
});

describe("leaders", () => {
  it("adds up votes per person, ignoring case, and leaves out people with none", () => {
    const out = leaders([rec("1", 3, "x", "Ana"), rec("2", 2, "x", "ana "), rec("3", 4, "x", "Ben"), rec("4", 0, "x", "Cy")]);
    expect(out).toEqual([
      { name: "Ana", votes: 5, picks: 2 },
      { name: "Ben", votes: 4, picks: 1 },
    ]);
  });
});
