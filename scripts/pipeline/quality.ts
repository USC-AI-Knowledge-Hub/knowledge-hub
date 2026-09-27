import type { TrendKind } from "../../src/data/types";
import { SETTINGS } from "./config";

export interface Candidate {
  id: string;
  title: string;
  description: string;
  channel: string;
  channelId: string;
  publishedAt: string;
  duration: number;
  views: number;
  likes?: number;
  language?: string;
  live?: boolean;
  /** Known to be a YouTube Short (RSS links them under /shorts/). */
  short?: boolean;
  trusted?: boolean;
}

const HYPE = [
  /\b(insane|shocking|crazy|unbelievable|mind[- ]?blowing|game[- ]?changer|destroys?|killed|is dead|rip)\b/i,
  /\b(make|making|earn) \$?\d[\d,]*k?\b.*\b(month|day|week)\b/i,
  /\bget rich\b|\bpassive income\b|\bside hustle\b/i,
  /!!|🤯|😱|🔥🔥/u,
];

const EDUCATIONAL =
  /\b(tutorial|guide|course|explained|explainer|how to|how i|walkthrough|lessons?|learn|step[- ]by[- ]step|beginners?|deep dive|tips|tricks|crash course|full course|intro(duction)?|what is|basics|fundamentals|getting started|masterclass|workshop|in under \d+ minutes)\b/i;

/** Imperative titles like "Use ChatGPT Work to build dashboards" are lessons too. */
const IMPERATIVE = /^(use|build|create|make|set ?up|automate|write|analy[sz]e|turn|learn|master)\b/i;

/** Entertainment: never kept, as a lesson or a trend. */
const ENTERTAINMENT = /\b(trailer|teaser|reacts?|reaction|memes?|compilation)\b/i;

/**
 * News, launches, research and talks go to the trends feed, never the lesson
 * library. Checked in this order, so "AI News: X launches Y" counts as news.
 */
const TREND_PATTERNS: [TrendKind, RegExp][] = [
  ["news", /\b(ai news|news:|this week in ai|weekly (ai )?(news|recap)|recap|round-?up|everything (announced|new)|what's new)\b/i],
  ["talk", /\b(keynote|podcast|interview|in conversation|conversation with|fireside|panel|documentary|talks? (with|at)|ted talk|livestream|live stream)\b/i],
  ["launch", /\b(introducing|announcing|announcement|launch(es|ed|ing)?|released?|now available|unveil(s|ed)?|just dropped|is here|new model)\b/i],
  // "Research" alone is too common in lesson titles ("Deep Research explained"), so only news-style phrasing counts.
  ["research", /\b((new|this|the) paper|research paper|researchers|study (finds|shows)|benchmarks?|breakthrough|state of ai)\b/i],
];

/** The kind of trend a title is, or null when it doesn't read as news, a launch, research or a talk. */
export function trendKind(title: string): TrendKind | null {
  for (const [kind, re] of TREND_PATTERNS) {
    // A lesson that mentions research is still a lesson.
    if (kind === "research" && looksEducational(title)) continue;
    if (re.test(title)) return kind;
  }
  return null;
}

/** Title reads like a lesson rather than news or entertainment. */
export const looksEducational = (title: string) => EDUCATIONAL.test(title) || IMPERATIVE.test(title.trim());

/** The title is about AI at all. Required for videos that don't name a catalog tool. */
export const mentionsAI = (title: string) =>
  /\b(ai|a\.i\.|llms?|gpts?|agents?|agentic|machine learning|deep learning|reinforcement learning|neural|genai|generative|prompt(s|ing)?|chatbots?|copilot|mcp|rag)\b/i.test(title);

export function hypeLevel(title: string): number {
  let n = HYPE.filter((re) => re.test(title)).length;
  const words = title.split(/\s+/).filter((w) => /[A-Z]{4,}/.test(w) && w === w.toUpperCase());
  if (words.length >= 2) n += 1;
  return n;
}

/** Share of letters outside Latin script: a cheap language check for RSS mode. */
function nonLatinRatio(text: string): number {
  const letters = [...text].filter((c) => /\p{L}/u.test(c));
  if (!letters.length) return 0;
  return letters.filter((c) => !/\p{Script=Latin}/u.test(c)).length / letters.length;
}

export function ageDays(publishedAt: string, now: Date): number {
  return Math.max(0, (now.getTime() - new Date(publishedAt).getTime()) / 86_400_000);
}

/** Why a candidate was rejected, or null if it passes. */
export function rejectReason(c: Candidate, now: Date): string | null {
  if (c.live) return "live or upcoming";
  if (c.short) return "short";
  if (/#shorts?\b/i.test(c.title) || /#shorts?\b/i.test(c.description.slice(0, 200))) return "short";
  if (c.duration && c.duration < SETTINGS.minDuration) return "too short";
  if (c.duration > SETTINGS.maxDuration) return "too long";
  if (c.language && !c.language.toLowerCase().startsWith("en")) return "not English";
  if (nonLatinRatio(c.title) > 0.3) return "not English";
  if (hypeLevel(c.title) >= 2) return "clickbait";
  if (ENTERTAINMENT.test(c.title)) return "entertainment";
  if (ageDays(c.publishedAt, now) > SETTINGS.maxAgeDays) return "too old";
  if (!c.trusted && c.views > 0) {
    const min = ageDays(c.publishedAt, now) < 3 ? SETTINGS.minViewsFresh : SETTINGS.minViews;
    if (c.views < min) return "too few views";
  }
  return null;
}

/**
 * 0–100 quality score: reach, momentum, approval, freshness and source trust,
 * minus a hype penalty. Weighted toward learning value over raw popularity.
 */
export function qualityScore(c: Candidate, now: Date): number {
  const age = Math.max(1, ageDays(c.publishedAt, now));
  const reach = Math.min(1, Math.log10(c.views + 1) / 6.5);
  const momentum = Math.min(1, Math.log10(c.views / age + 1) / 5);
  const approval = c.likes && c.views ? Math.min(1, (c.likes / c.views) / 0.04) : 0.5;
  const fresh = Math.exp(-age / 30);
  const trust = c.trusted ? 1 : 0;
  const edu = EDUCATIONAL.test(c.title) ? 1 : 0;
  const s =
    0.25 * reach + 0.2 * momentum + 0.15 * approval + 0.15 * fresh + 0.12 * trust + 0.13 * edu -
    0.15 * hypeLevel(c.title);
  return Math.round(Math.max(0, Math.min(1, s)) * 100);
}
