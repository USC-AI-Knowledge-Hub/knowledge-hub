/**
 * Whether a model is likely to run well on this device, judged from the memory the browser reports.
 * It is a guess, not a measurement: browsers don't say how much graphics memory there is, and
 * navigator.deviceMemory stops at 8 GB, so a device that reports 8 may have far more.
 */
import type { Capability } from "./capability";
import type { ModelVariant, TutorModel, Device } from "./registry";

export type Fit = "good" | "tight" | "heavy";

/** Memory a model needs while it runs, in MB. WebLLM states it; for the ONNX builds it is about 2.5 times the download. */
export const needMb = (v: ModelVariant) => v.vramMb ?? Math.round(v.mb * 2.5);

/** Null when it can't be judged: on the processor, or when the browser doesn't report its memory. */
export function fitFor(v: ModelVariant | undefined, cap: Capability): Fit | null {
  if (!v || cap.device === "wasm" || cap.memoryGb === null) return null;
  const need = needMb(v);
  if (cap.memoryGb >= 8) {
    // The browser only says "8 or more", so give a little benefit of the doubt before calling anything heavy.
    return need <= 4000 ? "good" : need <= 7000 ? "tight" : "heavy";
  }
  const ram = cap.memoryGb * 1024;
  return need <= ram * 0.4 ? "good" : need <= ram * 0.7 ? "tight" : "heavy";
}

/** The most capable model (by the memory it needs, a fair stand-in for size) that should run comfortably here. */
export function bestFit(models: TutorModel[], device: Device, cap: Capability): string | null {
  let best: { id: string; need: number } | null = null;
  for (const m of models) {
    const v = m.variants[device];
    if (!v || fitFor(v, cap) !== "good") continue;
    const need = needMb(v);
    if (!best || need > best.need) best = { id: m.id, need };
  }
  return best?.id ?? null;
}

/** The next model down from `current` (the largest one that downloads less), for "try a smaller model". */
export function smallerThan(current: TutorModel, models: TutorModel[], device: Device): TutorModel | null {
  const size = current.variants[device]?.mb;
  if (size === undefined) return null;
  let pick: TutorModel | null = null;
  for (const m of models) {
    const mb = m.variants[device]?.mb;
    if (mb === undefined || mb >= size) continue;
    if (!pick || mb > pick.variants[device]!.mb) pick = m;
  }
  return pick;
}

export const FIT_NOTE: Record<Fit, string> = {
  good: "Should run comfortably on this device.",
  tight: "May be slow, or slow down other apps, on this device.",
  heavy: "Probably too big for this device.",
};
