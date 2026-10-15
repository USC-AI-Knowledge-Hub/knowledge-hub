import { expect, test, type Page } from "@playwright/test";

/** Without a database address the board keeps posts on the device, which is what these tests use. */
const openBoard = async (page: Page, query = "tool=claude") => {
  await page.goto(`/team?${query}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("board");
};
const post = async (page: Page, name: string, body: string) => {
  const box = page.locator(".board-new");
  await box.getByLabel("Your name").fill(name);
  await box.getByRole("textbox").last().fill(body);
  await box.getByRole("button", { name: "Post" }).click();
};

test.describe("AI Team boards", () => {
  test("is in the side navigation and has a tile per tool", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto("/");
    await page.getByRole("navigation", { name: "Primary" }).first().getByRole("link", { name: "AI Team" }).click();
    await expect(page).toHaveURL(/\/team$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("AI Team");
    await expect(page.locator(".team-tile")).toHaveCount(8);
    await page.locator(".team-tile", { hasText: "Claude" }).getByRole("link", { name: "Videos" }).click();
    await expect(page).toHaveURL(/tool=claude&topic=videos/);
    await expect(page.getByRole("button", { name: "Videos" })).toHaveAttribute("aria-pressed", "true");
  });

  test("posts, replies, reacts, edits and deletes, and remembers the name", async ({ page }) => {
    await openBoard(page);
    await expect(page.getByText("isn't connected to the shared database")).toBeVisible();
    await expect(page.getByText("No topics here yet")).toBeVisible();

    await post(page, "Sam", "Claude helped me outline my paper. See https://example.com/guide.");
    const first = page.locator(".board-post").first();
    await expect(first).toContainText("Sam");
    await expect(first.getByRole("link", { name: "https://example.com/guide" })).toHaveAttribute("href", "https://example.com/guide");

    await first.getByRole("button", { name: "Reply" }).click();
    await first.getByLabel(/Reply to Sam/).fill("Same here!");
    await first.getByRole("button", { name: "Reply", exact: true }).last().click();
    await expect(first.locator(".board-post.reply")).toContainText("Same here!");

    await first.getByRole("button", { name: "Helpful" }).first().click();
    await expect(first.getByRole("button", { name: "Helpful, 1" }).first()).toHaveAttribute("aria-pressed", "true");

    await first.getByRole("button", { name: "Edit" }).first().click();
    await first.getByLabel("Edit your post").fill("Edited post");
    await first.getByRole("button", { name: "Save" }).click();
    await expect(first).toContainText("Edited post");
    await expect(first).toContainText("edited");

    await page.reload();
    await expect(page.locator(".board-new").getByLabel("Your name")).toHaveValue("Sam");
    await expect(page.locator(".board-post").first()).toContainText("Edited post");

    const again = page.locator(".board-post").first();
    await again.getByRole("button", { name: "Delete" }).first().click();
    await again.locator(".board-confirm").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("This post was deleted.")).toBeVisible();
  });

  test("asks before sending a post that can't go", async ({ page }) => {
    await openBoard(page);
    await page.locator(".board-new").getByRole("button", { name: "Post" }).click();
    await expect(page.getByRole("alert")).toContainText("Add a name");
    await page.locator(".board-new").getByLabel("Your name").fill("Sam");
    await page.locator(".board-new").getByRole("button", { name: "Post" }).click();
    await expect(page.getByRole("alert")).toContainText("Write something");
  });

  test("keeps topics apart and switches tools from the pop-up", async ({ page }) => {
    await openBoard(page, "tool=claude&topic=videos");
    await post(page, "Sam", "A great video");
    await page.getByRole("button", { name: "Articles" }).click();
    await expect(page.getByText("No topics here yet")).toBeVisible();
    await page.getByRole("button", { name: "All topics" }).click();
    await expect(page.locator(".board-post")).toHaveCount(1);
    await expect(page.locator(".board-post").first()).toContainText("Videos");

    await page.getByRole("button", { name: /Switch tool/ }).click();
    const dialog = page.getByRole("dialog", { name: "Pick a tool's board" });
    await expect(dialog.getByRole("link")).toHaveCount(8);
    await dialog.getByRole("link", { name: /Gemini/ }).click();
    await expect(page).toHaveURL(/tool=gemini/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Gemini");
    await expect(page.getByText("No topics here yet")).toBeVisible();
  });

  test("sorts by top reactions", async ({ page }) => {
    await openBoard(page);
    await post(page, "Sam", "First post");
    await post(page, "Sam", "Second post");
    await expect(page.locator(".board-post").first()).toContainText("Second post");
    await page.getByRole("radio", { name: "Oldest" }).click();
    await expect(page.locator(".board-post").first()).toContainText("First post");
    await page.locator(".board-post", { hasText: "First post" }).getByRole("button", { name: "Love it" }).click();
    await page.getByRole("radio", { name: "Top" }).click();
    await expect(page.locator(".board-post").first()).toContainText("First post");
  });

  test("the old Green AI address leads to the new page", async ({ page }) => {
    await page.goto("/green/team");
    await expect(page).toHaveURL(/\/team$/);
  });

  test("fits a phone without sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    for (const url of ["/team", "/team?tool=claude"]) {
      await page.goto(url);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    }
    await post(page, "A name that is quite long for a phone screen", "x".repeat(300) + " https://example.com/a/very/long/address/that/keeps/going/and/going/forever/and/ever");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
});
