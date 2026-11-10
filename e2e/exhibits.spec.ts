import { expect, test } from "@playwright/test";

test.describe("volunteer exhibits guide", () => {
  test("serves the guide as its own page with the data dictionary beside it", async ({ page, request }) => {
    await page.goto("/team/exhibits/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("first exhibit");
    const link = page.getByRole("link", { name: /Download data dictionary/ });
    await expect(link).toHaveAttribute("href", "HCAI_Data_Dictionary.md");
    const res = await request.get("/team/exhibits/HCAI_Data_Dictionary.md");
    expect(res.ok()).toBe(true);
    expect(await res.text()).toContain("HCAI Data Dictionary for AI Analysts");
  });

  test("copies an example prompt", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/team/exhibits/");
    await page.getByRole("button", { name: "See example" }).first().click();
    await expect(page.locator("pre.open")).toHaveCount(1);
  });
});
