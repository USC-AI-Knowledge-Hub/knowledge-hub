import { identity, type Identity, type Storage } from "./identity";
import { clean, problemWith } from "./rules";

export interface Post {
  id: string;
  tool: string;
  topic: string;
  parentId: string | null;
  name: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  deleted: boolean;
  reactions: Record<string, number>;
}

export interface NewPost {
  tool: string;
  topic: string;
  parentId: string | null;
  name: string;
  body: string;
}

/** Everything the board does, behind one shape so the page doesn't care where posts live. */
export interface BoardStore {
  /** True when posts are shared with everyone; false when they stay on this device. */
  shared: boolean;
  list(tool: string, topic?: string): Promise<Post[]>;
  post(p: NewPost): Promise<void>;
  edit(id: string, body: string): Promise<void>;
  remove(id: string): Promise<void>;
  /** Adds the reaction, or takes it back if it was already given. Returns whether it is now on. */
  react(id: string, emoji: string): Promise<boolean>;
  report(id: string): Promise<void>;
}

export interface BoardConfig {
  url: string;
  anonKey: string;
}

const uuid = () => crypto.randomUUID();

/** Posts kept in this browser only. Used until a shared database is connected, and in tests. */
export function localStore(storage: Storage = localStorage, id: Identity = identity(storage), now: () => Date = () => new Date()): BoardStore {
  interface Row extends Omit<Post, "reactions"> {
    reactions: Record<string, string[]>;
    reports: string[];
  }
  const KEY = "kh-board-local";
  const load = (): Row[] => {
    try {
      return JSON.parse(storage.getItem(KEY) ?? "[]") as Row[];
    } catch {
      return [];
    }
  };
  const save = (rows: Row[]) => {
    try {
      storage.setItem(KEY, JSON.stringify(rows));
    } catch {
      throw new Error("This browser can't save posts right now. Free some space and try again.");
    }
  };
  const view = (r: Row): Post => ({
    id: r.id,
    tool: r.tool,
    topic: r.topic,
    parentId: r.parentId,
    name: r.deleted ? "deleted" : r.name,
    body: r.deleted ? "" : r.body,
    createdAt: r.createdAt,
    editedAt: r.editedAt,
    deleted: r.deleted,
    reactions: Object.fromEntries(Object.entries(r.reactions).filter(([, v]) => v.length).map(([k, v]) => [k, v.length])),
  });
  const find = (rows: Row[], postId: string) => {
    const r = rows.find((x) => x.id === postId);
    if (!r) throw new Error("That post is gone.");
    return r;
  };
  return {
    shared: false,
    async list(tool, topic) {
      return load()
        .filter((r) => r.tool === tool && (!topic || r.topic === topic) && r.reports.length < 3)
        .map(view);
    },
    async post(p) {
      const problem = problemWith(p.name, p.body);
      if (problem) throw new Error(problem);
      const rows = load();
      if (p.parentId) {
        const parent = rows.find((r) => r.id === p.parentId);
        if (!parent || parent.deleted) throw new Error("That post is gone, so it can't be replied to.");
        if (parent.parentId) throw new Error("Reply to the original post instead.");
      }
      const postId = uuid();
      id.rememberKey(postId, id.newKey());
      rows.push({ id: postId, tool: p.tool, topic: p.topic, parentId: p.parentId, name: clean(p.name), body: clean(p.body), createdAt: now().toISOString(), editedAt: null, deleted: false, reactions: {}, reports: [] });
      save(rows);
    },
    async edit(postId, body) {
      const b = clean(body);
      const problem = problemWith("x", b);
      if (problem) throw new Error(problem);
      const rows = load();
      const r = find(rows, postId);
      if (!id.keyFor(postId) || r.deleted) throw new Error("You can only edit your own posts, in the browser you wrote them in.");
      r.body = b;
      r.editedAt = now().toISOString();
      save(rows);
    },
    async remove(postId) {
      const rows = load();
      const r = find(rows, postId);
      if (!id.keyFor(postId)) throw new Error("You can only delete your own posts, in the browser you wrote them in.");
      r.deleted = true;
      r.body = "";
      save(rows);
    },
    async react(postId, emoji) {
      const rows = load();
      const r = find(rows, postId);
      const voters = (r.reactions[emoji] ??= []);
      const me = id.voter();
      const at = voters.indexOf(me);
      if (at >= 0) voters.splice(at, 1);
      else voters.push(me);
      save(rows);
      return at < 0;
    },
    async report(postId) {
      const rows = load();
      const r = find(rows, postId);
      const me = id.voter();
      if (!r.reports.includes(me)) r.reports.push(me);
      save(rows);
    },
  };
}

interface Row {
  id: string;
  tool: string;
  topic: string;
  parent_id: string | null;
  name: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  deleted: boolean;
  reactions: Record<string, number> | null;
}

/** Posts kept in a shared Supabase database (supabase/schema.sql), reached over its REST address. */
export function supabaseStore(cfg: BoardConfig, id: Identity = identity(), fetchImpl: typeof fetch = (...a) => fetch(...a)): BoardStore {
  const base = cfg.url.replace(/\/+$/, "");
  const headers = { apikey: cfg.anonKey, authorization: `Bearer ${cfg.anonKey}`, "content-type": "application/json" };
  const fail = async (res: Response): Promise<never> => {
    let message = "";
    try {
      message = ((await res.json()) as { message?: string }).message ?? "";
    } catch {
      /* Not JSON. */
    }
    throw new Error(message && res.status < 500 ? message : "The board couldn't be reached. Check your connection and try again.");
  };
  const call = async <T>(fn: string, args: Record<string, unknown>): Promise<T> => {
    let res: Response;
    try {
      res = await fetchImpl(`${base}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(args) });
    } catch {
      throw new Error("The board couldn't be reached. Check your connection and try again.");
    }
    if (!res.ok) await fail(res);
    const text = await res.text();
    return (text ? JSON.parse(text) : null) as T;
  };
  return {
    shared: true,
    async list(tool, topic) {
      const q = new URLSearchParams({ tool: `eq.${tool}`, order: "created_at.asc", limit: "1000" });
      if (topic) q.set("topic", `eq.${topic}`);
      let res: Response;
      try {
        res = await fetchImpl(`${base}/rest/v1/board_public?${q}`, { headers });
      } catch {
        throw new Error("The board couldn't be reached. Check your connection and try again.");
      }
      if (!res.ok) await fail(res);
      return ((await res.json()) as Row[]).map((r) => ({
        id: r.id,
        tool: r.tool,
        topic: r.topic,
        parentId: r.parent_id,
        name: r.name,
        body: r.body,
        createdAt: r.created_at,
        editedAt: r.edited_at,
        deleted: r.deleted,
        reactions: r.reactions ?? {},
      }));
    },
    async post(p) {
      const problem = problemWith(p.name, p.body);
      if (problem) throw new Error(problem);
      const key = id.newKey();
      const newId = await call<string>("board_post", { p_tool: p.tool, p_topic: p.topic, p_parent: p.parentId, p_name: p.name, p_body: p.body, p_key: key, p_voter: id.voter() });
      id.rememberKey(newId, key);
    },
    async edit(postId, body) {
      const problem = problemWith("x", body);
      if (problem) throw new Error(problem);
      const key = id.keyFor(postId);
      if (!key) throw new Error("You can only edit your own posts, in the browser you wrote them in.");
      await call("board_edit", { p_id: postId, p_key: key, p_body: body });
    },
    async remove(postId) {
      const key = id.keyFor(postId);
      if (!key) throw new Error("You can only delete your own posts, in the browser you wrote them in.");
      await call("board_delete", { p_id: postId, p_key: key });
    },
    react: (postId, emoji) => call<boolean>("board_react", { p_id: postId, p_voter: id.voter(), p_emoji: emoji }),
    async report(postId) {
      await call("board_report", { p_id: postId, p_voter: id.voter() });
    },
  };
}

/** The shared board when the site was built with a database address, otherwise this device's own. */
export function makeStore(cfg: Partial<BoardConfig> | undefined, id: Identity = identity()): BoardStore {
  return cfg?.url && cfg.anonKey ? supabaseStore({ url: cfg.url, anonKey: cfg.anonKey }, id) : localStore(localStorage, id);
}
