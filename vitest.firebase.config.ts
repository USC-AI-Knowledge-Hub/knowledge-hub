import { defineConfig } from "vitest/config";

// The Firebase tests need the emulators: run them with npm run test:firebase.
export default defineConfig({
  test: { include: ["firebase/__tests__/**/*.test.ts"], testTimeout: 30_000, hookTimeout: 60_000, fileParallelism: false },
});
