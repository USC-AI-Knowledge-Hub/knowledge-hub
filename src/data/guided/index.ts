/**
 * Every guided lesson, keyed by module ID. Each file in ./lessons exports one
 * GuidedLesson; they're picked up automatically, so adding a lesson is just
 * adding a file.
 */
import type { GuidedLesson } from "./types";

const files = import.meta.glob<Record<string, GuidedLesson>>("./lessons/*.ts", { eager: true });

const LESSONS: GuidedLesson[] = Object.values(files)
  .flatMap((mod) => Object.values(mod))
  .filter((l): l is GuidedLesson => !!l && typeof l === "object" && "module" in l && "sections" in l)
  .sort((a, b) => a.module.localeCompare(b.module));

export const guidedLessons = LESSONS;
export const lessonByModule = new Map(LESSONS.map((l) => [l.module, l]));
