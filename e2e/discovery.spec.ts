import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/** Tools the daily run found: listed, filed in the category tree, labelled, and kept out of search results. */

test.beforeEach(async ({ page }) => {
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
});

test("the list filters by broad and specific categories, and marks tools nobody has reviewed", async ({ page }) => {
  await page.goto("/tools/?view=list");
  await page.getByRole("button", { name: "Create video", exact: true }).click();
  await expect(page.getByRole("button", { name: "Text to video" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Higgsfield" })).toBeVisible();
  await expect(page.getByText("Not reviewed yet").first()).toBeVisible();
  await page.getByRole("button", { name: "Text to video" }).click();
  await expect(page).toHaveURL(/task=text-to-video/);
  await expect(page.getByRole("heading", { name: "Veo", exact: true })).toBeVisible();
});

test("a discovered tool has its own page that says what we don't know, and stays out of search", async ({ page }) => {
  await page.goto("/tools/higgsfield/");
  await expect(page.getByRole("heading", { level: 1, name: "Higgsfield" })).toBeVisible();
  await expect(page.getByText("Not reviewed yet").first()).toBeVisible();
  await expect(page.getByText(/doesn't say what it costs/)).toBeVisible();
  await expect(page).toHaveTitle(/not reviewed yet/i);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("link", { name: /Open Higgsfield/ })).toHaveAttribute("href", /higgsfield/);
});

test("the home page lists categories from the catalog", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Create video/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /3D & game design/ })).toBeVisible();
});

test("an unknown tool is still a not-found page", async ({ page }) => {
  await page.goto("/tools/not-a-tool/");
  await expect(page.getByRole("heading", { name: /This page doesn.t exist/ }).first()).toBeVisible();
});

test("the tutor suggests library videos for a question the lessons don't cover", async ({ page }) => {
  const feed = JSON.parse(readFileSync("public/data/videos.json", "utf8"));
  const clip = { ...feed.videos[0], id: "higg0000001", title: "Higgsfield AI tutorial: cinematic camera moves for AI video", channel: "Example Channel", tools: ["higgsfield"], topics: [], difficulty: "beginner", duration: 540 };
  await page.route("**/data/videos.json", (r) => r.fulfill({ json: { ...feed, videos: [clip, ...feed.videos] } }));
  await page.addInitScript(() => {
    if (sessionStorage.getItem("kh-e2e-init")) return;
    sessionStorage.setItem("kh-e2e-init", "1");
    localStorage.setItem("kh-tutor-mock", "1");
  });
  await page.goto("/tools");
  await page.getByRole("button", { name: /Ask the tutor/ }).click();
  const sheet = page.getByRole("dialog", { name: "AI tutor" });
  await sheet.getByRole("button", { name: "Which tool for…?" }).first().click();
  await sheet.getByLabel("Describe your task").fill("generate videos with higgsfield");
  await sheet.getByRole("button", { name: "Find tools" }).click();
  await expect(sheet.getByRole("button", { name: /^Higgsfield/ })).toBeVisible();
  await expect(sheet.getByText("Not reviewed yet")).toBeVisible();
  await expect(sheet.getByRole("button", { name: /Play: Higgsfield AI tutorial/ })).toBeVisible();
});
