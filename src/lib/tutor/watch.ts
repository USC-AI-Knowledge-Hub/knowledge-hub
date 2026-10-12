/**
 * Videos to watch next under a tutor answer: full courses (playlists), editors' picks and
 * talks for the lessons the answer drew on, most relevant lesson first.
 */
import { coursePlayable } from "../../components/CourseCard";
import type { Playable } from "../../components/Player";
import { talkPlayable, TALK_LABEL } from "../../components/TalkCard";
import { coursesFor } from "../../data/courses";
import { moduleById } from "../../data/learn";
import { talksFor } from "../../data/talks";
import type { CourseStatus, Video } from "../../data/types";
import { hoursLabel, live, liveTalk } from "../courses";
import { minutesLabel } from "../format";
import { searchTools, tokenize } from "../siteSearch";

export interface WatchItem {
  key: string;
  kind: "course" | "pick" | "talk" | "video";
  title: string;
  /** Video ID for the thumbnail, if there is one. */
  thumb?: string;
  /** "Playlist · 12 lessons", "Editors' pick · 18 min", "Talk · TED". */
  meta: string;
  playable: Playable;
}

const stem = (w: string) => (w.length <= 3 ? w : w.replace(/(ings?|ed|es|s)$/, "").replace(/e$/, ""));

/**
 * Videos from the daily library that fit what was asked, when the lessons don't cover it ("how do I
 * generate a video?" has no lesson, but the library has tutorials for the tools that do it). A video fits when
 * it's tagged with a tool the question points to, or when its title says what was asked. `toolId` is the
 * best-matching tool, for a "more videos" link.
 */
export function libraryFor(ask: string, videos: Video[], limit = 3): { items: WatchItem[]; toolId?: string; named: boolean } {
  const hits = searchTools(ask).slice(0, 4);
  const tools = new Map(hits.filter((h) => h.score >= 14).map((h, i) => [h.tool.id, i === 0 ? 14 : 10] as const));
  const terms = tokenize(ask).map(stem).filter((t) => t.length > 2);
  const scored = videos
    .map((v) => {
      const text = `${v.title} ${v.summary ?? ""}`.toLowerCase();
      const words = terms.filter((t) => text.includes(t)).length;
      const tool = Math.max(0, ...v.tools.map((t) => tools.get(t) ?? 0));
      return { v, score: tool + words * 4 };
    })
    .filter((x) => x.score >= 10)
    .sort((a, b) => b.score - a.score || b.v.score - a.v.score)
    .slice(0, limit);
  const items = scored.map(({ v }) => ({
    key: `l:${v.id}`,
    kind: "video" as const,
    title: v.title,
    thumb: v.id,
    meta: `Video library · ${v.duration ? minutesLabel(Math.max(1, Math.round(v.duration / 60))) + " · " : ""}${v.channel}`,
    playable: v,
  }));
  return { items, toolId: hits[0] && hits[0].score >= 14 ? hits[0].tool.id : undefined, named: (hits[0]?.score ?? 0) >= 40 };
}

/** Lessons' videos plus, when `ask` is given, library videos that fit the question. A tool named in the question leads. */
export function watchFor(modules: string[], status: CourseStatus | null, limit = 6, library?: { ask: string; videos: Video[] }): WatchItem[] {
  const lessons = watchLessons(modules, status, limit);
  if (!library) return lessons;
  const lib = libraryFor(library.ask, library.videos).items;
  if (!lib.length) return lessons;
  const named = libraryFor(library.ask, library.videos).named;
  const room = Math.max(limit - lib.length, 0);
  return (named ? [...lib, ...lessons.slice(0, room)] : [...lessons.slice(0, room), ...lib]).slice(0, limit);
}

function watchLessons(modules: string[], status: CourseStatus | null, limit: number): WatchItem[] {
  const out: WatchItem[] = [];
  const seen = new Set<string>();
  const add = (x: WatchItem) => {
    if (!seen.has(x.key)) (seen.add(x.key), out.push(x));
  };
  for (const id of modules) {
    const m = moduleById.get(id);
    if (!m) continue;
    const courses = coursesFor(id)
      .map((c) => live(c, status))
      .filter((c) => c.available)
      .sort((a, b) => a.hours - b.hours);
    const picks = m.curated.filter((c) => status?.curated[c.id]?.ok ?? true);
    const talks = talksFor(id)
      .map((t) => liveTalk(t, status))
      .filter((t) => t.available);
    // Interleave so one answer shows a mix: a course, a short pick, a talk, then the next of each.
    for (let i = 0; i < 3; i++) {
      const c = courses[i];
      if (c)
        add({
          key: `c:${c.id}`,
          kind: "course",
          title: c.title,
          thumb: c.cover ?? c.video,
          meta: c.playlist ? `Playlist · ${c.lessons} lessons, ${hoursLabel(c.hours)}` : `Course · ${hoursLabel(c.hours)}`,
          playable: coursePlayable(c),
        });
      const p = picks[i];
      if (p)
        add({
          key: `v:${p.id}`,
          kind: "pick",
          title: p.title,
          thumb: p.id,
          meta: `Editors' pick · ${minutesLabel(p.minutes)}`,
          playable: { id: p.id, title: p.title, channel: p.channel },
        });
      const t = talks[i];
      if (t)
        add({
          key: `t:${t.id}`,
          kind: "talk",
          title: t.title,
          thumb: t.video,
          meta: `${TALK_LABEL[t.kind]} · ${t.channel}`,
          playable: talkPlayable(t),
        });
    }
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}
