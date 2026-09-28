import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { levels, quests, type Check } from "../src/lib/tutor/quests";

/**
 * The on-device tutor. Most tests use the mock engine (localStorage
 * "kh-tutor-mock"), which fakes the download and streams answers built from
 * the notes, so they run offline in seconds. The @model test downloads a real
 * model from Hugging Face and runs it on WASM.
 */

const MODEL_HOSTS = /huggingface\.co|hf\.co|cdn\.jsdelivr\.net/;

async function setup(page: Page, { mock = true, storage = {} as Record<string, unknown> } = {}) {
  // Web fonts aren't part of what we're testing and can be slow to fetch.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.addInitScript(
    ([mockOn, entries]) => {
      if (sessionStorage.getItem("kh-e2e-init")) return;
      sessionStorage.setItem("kh-e2e-init", "1");
      if (mockOn) localStorage.setItem("kh-tutor-mock", "1");
      for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    },
    [mock, storage] as const,
  );
}

async function openTutor(page: Page, path = "/") {
  await page.goto(path);
  await page.getByRole("button", { name: /Ask the tutor/ }).click();
  const sheet = page.getByRole("dialog", { name: "AI tutor" });
  await expect(sheet).toBeVisible();
  return sheet;
}

/** Every check in every quest. Checks are drawn at random, so tests look up the one on screen. */
const ALL_CHECKS: Check[] = quests.flatMap((q) =>
  q.steps.flatMap((s) => (s.kind === "learn" ? s.checks : s.kind === "dojo" ? s.tasks.map((t) => t.check) : [s.check])),
);

/** The check currently on screen, found by its options (which are shuffled). */
async function currentCheck(sheet: Locator): Promise<Check> {
  const shown = (await sheet.locator(".t-check .t-option .body-m").allInnerTexts()).map((t) => t.trim());
  const c = ALL_CHECKS.find((x) => x.options.length === shown.length && shown.every((t) => x.options.includes(t)));
  if (!c) throw new Error(`No check has these options: ${shown.join(" | ")}`);
  return c;
}

/** Picks the right (or a wrong) option on the current check and submits it. */
async function answer(sheet: Locator, right: boolean): Promise<Check> {
  const c = await currentCheck(sheet);
  const text = right ? c.options[c.answer] : c.options.find((_, i) => i !== c.answer)!;
  await sheet.locator(".t-check").getByText(text, { exact: true }).click();
  await sheet.getByRole("button", { name: "Check answer" }).click();
  return c;
}

const questState = (steps: Record<string, Record<string, string>>, badges: string[] = [], xp = 0) => ({
  xp,
  steps,
  badges,
  streak: { count: 0, last: null },
});

async function ask(page: Page, text: string) {
  const input = page.getByRole("textbox", { name: "Ask the tutor" });
  await input.fill(text);
  await input.press("Enter");
}

test.describe("tutor without a model", () => {
  test("downloads nothing until the student asks", async ({ page }) => {
    await setup(page, { mock: false });
    const modelRequests: string[] = [];
    page.on("request", (r) => {
      if (MODEL_HOSTS.test(r.url())) modelRequests.push(r.url());
    });
    const sheet = await openTutor(page);
    await expect(sheet.getByText("Want answers in conversation?")).toBeVisible();
    await sheet.getByRole("button", { name: "Choose a model" }).click();
    await expect(sheet.getByRole("heading", { name: /Download a tutor model|tutor model/i }).first()).toBeVisible();
    await expect(sheet.getByText("Nothing you type leaves your browser.")).toBeVisible();
    await page.waitForTimeout(500);
    expect(modelRequests).toEqual([]);
  });

  test("opens with the button, shows quests, and closes with Escape", async ({ page }) => {
    await setup(page);
    const sheet = await openTutor(page);
    await expect(sheet.getByRole("button", { name: /Inside a transformer/ })).toBeVisible();
    await expect(sheet.locator(".t-quest")).toHaveCount(quests.length);
    await expect(sheet.getByRole("list", { name: new RegExp(`Badges: 0 of ${quests.length} earned`) })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(page.getByRole("button", { name: /Ask the tutor/ })).toBeFocused();
  });

  test("toggles with Ctrl+K", async ({ page }) => {
    await setup(page);
    await page.goto("/");
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog", { name: "AI tutor" })).toBeVisible();
    await page.keyboard.press("Control+k");
    await expect(page.getByRole("dialog", { name: "AI tutor" })).toBeHidden();
  });

  test("runs a quest step, grades the check and awards XP", async ({ page }) => {
    await setup(page);
    const sheet = await openTutor(page);
    await sheet.getByRole("button", { name: /Inside a transformer/ }).click();
    await expect(sheet.getByRole("heading", { name: /Step 1 of 6\s*Tokens/ })).toBeVisible();
    // No model: the notes are shown as a reading card.
    await expect(sheet.getByText("From the notes")).toBeVisible();

    // A wrong answer first: no XP, and the student can try again.
    const first = await answer(sheet, false);
    await expect(sheet.getByText("Not quite.")).toBeVisible();
    await answer(sheet, true);
    await expect(sheet.getByText("Correct.")).toBeVisible();
    await expect(sheet.getByText("+5 XP")).toBeVisible();

    // Another question on the same idea: a different variant, no more XP.
    await sheet.getByRole("button", { name: "Try another question" }).click();
    const second = await currentCheck(sheet);
    expect(second.question).not.toBe(first.question);
    await answer(sheet, true);
    await expect(sheet.getByText("Correct.")).toBeVisible();
    await expect(sheet.getByText(/\+\d+ XP/)).toHaveCount(0);

    await sheet.getByRole("button", { name: "Next step" }).click();
    await expect(sheet.getByRole("heading", { name: /Step 2 of 6\s*Embeddings/ })).toBeVisible();
    await answer(sheet, true);
    await expect(sheet.getByText("+10 XP")).toBeVisible();

    await sheet.getByRole("button", { name: "Back to tutor home" }).click();
    await expect(sheet.locator(".t-xp-num")).toHaveText("15");
    await expect(sheet.getByRole("button", { name: /Inside a transformer\s*2 of 6 steps/ })).toBeVisible();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kh-tutor-quests") ?? "{}"));
    expect(saved.xp).toBe(15);
    expect(saved.streak.count).toBe(1);
  });

  test("earns a badge for finishing a quest", async ({ page }) => {
    const steps = { why: "first", "transformer-award": "first", citation: "first", "chatgpt-first": "first" };
    await setup(page, { storage: { "kh-tutor-quests": { xp: 40, steps: { spot: steps }, badges: [], streak: { count: 0, last: null } } } });
    const sheet = await openTutor(page);
    await sheet.getByRole("button", { name: /Spot the hallucination/ }).click();
    await expect(sheet.getByRole("heading", { name: /Step 5 of 5/ })).toBeVisible();
    await answer(sheet, true);
    await expect(sheet.getByText("+35 XP")).toBeVisible();
    await sheet.getByRole("button", { name: "Finish" }).click();
    await expect(sheet.getByRole("heading", { name: "Badge earned" })).toBeVisible();
  });

  test("spot the hallucination grades the planted claim", async ({ page }) => {
    await setup(page, { storage: { "kh-tutor-quests": { xp: 10, steps: { spot: { why: "first" } }, badges: [], streak: { count: 0, last: null } } } });
    const sheet = await openTutor(page);
    await sheet.getByRole("button", { name: /Spot the hallucination/ }).click();
    await expect(sheet.getByText("Tap the claim that's wrong")).toBeVisible();
    await sheet.getByText("Its authors received the 2018 Turing Award").click();
    await sheet.getByRole("button", { name: "Check answer" }).click();
    await expect(sheet.getByText(/Bengio, Hinton and LeCun/).first()).toBeVisible();
  });

  test("the prompting dojo scores a prompt against the rubric", async ({ page }) => {
    await setup(page, { storage: { "kh-tutor-quests": { xp: 10, steps: { dojo: { rubric: "first" } }, badges: [], streak: { count: 0, last: null } } } });
    const sheet = await openTutor(page);
    await sheet.getByRole("button", { name: /Prompting dojo/ }).click();
    await sheet.getByLabel("Write the prompt you'd send to an AI assistant.").fill("help me study");
    await sheet.getByRole("button", { name: "Score my prompt" }).click();
    await expect(sheet.getByText(/of 5 on the rubric/)).toBeVisible();
    await expect(sheet.getByText("A stronger version")).toBeVisible();
    // The task rotates between visits; its check asks about that task's stronger prompt.
    const task = quests.find((q) => q.id === "dojo")!.steps.find((s) => s.id === "study-prompt")!;
    if (task.kind !== "dojo") throw new Error("expected a dojo step");
    const shown = (await sheet.locator(".t-stronger").innerText()).trim();
    const t = task.tasks.find((x) => x.stronger === shown)!;
    expect(t).toBeDefined();
    await expect(sheet.locator(".t-check legend")).toHaveText(t.check.question);
    await answer(sheet, true);
    await expect(sheet.getByText("+10 XP")).toBeVisible();
  });

  test("lays out a three-level path and lets students peek at locked levels", async ({ page }) => {
    await setup(page);
    const sheet = await openTutor(page);
    for (const l of levels) await expect(sheet.getByRole("heading", { name: `Level ${l.n}: ${l.title}` })).toBeVisible();
    await expect(sheet.getByText(/Level 2 · opens after 3 quests in level 1 \(3 to go\)/)).toBeVisible();
    // Peek: the notes are readable, but the check stays closed.
    await sheet.getByRole("button", { name: /Grounding AI in documents/ }).click();
    await expect(sheet.getByText("From the notes")).toBeVisible();
    await expect(sheet.getByText(/You're peeking ahead/)).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Check answer" })).toHaveCount(0);
    await sheet.getByRole("button", { name: "Next step" }).click();
    await expect(sheet.getByRole("heading", { name: /Step 2 of 4/ })).toBeVisible();
  });

  test("opens level 2 after three level 1 quests, keeping old progress", async ({ page }) => {
    const l1 = levels[0].quests.slice(0, 3).map((q) => q.id);
    // A version 1 save: only xp, steps, badges and streak.
    await setup(page, { storage: { "kh-tutor-quests": questState({ environment: { "data-centres": "first" } }, l1, 100) } });
    const sheet = await openTutor(page);
    await expect(sheet.locator(".t-xp-num")).toHaveText("100");
    await expect(sheet.getByText(/Level 2 · 0 of \d+ quests done/)).toBeVisible();
    await expect(sheet.getByText(/Level 3 · opens after/)).toBeVisible();
    // Started before levels existed, so it stays open.
    await sheet.getByRole("button", { name: /AI and the environment\s*1 of 5 steps/ }).click();
    await expect(sheet.getByRole("heading", { name: /Step 2 of 5/ })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Check answer" })).toBeVisible();
  });

  test("daily review is empty until a quest is finished", async ({ page }) => {
    await setup(page);
    const sheet = await openTutor(page);
    await expect(sheet.getByText("Finish your first quest and its questions show up here for review.")).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Start review" })).toHaveCount(0);
  });

  test("daily review asks five questions from finished quests and awards XP once a day", async ({ page }) => {
    await setup(page, { storage: { "kh-tutor-quests": questState({}, ["history", "spot"], 50) } });
    const sheet = await openTutor(page);
    await sheet.getByRole("button", { name: "Start review" }).click();
    const allowed = new Set(quests.filter((q) => q.id === "history" || q.id === "spot").flatMap((q) => q.steps.map((s) => s.title)));
    for (let i = 0; i < 5; i++) {
      await expect(sheet.getByRole("heading", { name: new RegExp(`Question ${i + 1} of 5`) })).toBeVisible();
      const from = (await sheet.locator(".t-review-from").innerText()).split(" · ")[1];
      expect(allowed.has(from), from).toBe(true);
      await answer(sheet, i !== 0);
      await expect(sheet.locator(".t-feedback")).toBeVisible();
      await sheet.getByRole("button", { name: i === 4 ? "See results" : "Next question" }).click();
    }
    await expect(sheet.getByRole("heading", { name: "4 of 5 correct" })).toBeVisible();
    await expect(sheet.getByText("+13 XP, and your streak is safe for today.")).toBeVisible();
    await expect(sheet.getByText("To go over again")).toBeVisible();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kh-tutor-quests") ?? "{}"));
    expect(saved.xp).toBe(63);
    expect(saved.streak.count).toBe(1);
    expect(Object.values(saved.answers as Record<string, { wrong: number }>).filter((a) => a.wrong > 0)).toHaveLength(1);

    // A second review the same day is practice only.
    await sheet.getByRole("button", { name: "Another review" }).click();
    await expect(sheet.getByText("Practice round")).toBeVisible();
  });

  test("navigates without the model: take me to the courses", async ({ page }) => {
    await setup(page);
    const sheet = await openTutor(page);
    await ask(page, "take me to the courses");
    await expect(page).toHaveURL(/\/learn\/courses$/);
    await expect(sheet.getByText(/Opened\s+Full courses/)).toBeVisible();
    // The tutor stays open across navigation.
    await expect(sheet).toBeVisible();
    await ask(page, "open the prompting lesson");
    await expect(page).toHaveURL(/\/learn\/prompting$/);
  });

  test("says so when nothing on the site matches", async ({ page }) => {
    await setup(page);
    const sheet = await openTutor(page);
    await ask(page, "where is qwertyuiop");
    await expect(sheet.getByText("I couldn't find “qwertyuiop” on this site.")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test("the path guide recommends the next lesson", async ({ page }) => {
    await setup(page, { storage: { "kh-progress": ["llms", "prompting", "reasoning-models"] } });
    const sheet = await openTutor(page);
    await sheet.getByRole("button", { name: "What should I learn next?" }).click();
    // Three of eight builder lessons done: the builder path wins, and coding is next.
    await expect(sheet.getByText("Next up, builder path")).toBeVisible();
    await expect(sheet.getByText("Coding with AI", { exact: true })).toBeVisible();
    await sheet.getByRole("button", { name: "Open the lesson" }).click();
    await expect(page).toHaveURL(/\/learn\/coding$/);
  });

  test("picks a path from two questions", async ({ page }) => {
    await setup(page);
    const sheet = await openTutor(page);
    await sheet.getByRole("button", { name: "Pick a path for me" }).click();
    await sheet.getByRole("button", { name: "Faculty or staff" }).click();
    await sheet.getByRole("button", { name: "Teach or assess with AI" }).click();
    await expect(sheet.getByText("Faculty path", { exact: true })).toBeVisible();
    await sheet.getByRole("button", { name: "Follow this path" }).click();
    await expect(page).toHaveURL(/\/learn\/path\/faculty$/);
  });

  test("finds tools for a task", async ({ page }) => {
    await setup(page);
    const sheet = await openTutor(page, "/tools");
    await sheet.getByRole("button", { name: "Which tool for…?" }).first().click();
    await sheet.getByRole("button", { name: "Make a presentation" }).click();
    await expect(sheet.getByRole("button", { name: /Gamma/ })).toBeVisible();
  });

  test("shows page-aware help on a lesson", async ({ page }) => {
    await setup(page);
    const sheet = await openTutor(page, "/learn/llms");
    await sheet.getByRole("button", { name: "Quiz me on this lesson" }).click();
    await expect(sheet.getByRole("button", { name: "Reveal key idea 1" })).toBeVisible();
    await sheet.getByRole("button", { name: "Reveal key idea 1" }).click();
    await expect(sheet.getByText("Tokens are word pieces.", { exact: false }).last()).toBeVisible();
  });

  test("answers from the lessons in reading mode", async ({ page }) => {
    await setup(page, { storage: { "kh-tutor-model": { status: "declined" } } });
    const sheet = await openTutor(page);
    await expect(sheet.getByText("Reading mode.")).toBeVisible();
    await ask(page, "What is a token?");
    await expect(sheet.getByText("Here's what the closest lesson says.")).toBeVisible();
    await expect(sheet.getByText("How large language models work", { exact: true })).toBeVisible();
  });
});

test.describe("tutor with the mock model", () => {
  test("downloads with progress, then streams a grounded answer", async ({ page }) => {
    await setup(page);
    const sheet = await openTutor(page);
    await sheet.getByRole("button", { name: "Choose a model" }).click();
    await expect(sheet.getByRole("radio", { name: /Qwen2.5 0.5B Instruct/ })).toBeChecked();
    await sheet.getByRole("button", { name: /^Download \d+ MB/ }).click();
    await expect(sheet.getByRole("progressbar", { name: "Download progress" })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(sheet.getByRole("heading", { name: "The tutor is ready" })).toBeVisible({ timeout: 20_000 });
    await expect(sheet.getByText(/Qwen2.5 0.5B on WebGPU/)).toBeVisible();

    await sheet.getByRole("button", { name: "Start learning" }).click();
    await ask(page, "What is a token?");
    const answer = sheet.locator(".t-msg.tutor").last();
    await expect(answer).toContainText(/token/i, { timeout: 10_000 });
    await expect(sheet.getByText("Small on-device model. It can be wrong.")).toBeVisible({ timeout: 15_000 });
    await expect(sheet.getByText("Related on this site")).toBeVisible();
    await expect(page.locator("[aria-live=polite]").filter({ hasText: /Tutor answered/ })).toHaveCount(1);

    // The choice is remembered.
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kh-tutor-model") ?? "{}"));
    expect(saved).toMatchObject({ status: "downloaded", model: "qwen2.5-0.5b", device: "webgpu" });
  });

  test("the tutor explains quest steps and can be stopped", async ({ page }) => {
    await setup(page, { storage: { "kh-tutor-model": { status: "downloaded", model: "smollm2-360m", device: "webgpu" } } });
    const sheet = await openTutor(page);
    // Previously downloaded: loads from the cache without asking.
    await expect(sheet.getByText(/SmolLM2 360M on WebGPU/)).toBeVisible({ timeout: 20_000 });
    await sheet.getByRole("button", { name: /AI and the environment/ }).click();
    await expect(sheet.getByRole("button", { name: "Stop" })).toBeVisible();
    await sheet.getByRole("button", { name: "Stop" }).click();
    await expect(sheet.getByText(/Stopped\./)).toBeVisible();
    await sheet.getByText("Show the notes it used").click();
    await expect(sheet.getByText(/415 TWh/).last()).toBeVisible();
  });

  test("can cancel a download and remove the model", async ({ page }) => {
    await setup(page);
    const sheet = await openTutor(page);
    await sheet.getByRole("button", { name: "Choose a model" }).click();
    await sheet.getByRole("button", { name: /^Download \d+ MB/ }).click();
    await sheet.getByRole("button", { name: "Cancel" }).click();
    await expect(sheet.getByRole("heading", { name: "Download a tutor model" })).toBeVisible();

    await sheet.getByRole("button", { name: /^Download \d+ MB/ }).click();
    await expect(sheet.getByRole("heading", { name: "The tutor is ready" })).toBeVisible({ timeout: 20_000 });
    await sheet.getByRole("button", { name: "Tutor settings" }).click();
    await sheet.getByRole("menuitem", { name: "Remove downloaded model" }).click();
    await expect(sheet.getByText("No model downloaded")).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("kh-tutor-model"))).toContain("unset");
  });

  test("offers the small model on WASM when WebGPU is unavailable", async ({ page }) => {
    await setup(page, { storage: { "kh-tutor-device": "wasm" } });
    const sheet = await openTutor(page);
    await sheet.getByRole("button", { name: "Choose a model" }).click();
    await expect(sheet.getByRole("radio")).toHaveCount(1);
    await expect(sheet.getByRole("radio", { name: /SmolLM2 360M Instruct/ })).toBeChecked();
    const download = sheet.getByRole("button", { name: /^Download \d+ MB/ });
    await expect(download).toBeDisabled();
    await sheet.getByLabel("I understand it will be slow on this device.").check();
    await expect(download).toBeEnabled();
    await expect(sheet.getByRole("button", { name: "Continue without a model" })).toBeVisible();
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 400, height: 860 } });

  test("opens full screen above the bottom navigation", async ({ page }) => {
    await setup(page);
    await page.goto("/");
    const fab = page.getByRole("button", { name: /Ask the tutor/ });
    const nav = page.locator(".bottom-nav");
    const [f, n] = [await fab.boundingBox(), await nav.boundingBox()];
    expect(f!.y + f!.height).toBeLessThanOrEqual(n!.y);
    await fab.click();
    const sheet = page.getByRole("dialog", { name: "AI tutor" });
    // Poll past the opening animation.
    await expect.poll(async () => await sheet.boundingBox()).toMatchObject({ x: 0, y: 0, width: 400 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(400);
  });
});

test.describe("real model", () => {
  // One slow download per run: a retry would double the job time.
  test.describe.configure({ retries: 0 });

  test("@model the real engine answers on WASM", async ({ playwright }) => {
    test.setTimeout(15 * 60_000);
    // A persistent profile, like a student's browser. Playwright's default contexts behave like
    // private windows, whose small storage quota can't hold the model between visits.
    const context = await playwright.chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "kh-tutor-")), {
      baseURL: "http://localhost:4173",
      ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
    });
    test.info().attach("note", { body: "see [heartbeat] lines in the job log" });
    const page = context.pages()[0] ?? (await context.newPage());
    await setup(page, { mock: false, storage: { "kh-tutor-device": "wasm", "kh-tutor-debug": "1" } });
    // Everything the tutor logs, and any model or runtime request that fails, goes to the CI log.
    let lastProgress = "";
    page.on("console", (m) => {
      const t = m.text();
      if (/progress /.test(t)) lastProgress = t;
      else if (m.type() === "error" || m.type() === "warning" || t.startsWith("[tutor]")) console.log("[browser]", t);
    });
    page.context().on("requestfailed", (r) => MODEL_HOSTS.test(r.url()) && console.log("[request failed]", r.url(), r.failure()?.errorText));
    page.context().on("response", (r) => MODEL_HOSTS.test(r.url()) && r.status() >= 400 && console.log("[http]", r.status(), r.url()));
    const heartbeat = setInterval(async () => {
      const status = await sheet.locator(".t-status, [role=status], [role=alert]").allInnerTexts().catch(() => []);
      console.log("[heartbeat]", lastProgress, "|", status.join(" / ").replace(/\s+/g, " ").slice(0, 200));
    }, 30_000);
    const sheet = await openTutor(page, "/?tutor=real");
    const quota = await page.evaluate(async () => (await navigator.storage.estimate()).quota ?? 0);
    console.log(`[storage] quota ${Math.round(quota / 1e6)} MB`);
    await sheet.getByRole("button", { name: "Choose a model" }).click();
    await expect(sheet.getByRole("radio", { name: /SmolLM2 360M Instruct/ })).toBeChecked();
    await sheet.getByLabel("I understand it will be slow on this device.").check();
    await sheet.getByRole("button", { name: /^Download \d+ MB/ }).click();
    await expect(sheet.getByRole("progressbar", { name: "Download progress" })).toBeVisible();
    // Wait for ready, but fail fast (with the message) if the tutor shows an error.
    const ready = sheet.getByRole("heading", { name: "The tutor is ready" });
    const failed = sheet.getByRole("alert");
    await expect(ready.or(failed)).toBeVisible({ timeout: 10 * 60_000 });
    clearInterval(heartbeat);
    if (await failed.isVisible()) throw new Error(`The tutor showed an error: ${(await failed.allInnerTexts()).join(" / ")}`);

    await sheet.getByRole("button", { name: "Start learning" }).click();
    await ask(page, "What is a token?");
    const answer = sheet.locator(".t-msg.tutor .md").last();
    await expect(answer).toHaveText(/\w+/, { timeout: 3 * 60_000 });
    await expect(sheet.getByText(/Small on-device model/)).toBeVisible({ timeout: 5 * 60_000 });
    const text = (await answer.innerText()).trim();
    // The ready view says so if the browser couldn't keep the files.
    await expect(sheet.getByText(/couldn't keep the model/)).toHaveCount(0);
    console.log(`[model answer] ${text}`);
    expect(text.length).toBeGreaterThan(10);

    // A returning student gets the model back from the browser cache, with no new download.
    let modelRequests = 0;
    page.context().on("request", (r) => /huggingface\.co|hf\.co/.test(r.url()) && /\.onnx/.test(r.url()) && modelRequests++);
    await page.reload();
    await page.getByRole("button", { name: /Ask the tutor/ }).click();
    await expect(page.getByRole("dialog", { name: "AI tutor" }).locator(".t-status")).toContainText(/SmolLM2/, { timeout: 3 * 60_000 });
    expect(modelRequests).toBe(0);
    await context.close();
  });

  // CI runners have no GPU, but Chromium can run WebGPU in software (SwiftShader). This runs
  // the WebLLM path end to end on it, and skips (saying why) if no adapter is available.
  // Real students use a real GPU, which is much faster.
  test("@model WebLLM answers on WebGPU", async ({ playwright }) => {
    test.setTimeout(50 * 60_000);
    const context = await playwright.chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "kh-webllm-")), {
      baseURL: "http://localhost:4173",
      channel: process.env.PW_CHROMIUM_PATH ? undefined : "chromium",
      args: ["--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-vulkan=swiftshader", "--use-webgpu-adapter=swiftshader", "--ignore-gpu-blocklist"],
      ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
    });
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto("/");
    const gpu = await page.evaluate(async () => {
      const nav = navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: Set<string>; info?: { description?: string; vendor?: string } } | null> } };
      const a = await nav.gpu?.requestAdapter().catch(() => null);
      return { adapter: !!a, f16: !!a?.features.has("shader-f16"), info: a?.info ? `${a.info.vendor ?? ""} ${a.info.description ?? ""}`.trim() : "" };
    });
    console.log("[webgpu]", JSON.stringify(gpu));
    if (!gpu.adapter) {
      await context.close();
      test.skip(true, "No WebGPU adapter on this runner.");
      return;
    }
    // Without shader-f16 (true of the software GPU) the tutor picks WebLLM's q4f32 build.

    await setup(page, { mock: false, storage: { "kh-tutor-device": "webgpu", "kh-tutor-debug": "1" } });
    page.on("console", (m) => {
      const t = m.text();
      if (m.type() === "error" || m.type() === "warning" || (t.startsWith("[tutor]") && !/progress /.test(t))) console.log("[browser]", t);
    });
    const sheet = await openTutor(page, "/?engine=webllm&tutor=real");
    await sheet.getByRole("button", { name: "Choose a model" }).click();
    await sheet.getByRole("radio", { name: /SmolLM2 360M Instruct/ }).check();
    await sheet.getByRole("button", { name: /^Download \d+ MB/ }).click();
    const ready = sheet.getByRole("heading", { name: "The tutor is ready" });
    const failed = sheet.getByRole("alert");
    await expect(ready.or(failed)).toBeVisible({ timeout: 15 * 60_000 });
    if (await failed.isVisible()) throw new Error(`The tutor showed an error: ${(await failed.allInnerTexts()).join(" / ")}`);
    await expect(sheet.locator(".t-status")).toContainText(/WebGPU/);

    // A software GPU generates thousands of times slower than a real one, so this checks that
    // the answer starts streaming and that Stop works, not that a full answer finishes. Reading
    // the prompt alone took 11-15 minutes on CI runners, so the first word gets 25.
    await sheet.getByRole("button", { name: "Start learning" }).click();
    await ask(page, "What is a token?");
    const answer = sheet.locator(".t-msg.tutor .md").last();
    await expect(answer).toHaveText(/\w{2,}/, { timeout: 25 * 60_000 });
    console.log(`[webllm first words] ${(await answer.innerText()).trim()}`);
    await sheet.getByRole("button", { name: /^Stop/ }).click();
    await expect(sheet.getByText(/Stopped|stopped/).first()).toBeVisible({ timeout: 5 * 60_000 });
    await context.close();
  });
});
