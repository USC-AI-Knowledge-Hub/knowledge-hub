import { describe, expect, it } from "vitest";
import type { Video } from "../../data/types";
import { BASICS, buildVideoMap, findOnMap, taskPositions, toolPositions, toolRoots, videoTask, videosIn, WORLD } from "../watchMap";

const cat = (id: string, label: string, parent?: string, keywords: string[] = [], cues: string[] = []) => ({ id, label, parent, keywords, cues, icon: "x" });
const categories = [
  cat("video", "Create video", undefined, ["video generation", "video"], ["videos"]),
  cat("video-edit", "Edit video", "video", ["video editing"]),
  cat("present", "Make a presentation", undefined, ["slides", "slide deck", "presentation"]),
  cat("automate", "Automate a workflow", undefined, ["workflow", "agents", "ai agent"]),
  cat("research", "Research", undefined, ["citations", "literature review"]),
  cat("write", "Write", undefined, ["essay", "write"]),
];
const tools = [
  { id: "kling", name: "Kling", tasks: ["video"] },
  { id: "descript", name: "Descript", tasks: ["video-edit"] },
  { id: "gamma", name: "Gamma", tasks: ["present"] },
  { id: "n8n", name: "n8n", tasks: ["automate"] },
  { id: "chatgpt", name: "ChatGPT", tasks: ["write", "research", "present", "automate"] },
  { id: "openevidence", name: "OpenEvidence", tasks: [], bestFor: "Answers medical questions with citations from the clinical literature." },
];
const catalog = {
  categories,
  roots: categories.filter((c) => !c.parent),
  toolById: new Map(tools.map((t) => [t.id, t])),
  categoryById: new Map(categories.map((c) => [c.id, c])),
} as unknown as Parameters<typeof buildVideoMap>[1];

const v = (id: string, tools: string[], topics: string[] = [], title = "A tutorial") => ({ id, tools, topics, title }) as unknown as Video;
const videos = [
  v("a", ["kling"]),
  v("b", ["descript"]),
  v("c", ["kling", "gamma"]),
  v("d", ["gamma"]),
  v("e", [], ["agents"]),
  v("f", [], ["ethics"]),
  v("g", ["unknown"]),
  v("h", ["chatgpt"], [], "How to make AI videos with ChatGPT + CapCut"),
  v("i", ["chatgpt"], ["writing"], "How to get ChatGPT Plus for free"),
  v("j", ["chatgpt"], [], "Turn notes into slides with ChatGPT"),
];

describe("watch map", () => {
  it("files a video by what its title says it does, before its tools", () => {
    expect(videoTask(videos[7], catalog)).toBe("video"); // ChatGPT's main task is Write, but the video is about video
    expect(videoTask(videos[9], catalog)).toBe("present");
    expect(videoTask(v("x", ["kling"], [], "Make slides of your Kling clips"), catalog)).toBe("present");
    // A tie between tasks the title names goes to one its tools do.
    expect(videoTask(v("y", ["gamma"], [], "An essay into a presentation"), catalog)).toBe("present");
  });

  it("then a specialist tool's task, a tool-less video's topic, else General AI", () => {
    expect(videoTask(videos[1], catalog)).toBe("video"); // a sub-category rolls up to its task
    expect(videoTask(videos[4], catalog)).toBe("automate");
    expect(videoTask(videos[5], catalog)).toBe(BASICS.id);
    expect(videoTask(videos[6], catalog)).toBe(BASICS.id);
    // A general assistant with a title that names no task is general, whatever its topic tags say.
    expect(videoTask(videos[8], catalog)).toBe(BASICS.id);
  });

  it("isn't fooled by filler words, tool names or one stray word", () => {
    const more = {
      ...catalog,
      categories: [...categories, cat("code", "Code", undefined, ["coding", "code"]), cat("audio", "Voice & audio", undefined, ["text to speech"])],
      toolById: new Map([
        ...tools.map((t) => [t.id, t] as const),
        ["claude-code", { id: "claude-code", name: "Claude Code", tasks: ["code", "automate"] }],
        ["udio", { id: "udio", name: "Udio", tasks: ["audio"] }],
      ]),
    } as unknown as Parameters<typeof buildVideoMap>[1];
    (more as { roots: unknown[] }).roots = (more as { categories: { parent?: string }[] }).categories.filter((c) => !c.parent);
    (more as { categoryById: Map<string, unknown> }).categoryById = new Map((more as { categories: { id: string }[] }).categories.map((c) => [c.id, c]));
    // "Full workflow" is filler, so the specialist tool decides.
    expect(videoTask(v("w1", ["kling"], [], "Kling tutorial: full workflow"), more)).toBe("video");
    // "Every feature in one video" isn't about making video.
    expect(videoTask(v("w2", ["chatgpt"], [], "ChatGPT: every feature in one video"), more)).toBe(BASICS.id);
    // "No coding" isn't coding, and a tool's name isn't a task word.
    expect(videoTask(v("w3", ["claude-code"], [], "Build your first AI agent in Claude Code (no coding)"), more)).toBe("automate");
    // One stray word doesn't outvote a specialist that can't do that task.
    expect(videoTask(v("w4", ["udio"], [], "Udio tutorial: custom music for videos"), more)).toBe("audio");
    // Title words the categories don't list still count.
    expect(videoTask(v("w5", ["chatgpt"], [], "Make a movie with ChatGPT"), more)).toBe("video");
  });

  it("reads an unfiled tool's task from its description", () => {
    expect(toolRoots("openevidence", catalog)).toEqual(["research"]);
    expect(videoTask(v("z", ["openevidence"], [], "OpenEvidence for beginners"), catalog)).toBe("research");
  });

  it("gives a tool a bubble in every task it has videos in", () => {
    const map = buildVideoMap(videos, catalog);
    expect(map.tasks.map((t) => [t.id, t.count])).toEqual([
      ["video", 4],
      ["basics", 3],
      ["present", 2],
      ["automate", 1],
    ]);
    const video = map.tasks.find((t) => t.id === "video")!;
    expect(video.tools.map((t) => [t.id, t.count])).toEqual([
      ["kling", 2],
      ["chatgpt", 1],
      ["descript", 1],
      ["gamma", 1],
    ]);
    const where = (id: string) => map.tasks.filter((t) => t.tools.some((x) => x.id === id)).map((t) => t.id);
    expect(where("chatgpt")).toEqual(["video", "basics", "present"]);
    // Gamma: one video under video (c), one under present (d); its main task on a tie is its own.
    expect(map.toolTask.get("gamma")).toBe("present");
  });

  it("lists a tool's videos in one task, or everywhere", () => {
    const map = buildVideoMap(videos, catalog);
    expect(videosIn(videos, map, "present", null).map((x) => x.id)).toEqual(["d", "j"]);
    expect(videosIn(videos, map, "video", "chatgpt").map((x) => x.id)).toEqual(["h"]);
    expect(videosIn(videos, map, null, "chatgpt").map((x) => x.id)).toEqual(["h", "i", "j"]);
    expect(videosIn(videos, map, null, null)).toHaveLength(videos.length);
  });

  it("search finds a tool by name or prefix, a task by its words, else nothing", () => {
    const map = buildVideoMap([...videos, v("h", ["n8n"])], catalog);
    expect(findOnMap("n8n tutorial", map, catalog)).toEqual({ task: "automate", tool: "n8n" });
    expect(findOnMap("Klin", map, catalog)).toEqual({ task: "video", tool: "kling" });
    expect(findOnMap("make slides", map, catalog)).toEqual({ task: "present", tool: null });
    expect(findOnMap("video editing", map, catalog)).toEqual({ task: "video", tool: null });
    expect(findOnMap("what is an LLM", map, catalog).task).toBe(BASICS.id);
    expect(findOnMap("gardening", map, catalog)).toEqual({ task: null, tool: null });
    expect(findOnMap("a", map, catalog)).toEqual({ task: null, tool: null });
  });

  it("lays tasks and tools out inside the world", () => {
    for (const p of [...taskPositions(12), ...toolPositions({ x: 500, y: 320 }, 10, 205)]) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(WORLD.w);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(WORLD.h);
    }
    expect(taskPositions(4)[0].y).toBeLessThan(WORLD.h / 2); // the biggest task sits at the top
  });
});
