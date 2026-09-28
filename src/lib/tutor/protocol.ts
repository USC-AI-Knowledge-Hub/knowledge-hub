import type { ChatMessage } from "./prompt";
import type { Device, ModelVariant } from "./registry";

/** Messages between the page and the model worker. */
export type ToWorker =
  | { type: "load"; variant: ModelVariant; device: Device; thinking: boolean }
  | {
      type: "generate";
      id: number;
      messages: ChatMessage[];
      maxNewTokens: number;
      temperature: number;
      topP: number;
      repetitionPenalty: number;
    }
  | { type: "stop" }
  /** WebLLM cache questions go through the worker, so the page never loads WebLLM itself. */
  | { type: "has-cached"; mlcId: string }
  | { type: "remove-cached"; mlcIds: string[] };

export type FromWorker =
  | { type: "progress"; loaded: number; total: number; file: string }
  | { type: "compiling" }
  | { type: "ready" }
  | { type: "text"; id: number; text: string }
  | { type: "done"; id: number; text: string; tokens: number; ms: number }
  | { type: "error"; id?: number; message: string }
  | { type: "cache-result"; cached: boolean };
