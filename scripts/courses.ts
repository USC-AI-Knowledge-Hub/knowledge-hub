/**
 * Checks every course in src/data/courses.ts and every editors' pick in
 * src/data/learn.ts against YouTube.
 *
 *   npm run courses                   # check, then write public/data/courses.json
 *   npm run courses -- --check        # check only, write nothing
 *   npm run courses -- --strict       # exit 1 if anything is missing or on the wrong channel
 *
 * With YOUTUBE_API_KEY it uses the Data API (about 3 quota units per playlist)
 * and records live lesson counts, total length and a cover image. Without a
 * key it uses YouTube's public oEmbed endpoint, which confirms the video or
 * playlist exists, can be embedded, and belongs to the expected channel.
 */
import { appendFileSync, writeFileSync } from "node:fs";
import { courses } from "../src/data/courses";
import { modules } from "../src/data/learn";
import type { CourseCheck, CourseStatus } from "../src/data/types";
import { parseIsoDuration } from "./pipeline/duration";

const OUT = process.env.COURSES_OUT ?? new URL("../public/data/courses.json", import.meta.url);
const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const strict = args.includes("--strict");
const key = process.env.YOUTUBE_API_KEY;
const API = "https://www.googleapis.com/youtube/v3";

interface Target {
  kind: "playlist" | "video";
  id: string;
  channel: string;
}

const norm = (s = "") => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const watchUrl = (t: Target) =>
  t.kind === "playlist" ? `https://www.youtube.com/playlist?list=${t.id}` : `https://www.youtube.com/watch?v=${t.id}`;

async function fetchRetry(url: string | URL): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status < 500 || attempt >= 2) return res;
    } catch (e) {
      if (attempt >= 2) throw e;
    }
    await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
  }
}

async function api<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", key!);
  const res = await fetchRetry(url);
  if (!res.ok) throw new Error(`YouTube ${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

function channelProblem(expected: string, actual?: string): string | undefined {
  if (!actual) return undefined;
  return norm(actual) === norm(expected) ? undefined : `on channel “${actual}”, expected “${expected}”`;
}

async function viaOembed(t: Target): Promise<CourseCheck> {
  const res = await fetchRetry(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watchUrl(t))}`);
  if (res.status === 401 || res.status === 403) return { ok: false, problem: "embedding is disabled" };
  if (!res.ok) return { ok: false, problem: `not found (HTTP ${res.status})` };
  const data = (await res.json()) as { title?: string; author_name?: string };
  const problem = channelProblem(t.channel, data.author_name);
  return { ok: !problem, title: data.title, channel: data.author_name, problem };
}

interface VideoItem {
  id: string;
  snippet: { title: string; channelTitle: string };
  contentDetails: { duration: string };
  status: { embeddable?: boolean; privacyStatus?: string };
}

async function videosById(ids: string[]): Promise<Map<string, VideoItem>> {
  const out = new Map<string, VideoItem>();
  for (let i = 0; i < ids.length; i += 50) {
    const data = await api<{ items: VideoItem[] }>("videos", {
      part: "snippet,contentDetails,status",
      id: ids.slice(i, i + 50).join(","),
      maxResults: "50",
    });
    for (const v of data.items) out.set(v.id, v);
  }
  return out;
}

async function playlistViaApi(t: Target): Promise<CourseCheck> {
  const meta = await api<{ items: { snippet: { title: string; channelTitle: string }; contentDetails: { itemCount: number } }[] }>(
    "playlists",
    { part: "snippet,contentDetails", id: t.id },
  );
  const p = meta.items[0];
  if (!p) return { ok: false, problem: "playlist not found or private" };
  const ids: string[] = [];
  let pageToken = "";
  do {
    const page = await api<{ items: { contentDetails: { videoId: string } }[]; nextPageToken?: string }>("playlistItems", {
      part: "contentDetails",
      playlistId: t.id,
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });
    ids.push(...page.items.map((i) => i.contentDetails.videoId));
    pageToken = page.nextPageToken ?? "";
  } while (pageToken && ids.length < 500);
  const videos = await videosById(ids);
  const playable = ids.map((id) => videos.get(id)).filter((v): v is VideoItem => Boolean(v && v.status.privacyStatus === "public"));
  const problem = channelProblem(t.channel, p.snippet.channelTitle) ?? (playable.length ? undefined : "no public videos");
  return {
    ok: !problem,
    title: p.snippet.title,
    channel: p.snippet.channelTitle,
    lessons: playable.length,
    seconds: playable.reduce((s, v) => s + parseIsoDuration(v.contentDetails.duration), 0),
    cover: playable[0]?.id,
    problem,
  };
}

function videoCheck(t: Target, v: VideoItem | undefined): CourseCheck {
  if (!v || v.status.privacyStatus !== "public") return { ok: false, problem: "video not found or private" };
  if (v.status.embeddable === false) return { ok: false, title: v.snippet.title, channel: v.snippet.channelTitle, problem: "embedding is disabled" };
  const problem = channelProblem(t.channel, v.snippet.channelTitle);
  return {
    ok: !problem,
    title: v.snippet.title,
    channel: v.snippet.channelTitle,
    lessons: 1,
    seconds: parseIsoDuration(v.contentDetails.duration),
    cover: v.id,
    problem,
  };
}

async function run() {
  const courseTargets = new Map<string, Target>(
    courses.map((c) => [c.id, { kind: c.playlist ? "playlist" : "video", id: (c.playlist ?? c.video)!, channel: c.channel }]),
  );
  const curatedTargets = new Map<string, Target>();
  for (const m of modules) for (const v of m.curated) curatedTargets.set(v.id, { kind: "video", id: v.id, channel: v.channel });
  // Cover images are checked too, so a thumbnail never 404s.
  const covers = courses.filter((c) => c.cover && c.cover !== c.video).map((c) => c.cover!);

  const status: CourseStatus = { generatedAt: new Date().toISOString(), via: key ? "api" : "oembed", courses: {}, curated: {} };
  const coverProblems: string[] = [];

  if (key) {
    const singleIds = [
      ...[...courseTargets.values()].filter((t) => t.kind === "video").map((t) => t.id),
      ...curatedTargets.keys(),
      ...covers,
    ];
    const videos = await videosById([...new Set(singleIds)]);
    for (const [id, t] of courseTargets) {
      status.courses[id] = t.kind === "playlist" ? await playlistViaApi(t) : videoCheck(t, videos.get(t.id));
    }
    for (const [id, t] of curatedTargets) status.curated[id] = videoCheck(t, videos.get(id));
    for (const id of covers) if (!videos.has(id)) coverProblems.push(id);
  } else {
    for (const [id, t] of courseTargets) status.courses[id] = await viaOembed(t);
    for (const [id, t] of curatedTargets) status.curated[id] = await viaOembed(t);
    for (const id of covers) {
      const res = await fetchRetry(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
      if (!res.ok && res.status !== 401) coverProblems.push(id);
    }
  }

  // Report.
  const rows: string[] = [];
  const failures: string[] = [];
  const line = (label: string, c: CourseCheck) => {
    const size = c.lessons ? `${c.lessons} lessons, ${Math.round((c.seconds ?? 0) / 360) / 10} h` : "";
    rows.push(`| ${c.ok ? "✅" : "❌"} | ${label} | ${c.channel ?? ""} | ${size} | ${c.problem ?? ""} |`);
    if (!c.ok) failures.push(`${label}: ${c.problem}`);
  };
  for (const c of courses) line(c.title, status.courses[c.id]);
  for (const m of modules) for (const v of m.curated) line(`${v.title} (pick in ${m.id})`, status.curated[v.id]);
  for (const id of coverProblems) {
    rows.push(`| ❌ | cover ${id} | | | cover video not found |`);
    failures.push(`cover ${id}: not found`);
  }

  const summary = [
    `### Course check (${status.via})`,
    "",
    `${Object.keys(status.courses).length} courses and ${curatedTargets.size} editors' picks checked, ${failures.length} problem${failures.length === 1 ? "" : "s"}.`,
    "",
    "| | Title | Channel | Size | Problem |",
    "|---|---|---|---|---|",
    ...rows,
  ].join("\n");
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");

  if (!checkOnly) writeFileSync(OUT, JSON.stringify(status, null, 1) + "\n");
  if (strict && failures.length) {
    console.error(`\n${failures.length} problem(s):\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
