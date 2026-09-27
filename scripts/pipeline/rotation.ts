/**
 * Picks today's search queries. When there are more queries than the daily
 * budget, it takes a window that advances each day, so every query still runs
 * every few days and none is starved.
 */
export function todaysQueries(queries: string[], now: Date, max: number): string[] {
  if (queries.length <= max) return queries;
  const day = Math.floor(now.getTime() / 86_400_000);
  const start = (day * max) % queries.length;
  return Array.from({ length: max }, (_, i) => queries[(start + i) % queries.length]);
}
