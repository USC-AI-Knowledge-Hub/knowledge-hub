/**
 * Video picks: students recommend a video in one line, and vote on each other's picks.
 *
 * Picks are ordinary posts on the board database (board "video-recs"), so they need no new tables:
 * the post's topic is the pick's category, and its body holds the headline, the video's address, a
 * "tags:" line and an optional note, one after another. The picture is the video's own YouTube thumbnail,
 * built from a checked video id, so nobody can make the page load an image from anywhere else.
 * A vote is the board's 👍 reaction: one per browser per pick, and the database enforces it.
 */
import { NAME_MAX, clean } from "./rules";
import type { Post } from "./store";

export const REC_BOARD = "video-recs";
export const VOTE = "👍";
export const HEADLINE_MAX = 90;
export const WHY_MAX = 400;

/** What a pick is about. The id is stored as the post's topic, so don't rename one once it's in use. */
export interface Category {
  id: string;
  label: string;
  icon: string;
  /** The library's topics (src/data/topics.ts) that suggest this category for a library video. */
  topics: string[];
}
export const CATEGORIES: readonly Category[] = [
  { id: "basics", label: "AI basics", icon: "school", topics: ["genai-basics", "chat-basics", "llms", "reasoning", "limits"] },
  { id: "prompting", label: "Prompting", icon: "edit_note", topics: ["prompting"] },
  { id: "writing-research", label: "Writing and research", icon: "menu_book", topics: ["writing", "research"] },
  { id: "coding", label: "Coding and data", icon: "code", topics: ["coding", "data"] },
  { id: "agents", label: "Agents and automation", icon: "smart_toy", topics: ["agents", "automation", "rag"] },
  { id: "media", label: "Images, video and audio", icon: "palette", topics: ["multimodal"] },
  { id: "work", label: "Work and presentations", icon: "work", topics: ["presenting", "field"] },
  { id: "teaching", label: "Teaching and learning", icon: "cast_for_education", topics: ["teaching", "assessment"] },
  { id: "ethics", label: "Ethics and policy", icon: "balance", topics: ["ethics"] },
  { id: "other", label: "Other", icon: "category", topics: [] },
];
export const categoryById = new Map(CATEGORIES.map((c) => [c.id, c]));

/** The category a library video's topics point to, or "" when none does. */
export function categoryFor(topics: readonly string[]): string {
  for (const t of topics) {
    const c = CATEGORIES.find((x) => x.topics.includes(t));
    if (c) return c.id;
  }
  return "";
}

export const TAG_MAX = 5;
export const TAG_LENGTH = 24;

/** Tags from what someone typed: lower case, letters, numbers and dashes, no repeats, at most five. */
export function parseTags(input: string): string[] {
  const out: string[] = [];
  for (const raw of input.split(/[,#\n]+/)) {
    const t = raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s-]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, TAG_LENGTH);
    if (t && !out.includes(t)) out.push(t);
  }
  return out.slice(0, TAG_MAX);
}

const ID = /^[A-Za-z0-9_-]{11}$/;

/** The video id in a YouTube address (watch, youtu.be, shorts, embed, live), or "" if it isn't one. */
export function youtubeId(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim().replace(/^(?!https?:\/\/)/i, "https://"));
  } catch {
    return "";
  }
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.|music\.)/, "");
  let id = "";
  if (host === "youtu.be") id = url.pathname.split("/")[1] ?? "";
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
    else {
      const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/);
      id = m?.[1] ?? "";
    }
  }
  return ID.test(id) ? id : "";
}

export const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
export const thumbUrl = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

export const TITLE_MAX = 150;

export interface RecDraft {
  /** The student's one-line recommendation, shown in quotes. */
  headline: string;
  videoId: string;
  /** The video's own title, from the Hub's library or YouTube, or typed by the student. */
  title: string;
  /** A longer note. The form no longer asks for one; older picks may have it. */
  why: string;
  tags: string[];
}

/** A video title cleaned for storing: one line, no links, not too long. */
export const cleanTitle = (t: string) =>
  clean(t)
    .replace(/\s+/g, " ")
    .replace(/(https?:\/\/|www\.)\S*/gi, "")
    .trim()
    .slice(0, TITLE_MAX);

/** The post body for a pick: headline, the video's address, "title:" and "tags:" lines, then any note. */
export const encodeRec = (r: RecDraft) =>
  [
    clean(r.headline).replace(/\s+/g, " "),
    watchUrl(r.videoId),
    ...(cleanTitle(r.title) ? [`title: ${cleanTitle(r.title)}`] : []),
    ...(r.tags.length ? [`tags: ${parseTags(r.tags.join(",")).join(", ")}`] : []),
    ...(clean(r.why) ? ["", clean(r.why)] : []),
  ].join("\n");

/** A pick from a post body, or null when the body isn't one (then the page leaves it out). */
export function decodeRec(body: string): RecDraft | null {
  const [headline = "", link = "", ...more] = body.split("\n");
  let title = "";
  let tagLine = "";
  // The "title:" and "tags:" lines come straight after the address, in either order.
  while (more.length && /^(title|tags):/.test(more[0])) {
    const line = more.shift()!;
    if (line.startsWith("title:")) title = line.slice(6);
    else tagLine = line.slice(5);
  }
  const videoId = youtubeId(link);
  const h = headline.trim();
  if (!h || !videoId) return null;
  // The database only caps the whole body, so trim here too in case a post skipped the form.
  return {
    headline: h.slice(0, HEADLINE_MAX),
    videoId,
    title: cleanTitle(title),
    why: more.join("\n").trim().slice(0, WHY_MAX),
    tags: parseTags(tagLine),
  };
}

/** Why a pick can't be sent, or "" if it can. */
export function recProblem(name: string, link: string, headline: string, title: string, category: string): string {
  const n = clean(name);
  if (!n) return "Add your name so people know whose pick it is.";
  if (n.length > NAME_MAX) return `Use a name of ${NAME_MAX} characters or fewer.`;
  if (/(https?:\/\/|www\.)/i.test(n)) return "Names can't contain links.";
  if (!link.trim()) return "Paste a YouTube link, or pick a video from the Hub's library.";
  if (!youtubeId(link)) return "That isn't a YouTube video link. Copy it from the Share button under the video.";
  if (!cleanTitle(title)) return "Add the video's title, as it appears on YouTube.";
  const h = clean(headline);
  if (!h) return "Write your recommendation in one line: why should someone watch it?";
  if (h.length > HEADLINE_MAX) return `Keep your recommendation to ${HEADLINE_MAX} characters. It's ${h.length - HEADLINE_MAX} over.`;
  if (/(https?:\/\/|www\.)/i.test(h)) return "Put the link in the video box, not in your recommendation.";
  if (!categoryById.has(category)) return "Pick a category.";
  return "";
}

export interface Rec extends RecDraft {
  id: string;
  name: string;
  /** A category id; older picks without one count as "other". */
  category: string;
  votes: number;
  createdAt: string;
  editedAt: string | null;
  /** Whether this browser posted it, when the store knows. */
  mine?: boolean;
}

/** The picks in a board's posts. Replies, deleted posts and anything that isn't a pick are left out. */
export function recsFrom(posts: Post[]): Rec[] {
  const out: Rec[] = [];
  for (const p of posts) {
    if (p.parentId || p.deleted) continue;
    const r = decodeRec(p.body);
    if (r)
      out.push({
        ...r,
        id: p.id,
        name: p.name,
        category: categoryById.has(p.topic) ? p.topic : "other",
        votes: p.reactions[VOTE] ?? 0,
        createdAt: p.createdAt,
        editedAt: p.editedAt,
        mine: p.mine,
      });
  }
  return out;
}

export type RecSort = "top" | "week" | "new";
const WEEK = 7 * 24 * 3600 * 1000;

/** Picks in order. "week" ranks only the last seven days' picks by votes. Ties go to the newer pick. */
export function rankRecs(recs: Rec[], sort: RecSort, now = Date.now()): Rec[] {
  const list = sort === "week" ? recs.filter((r) => now - new Date(r.createdAt).getTime() <= WEEK) : [...recs];
  const newer = (a: Rec, b: Rec) => b.createdAt.localeCompare(a.createdAt);
  return list.sort(sort === "new" ? newer : (a, b) => b.votes - a.votes || newer(a, b));
}

export interface Leader {
  name: string;
  votes: number;
  picks: number;
}

/** The people whose picks have the most votes. Names are matched without case; only people with a vote count. */
export function leaders(recs: Rec[], limit = 5): Leader[] {
  const by = new Map<string, Leader>();
  for (const r of recs) {
    const key = r.name.trim().toLowerCase();
    const l = by.get(key) ?? { name: r.name.trim(), votes: 0, picks: 0 };
    l.votes += r.votes;
    l.picks += 1;
    by.set(key, l);
  }
  return [...by.values()]
    .filter((l) => l.votes > 0)
    .sort((a, b) => b.votes - a.votes || b.picks - a.picks || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Picks whose headline, note, name, tags or video (title and channel, when known) hold every word searched for. */
export function searchRecs(recs: Rec[], q: string, videoText: (videoId: string) => string = () => ""): Rec[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return recs;
  return recs.filter((r) => {
    const hay = `${r.headline} ${r.title} ${r.why} ${r.name} ${r.tags.join(" ")} ${r.tags.join(" ").replace(/-/g, " ")} ${videoText(r.videoId)}`.toLowerCase();
    return words.every((w) => hay.includes(w.replace(/^#/, "")));
  });
}

/** The most used tags, most used first, ties in alphabetical order. */
export function popularTags(recs: Rec[], limit = 12): { tag: string; count: number }[] {
  const n = new Map<string, number>();
  for (const r of recs) for (const t of r.tags) n.set(t, (n.get(t) ?? 0) + 1);
  return [...n.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}

/**
 * A YouTube video's title from YouTube's public oEmbed address, or "" when it can't be had (offline,
 * blocked, a private video). The form then asks the student to type it.
 */
export async function fetchTitle(videoId: string, fetchImpl: typeof fetch = (...a) => fetch(...a)): Promise<string> {
  try {
    const res = await fetchImpl(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl(videoId))}`);
    if (!res.ok) return "";
    const data = (await res.json()) as { title?: unknown };
    return typeof data.title === "string" ? cleanTitle(data.title) : "";
  } catch {
    return "";
  }
}
