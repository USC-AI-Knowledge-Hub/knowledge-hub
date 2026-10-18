import { expect, test, type Page } from "@playwright/test";

/** Without a database address the board keeps posts on the device, which is what these tests use. */
const openBoard = async (page: Page, query = "board=claude-101") => {
  await page.goto(`/team?${query}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
};
const post = async (page: Page, name: string, body: string) => {
  const box = page.locator(".board-new");
  await box.getByLabel("Your name").fill(name);
  await box.getByRole("textbox").last().fill(body);
  await box.getByRole("button", { name: "Post" }).click();
};

test.describe("AI Team boards", () => {
  test("is in the side navigation and lists a board per course by bucket, plus tools", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.goto("/");
    await page.getByRole("navigation", { name: "Primary" }).first().getByRole("link", { name: "AI Team" }).click();
    await expect(page).toHaveURL(/\/team$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("AI Team");
    for (const h of ["Tools", "Bucket 1: Foundations", "Bucket 2: Applied AI", "Bucket 3: Technical"]) await expect(page.getByRole("heading", { name: h })).toBeVisible();
    await expect(page.locator(".team-tile")).toHaveCount(16);
    await page.getByRole("link", { name: /Claude 101/ }).click();
    await expect(page).toHaveURL(/board=claude-101/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Claude 101");
    await expect(page.getByText("Anthropic · Bucket 1: Foundations")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open the course" })).toHaveAttribute("href", "https://academy.claude.com/courses/claude-101");
    await expect(page.getByRole("button", { name: "What I learned" })).toBeVisible();
  });

  test("posts, replies, reacts, edits and deletes, and remembers the name", async ({ page }) => {
    await openBoard(page);
    await expect(page.getByText("isn't connected to the shared database")).toBeVisible();
    await expect(page.getByText("No topics here yet")).toBeVisible();

    await post(page, "Sam", "The prompting module helped. See https://example.com/guide.");
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

  test("keeps topics and boards apart, and switches boards from the pop-up", async ({ page }) => {
    await openBoard(page, "board=claude-101&topic=resources");
    await post(page, "Sam", "A great video");
    await page.getByRole("button", { name: "Questions" }).click();
    await expect(page.getByText("No topics here yet")).toBeVisible();
    await page.getByRole("button", { name: "All topics" }).click();
    await expect(page.locator(".board-post")).toHaveCount(1);
    await expect(page.locator(".board-post").first()).toContainText("Resources");

    await page.getByRole("button", { name: /Switch board/ }).click();
    const dialog = page.getByRole("dialog", { name: "Pick a board" });
    await expect(dialog.getByRole("link")).toHaveCount(16);
    await dialog.getByRole("link", { name: /Vibe Coding 101 with Replit/ }).click();
    await expect(page).toHaveURL(/board=dlai-vibe-coding-replit/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vibe Coding 101 with Replit");
    await expect(page.getByText("No topics here yet")).toBeVisible();
  });

  test("the tools board has its own topics", async ({ page }) => {
    await openBoard(page, "board=tools");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("AI tools");
    for (const t of ["Videos", "Articles", "New tools and features", "Prompts and tips", "Questions"]) await expect(page.getByRole("button", { name: t })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open the course" })).toHaveCount(0);
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
    for (const url of ["/team", "/team?board=anthropic-ai-fluency-framework"]) {
      await page.goto(url);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    }
    await post(page, "A name that is quite long for a phone screen", "x".repeat(300) + " https://example.com/a/very/long/address/that/keeps/going/and/going/forever/and/ever");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
});
