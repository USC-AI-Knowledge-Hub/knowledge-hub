import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { Bars } from "../components/Level";
import { CourseCard, coursePlayable } from "../components/CourseCard";
import { usePlayer } from "../components/Player";
import { Icon } from "../components/Icon";
import { Segmented } from "../components/Segmented";
import { courseById, courses, SOURCE_LABEL } from "../data/courses";
import { modules } from "../data/learn";
import { DIFFICULTIES, DIFFICULTY_LABEL, type CourseSource, type Difficulty } from "../data/types";
import { live, useCourseStatus } from "../lib/courses";

type LevelFilter = "all" | Difficulty;
const SOURCES: CourseSource[] = ["university", "maker", "educator"];
const SOURCE_BLURB: Record<CourseSource, string> = {
  university: "Recorded lectures from Harvard, MIT, Stanford and Berkeley. The deepest material here.",
  maker: "Courses from the companies behind the tools. Practical, and current.",
  educator: "Teachers with a track record of explaining this well.",
};
const RANK: Record<Difficulty, number> = { beginner: 0, intermediate: 1, advanced: 2 };

export function Courses() {
  const status = useCourseStatus();
  const [params, setParams] = useSearchParams();
  const level = (params.get("level") as LevelFilter) || "all";
  const topic = params.get("topic") ?? "";

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true, preventScrollReset: true });
  };

  // Search and the tutor link to /learn/courses?course=<id>: open that course straight away.
  const play = usePlayer();
  const linked = params.get("course");
  useEffect(() => {
    const c = linked ? courseById.get(linked) : undefined;
    if (!c) return;
    play(coursePlayable(live(c, status)));
    const next = new URLSearchParams(params);
    next.delete("course");
    setParams(next, { replace: true });
  }, [linked]); // eslint-disable-line react-hooks/exhaustive-deps

  const all = useMemo(() => courses.map((c) => live(c, status)).filter((c) => c.available), [status]);
  const shown = all
    .filter((c) => (level === "all" || c.difficulty === level) && (!topic || c.modules.includes(topic)))
    .sort((a, b) => RANK[a.difficulty] - RANK[b.difficulty] || a.hours - b.hours);
  const totalHours = Math.round(all.reduce((s, c) => s + c.hours, 0));
  const topics = modules.filter((m) => all.some((c) => c.modules.includes(m.id)));

  return (
    <>
      <header className="page-head">
        <Link to="/learn" className="crumb">
          <Icon name="arrow_back" />
          Learn
        </Link>
        <h1 className="display-s">Full courses</h1>
        <p className="body-l muted measure">
          {all.length} complete courses, about {totalHours} hours in all, free on YouTube. Each lesson in Learn points to the ones that go
          deeper on it. Every course is checked daily so dead links drop off.
        </p>
      </header>

      <div className="filters" role="region" aria-label="Filters">
        <div className="filters-row">
          <Segmented<LevelFilter>
            label="Difficulty"
            value={level}
            onChange={(v) => set("level", v === "all" ? null : v)}
            options={[
              { value: "all", label: "All levels" },
              ...DIFFICULTIES.map((d) => ({
                value: d,
                label: (
                  <>
                    <Bars level={d} />
                    {DIFFICULTY_LABEL[d]}
                  </>
                ),
              })),
            ]}
          />
        </div>
        <div className="chip-row scroll" aria-label="Topic">
          <button type="button" className="chip state" aria-pressed={!topic} onClick={() => set("topic", null)}>
            {!topic && <Icon name="check" />}
            All topics
          </button>
          {topics.map((m) => (
            <button key={m.id} type="button" className="chip state" aria-pressed={topic === m.id} onClick={() => set("topic", topic === m.id ? null : m.id)}>
              {topic === m.id && <Icon name="check" />}
              {m.title}
            </button>
          ))}
        </div>
      </div>

      {!shown.length && (
        <div className="empty">
          <Icon name="filter_alt_off" size={32} />
          <p className="title-m">No courses match these filters</p>
          <button type="button" className="btn tonal sm state" onClick={() => setParams({}, { replace: true })}>
            Clear filters
          </button>
        </div>
      )}

      {SOURCES.map((src) => {
        const list = shown.filter((c) => c.source === src);
        if (!list.length) return null;
        return (
          <section key={src} className="video-group" aria-labelledby={`src-${src}`}>
            <h2 id={`src-${src}`} className="title-l group-h">
              {SOURCE_LABEL[src]}
              <span className="label-m muted">{list.length}</span>
            </h2>
            <p className="body-m muted course-src-blurb">{SOURCE_BLURB[src]}</p>
            <div className="grid cols-videos">
              {list.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
