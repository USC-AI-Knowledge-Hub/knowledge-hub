import { useCallback, useSyncExternalStore } from "react";

/** Completed learning modules, kept in this browser only. */
const KEY = "kh-progress";
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let snapshot = read();

function write(next: string[]) {
  snapshot = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* Private mode or blocked storage: progress lasts for this visit only. */
  }
  listeners.forEach((l) => l());
}

export function useProgress() {
  const done = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot,
  );
  const toggle = useCallback((id: string) => {
    write(snapshot.includes(id) ? snapshot.filter((x) => x !== id) : [...snapshot, id]);
  }, []);
  const isDone = useCallback((id: string) => done.includes(id), [done]);
  return { done, toggle, isDone };
}
