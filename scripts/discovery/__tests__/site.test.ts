import { describe, expect, it } from "vitest";
import { buildMatch, firstSentences, monogram, queryFor, slugify } from "../build-tool";
import { fetchPage, isPublicHttps, pickSiteUrl, readHead, type Fetcher } from "../site";

const page = (html: string, init: ResponseInit = {}) => new Response(html, { status: 200, headers: { "content-type": "text/html" }, ...init });

describe("which addresses are safe to fetch", () => {
  it("accepts public https hosts", () => {
    for (const u of ["https://higgsfield.ai/", "https://labs.google/flow", "https://www.meshy.ai/path?x=1"]) expect(isPublicHttps(u), u).toBe(true);
  });

  it("refuses everything else", () => {
    for (const u of ["http://example.org", "https://localhost/", "https://127.0.0.1/", "https://10.0.0.5/", "https://[::1]/", "https://intranet/", "https://printer.local/", "https://db.internal/", "https://user:pw@example.org/", "https://example.org:8443/", "ftp://example.org/", "not a url", "https://example.org./"]) {
      expect(isPublicHttps(u), u).toBe(false);
    }
  });
});

describe("reading a page", () => {
  it("finds the title and description, falling back to the social tags", () => {
    expect(readHead('<head><title> Meshy &amp; Co </title><meta name="description" content="Text to 3D."></head>')).toEqual({ title: "Meshy & Co", description: "Text to 3D." });
    expect(readHead('<meta property="og:title" content="Og"><meta property="og:description" content=\'Social copy\'>')).toEqual({ title: "Og", description: "Social copy" });
    expect(readHead("<p>nothing</p>")).toEqual({ title: "", description: "" });
  });

  it("fetches a page and reports what it says", async () => {
    const f: Fetcher = async () => page("<title>Hi</title><meta name='description' content='A tool.'>");
    expect(await fetchPage("https://a.example.org/", { fetchImpl: f })).toMatchObject({ ok: true, status: 200, title: "Hi", description: "A tool." });
  });

  it("follows redirects, checking each hop", async () => {
    const calls: string[] = [];
    const f: Fetcher = async (u) => {
      calls.push(u);
      if (u === "https://a.example.org/") return new Response(null, { status: 301, headers: { location: "https://b.example.org/home" } });
      return page("<title>B</title>");
    };
    const info = await fetchPage("https://a.example.org/", { fetchImpl: f });
    expect(info).toMatchObject({ ok: true, finalUrl: "https://b.example.org/home", title: "B" });
    expect(calls).toHaveLength(2);
  });

  it("won't follow a redirect to somewhere private", async () => {
    const f: Fetcher = async () => new Response(null, { status: 302, headers: { location: "https://169.254.169.254/latest" } });
    expect(await fetchPage("https://a.example.org/", { fetchImpl: f })).toBeNull();
  });

  it("gives up on a redirect loop, a server error, a non-page and a network failure without throwing", async () => {
    const loop: Fetcher = async () => new Response(null, { status: 302, headers: { location: "https://a.example.org/" } });
    expect((await fetchPage("https://a.example.org/", { fetchImpl: loop }))?.ok).toBe(false);
    expect((await fetchPage("https://a.example.org/", { fetchImpl: async () => new Response("no", { status: 503 }) }))?.ok).toBe(false);
    expect((await fetchPage("https://a.example.org/", { fetchImpl: async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } }) }))?.title).toBe("");
    expect((await fetchPage("https://a.example.org/", { fetchImpl: async () => Promise.reject(new Error("offline")) }))).toMatchObject({ ok: false, status: 0 });
    expect(await fetchPage("http://a.example.org/")).toBeNull();
  });

  it("reads only the start of a huge page", async () => {
    const big = "<title>Big</title>" + "x".repeat(2_000_000);
    const info = await fetchPage("https://a.example.org/", { fetchImpl: async () => page(big), maxBytes: 5000 });
    expect(info?.title).toBe("Big");
  });
});

describe("finding a tool's own site among a post's links", () => {
  it("picks the link named for the product", () => {
    expect(pickSiteUrl("higgsfield", ["https://twitter.com/higgsfield", "https://higgsfield.ai/create?utm=x#y"])).toBe("https://higgsfield.ai/");
    expect(pickSiteUrl("meshy", ["https://www.meshy.ai/"])).toBe("https://www.meshy.ai/");
    expect(pickSiteUrl("flow", ["https://labs.google/flow/about?x=1"])).toBe("https://labs.google/flow");
  });

  it("ignores social sites, other products and unsafe links", () => {
    expect(pickSiteUrl("higgsfield", ["https://x.com/higgsfield", "https://www.youtube.com/@higgsfield", "https://producthunt.com/posts/higgsfield"])).toBeNull();
    expect(pickSiteUrl("veo", ["https://example.org/about"])).toBeNull();
    expect(pickSiteUrl("kling", ["http://klingai.com/"])).toBeNull();
    expect(pickSiteUrl("ai", ["https://ai.example.org/"])).toBeNull();
  });
});

describe("tool details built from a name", () => {
  it("matches a distinctive name as whole words, ignoring spaces and hyphens", () => {
    const [p] = buildMatch("Higgsfield");
    const re = new RegExp(p, "i");
    expect(re.test("How to use Higgsfield for video")).toBe(true);
    expect(re.test("higgsfield-ai tutorial")).toBe(true);
    expect(re.test("Higgsfields")).toBe(false);
    const multi = new RegExp(buildMatch("Luma Dream Machine")[0], "i");
    expect(multi.test("Luma Dream Machine guide")).toBe(true);
    expect(multi.test("luma-dream-machine")).toBe(true);
    expect(multi.test("Luma Dream")).toBe(false);
  });

  it("asks for context when a name is also an everyday word or very short", () => {
    const re = buildMatch("Flow", "Google").map((p) => new RegExp(p, "i"));
    const hits = (t: string) => re.some((r) => r.test(t));
    expect(hits("Go with the flow")).toBe(false);
    expect(hits("Flow AI tutorial")).toBe(true);
    expect(hits("Google Flow for filmmakers")).toBe(true);
    const wan = buildMatch("Wan").map((p) => new RegExp(p, "i"));
    expect(wan.some((r) => r.test("Wan video model"))).toBe(true);
    expect(wan.some((r) => r.test("Wan Wei visits"))).toBe(false);
  });

  it("escapes names so they can't break the pattern", () => {
    expect(() => new RegExp(buildMatch("C++ (beta)")[0], "i")).not.toThrow();
  });

  it("makes ids, tiles and searches", () => {
    expect(slugify("Luma Dream Machine")).toBe("luma-dream-machine");
    expect(slugify("Flux Kontext!")).toBe("flux-kontext");
    expect(monogram("higgsfield")).toBe("Hi");
    expect(monogram("3D Studio")).toBe("3d");
    expect(queryFor("Veo", "tool")).toBe("Veo AI tutorial");
    expect(queryFor("Qwen", "model")).toBe("Qwen AI model how to use");
  });

  it("trims a post's wording to a sentence or two", () => {
    expect(firstSentences("Short.")).toBe("Short.");
    const long = "This first sentence is long enough to be a natural place to stop. " + "word ".repeat(80);
    expect(firstSentences(long, 100)).toBe("This first sentence is long enough to be a natural place to stop.");
    expect(firstSentences("no".repeat(300), 100).endsWith("…")).toBe(true);
  });
});
