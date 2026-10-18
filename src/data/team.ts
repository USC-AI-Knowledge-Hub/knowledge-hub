/**
 * AI Team: the discussion boards. There is one board for each course in the three proficiency buckets,
 * and one general board for AI tools. Posts live on the site's own database (supabase/schema.sql, set up
 * as described in supabase/README.md); until a database is connected the boards work on each visitor's own
 * device, so nothing is shared. A board's id is stored with every post, so don't change one once it's in use.
 */

export interface Topic {
  id: string;
  label: string;
  icon: string;
  /** What the box asks for when this topic is picked. */
  hint: string;
}

/** What students post about on a course's board. */
export const COURSE_TOPICS: readonly Topic[] = [
  { id: "questions", label: "Questions", icon: "help", hint: "What are you stuck on or unsure about?" },
  { id: "learned", label: "What I learned", icon: "lightbulb", hint: "A takeaway worth sharing" },
  { id: "resources", label: "Resources", icon: "bookmark", hint: "A link, video or article that helped" },
  { id: "tips", label: "Study tips", icon: "checklist", hint: "How you worked through it" },
];

/** What students post about on the tools board. */
export const TOOL_TOPICS: readonly Topic[] = [
  { id: "videos", label: "Videos", icon: "smart_display", hint: "A video that taught you something" },
  { id: "articles", label: "Articles", icon: "article", hint: "A guide, post or paper worth reading" },
  { id: "new", label: "New tools and features", icon: "new_releases", hint: "Something new a tool can do" },
  { id: "prompts", label: "Prompts and tips", icon: "lightbulb", hint: "A prompt or habit that works" },
  { id: "help", label: "Questions", icon: "help", hint: "Ask what worked for others" },
];

export const topicById = new Map<string, Topic>([...COURSE_TOPICS, ...TOOL_TOPICS].map((t) => [t.id, t]));

export interface Bucket {
  id: 1 | 2 | 3;
  name: string;
  who: string;
  focus: string;
}

/** The three proficiency buckets, from the program's overview. */
export const BUCKETS: readonly Bucket[] = [
  { id: 1, name: "Foundations", who: "New to AI, or has only used ChatGPT casually", focus: "What generative AI is, and how to use the main tools" },
  { id: 2, name: "Applied AI", who: "Uses AI regularly but not systematically", focus: "Prompting, workflows, agents and responsible use" },
  {
    id: 3,
    name: "Technical",
    who: "An advanced AI user who wants to build with AI; some courses assume basic Python or command-line familiarity",
    focus: "Vibe coding, coding agents and agent skills",
  },
];

export interface BoardDef {
  id: string;
  kind: "tools" | "course";
  title: string;
  /** Who runs the course. */
  provider?: string;
  bucket?: Bucket["id"];
  /** The course's own page. Course pages can change, so students are told to check them. */
  url?: string;
  topics: readonly Topic[];
}

const course = (bucket: Bucket["id"], id: string, title: string, provider: string, url: string): BoardDef => ({
  id,
  kind: "course",
  title,
  provider,
  bucket,
  url,
  topics: COURSE_TOPICS,
});

export const TOOLS_BOARD: BoardDef = { id: "tools", kind: "tools", title: "AI tools", topics: TOOL_TOPICS };

export const COURSE_BOARDS: readonly BoardDef[] = [
  // Bucket 1: Foundations
  course(1, "google-intro-genai", "Introduction to Generative AI", "Google", "https://www.skills.google/course_templates/536"),
  course(1, "openai-ai-foundations", "AI Foundations", "OpenAI", "https://academy.openai.com/public/courses/ai-foundations-juzjs"),
  course(1, "dlai-genai-for-everyone", "Generative AI for Everyone", "DeepLearning.AI", "https://www.deeplearning.ai/courses/generative-ai-for-everyone"),
  course(1, "claude-101", "Claude 101", "Anthropic", "https://academy.claude.com/courses/claude-101"),
  // Bucket 2: Applied AI
  course(2, "openai-applied-ai-foundations", "Applied AI Foundations", "OpenAI", "https://academy.openai.com/public/courses/applied-ai-foundations-szsmv"),
  course(2, "openai-agents-workflows", "Agents and Workflows", "OpenAI", "https://academy.openai.com/public/courses/agents-and-workflows-bieml"),
  course(2, "anthropic-ai-fluency-framework", "AI Fluency: Framework and Foundations", "Anthropic", "https://academy.claude.com/courses/ai-fluency-framework-foundations"),
  course(2, "anthropic-ai-fluency-students", "AI Fluency for Students", "Anthropic", "https://anthropic.skilljar.com/ai-fluency-for-students"),
  course(2, "kaggle-ai-ethics", "Introduction to AI Ethics", "Kaggle", "https://www.kaggle.com/learn/intro-to-ai-ethics"),
  course(2, "dlai-ai-prompting", "AI Prompting for Everyone", "DeepLearning.AI", "https://www.deeplearning.ai/courses/ai-prompting-for-everyone"),
  // Bucket 3: Technical
  course(3, "dlai-prompt-eng-developers", "ChatGPT Prompt Engineering for Developers", "DeepLearning.AI", "https://www.deeplearning.ai/courses/chatgpt-prompt-eng"),
  course(3, "hf-ai-agents", "AI Agents (units 0-1)", "Hugging Face", "https://huggingface.co/learn/agents-course/en/unit0/introduction"),
  course(3, "claude-code-101", "Claude Code 101", "Anthropic", "https://anthropic.skilljar.com/claude-code-101"),
  course(3, "dlai-agent-skills", "Agent Skills with Anthropic", "Anthropic and DeepLearning.AI", "https://www.deeplearning.ai/courses/agent-skills-with-anthropic"),
  course(3, "dlai-vibe-coding-replit", "Vibe Coding 101 with Replit", "Replit and DeepLearning.AI", "https://www.deeplearning.ai/courses/vibe-coding-101-with-replit"),
];

export const BOARDS: readonly BoardDef[] = [TOOLS_BOARD, ...COURSE_BOARDS];
export const boardById = new Map(BOARDS.map((b) => [b.id, b]));

/** A board from an address's `board` value, or null when it isn't one. */
export const boardFor = (id: string | null): BoardDef | null => (id ? (boardById.get(id) ?? null) : null);

/** The shared database's address and its public key, set when the site is built (repository variables BOARD_URL and BOARD_ANON_KEY). */
export const DATABASE = {
  url: (import.meta.env.VITE_BOARD_URL as string | undefined) ?? "",
  anonKey: (import.meta.env.VITE_BOARD_KEY as string | undefined) ?? "",
};
