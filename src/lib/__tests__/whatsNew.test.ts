import { describe, expect, it } from "vitest";
import { atomXml } from "../../../scripts/seo/render";
import { canonicalUrl } from "../seo";
import { newItems } from "../whatsNew";

const spotted = [
  { id: "newer", name: "Newer", maker: "A", bestFor: "A video model.", firstSeen: "2026-11-05" },
  { id: "older", name: "Older", maker: "B", bestFor: "x ".repeat(200), firstSeen: "2026-09-20" },
  { id: "ancient", name: "Ancient", maker: "C", bestFor: "Old.", firstSeen: "2026-01-01" },
  { id: "future", name: "Future", maker: "D", bestFor: "Not yet.", firstSeen: "2026-12-31" },
];
const reviewed = [
  { id: "claude", name: "Claude", bestFor: "Writing and reasoning.", lastReviewed: "2026-10-30" },
  { id: "stale", name: "Stale", bestFor: "Out of date.", lastReviewed: "2026-02-01" },
];

describe("what's new", () => {
  const items = newItems(spotted, reviewed, "2026-11-07");

  it("keeps what changed in the window, newest first, and leaves out the old and the future", () => {
    expect(items.map((i) => i.id)).toEqual(["spotted-newer", "reviewed-claude-2026-10-30", "spotted-older"]);
    expect(newItems(spotted, reviewed, "2026-11-07", 400).map((i) => i.id)).toContain("spotted-ancient");
    expect(items.some((i) => i.id.includes("future") || i.id.includes("stale"))).toBe(false);
  });

  it("labels spotted tools as not reviewed, and keeps summaries short", () => {
    expect(items[0].title).toBe("Newer: new, not reviewed yet");
    expect(items[1].title).toBe("Claude: review updated");
    expect(items[2].summary.length).toBeLessThanOrEqual(221);
    expect(items[0].path).toBe("/tools/newer");
  });

  it("respects a limit", () => {
    expect(newItems(spotted, reviewed, "2026-11-07", 90, 1)).toHaveLength(1);
  });
});

describe("the feed", () => {
  it("is valid Atom with an entry per item, newest date as updated, and escaped text", () => {
    const xml = atomXml([{ id: "a&b", title: "R&D <tool>", summary: "A \"quoted\" thing", path: "/tools/x", date: "2026-11-05" }], "https://example.org", "Feed & title");
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
    expect(xml).toContain("<title>Feed &amp; title</title>");
    expect(xml).toContain("<title>R&amp;D &lt;tool&gt;</title>");
    expect(xml).toContain("<updated>2026-11-05T00:00:00Z</updated>");
    expect(xml).toContain(`<link href="${canonicalUrl("/tools/x")}" />`);
    expect(xml).toContain("tag:example.org,2026-11-05:a&amp;b");
    expect(xml.match(/<entry>/g)).toHaveLength(1);
  });

  it("is still a feed when there is nothing new", () => {
    const xml = atomXml([], "https://example.org", "Empty");
    expect(xml).toContain("<feed");
    expect(xml).not.toContain("<entry>");
  });
});
