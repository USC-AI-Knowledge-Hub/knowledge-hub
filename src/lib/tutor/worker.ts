/// <reference lib="webworker" />
/**
 * Runs the tutor's language model off the main thread, on one of two runtimes:
 * - Transformers.js (ONNX, WebGPU or WASM), used for the CPU fallback and the default lineup.
 * - WebLLM (MLC builds, WebGPU only), whose quantized models download 35–40% smaller.
 * Each library is imported dynamically, so neither touches the page's main bundle or is
 * fetched until the student has chosen to download a model that needs it.
 */
import type { FromWorker, ToWorker } from "./protocol";

type TF = typeof import("@huggingface/transformers");
type WebLLM = typeof import("@mlc-ai/web-llm");
type Tokenizer = Awaited<ReturnType<TF["AutoTokenizer"]["from_pretrained"]>>;
type Model = Awaited<ReturnType<TF["AutoModelForCausalLM"]["from_pretrained"]>>;
type Load = Extract<ToWorker, { type: "load" }>;
type Generate = Extract<ToWorker, { type: "generate" }>;

const post = (m: FromWorker) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m);

let thinking = false;

// ── Transformers.js ─────────────────────────────────────────────────────────

let tf: TF | null = null;
let tokenizer: Tokenizer | null = null;
let model: Model | null = null;
let stopper: InstanceType<TF["InterruptableStoppingCriteria"]> | null = null;

async function lib(): Promise<TF> {
  if (!tf) {
    tf = await import("@huggingface/transformers");
    // Browsers have no local model folder; don't probe the site for one.
    tf.env.allowLocalModels = false;
    tf.env.useBrowserCache = true;
  }
  return tf;
}

async function loadTransformers(msg: Load) {
  const t = await lib();
  const { repo, dtype, mb } = msg.variant;
  // Aggregate byte progress over every file. Totals arrive per file as each
  // download starts, so the registry's expected size keeps the bar honest early on.
  const files = new Map<string, { loaded: number; total: number }>();
  let last = 0;
  const onProgress = (p: import("@huggingface/transformers").ProgressInfo) => {
    if (p.status !== "progress") return;
    files.set(p.file, { loaded: p.loaded, total: p.total });
    const now = Date.now();
    if (now - last < 100 && p.loaded < p.total) return;
    last = now;
    let loaded = 0;
    let total = 0;
    for (const f of files.values()) {
      loaded += f.loaded;
      total += f.total;
    }
    post({ type: "progress", loaded, total: Math.max(total, mb * 1e6), file: p.file });
  };

  tokenizer = await t.AutoTokenizer.from_pretrained(repo, { progress_callback: onProgress });
  model = await t.AutoModelForCausalLM.from_pretrained(repo, { dtype, device: msg.device === "wasm" ? "wasm" : "webgpu", progress_callback: onProgress });
  post({ type: "compiling" });
  // Warm up: the first run compiles GPU shaders, which can take a few seconds.
  const inputs = tokenizer("Hi", { return_tensor: true });
  await model.generate({ ...inputs, max_new_tokens: 1 });
}

async function generateTransformers(msg: Generate) {
  if (!tokenizer || !model) throw new Error("The model isn't loaded yet.");
  const t = await lib();
  const inputs = tokenizer.apply_chat_template(msg.messages, {
    add_generation_prompt: true,
    return_dict: true,
    // Qwen3's template reads this; other templates ignore unknown variables.
    ...(thinking ? { enable_thinking: false } : {}),
  } as Parameters<Tokenizer["apply_chat_template"]>[1]);
  let text = "";
  let tokens = 0;
  const started = performance.now();
  const streamer = new t.TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (chunk: string) => {
      text += chunk;
      post({ type: "text", id: msg.id, text });
    },
    token_callback_function: () => {
      tokens++;
    },
  });
  stopper = new t.InterruptableStoppingCriteria();
  await model.generate({
    ...(inputs as object),
    max_new_tokens: msg.maxNewTokens,
    do_sample: msg.temperature > 0,
    temperature: msg.temperature,
    top_p: msg.topP,
    repetition_penalty: msg.repetitionPenalty,
    streamer,
    stopping_criteria: stopper,
  });
  stopper = null;
  post({ type: "done", id: msg.id, text, tokens, ms: performance.now() - started });
}

// ── WebLLM ──────────────────────────────────────────────────────────────────

let mlc: InstanceType<WebLLM["MLCEngine"]> | null = null;

async function loadWebLLM(msg: Load) {
  const { CreateMLCEngine } = await import("@mlc-ai/web-llm");
  const expected = msg.variant.mb * 1e6;
  let compiling = false;
  mlc = await CreateMLCEngine(msg.variant.mlcId!, {
    // WebLLM reports one fraction for the whole load: weights first, then shader compilation.
    initProgressCallback: (r) => {
      if (!compiling && /shader|compil|finish/i.test(r.text) && r.progress >= 0.99) {
        compiling = true;
        post({ type: "compiling" });
      } else if (!compiling) {
        post({ type: "progress", loaded: Math.round(r.progress * expected), total: expected, file: r.text.split(/[,:]/)[0] });
      }
    },
  });
}

async function generateWebLLM(msg: Generate) {
  if (!mlc) throw new Error("The model isn't loaded yet.");
  const started = performance.now();
  let text = "";
  let tokens = 0;
  const stream = await mlc.chat.completions.create({
    messages: msg.messages,
    stream: true,
    max_tokens: msg.maxNewTokens,
    temperature: msg.temperature,
    top_p: msg.topP,
    repetition_penalty: msg.repetitionPenalty,
    // Qwen3 thinks out loud unless told not to.
    ...(thinking ? { extra_body: { enable_thinking: false } } : {}),
  });
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? "";
    if (!delta) continue;
    text += delta;
    tokens++;
    post({ type: "text", id: msg.id, text });
  }
  post({ type: "done", id: msg.id, text, tokens, ms: performance.now() - started });
}

// ── Messages ────────────────────────────────────────────────────────────────

let runtime: "transformers" | "webllm" = "transformers";

async function load(msg: Load) {
  thinking = msg.thinking;
  runtime = msg.variant.runtime;
  if (runtime === "webllm") await loadWebLLM(msg);
  else await loadTransformers(msg);
  // Tell the page which backend actually loaded; useful when something is slow.
  post({ type: "progress", loaded: 1, total: 1, file: `loaded on ${msg.device} (${runtime})` });
  post({ type: "ready" });
}

// Errors thrown outside a request (e.g. inside ONNX Runtime's own startup) would otherwise vanish.
self.addEventListener("unhandledrejection", (e) => {
  post({ type: "error", message: e.reason instanceof Error ? e.reason.message : String(e.reason) });
});

self.onmessage = async (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  try {
    if (msg.type === "load") await load(msg);
    else if (msg.type === "generate") await (runtime === "webllm" ? generateWebLLM(msg) : generateTransformers(msg));
    else if (msg.type === "has-cached") {
      const { hasModelInCache } = await import("@mlc-ai/web-llm");
      post({ type: "cache-result", cached: await hasModelInCache(msg.mlcId) });
    } else if (msg.type === "remove-cached") {
      const { deleteModelAllInfoInCache } = await import("@mlc-ai/web-llm");
      for (const id of msg.mlcIds) await deleteModelAllInfoInCache(id).catch(() => undefined);
      post({ type: "cache-result", cached: false });
    } else if (msg.type === "stop") {
      if (runtime === "webllm") await mlc?.interruptGenerate();
      else stopper?.interrupt();
    }
  } catch (err) {
    if (msg.type === "has-cached" || msg.type === "remove-cached") post({ type: "cache-result", cached: false });
    else post({ type: "error", id: msg.type === "generate" ? msg.id : undefined, message: err instanceof Error ? err.message : String(err) });
  }
};
