import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { STATIC_CATALOG } from "../../data/catalog";
import type { Video } from "../../data/types";
import { catalogFrom, getCatalog, setCatalog } from "../catalogStore";
import { searchTools, tasksFor } from "../siteSearch";
import { libraryFor, watchFor } from "../tutor/watch";

const discovered = JSON.parse(readFileSync(new URL("../../../public/data/discovered.json", import.meta.url), "utf8"));
const taxonomy = JSON.parse(readFileSync(new URL("../../../public/data/taxonomy.json", import.meta.url), "utf8"));
const video = (id: string, title: string, tools: string[]): Video =>
  ({ id, title, channel: "A channel", tools, topics: [], difficulty: "beginner", score: 50, duration: 600 }) as unknown as Video;

afterEach(() => setCatalog(STATIC_CATALOG));

describe("the catalog the app reads", () => {
  it("falls back to the reviewed tools when the discovery files are missing or broken", () => {
    const c = catalogFrom(null, "nonsense");
    expect(c.tools.length).toBe(STATIC_CATALOG.tools.length);
    expect(c.tools.every((t) => t.reviewed)).toBe(true);
  });

  it("lists discovered tools, marked as not reviewed", () => {
    const c = catalogFrom(discovered, taxonomy);
    const h = c.toolById.get("higgsfield");
    expect(h && !h.reviewed).toBe(true);
    expect(c.toolsIn("video").some((t) => t.id === "higgsfield")).toBe(true);
    expect(c.toolsIn("text-to-video").some((t) => t.id === "veo")).toBe(true);
  });

  it("finds a discovered tool by what it does, and by name", () => {
    setCatalog(catalogFrom(discovered, taxonomy));
    expect(getCatalog().toolById.has("kling")).toBe(true);
    expect(searchTools("kling").map((h) => h.tool.id)).toContain("kling");
    expect(searchTools("generate a video from text").map((h) => h.tool.id).slice(0, 8)).toEqual(expect.arrayContaining(["veo"]));
    expect(tasksFor("make an ai video").has("video")).toBe(true);
  });
});

describe("watch next from the video library", () => {
  const vids = [video("a", "Higgsfield AI tutorial: cinematic camera moves", ["higgsfield"]), video("b", "Veo 3 prompting guide", ["veo"]), video("c", "Cooking pasta", [])];

  it("suggests library videos for a question the lessons don't cover", () => {
    setCatalog(catalogFrom(discovered, taxonomy));
    const { items } = libraryFor("how do i use higgsfield", vids);
    expect(items.map((i) => i.playable.id)).toEqual(["a"]);
    const list = watchFor([], null, 6, { ask: "how do i use higgsfield", videos: vids });
    expect(list[0].kind).toBe("video");
  });

  it("leaves lessons alone when nothing in the library fits", () => {
    expect(watchFor(["llms"], null, 6, { ask: "pasta recipes", videos: vids })).toEqual(watchFor(["llms"], null, 6));
  });
});
