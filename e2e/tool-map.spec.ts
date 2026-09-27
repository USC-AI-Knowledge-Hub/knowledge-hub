import { expect, test } from "@playwright/test";

test.describe("tool map", () => {
  test.use({ viewport: { width: 1280, height: 860 } });

  test("shows every tool grouped into labeled categories", async ({ page }) => {
    await page.goto("/tools");
    await expect(page.locator(".map-node")).toHaveCount(30);
    await expect(page.locator(".map-cluster")).toHaveCount(7);
    await expect(page.getByRole("button", { name: /^Research and papers$/ }).first()).toBeVisible();
    // Built-on links are always drawn; "lets you pick" links only while a tool is pointed at.
    await expect(page.locator(".map-svg .edge.built-on")).toHaveCount(3);
    await expect(page.locator(".map-svg .edge.choose")).toHaveCount(0);
    await page.locator('[data-tool="cursor"]').hover();
    await expect(page.locator(".map-svg .edge.choose")).toHaveCount(3);
    await expect(page.locator(".map-callout")).toContainText("Lets you pick");
  });

  test("intent search highlights matches and lists why", async ({ page }) => {
    await page.goto("/tools");
    await expect(page.locator(".map-node")).toHaveCount(30);
    await page.keyboard.press("/");
    await expect(page.locator("#map-q")).toBeFocused();
    await page.locator("#map-q").fill("make slides from my notes");
    await expect(page.locator('[data-tool="gamma"]')).toHaveAttribute("data-match", "");
    await expect(page.locator('[data-tool="zapier"]')).toHaveAttribute("data-dim", "");
    await expect(page.locator(".map-hits")).toContainText("Gamma");
    await expect(page.locator(".map-hits")).toContainText("make a presentation");
    await expect(page).toHaveURL(/q=make/);
  });

  test("empty search suggests task words", async ({ page }) => {
    await page.goto("/tools?q=zzzz");
    await expect(page.locator(".map-empty")).toContainText("No tool matches");
    await page.getByRole("button", { name: "make a presentation" }).click();
    await expect(page.locator(".map-hits")).toContainText("Gamma");
  });

  test("category chips highlight one cluster", async ({ page }) => {
    await page.goto("/tools");
    await page.locator(".map-chips").getByRole("button", { name: "Automation" }).click();
    await expect(page.locator('[data-tool="zapier"]')).toHaveAttribute("data-match", "");
    await expect(page.locator('[data-tool="chatgpt"]')).toHaveAttribute("data-dim", "");
  });

  test("a node opens the glass pop-up; Back and Escape close it", async ({ page }) => {
    await page.goto("/tools");
    await page.locator('[data-tool="notebooklm"]').click();
    const sheet = page.locator("dialog.tool-sheet");
    await expect(sheet).toBeVisible();
    await expect(page).toHaveURL(/tool=notebooklm/);
    await expect(sheet.getByRole("heading", { name: "NotebookLM", level: 2 })).toBeVisible();
    await expect(sheet.locator(".sheet-lineage")).toContainText("Gemini");
    // 1:3 split on wide screens.
    const [left, right] = await Promise.all([sheet.locator(".sheet-left").boundingBox(), sheet.locator(".sheet-right").boundingBox()]);
    expect(right!.width / left!.width).toBeGreaterThan(2.6);
    expect(right!.width / left!.width).toBeLessThan(3.4);

    await page.goBack();
    await expect(sheet).toBeHidden();
    await expect(page).not.toHaveURL(/tool=/);

    await page.locator('[data-tool="claude"]').click();
    await expect(sheet).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  });

  test("deep link opens the pop-up and a video plays above it", async ({ page }) => {
    await page.goto("/tools?tool=chatgpt");
    const sheet = page.locator("dialog.tool-sheet");
    await expect(sheet).toBeVisible();
    const video = sheet.locator(".vrow").first();
    if (await video.count()) {
      await video.click();
      await expect(page.locator("dialog.player")).toBeVisible();
      await page.locator("dialog.player").getByRole("button", { name: "Close" }).click();
      await expect(page.locator("dialog.player")).toBeHidden();
      await expect(sheet).toBeVisible();
    }
  });

  test("keyboard: tab to a node and press Enter", async ({ page }) => {
    await page.goto("/tools");
    await page.locator('[data-tool="chatgpt"]').focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("dialog.tool-sheet")).toBeVisible();
    await expect(page).toHaveURL(/tool=chatgpt/);
  });

  test("dragging pans without opening a tool", async ({ page }) => {
    await page.goto("/tools");
    const layer = page.locator(".map-world");
    const before = await layer.evaluate((el) => el.style.transform);
    const box = (await page.locator('[data-tool="gemini"]').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 20);
    await page.mouse.down();
    await page.mouse.move(box.x + 160, box.y + 80, { steps: 8 });
    await page.mouse.up();
    expect(await layer.evaluate((el) => el.style.transform)).not.toBe(before);
    await expect(page.locator("dialog.tool-sheet")).toBeHidden();
  });

  test("list view keeps the finder and opens the same pop-up", async ({ page }) => {
    await page.goto("/tools?view=list");
    await expect(page.getByRole("heading", { name: "What are you trying to do?" })).toBeVisible();
    await page.locator(".tool-card", { hasText: "Perplexity" }).click();
    await expect(page.locator("dialog.tool-sheet")).toBeVisible();
    await expect(page).toHaveURL(/view=list.*tool=perplexity|tool=perplexity.*view=list/);
  });

  test("full tool page still works", async ({ page }) => {
    await page.goto("/tools/claude-code");
    await expect(page.getByRole("heading", { name: "Claude Code", level: 1 })).toBeVisible();
    await expect(page.locator("#quickstart")).toBeVisible();
  });
});

test.describe("tool map on a phone", () => {
  test.use({ viewport: { width: 400, height: 860 }, hasTouch: true });

  test("defaults to the list, the map still works, and nothing scrolls sideways", async ({ page }) => {
    await page.goto("/tools");
    await expect(page.locator(".tool-card").first()).toBeVisible();
    await page.getByRole("radio", { name: "Map" }).click();
    await expect(page.locator(".map-node")).toHaveCount(30);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(400);
    await page.goto("/tools?tool=otter");
    await expect(page.locator("dialog.tool-sheet")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(400);
  });
});
