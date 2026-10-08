import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Script } from "node:vm";
import { describe, expect, it } from "vitest";
import { precacheFiles, renderServiceWorker, totalBytes, versionOf } from "../build";

const template = readFileSync(join(import.meta.dirname, "..", "sw.template.js"), "utf8");

function fakeDist(extra: Record<string, string> = {}) {
  const dist = mkdtempSync(join(tmpdir(), "kh-dist-"));
  mkdirSync(join(dist, "assets"));
  const files: Record<string, string> = {
    "assets/index-abc.js": "console.log(1)",
    "assets/index-abc.css": "body{}",
    "assets/index-abc.js.map": "{}",
    "shell.html": "<html></html>",
    "favicon.svg": "<svg/>",
    "favicon.png": "png",
    "icon-512.png": "png",
    "manifest.webmanifest": "{}",
    "sitemap.xml": "<urlset/>",
    ...extra,
  };
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dist, name), body);
  return dist;
}

describe("offline service worker build", () => {
  it("saves the app's files and nothing else", () => {
    const files = precacheFiles(fakeDist());
    expect(files).toEqual(["assets/index-abc.css", "assets/index-abc.js", "favicon.png", "favicon.svg", "icon-512.png", "manifest.webmanifest", "shell.html"]);
    expect(files.some((f) => f.endsWith(".map") || f.includes("sitemap"))).toBe(false);
  });

  it("changes the version only when a saved file changes", () => {
    const a = fakeDist();
    const files = precacheFiles(a);
    const same = versionOf(a, files);
    expect(versionOf(a, files)).toBe(same);
    writeFileSync(join(a, "sitemap.xml"), "<urlset>changed</urlset>");
    expect(versionOf(a, precacheFiles(a))).toBe(same);
    writeFileSync(join(a, "assets/index-abc.js"), "console.log(2)");
    expect(versionOf(a, precacheFiles(a))).not.toBe(same);
  });

  it("fills in the template as valid JavaScript with the site's base path", () => {
    const dist = fakeDist();
    const files = precacheFiles(dist);
    const sw = renderServiceWorker(template, { version: "v1", base: "/knowledge-hub/", files, data: ["data/videos.json"] });
    expect(() => new Script(sw)).not.toThrow();
    expect(sw).toContain('const VERSION = "v1";');
    expect(sw).toContain('"/knowledge-hub/assets/index-abc.js"');
    expect(sw).toContain('"/knowledge-hub/shell.html"');
    expect(sw).toContain('["/knowledge-hub/data/videos.json"]');
    expect(totalBytes(dist, files)).toBeGreaterThan(0);
  });

  it("refuses a template with a marker left unfilled", () => {
    const opts = { version: "v", base: "/", files: [], data: [] };
    expect(() => renderServiceWorker(template + "\nconst extra = __FILES__;", opts)).toThrow(/unfilled marker/);
    expect(() => renderServiceWorker(template, opts)).not.toThrow();
  });
});
