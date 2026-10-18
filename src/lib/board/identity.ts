/**
 * Who a browser is, without an account. A random voter id (used for reactions, reports and rate limits),
 * a secret key per post (proves a post is yours when you edit or delete it), and the name you last used.
 * All of it stays in this browser's storage; clearing it means you can no longer edit old posts.
 */
export type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

const KEYS = "kh-board-keys";
const VOTER = "kh-board-voter";
const NAME = "kh-board-name";
const REACTED = "kh-board-reacted";
const REPORTED = "kh-board-reported";

const random = () => {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
};

const read = <T>(s: Storage, key: string, fallback: T): T => {
  try {
    const raw = s.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (s: Storage, key: string, value: unknown) => {
  try {
    s.setItem(key, JSON.stringify(value));
  } catch {
    /* Storage can be full or blocked: the board still works, it just can't remember. */
  }
};

export function identity(s: Storage = localStorage) {
  const memory = new Map<string, string>();
  return {
    voter(): string {
      let v = read<string>(s, VOTER, "");
      if (typeof v !== "string" || v.length < 16) {
        v = random();
        write(s, VOTER, v);
      }
      return v;
    },
    newKey: random,
    rememberKey(postId: string, key: string) {
      memory.set(postId, key);
      write(s, KEYS, { ...read<Record<string, string>>(s, KEYS, {}), [postId]: key });
    },
    keyFor(postId: string): string | undefined {
      return memory.get(postId) ?? read<Record<string, string>>(s, KEYS, {})[postId];
    },
    forgetKey(postId: string) {
      const all = read<Record<string, string>>(s, KEYS, {});
      delete all[postId];
      write(s, KEYS, all);
    },
    name: () => read<string>(s, NAME, ""),
    setName: (n: string) => write(s, NAME, n),
    reacted: () => new Set(read<string[]>(s, REACTED, [])),
    setReacted: (set: Set<string>) => write(s, REACTED, [...set]),
    reported: () => new Set(read<string[]>(s, REPORTED, [])),
    setReported: (set: Set<string>) => write(s, REPORTED, [...set]),
  };
}
export type Identity = ReturnType<typeof identity>;
