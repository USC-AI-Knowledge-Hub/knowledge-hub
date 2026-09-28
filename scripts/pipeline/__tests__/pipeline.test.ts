import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Trend, Video } from "../../../src/data/types";
import { tools } from "../../../src/data/tools";
import { SETTINGS, TOPIC_QUERIES, TREND_QUERIES } from "../config";
import { guessDifficulty } from "../difficulty";
import { parseIsoDuration } from "../duration";
import { mergeFeed, mergeTrends } from "../merge";
import { hypeLevel, looksEducational, mentionsAI, qualityScore, rejectReason, trendKind, type Candidate } from "../quality";
import { parseFeed } from "../rss";
import { todaysQueries } from "../rotation";
import { tagTools, tagTopics } from "../tagging";

const now = new Date("2026-09-26T12:00:00Z");

const cand = (over: Partial<Candidate> = {}): Candidate => ({
  id: "x",
  title: "ChatGPT tutorial",
  description: "",
  channel: "Someone",
  channelId: "UC1",
  publishedAt: "2026-09-20T00:00:00Z",
  duration: 600,
  views: 20000,
  likes: 800,
  ...over,
});

describe("parseIsoDuration", () => {
  it.each([
    ["PT15M33S", 933],
    ["PT1H2M3S", 3723],
    ["PT45S", 45],
    ["P1DT1H", 90000],
    ["P0D", 0],
    ["garbage", 0],
    [undefined, 0],
  ])("%s → %d", (iso, secs) => expect(parseIsoDuration(iso as string)).toBe(secs));
});

describe("tagTools", () => {
  it("doesn't treat the company name as its chatbot", () => {
    expect(tagTools("Inside Anthropic's molecular biology lab")).toEqual([]);
    expect(tagTools("How OpenAI hacked HuggingFace")).toEqual([]);
  });
  it("finds a tool named in the title", () => {
    expect(tagTools("How to use NotebookLM to study")).toEqual(["notebooklm"]);
  });
  it("keeps Claude Code separate from Claude", () => {
    expect(tagTools("Claude Code full course")).toEqual(["claude-code"]);
  });
  it("still tags Claude when named alongside Claude Code", () => {
    expect(tagTools("Claude vs Claude Code: which should you use?").sort()).toEqual(["claude", "claude-code"]);
  });
  it("keeps GitHub Copilot and Microsoft Copilot apart", () => {
    expect(tagTools("GitHub Copilot agent mode tutorial")).toEqual(["github-copilot"]);
    expect(tagTools("Copilot in Excel: 10 tips")).toEqual(["copilot"]);
  });
  it("ignores ambiguous words that aren't tools", () => {
    expect(tagTools("Fashion runway highlights")).toEqual([]);
    expect(tagTools("Move your mouse cursor faster")).toEqual([]);
  });
  it("uses a description-only mention as a weak fallback", () => {
    expect(tagTools("My study routine", "I use NotebookLM and ChatGPT")).toHaveLength(1);
  });
});

describe("tagTopics", () => {
  it("tags learning topics", () => {
    expect(tagTopics("Build a RAG agent with MCP")).toEqual(expect.arrayContaining(["rag", "agents"]));
    expect(tagTopics("Prompt engineering for beginners")).toContain("prompting");
  });
});

describe("guessDifficulty", () => {
  it("reads beginner signals", () => {
    expect(guessDifficulty({ title: "ChatGPT for Complete Beginners", tools: ["chatgpt"] }).difficulty).toBe("beginner");
  });
  it("reads intermediate signals", () => {
    expect(guessDifficulty({ title: "10 ChatGPT tips power users swear by", tools: ["chatgpt"] }).difficulty).toBe("intermediate");
  });
  it("reads advanced signals", () => {
    expect(guessDifficulty({ title: "Build a RAG pipeline with the Claude API in Python", tools: ["claude"] }).difficulty).toBe("advanced");
  });
  it("falls back to the tool's own level", () => {
    expect(guessDifficulty({ title: "Claude Code", tools: ["claude-code"] }).difficulty).toBe("advanced");
    expect(guessDifficulty({ title: "Gamma", tools: ["gamma"] }).difficulty).toBe("beginner");
  });
});

describe("quality", () => {
  it("rejects shorts, clickbait, and low-view uploads", () => {
    expect(rejectReason(cand({ duration: 45 }), now)).toBe("too short");
    expect(rejectReason(cand({ title: "Quick tip #shorts" }), now)).toBe("short");
    expect(rejectReason(cand({ short: true, duration: 0 }), now)).toBe("short");
    expect(rejectReason(cand({ title: "This INSANE ChatGPT hack is a GAME CHANGER" }), now)).toBe("clickbait");
    expect(rejectReason(cand({ views: 300, publishedAt: "2026-09-01T00:00:00Z" }), now)).toBe("too few views");
    expect(rejectReason(cand({ language: "es" }), now)).toBe("not English");
  });
  it("rejects entertainment and old uploads, but leaves news for the trends feed", () => {
    expect(rejectReason(cand({ title: "Official trailer: The AI Movie" }), now)).toBe("entertainment");
    expect(rejectReason(cand({ title: "Engineer reacts to AI code" }), now)).toBe("entertainment");
    expect(rejectReason(cand({ title: "AI News: Opus 5.5, GPT-6 and more" }), now)).toBeNull();
    expect(rejectReason(cand({ publishedAt: "2026-05-01T00:00:00Z" }), now)).toBe("too old");
  });
  it("recognizes lesson-like titles", () => {
    expect(looksEducational("Use ChatGPT Work to build dashboards")).toBe(true);
    expect(looksEducational("Claude Cowork: Top 5 Tips for Productivity")).toBe(true);
    expect(looksEducational("Tough dexterity tasks with Gemini Robotics 2")).toBe(false);
    expect(looksEducational("I Never Thought I'd See This Happen")).toBe(false);
  });
  it("requires AI in the title for tool-less videos", () => {
    expect(mentionsAI("How to move AI from code completion to agentic workflows")).toBe(true);
    expect(mentionsAI("Excel Formulas & Functions – Full Course")).toBe(false);
    expect(mentionsAI("TimescaleDB Course – PostgreSQL for Time-Series Data")).toBe(false);
  });
  it("lets trusted channels through with few views", () => {
    expect(rejectReason(cand({ views: 50, trusted: true }), now)).toBeNull();
  });
  it("detects hype", () => {
    expect(hypeLevel("Learn NotebookLM in 10 minutes")).toBe(0);
    expect(hypeLevel("This is INSANE 🤯")).toBeGreaterThanOrEqual(2);
  });
  it("prefers teaching over hype at similar reach", () => {
    const teach = qualityScore(cand({ title: "ChatGPT tutorial: a step-by-step guide" }), now);
    const hype = qualityScore(cand({ title: "ChatGPT is dead" }), now);
    expect(teach).toBeGreaterThan(hype);
    expect(teach).toBeLessThanOrEqual(100);
  });
});

describe("parseFeed", () => {
  it("parses entries and flags shorts", () => {
    const items = parseFeed(readFileSync(new URL("../fixtures/feed.xml", import.meta.url), "utf8"));
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ id: "abc123def45", title: "NotebookLM Tutorial for Beginners", views: 45000, likes: 1200, short: false });
    expect(items[1].short).toBe(true);
  });
});

describe("mergeFeed", () => {
  const v = (over: Partial<Video>): Video => ({
    id: "a",
    title: "t",
    channel: "c",
    channelId: "UC",
    publishedAt: "2026-09-20T00:00:00Z",
    duration: 600,
    views: 1,
    tools: ["chatgpt"],
    topics: [],
    difficulty: "beginner",
    difficultySource: "heuristic",
    score: 50,
    firstSeen: "2026-09-20",
    ...over,
  });

  it("keeps firstSeen and Claude labels while refreshing stats", () => {
    const old = v({ difficulty: "advanced", difficultySource: "claude", summary: "S" });
    const [merged] = mergeFeed([old], [v({ views: 99, score: 70, firstSeen: "2026-09-26" })], "2026-09-26");
    expect(merged).toMatchObject({ views: 99, score: 70, firstSeen: "2026-09-20", difficulty: "advanced", summary: "S" });
  });

  it("ages out old videos", () => {
    expect(mergeFeed([v({ firstSeen: "2026-01-01" })], [], "2026-09-26")).toHaveLength(0);
  });

  it("caps each tool × difficulty cell by score", () => {
    const many = Array.from({ length: 30 }, (_, i) => v({ id: `v${i}`, score: i }));
    const out = mergeFeed([], many, "2026-09-26");
    expect(out).toHaveLength(15);
    expect(Math.min(...out.map((x) => x.score))).toBe(15);
  });
});

describe("todaysQueries", () => {
  const qs = Array.from({ length: 10 }, (_, i) => `q${i}`);
  it("returns everything when under budget", () => {
    expect(todaysQueries(qs, now, 20)).toEqual(qs);
  });
  it("caps the count and covers every query within a few days", () => {
    const seen = new Set<string>();
    for (let d = 0; d < 3; d++) {
      const today = todaysQueries(qs, new Date(now.getTime() + d * 86_400_000), 4);
      expect(today).toHaveLength(4);
      today.forEach((q) => seen.add(q));
    }
    expect(seen.size).toBe(10);
  });
});

describe("tagTools for research and creative tools", () => {
  it("tags the new tools by name", () => {
    expect(tagTools("SciSpace tutorial for literature reviews")).toEqual(["scispace"]);
    expect(tagTools("How to use Consensus AI for research")).toContain("consensus");
    expect(tagTools("ResearchRabbit in 10 minutes")).toEqual(["researchrabbit"]);
    expect(tagTools("Edit a podcast in Descript")).toEqual(["descript"]);
  });
  it("doesn't fire on ordinary words", () => {
    expect(tagTools("Reaching consensus in group projects")).toEqual([]);
    expect(tagTools("Read the video description")).toEqual([]);
  });
});

describe("trendKind", () => {
  it("sorts news, launches, research and talks", () => {
    expect(trendKind("AI News: Opus 5.5, GPT-6 and more")).toBe("news");
    expect(trendKind("Introducing Claude Fable 5.1")).toBe("launch");
    expect(trendKind("OpenAI DevDay keynote")).toBe("talk");
    expect(trendKind("Inside a Hackathon [Full Documentary]")).toBe("talk");
    expect(trendKind("This new paper lets robots copy human moves")).toBe("research");
    expect(trendKind("Researchers built an AI that predicts protein shapes")).toBe("research");
  });
  it("leaves lessons alone", () => {
    expect(trendKind("ChatGPT tutorial for beginners")).toBeNull();
    expect(trendKind("How to use NotebookLM for exam prep")).toBeNull();
    expect(trendKind("Gemini Deep Research Explained in 8 Minutes")).toBeNull();
    expect(trendKind("Gemini NotebookLM Tutorial: Turn Your Notes Into an AI Podcast (2026)")).toBeNull();
    expect(trendKind("How to use the new model launched this week")).toBeNull();
    expect(trendKind("n8n AI Agent Tutorial: Build a Research Agent With Tools")).toBeNull();
  });
  it("treats debates, panels, episodes, conferences and summits as talks", () => {
    expect(trendKind("Is AI an existential threat? A debate")).toBe("talk");
    expect(trendKind("Munk Debate on Artificial Intelligence")).toBe("talk");
    expect(trendKind("AI and the future of work: a panel of economists")).toBe("talk");
    expect(trendKind("Ep. 142: Where reasoning models go next")).toBe("talk");
    expect(trendKind("Full episode: scaling laws with a DeepMind researcher")).toBe("talk");
    expect(trendKind("Stanford HAI conference 2026: day one")).toBe("talk");
    expect(trendKind("AI Engineer Summit: closing session")).toBe("talk");
    expect(trendKind("What AI can't do yet | TEDx")).toBe("talk");
    // News phrasing still wins.
    expect(trendKind("Everything announced at the Google I/O conference")).toBe("news");
  });
  it("keeps lessons about these formats as lessons", () => {
    expect(trendKind("How to prepare for a debate with ChatGPT")).toBeNull();
    expect(trendKind("Tutorial: turn a conference paper into slides with Gamma")).toBeNull();
    expect(trendKind("Stanford CS224N Lecture 5: Transformers")).toBeNull();
  });
});

describe("talk searches", () => {
  it("adds talk queries to the trends searches within the daily search cap", () => {
    expect(TREND_QUERIES).toEqual(expect.arrayContaining(["AI conference keynote", "AI debate", "AI podcast interview"]));
    const total = tools.reduce((n, t) => n + t.queries.length, 0) + TOPIC_QUERIES.length + TREND_QUERIES.length;
    expect(total).toBeLessThanOrEqual(SETTINGS.maxSearches);
  });
});

describe("mergeTrends", () => {
  const t = (over: Partial<Trend> = {}): Trend => ({
    id: "t",
    title: "AI News",
    channel: "C",
    channelId: "UC1",
    publishedAt: "2026-09-25T00:00:00Z",
    duration: 600,
    views: 1000,
    kind: "news",
    tools: [],
    score: 50,
    firstSeen: "2026-09-25",
    ...over,
  });
  it("drops trends past the retention window", () => {
    expect(mergeTrends([t({ publishedAt: "2026-08-01T00:00:00Z" })], [], "2026-09-26")).toHaveLength(0);
  });
  it("caps each channel and sorts newest first", () => {
    const many = Array.from({ length: 8 }, (_, i) => t({ id: `a${i}`, score: i, publishedAt: `2026-09-2${i % 6}T00:00:00Z` }));
    const out = mergeTrends([], [...many, t({ id: "b", channelId: "UC2", publishedAt: "2026-09-26T00:00:00Z" })], "2026-09-26");
    expect(out.filter((x) => x.channelId === "UC1")).toHaveLength(4);
    expect(out[0].id).toBe("b");
  });
});
