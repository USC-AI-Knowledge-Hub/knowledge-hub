import { expect, test, type Page } from "@playwright/test";

const ID = "b1j0Hf1GqZE";
const enc = (h: string, id: string, why = "") => [h, `https://www.youtube.com/watch?v=${id}`, ...(why ? ["", why] : [])].join("\n");
const ago = (hours: number) => new Date(Date.now() - hours * 3600e3).toISOString();
const row = (id: string, name: string, topic: string, body: string, votes: number, hours: number) => ({
  id,
  board: "video-recs",
  topic,
  parentId: null,
  name,
  body,
  createdAt: ago(hours),
  editedAt: null,
  deleted: false,
  reactions: votes ? { "👍": Array.from({ length: votes }, (_, i) => `voter-${i}`) } : {},
  reports: [],
});

/** Picks other people made, kept in the board's on-device store, and thumbnails served locally. */
async function seed(page: Page, rows: unknown[]) {
  await page.route(/i\.ytimg\.com/, (r) =>
    r.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"/>',
    }),
  );
  await page.addInitScript((r) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("kh-board-local", JSON.stringify(r));
      sessionStorage.setItem("seeded", "1");
    }
  }, rows);
}

test.describe("video picks", () => {
  test("ranks picks by votes, and a vote can be given and taken back", async ({ page }) => {
    await seed(page, [
      row("a", "Maya", "found", enc("Second best", "zjkBMFhNj_g"), 2, 30),
      row("b", "Jordan", "found", enc("The best one", "ajfQWhGQGLE", "Watch from 4:10."), 5, 200),
      row("c", "Priya", "hub", enc("Newest, no votes", "9Hwanevuhd8"), 0, 1),
    ]);
    await page.goto("/team/test");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Video picks");
    const headlines = page.locator(".rec-card h3");
    await expect(headlines).toHaveText(["The best one", "Second best", "Newest, no votes"]);
    await expect(page.locator("#rec-b .rec-rank")).toHaveText("#1");
    await expect(page.locator("#rec-b img")).toHaveAttribute("src", "https://i.ytimg.com/vi/ajfQWhGQGLE/hqdefault.jpg");
    await expect(page.locator("#rec-b .rec-watch")).toHaveAttribute("href", "https://www.youtube.com/watch?v=ajfQWhGQGLE");

    const vote = page.locator("#rec-a").getByRole("button", { name: /Vote for this pick, 2 votes/ });
    await vote.click();
    await expect(page.locator("#rec-a").getByRole("button", { name: /Remove your vote, 3 votes/ })).toHaveAttribute("aria-pressed", "true");
    await page
      .locator("#rec-a")
      .getByRole("button", { name: /Remove your vote/ })
      .click();
    await expect(page.locator("#rec-a").getByRole("button", { name: /Vote for this pick, 2 votes/ })).toHaveAttribute("aria-pressed", "false");

    await page.getByRole("radio", { name: "Newest" }).click();
    await expect(headlines.first()).toHaveText("Newest, no votes");
    await page.getByRole("radio", { name: "This week" }).click();
    await expect(headlines).toHaveText(["Second best", "Newest, no votes"]);
    await page.getByRole("radio", { name: "Top" }).click();
    await page.getByRole("button", { name: "From the Hub" }).click();
    await expect(headlines).toHaveText(["Newest, no votes"]);

    const leaders = page.locator(".rec-leaders li");
    await expect(leaders.first()).toContainText("Jordan");
    await expect(leaders.first()).toContainText("5 votes on 1 pick");
  });

  test("posts a pick with a preview, then edits and deletes it; your own pick can't be voted for", async ({ page }) => {
    await seed(page, []);
    await page.goto("/team/test");
    await expect(page.getByText("No picks yet")).toBeVisible();
    // With no picks yet, the form starts open.
    await page.getByRole("button", { name: "Post my pick" }).click();
    await expect(page.getByRole("alert")).toContainText("Add your name");

    await page.getByLabel("YouTube link").fill("https://vimeo.com/1");
    await expect(page.getByText("doesn't look like a YouTube video link")).toBeVisible();
    await page.getByLabel("YouTube link").fill(`https://youtu.be/${ID}?si=share`);
    await page.getByLabel("Your headline").fill("The clearest RAG explainer");
    await page.getByLabel("Why watch it?").fill("Short, with a good diagram.");
    await page.getByLabel("Your name").fill("Ana");
    await expect(page.locator(".rec-preview img")).toHaveAttribute("src", `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
    await expect(page.locator(".rec-preview")).toContainText("The clearest RAG explainer");
    await expect(page.locator(".rec-preview")).toContainText("by Ana");
    await page.getByRole("button", { name: "Post my pick" }).click();

    const card = page.locator(".rec-card:not(.is-preview)").first();
    await expect(card.locator("h3")).toHaveText("The clearest RAG explainer");
    await expect(card).toContainText("Ana");
    await expect(card).toContainText("You");
    await expect(card.getByRole("button", { name: /Vote for this pick/ })).toHaveCount(0);
    await expect(card).toContainText("0 votes");

    // The same video again points to the existing pick.
    await page.getByRole("button", { name: "Recommend a video" }).click();
    await page.getByLabel("YouTube link").fill(`https://www.youtube.com/watch?v=${ID}`);
    await expect(page.getByText("Already recommended by Ana")).toBeVisible();
    await page.getByLabel("Your headline").fill("Again");
    await page.getByRole("button", { name: "Post my pick" }).click();
    await expect(page.getByRole("alert")).toContainText("Vote for their pick instead");
    await page.getByRole("button", { name: "Vote for it instead" }).click();
    await expect(page.getByRole("button", { name: "Recommend a video" })).toBeVisible();

    await card.getByRole("button", { name: "Edit" }).click();
    await card.getByLabel("Headline").fill("The clearest RAG explainer, edited");
    await card.getByRole("button", { name: "Save" }).click();
    await expect(card.locator("h3")).toHaveText("The clearest RAG explainer, edited");
    await expect(card).toContainText("edited");

    await card.getByRole("button", { name: "Delete" }).click();
    await card.getByRole("alert").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("No picks yet")).toBeVisible();
  });

  test("skips posts that aren't picks, and fits a phone", async ({ page }) => {
    await seed(page, [
      row("x", "Spam", "found", "no link here", 9, 1),
      row("y", "Bad", "found", enc("Fake", "too-short"), 9, 1),
      row("z", "Ok", "hub", enc("Real one", ID), 0, 2),
    ]);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/team/test");
    await expect(page.locator(".rec-card h3")).toHaveText(["Real one"]);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
