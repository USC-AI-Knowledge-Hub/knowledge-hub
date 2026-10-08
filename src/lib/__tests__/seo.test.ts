import { describe, expect, it } from "vitest";
import { renderPage, robotsTxt, sitemapXml } from "../../../scripts/seo/render";
import { allPaths, clip, pageMeta, plain, sitemapPaths, toBlocks } from "../seo";

const TEMPLATE = `<!doctype html><html><head><title>Old</title>
    <meta name="description" content="Old" /></head><body><div id="root"></div></body></html>`;

describe("page details", () => {
  const paths = allPaths();

  it("covers every route, and every route has page details", () => {
    expect(paths.length).toBeGreaterThan(100);
    for (const p of paths) expect(pageMeta(p), p).not.toBeNull();
    expect(pageMeta("/nope")).toBeNull();
    expect(pageMeta("/tools/not-a-tool")).toBeNull();
    expect(pageMeta("/learn/path/student/not-a-lesson")).toBeNull();
  });

  it("gives every page a title and description that fit in search results", () => {
    for (const p of paths) {
      const m = pageMeta(p)!;
      expect(m.title.length, `${p} title: ${m.title}`).toBeLessThanOrEqual(80);
      expect(m.title.length, p).toBeGreaterThan(15);
      expect(m.description.length, `${p} description: ${m.description}`).toBeLessThanOrEqual(160);
      expect(m.description.length, p).toBeGreaterThan(50);
    }
  });

  it("never repeats a title or description between pages with different content", () => {
    const seen = new Map<string, string>();
    for (const p of sitemapPaths()) {
      const m = pageMeta(p)!;
      for (const [k, v] of [["title", m.title], ["description", m.description]] as const) {
        const key = `${k}:${v}`;
        expect(seen.get(key), `${p} repeats ${key}`).toBeUndefined();
        seen.set(key, p);
      }
    }
  });

  it("puts each page in the sitemap once, at one address", () => {
    const listed = sitemapPaths();
    expect(new Set(listed).size).toBe(listed.length);
    expect(listed).not.toContain("/search");
    // A lesson reached through a path is the same page as the lesson itself.
    expect(pageMeta("/learn/path/student/prompting")!.path).toBe("/learn/lesson/prompting");
    expect(listed).toContain("/learn/lesson/prompting");
    expect(listed).not.toContain("/learn/path/student/prompting");
    expect(listed).toContain("/learn/path/faculty");
  });

  it("targets the searches students and professors make", () => {
    const home = pageMeta("/")!;
    expect(home.title.toLowerCase()).toContain("how to use ai");
    expect(home.description.toLowerCase()).toContain("professors");
    expect(pageMeta("/learn/path/faculty")!.title.toLowerCase()).toContain("professor");
    expect(pageMeta("/learn/path/student")!.title.toLowerCase()).toContain("student");
  });

  it("keeps search and unknown pages out of search results", () => {
    expect(pageMeta("/search")!.noindex).toBe(true);
    expect(pageMeta("/")!.noindex).toBeUndefined();
  });

  it("writes structured data that matches the page", () => {
    const home = pageMeta("/")!.jsonLd as { "@type": string }[];
    expect(home.map((j) => j["@type"]).sort()).toEqual(["FAQPage", "Organization", "WebSite"]);
    const course = pageMeta("/learn/path/faculty")!.jsonLd[0] as { "@type": string; timeRequired: string };
    expect(course["@type"]).toBe("Course");
    expect(course.timeRequired).toMatch(/^PT\d+M$/);
    for (const p of paths) for (const j of pageMeta(p)!.jsonLd) expect(() => JSON.stringify(j)).not.toThrow();
  });
});

describe("text helpers", () => {
  it("removes Markdown from lesson text", () => {
    expect(plain("A **bold** word, `code` and [a link](https://x.org).")).toBe("A bold word, code and a link.");
  });

  it("splits lesson text into paragraphs and lists", () => {
    expect(toBlocks("Intro.\n\n- **One.** First\n- Two\n\n1. Step\n2. Next")).toEqual([
      { kind: "p", text: "Intro." },
      { kind: "ul", items: ["One. First", "Two"] },
      { kind: "ol", items: ["Step", "Next"] },
    ]);
  });

  it("clips on a sentence or word, never mid-word", () => {
    const long = "This first sentence is long enough to be the natural place to stop. " + "word ".repeat(60);
    expect(clip(long, 100)).toBe("This first sentence is long enough to be the natural place to stop.");
    expect(clip("alpha ".repeat(60), 50).endsWith("…")).toBe(true);
    expect(clip("alpha ".repeat(60), 50).length).toBeLessThanOrEqual(50);
  });
});

describe("built pages", () => {
  const meta = pageMeta("/learn/path/faculty")!;
  const html = renderPage(TEMPLATE, meta, "/");

  it("replaces the shared title and description with the page's own", () => {
    expect(html).not.toContain("Old");
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html.match(/name="description"/g)).toHaveLength(1);
    expect(html).toContain(`<link rel="canonical" href="https://studentslearningai.com/learn/path/faculty/" />`);
    expect(html).toContain('property="og:image" content="https://studentslearningai.com/og.png"');
    expect(html).toContain('<script type="application/ld+json">');
  });

  it("puts the page's text and links where a crawler can read them", () => {
    expect(html).toContain('<div id="root"><main class="prerender"><h1>Faculty path</h1>');
    expect(html).toContain('<a href="/learn/path/faculty/assessment">');
  });

  it("prefixes links with the base path when the site isn't at the root", () => {
    expect(renderPage(TEMPLATE, meta, "/knowledge-hub/")).toContain('<a href="/knowledge-hub/learn/path/faculty/assessment">');
  });

  it("escapes text so a page can't break out of its tags", () => {
    const evil = { ...meta, title: 'A "quoted" <b>title</b>', jsonLd: [{ x: "</script><script>alert(1)" }] };
    const out = renderPage(TEMPLATE, evil, "/");
    expect(out).toContain("A &quot;quoted&quot; &lt;b&gt;title&lt;/b&gt;");
    expect(out).not.toContain("</script><script>alert");
  });

  it("writes a sitemap and robots.txt that point at each other", () => {
    const xml = sitemapXml(["/", "/learn"]);
    expect(xml).toContain("<loc>https://studentslearningai.com/</loc>");
    expect(xml).toContain("<loc>https://studentslearningai.com/learn/</loc>");
    const robots = robotsTxt("https://studentslearningai.com");
    expect(robots).toContain("Sitemap: https://studentslearningai.com/sitemap.xml");
    expect(robots).toContain("Disallow: /search");
  });
});
