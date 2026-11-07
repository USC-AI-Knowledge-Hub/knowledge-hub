/**
 * What search engines and link previews should know about each page: title, description,
 * canonical address, readable text and structured data. Everything is built from the same data
 * the pages use, so it can't drift from what visitors see.
 *
 * This file imports data only (no React, no browser), so the build can run it in Node to write
 * a real HTML page per route (scripts/prerender.ts), and the app runs it in the browser to keep
 * the tab title and tags right while someone clicks around (useSeo).
 */
import { STYLE_CHECKED, USES } from "../data/aiUse";
import discoveredFile from "../../public/data/discovered.json";
import { PROMPTS, PROMPT_CATEGORIES } from "../data/prompts";
import { newItems } from "./whatsNew";
import { BUCKETS, coursesIn } from "../data/buckets";
import { PAIRS, differences, pairSlug, parsePair, summary, textRows, toolsFor } from "../data/compare";
import { courses } from "../data/courses";
import { faqs } from "../data/faq";
import { guidedPathById, guidedPaths, pathModules } from "../data/guided/paths";
import { lessonByModule } from "../data/guided";
import { moduleById, modules, pathById, paths } from "../data/learn";
import { tools, toolById } from "../data/tools";

/** The address the site is served from. Canonical links always point here. */
export const SITE_URL = "https://studentslearningai.com";
export const SITE_NAME = "USC AI Knowledge Hub";
export const SOCIAL_IMAGE = "/og.png";

export type Block = { kind: "p" | "h2" | "h3"; text: string } | { kind: "ul" | "ol"; items: string[] };

export interface PageMeta {
  /** The address search engines should list, without the site address or base path. */
  path: string;
  title: string;
  description: string;
  /** The page's h1. */
  heading: string;
  type: "website" | "article";
  noindex?: boolean;
  /** The page's text, as plain HTML-free blocks. */
  content: Block[];
  /** Pages to link to, so crawlers can follow them without running the app. */
  links: { to: string; label: string }[];
  jsonLd: object[];
}

const ORG = { "@type": "Organization", name: SITE_NAME, url: `${SITE_URL}/`, logo: `${SITE_URL}/favicon.png` };

/** Removes the Markdown the lesson text uses, leaving plain text. */
export function plain(md: string): string {
  return md
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1$2")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

/** Turns the lesson text's paragraphs, bullets and numbered steps into blocks. */
export function toBlocks(md: string): Block[] {
  const out: Block[] = [];
  for (const chunk of md.split(/\n{2,}/)) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    let para: string[] = [];
    let list: { kind: "ul" | "ol"; items: string[] } | null = null;
    const flush = () => {
      if (para.length) out.push({ kind: "p", text: plain(para.join(" ")) });
      if (list) out.push({ kind: list.kind, items: list.items });
      para = [];
      list = null;
    };
    for (const line of lines) {
      const bullet = line.match(/^[-•]\s+(.*)/);
      const step = line.match(/^\d+[.)]\s+(.*)/);
      if (bullet || step) {
        const kind = bullet ? "ul" : "ol";
        if (para.length || (list && list.kind !== kind)) flush();
        list ??= { kind, items: [] };
        list.items.push(plain((bullet ?? step)![1]));
      } else {
        if (list) flush();
        para.push(line);
      }
    }
    flush();
  }
  return out;
}

/** A description of at most `max` characters that ends on a whole word. */
export function clip(text: string, max = 158): string {
  const t = plain(text).replace(/\s+/g, " ");
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sentence = cut.match(/^(.*[.!?])\s/);
  if (sentence && sentence[1].length > max * 0.6) return sentence[1];
  return cut.replace(/\s+\S*$/, "").replace(/[,;:\s]+$/, "") + "…";
}

const minutesText = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`);
const isoMinutes = (m: number) => `PT${m}M`;
/**
 * GitHub Pages serves a folder's page only at its trailing-slash address (and redirects the other
 * form there), so that is the address we list, in the sitemap and in canonical links.
 */
const url = (path: string) => `${SITE_URL}${path === "/" ? "/" : `${path}/`}`;
const suffix = ` | ${SITE_NAME}`;

function breadcrumbs(trail: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: url(c.path) })),
  };
}

const HOME: Omit<PageMeta, "jsonLd"> = {
  path: "/",
  title: `${SITE_NAME}: learn how to use AI, for students and professors`,
  description:
    "Grow your AI knowledge with learning paths for students, professors and researchers, honest guides to AI tools, and a video library refreshed every morning.",
  heading: "Learn AI. Use AI. Understand what's next.",
  type: "website",
  content: [
    {
      kind: "p",
      text: "Short learning paths for students, professors and researchers, honest tool guides, and a video library that refreshes every morning, sorted by tool and by how much you already know.",
    },
    { kind: "h2", text: "Pick a path" },
    { kind: "ul", items: paths.map((p) => `${p.title} (${p.audience}): ${p.summary}`) },
    { kind: "h2", text: "Questions people ask about learning AI" },
    ...faqs.flatMap<Block>((f) => [
      { kind: "h3", text: f.q },
      { kind: "p", text: f.a },
    ]),
  ],
  links: [
    ...paths.map((p) => ({ to: `/learn/path/${p.id}`, label: `${p.title}: ${p.audience}` })),
    { to: "/learn", label: "All lessons" },
    { to: "/tools", label: "AI tool guides" },
    { to: "/watch", label: "AI video library" },
    { to: "/green", label: "Green AI" },
  ],
};

/** Search-friendly wording for each learning path, written for the people who would search for it. */
const PATH_SEO: Record<string, { title: string; description: string }> = {
  student: {
    title: "How to use AI as a student: a guided course",
    description:
      "A guided course for students: how AI works, how to prompt it, how to check its answers, and how to use it in your coursework within the rules.",
  },
  faculty: {
    title: "Learn AI as a professor: a guided course for faculty",
    description:
      "A guided course for professors and teaching staff: how AI works, teaching and assessment with AI, research workflows, and academic integrity. No coding needed.",
  },
  researcher: {
    title: "AI for researchers: a guided course",
    description:
      "A guided course for grad students and researchers: search and verify sources, analyze data, ground answers in your own documents, and disclose AI use properly.",
  },
  builder: {
    title: "Build with AI: a guided course",
    description:
      "A guided course for people who want to make things: coding with AI, answers grounded in your own data, agents and MCP, and shipping an automation.",
  },
};

function pathPage(id: string): PageMeta | null {
  const path = pathById.get(id);
  const course = guidedPathById.get(id);
  if (!path || !course) return null;
  const order = pathModules(course);
  const total = order.reduce((s, m) => s + (moduleById.get(m)?.minutes ?? 0), 0);
  const seo = PATH_SEO[id] ?? { title: `${path.title}: a guided course`, description: clip(path.summary) };
  return {
    path: `/learn/path/${id}`,
    title: seo.title + suffix,
    description: seo.description,
    heading: path.title,
    type: "website",
    content: [
      { kind: "p", text: `Guided course for ${path.audience.toLowerCase()}. ${order.length} lessons, about ${minutesText(total)}.` },
      { kind: "p", text: course.welcome },
      { kind: "h2", text: "By the end, you'll be able to" },
      { kind: "ul", items: course.outcomes },
      ...course.units.flatMap<Block>((u, i) => [
        { kind: "h2", text: `Unit ${i + 1}: ${u.title}` },
        { kind: "p", text: u.intro },
        { kind: "ul", items: u.modules.map((m) => `${moduleById.get(m)?.title}: ${moduleById.get(m)?.summary}`) },
      ]),
      { kind: "h2", text: `Capstone project: ${course.capstone.title}` },
      { kind: "p", text: course.capstone.brief },
    ],
    links: order.map((m) => ({ to: `/learn/path/${id}/${m}`, label: moduleById.get(m)?.title ?? m })),
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Course",
        name: seo.title,
        description: seo.description,
        provider: ORG,
        url: url(`/learn/path/${id}`),
        isAccessibleForFree: true,
        inLanguage: "en",
        timeRequired: isoMinutes(total),
        audience: { "@type": "Audience", audienceType: path.audience },
        hasCourseInstance: { "@type": "CourseInstance", courseMode: "online", courseWorkload: isoMinutes(total) },
      },
      breadcrumbs([
        { name: "Home", path: "/" },
        { name: "Learn", path: "/learn" },
        { name: path.title, path: `/learn/path/${id}` },
      ]),
    ],
  };
}

function lessonPage(moduleId: string, viaPath?: string): PageMeta | null {
  const m = moduleById.get(moduleId);
  const lesson = lessonByModule.get(moduleId);
  if (!m || !lesson) return null;
  const canonical = `/learn/lesson/${moduleId}`;
  const title = `${m.title}: guided lesson${suffix}`;
  const description = clip(`${m.summary} ${lesson.objectives[0]}`);
  return {
    path: canonical,
    title,
    description,
    heading: m.title,
    type: "article",
    content: [
      { kind: "p", text: `${m.summary} About ${minutesText(m.minutes)}, ${m.difficulty} level.` },
      { kind: "h2", text: "You'll be able to" },
      { kind: "ul", items: lesson.objectives },
      ...lesson.sections.flatMap<Block>((s) => [{ kind: "h2", text: s.heading }, ...toBlocks(s.body)]),
      { kind: "h2", text: lesson.example.title },
      ...toBlocks(lesson.example.body),
      { kind: "h2", text: "Try it" },
      { kind: "p", text: lesson.deliverable },
    ],
    links: [
      ...(viaPath ? [{ to: `/learn/path/${viaPath}`, label: pathById.get(viaPath)?.title ?? viaPath }] : []),
      { to: `/learn/${moduleId}`, label: `${m.title}: overview and videos` },
      { to: "/learn", label: "All lessons" },
    ],
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "LearningResource",
        name: m.title,
        description,
        url: url(canonical),
        teaches: lesson.objectives,
        timeRequired: isoMinutes(m.minutes),
        educationalLevel: m.difficulty,
        isAccessibleForFree: true,
        inLanguage: "en",
        provider: ORG,
      },
      breadcrumbs([
        { name: "Home", path: "/" },
        { name: "Learn", path: "/learn" },
        { name: m.title, path: canonical },
      ]),
    ],
  };
}

function modulePage(id: string): PageMeta | null {
  const m = moduleById.get(id);
  if (!m) return null;
  const path = `/learn/${id}`;
  return {
    path,
    title: m.title + suffix,
    description: clip(`${m.summary} ${plain(m.what)}`),
    heading: m.title,
    type: "article",
    content: [
      { kind: "p", text: m.summary },
      { kind: "h2", text: "What it is" },
      { kind: "p", text: plain(m.what) },
      { kind: "h2", text: "Why it matters" },
      { kind: "p", text: plain(m.why) },
      { kind: "h2", text: "Key ideas" },
      { kind: "ul", items: m.keyIdeas.map(plain) },
      { kind: "h2", text: `Try it: ${m.tryIt.title}` },
      { kind: "ol", items: m.tryIt.steps.map(plain) },
    ],
    links: [
      ...(lessonByModule.has(id) ? [{ to: `/learn/lesson/${id}`, label: `${m.title}: guided lesson` }] : []),
      ...m.tools.filter((t) => toolById.has(t)).map((t) => ({ to: `/tools/${t}`, label: toolById.get(t)!.name })),
      { to: "/learn", label: "All lessons" },
    ],
    jsonLd: [
      breadcrumbs([
        { name: "Home", path: "/" },
        { name: "Learn", path: "/learn" },
        { name: m.title, path },
      ]),
    ],
  };
}

function comparePage(slug: string): PageMeta | null {
  const ids = parsePair(slug);
  if (!ids) return null;
  const [a, b] = toolsFor(ids);
  if (!a || !b) return null;
  const path = `/tools/compare/${pairSlug(ids[0], ids[1])}`;
  return {
    path,
    title: `${a.name} vs ${b.name}: how they compare${suffix}`,
    description: clip(`${a.name} vs ${b.name}: cost, how hard each is to start, USC access, strengths, limits and privacy, side by side.`),
    heading: `${a.name} vs ${b.name}`,
    type: "article",
    content: [
      { kind: "p", text: summary([a, b]) },
      { kind: "h2", text: "At a glance" },
      { kind: "ul", items: differences([a, b]) },
      ...textRows([a, b]).flatMap<Block>((r) => [
        { kind: "h2", text: r.label },
        { kind: "ul", items: r.items },
      ]),
    ],
    links: [
      { to: `/tools/${a.id}`, label: `${a.name} review` },
      { to: `/tools/${b.id}`, label: `${b.name} review` },
      { to: "/tools/compare", label: "Compare other tools" },
    ],
    jsonLd: [
      breadcrumbs([
        { name: "Home", path: "/" },
        { name: "Tools", path: "/tools" },
        { name: "Compare", path: "/tools/compare" },
        { name: `${a.name} vs ${b.name}`, path },
      ]),
    ],
  };
}

function toolPage(id: string): PageMeta | null {
  const t = toolById.get(id);
  if (!t) return null;
  const path = `/tools/${id}`;
  return {
    path,
    title: `${t.name}: strengths, limits and privacy${suffix}`,
    description: clip(`${t.bestFor} Quick start, strengths, limits and privacy notes for students and professors.`),
    heading: t.name,
    type: "article",
    content: [
      { kind: "p", text: `${t.name}, from ${t.maker}. ${t.bestFor}` },
      { kind: "h2", text: "What it does well" },
      { kind: "ul", items: t.bestUses },
      { kind: "h2", text: "What it does poorly" },
      { kind: "ul", items: t.poorUses },
      { kind: "h2", text: "What makes it different" },
      { kind: "p", text: t.different },
      { kind: "h2", text: "Quick start" },
      { kind: "ol", items: t.quickStart },
      { kind: "h2", text: "Strengths and limits" },
      { kind: "ul", items: [...t.strengths.map((s) => `Strength: ${s}`), ...t.weaknesses.map((s) => `Limit: ${s}`)] },
      { kind: "h2", text: "Privacy" },
      { kind: "p", text: t.privacy },
      { kind: "h2", text: "Academic integrity" },
      { kind: "p", text: t.integrity },
    ],
    links: [{ to: "/tools", label: "All AI tools" }],
    jsonLd: [
      breadcrumbs([
        { name: "Home", path: "/" },
        { name: "Tools", path: "/tools" },
        { name: t.name, path },
      ]),
    ],
  };
}

const STATIC: Record<string, () => PageMeta> = {
  "/": () => ({ ...HOME, jsonLd: homeLd() }),
  "/learn": () => ({
    path: "/learn",
    title: `Learn AI: lessons and paths for every level${suffix}`,
    description:
      "Learn AI at your own pace. Each lesson answers three questions: what is it, why does it matter to me, and how do I use it. Follow a path or pick any lesson.",
    heading: "Learn AI at your own pace",
    type: "website",
    content: [
      { kind: "p", text: "Each lesson answers three questions: what is it, why does it matter to me, and how do I use it. Follow a path, or pick any lesson on its own." },
      { kind: "h2", text: "Learning paths" },
      { kind: "ul", items: paths.map((p) => `${p.title} (${p.audience}): ${p.summary}`) },
      { kind: "h2", text: "All lessons" },
      { kind: "ul", items: modules.map((m) => `${m.title}: ${m.summary}`) },
    ],
    links: [
      ...paths.map((p) => ({ to: `/learn/path/${p.id}`, label: p.title })),
      ...modules.map((m) => ({ to: `/learn/${m.id}`, label: m.title })),
      { to: "/learn/courses", label: "Full courses" },
    ],
    jsonLd: [breadcrumbs([{ name: "Home", path: "/" }, { name: "Learn", path: "/learn" }])],
  }),
  "/learn/courses": () => ({
    path: "/learn/courses",
    title: `Free full AI courses, checked daily${suffix}`,
    description: clip(`${courses.length} complete AI courses from the people who made them, free on YouTube, matched to our lessons. Every course is checked daily so dead links drop off.`),
    heading: "Full courses",
    type: "website",
    content: [
      { kind: "p", text: `${courses.length} complete courses, free on YouTube, from their original publishers. Each lesson in Learn points to the ones that go deeper on it.` },
      { kind: "ul", items: courses.map((c) => `${c.title} (${c.org})`) },
    ],
    links: [{ to: "/learn", label: "Learn" }],
    jsonLd: [breadcrumbs([{ name: "Home", path: "/" }, { name: "Learn", path: "/learn" }, { name: "Full courses", path: "/learn/courses" }])],
  }),
  "/tools": () => ({
    path: "/tools",
    title: `AI tool guides for students and professors${suffix}`,
    description: clip(
      `Every AI tool gets the same review: what it's best at, where it fails, and what it means for your privacy and your coursework. ${tools.length} tools, filterable by task.`,
    ),
    heading: "Find the right tool",
    type: "website",
    content: [
      { kind: "p", text: "Every tool gets the same review: what it's best at, where it fails, what it means for your privacy and your coursework." },
      { kind: "ul", items: tools.map((t) => `${t.name}: ${t.bestFor}`) },
    ],
    links: tools.map((t) => ({ to: `/tools/${t.id}`, label: t.name })),
    jsonLd: [breadcrumbs([{ name: "Home", path: "/" }, { name: "Tools", path: "/tools" }])],
  }),
  "/watch": () => ({
    path: "/watch",
    title: `AI video tutorials, refreshed every morning${suffix}`,
    description:
      "A library of AI video tutorials found and filtered every morning, sorted by tool and difficulty, plus the week's launches, research and talks.",
    heading: "Watch and learn",
    type: "website",
    content: [
      { kind: "p", text: "The library is rebuilt automatically every morning. Videos are filtered for quality, labelled by the tools they teach and their difficulty, and ranked for teaching value, not hype." },
    ],
    links: [{ to: "/about", label: "How the video library works" }],
    jsonLd: [breadcrumbs([{ name: "Home", path: "/" }, { name: "Watch", path: "/watch" }])],
  }),
  "/green": () => ({
    path: "/green",
    title: `Green AI: use AI with less energy${suffix}`,
    description:
      "How much electricity and water AI uses, and the everyday choices that cut it, like which model you pick and how you write a prompt.",
    heading: "Use AI well, and lightly.",
    type: "website",
    content: [
      {
        kind: "p",
        text: "AI runs on electricity and water. Much of what you can change comes down to everyday choices, like which model you pick and how you write a prompt. The same choices usually get you better answers, faster.",
      },
    ],
    links: [{ to: "/learn", label: "Learn" }],
    jsonLd: [breadcrumbs([{ name: "Home", path: "/" }, { name: "Green AI", path: "/green" }])],
  }),
  "/tools/compare": () => ({
    path: "/tools/compare",
    title: `Compare AI tools side by side${suffix}`,
    description: "Pick two or three AI tools and compare cost, how hard they are to start, USC access, strengths, limits, privacy and academic-integrity notes.",
    heading: "Compare AI tools",
    type: "website",
    content: [
      { kind: "p", text: "Pick up to three reviewed tools and see them side by side. Every row comes from our tool reviews, and each review shows when it was last checked." },
      { kind: "h2", text: "Popular comparisons" },
      { kind: "ul", items: PAIRS.map(([a, b]) => `${toolById.get(a)?.name} vs ${toolById.get(b)?.name}`) },
    ],
    links: [...PAIRS.map(([a, b]) => ({ to: `/tools/compare/${pairSlug(a, b)}`, label: `${toolById.get(a)?.name} vs ${toolById.get(b)?.name}` })), { to: "/tools", label: "All AI tools" }],
    jsonLd: [breadcrumbs([{ name: "Home", path: "/" }, { name: "Tools", path: "/tools" }, { name: "Compare", path: "/tools/compare" }])],
  }),
  "/new": () => {
    const items = newItems(discoveredFile.tools ?? [], tools, new Date().toISOString().slice(0, 10), 90, 25).filter((i) => i.confirmed);
    return {
      path: "/new",
      title: `What's new in AI tools${suffix}`,
      description: "New AI tools and models spotted by our daily run, and which tool reviews were updated lately, with an RSS feed.",
      heading: "What's new",
      type: "website",
      content: [
        { kind: "p", text: "AI tools change fast, so every review shows when it was last checked and a daily run looks for new tools. These changed in the last three months." },
        { kind: "h2", text: "Spotted and reviewed lately" },
        items.length ? { kind: "ul", items: items.map((i) => `${i.title} (${i.date})`) } : { kind: "p", text: "Nothing new in the last three months." },
      ],
      links: [
        { to: "/tools", label: "All AI tools" },
        { to: "/watch?tab=trends", label: "AI news videos" },
      ],
      jsonLd: [breadcrumbs([{ name: "Home", path: "/" }, { name: "What's new", path: "/new" }])],
    };
  },
  "/prompts": () => ({
    path: "/prompts",
    title: `Prompts that work: copyable AI prompts for students${suffix}`,
    description: "Copyable prompts for studying, writing, research, code, teaching and everyday work, each with what to check before you trust the answer.",
    heading: "Prompts that work",
    type: "website",
    content: [
      { kind: "p", text: "Good prompts say who the answer is for, what you want, what to avoid and what format to use. These starting points do that, and each says what to check before you trust the answer." },
      ...PROMPT_CATEGORIES.flatMap<Block>((c) => [
        { kind: "h2", text: c.label },
        { kind: "p", text: c.blurb },
        ...PROMPTS.filter((p) => p.category === c.id).flatMap<Block>((p) => [
          { kind: "h3", text: p.title },
          { kind: "p", text: p.when },
          { kind: "p", text: p.prompt },
          { kind: "p", text: `Check before you trust it: ${p.check}` },
        ]),
      ]),
    ],
    links: [
      { to: "/learn/prompting", label: "Prompting that works, the lesson" },
      { to: "/ai-use", label: "Using AI in coursework" },
      { to: "/tools", label: "AI tool guides" },
    ],
    jsonLd: [breadcrumbs([{ name: "Home", path: "/" }, { name: "Prompts that work", path: "/prompts" }])],
  }),
  "/ai-use": () => ({
    path: "/ai-use",
    title: `Using AI in coursework: rules, disclosure and citations${suffix}`,
    description: "What's usually fine to do with AI in a course, how to say you used it, how to cite it in APA, MLA and Chicago, and a syllabus policy builder for instructors.",
    heading: "Using AI in your coursework",
    type: "website",
    content: [
      { kind: "p", text: "Your instructor's rules decide what you can do with AI, and they differ between courses. This page helps you work out what's usually fine, write a short note saying how you used AI, and cite it in APA, MLA or Chicago. Instructors can build a draft syllabus statement." },
      { kind: "h2", text: "Can I use AI for this?" },
      { kind: "ul", items: USES.map((u) => `${u.label}: ${u.advice}`) },
      { kind: "h2", text: "Cite it" },
      { kind: "p", text: "APA changed its format for generative AI in September 2025: a specific chat is cited like a document, with a title and a link. MLA uses the prompt as the title and the tool as the container. Chicago uses a footnote." },
      { kind: "p", text: `Formats were last checked on ${STYLE_CHECKED}. Check the official style guide and your instructor's preference.` },
    ],
    links: [
      { to: "/learn/ethics-integrity", label: "Ethics and academic integrity" },
      { to: "/learn/limits", label: "What AI gets wrong" },
      { to: "/start", label: "Where to start" },
    ],
    jsonLd: [breadcrumbs([{ name: "Home", path: "/" }, { name: "Using AI in coursework", path: "/ai-use" }])],
  }),
  "/start": () => ({
    path: "/start",
    title: `Where to start with AI: find your level${suffix}`,
    description: "Answer four questions to find your AI starting point, then work through a short list of free courses from Google, OpenAI, Anthropic and more.",
    heading: "Where to start with AI",
    type: "website",
    content: [
      { kind: "p", text: "Three buckets take you from first steps to building with AI. Each has a short list of free courses and takes roughly 7 to 10 hours. A four-question self-rating tells you where to begin." },
      ...BUCKETS.flatMap<Block>((b) => [
        { kind: "h2", text: `Bucket ${b.id}: ${b.name}` },
        { kind: "p", text: `${b.who}. ${b.focus}.` },
        { kind: "ul", items: coursesIn(b.id).map((c) => `${c.title} (${c.provider})`) },
      ]),
    ],
    links: [
      { to: "/learn", label: "Learn" },
      { to: "/team", label: "AI Team discussion boards" },
      { to: "/tools", label: "AI tool guides" },
    ],
    jsonLd: [breadcrumbs([{ name: "Home", path: "/" }, { name: "Where to start", path: "/start" }])],
  }),
  "/team": () => ({
    path: "/team",
    title: `AI Team: discussion boards for every course${suffix}`,
    description: "A discussion board for each course in the three proficiency buckets, plus one for AI tools. Ask questions and share what you learn, no account needed.",
    heading: "AI Team",
    type: "website",
    content: [
      { kind: "p", text: "A board for each course in Foundations, Applied AI and Technical, and one general board for AI tools. Students add a name to post, reply and react, with no account. Posts are public." },
    ],
    links: [{ to: "/learn", label: "Learn" }],
    jsonLd: [breadcrumbs([{ name: "Home", path: "/" }, { name: "AI Team", path: "/team" }])],
  }),
  "/offline": () => ({
    path: "/offline",
    title: `Use AI without internet${suffix}`,
    description:
      "Save an AI model and this site to your device, bookmark it, and keep a private assistant and the lessons on a flight, in a dead zone or when campus Wi-Fi fails.",
    heading: "Use AI without internet",
    type: "website",
    content: [
      {
        kind: "p",
        text: "Save the site and an AI model to this device. Then open the bookmark offline and you still have a general-purpose assistant, the lessons and the lesson tutor. The model runs in your browser, so nothing you type leaves your device.",
      },
      { kind: "h2", text: "How to set it up" },
      {
        kind: "ol",
        items: [
          "Save the site to this device.",
          "Download an AI model.",
          "Ask the browser to protect the saved files from being cleared.",
          "Bookmark the page or install the site as an app.",
        ],
      },
    ],
    links: [
      { to: "/offline/assistant", label: "Offline assistant" },
      { to: "/learn", label: "Learn" },
    ],
    jsonLd: [breadcrumbs([{ name: "Home", path: "/" }, { name: "Use offline", path: "/offline" }])],
  }),
  "/offline/assistant": () => ({
    path: "/offline/assistant",
    title: `Offline AI assistant that runs on your device${suffix}`,
    description:
      "A private, general-purpose AI assistant that runs in your browser. Download a model once, then chat with no internet. Choose from compact to large models.",
    heading: "Offline assistant",
    type: "website",
    content: [
      {
        kind: "p",
        text: "A general-purpose AI assistant that runs on your own device. After a one-time model download it works with no internet, and what you type never leaves your browser. Use it for writing, studying, coding or any question. Small models can be wrong, so check anything important.",
      },
    ],
    links: [{ to: "/offline", label: "Use AI without internet" }],
    jsonLd: [
      breadcrumbs([
        { name: "Home", path: "/" },
        { name: "Use offline", path: "/offline" },
        { name: "Offline assistant", path: "/offline/assistant" },
      ]),
    ],
  }),
  "/about": () => ({
    path: "/about",
    title: `How the AI video library works${suffix}`,
    description:
      "How the AI video library is built every day: where videos come from, what gets filtered out, how each is labelled and how the ranking works.",
    heading: "How the video library works",
    type: "website",
    content: [
      { kind: "p", text: "The library is rebuilt automatically every day. Videos are collected from YouTube searches and trusted channels, filtered, labelled and ranked." },
    ],
    links: [{ to: "/watch", label: "Watch" }],
    jsonLd: [breadcrumbs([{ name: "Home", path: "/" }, { name: "How the video library works", path: "/about" }])],
  }),
  "/search": () => ({
    path: "/search",
    title: `Search${suffix}`,
    description: "Search tools, lessons and videos.",
    heading: "Search",
    type: "website",
    noindex: true,
    content: [],
    links: [],
    jsonLd: [],
  }),
};

function homeLd(): object[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      inLanguage: "en",
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    { "@context": "https://schema.org", ...ORG, sameAs: ["https://sites.usc.edu/ai-knowledge-hub/"] },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];
}

/** The page details for an address in the app, or null if there is no such page. */
export function pageMeta(pathname: string): PageMeta | null {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const fixed = STATIC[p];
  if (fixed) return fixed();
  let m: RegExpMatchArray | null;
  if ((m = p.match(/^\/learn\/path\/([^/]+)$/))) return pathPage(m[1]);
  if ((m = p.match(/^\/learn\/path\/([^/]+)\/([^/]+)$/))) {
    const course = guidedPathById.get(m[1]);
    return course && pathModules(course).includes(m[2]) ? lessonPage(m[2], m[1]) : null;
  }
  if ((m = p.match(/^\/learn\/lesson\/([^/]+)$/))) return lessonPage(m[1]);
  if ((m = p.match(/^\/learn\/([^/]+)$/))) return modulePage(m[1]);
  if ((m = p.match(/^\/tools\/compare\/([^/]+)$/))) return comparePage(m[1]);
  if ((m = p.match(/^\/tools\/([^/]+)$/))) return toolPage(m[1]);
  return null;
}

/** Every address that gets its own HTML page at build time. */
export function allPaths(): string[] {
  return [
    ...Object.keys(STATIC).filter((p) => p !== "/search"),
    ...guidedPaths.map((g) => `/learn/path/${g.path}`),
    ...guidedPaths.flatMap((g) => pathModules(g).filter((m) => lessonByModule.has(m)).map((m) => `/learn/path/${g.path}/${m}`)),
    ...[...lessonByModule.keys()].map((m) => `/learn/lesson/${m}`),
    ...modules.map((m) => `/learn/${m.id}`),
    ...tools.map((t) => `/tools/${t.id}`),
    ...PAIRS.map(([a, b]) => `/tools/compare/${pairSlug(a, b)}`),
  ];
}

/** The addresses that go in the sitemap: each page once, at its canonical address. */
export function sitemapPaths(): string[] {
  return allPaths().filter((p) => pageMeta(p)?.path === p);
}

/** The tags that go in a page's head, as plain data. Used by both the build and the app. */
export function headTags(meta: PageMeta): { name?: string; property?: string; content: string }[] {
  const image = `${SITE_URL}${SOCIAL_IMAGE}`;
  return [
    { name: "description", content: meta.description },
    { name: "robots", content: meta.noindex ? "noindex, follow" : "index, follow, max-image-preview:large" },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:type", content: meta.type },
    { property: "og:title", content: meta.title },
    { property: "og:description", content: meta.description },
    { property: "og:url", content: url(meta.path) },
    { property: "og:image", content: image },
    { property: "og:image:alt", content: "USC AI Knowledge Hub: learn AI, use AI, understand what's next" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: meta.title },
    { name: "twitter:description", content: meta.description },
    { name: "twitter:image", content: image },
  ];
}

export const canonicalUrl = (path: string) => url(path);
