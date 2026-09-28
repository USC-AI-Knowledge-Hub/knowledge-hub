import { expect, test } from "@playwright/test";
import { prompting } from "../src/data/guided/lessons/prompting";

const correct = new Set(prompting.questions.map((q) => q.options[q.answer]));

test.describe("guided courses", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("a path is a course with units, lessons and a capstone", async ({ page }) => {
    await page.goto("/learn/path/student");
    await expect(page.getByRole("heading", { name: "Student starter" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /By the end/ })).toBeVisible();
    await expect(page.locator(".course-unit")).toHaveCount(3);
    await expect(page.locator(".course-unit .step")).toHaveCount(8);
    await expect(page.locator("#capstone")).toContainText("Capstone project");
    await page.locator("#capstone input[type=checkbox]").first().check();
    await page.reload();
    await expect(page.locator("#capstone input[type=checkbox]").first()).toBeChecked();
  });

  test("a lesson steps through reading, the tutor, and a randomized check", async ({ page }) => {
    await page.goto("/learn/path/student/prompting");
    await expect(page.getByRole("heading", { name: "Prompting that works" })).toBeVisible();
    await page.getByRole("button", { name: /^Next:/ }).click();
    await expect(page.getByRole("heading", { name: prompting.sections[0].heading, level: 2 })).toBeVisible();

    // Asking about a section opens the tutor beside the lesson with that section's text.
    await page.getByRole("button", { name: /^Ask:/ }).click();
    await expect(page.locator(".tutor-sheet")).toBeVisible();
    await expect(page.locator(".tutor-sheet")).toContainText(prompting.sections[0].heading);
    await expect(page.locator("body")).toHaveClass(/tutor-open/);
    await page.getByRole("button", { name: "Close the tutor" }).click();

    // Walk to the check; it can't be skipped.
    for (;;) {
      const next = page.getByRole("button", { name: /^Next:/ });
      const label = (await next.textContent()) ?? "";
      await next.click();
      if (label.includes("Check")) break;
    }
    await expect(page.getByRole("button", { name: "Pass the check to continue" })).toBeDisabled();
    const questions = page.locator(".lp-q");
    await expect(questions).toHaveCount(4);

    // Answer each question correctly using the lesson's answer key.
    for (let i = 0; i < 4; i++) {
      const q = questions.nth(i);
      const labels = q.locator(".lp-option");
      const n = await labels.count();
      for (let j = 0; j < n; j++) {
        if (correct.has(((await labels.nth(j).textContent()) ?? "").trim())) {
          await labels.nth(j).click();
          break;
        }
      }
      await expect(q.locator(".lp-explain")).toContainText("Right.");
    }
    await expect(page.locator(".lp-result")).toContainText("4 of 4 right. Passed.");
    await expect(page.getByRole("button", { name: /^Next: Reflect/ })).toBeEnabled();

    // A new set draws different questions from the bank.
    const first = await questions.locator("legend").allTextContents();
    await page.getByRole("button", { name: /Try a new set/ }).click();
    const second = await questions.locator("legend").allTextContents();
    expect(second.filter((t) => first.includes(t)).length).toBeLessThan(4);

    // The module counts as done on the course page.
    await page.goto("/learn/path/student");
    await expect(page.locator(".course-unit .step.done")).toHaveCount(1);
  });
});
