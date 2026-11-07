import { expect, test } from "@playwright/test";

test.describe("where to start", () => {
  test("is reachable from the home page and the footer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Find your level" }).click();
    await expect(page).toHaveURL(/\/start$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Where to start with AI");
    await expect(page.getByRole("link", { name: "Where to start" })).toBeVisible();
  });

  test("places a visitor in a bucket, remembers it, and tracks courses", async ({ page }) => {
    await page.goto("/start");
    const ask = async (q: RegExp, answer: string) => page.getByRole("radiogroup", { name: q }).getByRole("radio", { name: answer }).click();
    await ask(/at least weekly/, "Yes");
    await ask(/context, examples/, "Yes");
    await ask(/check AI answers/, "Not sure");
    await expect(page.getByText("Your starting point")).toHaveCount(0);
    await ask(/multi-step work/, "Yes");
    await expect(page.getByRole("heading", { name: "Bucket 3: Technical" }).first()).toBeVisible();
    await expect(page.locator(".start-result")).toContainText("ready to build with it");
    await page.getByRole("button", { name: "Save this as my bucket" }).click();
    await expect(page.getByText("Your bucket: 3, Technical")).toBeVisible();

    // Unsure counts as no: changing the prompting answer drops the visitor to Bucket 2.
    await ask(/context, examples/, "Not sure");
    await expect(page.locator(".start-result")).toContainText("Bucket 2: Applied AI");

    // Tick off a course; progress and the choice survive a reload.
    const bucket1 = page.locator("section", { has: page.getByRole("heading", { name: "Bucket 1: Foundations" }) });
    await bucket1.getByLabel("Mark Claude 101 as done").check();
    await expect(bucket1.getByText("1 of 4 courses done")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Your bucket: 3, Technical")).toBeVisible();
    await expect(bucket1.getByLabel("Mark Claude 101 as done")).toBeChecked();
  });

  test("links each course to its own page and to its discussion board", async ({ page }) => {
    await page.goto("/start");
    const link = page.getByRole("link", { name: /^Claude 101/ });
    await expect(link).toHaveAttribute("href", "https://academy.claude.com/courses/claude-101");
    await expect(link).toHaveAttribute("rel", /noopener/);
    const row = page.locator(".start-course", { hasText: "Claude 101" });
    await row.getByRole("link", { name: "Discuss" }).click();
    await expect(page).toHaveURL(/\/team\?board=claude-101$/);
  });

  test("fits a phone without sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/start");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
});
