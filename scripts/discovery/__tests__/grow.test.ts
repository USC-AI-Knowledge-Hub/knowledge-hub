import { describe, expect, it } from "vitest";
import { SEED_CATEGORIES, type Category } from "../../../src/data/categories";
import { MIN_SUPPORT, descriptors, growTaxonomy, labelFor, restates, retireCategories, toTaxonomyFile, type PoolTool } from "../grow";
import { LIMITS } from "../sources";
import { EMPTY_TAXONOMY } from "../types";

const TODAY = "2026-10-11";
const tool = (id: string, text: string): PoolTool => ({ id, text });
const auto = (id: string, label: string, over: Partial<Category> = {}): Category => ({ id, label, icon: "category", definition: "x", keywords: [label.toLowerCase()], origin: "auto", createdAt: "2026-07-01", ...over });

const LEGAL = [
  tool("harvey", "Harvey is a legal research and contract review assistant for law firms."),
  tool("spellbook", "Spellbook drafts clauses and handles contract review inside Word for lawyers."),
  tool("luminance", "Luminance runs contract review and due diligence for legal teams."),
];

describe("phrases", () => {
  it("finds runs of meaningful words and nothing generic", () => {
    const d = descriptors("An easy-to-use AI platform for contract review and legal research.");
    expect(d).toEqual(expect.arrayContaining(["contract review", "legal research"]));
    expect(d.some((p) => /\b(platform|ai|tool)\b/.test(p))).toBe(false);
  });

  it("makes a label in sentence case with acronyms kept", () => {
    expect(labelFor("contract review")).toBe("Contract review");
    expect(labelFor("3d printing")).toBe("3D printing");
    expect(labelFor("cad assistants")).toBe("CAD assistants");
  });

  it("knows when a phrase restates a category", () => {
    const video = SEED_CATEGORIES.find((c) => c.id === "video-editing")!;
    expect(restates("video editing", video)).toBe(true);
    expect(restates("edit video", video)).toBe(true);
    expect(restates("contract review", video)).toBe(false);
    expect(restates("captions", video)).toBe(true);
    // Narrower than a category is not the same as the category.
    expect(restates("legal research", SEED_CATEGORIES.find((c) => c.id === "research")!)).toBe(false);
  });
});

describe("making a new category", () => {
  it("creates one when enough unfiled tools share a purpose nothing covers", () => {
    const r = growTaxonomy({ categories: SEED_CATEGORIES, pool: LEGAL, filedTexts: [], today: TODAY });
    expect(r.created).toBeDefined();
    const c = r.created!.category;
    expect(c).toMatchObject({ id: "contract-review", label: "Contract review", origin: "auto", createdAt: TODAY });
    expect(c.keywords).toContain("contract review");
    expect(c.parent).toBeUndefined();
    expect(r.created!.examples).toEqual(expect.arrayContaining(["harvey", "spellbook", "luminance"]));
    expect(r.created!.reason).toContain("contract review");
    expect(r.categories).toHaveLength(SEED_CATEGORIES.length + 1);
    // The tools it was made for are filed in it straight away.
    for (const id of ["harvey", "spellbook", "luminance"]) expect(r.filed.get(id)).toContain("contract-review");
  });

  it("needs several tools, not a couple", () => {
    expect(MIN_SUPPORT).toBeGreaterThanOrEqual(3);
    expect(growTaxonomy({ categories: SEED_CATEGORIES, pool: LEGAL.slice(0, 2), filedTexts: [], today: TODAY }).created).toBeUndefined();
  });

  it("makes a narrower category inside the broad one it specialises", () => {
    const pool = ["a", "b", "c"].map((id) => tool(id, "Legal research for associates."));
    const r = growTaxonomy({ categories: SEED_CATEGORIES, pool, filedTexts: [], today: TODAY });
    expect(r.created?.category).toMatchObject({ label: "Legal research", parent: "research", icon: "gavel" });
  });

  it("sits inside a broad category when the tools mostly belong near one", () => {
    const pool = [
      tool("a", "Opus turns long podcast recordings into podcast clipping highlights with audio captions."),
      tool("b", "Castmagic does podcast clipping and audio show notes."),
      tool("c", "Headliner makes podcast clipping videos from audio."),
    ];
    const r = growTaxonomy({ categories: SEED_CATEGORIES, pool, filedTexts: [], today: TODAY });
    expect(r.created?.category.label).toBe("Podcast clipping");
    expect(r.created?.category.parent).toBe("audio");
    expect(r.created?.category.icon).toBe("graphic_eq");
  });

  it("never restates a seed category", () => {
    const pool = ["a", "b", "c", "d"].map((id) => tool(id, "Offers video editing with captions."));
    expect(growTaxonomy({ categories: SEED_CATEGORIES, pool, filedTexts: [], today: TODAY }).created).toBeUndefined();
  });

  it("leaves a phrase alone when tools already filed elsewhere say it too", () => {
    const pool = ["a", "b", "c"].map((id) => tool(id, "Protein folding for biologists."));
    const filed = ["x", "y", "z"].map(() => "Predicts protein folding quickly.");
    expect(growTaxonomy({ categories: SEED_CATEGORIES, pool, filedTexts: [], today: TODAY }).created?.category.label).toBe("Protein folding");
    expect(growTaxonomy({ categories: SEED_CATEGORIES, pool, filedTexts: filed, today: TODAY }).created).toBeUndefined();
  });

  it("adds a phrase to an automatic category it restates, instead of making a duplicate", () => {
    const legal = auto("legal-research", "Legal research", { keywords: ["law"] });
    const r = growTaxonomy({ categories: [...SEED_CATEGORIES, legal], pool: ["a", "b", "c"].map((id) => tool(id, "Legal research for associates.")), filedTexts: [], today: TODAY });
    expect(r.created).toBeUndefined();
    expect(r.learned).toEqual({ id: "legal-research", keyword: "legal research" });
    expect(r.categories.find((c) => c.id === "legal-research")!.keywords).toEqual(["law", "legal research"]);
    expect(r.filed.get("a")).toContain("legal-research");
  });

  it("makes at most one a run, and none when editors blocked it or the tree is full", () => {
    const two = [...LEGAL, tool("p1", "Podcast clipping for shows."), tool("p2", "Podcast clipping tool."), tool("p3", "Podcast clipping.")];
    expect(growTaxonomy({ categories: SEED_CATEGORIES, pool: two, filedTexts: [], today: TODAY }).categories.filter((c) => c.origin === "auto")).toHaveLength(1);
    expect(growTaxonomy({ categories: SEED_CATEGORIES, pool: LEGAL, filedTexts: [], today: TODAY, blocked: new Set(["contract-review"]) }).created).toBeUndefined();
    const full = Array.from({ length: LIMITS.maxAutoCategories }, (_, i) => auto(`c${i}`, `Category ${i}`, { keywords: [`zz${i}`] }));
    expect(growTaxonomy({ categories: [...SEED_CATEGORIES, ...full], pool: LEGAL, filedTexts: [], today: TODAY }).created).toBeUndefined();
  });

  it("lets a reviewer rename or veto a draft", () => {
    const renamed = growTaxonomy({ categories: SEED_CATEGORIES, pool: LEGAL, filedTexts: [], today: TODAY, review: (d) => ({ ...d, label: "Legal contracts", definition: "Reviewing contracts." }) });
    expect(renamed.created?.category).toMatchObject({ id: "legal-contracts", label: "Legal contracts", definition: "Reviewing contracts." });
    expect(growTaxonomy({ categories: SEED_CATEGORIES, pool: LEGAL, filedTexts: [], today: TODAY, review: () => null }).created).toBeUndefined();
  });

  it("gives a clashing name a different id", () => {
    const taken = auto("contract-review", "Contract review", { keywords: ["zzz"], label: "Something else" });
    const r = growTaxonomy({ categories: [...SEED_CATEGORIES, taken], pool: LEGAL, filedTexts: [], today: TODAY });
    expect(r.created?.category.id).toBe("contract-review-2");
  });
});

describe("retiring categories", () => {
  const tools = (n: number, cat: string) => Array.from({ length: n }, () => ({ tasks: [cat] }));

  it("keeps a category that has two tools", () => {
    const r = retireCategories([...SEED_CATEGORIES, auto("legal", "Legal")], tools(2, "legal"), { legal: "2026-01-01" }, TODAY);
    expect(r.retired).toEqual([]);
    expect(r.lowSince).toEqual({});
  });

  it("starts the clock when a category gets thin, and retires it after the grace period", () => {
    const cats = [...SEED_CATEGORIES, auto("legal", "Legal")];
    const first = retireCategories(cats, tools(1, "legal"), {}, TODAY);
    expect(first.retired).toEqual([]);
    expect(first.lowSince).toEqual({ legal: TODAY });
    // Seventy days thin is still within the grace period; a hundred and thirty is not.
    expect(retireCategories(cats, tools(1, "legal"), { legal: "2026-08-02" }, TODAY).retired).toEqual([]);
    const late = retireCategories(cats, tools(1, "legal"), { legal: "2026-06-01" }, TODAY);
    expect(late.retired).toEqual(["legal"]);
    expect(late.categories.some((c) => c.id === "legal")).toBe(false);
    expect(late.lowSince).toEqual({});
  });

  it("never retires a seed, and counts a sub-category's tools toward its parent", () => {
    const parent = auto("legal", "Legal");
    const child = auto("case-law", "Case law", { parent: "legal" });
    const r = retireCategories([...SEED_CATEGORIES, parent, child], tools(2, "case-law"), { legal: "2020-01-01" }, TODAY);
    expect(r.categories.some((c) => c.id === "legal")).toBe(true);
    expect(retireCategories(SEED_CATEGORIES, [], {}, "2030-01-01").categories).toHaveLength(SEED_CATEGORIES.length);
  });

  it("lets a sub-category stand alone when its parent is retired", () => {
    const parent = auto("legal", "Legal");
    const child = auto("case-law", "Case law", { parent: "legal" });
    const r = retireCategories([...SEED_CATEGORIES, parent, child], [...tools(1, "legal")], { legal: "2020-01-01", "case-law": TODAY }, TODAY);
    expect(r.retired).toEqual(["legal"]);
    expect(r.categories.find((c) => c.id === "case-law")!.parent).toBeUndefined();
  });
});

describe("the taxonomy file", () => {
  it("records why a category exists, and forgets the history of one that's gone", () => {
    const grown = growTaxonomy({ categories: SEED_CATEGORIES, pool: LEGAL, filedTexts: [], today: TODAY });
    const file = toTaxonomyFile(EMPTY_TAXONOMY, grown.categories, {}, grown.created, TODAY);
    expect(file.categories.map((c) => c.id)).toEqual(["contract-review"]);
    expect(file.history[0]).toMatchObject({ id: "contract-review", createdAt: TODAY });
    const later = toTaxonomyFile(file, SEED_CATEGORIES, {}, undefined, "2026-12-01");
    expect(later.categories).toEqual([]);
    expect(later.history).toEqual([]);
  });
});
