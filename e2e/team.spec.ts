import { expect, test } from "@playwright/test";

test.describe("AI Team boards", () => {
  test("is in the side navigation and has a tile per tool that opens its GitHub board", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto("/");
    await page.getByRole("navigation", { name: "Primary" }).first().getByRole("link", { name: "AI Team" }).click();
    await expect(page).toHaveURL(/\/team$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("AI Team");
    await expect(page.locator(".team-tile")).toHaveCount(8);

    const tile = page.locator(".team-tile", { hasText: "Claude" });
    const main = tile.locator(".team-tile-main");
    const href = decodeURIComponent(((await main.getAttribute("href")) ?? "").replaceAll("+", " "));
    expect(href).toContain("https://github.com/orgs/USC-AI-Knowledge-Hub/discussions?discussions_q=category:ai-team in:title Claude");
    await expect(main).toHaveAttribute("target", "_blank");

    await expect(tile.getByRole("list", { name: "Claude topics" }).getByRole("link")).toHaveCount(5);
    const videos = decodeURIComponent(((await tile.getByRole("link", { name: "Videos" }).getAttribute("href")) ?? "").replaceAll("+", " "));
    expect(videos).toContain("in:title Claude Videos");

    await tile.getByText("Start a topic").click();
    const articles = decodeURIComponent(((await tile.getByRole("link", { name: /^Articles/ }).last().getAttribute("href")) ?? "").replaceAll("+", " "));
    expect(articles).toContain("https://github.com/orgs/USC-AI-Knowledge-Hub/discussions/new?category=ai-team&title=Claude · Articles: ");
  });

  test("the old Green AI address leads to the new page", async ({ page }) => {
    await page.goto("/green/team");
    await expect(page).toHaveURL(/\/team$/);
  });

  test("fits a phone without sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/team");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
});
