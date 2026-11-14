import { expect, test, type Page } from "@playwright/test";

/** A video that isn't in the Hub's library, so nothing about it is filled in for the student. */
const ID = "dQw4w9WgXcQ";
const enc = (h: string, id: string, why = "", tags: string[] = []) =>
  [h, `https://www.youtube.com/watch?v=${id}`, ...(tags.length ? [`tags: ${tags.join(", ")}`] : []), ...(why ? ["", why] : [])].join("\n");
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
  // YouTube's title lookup, for videos outside the Hub's library.
  await page.route(/youtube\.com\/oembed/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ title: "A video from YouTube" }) }));
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
      row("a", "Maya", "basics", enc("Second best", "zjkBMFhNj_g", "", ["llms", "beginner"]), 2, 30),
      row("b", "Jordan", "agents", enc("The best one", "ajfQWhGQGLE", "Watch from 4:10.", ["agents", "beginner"]), 5, 200),
      row("c", "Priya", "work", enc("Newest, no votes", "9Hwanevuhd8"), 0, 1),
    ]);
    await page.goto("/team/test");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Video picks");
    const headlines = page.locator(".rec-card:not(.is-preview) .rec-quote");
    await expect(headlines).toHaveText(["“The best one”", "“Second best”", "“Newest, no votes”"]);
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
    await expect(headlines.first()).toHaveText("“Newest, no votes”");
    await page.getByRole("radio", { name: "This week" }).click();
    await expect(headlines).toHaveText(["“Second best”", "“Newest, no votes”"]);
    await page.getByRole("radio", { name: "Top" }).click();

    // Categories, tags and search narrow the list together.
    await page.getByRole("group", { name: "Filter by category" }).getByRole("button", { name: /Agents and automation/ }).click();
    await expect(headlines).toHaveText(["“The best one”"]);
    await page.getByRole("group", { name: "Filter by category" }).getByRole("button", { name: /^All/ }).click();
    await page.locator("#rec-a").getByRole("button", { name: "Show picks tagged beginner" }).click();
    await expect(headlines).toHaveText(["“The best one”", "“Second best”"]);
    await expect(page.getByRole("heading", { name: "Popular tags" })).toBeVisible();
    await page.getByRole("button", { name: "Remove tag filter beginner" }).click();
    await page.getByLabel("Search picks").fill("jordan 4:10");
    await expect(headlines).toHaveText(["“The best one”"]);
    await page.getByLabel("Search picks").fill("nothing like this");
    await expect(page.getByText("No picks match")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(headlines).toHaveCount(3);

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
    await expect(page.getByLabel("Video title")).toHaveValue("A video from YouTube");
    await page.getByLabel("Your recommendation, in one line").fill("The clearest RAG explainer");
    await page.getByLabel("Your name").fill("Ana");
    await page.getByRole("button", { name: "Post my pick" }).click();
    await expect(page.getByRole("alert")).toContainText("Pick a category");
    await page.getByRole("combobox", { name: "Category" }).selectOption("agents");
    await page.getByLabel(/^Tags/).fill("RAG, Vector DB");
    await expect(page.locator(".rec-preview")).toContainText("#vector-db");
    await expect(page.locator(".rec-preview img")).toHaveAttribute("src", `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
    await expect(page.locator(".rec-preview")).toContainText("The clearest RAG explainer");
    await expect(page.locator(".rec-preview")).toContainText("Recommended by Ana");
    await expect(page.locator(".rec-preview .rec-title")).toHaveText("A video from YouTube");
    await page.getByRole("button", { name: "Post my pick" }).click();

    const card = page.locator(".rec-card:not(.is-preview)").first();
    await expect(card.locator("h3")).toHaveText("A video from YouTube");
    await expect(card.locator(".rec-quote")).toHaveText("“The clearest RAG explainer”");
    await expect(card).toContainText("Recommended by");
    await expect(card).toContainText("Ana");
    await expect(card).toContainText("You");
    await expect(card.getByRole("button", { name: /Vote for this pick/ })).toHaveCount(0);
    await expect(card).toContainText("0 votes");
    await expect(card).toContainText("Agents and automation");
    await expect(card.getByRole("button", { name: "Show picks tagged rag" })).toBeVisible();

    // The same video again points to the existing pick.
    await page.getByRole("button", { name: "Recommend a video" }).click();
    await page.getByLabel("YouTube link").fill(`https://www.youtube.com/watch?v=${ID}`);
    await expect(page.getByText("Already recommended by Ana")).toBeVisible();
    await page.getByLabel("Your recommendation, in one line").fill("Again");
    await page.getByRole("button", { name: "Post my pick" }).click();
    await expect(page.getByRole("alert")).toContainText("Vote for their pick instead");
    await page.getByRole("button", { name: "Vote for it instead" }).click();
    await expect(page.getByRole("button", { name: "Recommend a video" })).toBeVisible();

    await card.getByRole("button", { name: "Edit" }).click();
    await card.getByLabel("Your recommendation").fill("The clearest RAG explainer, edited");
    await card.getByLabel("Tags").fill("rag, beginner");
    await card.getByRole("button", { name: "Save" }).click();
    await expect(card.locator(".rec-quote")).toHaveText("“The clearest RAG explainer, edited”");
    await expect(card).toContainText("edited");
    await expect(card.getByRole("button", { name: "Show picks tagged beginner" })).toBeVisible();

    await card.getByRole("button", { name: "Delete" }).click();
    await card.getByRole("alert").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("No picks yet")).toBeVisible();
  });

  test("fills in the category and suggests tags for a video from the Hub's library", async ({ page, request }) => {
    // Use whatever the library holds today: the daily run adds and retires videos.
    const { videos } = (await (await request.get("/data/videos.json")).json()) as { videos: { title: string; topics: string[] }[] };
    const known = ["genai-basics", "chat-basics", "llms", "prompting", "writing", "research", "coding", "data", "agents", "automation", "rag", "multimodal", "presenting"];
    const video = videos.find((v) => v.topics.some((t) => known.includes(t)));
    test.skip(!video, "The library has no video with a known topic today.");
    await seed(page, []);
    await page.goto("/team/test");
    await page.getByLabel("Or find it in the Hub's library").fill(video!.title);
    await page.getByRole("list", { name: "Library matches" }).getByRole("button").first().click();
    await expect(page.locator(".rec-hint")).toContainText("In the Hub's library");
    await expect(page.getByRole("combobox", { name: "Category" })).not.toHaveValue("");
    await expect(page.getByLabel("Video title")).toHaveValue(video!.title);
    await expect(page.getByText("Suggested:")).toBeVisible();
  });

  test("asks for the title when YouTube can't be reached", async ({ page }) => {
    await seed(page, []);
    await page.route(/youtube\.com\/oembed/, (r) => r.abort());
    await page.goto("/team/test");
    await page.getByLabel("YouTube link").fill(`https://youtu.be/${ID}`);
    await expect(page.getByText("We couldn't look the title up")).toBeVisible();
    await page.getByLabel("Your recommendation, in one line").fill("Worth it");
    await page.getByRole("combobox", { name: "Category" }).selectOption("basics");
    await page.getByLabel("Your name").fill("Ana");
    await page.getByRole("button", { name: "Post my pick" }).click();
    await expect(page.getByRole("alert")).toContainText("video's title");
    await page.getByLabel("Video title").fill("My typed title");
    await page.getByRole("button", { name: "Post my pick" }).click();
    await expect(page.locator(".rec-card:not(.is-preview) h3")).toHaveText("My typed title");
  });

  test("skips posts that aren't picks, and fits a phone", async ({ page }) => {
    await seed(page, [
      row("x", "Spam", "agents", "no link here", 9, 1),
      row("y", "Bad", "agents", enc("Fake", "too-short"), 9, 1),
      row("z", "Ok", "hub", enc("Real one", ID), 0, 2),
    ]);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/team/test");
    // An older pick from before categories still shows, under Other.
    // It has no stored title and isn't a library video, so it gets a plain one.
    await expect(page.locator(".rec-card .rec-quote")).toHaveText(["“Real one”"]);
    await expect(page.locator(".rec-card h3")).toHaveText(["A YouTube video"]);
    await expect(page.locator(".rec-card")).toContainText("Other");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
