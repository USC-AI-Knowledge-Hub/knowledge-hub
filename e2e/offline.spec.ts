import { expect, test, type Page } from "@playwright/test";

/**
 * Offline mode: save the site, lose the network, and the lessons and the tutor still open.
 * These use the mock tutor model, so they run in seconds; the real model going offline is
 * checked at the end of the @model test in tutor.spec.ts.
 */

async function setup(page: Page) {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(() => {
    if (sessionStorage.getItem("kh-e2e-init")) return;
    sessionStorage.setItem("kh-e2e-init", "1");
    localStorage.setItem("kh-tutor-mock", "1");
    localStorage.setItem("kh-tutor-model", JSON.stringify({ status: "downloaded", model: "qwen3-0.6b-mlc", device: "webgpu" }));
  });
}

async function save(page: Page) {
  await page.goto("/offline/");
  await page.getByRole("button", { name: "Save for offline use" }).click();
  await expect(page.getByText("Saved. It works offline.")).toBeVisible({ timeout: 30_000 });
  // Once saved, the worker is in charge of this page, which is what serves it offline.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
}

test.describe("offline mode", () => {
  test("a saved site and tutor work with the network off", async ({ page, context }) => {
    await setup(page);
    await save(page);
    await expect(page.getByRole("button", { name: "Open the tutor" })).toBeVisible();

    await context.setOffline(true);
    await page.goto("/offline/");
    await expect(page.getByRole("heading", { level: 1, name: "Use the tutor without internet" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "You're offline, and everything you saved is here" })).toBeVisible();

    // A page nobody visited while online still opens, because the saved app handles any address.
    await page.goto("/learn/lesson/prompting/");
    await expect(page.getByRole("heading", { level: 1, name: "Prompting that works" })).toBeVisible();
    await expect(page).toHaveTitle(/Prompting that works/);

    // The tutor opens and answers without the network.
    await page.getByRole("button", { name: /Ask the tutor/ }).click();
    const sheet = page.getByRole("dialog", { name: "AI tutor" });
    await expect(sheet).toBeVisible();
    // A model saved earlier loads from the browser without asking.
    await expect(sheet.getByText(/Qwen3 0.6B on WebGPU/)).toBeVisible({ timeout: 20_000 });
    const input = page.getByRole("textbox", { name: "Ask the tutor" });
    await input.fill("What is a token?");
    await input.press("Enter");
    await expect(sheet.locator(".t-msg.tutor").last()).toContainText(/token/i, { timeout: 15_000 });
  });

  test("the offline page is the saved app's start page and says what's saved", async ({ page }) => {
    await setup(page);
    await page.goto("/offline/");
    await expect(page.getByRole("button", { name: "Save for offline use" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Open the tutor" })).toHaveCount(0);
    await expect(page.getByText(/qwen3 0.6b/i).first()).toBeVisible();
    const manifest = await (await page.request.get("/manifest.webmanifest")).json();
    expect(manifest.start_url).toBe("offline/");
    expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(["192x192", "512x512"]);
  });

  test("removing the saved site clears the worker and its files", async ({ page }) => {
    await setup(page);
    await save(page);
    await page.getByRole("button", { name: "Remove the saved site" }).click();
    await expect(page.getByRole("button", { name: "Save for offline use" })).toBeVisible();
    const left = await page.evaluate(async () => ({
      caches: (await caches.keys()).filter((k) => k.startsWith("kh-")),
      workers: (await navigator.serviceWorker.getRegistrations()).length,
      flag: localStorage.getItem("kh-offline"),
    }));
    expect(left).toEqual({ caches: [], workers: 0, flag: null });
  });

  test("an unsaved visit never installs a worker", async ({ page }) => {
    await setup(page);
    await page.goto("/learn/");
    await page.goto("/tools/");
    expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
  });
});
