/**
 * What this device can run. WebGPU with 16-bit float support runs every model
 * at a usable speed; without it we offer the smallest model on WASM (CPU),
 * which works but is slow.
 */
import { LINEUP, type Device } from "./registry";

export interface Capability {
  device: Device;
  /** Why WebGPU isn't used, in plain words. Null when it is. */
  reason: string | null;
  /** navigator.deviceMemory in GB, when the browser reports it. */
  memoryGb: number | null;
  lowMemory: boolean;
  /** On mobile data or with Data Saver on, when the browser reports it. */
  metered: boolean;
}

interface NavigatorExtras {
  gpu?: {
    requestAdapter(): Promise<{ features: { has(f: string): boolean }; isFallbackAdapter?: boolean; info?: { isFallbackAdapter?: boolean } } | null>;
  };
  deviceMemory?: number;
  connection?: { type?: string; saveData?: boolean; effectiveType?: string };
}

export async function detectCapability(mock = false): Promise<Capability> {
  const nav = (typeof navigator === "undefined" ? {} : navigator) as NavigatorExtras;
  const memoryGb = typeof nav.deviceMemory === "number" ? nav.deviceMemory : null;
  const conn = nav.connection;
  const base = {
    memoryGb,
    lowMemory: memoryGb !== null && memoryGb < 4,
    metered: !!conn && (conn.type === "cellular" || conn.saveData === true),
  };
  let forced: string | null = null;
  try {
    forced = localStorage.getItem("kh-tutor-device");
  } catch {
    /* ignore */
  }
  if (forced === "wasm") return { ...base, device: "wasm", reason: "WebGPU is turned off for testing on this browser." };
  // Tests on machines with only a software GPU use this to exercise the WebGPU path anyway.
  if (forced === "webgpu") {
    const adapter = await nav.gpu?.requestAdapter().catch(() => null);
    return { ...base, device: adapter?.features.has("shader-f16") || LINEUP !== "webllm" ? "webgpu" : "webgpu-f32", reason: null };
  }
  if (mock) return { ...base, device: "webgpu", reason: null };

  if (!nav.gpu) return { ...base, device: "wasm", reason: "This browser doesn't support WebGPU, which lets the model use your graphics chip." };
  try {
    const adapter = await nav.gpu.requestAdapter();
    if (!adapter) return { ...base, device: "wasm", reason: "WebGPU is available, but it couldn't find a graphics chip to use." };
    // A software "fallback" adapter emulates a GPU on the CPU and is slower than WASM.
    if (adapter.isFallbackAdapter || adapter.info?.isFallbackAdapter)
      return { ...base, device: "wasm", reason: "WebGPU is only available in software on this device, which is slower than running on the CPU." };
    if (!adapter.features.has("shader-f16")) {
      // WebLLM has 32-bit builds for these chips; Transformers.js models need 16-bit math.
      if (LINEUP === "webllm") return { ...base, device: "webgpu-f32", reason: null };
      return { ...base, device: "wasm", reason: "Your graphics chip doesn't support the 16-bit math these models use in the browser." };
    }
    return { ...base, device: "webgpu", reason: null };
  } catch {
    return { ...base, device: "wasm", reason: "WebGPU failed to start on this device." };
  }
}
