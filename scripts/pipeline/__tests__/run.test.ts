import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { VideoFeed } from "../../../src/data/types";

const root = new URL("../../../", import.meta.url).pathname;

function run(out: string, now: string) {
  execFileSync("npx", ["tsx", "scripts/pipeline/index.ts", "--fixture", "scripts/pipeline/fixtures/candidates.json"], {
    cwd: root,
    env: { ...process.env, PIPELINE_OUT: out, PIPELINE_NOW: now, YOUTUBE_API_KEY: "", ANTHROPIC_API_KEY: "" },
    stdio: "pipe",
  });
  return JSON.parse(readFileSync(out, "utf8")) as VideoFeed;
}

describe("pipeline run (fixture)", () => {
  const out = join(mkdtempSync(join(tmpdir(), "kh-")), "videos.json");

  it("builds a feed from fixture candidates", () => {
    const feed = run(out, "2026-09-26T12:00:00Z");
    expect(feed.runDate).toBe("2026-09-26");
    expect(feed.classifier).toBe("heuristic");
    expect(feed.stats.added).toBe(feed.videos.length);
    const titles = feed.videos.map((v) => v.title);
    expect(titles.some((t) => /INSANE/.test(t))).toBe(false);
    expect(titles.some((t) => /#shorts/.test(t))).toBe(false);
    expect(titles).toContain("Prompt Engineering for Beginners: The Complete Guide");
    // News goes to trends, entertainment and stale news nowhere.
    expect(titles).not.toContain("Introducing GPT-6");
    expect(feed.trends?.map((t) => [t.title, t.kind])).toEqual([
      ["AI News: Three New Models and a Big Agents Update", "news"],
      ["Introducing GPT-6", "launch"],
    ]);
    for (const v of feed.videos) {
      expect(["beginner", "intermediate", "advanced"]).toContain(v.difficulty);
      expect(v.tools.length + v.topics.length).toBeGreaterThan(0);
    }
  }, 30_000);

  it("keeps firstSeen and adds nothing on the next day's identical run", () => {
    const feed = run(out, "2026-09-27T12:00:00Z");
    expect(feed.runDate).toBe("2026-09-27");
    expect(feed.stats.added).toBe(0);
    expect(feed.videos.every((v) => v.firstSeen === "2026-09-26")).toBe(true);
  }, 30_000);
});
