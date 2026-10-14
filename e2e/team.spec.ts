import { expect, test } from "@playwright/test";

test.describe("AI Team boards", () => {
  test("is a tab under Green AI and switches tools from a pop-up", async ({ page }) => {
    await page.goto("/green");
    await page.getByRole("navigation", { name: "Green AI sections" }).getByRole("link", { name: "AI Team" }).click();
    await expect(page).toHaveURL(/\/green\/team$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("AI Team");
    await expect(page.getByText("Now viewing")).toBeVisible();

    await page.getByRole("button", { name: /Switch tool/ }).click();
    const dialog = page.getByRole("dialog", { name: "Pick a tool's board" });
    await expect(dialog.getByRole("button")).toHaveCount(9);
    await dialog.getByRole("button", { name: /Claude/ }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/tool=claude/);
    await expect(page.locator(".team-switch")).toContainText("Claude");
  });

  test("fits a phone without sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 800 });
    await page.goto("/green/team");
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(over).toBeLessThanOrEqual(0);
  });
});
