import { expect, test } from "@playwright/test";

// The Watch explorer runs on the committed library (public/data/videos.json).
test.describe("watch explorer", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("https://i.ytimg.com/**", (route) => route.abort());
  });

  test.describe("wide screens", () => {
    test.use({ viewport: { width: 1440, height: 1000 } });

    test("picking a task zooms in and narrows the videos; All tasks zooms out", async ({ page }) => {
      await page.goto("/watch");
      const map = page.getByRole("group", { name: "Video library map" });
      await expect(map.getByRole("button", { name: /^All videos/ })).toBeVisible();
      await map.getByRole("button", { name: /Create video/ }).click();
      await expect(page).toHaveURL(/task=video/);
      await expect(page.getByRole("heading", { level: 2, name: /^Create video/ })).toBeVisible();
      await expect(map.locator(".tx-tool").first()).toBeVisible();
      await map.getByRole("button", { name: "All tasks" }).click();
      await expect(page).not.toHaveURL(/task=/);
      await expect(map.getByRole("button", { name: /^All videos/ })).toBeVisible();
    });

    test("picking a tool shows its videos in that task, then all of them, and its guide", async ({ page }) => {
      await page.goto("/watch?task=video");
      const map = page.getByRole("group", { name: "Video library map" });
      await map.locator(".tx-tool", { hasText: "Kling" }).click();
      await expect(page).toHaveURL(/tool=kling/);
      await expect(page.getByRole("heading", { level: 2, name: /^Kling in Create video/ })).toBeVisible();
      // The page scrolls down to the tool's videos.
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(300);
      await expect(page.getByRole("heading", { level: 2, name: /^Kling in Create video/ })).toBeInViewport();
      await expect(page.getByRole("link", { name: "Tool guide" })).toHaveAttribute("href", /\/tools\/kling$/);
      await page.getByRole("button", { name: "All Kling videos" }).click();
      await expect(page).not.toHaveURL(/task=/);
      await expect(page.getByRole("heading", { level: 2, name: /^Kling \d/ })).toBeVisible();
      await page.goto("/watch?task=video&tool=kling");
      await expect(page.getByRole("heading", { level: 2, name: /^Kling in Create video/ })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page).not.toHaveURL(/tool=/);
      await expect(page).toHaveURL(/task=video/);
    });

    test("searching a tool or a task zooms the map there", async ({ page }) => {
      await page.goto("/watch");
      // Pages load on demand: wait for the library before typing, as a visitor would.
      await expect(page.getByRole("group", { name: "Video library map" }).getByRole("button", { name: /^All videos/ })).toBeVisible();
      const search = page.getByLabel("Search videos by tool, task or keyword");
      await search.fill("n8n");
      await expect(page).toHaveURL(/tool=n8n/);
      await expect(page.getByRole("status")).toContainText("Showing every n8n video");
      await search.fill("make slides");
      await expect(page).toHaveURL(/task=present/);
      await expect(page.getByRole("status")).toContainText("Zoomed to Make a presentation");
    });

    test("a shared search link opens zoomed", async ({ page }) => {
      await page.goto("/watch?q=make%20slides");
      await expect(page.getByRole("group", { name: "Video library map" }).getByRole("button", { name: "All tasks" })).toBeVisible();
      await expect(page.getByRole("heading", { level: 2, name: /^Make a presentation/ })).toBeVisible();
    });

    test("other words filter the videos", async ({ page }) => {
      await page.goto("/watch");
      await page.getByLabel("Search videos by tool, task or keyword").fill("zzzz-nothing");
      await expect(page.getByRole("status")).toContainText("No tool or task by that name");
      await expect(page.getByRole("heading", { level: 2, name: /Videos matching/ })).toContainText("0");
    });
  });

  test.describe("phones", () => {
    test.use({ viewport: { width: 360, height: 800 } });

    test("tasks are tiles and tools are chips, with no sideways scroll", async ({ page }) => {
      await page.goto("/watch");
      const tiles = page.getByRole("list", { name: "Tasks" });
      await expect(tiles).toBeVisible();
      await expect(page.getByRole("group", { name: "Video library map" })).toBeHidden();
      await tiles.getByRole("button", { name: /Create video/ }).click();
      await expect(page).toHaveURL(/task=video/);
      await page.getByRole("list", { name: "Tools in Create video" }).getByRole("button", { name: /Kling/ }).click();
      await expect(page).toHaveURL(/tool=kling/);
      const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(scroll).toBeLessThanOrEqual(0);
    });
  });
});
