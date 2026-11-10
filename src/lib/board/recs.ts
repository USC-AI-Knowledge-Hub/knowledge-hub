/**
 * Video picks: students recommend a video in one line, and vote on each other's picks.
 *
 * Picks are ordinary posts on the board database (board "video-recs"), so they need no new tables:
 * the post's topic says where the video came from, and its body holds the headline, the video's
 * address and an optional note, one after another. The picture is the video's own YouTube thumbnail,
 * built from a checked video id, so nobody can make the page load an image from anywhere else.
 * A vote is the board's 👍 reaction: one per browser per pick, and the database enforces it.
 */
import { NAME_MAX, clean } from "./rules";
import type { Post } from "./store";

export const REC_BOARD = "video-recs";
export const VOTE = "👍";
export const HEADLINE_MAX = 90;
export const WHY_MAX = 400;

export type RecSource = "hub" | "found";
export const SOURCES: readonly {
  id: RecSource;
  label: string;
  long: string;
}[] = [
  { id: "hub", label: "From the Hub", long: "From the Hub's video library" },
  { id: "found", label: "Found by students", long: "Found it myself" },
];

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

export interface RecDraft {
  headline: string;
  videoId: string;
  why: string;
}

/** The post body for a pick: headline, then the video's address, then the note if there is one. */
export const encodeRec = (r: RecDraft) => [clean(r.headline).replace(/\s+/g, " "), watchUrl(r.videoId), ...(clean(r.why) ? ["", clean(r.why)] : [])].join("\n");

/** A pick from a post body, or null when the body isn't one (then the page leaves it out). */
export function decodeRec(body: string): RecDraft | null {
  const [headline = "", link = "", ...rest] = body.split("\n");
  const videoId = youtubeId(link);
  const h = headline.trim();
  if (!h || !videoId) return null;
  // The database only caps the whole body, so trim here too in case a post skipped the form.
  return {
    headline: h.slice(0, HEADLINE_MAX),
    videoId,
    why: rest.join("\n").trim().slice(0, WHY_MAX),
  };
}

/** Why a pick can't be sent, or "" if it can. */
export function recProblem(name: string, link: string, headline: string, why: string): string {
  const n = clean(name);
  if (!n) return "Add your name so people know whose pick it is.";
  if (n.length > NAME_MAX) return `Use a name of ${NAME_MAX} characters or fewer.`;
  if (/(https?:\/\/|www\.)/i.test(n)) return "Names can't contain links.";
  if (!link.trim()) return "Paste a YouTube link, or pick a video from the Hub's library.";
  if (!youtubeId(link)) return "That isn't a YouTube video link. Copy it from the Share button under the video.";
  const h = clean(headline);
  if (!h) return "Write a one-line headline: why should someone watch it?";
  if (h.length > HEADLINE_MAX) return `Keep the headline to ${HEADLINE_MAX} characters. It's ${h.length - HEADLINE_MAX} over.`;
  if (/(https?:\/\/|www\.)/i.test(h)) return "Put the link in the video box, not the headline.";
  const w = clean(why);
  if (w.length > WHY_MAX) return `Keep the note to ${WHY_MAX} characters. It's ${w.length - WHY_MAX} over.`;
  if (/(https?:\/\/|www\.)/i.test(w)) return "Leave links out of the note. The video link is enough.";
  return "";
}

export interface Rec extends RecDraft {
  id: string;
  name: string;
  source: RecSource;
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
    if (p.parentId || p.deleted || (p.topic !== "hub" && p.topic !== "found")) continue;
    const r = decodeRec(p.body);
    if (r)
      out.push({
        ...r,
        id: p.id,
        name: p.name,
        source: p.topic,
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
