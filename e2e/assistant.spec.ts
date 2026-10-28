import { expect, test, type Page } from "@playwright/test";

/**
 * The offline assistant: a general-purpose chat on the on-device model. These use the mock model
 * (no download, canned replies); the real model is exercised by the @model tests in tutor.spec.ts.
 */

async function setup(page: Page, storage: Record<string, unknown> = {}) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(
    (entries) => {
      if (sessionStorage.getItem("kh-e2e-init")) return;
      sessionStorage.setItem("kh-e2e-init", "1");
      localStorage.setItem("kh-tutor-mock", "1");
      for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    },
    storage,
  );
}

const box = (page: Page) => page.getByRole("textbox", { name: "Message the assistant" });

async function ask(page: Page, text: string) {
  await box(page).fill(text);
  await box(page).press("Enter");
}

test.describe("offline assistant", () => {
  test("suggests a model that fits the memory the device reports, and warns about one that doesn't", async ({ page }) => {
    await setup(page);
    await page.addInitScript(() => Object.defineProperty(navigator, "deviceMemory", { value: 4, configurable: true }));
    await page.goto("/offline/assistant/");
    await expect(page.getByText("Best fit for this device")).toHaveCount(1);
    // The newer, bigger models are offered, and the 9B one is flagged as too big for a 4 GB device.
    const big = page.getByRole("radio", { name: /^Qwen3\.5 9B/ });
    await expect(big).toBeVisible();
    await big.check();
    await expect(page.locator("label", { has: big }).getByText("Probably too big for this device.")).toBeVisible();
    await expect(page.getByText(/probably won't load/)).toBeVisible();
    await expect(page.getByRole("radio", { name: /^Gemma 4 E2B/ })).toBeVisible();
    await expect(page.getByRole("radio", { name: /^Ministral 3 3B/ })).toBeVisible();
  });

  test("offers models from compact to large, downloads one, then chats and remembers", async ({ page }) => {
    await setup(page);
    await page.goto("/offline/assistant/");
    await expect(page.getByRole("heading", { level: 1, name: "Offline assistant" })).toBeVisible();

    // All three sizes are offered, with the memory each needs.
    for (const tier of ["Compact", "Standard", "Large"]) await expect(page.getByRole("group", { name: tier })).toBeVisible();
    await expect(page.getByRole("radio", { name: /^Qwen3 0\.6B/ })).toBeChecked();
    await expect(page.getByRole("radio", { name: /^Gemma 3 1B/ })).toBeVisible();
    await expect(page.getByRole("radio", { name: /^Phi-4 mini/ })).toBeVisible();
    await page.getByRole("radio", { name: /^Llama 3\.2 3B/ }).check();
    await expect(page.getByRole("button", { name: /^Download 1\.8 GB/ })).toBeVisible();
    await expect(page.getByText(/Needs about 2\.3 GB of memory/)).toBeVisible();

    await page.getByRole("radio", { name: /^Qwen3 0\.6B/ }).check();
    await page.getByRole("button", { name: /^Download \d+ MB/ }).click();
    await expect(page.getByRole("progressbar", { name: "Download progress" })).toBeVisible();
    await expect(box(page)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Qwen3 0.6B").first()).toBeVisible();
    // This page has its own message box, so the lesson tutor's button stays out of the way.
    await expect(page.getByRole("button", { name: /Ask the tutor/ })).toHaveCount(0);

    await ask(page, "What is photosynthesis?");
    await expect(page.getByText("Mock reply to: What is photosynthesis?")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Remembered earlier questions: 0")).toBeVisible();
    // While an answer is streaming the button says Stop; ask the next question once it's done.
    await expect(page.getByRole("button", { name: "Send" })).toBeVisible({ timeout: 15_000 });
    await ask(page, "And chlorophyll?");
    await expect(page.getByText("Remembered earlier questions: 1")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: "Send" })).toBeVisible({ timeout: 15_000 });

    // The conversation and the model are still there on return.
    await page.reload();
    await expect(box(page)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Mock reply to: What is photosynthesis?")).toBeVisible();
    await expect(page.getByText("Mock reply to: And chlorophyll?")).toBeVisible();

    await page.getByRole("button", { name: "New chat" }).click();
    await expect(page.getByText("Mock reply to: What is photosynthesis?")).toHaveCount(0);
    await expect(page.getByText("Ask anything")).toBeVisible();
    await page.reload();
    await expect(box(page)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Ask anything")).toBeVisible();
  });

  test("a starter question sends itself, and Shift+Enter writes a new line instead of sending", async ({ page }) => {
    await setup(page, { "kh-tutor-model": { status: "downloaded", model: "qwen3-0.6b-mlc", device: "webgpu" } });
    await page.goto("/offline/assistant/");
    await expect(box(page)).toBeVisible({ timeout: 20_000 });
    await box(page).fill("line one");
    await box(page).press("Shift+Enter");
    await box(page).type("line two");
    await expect(box(page)).toHaveValue("line one\nline two");
    await expect(page.getByText(/Mock reply to:/)).toHaveCount(0);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(/Mock reply to: line one/)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "New chat" }).click();
    await page.getByRole("button", { name: "Help me draft a polite email" }).click();
    await expect(page.getByText("Mock reply to: Help me draft a polite email")).toBeVisible({ timeout: 15_000 });
  });

  test("changing the model goes back to the list", async ({ page }) => {
    await setup(page, { "kh-tutor-model": { status: "downloaded", model: "qwen3-0.6b-mlc", device: "webgpu" } });
    await page.goto("/offline/assistant/");
    await expect(box(page)).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Change model" }).click();
    await expect(page.getByRole("heading", { name: "Choose a model" })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("kh-tutor-model"))).toContain("unset");
  });

  test("without WebGPU, offers only the smallest model and asks first", async ({ page }) => {
    await setup(page, { "kh-tutor-device": "wasm" });
    await page.goto("/offline/assistant/");
    await expect(page.getByRole("radio")).toHaveCount(1);
    await expect(page.getByRole("radio", { name: /^SmolLM2 360M/ })).toBeChecked();
    const download = page.getByRole("button", { name: /^Download/ });
    await expect(download).toBeDisabled();
    await page.getByLabel("I understand it will be slow on this device.").check();
    await expect(download).toBeEnabled();
  });

  test("the lesson tutor offers its compact models only", async ({ page }) => {
    await setup(page);
    await page.goto("/");
    await page.getByRole("button", { name: /Ask the tutor/ }).click();
    const sheet = page.getByRole("dialog", { name: "AI tutor" });
    await sheet.getByRole("button", { name: "Choose a model" }).click();
    for (const name of [/^Qwen3 0\.6B/, /^Qwen3\.5 0\.8B/, /^Gemma 3 1B/, /^Qwen2\.5 0\.5B/, /^SmolLM2 360M/]) await expect(sheet.getByRole("radio", { name })).toBeVisible();
    await expect(sheet.getByRole("radio", { name: /^Llama 3\.2 3B/ })).toHaveCount(0);
    await expect(sheet.getByRole("radio")).toHaveCount(5);
  });

  test("the offline page links to the assistant once a model and the site are saved", async ({ page }) => {
    await setup(page, { "kh-tutor-model": { status: "downloaded", model: "qwen3-0.6b-mlc", device: "webgpu" } });
    await page.goto("/offline/");
    await page.getByRole("button", { name: "Save for offline use" }).click();
    await expect(page.getByText("Saved. It works offline.")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("link", { name: "Open the offline assistant" }).click();
    await expect(page).toHaveURL(/\/offline\/assistant\/?$/);
    await expect(page.getByRole("heading", { level: 1, name: "Offline assistant" })).toBeVisible();
  });
});
