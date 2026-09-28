import { describe, expect, it } from "vitest";
import { trimRepetition } from "../prompt";
import { ground } from "../retrieval";

describe("trimRepetition", () => {
  const loop = "Give the engineer the responsibility of reviewing the draft and asking them if they can be reviewed.";
  it("cuts a looping answer at the first repeat", () => {
    const out = trimRepetition(`Here's how. ${loop}\n${loop}\n${loop}\n${loop}`);
    expect(out.looping).toBe(true);
    expect(out.text).toBe(`Here's how. ${loop}`);
  });
  it("leaves normal answers alone, including one still streaming", () => {
    const text = "Give context. Show an example. Then give con";
    expect(trimRepetition(text)).toEqual({ text, looping: false });
  });
  it("ignores short repeated fragments like list markers", () => {
    expect(trimRepetition("Yes. Yes. It works.").looping).toBe(false);
  });
});

describe("ground", () => {
  it("grounds a prompting question in the prompting lesson only", () => {
    const g = ground("how do I do prompt engineering");
    expect(g.sources.map((s) => s.title)).toEqual(["Prompting that works"]);
    expect(g.notes).not.toMatch(/Wh|electricity/);
  });
  it("still uses quest notes when the question clearly matches them", () => {
    const g = ground("how much electricity does one prompt use");
    expect(g.notes).toMatch(/0\.24 Wh/);
  });
});
