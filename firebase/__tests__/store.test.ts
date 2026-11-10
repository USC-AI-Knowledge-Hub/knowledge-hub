/**
 * The page's Firebase code against the Auth and Firestore emulators with the real rules: what a student
 * does on the board, end to end. Run with npm run test:firebase (it starts the emulators).
 */
import { describe, expect, it } from "vitest";
import { firebaseStore, hasBlocked } from "../../src/lib/board/firebaseStore";
import { encodeRec, recsFrom, REC_BOARD, VOTE } from "../../src/lib/board/recs";

let n = 0;
/** A separate simulated browser, with its own anonymous sign-in. */
const browser = (now?: () => number) =>
  firebaseStore(
    { apiKey: "demo-key", projectId: "demo-kh", appName: `browser-${++n}-${Date.now()}`, emulators: { firestore: process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080", auth: `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099"}` } },
    now,
  );
const board = () => `b-${Date.now()}-${++n}`;

describe("the board on Firebase", () => {
  it("posts, lists, replies, reacts, edits and deletes", async () => {
    const b = board();
    const ana = browser();
    const ben = browser();
    await ana.post({ board: b, topic: "questions", parentId: null, name: "Ana", body: "How do I start?" });
    const [top] = await ben.list(b);
    expect(top).toMatchObject({ name: "Ana", body: "How do I start?", parentId: null, mine: false });
    expect((await ana.list(b))[0].mine).toBe(true);

    await ben.post({ board: b, topic: "questions", parentId: top.id, name: "Ben", body: "Try the first course." });
    expect(await ben.react(top.id, "👍")).toBe(true);
    expect(await ana.react(top.id, "👍")).toBe(true);
    expect(await ben.react(top.id, "👍")).toBe(false);
    expect((await ana.list(b)).find((p) => p.id === top.id)?.reactions).toEqual({ "👍": 1 });

    await ana.edit(top.id, "How do I start? (beginner)");
    await expect(ben.edit(top.id, "Mine now")).rejects.toThrow(/your own posts/);
    // With a reply hanging from it, deleting leaves a stub.
    await ana.remove(top.id);
    const after = await ben.list(b);
    expect(after.find((p) => p.id === top.id)).toMatchObject({ deleted: true, name: "deleted", body: "" });
    // Deleting the last reply leaves the stub to the author, who can clear it.
    const reply = after.find((p) => p.parentId === top.id)!;
    await ben.remove(reply.id);
    expect((await ben.list(b)).map((p) => p.id)).toEqual([top.id]);
  });

  it("says why a post can't be sent, before and after sending", async () => {
    const b = board();
    let t = 1_000_000;
    const ana = browser(() => t);
    await expect(ana.post({ board: b, topic: "q", parentId: null, name: "Ana", body: "what the fuck" })).rejects.toThrow(/reword/);
    await ana.post({ board: b, topic: "q", parentId: null, name: "Ana", body: "First" });
    await expect(ana.post({ board: b, topic: "q", parentId: null, name: "Ana", body: "Second" })).rejects.toThrow(/Try again in 15 seconds/);
    t += 16_000;
    // The page's clock says go, but the database's pause hasn't passed: its refusal is explained too.
    await expect(ana.post({ board: b, topic: "q", parentId: null, name: "Ana", body: "Second" })).rejects.toThrow(/Wait 15 seconds/);
  });

  it("hides a post after three reports", async () => {
    const b = board();
    const ana = browser();
    await ana.post({ board: b, topic: "q", parentId: null, name: "Ana", body: "Something odd" });
    const [p] = await ana.list(b);
    const [x, y, z] = [browser(), browser(), browser()];
    await x.report(p.id);
    await expect(x.report(p.id)).rejects.toThrow(/already reported/);
    await y.report(p.id);
    expect(await ana.list(b)).toHaveLength(1);
    await z.report(p.id);
    expect(await ana.list(b)).toHaveLength(0);
  });

  it("carries video picks and their votes", async () => {
    const ana = browser();
    const ben = browser();
    await ana.post({ board: REC_BOARD, topic: "found", parentId: null, name: "Ana", body: encodeRec({ headline: "Best RAG intro", videoId: "b1j0Hf1GqZE", why: "" }) });
    const mine = (await ana.list(REC_BOARD)).find((p) => p.name === "Ana" && p.mine)!;
    await ben.react(mine.id, VOTE);
    const recs = recsFrom(await ben.list(REC_BOARD)).filter((r) => r.id === mine.id);
    expect(recs).toMatchObject([{ headline: "Best RAG intro", votes: 1, mine: false }]);
  });

  it("matches the block list the way the rules do", () => {
    expect(hasBlocked("pain in the @$$")).toBe(true);
    expect(hasBlocked("a camel  jockey")).toBe(true);
    expect(hasBlocked("The class assessment")).toBe(false);
  });
});
