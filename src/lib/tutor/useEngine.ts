import { useCallback, useEffect, useRef, useState } from "react";
import { detectCapability, type Capability } from "./capability";
import { CancelledError, createEngine, isCached, isMockMode, removeDownloadedModels, type Engine, type GenerateResult } from "./engine";
import type { ChatMessage } from "./prompt";
import { DEFAULT_MODEL, WASM_MODEL, modelById, type Device, type TutorModel } from "./registry";
import { modelStore, useModelChoice } from "./storage";

export type Phase =
  /** No model in memory. The student hasn't downloaded one, said not now, or it was removed. */
  | { name: "off"; missing?: boolean }
  | { name: "loading"; model: TutorModel; device: Device; loaded: number; total: number; file: string; fromCache: boolean }
  | { name: "compiling"; model: TutorModel; device: Device; fromCache: boolean }
  /** `saved` is false when the browser wouldn't keep the files (private window, low storage). */
  | { name: "ready"; model: TutorModel; device: Device; saved: boolean }
  | { name: "error"; message: string; model: TutorModel; device: Device };

export interface TutorEngine {
  phase: Phase;
  capability: Capability | null;
  mock: boolean;
  busy: boolean;
  ready: boolean;
  /** The model to preselect in the download view. */
  suggested: string;
  download(modelId: string, device: Device): void;
  cancel(): void;
  remove(): Promise<void>;
  decline(): void;
  /** Loads a previously downloaded model from the browser cache. Never downloads. */
  resume(): void;
  generate(messages: ChatMessage[], onText: (t: string) => void, maxNewTokens?: number): Promise<GenerateResult>;
  stop(): void;
}

let shared: Engine | null = null;
const engine = () => (shared ??= createEngine());

function explain(err: unknown, device: Device): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/fetch|network|Failed to fetch|NetworkError|load failed/i.test(msg)) return "The download stopped. Check your connection and try again.";
  if (/quota|storage/i.test(msg)) return "Your browser ran out of storage space for the model. Free some space, or pick a smaller model.";
  if (/memory|allocation|OOM/i.test(msg)) return "Your device ran out of memory loading the model. Try the smaller model.";
  if (device === "webgpu" && /webgpu|gpu|adapter|shader/i.test(msg)) return "The graphics chip couldn't run the model. Try the smaller model on your processor instead.";
  return `The model couldn't start: ${msg.slice(0, 160)}`;
}

export function useTutorEngine(): TutorEngine {
  const choice = useModelChoice();
  const [phase, setPhase] = useState<Phase>({ name: "off" });
  const [capability, setCapability] = useState<Capability | null>(null);
  const [busy, setBusy] = useState(false);
  const mock = useRef(isMockMode()).current;
  const resumed = useRef(false);

  useEffect(() => {
    let live = true;
    detectCapability(mock).then((c) => live && setCapability(c));
    return () => {
      live = false;
    };
  }, [mock]);

  const start = useCallback((model: TutorModel, device: Device, fromCache: boolean) => {
    // Once a model is loading in this session, there's nothing to resume. Without this,
    // saving "downloaded" at the end of a download re-triggered resume, and a failed cache
    // check there reset a working model to "off".
    resumed.current = true;
    const v = model.variants[device];
    setPhase({ name: "loading", model, device, loaded: 0, total: (v?.mb ?? 0) * 1e6, file: "", fromCache });
    engine()
      .load(model, device, {
        onProgress: (p) => setPhase({ name: "loading", model, device, ...p, fromCache }),
        onCompiling: () => setPhase({ name: "compiling", model, device, fromCache }),
      })
      // Transformers.js finishes writing to the cache before load resolves, so this check is
      // reliable. Only promise "saved for next time" when the files really are there.
      .then(() => (mock ? true : isCached(model, device)))
      .then((saved) => {
        if (saved) modelStore.set({ status: "downloaded", model: model.id, device });
        setPhase({ name: "ready", model, device, saved });
      })
      .catch((err) => {
        if (err instanceof CancelledError) return;
        setPhase({ name: "error", message: explain(err, device), model, device });
      });
  }, [mock]);

  const download = useCallback(
    (modelId: string, device: Device) => {
      const model = modelById.get(modelId);
      if (model?.variants[device]) start(model, device, false);
    },
    [start],
  );

  const resume = useCallback(() => {
    if (resumed.current || choice.status !== "downloaded") return;
    resumed.current = true;
    const model = modelById.get(choice.model);
    if (!model?.variants[choice.device]) return;
    // Only load what's already on this device. If the cache was cleared, ask again.
    (mock ? Promise.resolve(true) : isCached(model, choice.device)).then((cached) => {
      if (cached) start(model, choice.device, true);
      else setPhase({ name: "off", missing: true });
    });
  }, [choice, mock, start]);

  const cancel = useCallback(() => {
    engine().dispose();
    setPhase({ name: "off" });
  }, []);

  const remove = useCallback(async () => {
    engine().dispose();
    await removeDownloadedModels();
    modelStore.set({ status: "unset" });
    resumed.current = false;
    setPhase({ name: "off" });
  }, []);

  const decline = useCallback(() => {
    if (choice.status !== "downloaded") modelStore.set({ status: "declined" });
  }, [choice.status]);

  const inFlight = useRef(0);
  const generate = useCallback(async (messages: ChatMessage[], onText: (t: string) => void, maxNewTokens?: number) => {
    inFlight.current++;
    setBusy(true);
    try {
      // If a previous answer is still winding down after Stop, wait for it briefly.
      for (let attempt = 0; ; attempt++) {
        try {
          return await engine().generate(messages, onText, maxNewTokens);
        } catch (err) {
          if (attempt < 40 && err instanceof Error && /still answering/.test(err.message)) {
            await new Promise((r) => setTimeout(r, 150));
            continue;
          }
          throw err;
        }
      }
    } finally {
      inFlight.current--;
      setBusy(inFlight.current > 0);
    }
  }, []);

  const stop = useCallback(() => engine().stop(), []);

  const suggested = capability?.device === "wasm" ? WASM_MODEL : choice.status === "downloaded" ? choice.model : DEFAULT_MODEL;

  return { phase, capability, mock, busy, ready: phase.name === "ready", suggested, download, cancel, remove, decline, resume, generate, stop };
}
