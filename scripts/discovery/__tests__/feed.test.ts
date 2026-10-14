import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { linksIn, parseFeed, stripHtml } from "../feed";

const fixture = (name: string) => readFileSync(join(import.meta.dirname, "..", "fixtures", name), "utf8");

describe("feeds", () => {
  it("reads an RSS feed: titles, links, dates, plain-text summaries and the links in each post", () => {
    const items = parseFeed(fixture("rss.xml"));
    expect(items.map((i) => i.title)).toEqual(["Introducing Veo 4: video, meet audio", "Meshy raises $20M & launches 3D tool"]);
    expect(items[0]).toMatchObject({ link: "https://blog.example.com/veo-4", date: "2026-10-06" });
    expect(items[0].summary).toBe("Veo 4 is our video generation model. Try it in Veo Studio & share clips.");
    expect(items[0].links).toEqual(["https://labs.example.com/veo"]);
    // The full-content field is used when there's no description.
    expect(items[1].summary).toContain("Meshy turns text prompts into 3D models");
    expect(items[1].links).toEqual(["https://www.meshy.ai/"]);
  });

  it("skips posts with no title or without an https link", () => {
    const titles = parseFeed(fixture("rss.xml")).map((i) => i.title);
    expect(titles).not.toContain("No link here");
    expect(titles).not.toContain("Plain http link");
  });

  it("reads an Atom feed, choosing the alternate link and decoding escaped HTML", () => {
    const items = parseFeed(fixture("atom.xml"));
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ title: "Higgsfield – cinematic AI video in minutes", link: "https://www.producthunt.com/posts/higgsfield", date: "2026-10-08" });
    expect(items[0].links).toEqual(["https://higgsfield.ai/"]);
    expect(items[1].date).toBe("2026-10-09");
  });

  it("copes with a single item, empty feeds and junk", () => {
    expect(parseFeed('<rss><channel><item><title>One</title><link>https://a.example/1</link></item></channel></rss>')).toHaveLength(1);
    expect(parseFeed("<rss><channel></channel></rss>")).toEqual([]);
    expect(parseFeed("not xml at all")).toEqual([]);
    expect(parseFeed("")).toEqual([]);
  });

  it("strips markup and entities", () => {
    expect(stripHtml("<p>Hello&nbsp;<b>world</b> &amp; <script>alert(1)</script>more &#39;x&#39;</p>")).toBe("Hello world & more 'x'");
  });

  it("finds only https links, once each", () => {
    expect(linksIn('<a href="https://a.example/x">1</a> <a href="http://b.example">2</a> <a href="/rel">3</a> <a href="https://a.example/x">4</a> <a href="javascript:void(0)">5</a>')).toEqual(["https://a.example/x"]);
  });
});
