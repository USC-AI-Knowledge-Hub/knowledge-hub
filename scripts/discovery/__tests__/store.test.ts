import { describe, expect, it } from "vitest";
import type { DiscoveredTool } from "../../../src/data/types";
import { toDiscoveredTool } from "../build-tool";
import { ACCEPT_SCORE, LIMITS, SOURCES } from "../sources";
import { applyMentions, daysBetween, promote, scoreOf } from "../store";
import { EMPTY_DISCOVERED, type FeedItem, type Mention, type Overrides, type Source } from "../types";

const TODAY = "2026-10-11";
const NO_OVERRIDES: Overrides = { blockNames: [], blockIds: [], alias: {}, blockCategories: [] };
const vendor: Source = { id: "v", name: "Vendor blog", url: "https://v.example/feed", tier: "vendor", maker: "Vendor Inc" };
const press: Source = { id: "p1", name: "Press one", url: "https://p1.example/feed", tier: "press" };
const press2: Source = { id: "p2", name: "Press two", url: "https://p2.example/feed", tier: "press" };
const launch: Source = { id: "l", name: "Launches", url: "https://l.example/feed", tier: "community", titles: "product" };

const item = (url: string, date = TODAY, summary = "A video generator for filmmakers."): FeedItem => ({ title: `Post ${url}`, link: url, date, summary, links: [] });
const mention = (name: string, source: Source, url = `https://x.example/${source.id}/${name}`, date = TODAY): Mention => ({
  name,
  key: name.toLowerCase(),
  kind: "tool",
  source,
  item: item(url, date),
});
const opts = (over: Partial<Parameters<typeof applyMentions>[2]> = {}) => ({ today: TODAY, videoCounts: new Map<string, number>(), reviewedIds: new Set<string>(), overrides: NO_OVERRIDES, ...over });
const listed = (over: Partial<DiscoveredTool> = {}): DiscoveredTool =>
  toDiscoveredTool({ id: "meshy", name: "Meshy", maker: "", url: "https://meshy.ai/", urlKind: "site", kind: "tool", bestFor: "3D.", tasks: [], evidence: [], firstSeen: "2026-06-01", lastSeen: "2026-09-30", ...over });

describe("how much evidence a product has", () => {
  it("counts each source once, at its tier's weight", () => {
    const p = (...ms: Mention[]) => ({ mentions: ms.map((m) => ({ source: m.source.name, title: "t", url: m.item.link, date: TODAY, sourceId: m.source.id, tier: m.source.tier })) });
    expect(scoreOf(p(mention("A", vendor)))).toBe(3);
    expect(scoreOf(p(mention("A", press), mention("A", press2)))).toBe(4);
    expect(scoreOf(p(mention("A", launch, "https://x/1"), mention("A", launch, "https://x/2")))).toBe(1);
    expect(scoreOf(p())).toBe(0);
  });

  it("is reached by one official announcement, or several lesser ones", () => {
    expect(ACCEPT_SCORE).toBe(3);
    expect(SOURCES.every((s) => ["vendor", "press", "community"].includes(s.tier))).toBe(true);
    expect(new Set(SOURCES.map((s) => s.id)).size).toBe(SOURCES.length);
  });
});

describe("a day's mentions", () => {
  it("makes a product with an official announcement ready to list", () => {
    const r = applyMentions(EMPTY_DISCOVERED, [mention("Veo", vendor)], opts());
    expect(r.ready.map((p) => p.key)).toEqual(["veo"]);
    expect(r.ready[0]).toMatchObject({ name: "Veo", maker: "Vendor Inc", firstSeen: TODAY });
    expect(r.ready[0].summary).toBe("A video generator for filmmakers.");
  });

  it("keeps a thinly evidenced product waiting, and lists it once more evidence arrives on a later day", () => {
    const day1 = applyMentions(EMPTY_DISCOVERED, [mention("Foo", launch, undefined, "2026-10-08")], opts({ today: "2026-10-08" }));
    expect(day1.ready).toEqual([]);
    expect(day1.file.pending).toHaveLength(1);
    const day3 = applyMentions(day1.file, [mention("Foo", press, undefined, "2026-10-10")], opts({ today: "2026-10-10" }));
    expect(day3.ready.map((p) => p.key)).toEqual(["foo"]);
    expect(day3.ready[0].firstSeen).toBe("2026-10-08");
    expect(day3.ready[0].mentions).toHaveLength(2);
  });

  it("forgets a product that never gets more evidence", () => {
    const day1 = applyMentions(EMPTY_DISCOVERED, [mention("Foo", launch, undefined, "2026-09-01")], opts({ today: "2026-09-01" }));
    const later = applyMentions(day1.file, [], opts({ today: "2026-10-11" }));
    expect(later.file.pending).toEqual([]);
  });

  it("adds new evidence to a tool that's already listed", () => {
    const file = { ...EMPTY_DISCOVERED, tools: [listed()] };
    const r = applyMentions(file, [mention("Meshy", press, "https://news.example/meshy-2", "2026-10-09")], opts());
    expect(r.file.tools[0].lastSeen).toBe("2026-10-09");
    expect(r.file.tools[0].evidence.map((e) => e.url)).toEqual(["https://news.example/meshy-2"]);
    expect(r.ready).toEqual([]);
    // The same post twice adds nothing.
    const again = applyMentions(r.file, [mention("Meshy", press, "https://news.example/meshy-2", "2026-10-09")], opts());
    expect(again.file.tools[0].evidence).toHaveLength(1);
  });

  it("ignores reviewed tools, blocked names and blocked ids", () => {
    const r = applyMentions(
      EMPTY_DISCOVERED,
      [mention("Runway", vendor), mention("Spam Tool", vendor), mention("Other", vendor)],
      opts({ reviewedIds: new Set(["runway"]), overrides: { ...NO_OVERRIDES, blockNames: ["spam tool"], blockIds: ["other"] } }),
    );
    expect(r.ready).toEqual([]);
    expect(r.file.pending).toEqual([]);
  });

  it("lists at most a few new tools a run, best evidence first", () => {
    const many = Array.from({ length: LIMITS.maxNewPerRun + 5 }, (_, i) => mention(`Tool${String.fromCharCode(97 + i)}`, i === 0 ? press : vendor));
    const r = applyMentions(EMPTY_DISCOVERED, many, opts());
    expect(r.ready).toHaveLength(LIMITS.maxNewPerRun);
    expect(r.file.pending.length).toBe(many.length);
  });

  it("promotes a product: it becomes a tool and stops waiting", () => {
    const waiting = applyMentions(EMPTY_DISCOVERED, [mention("Veo", vendor)], opts());
    const file = promote(waiting.file, listed({ id: "veo", name: "Veo" }), "veo");
    expect(file.tools.map((t) => t.id)).toEqual(["veo"]);
    expect(file.pending).toEqual([]);
  });
});

describe("retiring tools", () => {
  const old = (over: Partial<DiscoveredTool> = {}) => listed({ lastSeen: "2026-03-01", ...over });
  const run = (tools: DiscoveredTool[], videoCounts = new Map<string, number>()) => applyMentions({ ...EMPTY_DISCOVERED, tools }, [], opts({ videoCounts }));

  it("drops a tool nobody has mentioned for months and that has no videos", () => {
    const r = run([old()]);
    expect(r.file.tools).toEqual([]);
    expect(r.dropped.tools).toEqual(["meshy"]);
    expect(r.file.retired).toEqual([{ id: "meshy", on: TODAY }]);
  });

  it("keeps a quiet tool the library has several videos for, and refreshes one with any video", () => {
    expect(run([old()], new Map([["meshy", LIMITS.keepWithVideos]])).file.tools).toHaveLength(1);
    const one = run([old()], new Map([["meshy", 1]]));
    expect(one.file.tools[0].lastSeen).toBe(TODAY);
  });

  it("never drops a tool an editor added", () => {
    expect(run([old({ origin: "editor" })]).file.tools).toHaveLength(1);
  });

  it("keeps the catalog under its cap, dropping the quietest first", () => {
    const tools = Array.from({ length: LIMITS.maxTools + 3 }, (_, i) => listed({ id: `t${i}`, name: `Tool${i}`, lastSeen: `2026-10-${String(1 + (i % 10)).padStart(2, "0")}` }));
    const r = run(tools, new Map([["t0", 5]]));
    expect(r.file.tools).toHaveLength(LIMITS.maxTools);
    expect(r.file.tools.some((t) => t.id === "t0")).toBe(true);
    expect(r.dropped.tools).toHaveLength(3);
  });

  it("forgets retirements after a while", () => {
    const r = applyMentions({ ...EMPTY_DISCOVERED, retired: [{ id: "old", on: "2026-01-01" }, { id: "new", on: "2026-10-01" }] }, [], opts());
    expect(r.file.retired.map((x) => x.id)).toEqual(["new"]);
  });

  it("counts days", () => {
    expect(daysBetween("2026-10-01", "2026-10-11")).toBe(10);
  });
});
