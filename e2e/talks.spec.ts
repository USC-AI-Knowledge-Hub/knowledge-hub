import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { talks } from "../src/data/talks";
import type { AutoTalk } from "../src/data/types";

// Talks the daily run would have found. The ids are placeholders that never reach YouTube (thumbnails are blocked).
const auto: AutoTalk[] = [
  { id: "autoTalk001", title: "What AI agents can do now", channel: "TED", channelId: "c1", publishedAt: "2026-10-01T00:00:00Z", duration: 900, views: 90000, kind: "talk", score: 0.9, firstSeen: "2026-10-02" },
  { id: "autoTalk002", title: "A long conversation about AI research", channel: "Dwarkesh Patel", channelId: "c2", publishedAt: "2026-09-01T00:00:00Z", duration: 7200, views: 60000, kind: "podcast", score: 0.8, firstSeen: "2026-09-02" },
  { id: "autoTalk003", title: "Building with AI models, a keynote", channel: "AI Engineer", channelId: "c3", publishedAt: "2026-08-01T00:00:00Z", duration: 1800, views: 20000, kind: "keynote", score: 0.7, firstSeen: "2026-08-02" },
];
const feed = { ...JSON.parse(readFileSync("public/data/videos.json", "utf8")), talks: auto };
const total = talks.length + auto.length;

test.describe("talks and podcasts", () => {
  test.use({ viewport: { width: 1280, height: 860 } });

  test.beforeEach(async ({ page }) => {
    // Keep the test independent of the live check: every talk counts as available.
    await page.route("**/data/courses.json*", (route) => route.fulfill({ status: 404, body: "" }));
    await page.route("**/data/videos.json*", (route) => route.fulfill({ json: feed }));
    await page.route("https://i.ytimg.com/**", (route) => route.abort());
  });

  test("the tab shows editors' picks, then talks found automatically", async ({ page }) => {
    await page.goto("/watch");
    await page.getByRole("navigation", { name: "Watch pages" }).getByRole("link", { name: "Talks and podcasts" }).click();
    await expect(page).toHaveURL(/tab=talks/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Talks and podcasts");
    await expect(page.locator(".talk-card")).toHaveCount(total);
    await expect(page.getByRole("heading", { name: /Editors' picks/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Picked automatically/ })).toBeVisible();
    // Best score first.
    await expect(page.locator(".video-group").last().locator(".talk-card").first()).toContainText(auto[0].title);
  });

  test("kind chips filter the list", async ({ page }) => {
    await page.goto("/watch?tab=talks");
    const chips = page.getByLabel("Kind of talk");
    await chips.getByRole("button", { name: /Podcasts/ }).click();
    await expect(page).toHaveURL(/kind=podcast/);
    await expect(page.locator('.talk-card:not([data-kind="podcast"])')).toHaveCount(0);
    await expect(page.getByRole("button", { name: `Play: ${auto[1].title}` })).toBeVisible();
    await chips.getByRole("button", { name: /^All/ }).click();
    await expect(page.locator(".talk-card")).toHaveCount(total);
  });

  test("a card opens the player", async ({ page }) => {
    await page.goto("/watch?tab=talks");
    await page.getByRole("button", { name: `Play: ${auto[0].title}` }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("iframe")).toHaveAttribute("src", new RegExp(`/embed/${auto[0].id}`));
  });

  test("hides editors' picks the daily check marks unavailable", async ({ page }) => {
    const gone = talks[0];
    await page.unroute("**/data/courses.json*");
    await page.route("**/data/courses.json*", (route) =>
      route.fulfill({
        json: { generatedAt: "", via: "oembed", courses: {}, curated: {}, talks: { [gone.id]: { ok: false, problem: "not found" } } },
      }),
    );
    await page.goto("/watch?tab=talks");
    await expect(page.locator(".talk-card")).toHaveCount(total - 1);
    await expect(page.getByRole("button", { name: `Play: ${gone.title}` })).toHaveCount(0);
  });
});
