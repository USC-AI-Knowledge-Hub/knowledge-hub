import { expect, test } from "@playwright/test";

test.describe("AI Team boards", () => {
  test("is in the side navigation and has a tile per tool that opens its GitHub board", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto("/");
    await page.getByRole("navigation", { name: "Primary" }).first().getByRole("link", { name: "AI Team" }).click();
    await expect(page).toHaveURL(/\/team$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("AI Team");
    await expect(page.locator(".team-tile")).toHaveCount(8);

    const board = page.getByRole("link", { name: /Claude/ }).filter({ hasText: "Open the board" });
    const href = (await board.getAttribute("href")) ?? "";
    expect(href).toContain("https://github.com/USC-AI-Knowledge-Hub/knowledge-hub/discussions?discussions_q=");
    expect(decodeURIComponent(href.replaceAll("+", " "))).toContain("category:ai-team in:title Claude");
    await expect(board).toHaveAttribute("target", "_blank");

    const topic = page.locator(".team-tile", { hasText: "Claude" }).getByRole("link", { name: /Start a topic/ });
    const start = decodeURIComponent(((await topic.getAttribute("href")) ?? "").replaceAll("+", " "));
    expect(start).toContain("https://github.com/orgs/USC-AI-Knowledge-Hub/discussions/new?category=ai-team&title=Claude: ");
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
