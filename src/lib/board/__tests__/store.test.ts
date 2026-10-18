import { describe, expect, it } from "vitest";
import { identity } from "../identity";
import { ago, linkCount, problemWith } from "../rules";
import { localStore, supabaseStore } from "../store";

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};
const draft = { board: "claude", topic: "videos", parentId: null, name: "Sam", body: "Hello" };

describe("rules", () => {
  it("says what is wrong with a post", () => {
    expect(problemWith("", "hi")).toMatch(/name/);
    expect(problemWith("Sam", "  ")).toMatch(/something/);
    expect(problemWith("Sam", "x".repeat(2001))).toMatch(/over/);
    expect(problemWith("https://x.example", "hi")).toMatch(/links/);
    expect(problemWith("Sam", "a https://a.example b http://b.example www.c.example")).toMatch(/at most 2/);
    expect(problemWith("Sam", "fine")).toBe("");
    expect(linkCount("www.x.example and https://y.example")).toBe(2);
  });

  it("describes time plainly", () => {
    const now = Date.parse("2026-10-15T12:00:00Z");
    expect(ago("2026-10-15T11:59:50Z", now)).toBe("just now");
    expect(ago("2026-10-15T11:55:00Z", now)).toBe("5 minutes ago");
    expect(ago("2026-10-15T10:00:00Z", now)).toBe("2 hours ago");
    expect(ago("2026-10-12T12:00:00Z", now)).toBe("3 days ago");
  });
});

describe("a board kept on this device", () => {
  const make = () => {
    const s = memory();
    return localStore(s, identity(s));
  };

  it("posts, replies once deep, and shows newest state", async () => {
    const store = make();
    await store.post(draft);
    const [top] = await store.list("claude");
    await store.post({ ...draft, parentId: top.id, body: "A reply" });
    const [, reply] = await store.list("claude");
    await expect(store.post({ ...draft, parentId: reply.id })).rejects.toThrow(/original post/);
    expect(await store.list("gemini")).toEqual([]);
    expect(await store.list("claude", "articles")).toEqual([]);
    expect((await store.list("claude", "videos")).length).toBe(2);
  });

  it("lets you edit and delete your own posts, and nobody else's", async () => {
    const s = memory();
    const mine = localStore(s, identity(s));
    await mine.post(draft);
    const [p] = await mine.list("claude");
    await mine.edit(p.id, "Edited");
    expect((await mine.list("claude"))[0]).toMatchObject({ body: "Edited" });
    expect((await mine.list("claude"))[0].editedAt).not.toBeNull();
    // Someone else's browser shares the posts but not the key.
    const other = memory();
    other.setItem("kh-board-local", s.getItem("kh-board-local")!);
    const theirs = localStore(other, identity(other));
    await expect(theirs.edit(p.id, "Hacked")).rejects.toThrow(/your own/);
    await expect(theirs.remove(p.id)).rejects.toThrow(/your own/);
    await mine.remove(p.id);
    expect(await mine.list("claude")).toEqual([]);
  });

  it("keeps a stub for a deleted post with replies and clears it with the last reply", async () => {
    const s = memory();
    const store = localStore(s, identity(s));
    await store.post(draft);
    const [top] = await store.list("claude");
    await store.post({ ...draft, parentId: top.id, body: "reply" });
    await store.remove(top.id);
    let list = await store.list("claude");
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ deleted: true, body: "", name: "deleted" });
    await store.remove(list[1].id);
    list = await store.list("claude");
    expect(list).toEqual([]);
  });

  it("toggles reactions and hides a post after three reports", async () => {
    const s = memory();
    const store = localStore(s, identity(s));
    await store.post(draft);
    const [p] = await store.list("claude");
    expect(await store.react(p.id, "👍")).toBe(true);
    expect((await store.list("claude"))[0].reactions).toEqual({ "👍": 1 });
    expect(await store.react(p.id, "👍")).toBe(false);
    expect((await store.list("claude"))[0].reactions).toEqual({});
    for (const v of ["a", "b", "c"]) {
      const o = memory();
      o.setItem("kh-board-local", s.getItem("kh-board-local")!);
      await localStore(o, identity(o)).report(p.id);
      s.setItem("kh-board-local", o.getItem("kh-board-local")!);
      expect(v).toBeTruthy();
    }
    expect(await store.list("claude")).toEqual([]);
  });
});

describe("a shared board", () => {
  const cfg = { url: "https://x.supabase.co/", anonKey: "anon" };

  it("reads through the public view and writes through the functions", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.includes("/rpc/board_post")) return new Response(JSON.stringify("11111111-1111-1111-1111-111111111111"), { status: 200 });
      if (url.includes("/board_public")) return new Response(JSON.stringify([{ id: "a", board: "claude", topic: "videos", parent_id: null, name: "Sam", body: "Hi", created_at: "2026-10-15T00:00:00Z", edited_at: null, deleted: false, reactions: { "👍": 2 } }]), { status: 200 });
      return new Response("", { status: 200 });
    }) as unknown as typeof fetch;
    const s = memory();
    const id = identity(s);
    const store = supabaseStore(cfg, id, fetchImpl);
    const posts = await store.list("claude", "videos");
    expect(posts[0]).toMatchObject({ id: "a", parentId: null, reactions: { "👍": 2 } });
    expect(calls[0].url).toContain("https://x.supabase.co/rest/v1/board_public?");
    expect(calls[0].url).toContain("board=eq.claude");
    expect(calls[0].url).toContain("topic=eq.videos");
    await store.post(draft);
    const body = JSON.parse(String(calls[1].init?.body));
    expect(body).toMatchObject({ p_board: "claude", p_topic: "videos", p_parent: null, p_name: "Sam", p_body: "Hello" });
    expect(String(body.p_key).length).toBeGreaterThanOrEqual(16);
    expect(id.keyFor("11111111-1111-1111-1111-111111111111")).toBe(body.p_key);
    await store.edit("11111111-1111-1111-1111-111111111111", "Edited");
    expect(JSON.parse(String(calls[2].init?.body)).p_key).toBe(body.p_key);
  });

  it("shows the database's message for a refused post, and a plain one when it can't be reached", async () => {
    const refuse = (async () => new Response(JSON.stringify({ message: "You're posting quickly. Try again in a few minutes." }), { status: 400 })) as unknown as typeof fetch;
    await expect(supabaseStore(cfg, identity(memory()), refuse).post(draft)).rejects.toThrow(/posting quickly/);
    const down = (async () => {
      throw new TypeError("network");
    }) as unknown as typeof fetch;
    await expect(supabaseStore(cfg, identity(memory()), down).list("claude")).rejects.toThrow(/couldn't be reached/);
    const broken = (async () => new Response("oops", { status: 503 })) as unknown as typeof fetch;
    await expect(supabaseStore(cfg, identity(memory()), broken).list("claude")).rejects.toThrow(/couldn't be reached/);
  });

  it("won't edit or delete a post whose key it doesn't have", async () => {
    const never = (async () => new Response("", { status: 200 })) as unknown as typeof fetch;
    const store = supabaseStore(cfg, identity(memory()), never);
    await expect(store.edit("x", "hi")).rejects.toThrow(/your own/);
    await expect(store.remove("x")).rejects.toThrow(/your own/);
  });
});
