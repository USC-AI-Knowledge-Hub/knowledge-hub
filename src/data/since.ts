/**
 * The oldest content the Hub shows: library videos, trends, talks and podcasts, and the editors' picks in
 * lessons must be published on or after this date. The daily run enforces it (scripts/pipeline) and the
 * site checks it again where editors pick videos by hand. Move it forward to keep the Hub current.
 */
export const CONTENT_SINCE = "2026-01-01";

/** Whether a publish date (ISO string) is recent enough to show. Unknown dates pass. */
export const recentEnough = (publishedAt: string | undefined | null) => !publishedAt || publishedAt.slice(0, 10) >= CONTENT_SINCE;
