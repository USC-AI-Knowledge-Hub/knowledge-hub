import { expect, test, type Page } from "@playwright/test";

/** Stands in for giscus: records how the page configured it and draws a frame, as the real script does. */
async function fakeGiscus(page: Page) {
  await page.route("https://giscus.app/client.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `(() => {
        const s = document.currentScript;
        const f = document.createElement("iframe");
        f.className = "giscus-frame";
        f.title = "Comments";
        f.dataset.term = s.getAttribute("data-term");
        f.dataset.theme = s.getAttribute("data-theme");
        f.dataset.category = s.getAttribute("data-category-id");
        f.style.cssText = "width:100%;height:200px;border:0";
        s.parentElement.append(f);
      })();`,
    }),
  );
}

test.describe("AI Team boards", () => {
  test("is in the side navigation and switches tools from a pop-up", async ({ page }) => {
    await fakeGiscus(page);
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto("/");
    await page.getByRole("navigation", { name: "Primary" }).first().getByRole("link", { name: "AI Team" }).click();
    await expect(page).toHaveURL(/\/team$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("AI Team");

    const frame = page.locator("iframe.giscus-frame");
    await expect(frame).toHaveCount(1);
    await expect(frame).toHaveAttribute("data-term", "ai-team:chatgpt");
    await expect(frame).toHaveAttribute("data-category", /^DIC_/);

    await page.getByRole("button", { name: /Switch tool/ }).click();
    const dialog = page.getByRole("dialog", { name: "Pick a tool's board" });
    await expect(dialog.getByRole("button")).toHaveCount(9);
    await dialog.getByRole("button", { name: /Claude/ }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/tool=claude/);
    await expect(page.locator(".team-switch")).toContainText("Claude");
    await expect(frame).toHaveCount(1);
    await expect(frame).toHaveAttribute("data-term", "ai-team:claude");
  });

  test("the old Green AI address leads to the new page", async ({ page }) => {
    await fakeGiscus(page);
    await page.goto("/green/team");
    await expect(page).toHaveURL(/\/team$/);
  });

  test("uses the dark comment theme in the dark site theme", async ({ page }) => {
    await fakeGiscus(page);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/team");
    await expect(page.locator("iframe.giscus-frame")).toHaveAttribute("data-theme", "dark");
  });

  test("fits a phone without sideways scrolling", async ({ page }) => {
    await fakeGiscus(page);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/team");
    await page.locator("iframe.giscus-frame").waitFor();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    await expect(page.getByRole("navigation", { name: "Primary" }).last().getByRole("link", { name: "AI Team" })).toBeVisible();
  });
});
