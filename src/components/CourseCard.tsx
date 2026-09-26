import { useState } from "react";
import type { LiveCourse } from "../lib/courses";
import { hoursLabel } from "../lib/courses";
import { thumb } from "../lib/format";
import { SHAPES, shapeFor } from "../lib/shapes";
import { Icon } from "./Icon";
import { Level } from "./Level";
import { usePlayer } from "./Player";

function Cover({ course }: { course: LiveCourse }) {
  const [broken, setBroken] = useState(false);
  if (course.cover && !broken) {
    return <img src={thumb(course.cover)} alt="" loading="lazy" width={480} height={360} onError={() => setBroken(true)} />;
  }
  // No thumbnail: a shaped monogram of the org, like the tool marks.
  return (
    <span className="ccard-art" aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <path d={SHAPES[shapeFor(course.id)]} />
      </svg>
      <span className="ccard-art-org">{course.org}</span>
    </span>
  );
}

/** A full course: a playlist or one long video. Opens in the player. */
export function CourseCard({ course, compact }: { course: LiveCourse; compact?: boolean }) {
  const play = usePlayer();
  const isPlaylist = Boolean(course.playlist);
  const open = () =>
    play({
      id: course.video ?? course.cover ?? "",
      list: course.playlist,
      title: course.title,
      channel: course.channel,
      difficulty: course.difficulty,
      summary: course.summary,
      audience: course.audience,
      lessons: course.lessons,
      hoursLabel: hoursLabel(course.hours),
    });

  return (
    <article className={`ccard ${isPlaylist ? "is-playlist" : ""} ${compact ? "compact" : ""}`}>
      <button type="button" className="ccard-hit" onClick={open} aria-label={`Start course: ${course.title}`}>
        <span className="ccard-thumb">
          <Cover course={course} />
          <span className="ccard-org label-m">{course.org}</span>
          <span className="ccard-count label-m">
            <Icon name={isPlaylist ? "playlist_play" : "smart_display"} size={18} />
            {isPlaylist ? `${course.lessons} lessons` : "One video"}
          </span>
        </span>
      </button>
      <div className="ccard-body">
        <div className="vcard-tags">
          <Level level={course.difficulty} />
          <span className="label-m muted">{hoursLabel(course.hours)}</span>
        </div>
        <h3 className="title-m vcard-title">
          <button type="button" onClick={open}>
            {course.title}
          </button>
        </h3>
        {!compact && <p className="body-m vcard-summary ccard-summary">{course.summary}</p>}
        <p className="body-s muted">{course.channel}</p>
      </div>
    </article>
  );
}
