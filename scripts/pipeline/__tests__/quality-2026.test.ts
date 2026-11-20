import { describe, expect, it } from "vitest";
import type { AutoTalk } from "../../../src/data/types";
import { CONTENT_SINCE, SETTINGS } from "../config";
import { mergeTalks } from "../merge";
import { qualityScore, rejectReason, talkRejectReason, type Candidate } from "../quality";
import { commentSentiment, scoreComments } from "../sentiment";

const now = new Date("2026-11-20T12:00:00Z");
const cand = (over: Partial<Candidate> = {}): Candidate => ({
  id: "x",
  title: "ChatGPT tutorial for beginners",
  description: "",
  channel: "Someone",
  channelId: "UC1",
  publishedAt: "2026-11-10T00:00:00Z",
  duration: 900,
  views: 20000,
  likes: 600,
  ...over,
});

describe("the 2026 cutoff", () => {
  it("is the start of 2026", () => expect(CONTENT_SINCE).toBe("2026-01-01"));
  it("rejects anything published before it, even on the evergreen path", () => {
    expect(rejectReason(cand({ publishedAt: "2025-12-31T23:00:00Z" }), now, { evergreen: true })).toBe("before 2026");
    expect(rejectReason(cand({ publishedAt: "2026-01-01T00:00:00Z", views: 900 }), now, { evergreen: true })).toBeNull();
  });
});

describe("views and likes", () => {
  it("drops videos with few likes for their views, once there are enough views to tell", () => {
    expect(rejectReason(cand({ views: 50000, likes: 100 }), now)).toBe("few likes");
    expect(rejectReason(cand({ views: 50000, likes: 300 }), now)).toBeNull();
    expect(rejectReason(cand({ views: 1500, likes: 1, publishedAt: "2026-11-19T00:00:00Z" }), now)).toBeNull();
    expect(rejectReason(cand({ views: 50000, likes: undefined }), now)).toBeNull();
    expect(SETTINGS.minLikeRatio).toBeGreaterThan(0);
  });
});

describe("comment sentiment", () => {
  it("reads one comment's leaning", () => {
    expect(commentSentiment("Thank you, this was so helpful!")).toBe(1);
    expect(commentSentiment("Clickbait. Waste of time.")).toBe(-1);
    expect(commentSentiment("Doesn't work anymore")).toBe(-1);
    expect(commentSentiment("Not helpful at all")).toBe(-1);
    expect(commentSentiment("What mic do you use?")).toBe(0);
    expect(commentSentiment("Great explanation but the code is wrong at 5:00")).toBe(0);
    expect(commentSentiment("the class assessment was great")).toBe(1);
  });

  it("averages the comments read", () => {
    expect(scoreComments(["Thanks!", "Very helpful", "first", "Useless"])).toEqual({ score: 0.25, n: 4 });
    expect(scoreComments([])).toEqual({ score: 0, n: 0 });
  });

  it("drops videos whose comments lean negative, on enough comments", () => {
    expect(rejectReason(cand({ sentiment: -0.4, comments: 20 }), now)).toBe("negative comments");
    expect(rejectReason(cand({ sentiment: -0.4, comments: 3 }), now)).toBeNull();
    expect(rejectReason(cand({ sentiment: 0.1, comments: 20 }), now)).toBeNull();
  });

  it("lifts well-received videos in the ranking", () => {
    expect(qualityScore(cand({ sentiment: 0.8, comments: 20 }), now)).toBeGreaterThan(qualityScore(cand(), now));
    expect(qualityScore(cand({ sentiment: -0.1, comments: 20 }), now)).toBeLessThan(qualityScore(cand(), now));
    expect(qualityScore(cand({ sentiment: 0.8, comments: 2 }), now)).toBe(qualityScore(cand(), now));
  });
});

describe("talks and podcasts", () => {
  const talk = (over: Partial<Candidate> = {}) =>
    cand({ title: "The future of AI agents | Dwarkesh Podcast", duration: 3600, views: 80000, likes: 3000, ...over });

  it("keeps long, recent, well-received AI talks", () => expect(talkRejectReason(talk(), now)).toBeNull());
  it("says why the rest are left out", () => {
    expect(talkRejectReason(talk({ publishedAt: "2025-06-01T00:00:00Z" }), now)).toBe("before 2026");
    expect(talkRejectReason(talk({ duration: 120 }), now)).toBe("clip, not a talk");
    expect(talkRejectReason(talk({ title: "The best pasta recipe", description: "Cooking at home" }), now)).toBe("not about AI");
    expect(talkRejectReason(talk({ title: "What happens next", description: "We talk about artificial general intelligence and LLMs." }), now)).toBeNull();
    expect(talkRejectReason(talk({ views: 1200, publishedAt: "2026-10-01T00:00:00Z" }), now)).toBe("too few views");
    expect(talkRejectReason(talk({ views: 1200, publishedAt: "2026-11-18T00:00:00Z" }), now)).toBeNull();
    expect(talkRejectReason(talk({ likes: 50 }), now)).toBe("few likes");
    expect(talkRejectReason(talk({ sentiment: -0.5, comments: 20 }), now)).toBe("negative comments");
  });

  it("keeps the best per channel, drops anything before the cutoff, newest first", () => {
    const t = (id: string, over: Partial<AutoTalk> = {}): AutoTalk => ({
      id, title: id, channel: "c", channelId: "UC1", publishedAt: "2026-05-01T00:00:00Z", duration: 3600, views: 1e5, kind: "podcast", score: 50, firstSeen: "2026-11-01", ...over,
    });
    const many = Array.from({ length: 12 }, (_, i) => t(`a${i}`, { score: i, publishedAt: `2026-0${(i % 9) + 1}-01T00:00:00Z` }));
    const out = mergeTalks([t("old", { publishedAt: "2025-12-01T00:00:00Z", score: 99 })], [...many, t("b", { channelId: "UC2", publishedAt: "2026-11-01T00:00:00Z" })]);
    expect(out.find((x) => x.id === "old")).toBeUndefined();
    expect(out.filter((x) => x.channelId === "UC1")).toHaveLength(8);
    expect(out[0].id).toBe("b");
  });

  it("keeps when a talk was first seen", () => {
    const first = mergeTalks([], [{ id: "x", title: "x", channel: "c", channelId: "UC1", publishedAt: "2026-05-01T00:00:00Z", duration: 3600, views: 1, kind: "talk", score: 1, firstSeen: "2026-06-01" }]);
    const again = mergeTalks(first, [{ ...first[0], views: 99, firstSeen: "2026-11-20" }]);
    expect(again[0]).toMatchObject({ views: 99, firstSeen: "2026-06-01" });
  });
});
