import { expect, test } from "@playwright/test";

test.describe("green AI page", () => {
  test.use({ viewport: { width: 1280, height: 860 } });

  test("is reachable from the navigation", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Primary" }).first().getByRole("link", { name: "Green AI" }).click();
    await expect(page).toHaveURL(/\/green$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Use AI well, and lightly.");
    await expect(page.getByRole("heading", { name: "Sources" })).toBeVisible();
  });

  test("the picker recommends a lighter option for each task", async ({ page }) => {
    await page.goto("/green");
    const group = page.getByRole("radiogroup", { name: "What are you doing?" });
    const result = page.locator(".picker-result");
    await expect(group.getByRole("radio", { name: "Quick fact or rewrite" })).toHaveAttribute("aria-checked", "true");
    await expect(result).toContainText("A small, fast model");
    await expect(result).toContainText("Open the tutor");

    await group.getByRole("radio", { name: "Make a video" }).click();
    await expect(group.getByRole("radio", { name: "Make a video" })).toHaveAttribute("aria-checked", "true");
    await expect(result).toContainText("generated video last");
    await expect(result).toContainText("Heaviest");
    await expect(page).toHaveURL(/task=video/);

    // Arrow keys move through the tasks.
    await page.keyboard.press("ArrowLeft");
    await expect(group.getByRole("radio", { name: "Make an image" })).toBeFocused();
    await expect(result).toContainText("Text, a diagram or an existing image first");

    await result.getByRole("link", { name: "Canva" }).click();
    await expect(page).toHaveURL(/\/tools\/canva$/);
  });

  test("habit ticks and the pledge survive a reload", async ({ page }) => {
    await page.goto("/green");
    await page.getByRole("checkbox", { name: /Batch related questions/ }).check();
    await page.getByRole("checkbox", { name: /Pick the smallest model/ }).check();
    await expect(page.getByRole("img", { name: "2 of 8 habits" })).toBeVisible();
    await expect(page.locator(".sprout-leaf.on")).toHaveCount(4);
    await page.getByRole("button", { name: "Take the pledge" }).click();
    await expect(page.getByText(/You took the pledge on/)).toBeVisible();

    await page.reload();
    await expect(page.getByRole("checkbox", { name: /Batch related questions/ })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: /Give context up front/ })).not.toBeChecked();
    await expect(page.getByRole("img", { name: "2 of 8 habits" })).toBeVisible();
    await expect(page.getByText(/You took the pledge on/)).toBeVisible();

    // Ticking every habit brings the sprout into bloom.
    for (const box of await page.locator(".habit input").all()) await box.check();
    await expect(page.getByText(/All eight/)).toBeVisible();
    await expect(page.locator(".sprout-bloom.on")).toHaveCount(1);
  });

  test("opens the tutor from the page", async ({ page }) => {
    await page.goto("/green");
    await page.getByRole("button", { name: /AI and the environment/ }).click();
    await expect(page.getByRole("dialog", { name: "AI tutor" })).toBeVisible();
  });

  test("fits a 360px phone without sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto("/green");
    await expect(page.locator(".bottom-nav .nav-item")).toHaveCount(5);
    await expect(page.locator(".bottom-nav").getByRole("link", { name: "Green AI" })).toBeVisible();
    const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    expect(scroll).toBeLessThanOrEqual(inner);
  });
});
