/** Limits the board enforces. The database (supabase/schema.sql) checks the same ones, so keep them in step. */
export const NAME_MAX = 40;
export const BODY_MAX = 2000;
export const MAX_LINKS = 2;

/** The reactions on offer. */
export const REACTIONS = [
  { emoji: "👍", label: "Helpful" },
  { emoji: "❤️", label: "Love it" },
  { emoji: "💡", label: "Good idea" },
  { emoji: "🎉", label: "Nice" },
  { emoji: "🤔", label: "Curious" },
] as const;

const LINK = /(https?:\/\/|www\.)/gi;

export const linkCount = (text: string) => (text.match(LINK) ?? []).length;

/** Collapses stray control characters and trims, the way the database does. */
export const clean = (t: string) =>
  t
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\r\n?/g, "\n")
    .trim();

/** Why a post can't be sent, or "" if it can. Mirrors the database's checks so the form can say so before sending. */
export function problemWith(name: string, body: string): string {
  const n = clean(name);
  const b = clean(body);
  if (!n) return "Add a name so people know who is writing.";
  if (n.length > NAME_MAX) return `Use a name of ${NAME_MAX} characters or fewer.`;
  if (/(https?:\/\/|www\.)/i.test(n)) return "Names can't contain links.";
  if (!b) return "Write something first.";
  if (b.length > BODY_MAX) return `That's ${b.length - BODY_MAX} characters over the ${BODY_MAX} limit.`;
  if (linkCount(b) > MAX_LINKS) return `Use at most ${MAX_LINKS} links in a post.`;
  return "";
}

/** "just now", "5 minutes ago", "3 days ago", then the date. */
export function ago(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} ${m === 1 ? "minute" : "minutes"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  const d = Math.round(h / 24);
  if (d < 14) return `${d} ${d === 1 ? "day" : "days"} ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
