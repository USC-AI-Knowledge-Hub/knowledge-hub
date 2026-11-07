import { expect, test } from "@playwright/test";

test.describe("compare tools", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("shows two tools side by side and lets you change them", async ({ page }) => {
    await page.goto("/tools");
    await page.getByRole("link", { name: "Compare tools side by side" }).click();
    await expect(page).toHaveURL(/\/tools\/compare$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("ChatGPT vs Claude");
    await expect(page.getByRole("heading", { name: "At a glance" })).toBeVisible();
    for (const row of ["Best for", "Cost", "Privacy", "Academic integrity", "Last reviewed"]) await expect(page.getByRole("heading", { name: row, exact: true })).toBeVisible();

    await page.getByLabel("Second tool").selectOption("gemini");
    await expect(page).toHaveURL(/a=chatgpt&b=gemini/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("ChatGPT vs Gemini");

    // A third tool is optional.
    await page.getByLabel("Third tool (optional)").selectOption("perplexity");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("ChatGPT vs Gemini vs Perplexity");
    await expect(page.locator(".cmp-tool")).toHaveCount(3);
  });

  test("popular pairs have their own address, in either order, and unknown ones don't exist", async ({ page }) => {
    await page.goto("/tools/compare/claude-vs-chatgpt");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Claude vs ChatGPT");
    await expect(page.getByRole("link", { name: "Full review" }).first()).toBeVisible();
    await page.goto("/tools/compare/chatgpt-vs-nothing");
    await expect(page.getByRole("heading", { name: /This page doesn't exist/ })).toBeVisible();
  });

  test("a tool's page links to its popular comparisons", async ({ page }) => {
    await page.goto("/tools/claude");
    await page.getByRole("link", { name: "Gemini", exact: true }).first().click();
    await expect(page).toHaveURL(/\/tools\/compare\/claude-vs-gemini$/);
  });

  test("stacks on a phone without sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/tools/compare/chatgpt-vs-claude");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    await expect(page.locator(".cmp-cell-tool").first()).toBeVisible();
  });
});
