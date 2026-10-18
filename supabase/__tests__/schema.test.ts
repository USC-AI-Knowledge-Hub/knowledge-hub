import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

const schema = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");
const KEY = "k".repeat(24);
const VOTER = "v".repeat(24);

let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(schema);
}, 60_000);
beforeEach(async () => {
  await db.exec("truncate board_posts, board_reactions, board_reports, board_blocked_words cascade");
});

const post = async (over: Partial<Record<"board" | "topic" | "parent" | "name" | "body" | "key" | "voter", string | null>> = {}) => {
  const a = { board: "claude", topic: "videos", parent: null, name: "Sam", body: "Hello there", key: KEY, voter: VOTER, ...over };
  const r = await db.query<{ board_post: string }>("select board_post($1,$2,$3,$4,$5,$6,$7)", [a.board, a.topic, a.parent, a.name, a.body, a.key, a.voter]);
  return r.rows[0].board_post;
};
const rows = async () => (await db.query<Record<string, unknown>>("select * from board_public order by created_at, id")).rows;
const fails = async (p: Promise<unknown>, message: RegExp) => {
  await expect(p).rejects.toThrow(message);
};

describe("board schema", () => {
  it("runs twice without error", async () => {
    await db.exec(schema);
  });

  it("posts, replies once deep, and keeps secrets out of the public view", async () => {
    const id = await post();
    const reply = await post({ parent: id, body: "A reply", voter: "w".repeat(24) });
    const list = await rows();
    expect(list).toHaveLength(2);
    expect(Object.keys(list[0])).not.toContain("key_hash");
    expect(Object.keys(list[0])).not.toContain("voter");
    await fails(post({ parent: reply, body: "Too deep", voter: "x".repeat(24) }), /original post/);
    await fails(post({ parent: id, board: "gemini", body: "Wrong board", voter: "y".repeat(24) }), /different board/);
  });

  it("checks names, length, links and bad boards", async () => {
    await fails(post({ name: "   " }), /name/);
    await fails(post({ name: "Visit https://x.example" }), /links/);
    await fails(post({ body: "" }), /between 1 and 2000/);
    await fails(post({ body: "x".repeat(2001) }), /between 1 and 2000/);
    await fails(post({ body: "https://a.example https://b.example https://c.example" }), /two links/);
    await fails(post({ board: "Bad Board!" }), /does not exist/);
    await fails(post({ key: "short" }), /Reload/);
  });

  it("blocks words the editors add", async () => {
    await db.exec("insert into board_blocked_words values ('badword')");
    await fails(post({ body: "this has a BadWord inside" }), /reword/);
    await fails(post({ name: "badword" }), /reword/);
  });

  it("limits how fast one person can post", async () => {
    for (let i = 0; i < 5; i++) await post({ body: `post ${i}` });
    await fails(post({ body: "one more" }), /quickly/);
    await post({ body: "a different person", voter: "z".repeat(24), key: "q".repeat(24) });
  });

  it("edits and deletes only with the right key", async () => {
    const id = await post();
    await fails(db.query("select board_edit($1,$2,$3)", [id, "w".repeat(24), "hacked"]), /your own/);
    await db.query("select board_edit($1,$2,$3)", [id, KEY, "Edited text"]);
    let [p] = await rows();
    expect(p.body).toBe("Edited text");
    expect(p.edited_at).not.toBeNull();
    await fails(db.query("select board_delete($1,$2)", [id, "w".repeat(24)]), /your own/);
    await db.query("select board_delete($1,$2)", [id, KEY]);
    [p] = await rows();
    expect(p).toMatchObject({ deleted: true, body: "", name: "deleted" });
    await fails(db.query("select board_edit($1,$2,$3)", [id, KEY, "again"]), /your own/);
  });

  it("toggles reactions and counts them per emoji", async () => {
    const id = await post();
    const react = async (voter: string, emoji = "👍") => (await db.query<{ board_react: boolean }>("select board_react($1,$2,$3)", [id, voter, emoji])).rows[0].board_react;
    expect(await react("a".repeat(24))).toBe(true);
    expect(await react("b".repeat(24))).toBe(true);
    expect(await react("b".repeat(24), "💡")).toBe(true);
    expect((await rows())[0].reactions).toEqual({ "👍": 2, "💡": 1 });
    expect(await react("a".repeat(24))).toBe(false);
    expect((await rows())[0].reactions).toEqual({ "👍": 1, "💡": 1 });
    await fails(react("a".repeat(24), "💀"), /isn't available/);
  });

  it("hides a post once three different people report it", async () => {
    const id = await post();
    const report = (v: string) => db.query("select board_report($1,$2)", [id, v]);
    await report("a".repeat(24));
    await report("a".repeat(24));
    await report("b".repeat(24));
    expect(await rows()).toHaveLength(1);
    await report("c".repeat(24));
    expect(await rows()).toHaveLength(0);
    const hidden = await db.query<{ hidden: boolean }>("select hidden from board_posts where id = $1", [id]);
    expect(hidden.rows[0].hidden).toBe(true);
  });

  it("removes replies with their post", async () => {
    const id = await post();
    await post({ parent: id, body: "reply", voter: "w".repeat(24) });
    await db.query("delete from board_posts where id = $1", [id]);
    expect(await rows()).toHaveLength(0);
  });
});
