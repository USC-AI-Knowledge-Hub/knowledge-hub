import { expect, test } from "@playwright/test";

test.describe("prompt library", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("filters by category and by search", async ({ page }) => {
    await page.goto("/prompts");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Prompts that work");
    const total = await page.locator(".pr-card").count();
    expect(total).toBeGreaterThanOrEqual(24);
    await page.getByRole("button", { name: "Teaching", exact: true }).click();
    await expect(page.locator(".pr-card")).toHaveCount(4);
    await page.getByRole("button", { name: "All", exact: true }).click();
    await page.getByLabel("Search prompts").fill("debug");
    await expect(page.locator(".pr-card")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Debug without just handing me the fix" })).toBeVisible();
    await page.getByLabel("Search prompts").fill("zzzzqq");
    await expect(page.getByText("No prompts match")).toBeVisible();
  });

  test("fills in the blanks and copies the finished prompt", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/prompts#explain-new");
    const card = page.locator("#explain-new");
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Fill in the blanks" }).click();
    await card.getByLabel("topic").fill("entropy");
    await card.getByLabel("your major").fill("physics");
    await expect(card.locator(".pr-text")).toContainText("Explain entropy to me as if I'm a first-year student in physics.");
    await card.getByRole("button", { name: "Copy prompt" }).click();
    await expect(card.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("first-year student in physics");
    await expect(card.getByText("Check before you trust it.")).toBeVisible();
  });

  test("is linked from the footer and works on a phone", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Prompts that work" }).click();
    await expect(page).toHaveURL(/\/prompts$/);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/prompts");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
});
