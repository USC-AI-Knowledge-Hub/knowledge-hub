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
import type { CourseStatus } from "../../data/types";
import { hoursLabel, live, liveTalk } from "../courses";
import { minutesLabel } from "../format";

export interface WatchItem {
  key: string;
  kind: "course" | "pick" | "talk";
  title: string;
  /** Video ID for the thumbnail, if there is one. */
  thumb?: string;
  /** "Playlist · 12 lessons", "Editors' pick · 18 min", "Talk · TED". */
  meta: string;
  playable: Playable;
}

export function watchFor(modules: string[], status: CourseStatus | null, limit = 6): WatchItem[] {
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
