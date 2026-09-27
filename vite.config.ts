import { copyFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/** GitHub Pages serves 404.html for unknown paths; make it the app so deep links work. */
const spaFallback = (): Plugin => ({
  name: "spa-fallback",
  apply: "build",
  closeBundle() {
    const out = resolve(import.meta.dirname, "dist");
    copyFileSync(resolve(out, "index.html"), resolve(out, "404.html"));
  },
});

/**
 * ONNX Runtime's bundle has a fallback URL to its 27 MB .wasm, so Vite emits a
 * copy. Transformers.js always points ONNX Runtime at the matching version on
 * jsDelivr instead, so the copy is never used; keep it out of the deploy.
 */
const dropUnusedOrtWasm = (): Plugin => ({
  name: "drop-unused-ort-wasm",
  apply: "build",
  generateBundle(_, bundle) {
    for (const name of Object.keys(bundle)) if (/ort-wasm[^/]*\.wasm$/.test(name)) delete bundle[name];
  },
});

export default defineConfig({
  // Set BASE_PATH=/repo-name/ when deploying to a GitHub Pages project site.
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), spaFallback()],
  // The tutor's model worker imports Transformers.js lazily, which needs an ES module worker.
  worker: { format: "es", plugins: () => [dropUnusedOrtWasm()] },
});
