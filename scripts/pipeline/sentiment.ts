/**
 * How viewers feel about a video, from its top comments. A plain word list, so it runs free in the daily job
 * with no AI key: each comment scores +1, -1 or 0 by its positive and negative words, and the video's score is
 * the average, from -1 (viewers warn others off) to +1 (viewers thank the creator). Rough by design; it only
 * needs to catch videos whose comments say "this doesn't work", "clickbait", "waste of time".
 */

/** Words and phrases that praise a tutorial. Matched as whole words, case-insensitive. */
const POSITIVE = [
  "thank you", "thanks", "thank u", "thx", "helpful", "so helpful", "very helpful", "great", "excellent", "amazing", "awesome",
  "brilliant", "fantastic", "love this", "loved this", "best tutorial", "best video", "best explanation", "clear", "clearly",
  "well explained", "easy to follow", "finally understand", "finally understood", "saved me", "life saver", "lifesaver",
  "underrated", "gold", "perfect", "useful", "informative", "learned so much", "learnt so much", "subscribed", "keep it up",
  "great job", "good job", "well done", "appreciate", "nice explanation", "high quality", "to the point", "concise",
  "exactly what i needed", "worked for me", "it works", "works perfectly", "game changer", "masterpiece", "superb", "wonderful",
];

/** Words and phrases that warn people off. */
const NEGATIVE = [
  "clickbait", "click bait", "waste of time", "wasted my time", "waste of my time", "scam", "misleading", "mislead", "fake",
  "doesn't work", "doesnt work", "does not work", "didn't work", "didnt work", "not working", "useless", "terrible", "awful",
  "worst", "garbage", "trash", "boring", "confusing", "outdated", "wrong", "incorrect", "inaccurate", "too many ads",
  "just an ad", "sponsored garbage", "disappointed", "disappointing", "dislike", "unsubscribed", "stop lying", "lies",
  "bad explanation", "no value", "pointless", "rubbish", "overhyped", "nonsense", "paywall", "bait",
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "['’]?");
const pattern = (list: string[]) => new RegExp(`(^|[^a-z])(${list.map(escape).join("|")})(?=[^a-z]|$)`, "gi");
const POS = pattern(POSITIVE);
const NEG = pattern(NEGATIVE);
const count = (re: RegExp, text: string) => (text.match(re) ?? []).length;

/** One comment's leaning: +1 positive, -1 negative, 0 neutral or mixed evenly. */
export function commentSentiment(text: string): number {
  const t = text.toLowerCase();
  // "not helpful", "not great": a negation right before a positive word flips it.
  const negated = count(/(^|[^a-z])(not|isn['’]?t|wasn['’]?t|never|no longer)\s+(very\s+|really\s+|that\s+)?(helpful|useful|great|clear|good|working|worth)/gi, t);
  const pos = Math.max(0, count(POS, t) - negated);
  const neg = count(NEG, t) + negated;
  return pos > neg ? 1 : neg > pos ? -1 : 0;
}

export interface Sentiment {
  /** Average leaning of the comments read, -1 to 1, two decimals. */
  score: number;
  /** How many comments were read. */
  n: number;
}

/** The average leaning of a video's comments. */
export function scoreComments(comments: string[]): Sentiment {
  const texts = comments.map((c) => c.trim()).filter(Boolean);
  if (!texts.length) return { score: 0, n: 0 };
  const total = texts.reduce((s, c) => s + commentSentiment(c), 0);
  return { score: Math.round((total / texts.length) * 100) / 100, n: texts.length };
}
