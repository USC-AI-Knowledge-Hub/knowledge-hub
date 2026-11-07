import { expect, test } from "@playwright/test";

test.describe("what's new", () => {
  test("lists what changed, links the feed, and is reachable from the home page", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await page.getByRole("link", { name: "What's new on the Hub" }).first().click();
    await expect(page).toHaveURL(/\/new$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("What's new");
    await expect(page.getByRole("link", { name: "Follow with an RSS reader" })).toHaveAttribute("href", "/feed.xml");
    await expect(page.getByRole("heading", { name: "Spotted by the daily run" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Reviews updated" })).toBeVisible();
  });

  test("fits a phone without sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/new");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
});
