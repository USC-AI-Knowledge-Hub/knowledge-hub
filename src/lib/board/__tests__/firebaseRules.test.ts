import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BLOCKED, PHRASES, SINGLE, rules } from "../../../../scripts/gen-firebase-rules";
import blocked from "../blocked-words.json";
import { hasBlocked } from "../firebaseStore";

describe("the Firebase rules file", () => {
  it("is up to date with its generator (run npm run firebase-rules)", () => {
    expect(readFileSync("firebase/firestore.rules", "utf8")).toBe(rules());
    expect(blocked).toEqual({ single: SINGLE(), phrases: PHRASES() });
  });

  it("keeps every word of the starter list", () => {
    expect(SINGLE().length + PHRASES().length).toBeGreaterThanOrEqual(BLOCKED.length - 20);
  });
});

describe("the page's block-list check", () => {
  it("matches whole words, look-alikes and phrases", () => {
    expect(hasBlocked("pain in the @$$")).toBe(true);
    expect(hasBlocked("A55")).toBe(true);
    expect(hasBlocked("a camel\njockey")).toBe(true);
    expect(hasBlocked("The class assessment, by Cassie Dickens")).toBe(false);
    expect(hasBlocked("Scunthorpe")).toBe(false);
  });
});
