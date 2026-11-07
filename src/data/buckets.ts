/**
 * The program's three proficiency buckets and the free courses in each, from the program's overview.
 * One source for the Start page (find your bucket, tick off courses) and the AI Team boards (a board
 * per course). A course's id is stored with board posts and progress, so don't rename one once it's in use.
 */

export interface Bucket {
  id: 1 | 2 | 3;
  name: string;
  who: string;
  focus: string;
  /** Rough time for the core courses, from the overview. */
  hours: string;
}

export const BUCKETS: readonly Bucket[] = [
  { id: 1, name: "Foundations", who: "New to AI, or has only used ChatGPT casually", focus: "What generative AI is, and how to use the main tools", hours: "7 to 10 hours" },
  { id: 2, name: "Applied AI", who: "Uses AI regularly but not systematically", focus: "Prompting, workflows, agents and responsible use", hours: "7 to 10 hours" },
  {
    id: 3,
    name: "Technical",
    who: "An advanced AI user who wants to build with AI; some courses assume basic Python or command-line familiarity",
    focus: "Vibe coding, coding agents and agent skills",
    hours: "7 to 10 hours",
  },
];

export const bucketById = new Map(BUCKETS.map((b) => [b.id, b]));

export interface BucketCourse {
  id: string;
  title: string;
  provider: string;
  url: string;
  bucket: Bucket["id"];
}

const c = (bucket: Bucket["id"], id: string, title: string, provider: string, url: string): BucketCourse => ({ id, title, provider, url, bucket });

export const BUCKET_COURSES: readonly BucketCourse[] = [
  c(1, "google-intro-genai", "Introduction to Generative AI", "Google", "https://www.skills.google/course_templates/536"),
  c(1, "openai-ai-foundations", "AI Foundations", "OpenAI", "https://academy.openai.com/public/courses/ai-foundations-juzjs"),
  c(1, "dlai-genai-for-everyone", "Generative AI for Everyone", "DeepLearning.AI", "https://www.deeplearning.ai/courses/generative-ai-for-everyone"),
  c(1, "claude-101", "Claude 101", "Anthropic", "https://academy.claude.com/courses/claude-101"),
  c(2, "openai-applied-ai-foundations", "Applied AI Foundations", "OpenAI", "https://academy.openai.com/public/courses/applied-ai-foundations-szsmv"),
  c(2, "openai-agents-workflows", "Agents and Workflows", "OpenAI", "https://academy.openai.com/public/courses/agents-and-workflows-bieml"),
  c(2, "anthropic-ai-fluency-framework", "AI Fluency: Framework and Foundations", "Anthropic", "https://academy.claude.com/courses/ai-fluency-framework-foundations"),
  c(2, "anthropic-ai-fluency-students", "AI Fluency for Students", "Anthropic", "https://anthropic.skilljar.com/ai-fluency-for-students"),
  c(2, "kaggle-ai-ethics", "Introduction to AI Ethics", "Kaggle", "https://www.kaggle.com/learn/intro-to-ai-ethics"),
  c(2, "dlai-ai-prompting", "AI Prompting for Everyone", "DeepLearning.AI", "https://www.deeplearning.ai/courses/ai-prompting-for-everyone"),
  c(3, "dlai-prompt-eng-developers", "ChatGPT Prompt Engineering for Developers", "DeepLearning.AI", "https://www.deeplearning.ai/courses/chatgpt-prompt-eng"),
  c(3, "hf-ai-agents", "AI Agents (units 0-1)", "Hugging Face", "https://huggingface.co/learn/agents-course/en/unit0/introduction"),
  c(3, "claude-code-101", "Claude Code 101", "Anthropic", "https://anthropic.skilljar.com/claude-code-101"),
  c(3, "dlai-agent-skills", "Agent Skills with Anthropic", "Anthropic and DeepLearning.AI", "https://www.deeplearning.ai/courses/agent-skills-with-anthropic"),
  c(3, "dlai-vibe-coding-replit", "Vibe Coding 101 with Replit", "Replit and DeepLearning.AI", "https://www.deeplearning.ai/courses/vibe-coding-101-with-replit"),
];

export const coursesIn = (bucket: Bucket["id"]) => BUCKET_COURSES.filter((x) => x.bucket === bucket);

/** The four self-rating questions. A "yes" to each shows what the second column says. */
export const SELF_RATING = [
  { id: "weekly", question: "Do you use an AI tool like ChatGPT, Gemini or Claude at least weekly for school or work?", shows: "Regular use (Bucket 2 or higher)" },
  { id: "prompting", question: "When you prompt, do you give context, examples and a desired format, and then refine the answer?", shows: "Deliberate prompting (Bucket 2 or higher)" },
  { id: "critical", question: "Do you check AI answers for errors or made-up facts, and know when not to trust them?", shows: "Critical, responsible use (Bucket 2 or higher)" },
  { id: "advanced", question: "Have you used AI for multi-step work, such as research workflows, data analysis, custom assistants or automations?", shows: "Advanced use (Bucket 3)" },
] as const;

export type RatingId = (typeof SELF_RATING)[number]["id"];
/** "unsure" counts as "no": if you're between two buckets, start with the lower one. */
export type Answer = "yes" | "unsure" | "no";
export type Answers = Partial<Record<RatingId, Answer>>;

export interface Placement {
  bucket: Bucket["id"];
  /** Why, in a sentence. */
  reason: string;
}

/** Where to start, or null until all four questions are answered. */
export function placeFor(a: Answers): Placement | null {
  if (SELF_RATING.some((q) => !a[q.id])) return null;
  const yes = (id: RatingId) => a[id] === "yes";
  if (!yes("weekly")) return { bucket: 1, reason: "You don't use an AI tool every week yet, so start with the foundations." };
  if (yes("advanced") && (yes("prompting") || yes("critical")))
    return { bucket: 3, reason: "You use AI for multi-step work and prompt or check answers carefully, so you're ready to build with it." };
  return { bucket: 2, reason: "You use AI regularly, so the next step is using it systematically, with better prompts, workflows and judgment." };
}
