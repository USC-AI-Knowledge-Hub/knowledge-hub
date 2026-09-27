import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * Browser tests for every spec in e2e/. The site is served by `vite preview`
 * from dist/ (built with BASE_PATH=/); if there's no build yet, one is made.
 *
 * - Specs tagged @model use the real on-device model and download it from
 *   Hugging Face, so they're slow. Skip them locally with `--grep-invert @model`.
 * - Set PW_CHROMIUM_PATH to use an already-installed Chromium.
 */
const PORT = 4173;
const built = existsSync("dist/index.html");

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `${built ? "" : "npm run build && "}npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    env: { BASE_PATH: "/" },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
