/**
 * The security rules, attacked directly: the Firestore emulator runs firebase/firestore.rules and these
 * writes try what a page never would. Run with npm run test:firebase (it starts the emulators).
 */
import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, getDocs, increment, query, collection, serverTimestamp, setDoc, updateDoc, where, writeBatch, Timestamp } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

let env: RulesTestEnvironment;
beforeAll(async () => {
  const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080").split(":");
  env = await initializeTestEnvironment({ projectId: "demo-kh", firestore: { rules: readFileSync("firebase/firestore.rules", "utf8"), host, port: Number(port) } });
});
afterAll(() => env?.cleanup());
beforeEach(() => env.clearFirestore());

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const fresh = (uid: string, over: Record<string, unknown> = {}) => ({
  board: "tools", topic: "videos", parentId: null, name: "Sam", body: "Hello there", uid,
  createdAt: serverTimestamp(), editedAt: null, deleted: false, hidden: false, reactions: {}, reports: 0, ...over,
});
/** A post the way the page writes it: the post and this browser's last-post stamp together. */
const write = (uid: string, id: string, over: Record<string, unknown> = {}) => {
  const db = as(uid);
  const b = writeBatch(db);
  b.set(doc(db, "posts", id), fresh(uid, over));
  b.set(doc(db, "users", uid), { lastPost: serverTimestamp() });
  return b.commit();
};
/** Puts a post in place without the rules, for tests that start from one. */
const seed = (id: string, data: Record<string, unknown>) =>
  env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), "posts", id), { ...fresh("alice"), createdAt: Timestamp.now(), ...data }));

describe("posting", () => {
  it("accepts a well-formed post", async () => {
    await assertSucceeds(write("alice", "p1"));
  });

  it("refuses posts that aren't signed in, aren't yours, or skip the stamp", async () => {
    const anon = env.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(anon, "posts", "x"), fresh("alice")));
    await assertFails(write("alice", "x", { uid: "bob" }));
    await assertFails(setDoc(doc(as("alice"), "posts", "x"), fresh("alice")));
  });

  it("checks names, lengths, links, ids and starting values", async () => {
    for (const bad of [
      { name: "" }, { name: "x".repeat(41) }, { name: "visit www.spam.example" }, { name: " Sam" },
      { body: "" }, { body: "x".repeat(2001) }, { body: "https://a.example https://b.example www.c.example" },
      { board: "Bad Board" }, { topic: "x".repeat(41) },
      { reactions: { up: 99 } }, { reports: 2 }, { hidden: true }, { deleted: true },
      { createdAt: Timestamp.fromDate(new Date("2020-01-01")) }, { extra: "field" },
    ]) await assertFails(write("alice", `bad-${Object.keys(bad)[0]}`, bad));
    await assertSucceeds(write("alice", "two-links", { body: "https://a.example and www.b.example" }));
  });

  it("blocks listed words whole, through look-alikes, and lets ordinary words through", async () => {
    await assertFails(write("a1", "x1", { body: "what a pain in the @$$" }));
    await assertFails(write("a2", "x2", { name: "A55" }));
    await assertFails(write("a3", "x3", { body: "line one\nthen FUCK" }));
    await assertFails(write("a6", "x6", { body: "a camel  jockey" }));
    await assertSucceeds(write("a4", "ok1", { body: "The class assessment was hard" }));
    await assertSucceeds(write("a5", "ok2", { name: "Cassie Dickens" }));
  });

  it("makes a browser wait between posts", async () => {
    await assertSucceeds(write("alice", "first"));
    await assertFails(write("alice", "second"));
    await assertSucceeds(write("bob", "other-person"));
  });

  it("allows replies one deep, on the same board and topic, to live posts", async () => {
    await seed("top", {});
    await assertSucceeds(write("bob", "r1", { parentId: "top" }));
    await seed("reply", { parentId: "top" });
    await assertFails(write("carol", "r2", { parentId: "reply" }));
    await assertFails(write("dan", "r3", { parentId: "top", board: "claude-101" }));
    await assertFails(write("erin", "r4", { parentId: "missing" }));
    await seed("gone", { deleted: true, body: "" });
    await assertFails(write("fay", "r5", { parentId: "gone" }));
  });
});

describe("reading", () => {
  it("lists only posts that aren't hidden, and only when the list asks for that", async () => {
    await seed("shown", {});
    await seed("hid", { hidden: true });
    const db = as("bob");
    const snap = await assertSucceeds(getDocs(query(collection(db, "posts"), where("board", "==", "tools"), where("hidden", "==", false))));
    expect(snap.docs.map((d) => d.id)).toEqual(["shown"]);
    await assertFails(getDocs(query(collection(db, "posts"), where("board", "==", "tools"))));
    await assertFails(getDoc(doc(db, "posts", "hid")));
  });
});

describe("editing and deleting", () => {
  beforeEach(() => seed("p", {}));

  it("lets the author edit the text only", async () => {
    const db = as("alice");
    await assertSucceeds(updateDoc(doc(db, "posts", "p"), { body: "Better", editedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, "posts", "p"), { name: "Someone else", editedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, "posts", "p"), { body: "fuck this", editedAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(as("bob"), "posts", "p"), { body: "Mine now", editedAt: serverTimestamp() }));
  });

  it("lets only the author delete or leave a stub", async () => {
    await assertFails(deleteDoc(doc(as("bob"), "posts", "p")));
    await assertFails(updateDoc(doc(as("bob"), "posts", "p"), { deleted: true, body: "" }));
    await assertSucceeds(updateDoc(doc(as("alice"), "posts", "p"), { deleted: true, body: "" }));
    await assertFails(updateDoc(doc(as("alice"), "posts", "p"), { body: "Back again", editedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(doc(as("alice"), "posts", "p")));
  });
});

describe("reactions", () => {
  beforeEach(() => seed("p", {}));
  const react = (uid: string, k: string, by = 1, mark = true) => {
    const db = as(uid);
    const b = writeBatch(db);
    if (mark) b.set(doc(db, "reactions", `p_${uid}_${k}`), { postId: "p", uid, k });
    b.update(doc(db, "posts", "p"), { [`reactions.${k}`]: increment(by) });
    return b.commit();
  };

  it("counts one of each kind per person, and takes it back", async () => {
    await assertSucceeds(react("bob", "up"));
    await assertFails(react("bob", "up"));
    await assertSucceeds(react("carol", "up"));
    await assertSucceeds(react("bob", "love"));
    const db = as("bob");
    const b = writeBatch(db);
    b.delete(doc(db, "reactions", "p_bob_up"));
    b.update(doc(db, "posts", "p"), { "reactions.up": increment(-1) });
    await assertSucceeds(b.commit());
    let after: Record<string, unknown> | undefined;
    await env.withSecurityRulesDisabled(async (c) => {
      after = (await getDoc(doc(c.firestore(), "posts", "p"))).data();
    });
    expect(after?.reactions).toEqual({ up: 1, love: 1 });
  });

  it("lets a browser check its own reaction, even one it hasn't made", async () => {
    await assertSucceeds(getDoc(doc(as("bob"), "reactions", "p_bob_up")));
    await assertSucceeds(react("carol", "up"));
    await assertFails(getDoc(doc(as("bob"), "reactions", "p_carol_up")));
  });

  it("refuses counts that don't match a reaction, jumps, and unknown kinds", async () => {
    await assertFails(react("bob", "up", 1, false));
    await assertFails(react("bob", "up", 5));
    await assertFails(react("bob", "nope"));
    await assertFails(setDoc(doc(as("bob"), "reactions", "p_carol_up"), { postId: "p", uid: "carol", k: "up" }));
  });
});

describe("reports", () => {
  beforeEach(() => seed("p", {}));
  const report = (uid: string, n: number) => {
    const db = as(uid);
    const b = writeBatch(db);
    b.set(doc(db, "reports", `p_${uid}`), { postId: "p", uid });
    b.update(doc(db, "posts", "p"), { reports: increment(1), hidden: n >= 3 });
    return b.commit();
  };

  it("takes one report per person and hides the post at three", async () => {
    await assertSucceeds(report("a", 1));
    await assertFails(report("a", 2));
    await assertFails(report("b", 3));
    await assertSucceeds(report("b", 2));
    await assertSucceeds(report("c", 3));
    await assertFails(getDoc(doc(as("d"), "posts", "p")));
  });

  it("refuses unhiding or bumping the count without a report", async () => {
    const db = as("bob");
    await assertFails(updateDoc(doc(db, "posts", "p"), { reports: increment(1), hidden: false }));
    await assertFails(updateDoc(doc(db, "posts", "p"), { hidden: true }));
  });
});
