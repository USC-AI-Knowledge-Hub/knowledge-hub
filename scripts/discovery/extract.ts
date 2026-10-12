import { SOURCES } from "./sources";
import type { FeedItem, Mention, Source } from "./types";

/**
 * Finding product and model names in post titles, without a language model. Announcement titles are
 * formulaic ("Introducing X", "X is now available", "Name – tagline"), so a few patterns find most of
 * them; a wrong name costs little, because a product is only listed once several mentions agree.
 */

/** Companies are not tools: "Google launches Veo" is about Veo. */
const COMPANIES = new Set(
  `openai google microsoft meta anthropic nvidia apple amazon aws ibm intel amd samsung tesla xai mistral cohere huggingface hugging face stability deepmind github youtube linkedin salesforce adobe oracle sap baidu alibaba tencent bytedance cloudflare databricks snowflake figma notion slack zoom dropbox atlassian shopify stripe uber airbnb spotify netflix reuters bloomberg wired techcrunch verge venturebeat forbes wsj`.split(" "),
);

/** Words that start a headline or aren't a name at all. */
const NOT_NAMES = new Set(
  `ai the a an this that these those it its we our you your i how why what when where who which top best new here now today just more most all every why some any one two three first next last big small open free faster better smarter introducing announcing meet say hello welcome launch launches launching update updates release releases releasing report reports study studies week month year news weekly daily guide guides tips tip review reviews opinion analysis interview podcast video watch read join sign comparison versus vs exclusive breaking`.split(" "),
);

/** Trailing words that describe the thing instead of naming it. */
const GENERIC_TAIL = /\s+(?:model|models|tool|tools|app|apps|api|apis|update|updates|version|versions|feature|features|release|assistant|platform|agent|agents|suite|series|family|studio|launch|beta|preview)$/i;
/** Words after a version that mark a variant of the same product. */
const VARIANT = /\s+(?:preview|beta|turbo|pro|max|mini|nano|lite|flash|ultra|plus|fast|thinking|instant|large|small|base|instruct)$/i;
const LEAD = /^(?:the|our|a|an|new|introducing|meet|announcing)\s+/i;
/** A name ends at the first of these: a delimiter, or a verb that starts the rest of the headline. */
const END =
  /\s[-–—|:]\s|[:–—|(,;!?]|\s(?:is|are|now|for|with|that|to|from|by|on|in|at|as|just|has|gets|brings|adds|lets|makes|turns|raises|launches|launched|lands|arrives|debuts|becomes|helps|can|will|and|vs|versus)\s/i;

/** Version numbers and sizes at the end of a name: "Veo 3.1", "Llama 3.2 1B", "GPT-4o", "Qwen3.5". */
const VERSION_TAIL = /[\s-]*v?\d+(?:\.\d+)*[a-z]?$/i;

/** The name a product goes by, without versions or variants: "Veo 3.1 Fast" → "Veo". */
export function familyName(name: string): string {
  // A version in the middle: "Flux.1 Kontext" → "Flux Kontext".
  let n = name.trim().replace(/([A-Za-z])[.-]?\d+(?:\.\d+)*(?=\s)/g, "$1");
  for (let i = 0; i < 4; i++) {
    const next = n.replace(VARIANT, "").replace(VERSION_TAIL, "").replace(/\.\d+$/, "").trim();
    if (next === n || next.length < 2) break;
    n = next;
  }
  return n;
}

/** Lowercase letters and digits only, words joined by one space: the key two mentions share. */
export const keyOf = (name: string) => familyName(name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const letters = (s: string) => (s.match(/[a-z]/gi) ?? []).length;

/** Whether text reads like a product name rather than a phrase. */
export function validName(name: string): boolean {
  if (name.length < 3 || name.length > 40) return false;
  const tokens = name.split(/\s+/);
  if (tokens.length > 4) return false;
  if (letters(name) < 3) return false;
  if (!/^[A-Z0-9]/.test(name)) return false;
  if (NOT_NAMES.has(tokens[0].toLowerCase())) return false;
  if (tokens.every((t) => NOT_NAMES.has(t.toLowerCase()))) return false;
  const key = keyOf(name);
  if (!key || COMPANIES.has(key) || COMPANIES.has(key.replace(/ /g, ""))) return false;
  // A leftover price, percentage or number is not a name.
  if (/[$%€£]|\d{4,}/.test(name)) return false;
  return true;
}

/** Cuts a title fragment down to the product name in it, or "" if there isn't one. */
export function cleanName(raw: string): string {
  let n = raw.replace(/[“”"`]/g, "").trim();
  n = n.split(END)[0] ?? n;
  for (let i = 0; i < 3; i++) n = n.replace(LEAD, "");
  for (let i = 0; i < 3; i++) n = n.replace(GENERIC_TAIL, "");
  n = n.replace(/^[\s'’.\-–—]+|[\s'’.\-–—,;:]+$/g, "").trim();
  return validName(n) ? n : "";
}

const ANNOUNCE = /^(?:introducing|announcing|meet|say hello to|welcome|launching|launches|unveiling|unveils|releasing|releases|debuts?|presenting|rolling out|open[- ]sourcing|new:)\s+(.+)$/i;
const AVAILABLE = /^(.+?)\s+(?:is|are)\s+(?:now\s+)?(?:available|live|here|rolling out|launching|generally available|open source|open-source|out now|coming)\b/i;
const HEADLINE_OBJECT = /^(.{2,40}?)\s+(?:launches|unveils|releases|debuts|introduces|announces|rolls out|open-sources|unveiled|launched|released)\s+(.+)$/i;
const HEADLINE_SUBJECT = /^(.{2,40}?)\s+(?:raises|launches|unveils|releases|debuts|introduces|announces|rolls out|lands|emerges|comes out of stealth|adds|brings|rolls out)\b/i;
const SHOW_HN = /^(?:show|launch) hn\s*:\s*/i;

/**
 * The product names a post title mentions, most likely first. `isKnown` tells it when the company or
 * product doing the launching is already in the catalog: "Runway launches Gen-5" is a new version of
 * a tool we have, while "Google launches Veo" introduces something new.
 */
export function namesInTitle(title: string, source: Pick<Source, "titles">, isKnown: (name: string) => boolean = () => false): string[] {
  const out: string[] = [];
  const add = (raw: string | undefined) => {
    const n = raw ? cleanName(raw) : "";
    if (n && !out.some((o) => keyOf(o) === keyOf(n))) out.push(n);
  };
  const t = title.replace(SHOW_HN, "").trim();
  if (source.titles === "product") {
    // "Name – tagline", or just "Name".
    const head = t.split(/\s[-–—|:]\s|\s*[–—|]\s*/)[0];
    add(head);
    return out;
  }
  add(ANNOUNCE.exec(t)?.[1]);
  add(AVAILABLE.exec(t)?.[1]);
  const launch = HEADLINE_OBJECT.exec(t);
  if (launch && !isKnown(launch[1].trim())) add(launch[2]);
  add(HEADLINE_SUBJECT.exec(t)?.[1]);
  return out;
}

const AI_WORDS = /\b(ai|a\.i\.|artificial intelligence|llms?|large language|machine learning|generative|gpt|chatbots?|copilot|agentic|ai agents?|diffusion|neural|text[- ]to|language models?)\b/i;
export const aiRelated = (text: string) => AI_WORDS.test(text);

/** Whether the post says it's a model rather than a product people use directly. */
const kindOf = (title: string): "tool" | "model" => (/\bmodels?\b/i.test(title) ? "model" : "tool");

/** Every product named in a source's posts. `isKnown` skips what the catalog already has. */
export function extractMentions(items: FeedItem[], source: Source, isKnown: (name: string) => boolean): Mention[] {
  const out: Mention[] = [];
  for (const item of items) {
    if (!source.aiOnly && !aiRelated(`${item.title} ${item.summary}`)) continue;
    for (const name of namesInTitle(item.title, source, isKnown)) {
      const family = familyName(name);
      if (!validName(family) || isKnown(family) || isKnown(name)) continue;
      out.push({ name: family, key: keyOf(family), kind: kindOf(item.title), source, item });
    }
  }
  return out;
}

export const sourceById = new Map(SOURCES.map((s) => [s.id, s]));
