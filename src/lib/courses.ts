import { useEffect, useState } from "react";
import type { Course, CourseStatus } from "../data/types";

let cached: Promise<CourseStatus | null> | null = null;

function load(): Promise<CourseStatus | null> {
  // The status file is optional: without it, courses show the catalog's estimates.
  const day = new Date().toISOString().slice(0, 10);
  cached ??= fetch(`${import.meta.env.BASE_URL}data/courses.json?d=${day}`)
    .then((r) => (r.ok ? (r.json() as Promise<CourseStatus>) : null))
    .catch(() => null);
  return cached;
}

/** Live results from the last course check, or null until (or unless) it loads. */
export function useCourseStatus(): CourseStatus | null {
  const [status, setStatus] = useState<CourseStatus | null>(null);
  useEffect(() => {
    let live = true;
    load().then((s) => live && setStatus(s));
    return () => {
      live = false;
    };
  }, []);
  return status;
}

export interface LiveCourse extends Course {
  /** False when the last check found the course gone; hide it. */
  available: boolean;
}

/** Merges the catalog entry with the latest check. Unchecked courses count as available. */
export function live(c: Course, status: CourseStatus | null): LiveCourse {
  const check = status?.courses[c.id];
  // A rolling playlist's live totals span every year it has run; keep the one-year estimate.
  const counts = check?.ok && !c.rolling;
  return {
    ...c,
    available: check?.ok ?? true,
    lessons: counts && check.lessons ? check.lessons : c.lessons,
    hours: counts && check.seconds ? Math.round(check.seconds / 360) / 10 : c.hours,
    cover: c.cover ?? (check?.ok ? check.cover : undefined) ?? c.video,
  };
}

export const hoursLabel = (h: number) => (h < 1 ? `${Math.round(h * 60)} min` : `${h % 1 ? h.toFixed(1) : h} h`);
