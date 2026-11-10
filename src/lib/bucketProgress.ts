import { useCallback, useSyncExternalStore } from "react";
import { BUCKETS, BUCKET_COURSES, type Bucket } from "../data/buckets";

/**
 * Which bucket a visitor chose and which courses they've ticked off, kept in this browser only.
 * Ids that are no longer in the course list are ignored, so removing a course never breaks the page.
 */
const KEY = "kh-buckets";
const listeners = new Set<() => void>();

export interface BucketState {
  bucket: Bucket["id"] | null;
  done: string[];
}

const valid = new Set(BUCKET_COURSES.map((c) => c.id));

export function parse(raw: string | null): BucketState {
  try {
    const v = raw ? (JSON.parse(raw) as Partial<BucketState>) : {};
    const bucket = BUCKETS.some((b) => b.id === v.bucket) ? (v.bucket as Bucket["id"]) : null;
    const done = Array.isArray(v.done) ? [...new Set(v.done.filter((id): id is string => typeof id === "string" && valid.has(id)))] : [];
    return { bucket, done };
  } catch {
    return { bucket: null, done: [] };
  }
}

const read = (): BucketState => {
  try {
    return parse(localStorage.getItem(KEY));
  } catch {
    return { bucket: null, done: [] };
  }
};

let snapshot = read();

function write(next: BucketState) {
  snapshot = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* Private mode or blocked storage: it lasts for this visit only. */
  }
  listeners.forEach((l) => l());
}

export function useBucketProgress() {
  const state = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot,
  );
  const setBucket = useCallback((bucket: Bucket["id"] | null) => write({ ...snapshot, bucket }), []);
  const toggle = useCallback((id: string) => write({ ...snapshot, done: snapshot.done.includes(id) ? snapshot.done.filter((x) => x !== id) : [...snapshot.done, id] }), []);
  return { ...state, setBucket, toggle, isDone: (id: string) => state.done.includes(id) };
}
