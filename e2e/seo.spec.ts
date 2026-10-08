import { expect, test } from "@playwright/test";

/**
 * What search engines and link previews see: each address is its own HTML page with its own
 * title, description and canonical link, readable without running any script.
 */
test.describe("search engines", () => {
  test.describe("without scripts", () => {
    test.use({ javaScriptEnabled: false });

    // GitHub Pages serves each page at its trailing-slash address (and redirects to it), so these
    // visit that address directly.
    test("a course page reads on its own", async ({ page }) => {
      const res = await page.goto("/learn/path/faculty/");
      expect(res?.status()).toBe(200);
      await expect(page).toHaveTitle(/Learn AI as a professor/);
      await expect(page.getByRole("heading", { level: 1, name: "Faculty path" })).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://studentslearningai.com/learn/path/faculty/");
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /professors and teaching staff/);
      await expect(page.getByRole("link", { name: /Redesigning assessment|assessment/i }).first()).toBeVisible();
    });

    test("a lesson page carries the lesson text", async ({ page }) => {
      await page.goto("/learn/lesson/prompting/");
      await expect(page.getByRole("heading", { level: 2, name: "A prompt is a brief" })).toBeVisible();
      const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
      expect(JSON.parse(ld!)["@type"]).toBe("LearningResource");
    });

    test("the home page lists the questions people ask", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 3, name: /professor and new to AI/ })).toBeVisible();
      const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(scripts.map((s) => JSON.parse(s)["@type"]).sort()).toEqual(["FAQPage", "Organization", "WebSite"]);
    });
  });

  test("the sitemap and robots.txt are served", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("<loc>https://studentslearningai.com/learn/path/student/</loc>");
    expect(sitemap).not.toContain("/search");
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Sitemap: https://studentslearningai.com/sitemap.xml");
    expect((await request.get("/og.png")).status()).toBe(200);
  });

  test("the title and tags follow the page as someone clicks around", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/learn how to use AI/);
    await page.getByRole("link", { name: "Tools", exact: true }).first().click();
    await expect(page).toHaveTitle(/AI tool guides for students and professors/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://studentslearningai.com/tools/");
    await page.goto("/search?q=prompts");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await page.goto("/learn/does-not-exist");
    await expect(page).toHaveTitle(/Page not found/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  });

  test("the home page questions open in place", async ({ page }) => {
    await page.goto("/");
    const q = page.getByText("I'm a professor and new to AI. Where should I begin?");
    await q.scrollIntoViewIfNeeded();
    await q.click();
    await expect(page.getByText(/Start with the Faculty path\./)).toBeVisible();
    await page.getByRole("link", { name: "Open the Faculty path" }).click();
    await expect(page).toHaveURL(/\/learn\/path\/faculty$/);
  });
});
