import { describe, expect, it } from "vitest";
import { SEED_CATEGORIES } from "../categories";
import { STATIC_CATALOG, buildCatalog, safeUrl, sanitizeCategories, sanitizeDiscovered } from "../catalog";
import { tools } from "../tools";
import type { DiscoveredTool } from "../types";
import { classify, hasKeyword, indexText, norm, scoreCategories, stem } from "../../lib/taxonomy";

const discovered = (over: Partial<DiscoveredTool> = {}): DiscoveredTool => ({
  id: "higgsfield",
  name: "Higgsfield",
  maker: "",
  url: "https://higgsfield.ai/",
  monogram: "Hi",
  bestFor: "AI video generation.",
  tasks: ["text-to-video"],
  queries: ["Higgsfield AI tutorial"],
  match: ["higgsfield"],
  exclude: [],
  kind: "tool",
  urlKind: "site",
  origin: "feed",
  firstSeen: "2026-10-01",
  lastSeen: "2026-10-11",
  evidence: [],
  ...over,
});

describe("seed categories", () => {
  it("form a two-level tree with unique ids", () => {
    const ids = SEED_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of SEED_CATEGORIES) {
      expect(c.id, c.id).toMatch(/^[a-z0-9][a-z0-9-]*$/);
      expect(c.definition.length, c.id).toBeGreaterThan(10);
      expect(c.keywords.length, c.id).toBeGreaterThanOrEqual(3);
      if (c.parent) {
        const parent = SEED_CATEGORIES.find((p) => p.id === c.parent);
        expect(parent, `${c.id}'s parent`).toBeDefined();
        expect(parent!.parent, `${c.id}'s parent is itself a sub-category`).toBeUndefined();
      }
    }
  });

  it("covers the categories every reviewed tool uses", () => {
    const known = new Set(ids());
    for (const t of tools) for (const task of t.tasks) expect(known.has(task), `${t.id}: ${task}`).toBe(true);
    function ids() {
      return SEED_CATEGORIES.map((c) => c.id);
    }
  });
});

describe("reading text for categories", () => {
  it("matches words by stem and phrases as phrases, ignoring hyphens and case", () => {
    const ix = indexText("A Text-to-Video generator for Papers");
    expect(hasKeyword(ix, "text to video")).toBe(true);
    expect(hasKeyword(ix, "paper")).toBe(true);
    expect(hasKeyword(ix, "video generation")).toBe(false);
    expect(norm("“Hello,” she said — 3D!")).toBe("hello she said 3d");
    expect(stem("transcribing")).toBe(stem("transcribed"));
  });

  it("files a video generator under text to video", () => {
    const c = classify("Higgsfield is an AI video generation platform: create cinematic clips from a prompt or a photo.", SEED_CATEGORIES);
    expect(c.ids).toContain("text-to-video");
    expect(c.ids).not.toContain("video");
    expect(c.best).toBeGreaterThanOrEqual(2);
  });

  it("files tools by what they do, in the specific category when there is one", () => {
    const cases: [string, string][] = [
      ["Meshy turns text prompts into 3D models and game assets.", "3d-generation"],
      ["A coding agent that works in your terminal and reviews code.", "code-assistants"],
      ["Transcribe lectures and meetings with an AI note taker that writes searchable meeting notes.", "transcription"],
      ["Clone a voice and turn text to speech in 30 languages.", "speech-voice"],
      ["Compose music and soundtracks from a text prompt with a music generator.", "music"],
      ["Find and map academic papers by citation.", "literature-search"],
      ["Unity's game engine adds an assistant for game development.", "game-dev"],
      ["Create presentation slide decks from a document.", "present"],
    ];
    for (const [text, id] of cases) expect(classify(text, SEED_CATEGORIES).ids, text).toContain(id);
  });

  it("files nothing when the evidence is thin", () => {
    expect(classify("A new AI tool for everything.", SEED_CATEGORIES).ids).toEqual([]);
    expect(classify("Plan your garden and track your watering schedule.", SEED_CATEGORIES).ids).toEqual([]);
    expect(classify("", SEED_CATEGORIES).best).toBe(0);
  });

  it("lets a sub-category stand for its parent, and keeps a parent when nothing narrower fits", () => {
    const c = classify("Text to video: generate video from a prompt. Video generator for film.", SEED_CATEGORIES);
    expect(c.ids).toContain("text-to-video");
    expect(c.ids).not.toContain("video");
    const broad = classify("A video tool for film footage and animation.", SEED_CATEGORIES);
    expect(broad.ids).toContain("video");
  });

  it("scores only categories with evidence", () => {
    const s = scoreCategories("spreadsheet statistics and charts", SEED_CATEGORIES);
    expect(s.get("analyze")).toBeGreaterThanOrEqual(2);
    expect(s.has("video")).toBe(false);
  });
});

describe("catalog", () => {
  it("lists reviewed tools first, then discovered ones, marked as such", () => {
    const c = buildCatalog(tools, [discovered()]);
    expect(c.tools).toHaveLength(tools.length + 1);
    expect(c.toolById.get("runway")!.reviewed).toBe(true);
    const h = c.toolById.get("higgsfield")!;
    expect(h.reviewed).toBe(false);
    expect(c.tools.at(-1)).toBe(h);
  });

  it("never lets a discovered tool replace a reviewed one", () => {
    const c = buildCatalog(tools, [discovered({ id: "runway", name: "Not Runway" })]);
    expect(c.toolById.get("runway")!.name).toBe("Runway");
    expect(c.tools).toHaveLength(tools.length);
  });

  it("counts a tool in its category's parent", () => {
    const c = buildCatalog(tools, [discovered()]);
    expect(c.inCategory(c.toolById.get("higgsfield")!, "text-to-video")).toBe(true);
    expect(c.inCategory(c.toolById.get("higgsfield")!, "video")).toBe(true);
    expect(c.inCategory(c.toolById.get("higgsfield")!, "audio")).toBe(false);
    expect(c.toolsIn("video").map((t) => t.id)).toEqual(expect.arrayContaining(["runway", "higgsfield"]));
    expect(c.categoriesOf(c.toolById.get("higgsfield")!).map((x) => x.id)).toEqual(["text-to-video", "video"]);
  });

  it("drops categories a tool lists that don't exist", () => {
    const c = buildCatalog(tools, [discovered({ tasks: ["text-to-video", "made-up"] })]);
    expect(c.toolById.get("higgsfield")!.tasks).toEqual(["text-to-video"]);
  });

  it("adds automatic categories without letting them replace a seed or hang from a missing parent", () => {
    const auto = [
      { id: "legal", label: "Legal research", icon: "gavel", definition: "x", keywords: ["legal"], origin: "auto" as const },
      { id: "case-law", label: "Case law", icon: "gavel", parent: "legal", definition: "x", keywords: ["case law"], origin: "auto" as const },
      { id: "video", label: "Hijacked", icon: "x", definition: "x", keywords: [], origin: "auto" as const },
      { id: "orphan", label: "Orphan", icon: "x", parent: "nowhere", definition: "x", keywords: [], origin: "auto" as const },
      { id: "deep", label: "Deep", icon: "x", parent: "case-law", definition: "x", keywords: [], origin: "auto" as const },
    ];
    const c = buildCatalog(tools, [], auto);
    expect(c.categoryById.get("video")!.label).toBe("Create video");
    expect(c.categoryById.get("case-law")!.parent).toBe("legal");
    expect(c.categoryById.get("orphan")!.parent).toBeUndefined();
    // Only two levels: a category can't hang from a sub-category.
    expect(c.categoryById.get("deep")!.parent).toBeUndefined();
    expect(c.roots.map((r) => r.id)).toEqual(expect.arrayContaining(["legal", "orphan", "deep", "video"]));
    expect(c.childrenOf("legal").map((x) => x.id)).toEqual(["case-law"]);
  });

  it("has a static version of just the reviewed tools", () => {
    expect(STATIC_CATALOG.tools.every((t) => t.reviewed)).toBe(true);
    expect(STATIC_CATALOG.toolsIn("code").length).toBeGreaterThan(3);
  });
});

describe("reading the data files the site loads", () => {
  it("accepts a good discovered tool and cleans its fields", () => {
    const out = sanitizeDiscovered({ tools: [discovered({ monogram: "Higgs" })] });
    expect(out).toHaveLength(1);
    expect(out[0].monogram).toBe("Hi");
    expect(out[0].url).toBe("https://higgsfield.ai/");
  });

  it("drops entries that could mislead or break the page", () => {
    const bad = [
      discovered({ id: "a" }),
      { ...discovered(), id: "http", url: "http://example.com/" },
      { ...discovered(), id: "js", url: "javascript:alert(1)" },
      { ...discovered(), id: "creds", url: "https://user:pw@example.com/" },
      { ...discovered(), id: "Bad Id" },
      { ...discovered(), id: "noname", name: "" },
      { ...discovered(), id: "nodate", firstSeen: "yesterday" },
      null,
      "string",
    ];
    expect(sanitizeDiscovered({ tools: bad }).map((t) => t.id)).toEqual(["a"]);
    expect(sanitizeDiscovered(null)).toEqual([]);
    expect(sanitizeDiscovered({ tools: "x" })).toEqual([]);
  });

  it("keeps only evidence with an https link and a date", () => {
    const ev = [
      { source: "Blog", title: "Introducing X", url: "https://example.com/x", date: "2026-10-01" },
      { source: "Blog", title: "Bad", url: "http://example.com/y", date: "2026-10-01" },
      { source: "Blog", title: "No date", url: "https://example.com/z" },
    ];
    expect(sanitizeDiscovered({ tools: [{ ...discovered(), evidence: ev }] })[0].evidence).toHaveLength(1);
  });

  it("reads automatic categories, defaulting a bad icon", () => {
    const out = sanitizeCategories({ categories: [{ id: "legal", label: "Legal research", icon: "<script>", definition: "Law.", keywords: ["legal", 5, "case law"], createdAt: "2026-10-01" }, { id: "BAD ID", label: "x" }] });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: "legal", icon: "category", origin: "auto", keywords: ["legal", "case law"] });
  });

  it("only links plain https addresses", () => {
    expect(safeUrl("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
    for (const bad of ["http://example.com", "ftp://x.org", "//example.com", "javascript:1", "", 7, null, undefined, "https://u:p@x.org"]) expect(safeUrl(bad)).toBeNull();
  });
});
