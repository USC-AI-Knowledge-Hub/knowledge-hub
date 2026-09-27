/**
 * The small language models the tutor can run in the browser. Nothing here
 * downloads anything: the worker fetches a model only after the student
 * chooses Download.
 *
 * Sizes are what the browser actually downloads for the dtype we use (the
 * ONNX weights plus config and tokenizer files), in megabytes (10^6 bytes).
 * `npm run model-sizes` (scripts/model-sizes.ts) checks them against the
 * Hugging Face API and fails if one is off by more than 15%.
 */

export type Device = "webgpu" | "wasm";
export type Dtype = "q4f16" | "q4" | "q8";

export interface ModelVariant {
  dtype: Dtype;
  /** Approximate download in MB. */
  mb: number;
}

export interface TutorModel {
  id: string;
  name: string;
  /** Hugging Face repo with an onnx/ folder. */
  repo: string;
  blurb: string;
  /** Which variant to load on each device. A model without `wasm` isn't offered without WebGPU. */
  variants: Partial<Record<Device, ModelVariant>>;
  /** Qwen3 thinks out loud unless the chat template is told not to. */
  thinking?: boolean;
  recommended?: boolean;
}

export const MODELS: TutorModel[] = [
  {
    id: "qwen2.5-0.5b",
    name: "Qwen2.5 0.5B Instruct",
    repo: "onnx-community/Qwen2.5-0.5B-Instruct",
    blurb: "Good balance of speed and quality for short explanations.",
    variants: { webgpu: { dtype: "q4f16", mb: 490 } },
    recommended: true,
  },
  {
    id: "smollm2-360m",
    name: "SmolLM2 360M Instruct",
    repo: "HuggingFaceTB/SmolLM2-360M-Instruct",
    blurb: "Smaller and faster. Answers are simpler and slip up more often.",
    variants: { webgpu: { dtype: "q4f16", mb: 275 }, wasm: { dtype: "q8", mb: 370 } },
  },
  {
    id: "qwen3-0.6b",
    name: "Qwen3 0.6B",
    repo: "onnx-community/Qwen3-0.6B-ONNX",
    blurb: "Sharper answers. A bit larger and slower to load.",
    variants: { webgpu: { dtype: "q4f16", mb: 570 } },
    thinking: true,
  },
];

export const modelById = new Map(MODELS.map((m) => [m.id, m]));
export const DEFAULT_MODEL = MODELS.find((m) => m.recommended)!.id;
/** The only model offered without WebGPU: WASM on the CPU is slow, so it gets the smallest. */
export const WASM_MODEL = "smollm2-360m";

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
