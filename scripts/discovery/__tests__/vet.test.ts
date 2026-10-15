import { describe, expect, it } from "vitest";
import { CANDIDATES } from "../candidates";
import { SOURCES } from "../sources";
import { report, vet } from "../vet-feeds";
import type { Source } from "../types";

const now = new Date("2026-10-12T05:00:00Z");
const src: Source = { id: "t", name: "Test feed", url: "https://t.example/feed", tier: "press", aiOnly: true };
const feed = (titles: string[], day = 10) =>
  `<rss version="2.0"><channel>${titles.map((t, i) => `<item><title>${t}</title><link>https://t.example/${i}</link><pubDate>${new Date(Date.UTC(2026, 9, day - (i % 5))).toUTCString()}</pubDate></item>`).join("")}</channel></rss>`;

describe("feed vetting", () => {
  it("adds a recent, on-topic feed that names products", async () => {
    const xml = feed(["Introducing Alpha", "Introducing Beta", "Introducing Gamma", "Introducing Delta", "Introducing Epsilon", "Introducing Zeta", "Introducing Eta", "Introducing Theta"]);
    const v = await vet(src, async () => xml, now);
    expect(v.verdict).toBe("add");
    expect(v.names.length).toBeGreaterThan(3);
  });

  it("skips an unreachable, empty or quiet feed and says why", async () => {
    expect((await vet(src, async () => { throw new Error("HTTP 404"); }, now)).verdict).toBe("skip");
    expect((await vet(src, async () => "<html>not a feed</html>", now)).reason).toMatch(/isn't an RSS|empty|Could not/);
    const quiet = await vet(src, async () => feed(["Introducing Alpha"]), now);
    expect(quiet.verdict).toBe("skip");
    expect(quiet.reason).toMatch(/too quiet/);
  });

  it("skips a feed that is mostly not about AI", async () => {
    const mixed = { ...src, aiOnly: false };
    const xml = feed(["Quarterly results", "Store opens", "Holiday hours", "New logo", "Careers fair"]);
    const v = await vet(mixed, async () => xml, now);
    expect(v.verdict).toBe("skip");
    expect(v.reason).toMatch(/about AI/);
  });

  it("keeps candidates distinct from the sources already in use, and the report readable", async () => {
    const used = new Set(SOURCES.map((s) => s.id));
    expect(CANDIDATES.filter((c) => used.has(c.id))).toEqual([]);
    expect(new Set(CANDIDATES.map((c) => c.id)).size).toBe(CANDIDATES.length);
    expect(CANDIDATES.every((c) => c.url.startsWith("https://"))).toBe(true);
    const v = await vet(src, async () => feed(["Introducing Alpha"]), now);
    expect(report([], [v], now)).toContain("Test feed");
  });
});
