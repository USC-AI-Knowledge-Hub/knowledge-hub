import type { ChatMessage } from "./prompt";
import type { Device, Dtype } from "./registry";

/** Messages between the page and the model worker. */
export type ToWorker =
  | { type: "load"; repo: string; dtype: Dtype; device: Device; expectedBytes: number; thinking: boolean }
  | {
      type: "generate";
      id: number;
      messages: ChatMessage[];
      maxNewTokens: number;
      temperature: number;
      topP: number;
      repetitionPenalty: number;
    }
  | { type: "stop" };

export type FromWorker =
  | { type: "progress"; loaded: number; total: number; file: string }
  | { type: "compiling" }
  | { type: "ready" }
  | { type: "text"; id: number; text: string }
  | { type: "done"; id: number; text: string; tokens: number; ms: number }
  | { type: "error"; id?: number; message: string };
