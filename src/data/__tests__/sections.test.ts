import { describe, expect, it } from "vitest";
import { allPaths } from "../../lib/seo";
import { SECTIONS, sectionOf, tabsFor } from "../sections";

describe("site sections", () => {
  it("files every page under a section, so the rail can show where you are", () => {
    const lost = [...allPaths(), "/search", "/team/test", "/offline/assistant"].filter((p) => p !== "/search" && !sectionOf(p));
    expect(lost).toEqual([]);
  });

  it("links every section page to a real page", () => {
    const known = new Set([...allPaths(), "/team/test"]);
    for (const s of SECTIONS) for (const pg of s.pages) expect(known.has(pg.to), pg.to).toBe(true);
  });

  it("lights the section a secondary page belongs to", () => {
    expect(sectionOf("/start")?.label).toBe("Learn");
    expect(sectionOf("/prompts/")?.label).toBe("Learn");
    expect(sectionOf("/tools/chatgpt")?.label).toBe("Tools");
    expect(sectionOf("/tools/compare/zapier-vs-n8n")?.label).toBe("Tools");
    expect(sectionOf("/offline/assistant")?.label).toBe("Green AI");
    expect(sectionOf("/learn/path/student/llms")?.label).toBe("Learn");
    expect(sectionOf("/")?.label).toBe("Home");
  });

  it("shows tabs on a section's own pages only, with the most specific one current", () => {
    expect(tabsFor("/offline/assistant")?.current.label).toBe("Offline assistant");
    expect(tabsFor("/tools/compare/zapier-vs-n8n")?.current.label).toBe("Compare tools");
    expect(tabsFor("/learn/courses/")?.current.label).toBe("Full courses");
    expect(tabsFor("/tools/chatgpt")).toBeUndefined(); // a tool's page has its own way back
    expect(tabsFor("/learn/llms")).toBeUndefined();
    expect(tabsFor("/")).toBeUndefined();
  });
});
