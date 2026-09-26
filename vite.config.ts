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

export default defineConfig({
  // Set BASE_PATH=/repo-name/ when deploying to a GitHub Pages project site.
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), spaFallback()],
});
