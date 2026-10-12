import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_SAVED_CHARS, MAX_SAVED_MESSAGES, loadChat, saveChat, trimSaved, type Message } from "../assistant";

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});
afterEach(() => vi.unstubAllGlobals());

const msg = (i: number, size = 10): Message => ({ role: i % 2 ? "assistant" : "user", content: `m${i} ${"x".repeat(size)}` });

describe("saved conversation", () => {
  it("round-trips a conversation", () => {
    const chat = [msg(0), msg(1), msg(2)];
    saveChat(chat);
    expect(loadChat()).toEqual(chat);
  });

  it("clears the saved copy when the chat is empty", () => {
    saveChat([msg(0)]);
    saveChat([]);
    expect(store.size).toBe(0);
    expect(loadChat()).toEqual([]);
  });

  it("keeps only the recent messages, starting on a question", () => {
    const many = Array.from({ length: MAX_SAVED_MESSAGES + 5 }, (_, i) => msg(i));
    const kept = trimSaved(many);
    expect(kept.length).toBeLessThanOrEqual(MAX_SAVED_MESSAGES);
    expect(kept[0].role).toBe("user");
    expect(kept.at(-1)).toEqual(many.at(-1));
  });

  it("keeps the saved size bounded", () => {
    const big = Array.from({ length: 20 }, (_, i) => msg(i, 20_000));
    const kept = trimSaved(big);
    expect(kept.reduce((n, m) => n + m.content.length, 0)).toBeLessThanOrEqual(MAX_SAVED_CHARS);
    expect(kept.length).toBeGreaterThan(0);
  });

  it("survives corrupt or hand-edited storage", () => {
    store.set("kh-assistant-chat", "{not json");
    expect(loadChat()).toEqual([]);
    store.set("kh-assistant-chat", JSON.stringify({ a: 1 }));
    expect(loadChat()).toEqual([]);
    store.set("kh-assistant-chat", JSON.stringify([{ role: "user", content: "ok" }, { role: "system", content: "no" }, { role: "assistant" }, null, { role: "assistant", content: "" }]));
    expect(loadChat()).toEqual([{ role: "user", content: "ok" }]);
  });

  it("still works when storage is blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    expect(loadChat()).toEqual([]);
    expect(() => saveChat([msg(0)])).not.toThrow();
  });
});
