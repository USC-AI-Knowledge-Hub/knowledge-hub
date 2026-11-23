import { describe, expect, it } from "vitest";
import type { Video } from "../../data/types";
import { BASICS, buildVideoMap, findOnMap, taskPositions, toolPositions, videoTask, videosIn, WORLD } from "../watchMap";

const cat = (id: string, label: string, parent?: string, keywords: string[] = []) => ({ id, label, parent, keywords, icon: "x" });
const categories = [
  cat("video", "Create video", undefined, ["video generation"]),
  cat("video-edit", "Edit video", "video", ["video editing"]),
  cat("present", "Make a presentation", undefined, ["slides", "slide deck"]),
  cat("automate", "Automate a workflow", undefined, ["workflow"]),
];
const tools = [
  { id: "kling", name: "Kling", tasks: ["video"] },
  { id: "descript", name: "Descript", tasks: ["video-edit"] },
  { id: "gamma", name: "Gamma", tasks: ["present"] },
  { id: "n8n", name: "n8n", tasks: ["automate"] },
];
const catalog = {
  roots: categories.filter((c) => !c.parent),
  toolById: new Map(tools.map((t) => [t.id, t])),
  categoryById: new Map(categories.map((c) => [c.id, c])),
} as unknown as Parameters<typeof buildVideoMap>[1];

const v = (id: string, tools: string[], topics: string[] = []) => ({ id, tools, topics }) as unknown as Video;
const videos = [v("a", ["kling"]), v("b", ["descript"]), v("c", ["kling", "gamma"]), v("d", ["gamma"]), v("e", [], ["agents"]), v("f", [], ["ethics"]), v("g", ["unknown"])];

describe("watch map", () => {
  it("files a video under its first tool's task, then its topic, then AI basics", () => {
    expect(videoTask(videos[1], catalog)).toBe("video"); // a sub-category rolls up to its task
    expect(videoTask(videos[4], catalog)).toBe("automate");
    expect(videoTask(videos[5], catalog)).toBe(BASICS.id);
    expect(videoTask(videos[6], catalog)).toBe(BASICS.id);
  });

  it("counts tasks and tools, biggest first, each tool in one task", () => {
    const map = buildVideoMap(videos, catalog);
    expect(map.tasks.map((t) => [t.id, t.count])).toEqual([
      ["video", 3],
      ["basics", 2],
      ["present", 1],
      ["automate", 1],
    ]);
    const video = map.tasks.find((t) => t.id === "video")!;
    expect(video.tools.map((t) => [t.id, t.count])).toEqual([
      ["kling", 2],
      ["descript", 1],
    ]);
    // Gamma's videos: one under video (c), one under present (d); a tie goes to its own task.
    expect(map.tasks.flatMap((t) => t.tools).filter((t) => t.id === "gamma")).toHaveLength(1);
    expect(map.toolTask.get("gamma")).toBe("present");
  });

  it("lists a tool's videos wherever they're filed", () => {
    const map = buildVideoMap(videos, catalog);
    expect(videosIn(videos, map, "present", null).map((x) => x.id)).toEqual(["d"]);
    expect(videosIn(videos, map, "present", "gamma").map((x) => x.id)).toEqual(["c", "d"]);
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
