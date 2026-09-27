/// <reference lib="webworker" />
/**
 * Runs the tutor's language model off the main thread. Transformers.js is
 * imported dynamically here, so it never touches the page's main bundle and
 * isn't fetched until the student has chosen to download a model.
 */
import type { FromWorker, ToWorker } from "./protocol";

type TF = typeof import("@huggingface/transformers");
type Tokenizer = Awaited<ReturnType<TF["AutoTokenizer"]["from_pretrained"]>>;
type Model = Awaited<ReturnType<TF["AutoModelForCausalLM"]["from_pretrained"]>>;

const post = (m: FromWorker) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m);

let tf: TF | null = null;
let tokenizer: Tokenizer | null = null;
let model: Model | null = null;
let thinking = false;
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

async function load(msg: Extract<ToWorker, { type: "load" }>) {
  const t = await lib();
  thinking = msg.thinking;
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
    post({ type: "progress", loaded, total: Math.max(total, msg.expectedBytes), file: p.file });
  };

  tokenizer = await t.AutoTokenizer.from_pretrained(msg.repo, { progress_callback: onProgress });
  model = await t.AutoModelForCausalLM.from_pretrained(msg.repo, {
    dtype: msg.dtype,
    device: msg.device,
    progress_callback: onProgress,
  });
  post({ type: "compiling" });
  // Warm up: the first run compiles GPU shaders, which can take a few seconds.
  const inputs = tokenizer("Hi", { return_tensor: true });
  await model.generate({ ...inputs, max_new_tokens: 1 });
  post({ type: "ready" });
}

async function generate(msg: Extract<ToWorker, { type: "generate" }>) {
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

self.onmessage = async (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  try {
    if (msg.type === "load") await load(msg);
    else if (msg.type === "generate") await generate(msg);
    else if (msg.type === "stop") stopper?.interrupt();
  } catch (err) {
    post({ type: "error", id: msg.type === "generate" ? msg.id : undefined, message: err instanceof Error ? err.message : String(err) });
  }
};
