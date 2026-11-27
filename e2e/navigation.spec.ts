import { expect, test } from "@playwright/test";

// The site's structure (src/data/sections.ts): sections in the rail, tabs for the pages inside each, and the
// footer as a site map.
test.describe("navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("https://i.ytimg.com/**", (route) => route.abort());
  });

  test("a section's pages are tabs, and the rail keeps the section lit", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/learn");
    const tabs = page.getByRole("navigation", { name: "Learn pages" });
    await expect(tabs.getByRole("link", { name: "Paths and lessons" })).toHaveAttribute("aria-current", "page");
    await tabs.getByRole("link", { name: "Prompts that work" }).click();
    await expect(page).toHaveURL(/\/prompts$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Prompts that work");
    const rail = page.getByRole("navigation", { name: "Primary" }).first();
    await expect(rail.getByRole("link", { name: "Learn" })).toHaveAttribute("aria-current", "page");
    await expect(rail.getByRole("link", { name: "Home", exact: true })).not.toHaveAttribute("aria-current", "page");
  });

  test("pages that were hard to find are one tap from their section", async ({ page }) => {
    await page.goto("/team");
    await page.getByRole("navigation", { name: "AI Team pages" }).getByRole("link", { name: "Video picks" }).click();
    await expect(page).toHaveURL(/\/team\/picks$/);
    // The old address still works.
    await page.goto("/team/test");
    await expect(page).toHaveURL(/\/team\/picks$/);
    await page.goto("/green");
    await page.getByRole("navigation", { name: "Green AI pages" }).getByRole("link", { name: "Use AI offline" }).click();
    await expect(page).toHaveURL(/\/offline$/);
  });

  test("a tool's own page has no tabs, but its section stays lit", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/tools/chatgpt");
    await expect(page.getByRole("navigation", { name: "Tools pages" })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Primary" }).first().getByRole("link", { name: "Tools" })).toHaveAttribute("aria-current", "page");
  });

  test("the footer lists every section's pages", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    for (const name of ["Learn", "Tools", "Watch", "AI Team", "Green AI"]) await expect(footer.getByRole("navigation", { name })).toBeVisible();
    await footer.getByRole("link", { name: "How videos are chosen" }).click();
    await expect(page).toHaveURL(/\/about$/);
  });

  test("on a phone the tabs scroll sideways, with the current one in view, and the page doesn't", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/ai-use");
    await expect(page.getByRole("navigation", { name: "Learn pages" }).getByRole("link", { name: "Using AI in coursework" })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
});
