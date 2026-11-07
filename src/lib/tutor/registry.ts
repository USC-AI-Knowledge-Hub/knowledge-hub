/**
 * The small language models the tutor can run in the browser. Nothing here
 * downloads anything: the worker fetches a model only after the student
 * chooses Download.
 *
 * Two runtimes: Transformers.js (ONNX files, WebGPU or WASM) and WebLLM (MLC builds,
 * WebGPU only). Sizes are what the browser actually downloads, in megabytes (10^6 bytes).
 * `npm run model-sizes` (scripts/model-sizes.ts) checks them against the
 * Hugging Face API and fails if one is off by more than 15%.
 */

/**
 * Where the model runs. "webgpu-f32" is a graphics chip without 16-bit float support
 * (shader-f16): WebLLM's q4f32 builds run there, the q4f16 ones can't.
 */
export type Device = "webgpu" | "webgpu-f32" | "wasm";
/** Whether a device is a graphics chip (either kind). */
export const onGpu = (d: Device) => d !== "wasm";
export type Dtype = "q4f16" | "q4" | "q8";
/** Transformers.js runs ONNX files on WebGPU or WASM; WebLLM runs MLC builds on WebGPU only. */
export type Runtime = "transformers" | "webllm";

export interface ModelVariant {
  runtime: Runtime;
  /** Hugging Face repo the weights come from (checked by `npm run model-sizes`). */
  repo: string;
  /** Transformers.js dtype. */
  dtype?: Dtype;
  /** WebLLM prebuilt model ID. */
  mlcId?: string;
  /** Approximate download in MB. */
  mb: number;
  /** Graphics memory WebLLM says the model needs, in MB (checked against WebLLM's own list by a test). */
  vramMb?: number;
}

export interface TutorModel {
  id: string;
  name: string;
  blurb: string;
  /** Which variant to load on each device. A model without `wasm` isn't offered without WebGPU. */
  variants: Partial<Record<Device, ModelVariant>>;
  /** Qwen3 thinks out loud unless it's told not to. */
  thinking?: boolean;
  recommended?: boolean;
  /**
   * Offered in the lesson tutor's picker. Every model is offered in the offline assistant; the
   * ones left out of the tutor are bigger than a lesson helper needs to be.
   */
  tutor?: boolean;
}

/** How big a download is, for grouping the offline assistant's picker. */
export type SizeTier = "compact" | "standard" | "large";
export const sizeTier = (mb: number): SizeTier => (mb < 750 ? "compact" : mb < 1900 ? "standard" : "large");

/** The CPU fallback, shared by both lineups: WASM is slow, so it gets the smallest model. */
const SMOLLM_WASM: ModelVariant = { runtime: "transformers", repo: "HuggingFaceTB/SmolLM2-360M-Instruct", dtype: "q8", mb: 370 };

/** Transformers.js on WebGPU. Its ONNX exports keep the vocabulary table at 16-bit, so they're larger. */
const TRANSFORMERS_MODELS: TutorModel[] = [
  {
    id: "qwen2.5-0.5b",
    name: "Qwen2.5 0.5B Instruct",
    blurb: "Good balance of speed and quality for short explanations.",
    variants: { webgpu: { runtime: "transformers", repo: "onnx-community/Qwen2.5-0.5B-Instruct", dtype: "q4f16", mb: 490 } },
    recommended: true,
  },
  {
    id: "smollm2-360m",
    name: "SmolLM2 360M Instruct",
    blurb: "Smaller and faster. Answers are simpler and slip up more often.",
    variants: { webgpu: { runtime: "transformers", repo: "HuggingFaceTB/SmolLM2-360M-Instruct", dtype: "q4f16", mb: 275 }, wasm: SMOLLM_WASM },
  },
  {
    id: "qwen3-0.6b",
    name: "Qwen3 0.6B",
    blurb: "Sharper answers. A bit larger and slower to load.",
    variants: { webgpu: { runtime: "transformers", repo: "onnx-community/Qwen3-0.6B-ONNX", dtype: "q4f16", mb: 570 } },
    thinking: true,
  },
];

/**
 * WebLLM on WebGPU. MLC builds quantize the vocabulary table too, so the same models download
 * 35–40% smaller. Sizes include WebLLM's few-MB model library, fetched from GitHub.
 *
 * Sizes are checked against Hugging Face by `npm run model-sizes`; `vramMb` is checked against
 * the list WebLLM ships (src/lib/tutor/__tests__/models.test.ts). The 32-bit build downloads the same
 * weights as the 16-bit one, so both have the same size; only the memory it needs differs.
 */
const mlc = (name: string, mb: number, vramMb: number, f32?: { mb: number; vramMb: number }): Partial<Record<Device, ModelVariant>> => ({
  webgpu: { runtime: "webllm", repo: `mlc-ai/${name}-q4f16_1-MLC`, mlcId: `${name}-q4f16_1-MLC`, mb, vramMb },
  ...(f32 ? { "webgpu-f32": { runtime: "webllm", repo: `mlc-ai/${name}-q4f32_1-MLC`, mlcId: `${name}-q4f32_1-MLC`, mb: f32.mb, vramMb: f32.vramMb } } : {}),
});

const WEBLLM_MODELS: TutorModel[] = [
  {
    id: "qwen3-0.6b-mlc",
    name: "Qwen3 0.6B",
    blurb: "The best explainer here, for its size.",
    variants: mlc("Qwen3-0.6B", 352, 1403, { mb: 352, vramMb: 1925 }),
    thinking: true,
    recommended: true,
    tutor: true,
  },
  {
    id: "qwen3.5-0.8b-mlc",
    name: "Qwen3.5 0.8B",
    blurb: "Newer than Qwen3, a little bigger. Should answer better; try it against Qwen3 0.6B.",
    variants: mlc("Qwen3.5-0.8B", 447, 1629, { mb: 447, vramMb: 1894 }),
    thinking: true,
    tutor: true,
  },
  {
    id: "gemma3-1b-mlc",
    name: "Gemma 3 1B",
    blurb: "Google's small model. Fluent and light on memory. Needs a graphics chip with 16-bit math.",
    variants: mlc("gemma3-1b-it", 602, 711),
    tutor: true,
  },
  {
    id: "qwen2.5-0.5b-mlc",
    name: "Qwen2.5 0.5B Instruct",
    blurb: "Smaller download, slightly simpler answers.",
    variants: mlc("Qwen2.5-0.5B-Instruct", 290, 945, { mb: 290, vramMb: 1060 }),
    tutor: true,
  },
  {
    id: "smollm2-360m-mlc",
    name: "SmolLM2 360M Instruct",
    blurb: "Smallest and fastest. Answers are simpler and slip up more often.",
    variants: { ...mlc("SmolLM2-360M-Instruct", 207, 376, { mb: 207, vramMb: 580 }), wasm: SMOLLM_WASM },
    tutor: true,
  },
  {
    id: "llama3.2-1b-mlc",
    name: "Llama 3.2 1B",
    blurb: "Meta's small model. Clear, even writing. Built with Llama.",
    variants: mlc("Llama-3.2-1B-Instruct", 705, 879, { mb: 705, vramMb: 1129 }),
  },
  {
    id: "qwen3-1.7b-mlc",
    name: "Qwen3 1.7B",
    blurb: "A clear step up from the small models, for writing, study help and code.",
    variants: mlc("Qwen3-1.7B", 984, 2037, { mb: 984, vramMb: 2635 }),
    thinking: true,
  },
  {
    id: "qwen3.5-2b-mlc",
    name: "Qwen3.5 2B",
    blurb: "Newest mid-size Qwen. Better at following detailed instructions.",
    variants: mlc("Qwen3.5-2B", 1083, 2245, { mb: 1083, vramMb: 2592 }),
    thinking: true,
  },
  {
    id: "llama3.2-3b-mlc",
    name: "Llama 3.2 3B",
    blurb: "The most capable of the mid-size models. Best on a laptop with a real graphics chip.",
    variants: mlc("Llama-3.2-3B-Instruct", 1817, 2264, { mb: 1817, vramMb: 2952 }),
  },
  {
    id: "ministral3-3b-mlc",
    name: "Ministral 3 3B",
    blurb: "Mistral's compact model from December 2025. A newer alternative to Llama 3.2 3B.",
    variants: mlc("Ministral-3-3B-Instruct-2512-BF16", 1946, 2864, { mb: 1946, vramMb: 3532 }),
  },
  {
    id: "qwen3.5-4b-mlc",
    name: "Qwen3.5 4B",
    blurb: "Closest to a full assistant here. Needs a recent laptop or desktop graphics chip.",
    variants: mlc("Qwen3.5-4B", 2391, 3868, { mb: 2391, vramMb: 4680 }),
    thinking: true,
  },
  {
    id: "phi-4-mini-mlc",
    name: "Phi-4 mini",
    blurb: "Microsoft's small model, strong at reasoning and maths. Large download.",
    variants: mlc("Phi-4-mini-instruct", 2180, 3438, { mb: 2180, vramMb: 4221 }),
  },
  {
    id: "gemma4-e2b-mlc",
    name: "Gemma 4 E2B",
    blurb: "Google's newest small model, released in April 2026, and good across many languages. A big download for its size.",
    variants: mlc("gemma-4-E2B-it", 2831, 3387, { mb: 2831, vramMb: 3863 }),
  },
  {
    id: "qwen3.5-9b-mlc",
    name: "Qwen3.5 9B",
    blurb: "The most capable model here and the biggest. Meant for a desktop or laptop with a dedicated graphics card with 8 GB or more of memory.",
    variants: mlc("Qwen3.5-9B", 5061, 6433, { mb: 5061, vramMb: 7545 }),
    thinking: true,
  },
];

/**
 * Which lineup this browser uses. WebLLM is the default: its builds download about a third
 * smaller. Visiting any page with ?engine=transformers switches this browser to the
 * Transformers.js builds, and ?engine=webllm or ?engine=default switches it back.
 */
function pickLineup(): "webllm" | "transformers" {
  try {
    const param = new URLSearchParams(location.search).get("engine");
    if (param === "transformers") localStorage.setItem("kh-tutor-lineup", param);
    if (param === "webllm" || param === "default") localStorage.removeItem("kh-tutor-lineup");
    return localStorage.getItem("kh-tutor-lineup") === "transformers" ? "transformers" : "webllm";
  } catch {
    return "webllm";
  }
}

export const LINEUP = pickLineup();
/** Every model in both lineups, for the size check and for recognizing a saved choice. */
export const ALL_MODELS = [...TRANSFORMERS_MODELS, ...WEBLLM_MODELS];
/** The models the lesson tutor offers: small enough to be a helper beside a lesson. */
export const MODELS = LINEUP === "webllm" ? WEBLLM_MODELS.filter((m) => m.tutor) : TRANSFORMERS_MODELS;
/** The models the offline assistant offers: the tutor's, plus bigger ones for a general-purpose assistant. */
export const ASSISTANT_MODELS = LINEUP === "webllm" ? WEBLLM_MODELS : TRANSFORMERS_MODELS;

export const modelById = new Map(ALL_MODELS.map((m) => [m.id, m]));
export const DEFAULT_MODEL = MODELS.find((m) => m.recommended)!.id;
/** The model offered without WebGPU. */
export const WASM_MODEL = MODELS.find((m) => m.variants.wasm)!.id;

export function modelsFor(device: Device): TutorModel[] {
  return MODELS.filter((m) => m.variants[device]);
}

export function assistantModelsFor(device: Device): TutorModel[] {
  return ASSISTANT_MODELS.filter((m) => m.variants[device]);
}

export function variantOf(model: TutorModel, device: Device): ModelVariant | undefined {
  return model.variants[device];
}

/** Files the browser downloads besides the ONNX weights. */
export const SIDE_FILES = ["config.json", "generation_config.json", "tokenizer.json", "tokenizer_config.json"];

/** The ONNX file name Transformers.js requests for a dtype. */
export function onnxFile(dtype: Dtype): string {
  return dtype === "q8" ? "model_quantized.onnx" : `model_${dtype}.onnx`;
}

export const mbLabel = (mb: number) => (mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${Math.round(mb / 10) * 10} MB`);
