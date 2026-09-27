import { describe, expect, it } from "vitest";
import { links, clusterOf } from "../../data/toolMap";
import { toolById, tools } from "../../data/tools";
import { navigationRequest, searchSite, searchTools, tasksFor } from "../siteSearch";

const top = (q: string, n = 3) => searchTools(q).slice(0, n).map((h) => h.tool.id);

describe("searchTools", () => {
  it("finds tools by name", () => {
    expect(top("chatgpt", 1)).toEqual(["chatgpt"]);
    expect(top("semantic scholar", 1)).toEqual(["semantic-scholar"]);
  });

  it("understands what people want to do", () => {
    expect(top("make slides from my notes")).toEqual(expect.arrayContaining(["gamma"]));
    expect(top("transcribe a lecture recording", 2)).toContain("otter");
    expect(top("analyze a spreadsheet", 3)).toContain("julius");
    expect(top("automate a workflow", 2)).toEqual(expect.arrayContaining(["zapier", "n8n"]));
    expect(top("find papers for my literature review", 5)).toEqual(expect.arrayContaining(["elicit", "scispace"]));
  });

  it("explains why a tool matched", () => {
    const hit = searchTools("make slides").find((h) => h.tool.id === "gamma")!;
    expect(hit.why.join(" ")).toMatch(/presentation/i);
  });

  it("returns nothing for empty or stop-word queries", () => {
    expect(searchTools("")).toEqual([]);
    expect(searchTools("the ai tool")).toEqual([]);
  });
});

describe("tasksFor", () => {
  it("maps everyday words and phrases to tasks", () => {
    expect([...tasksFor("turn my paper into a deck").keys()]).toEqual(expect.arrayContaining(["research", "present"]));
    expect(tasksFor("transcribing interviews").has("audio")).toBe(true);
  });
});

describe("searchSite", () => {
  it("finds lessons, courses and pages", () => {
    expect(searchSite("transformers")[0]).toMatchObject({ kind: "lesson", id: "llms" });
    expect(searchSite("rag").some((h) => h.id === "rag" && h.kind === "lesson")).toBe(true);
    expect(searchSite("stanford").some((h) => h.kind === "course")).toBe(true);
    expect(searchSite("videos")[0]).toMatchObject({ kind: "page", route: "/watch" });
    expect(searchSite("tools")[0]).toMatchObject({ kind: "page", route: "/tools" });
  });
});

describe("navigationRequest", () => {
  it("pulls the destination out of a request", () => {
    expect(navigationRequest("Take me to the RAG lesson")).toBe("rag lesson");
    expect(navigationRequest("open courses")).toBe("courses");
    expect(navigationRequest("where can I find the tool map?")).toBe("tool map");
  });
  it("ignores questions that aren't navigation", () => {
    expect(navigationRequest("What is a transformer?")).toBeNull();
  });
});

describe("tool map data", () => {
  it("puts every tool in exactly one cluster", () => {
    for (const t of tools) expect(clusterOf[t.id], t.id).toBeDefined();
    for (const id of Object.keys(clusterOf)) expect(toolById.has(id), id).toBe(true);
  });
  it("only links real tools, never to themselves", () => {
    for (const l of links) {
      expect(toolById.has(l.from) && toolById.has(l.to), `${l.from} → ${l.to}`).toBe(true);
      expect(l.from).not.toBe(l.to);
    }
  });
});
