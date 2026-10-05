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
}

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
 */
const WEBLLM_MODELS: TutorModel[] = [
  {
    id: "qwen3-0.6b-mlc",
    name: "Qwen3 0.6B",
    blurb: "The best explainer here, for its size.",
    variants: {
      webgpu: { runtime: "webllm", repo: "mlc-ai/Qwen3-0.6B-q4f16_1-MLC", mlcId: "Qwen3-0.6B-q4f16_1-MLC", mb: 355 },
      "webgpu-f32": { runtime: "webllm", repo: "mlc-ai/Qwen3-0.6B-q4f32_1-MLC", mlcId: "Qwen3-0.6B-q4f32_1-MLC", mb: 390 },
    },
    thinking: true,
    recommended: true,
  },
  {
    id: "qwen2.5-0.5b-mlc",
    name: "Qwen2.5 0.5B Instruct",
    blurb: "Smaller download, slightly simpler answers.",
    variants: {
      webgpu: { runtime: "webllm", repo: "mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC", mlcId: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", mb: 295 },
      "webgpu-f32": { runtime: "webllm", repo: "mlc-ai/Qwen2.5-0.5B-Instruct-q4f32_1-MLC", mlcId: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC", mb: 320 },
    },
  },
  {
    id: "smollm2-360m-mlc",
    name: "SmolLM2 360M Instruct",
    blurb: "Smallest and fastest. Answers are simpler and slip up more often.",
    variants: {
      webgpu: { runtime: "webllm", repo: "mlc-ai/SmolLM2-360M-Instruct-q4f16_1-MLC", mlcId: "SmolLM2-360M-Instruct-q4f16_1-MLC", mb: 210 },
      "webgpu-f32": { runtime: "webllm", repo: "mlc-ai/SmolLM2-360M-Instruct-q4f32_1-MLC", mlcId: "SmolLM2-360M-Instruct-q4f32_1-MLC", mb: 230 },
      wasm: SMOLLM_WASM,
    },
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
/** The models this browser offers. */
export const MODELS = LINEUP === "webllm" ? WEBLLM_MODELS : TRANSFORMERS_MODELS;

export const modelById = new Map(ALL_MODELS.map((m) => [m.id, m]));
export const DEFAULT_MODEL = MODELS.find((m) => m.recommended)!.id;
/** The model offered without WebGPU. */
export const WASM_MODEL = MODELS.find((m) => m.variants.wasm)!.id;

export function modelsFor(device: Device): TutorModel[] {
  return MODELS.filter((m) => m.variants[device]);
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
