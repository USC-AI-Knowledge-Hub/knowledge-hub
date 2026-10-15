import { describe, expect, it } from "vitest";
import { aiRelated, cleanName, extractMentions, familyName, keyOf, namesInTitle, validName } from "../extract";
import type { FeedItem, Source } from "../types";

const vendor: Source = { id: "v", name: "Vendor", url: "https://v.example/feed", tier: "vendor", maker: "Vendor", aiOnly: true };
const press: Source = { id: "p", name: "Press", url: "https://p.example/feed", tier: "press", aiOnly: false };
const launch: Source = { id: "l", name: "Launches", url: "https://l.example/feed", tier: "community", titles: "product", aiOnly: true };

const item = (title: string, summary = ""): FeedItem => ({ title, link: "https://x.example/p", date: "2026-10-01", summary, links: [] });

describe("product families", () => {
  it("drops versions and variants, so one product is one entry", () => {
    expect(familyName("Veo 3.1")).toBe("Veo");
    expect(familyName("Veo 3.1 Fast")).toBe("Veo");
    expect(familyName("Llama 3.2 1B")).toBe("Llama");
    expect(familyName("GPT-4o")).toBe("GPT");
    expect(familyName("Qwen3.5")).toBe("Qwen");
    expect(familyName("Phi-4 mini")).toBe("Phi");
    expect(familyName("Flux.1 Kontext")).toBe("Flux Kontext");
    expect(familyName("Seedance 2.5")).toBe("Seedance");
    expect(familyName("Higgsfield")).toBe("Higgsfield");
    expect(keyOf("Veo 4")).toBe("veo");
    expect(keyOf("Unity AI")).toBe("unity ai");
  });

  it("keeps a name that is only a number", () => {
    expect(familyName("3D")).toBe("3D");
  });
});

describe("what counts as a name", () => {
  it("accepts product-like names", () => {
    for (const n of ["Veo", "Higgsfield", "Unity AI", "Meshy", "Claude Code", "Qwen", "Flux Kontext", "3D Studio"]) expect(validName(n), n).toBe(true);
  });

  it("rejects phrases, companies, numbers and headline words", () => {
    for (const n of ["", "AI", "the best AI tools", "How to use ChatGPT", "OpenAI", "Google", "Microsoft", "This week", "New", "$20M", "2026", "lowercase name", "A very long made up product name here", "Top 10 tools"]) {
      expect(validName(n), n).toBe(false);
    }
  });

  it("cuts a title fragment down to the name", () => {
    expect(cleanName("Veo 4: video, meet audio")).toBe("Veo 4");
    expect(cleanName("the Gemini 2.5 Computer Use model")).toBe("Gemini 2.5 Computer Use");
    expect(cleanName("Kling is now available in Europe")).toBe("Kling");
    expect(cleanName("our new Sora app")).toBe("Sora");
    expect(cleanName("“Pika” – video for everyone")).toBe("Pika");
    expect(cleanName("Zed with agents built in")).toBe("Zed");
    expect(cleanName("how to build agents")).toBe("");
  });
});

describe("names in titles", () => {
  it("reads announcements", () => {
    expect(namesInTitle("Introducing Veo 4: video, meet audio", vendor)).toEqual(["Veo 4"]);
    expect(namesInTitle("Announcing Hunyuan Image, our open model", vendor)).toEqual(["Hunyuan Image"]);
    expect(namesInTitle("Meet Kling, the video generator", vendor)).toEqual(["Kling"]);
    expect(namesInTitle("Luma Dream Machine is now available to everyone", vendor)).toEqual(["Luma Dream Machine"]);
  });

  it("reads press headlines: the thing launched, and a startup that does the launching", () => {
    expect(namesInTitle("Google launches Veo 4, its newest video model", press)).toEqual(["Veo 4"]);
    expect(namesInTitle("Meshy raises $20M to build 3D generation", press)).toEqual(["Meshy"]);
    expect(namesInTitle("Runway unveils Aleph, a video editing model", press)).toEqual(expect.arrayContaining(["Aleph"]));
  });

  it("reads launch-site titles: the name before the tagline, and Show HN", () => {
    expect(namesInTitle("Higgsfield – cinematic AI video in minutes", launch)).toEqual(["Higgsfield"]);
    expect(namesInTitle("Show HN: Foo — an AI notebook", launch)).toEqual(["Foo"]);
    expect(namesInTitle("Meshy | Text to 3D", launch)).toEqual(["Meshy"]);
  });

  it("finds nothing in ordinary headlines", () => {
    for (const t of ["How AI is changing universities", "The week in AI: what you missed", "Why your chatbot lies to you", "OpenAI hires a new chief scientist", "Interview: the future of work"]) {
      expect(namesInTitle(t, press), t).toEqual([]);
    }
  });
});

describe("mentions", () => {
  const known = (name: string) => /^(chatgpt|claude|gemini|runway)$/i.test(name);

  it("turns posts into mentions, one family per product", () => {
    const m = extractMentions([item("Introducing Veo 4: video, meet audio"), item("Veo 3.1 is now available"), item("Introducing Seedance 2.5")], vendor, known);
    expect(m.map((x) => x.key)).toEqual(["veo", "veo", "seedance"]);
    expect(m[0]).toMatchObject({ name: "Veo", kind: "tool", source: vendor });
  });

  it("skips what the catalog already has", () => {
    expect(extractMentions([item("Introducing Gemini 3"), item("Runway launches Gen-5")], vendor, known)).toEqual([]);
  });

  it("marks a model when the headline says so", () => {
    expect(extractMentions([item("Introducing Hunyuan Video, our open video model")], vendor, known)[0].kind).toBe("model");
  });

  it("ignores posts that aren't about AI when the source isn't AI-only", () => {
    expect(extractMentions([item("Introducing Zephyr, a new kettle")], press, known)).toEqual([]);
    expect(extractMentions([item("Introducing Zephyr", "An AI assistant for cooks.")], press, known)).toHaveLength(1);
    expect(aiRelated("A text-to-video model")).toBe(true);
    expect(aiRelated("A new kettle")).toBe(false);
  });
});

describe("posts that are not about a new product", () => {
  it("skips customer stories and generic headlines", () => {
    expect(namesInTitle("Radisson Hotel Group brings hotel discovery into ChatGPT", vendor)).toEqual([]);
    expect(namesInTitle("NVIDIA Announces New Investments in the UK Startup Ecosystem", vendor)).toEqual([]);
    expect(namesInTitle("Google finally launches something", press)).not.toContain("Google finally");
    expect(validName("Investments")).toBe(false);
    expect(validName("Oct. 15th")).toBe(false);
    expect(validName("Google finally")).toBe(false);
  });

  it("still finds real launches", () => {
    expect(namesInTitle("Introducing SynthID Bio", vendor)).toEqual(["SynthID Bio"]);
    expect(namesInTitle("Introducing Playground: Create and play custom games", vendor)).toEqual(["Playground"]);
  });
});
