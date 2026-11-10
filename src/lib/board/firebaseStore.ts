/**
 * The board on Google Firebase: posts in Cloud Firestore, and an anonymous Firebase sign-in per browser
 * (no account, nothing to type). firebase/firestore.rules checks every write, so this file only has to
 * send well-formed writes and turn the rules' refusals into plain messages. Loaded only on the AI Team pages.
 */
import { initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInAnonymously, type Auth } from "firebase/auth";
import {
  Timestamp,
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore/lite";
import blockedWords from "./blocked-words.json";
import { clean, problemWith } from "./rules";
import type { BoardStore, NewPost, Post } from "./store";

export interface FirebaseConfig {
  apiKey: string;
  projectId: string;
  /** For tests: the local emulators' addresses, e.g. { firestore: "127.0.0.1:8080", auth: "http://127.0.0.1:9099" }. */
  emulators?: { firestore: string; auth: string };
  /** For tests: a separate app per simulated browser. */
  appName?: string;
}

/** Reactions are stored under short ids; the page shows the emoji. Keep in step with REACTION_IDS in the rules generator. */
export const REACTION_KEYS: Record<string, string> = { "👍": "up", "❤️": "love", "💡": "idea", "🎉": "party", "🤔": "think" };
const EMOJI = Object.fromEntries(Object.entries(REACTION_KEYS).map(([e, k]) => [k, e]));

/** Seconds between posts from one browser. The rules enforce the same pause. */
export const POST_GAP_MS = 15_000;

const LOOKS: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "@": "a", "5": "s", $: "s", "7": "t" };
const plain = (t: string) => t.toLowerCase().replace(/[01345@$7]/g, (c) => LOOKS[c]);
const SINGLE = new Set((blockedWords as { single: string[] }).single);
const PHRASE = new RegExp(`(^|[^a-z0-9])(${(blockedWords as { phrases: string[] }).phrases.map((p) => p.replace(/ /g, "[^a-z0-9]+")).join("|")})([^a-z0-9]|$)`);

/** Whether text holds a word or phrase on the block list, checked the same way as the rules. */
export const hasBlocked = (t: string) => {
  const p = plain(t);
  return p.split(/[^a-z0-9]+/).some((w) => SINGLE.has(w)) || PHRASE.test(p);
};

const CANT_SHARE = "That post can't be shared. Please reword it.";
const UNREACHABLE = "The board couldn't be reached. Check your connection and try again.";

interface Stored {
  board: string;
  topic: string;
  parentId: string | null;
  name: string;
  body: string;
  uid: string;
  createdAt: Timestamp | null;
  editedAt: Timestamp | null;
  deleted: boolean;
  hidden: boolean;
  reactions: Record<string, number>;
  reports: number;
}

/** The Firebase app for a config, made once per project. */
const apps = new Map<string, { app: FirebaseApp; auth: Auth; db: Firestore }>();
function connect(cfg: FirebaseConfig) {
  const name = cfg.appName ?? `board-${cfg.projectId}`;
  let c = apps.get(name);
  if (!c) {
    const app = initializeApp({ apiKey: cfg.apiKey, projectId: cfg.projectId, authDomain: `${cfg.projectId}.firebaseapp.com` }, name);
    const auth = getAuth(app);
    const db = getFirestore(app);
    if (cfg.emulators) {
      connectAuthEmulator(auth, cfg.emulators.auth, { disableWarnings: true });
      const [host, port] = cfg.emulators.firestore.split(":");
      connectFirestoreEmulator(db, host, Number(port));
    }
    c = { app, auth, db };
    apps.set(name, c);
  }
  return c;
}

export function firebaseStore(cfg: FirebaseConfig, now: () => number = Date.now): BoardStore {
  const { auth, db } = connect(cfg);
  let signingIn: Promise<string> | null = null;
  /** This browser's anonymous id, signing in the first time it's needed. */
  const uid = (): Promise<string> => {
    if (auth.currentUser) return Promise.resolve(auth.currentUser.uid);
    signingIn ??= signInAnonymously(auth)
      .then((c) => c.user.uid)
      .catch((e) => {
        signingIn = null;
        throw e;
      });
    return signingIn;
  };
  // When this browser last posted, kept across pages so the "wait" message stays exact.
  const LAST = "kh-board-last-post";
  const lastPost = () => {
    try {
      return Number(globalThis.localStorage?.getItem(LAST)) || memoryLast;
    } catch {
      return memoryLast;
    }
  };
  let memoryLast = 0;
  const setLastPost = (t: number) => {
    memoryLast = t;
    try {
      globalThis.localStorage?.setItem(LAST, String(t));
    } catch {
      /* Storage blocked: the rules still enforce the pause. */
    }
  };

  /** Runs a call and turns Firebase's errors into the board's plain messages. */
  const run = async <T>(f: () => Promise<T>, denied = CANT_SHARE): Promise<T> => {
    try {
      return await f();
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      if (code.endsWith("permission-denied")) throw new Error(denied);
      if (code.endsWith("not-found")) throw new Error("That post is gone.");
      if (code === "auth/operation-not-allowed" || code === "auth/admin-restricted-operation")
        throw new Error("The board isn't set up yet: anonymous sign-in is turned off in Firebase.");
      if (e instanceof Error && !code) throw e;
      throw new Error(UNREACHABLE);
    }
  };

  const view = (id: string, d: Stored, me: string): Post => ({
    id,
    board: d.board,
    topic: d.topic,
    parentId: d.parentId,
    name: d.deleted ? "deleted" : d.name,
    body: d.deleted ? "" : d.body,
    createdAt: (d.createdAt ?? Timestamp.now()).toDate().toISOString(),
    editedAt: d.editedAt ? d.editedAt.toDate().toISOString() : null,
    deleted: d.deleted,
    reactions: Object.fromEntries(Object.entries(d.reactions ?? {}).filter(([k, n]) => EMOJI[k] && n > 0).map(([k, n]) => [EMOJI[k], n])),
    mine: d.uid === me,
  });

  const posts = collection(db, "posts");
  const postRef = (id: string) => doc(db, "posts", id);
  const read = async (id: string) => {
    const s = await getDoc(postRef(id));
    if (!s.exists()) throw new Error("That post is gone.");
    return s.data() as Stored;
  };

  return {
    shared: true,
    async list(board, topic) {
      return run(async () => {
        const me = await uid();
        const filters = [where("board", "==", board), where("hidden", "==", false), ...(topic ? [where("topic", "==", topic)] : [])];
        const snap = await getDocs(query(posts, ...filters, limit(2000)));
        return snap.docs.map((d) => view(d.id, d.data() as Stored, me)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      }, UNREACHABLE);
    },

    async post(p: NewPost) {
      const problem = problemWith(p.name, p.body);
      if (problem) throw new Error(problem);
      if (hasBlocked(p.name) || hasBlocked(p.body)) throw new Error(CANT_SHARE);
      const wait = Math.ceil((lastPost() + POST_GAP_MS - now()) / 1000);
      if (wait > 0) throw new Error(`You're posting quickly. Try again in ${wait} ${wait === 1 ? "second" : "seconds"}.`);
      await run(async () => {
        const me = await uid();
        if (p.parentId) {
          const parent = await read(p.parentId).catch(() => null);
          if (!parent || parent.deleted) throw new Error("That post is gone, so it can't be replied to.");
          if (parent.parentId) throw new Error("Reply to the original post instead.");
        }
        const batch = writeBatch(db);
        batch.set(doc(posts), {
          board: p.board,
          topic: p.topic,
          parentId: p.parentId,
          name: clean(p.name),
          body: clean(p.body),
          uid: me,
          createdAt: serverTimestamp(),
          editedAt: null,
          deleted: false,
          hidden: false,
          reactions: {},
          reports: 0,
        });
        batch.set(doc(db, "users", me), { lastPost: serverTimestamp() });
        await batch.commit();
      }, `That post couldn't be sent. Wait ${POST_GAP_MS / 1000} seconds between posts, and check it for words the board doesn't allow.`);
      setLastPost(now());
    },

    async edit(id, body) {
      const problem = problemWith("x", body);
      if (problem) throw new Error(problem);
      if (hasBlocked(body)) throw new Error(CANT_SHARE);
      await run(async () => {
        const batch = writeBatch(db);
        batch.update(postRef(id), { body: clean(body), editedAt: serverTimestamp() });
        await batch.commit();
      }, "You can only edit your own posts, from the browser you wrote them in.");
    },

    async remove(id) {
      await run(async () => {
        const me = await uid();
        const target = await read(id);
        const replies = await getDocs(query(posts, where("parentId", "==", id), where("hidden", "==", false), limit(1)));
        if (!replies.empty) {
          const batch = writeBatch(db);
          batch.update(postRef(id), { deleted: true, body: "" });
          await batch.commit();
          return;
        }
        await deleteDoc(postRef(id));
        // Deleting the last reply also clears a stub its deleted parent left behind, when that stub is ours.
        if (target.parentId) {
          const parent = await getDoc(postRef(target.parentId));
          const d = parent.data() as Stored | undefined;
          if (d?.deleted && d.uid === me) {
            const left = await getDocs(query(posts, where("parentId", "==", target.parentId), where("hidden", "==", false), limit(1)));
            if (left.empty) await deleteDoc(postRef(target.parentId));
          }
        }
      }, "You can only delete your own posts, from the browser you wrote them in.");
    },

    async react(id, emoji) {
      const k = REACTION_KEYS[emoji];
      if (!k) throw new Error("That reaction isn't available.");
      return run(async () => {
        const me = await uid();
        const mark = doc(db, "reactions", `${id}_${me}_${k}`);
        const on = (await getDoc(mark)).exists();
        const batch = writeBatch(db);
        if (on) batch.delete(mark);
        else batch.set(mark, { postId: id, uid: me, k });
        batch.update(postRef(id), { [`reactions.${k}`]: increment(on ? -1 : 1) });
        await batch.commit();
        return !on;
      }, "That reaction couldn't be saved. Reload the page and try again.");
    },

    async report(id) {
      await run(async () => {
        const me = await uid();
        const mark = doc(db, "reports", `${id}_${me}`);
        const post = await read(id);
        const batch = writeBatch(db);
        batch.set(mark, { postId: id, uid: me });
        batch.update(postRef(id), { reports: increment(1), hidden: post.reports + 1 >= 3 });
        await batch.commit();
      }, "You've already reported this post. Thanks.");
    },
  };
}
