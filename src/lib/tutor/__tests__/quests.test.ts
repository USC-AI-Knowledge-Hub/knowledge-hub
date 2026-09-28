import { describe, expect, it } from "vitest";
import { moduleById } from "../../../data/learn";
import {
  UNLOCK_AFTER,
  XP_FIRST_TRY,
  XP_QUEST_BONUS,
  XP_RETRY,
  XP_REVIEW,
  XP_REVIEW_BONUS,
  checkFor,
  drawVariant,
  levels,
  questionId,
  quests,
  shuffle,
  variantCount,
  type Check,
} from "../quests";
import { REVIEW_SIZE, pickReview, reviewPool, reviewWeight } from "../review";
import {
  EMPTY,
  applyAnswer,
  applyPass,
  applyReview,
  levelUnlocked,
  liveStreak,
  migrate,
  nextQuest,
  questUnlocked,
  type QuestState,
} from "../storage";

/** Small seeded generator so random tests are repeatable. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const words = (s: string) => s.trim().split(/\s+/).length;

function expectValidCheck(c: Check, where: string) {
  expect(c.question.trim(), where).not.toBe("");
  expect(c.options.length, where).toBeGreaterThanOrEqual(3);
  expect(new Set(c.options).size, `${where} duplicate options`).toBe(c.options.length);
  expect(Number.isInteger(c.answer) && c.answer >= 0 && c.answer < c.options.length, `${where} answer index`).toBe(true);
  expect(c.explain.length, where).toBeGreaterThan(20);
}

const withBadges = (badges: string[]): QuestState => ({ ...EMPTY, badges });

describe("the training path", () => {
  it("has three levels and at least 14 quests of four to six steps", () => {
    expect(levels.map((l) => l.n)).toEqual([1, 2, 3]);
    expect(quests.length).toBeGreaterThanOrEqual(14);
    for (const l of levels) expect(l.quests.length, `level ${l.n}`).toBeGreaterThanOrEqual(UNLOCK_AFTER);
    for (const q of quests) {
      expect(q.steps.length, q.id).toBeGreaterThanOrEqual(4);
      expect(q.steps.length, q.id).toBeLessThanOrEqual(6);
      expect(moduleById.has(q.lesson), `${q.id} lesson`).toBe(true);
    }
  });

  it("keeps the six original quests and their step ids, so saved progress still counts", () => {
    const ids = new Map(quests.map((q) => [q.id, q.steps.map((s) => s.id)]));
    expect(ids.get("transformer")).toEqual(["tokens", "embeddings", "attention", "layers", "next-token", "context"]);
    expect(ids.get("press-send")).toEqual(["wrapping", "sampling", "temperature", "variation", "hallucination"]);
    expect(ids.get("environment")).toEqual(["data-centres", "one-prompt", "training-vs-use", "habits", "this-tutor"]);
    expect(ids.get("history")).toEqual(["dartmouth", "perceptron-winters", "backprop", "deep-blue-alexnet", "transformers-chatgpt"]);
    expect(ids.get("dojo")).toEqual(["rubric", "study-prompt", "examples", "feedback-prompt", "iterate"]);
    expect(ids.get("spot")).toEqual(["why", "transformer-award", "citation", "chatgpt-first", "habits"]);
  });

  it("uses unique quest ids, step ids and badge icons", () => {
    expect(new Set(quests.map((q) => q.id)).size).toBe(quests.length);
    expect(new Set(quests.map((q) => q.icon)).size).toBe(quests.length);
    for (const q of quests) expect(new Set(q.steps.map((s) => s.id)).size, q.id).toBe(q.steps.length);
  });

  it("gives every step self-contained notes of 60 to 140 words", () => {
    for (const q of quests)
      for (const s of q.steps) {
        const n = words(s.notes);
        expect(n, `${q.id}/${s.id} has ${n} words`).toBeGreaterThanOrEqual(60);
        expect(n, `${q.id}/${s.id} has ${n} words`).toBeLessThanOrEqual(140);
        expect(s.ask.trim(), `${q.id}/${s.id}`).not.toBe("");
      }
  });

  it("gives every learn step at least three different checks, each with exactly one correct answer", () => {
    for (const q of quests)
      for (const s of q.steps) {
        const where = `${q.id}/${s.id}`;
        if (s.kind === "learn") {
          expect(s.checks.length, where).toBeGreaterThanOrEqual(3);
          s.checks.forEach((c, i) => expectValidCheck(c, `${where}#${i}`));
          // Different questions, not rewordings: distinct questions and distinct right answers.
          expect(new Set(s.checks.map((c) => c.question)).size, `${where} questions`).toBe(s.checks.length);
          expect(new Set(s.checks.map((c) => c.options[c.answer])).size, `${where} answers`).toBe(s.checks.length);
        } else if (s.kind === "dojo") {
          expect(s.tasks.length, where).toBeGreaterThanOrEqual(3);
          expect(new Set(s.tasks.map((t) => t.task)).size, where).toBe(s.tasks.length);
          s.tasks.forEach((t, i) => {
            expect(t.stronger.length, `${where}#${i}`).toBeGreaterThan(80);
            expectValidCheck(t.check, `${where}#${i}`);
          });
        } else {
          expect(s.question.trim(), where).not.toBe("");
          expectValidCheck(s.check, where);
        }
      }
  });

  it("keeps the environment figures as sourced", () => {
    const env = quests.find((q) => q.id === "environment")!.steps.map((s) => s.notes).join(" ");
    for (const fact of ["415 TWh", "1.5%", "945 TWh", "0.24 Wh", "0.26 mL", "0.34 Wh", "1,287 MWh", "Patterson", "IEA", "August 2025", "June 2025"])
      expect(env).toContain(fact);
  });

  it("covers the history milestones", () => {
    const h = quests.find((q) => q.id === "history")!.steps.map((s) => s.notes).join(" ");
    for (const fact of ["1956", "Dartmouth", "1958", "Rosenblatt", "1986", "Rumelhart", "1997", "Kasparov", "2012", "AlexNet", "2017", "Attention Is All You Need", "2020", "November 30, 2022"])
      expect(h).toContain(fact);
  });
});

describe("randomized checks", () => {
  it("never draws the variant just seen, and reaches every other one", () => {
    const r = rng(7);
    for (const count of [2, 3, 4, 6]) {
      for (let last = 0; last < count; last++) {
        const seen = new Set<number>();
        for (let i = 0; i < 400; i++) {
          const v = drawVariant(count, last, r);
          expect(v).not.toBe(last);
          expect(v >= 0 && v < count).toBe(true);
          seen.add(v);
        }
        expect(seen.size).toBe(count - 1);
      }
    }
  });

  it("draws any variant the first time and handles single-variant steps", () => {
    const r = rng(3);
    expect(new Set(Array.from({ length: 200 }, () => drawVariant(3, undefined, r)))).toEqual(new Set([0, 1, 2]));
    expect(drawVariant(1, 0, r)).toBe(0);
    expect(drawVariant(3, 9, r)).toBeLessThan(3);
  });

  it("walks a step's variants without an immediate repeat", () => {
    const step = quests[0].steps[0];
    const r = rng(11);
    let last: number | undefined;
    for (let i = 0; i < 50; i++) {
      const v = drawVariant(variantCount(step), last, r);
      if (last !== undefined) expect(v).not.toBe(last);
      expect(checkFor(step, v)).toBeDefined();
      last = v;
    }
  });

  it("shuffles options into a full permutation, with the answer landing anywhere", () => {
    const r = rng(5);
    const positions = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const order = shuffle(4, r);
      expect([...order].sort()).toEqual([0, 1, 2, 3]);
      positions.add(order.indexOf(0));
    }
    expect(positions).toEqual(new Set([0, 1, 2, 3]));
  });
});

describe("daily review", () => {
  it("is empty until a quest is finished", () => {
    expect(reviewPool(EMPTY)).toEqual([]);
    expect(pickReview(EMPTY, rng(1))).toEqual([]);
  });

  it("draws five distinct questions from finished quests only", () => {
    const s = withBadges(["transformer", "spot"]);
    const picked = pickReview(s, rng(2));
    expect(picked).toHaveLength(REVIEW_SIZE);
    expect(new Set(picked.map((p) => p.qid)).size).toBe(REVIEW_SIZE);
    for (const p of picked) expect(["transformer", "spot"]).toContain(p.questId);
    // Different steps while there are enough of them.
    expect(new Set(picked.map((p) => `${p.questId}/${p.stepId}`)).size).toBe(REVIEW_SIZE);
    // Spot rounds carry the question the AI was asked.
    for (const p of reviewPool(s).filter((x) => x.stepId === "citation")) expect(p.prompt).toMatch(/source/);
  });

  it("weights missed questions above unseen ones, and unseen above ones answered right", () => {
    expect(reviewWeight({ right: 0, wrong: 1, last: "wrong" })).toBeGreaterThan(reviewWeight(undefined));
    expect(reviewWeight(undefined)).toBeGreaterThan(reviewWeight({ right: 2, wrong: 0, last: "right" }));
    expect(reviewWeight({ right: 1, wrong: 2, last: "right" })).toBeGreaterThan(reviewWeight({ right: 3, wrong: 0, last: "right" }));
  });

  it("picks missed questions far more often", () => {
    let s = withBadges(["history"]);
    const missed = questionId("history", "backprop", 1);
    s = applyAnswer(s, missed, false);
    for (const x of reviewPool(s)) if (x.qid !== missed) s = applyAnswer(s, x.qid, true);
    const r = rng(9);
    let hits = 0;
    const runs = 400;
    for (let i = 0; i < runs; i++) if (pickReview(s, r, 1)[0].qid === missed) hits++;
    // Uniform would be 1 in 15 (about 27 of 400); weighting should make it several times likelier.
    expect(hits).toBeGreaterThan(runs / 5);
  });

  it("records answers per question", () => {
    let s = applyAnswer(EMPTY, "a/b#0", false);
    s = applyAnswer(s, "a/b#0", true);
    expect(s.answers["a/b#0"]).toEqual({ right: 1, wrong: 1, last: "right" });
  });

  it("awards review XP once a day and keeps the streak", () => {
    let s: QuestState = { ...EMPTY, streak: { count: 3, last: "2026-09-01" } };
    let r = applyReview(s, 4, "2026-09-02");
    expect(r.gained).toBe(4 * XP_REVIEW + XP_REVIEW_BONUS);
    expect(r.state.streak).toEqual({ count: 4, last: "2026-09-02" });
    s = r.state;
    r = applyReview(s, 5, "2026-09-02");
    expect(r.gained).toBe(0);
    expect(r.state.xp).toBe(s.xp);
    expect(applyReview(r.state, 5, "2026-09-03").gained).toBe(5 * XP_REVIEW + XP_REVIEW_BONUS);
  });
});

describe("level unlocking", () => {
  const l1 = levels[0].quests.map((q) => q.id);
  const l2 = levels[1].quests.map((q) => q.id);
  const l3 = levels[2].quests.map((q) => q.id);

  it("starts with only level 1 open", () => {
    expect(levelUnlocked(EMPTY, 1)).toBe(true);
    expect(levelUnlocked(EMPTY, 2)).toBe(false);
    expect(levelUnlocked(EMPTY, 3)).toBe(false);
    expect(questUnlocked(EMPTY, l1[0])).toBe(true);
    expect(questUnlocked(EMPTY, l2[0])).toBe(false);
  });

  it(`opens the next level after ${UNLOCK_AFTER} finished quests`, () => {
    const two = withBadges(l1.slice(0, UNLOCK_AFTER - 1));
    expect(levelUnlocked(two, 2)).toBe(false);
    const three = withBadges(l1.slice(0, UNLOCK_AFTER));
    expect(levelUnlocked(three, 2)).toBe(true);
    expect(levelUnlocked(three, 3)).toBe(false);
    expect(levelUnlocked(withBadges([...l1.slice(0, 3), ...l2.slice(0, 3)]), 3)).toBe(true);
  });

  it("keeps quests open that a student already started under the old flat list", () => {
    const s: QuestState = { ...EMPTY, steps: { environment: { "data-centres": "first" } }, badges: ["spot"] };
    expect(questUnlocked(s, "environment")).toBe(true);
    expect(questUnlocked(s, "spot")).toBe(true);
    expect(questUnlocked(s, l3.find((id) => id !== "environment")!)).toBe(false);
  });

  it("suggests the next open, unfinished quest", () => {
    expect(nextQuest(EMPTY)).toBe(l1[0]);
    expect(nextQuest(withBadges([l1[0]]), l1[0])).toBe(l1[1]);
    const lastL1 = withBadges(l1);
    expect(nextQuest(lastL1, l1.at(-1))).toBe(l2[0]);
  });
});

describe("saved progress", () => {
  it("migrates version 1 progress, keeping XP, steps, badges and streak", () => {
    const v1 = { xp: 85, steps: { spot: { why: "first", citation: "retry" } }, badges: ["spot"], streak: { count: 2, last: "2026-09-01" } };
    const s = migrate(v1)!;
    expect(s.xp).toBe(85);
    expect(s.steps).toEqual(v1.steps);
    expect(s.badges).toEqual(["spot"]);
    expect(s.streak).toEqual({ count: 2, last: "2026-09-01" });
    expect(s.answers).toEqual({});
    expect(s.seen).toEqual({});
    expect(s.reviewDay).toBeNull();
  });

  it("drops malformed parts and rejects junk", () => {
    expect(migrate(null)).toBeNull();
    expect(migrate("hello")).toBeNull();
    expect(migrate({ steps: {} })).toBeNull();
    const s = migrate({ xp: 1, steps: { a: { b: "first", c: 3 }, d: "x" }, badges: ["a", 4], streak: "?", answers: { q: { right: 1 } }, seen: { k: 2, j: "x" } })!;
    expect(s.steps).toEqual({ a: { b: "first" } });
    expect(s.badges).toEqual(["a"]);
    expect(s.streak).toEqual(EMPTY.streak);
    expect(s.answers).toEqual({});
    expect(s.seen).toEqual({ k: 2 });
  });

  it("round-trips the current shape", () => {
    const s: QuestState = { ...EMPTY, xp: 3, answers: { "x/y#1": { right: 0, wrong: 2, last: "wrong" } }, seen: { "x/y": 1 }, reviewDay: "2026-09-01" };
    expect(migrate(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});

describe("XP, badges and streaks", () => {
  it("awards XP once per step, less after a wrong answer", () => {
    let r = applyPass(EMPTY, "history", "dartmouth", true, "2026-09-01");
    expect(r.gained).toBe(XP_FIRST_TRY);
    r = applyPass(r.state, "history", "dartmouth", true, "2026-09-01");
    expect(r.gained).toBe(0);
    r = applyPass(r.state, "history", "backprop", false, "2026-09-01");
    expect(r.gained).toBe(XP_RETRY);
    expect(r.state.xp).toBe(XP_FIRST_TRY + XP_RETRY);
  });

  it("earns the badge and bonus when the last step is passed", () => {
    const q = quests.find((x) => x.id === "spot")!;
    let s = EMPTY;
    let last = applyPass(s, q.id, q.steps[0].id, true);
    for (const step of q.steps) {
      last = applyPass(s, q.id, step.id, true, "2026-09-01");
      s = last.state;
    }
    expect(last.badge).toBe(true);
    expect(s.badges).toEqual(["spot"]);
    expect(s.xp).toBe(q.steps.length * XP_FIRST_TRY + XP_QUEST_BONUS);
  });

  it("keeps review data when a step is passed", () => {
    const s = applyAnswer({ ...EMPTY, seen: { "a/b": 2 } }, "a/b#2", true);
    const r = applyPass(s, "history", "dartmouth", true, "2026-09-01");
    expect(r.state.answers).toEqual(s.answers);
    expect(r.state.seen).toEqual(s.seen);
  });

  it("counts consecutive days and resets after a gap", () => {
    let s = applyPass(EMPTY, "history", "dartmouth", true, "2026-09-01").state;
    s = applyPass(s, "history", "backprop", true, "2026-09-02").state;
    expect(s.streak).toEqual({ count: 2, last: "2026-09-02" });
    expect(liveStreak(s.streak, "2026-09-03")).toBe(2);
    expect(liveStreak(s.streak, "2026-09-05")).toBe(0);
    s = applyPass(s, "history", "perceptron-winters", true, "2026-09-06").state;
    expect(s.streak.count).toBe(1);
  });
});
