import { describe, expect, it } from "vitest";
import type { Capability } from "../capability";
import { ASSISTANT_MODELS, assistantModelsFor, modelById, type ModelVariant } from "../registry";
import { bestFit, fitFor, needMb, smallerThan } from "../fit";

const cap = (memoryGb: number | null, device: Capability["device"] = "webgpu"): Capability => ({ device, reason: null, memoryGb, lowMemory: memoryGb !== null && memoryGb < 4, metered: false, storageFreeMb: null });
const v = (vramMb: number): ModelVariant => ({ runtime: "webllm", repo: "x/y", mlcId: "y", mb: 100, vramMb });

describe("how well a model fits a device", () => {
  it("can't judge without a memory figure or on the processor", () => {
    expect(fitFor(v(1000), cap(null))).toBeNull();
    expect(fitFor(v(1000), cap(8, "wasm"))).toBeNull();
    expect(fitFor(undefined, cap(8))).toBeNull();
  });

  it("scales with the memory a device reports below 8 GB", () => {
    expect(fitFor(v(700), cap(4))).toBe("good"); // 0.17 of 4 GB
    expect(fitFor(v(2000), cap(4))).toBe("tight"); // 0.49
    expect(fitFor(v(3400), cap(4))).toBe("heavy"); // 0.83
    expect(fitFor(v(900), cap(2))).toBe("tight");
  });

  it("gives devices that report 8 GB or more the benefit of the doubt", () => {
    expect(fitFor(v(3900), cap(8))).toBe("good");
    expect(fitFor(v(6433), cap(8))).toBe("tight");
    expect(fitFor(v(7545), cap(8))).toBe("heavy");
  });

  it("estimates the memory of a model with no stated figure", () => {
    expect(needMb({ runtime: "transformers", repo: "x/y", dtype: "q4f16", mb: 490 })).toBe(1225);
  });
});

describe("picking a model for a device", () => {
  it("recommends the biggest model that should run comfortably, and nothing when it can't tell", () => {
    const options = assistantModelsFor("webgpu");
    expect(bestFit(options, "webgpu", cap(null))).toBeNull();
    const small = bestFit(options, "webgpu", cap(4));
    const big = bestFit(options, "webgpu", cap(8));
    expect(small).toBeTruthy();
    expect(big).toBeTruthy();
    expect(needMb(modelById.get(big!)!.variants.webgpu!)).toBeGreaterThan(needMb(modelById.get(small!)!.variants.webgpu!));
    expect(needMb(modelById.get(big!)!.variants.webgpu!)).toBeLessThanOrEqual(4000);
  });

  it("finds the next model down for a retry", () => {
    const options = assistantModelsFor("webgpu");
    const big = modelById.get("qwen3.5-9b-mlc")!;
    const next = smallerThan(big, options, "webgpu")!;
    expect(next.variants.webgpu!.mb).toBeLessThan(big.variants.webgpu!.mb);
    // Nothing is smaller than the smallest.
    const smallest = [...options].sort((a, b) => a.variants.webgpu!.mb - b.variants.webgpu!.mb)[0];
    expect(smallerThan(smallest, options, "webgpu")).toBeNull();
  });
});

describe("the newer models", () => {
  it("are offered in the assistant but not the lesson tutor", () => {
    for (const id of ["gemma4-e2b-mlc", "ministral3-3b-mlc", "qwen3.5-9b-mlc"]) {
      expect(ASSISTANT_MODELS.map((m) => m.id)).toContain(id);
      expect(modelById.get(id)?.tutor).toBeFalsy();
      expect(modelById.get(id)?.variants["webgpu-f32"], id).toBeDefined();
    }
  });
});
