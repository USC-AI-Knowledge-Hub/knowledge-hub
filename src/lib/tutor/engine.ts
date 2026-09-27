/**
 * The tutor's model engine, as seen from the page. The real engine drives a
 * module Web Worker running Transformers.js. The mock engine (for offline
 * development and tests: `?tutor=mock` or localStorage["kh-tutor-mock"]="1")
 * fakes the download and streams answers built from the notes it was given.
 */
import { GENERATION, stripThink, type ChatMessage } from "./prompt";
import type { FromWorker, ToWorker } from "./protocol";
import { onnxFile, type Device, type TutorModel } from "./registry";

export interface LoadProgress {
  loaded: number;
  total: number;
  file: string;
}

export interface LoadCallbacks {
  onProgress(p: LoadProgress): void;
  onCompiling(): void;
}

export interface GenerateResult {
  text: string;
  tokens: number;
  ms: number;
  stopped: boolean;
}

export interface Engine {
  readonly kind: "real" | "mock";
  load(model: TutorModel, device: Device, cb: LoadCallbacks): Promise<void>;
  generate(messages: ChatMessage[], onText: (text: string) => void, maxNewTokens?: number): Promise<GenerateResult>;
  stop(): void;
  /** Cancels a download or load and frees the model. */
  dispose(): void;
}

export class CancelledError extends Error {
  constructor() {
    super("Cancelled");
    this.name = "CancelledError";
  }
}

/** Transformers.js keeps downloaded files in this Cache Storage cache. */
export const CACHE_NAME = "transformers-cache";

export function fileUrl(model: TutorModel, device: Device): string | null {
  const v = model.variants[device];
  return v ? `https://huggingface.co/${model.repo}/resolve/main/onnx/${onnxFile(v.dtype)}` : null;
}

/** Whether the model's weights are already in this browser's cache (no network). */
export async function isCached(model: TutorModel, device: Device): Promise<boolean> {
  try {
    const url = fileUrl(model, device);
    if (!url || typeof caches === "undefined") return false;
    const cache = await caches.open(CACHE_NAME);
    return !!(await cache.match(url));
  } catch {
    return false;
  }
}

export async function removeDownloadedModels(): Promise<boolean> {
  try {
    return typeof caches !== "undefined" && (await caches.delete(CACHE_NAME));
  } catch {
    return false;
  }
}

export function isMockMode(): boolean {
  try {
    const q = new URLSearchParams(location.search).get("tutor");
    if (q === "mock") sessionStorage.setItem("kh-tutor-mock", "1");
    if (q === "real") sessionStorage.removeItem("kh-tutor-mock");
    return q === "mock" || localStorage.getItem("kh-tutor-mock") === "1" || sessionStorage.getItem("kh-tutor-mock") === "1";
  } catch {
    return false;
  }
}

class WorkerEngine implements Engine {
  readonly kind = "real" as const;
  private worker: Worker | null = null;
  private nextId = 1;
  private pendingLoad: { resolve(): void; reject(e: Error): void; cb: LoadCallbacks } | null = null;
  private pendingGen: { id: number; resolve(r: GenerateResult): void; reject(e: Error): void; onText(t: string): void; stopped: boolean } | null =
    null;

  private send(m: ToWorker) {
    this.worker?.postMessage(m);
  }

  private onMessage = (e: MessageEvent<FromWorker>) => {
    const m = e.data;
    switch (m.type) {
      case "progress":
        this.pendingLoad?.cb.onProgress(m);
        break;
      case "compiling":
        this.pendingLoad?.cb.onCompiling();
        break;
      case "ready":
        this.pendingLoad?.resolve();
        this.pendingLoad = null;
        break;
      case "text":
        if (this.pendingGen?.id === m.id) this.pendingGen.onText(stripThink(m.text));
        break;
      case "done":
        if (this.pendingGen?.id === m.id) {
          const g = this.pendingGen;
          this.pendingGen = null;
          g.resolve({ text: stripThink(m.text).trim(), tokens: m.tokens, ms: m.ms, stopped: g.stopped });
        }
        break;
      case "error": {
        const err = new Error(m.message);
        if (m.id !== undefined && this.pendingGen?.id === m.id) {
          this.pendingGen.reject(err);
          this.pendingGen = null;
        } else if (this.pendingLoad) {
          this.pendingLoad.reject(err);
          this.pendingLoad = null;
        }
        break;
      }
    }
  };

  load(model: TutorModel, device: Device, cb: LoadCallbacks): Promise<void> {
    const v = model.variants[device];
    if (!v) return Promise.reject(new Error(`${model.name} isn't available on ${device}.`));
    this.dispose();
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module", name: "tutor-model" });
    this.worker.onmessage = this.onMessage;
    this.worker.onerror = (e) => {
      this.pendingLoad?.reject(new Error(e.message || "The model worker stopped."));
      this.pendingLoad = null;
    };
    return new Promise((resolve, reject) => {
      this.pendingLoad = { resolve, reject, cb };
      this.send({ type: "load", repo: model.repo, dtype: v.dtype, device, expectedBytes: v.mb * 1e6, thinking: !!model.thinking });
    });
  }

  generate(messages: ChatMessage[], onText: (text: string) => void, maxNewTokens: number = GENERATION.maxNewTokens): Promise<GenerateResult> {
    if (!this.worker) return Promise.reject(new Error("The model isn't loaded."));
    if (this.pendingGen) return Promise.reject(new Error("The tutor is still answering."));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pendingGen = { id, resolve, reject, onText, stopped: false };
      this.send({
        type: "generate",
        id,
        messages,
        maxNewTokens,
        temperature: GENERATION.temperature,
        topP: GENERATION.topP,
        repetitionPenalty: GENERATION.repetitionPenalty,
      });
    });
  }

  stop() {
    if (this.pendingGen) this.pendingGen.stopped = true;
    this.send({ type: "stop" });
  }

  dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.pendingLoad?.reject(new CancelledError());
    this.pendingLoad = null;
    this.pendingGen?.reject(new CancelledError());
    this.pendingGen = null;
  }
}

/** Pulls the notes out of a system prompt, for the mock's canned answers. */
function notesOf(messages: ChatMessage[]): string {
  const sys = messages.find((m) => m.role === "system")?.content ?? "";
  const i = sys.indexOf("Notes:\n");
  return i < 0 ? "" : sys.slice(i + 7).replace(/^Lesson “[^”]+”:\s*/m, "").replace(/\n- /g, " ").replace(/Key ideas:/g, "");
}

class MockEngine implements Engine {
  readonly kind = "mock" as const;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private cancel: (() => void) | null = null;
  private current: { stopped: boolean } | null = null;

  load(model: TutorModel, device: Device, cb: LoadCallbacks): Promise<void> {
    this.dispose();
    const total = (model.variants[device]?.mb ?? 300) * 1e6;
    const files = ["config.json", "tokenizer.json", `onnx/${onnxFile(model.variants[device]?.dtype ?? "q4f16")}`];
    const steps = 30;
    return new Promise((resolve, reject) => {
      let i = 0;
      this.cancel = () => reject(new CancelledError());
      const tick = () => {
        i++;
        // Uneven chunks, like a real download.
        const f = Math.min(1, (i / steps) ** 1.15);
        cb.onProgress({ loaded: Math.round(total * f), total, file: files[Math.min(files.length - 1, Math.floor((i / steps) * files.length))] });
        if (i < steps) this.timer = setTimeout(tick, 60 + ((i * 37) % 70));
        else {
          cb.onCompiling();
          this.timer = setTimeout(() => {
            this.cancel = null;
            resolve();
          }, 400);
        }
      };
      this.timer = setTimeout(tick, 150);
    });
  }

  generate(messages: ChatMessage[], onText: (text: string) => void): Promise<GenerateResult> {
    const notes = notesOf(messages).replace(/\s+/g, " ").trim();
    const sentences = notes.split(/(?<=[.!?])\s+(?=[A-Z“"])/).filter(Boolean);
    const body = sentences.slice(0, 3).join(" ").trim();
    const answer = body
      ? `Here's the short version. ${body}\n\n- **In one line:** ${(sentences[0] ?? "").trim()}\n- Ask a follow-up if any part is unclear.`
      : "My notes don't cover that. Try the **Learn** page, or ask me about tokens, attention or how to prompt well.";
    const words = answer.split(/(?<=\s)/);
    // Same contract as the worker: one answer at a time.
    if (this.current) return Promise.reject(new Error("The tutor is still answering."));
    const run = (this.current = { stopped: false });
    const started = performance.now();
    return new Promise((resolve, reject) => {
      let i = 0;
      let text = "";
      const finish = (stopped: boolean) => {
        this.cancel = null;
        this.current = null;
        resolve({ text: text.trim(), tokens: i, ms: performance.now() - started, stopped });
      };
      this.cancel = () => {
        this.current = null;
        reject(new CancelledError());
      };
      const tick = () => {
        if (run.stopped) return finish(true);
        text += words[i++];
        onText(text);
        if (i < words.length) this.timer = setTimeout(tick, 18 + ((i * 13) % 30));
        else finish(false);
      };
      // Time to first token.
      this.timer = setTimeout(tick, 350);
    });
  }

  stop() {
    if (this.current) this.current.stopped = true;
  }

  dispose() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.cancel?.();
    this.cancel = null;
  }
}

export function createEngine(): Engine {
  return isMockMode() ? new MockEngine() : new WorkerEngine();
}
