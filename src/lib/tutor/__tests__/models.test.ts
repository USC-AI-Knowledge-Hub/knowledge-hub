import { prebuiltAppConfig } from "@mlc-ai/web-llm";
import { describe, expect, it } from "vitest";
import { CHAT_LIMITS, buildChatMessages, chatSystemPrompt, type ChatMessage } from "../prompt";
import { ALL_MODELS, ASSISTANT_MODELS, MODELS, assistantModelsFor, mbLabel, modelById, sizeTier } from "../registry";

const webllm = ALL_MODELS.flatMap((m) => Object.entries(m.variants).map(([device, v]) => ({ model: m, device, v: v! }))).filter((x) => x.v.runtime === "webllm");

describe("WebLLM models", () => {
  it("only lists models WebLLM actually ships, with its own memory figures", () => {
    const list = new Map(prebuiltAppConfig.model_list.map((m) => [m.model_id, m]));
    expect(webllm.length).toBeGreaterThan(20);
    for (const { model, v } of webllm) {
      const known = list.get(v.mlcId!);
      expect(known, `${model.id}: ${v.mlcId} isn't in WebLLM's list. Update the dependency or remove it.`).toBeDefined();
      // A download comes from the same repo WebLLM points at.
      expect(known!.model, v.mlcId).toBe(`https://huggingface.co/${v.repo}`);
      expect(v.vramMb, `${v.mlcId} memory`).toBeDefined();
      expect(Math.round(known!.vram_required_MB ?? 0), `${v.mlcId} memory`).toBe(Math.round(v.vramMb!));
    }
  });

  it("keeps the 32-bit build bigger than the 16-bit one, and its memory need too", () => {
    for (const m of ALL_MODELS) {
      const a = m.variants.webgpu;
      const b = m.variants["webgpu-f32"];
      if (a?.runtime !== "webllm" || !b) continue;
      expect(b.mb, m.id).toBeGreaterThanOrEqual(a.mb);
      expect(b.vramMb!, m.id).toBeGreaterThan(a.vramMb!);
    }
  });
});

describe("the tutor's and the assistant's model lists", () => {
  it("offers the tutor only compact models, and the assistant everything", () => {
    for (const m of MODELS) expect(sizeTier(m.variants.webgpu!.mb), m.id).toBe("compact");
    expect(MODELS.map((m) => m.id)).toEqual(
      expect.arrayContaining(["qwen3-0.6b-mlc", "qwen3.5-0.8b-mlc", "gemma3-1b-mlc", "qwen2.5-0.5b-mlc", "smollm2-360m-mlc"]),
    );
    for (const m of MODELS) expect(ASSISTANT_MODELS).toContain(m);
    expect(ASSISTANT_MODELS.length).toBeGreaterThan(MODELS.length);
    // Bigger models are for the assistant only.
    for (const id of ["llama3.2-3b-mlc", "qwen3.5-4b-mlc", "phi-4-mini-mlc", "qwen3-1.7b-mlc"]) expect(MODELS.map((m) => m.id)).not.toContain(id);
  });

  it("spans compact to large, in every tier the picker shows", () => {
    const tiers = new Set(ASSISTANT_MODELS.map((m) => sizeTier(m.variants.webgpu?.mb ?? 0)));
    expect([...tiers].sort()).toEqual(["compact", "large", "standard"]);
  });

  it("groups by download size", () => {
    expect(sizeTier(295)).toBe("compact");
    expect(sizeTier(749)).toBe("compact");
    expect(sizeTier(750)).toBe("standard");
    expect(sizeTier(1899)).toBe("standard");
    expect(sizeTier(1900)).toBe("large");
  });

  it("offers a graphics chip without 16-bit math only models that have a 32-bit build, and a CPU only the small one", () => {
    const f32 = assistantModelsFor("webgpu-f32").map((m) => m.id);
    expect(f32).not.toContain("gemma3-1b-mlc");
    expect(f32).toContain("qwen3-0.6b-mlc");
    expect(assistantModelsFor("wasm")).toHaveLength(1);
    expect(assistantModelsFor("wasm")[0].name).toMatch(/SmolLM2/);
  });

  it("gives every model a unique id and a plain-language blurb", () => {
    const ids = ALL_MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of ALL_MODELS) expect(m.blurb.length, m.id).toBeGreaterThan(20);
    expect(modelById.get("llama3.2-1b-mlc")!.blurb).toMatch(/Built with Llama/);
  });

  it("labels sizes in MB, then GB", () => {
    expect(mbLabel(355)).toBe("360 MB");
    expect(mbLabel(1810)).toBe("1.8 GB");
  });
});

describe("the assistant's prompt", () => {
  const now = new Date(2026, 9, 11, 12, 0, 0);
  const turn = (i: number, size = 40): ChatMessage => ({ role: i % 2 ? "assistant" : "user", content: `turn ${i} ${"x".repeat(size)}` });

  it("starts with a general system prompt that knows it's offline, and the device's date", () => {
    const m = buildChatMessages([], "Hello", now);
    expect(m).toHaveLength(2);
    expect(m[0].role).toBe("system");
    expect(m[0].content).toContain("no internet access");
    expect(m[0].content).toContain("Sunday, October 11, 2026");
    expect(chatSystemPrompt(now)).toBe(m[0].content);
    // It isn't the lesson tutor.
    expect(m[0].content).not.toMatch(/tutor|USC|notes below/i);
    expect(m.at(-1)).toEqual({ role: "user", content: "Hello" });
  });

  it("remembers recent turns in order, starting on a question", () => {
    const history = Array.from({ length: 6 }, (_, i) => turn(i));
    const m = buildChatMessages(history, "next", now);
    expect(m.slice(1, -1).map((x) => x.role)).toEqual(["user", "assistant", "user", "assistant", "user", "assistant"]);
    expect(m.at(-1)!.content).toBe("next");
  });

  it("forgets the oldest turns first when the conversation outgrows the window", () => {
    const history = Array.from({ length: 12 }, (_, i) => turn(i, 1500));
    const m = buildChatMessages(history, "latest question", now);
    const size = m.reduce((n, x) => n + x.content.length, 0);
    expect(size).toBeLessThanOrEqual(CHAT_LIMITS.total);
    expect(m[1].role).toBe("user");
    expect(m.some((x) => x.content.startsWith("turn 11"))).toBe(true);
    expect(m.some((x) => x.content.startsWith("turn 0"))).toBe(false);
  });

  it("clips a huge question, and hides earlier reasoning blocks from the model", () => {
    const m = buildChatMessages([{ role: "user", content: "hi" }, { role: "assistant", content: "<think>private</think>Hello!" }], "y".repeat(10_000), now);
    expect(m.at(-1)!.content.length).toBeLessThanOrEqual(CHAT_LIMITS.question);
    expect(m.find((x) => x.role === "assistant")!.content).toBe("Hello!");
  });

  it("ignores empty and system turns in the history", () => {
    const m = buildChatMessages([{ role: "system", content: "old" }, { role: "user", content: "  " }, { role: "user", content: "real" }], "q", now);
    expect(m.map((x) => x.content).filter((c) => c === "old" || c.trim() === "")).toHaveLength(0);
    expect(m).toHaveLength(3);
  });
});
