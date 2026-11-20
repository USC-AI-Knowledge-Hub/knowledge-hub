import type { Course, CourseSource } from "./types";

/**
 * Full courses: complete playlists and long single-video courses from
 * universities, the companies that make the tools, and educators with a
 * track record. Each one is mapped to the Learn modules it goes deeper on.
 *
 * Rules for adding one:
 * - It has to be a course, not a clip: a planned sequence, or one long
 *   video structured as lessons.
 * - Only the original publisher's channel, never a re-upload. The checker
 *   compares channels, which is how it caught a re-uploaded OpenAI course.
 * - It must allow embedding (Stanford's CS229 doesn't, so it isn't here).
 * - `channel` must match YouTube exactly. `npm run courses` fails CI when a
 *   course is gone or has moved to another channel.
 * - Lesson counts and hours are estimates; the daily run replaces them with
 *   live numbers.
 * - Only courses with a lesson from 2026 or later (src/data/since.ts). The daily
 *   check records each playlist's newest lesson and the site hides older ones.
 */
export const courses: Course[] = [
  // ── Universities ───────────────────────────────────────────────────────────
  {
    id: "mit-6s191",
    playlist: "PLtBw6njQRU-rwp5__7C0oIVt26ZgjG9NI",
    title: "MIT 6.S191: Introduction to Deep Learning",
    channel: "Alexander Amini",
    org: "MIT",
    source: "university",
    lessons: 10,
    hours: 10,
    difficulty: "intermediate",
    summary:
      "MIT's one-week bootcamp, re-recorded every year: neural networks, sequence models, transformers, computer vision, generative models and reinforcement learning, plus guest lectures. The playlist keeps past years too; start with the most recent year's lectures.",
    audience: "Students with some calculus and Python who want a fast, current overview of deep learning.",
    cover: "alfdI7S6wCY",
    rolling: true,
    modules: ["llms", "multimodal", "ai-for-your-field"],
  },
  {
    id: "stanford-cs25",
    playlist: "PLoROMvodv4rNiJRchCzutFw5ItR_Z27CM",
    title: "Stanford CS25: Transformers United",
    channel: "Stanford Online",
    org: "Stanford",
    source: "university",
    lessons: 40,
    hours: 45,
    difficulty: "advanced",
    summary:
      "Stanford's seminar on transformers, with talks from the researchers who built them. Covers language, vision, reasoning, agents and where the field is heading.",
    audience: "People who already know the basics and want to hear from the people doing the research. Pick talks, don't binge.",
    cover: "JKbtWimlzAE",
    modules: ["llms", "reasoning-models"],
  },

  // ── The companies that make the tools ──────────────────────────────────────
  {
    id: "anthropic-ai-fluency",
    playlist: "PLf2m23nhTg1NjL3-jL3s0qZCYzO07ZQPv",
    title: "AI Fluency: Framework and Foundations",
    channel: "Anthropic",
    org: "Anthropic",
    source: "maker",
    lessons: 12,
    hours: 3,
    difficulty: "beginner",
    summary:
      "Built with professors from Ringling College and University College Cork. Teaches four habits for working with any AI: deciding what to delegate, describing the task, judging the output, and taking responsibility for it.",
    audience: "Everyone. Not tied to one tool, and the best single course here on using AI well.",
    cover: "JpGtOfSgR-c",
    modules: ["chat-assistants", "prompting", "writing", "research-verification", "limits", "ai-for-teaching", "assessment", "ethics-integrity", "presentations"],
    tools: ["claude"],
  },
  {
    id: "n8n-beginner",
    playlist: "PLlET0GsrLUL59YbxstZE71WszP3pVnZfI",
    title: "n8n Beginner Course",
    channel: "n8n",
    org: "n8n",
    source: "maker",
    lessons: 9,
    hours: 2,
    difficulty: "intermediate",
    summary: "n8n's official nine-part course: APIs and webhooks, nodes, how data moves between steps, error handling, debugging and sharing workflows.",
    audience: "Anyone automating a real chore. No code needed, though it helps.",
    cover: "4BVTkqbn_tY",
    modules: ["automation", "agents"],
    tools: ["n8n"],
  },
  {
    id: "gemini-education",
    playlist: "PLP7Bvyb3ap462hNhU9dZdFEu3H04Efbyf",
    title: "Transform Education with Gemini for Google Workspace",
    channel: "Google for Education",
    org: "Google",
    source: "maker",
    lessons: 6,
    hours: 1,
    difficulty: "beginner",
    summary: "Google for Education's demos of Gemini inside Workspace apps for educators: planning, preparing and adapting course materials, and handling admin work.",
    audience: "Instructors and staff who already work in Google Workspace.",
    modules: ["ai-for-teaching", "assessment", "presentations"],
    tools: ["gemini"],
  },

];

export const courseById = new Map(courses.map((c) => [c.id, c]));

export const SOURCE_LABEL: Record<CourseSource, string> = {
  university: "University courses",
  maker: "From the companies that make the tools",
  educator: "Independent educators",
};

export const coursesFor = (moduleId: string) => courses.filter((c) => c.modules.includes(moduleId));
