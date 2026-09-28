import { expect, test } from "@playwright/test";
import { talks } from "../src/data/talks";

const count = (kind: string) => talks.filter((t) => t.kind === kind).length;

test.describe("talks and podcasts", () => {
  test.use({ viewport: { width: 1280, height: 860 } });

  test.beforeEach(async ({ page }) => {
    // Keep the test independent of the live check: every talk counts as available.
    await page.route("**/data/courses.json*", (route) => route.fulfill({ status: 404, body: "" }));
    await page.route("https://i.ytimg.com/**", (route) => route.abort());
  });

  test("the tab opens from the segmented control and from its URL", async ({ page }) => {
    await page.goto("/watch");
    await page.getByRole("radio", { name: "Talks and podcasts" }).click();
    await expect(page).toHaveURL(/tab=talks/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Talks and podcasts");
    await expect(page.locator(".talk-card")).toHaveCount(talks.length);

    await page.goto("/watch?tab=talks");
    await expect(page.getByRole("radio", { name: "Talks and podcasts" })).toHaveAttribute("aria-checked", "true");
  });

  test("kind chips filter the list", async ({ page }) => {
    await page.goto("/watch?tab=talks");
    const chips = page.getByLabel("Kind of talk");
    await chips.getByRole("button", { name: /Debates/ }).click();
    await expect(page).toHaveURL(/kind=debate/);
    await expect(page.locator(".talk-card")).toHaveCount(count("debate"));
    await expect(page.locator('.talk-card:not([data-kind="debate"])')).toHaveCount(0);

    await chips.getByRole("button", { name: /Podcasts/ }).click();
    await expect(page.locator(".talk-card")).toHaveCount(count("podcast"));
    await expect(chips.getByRole("button", { name: /Podcasts/ })).toHaveAttribute("aria-pressed", "true");

    await chips.getByRole("button", { name: /^All/ }).click();
    await expect(page.locator(".talk-card")).toHaveCount(talks.length);
  });

  test("a card opens the player", async ({ page }) => {
    await page.goto("/watch?tab=talks&kind=talk");
    const first = talks.find((t) => t.kind === "talk")!;
    await page.getByRole("button", { name: `Play: ${first.title}` }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("iframe")).toHaveAttribute("src", new RegExp(`/embed/${first.video}`));
    await expect(dialog).toContainText(first.summary);
  });

  test("hides talks the daily check marks unavailable", async ({ page }) => {
    const gone = talks[0];
    await page.unroute("**/data/courses.json*");
    await page.route("**/data/courses.json*", (route) =>
      route.fulfill({
        json: { generatedAt: "", via: "oembed", courses: {}, curated: {}, talks: { [gone.id]: { ok: false, problem: "not found" } } },
      }),
    );
    await page.goto("/watch?tab=talks");
    await expect(page.locator(".talk-card")).toHaveCount(talks.length - 1);
    await expect(page.getByRole("button", { name: `Play: ${gone.title}` })).toHaveCount(0);
  });

  test("a lesson shows related talks", async ({ page }) => {
    await page.goto("/learn/ethics-integrity");
    await expect(page.getByRole("heading", { name: "Talks and debates" })).toBeVisible();
    const cards = page.locator("#talks-h ~ .grid .talk-card");
    await expect(cards).toHaveCount(3);
  });
});
