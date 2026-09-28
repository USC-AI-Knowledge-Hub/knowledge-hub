/**
 * Content for the Green AI page: the footprint in proportion, the
 * right-size picker, efficient habits, responsible use and the pledge.
 * Every figure here has an entry in SOURCES; keep them in step with the
 * "AI and the environment" tutor quest (src/lib/tutor/quests.ts).
 */

export interface Source {
  id: string;
  label: string;
  /** How it's cited inline. */
  short: string;
  publisher: string;
  date: string;
  url: string;
}

export const SOURCES: Source[] = [
  {
    id: "iea",
    short: "IEA",
    label: "Energy and AI",
    publisher: "International Energy Agency (IEA)",
    date: "April 2025",
    url: "https://www.iea.org/reports/energy-and-ai",
  },
  {
    id: "google",
    short: "Google",
    label: "Measuring the environmental impact of AI inference",
    publisher: "Google Cloud blog",
    date: "August 2025",
    url: "https://cloud.google.com/blog/products/infrastructure/measuring-the-environmental-impact-of-ai-inference",
  },
  {
    id: "google-paper",
    short: "Google",
    label: "Methodology paper for the Gemini figures",
    publisher: "Google, arXiv:2508.15734",
    date: "August 2025",
    url: "https://arxiv.org/abs/2508.15734",
  },
  {
    id: "altman",
    short: "Sam Altman",
    label: "The gentle singularity",
    publisher: "Sam Altman, OpenAI CEO (blog)",
    date: "June 2025",
    url: "https://blog.samaltman.com/the-gentle-singularity",
  },
  {
    id: "patterson",
    short: "Patterson et al.",
    label: "Carbon emissions and large neural network training",
    publisher: "Patterson et al., arXiv:2104.10350",
    date: "2021",
    url: "https://arxiv.org/abs/2104.10350",
  },
  {
    id: "eu-ai-act",
    short: "EU",
    label: "Regulation (EU) 2024/1689, the Artificial Intelligence Act",
    publisher: "Official Journal of the European Union",
    date: "2024",
    url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
  },
  {
    id: "nist",
    short: "NIST",
    label: "AI Risk Management Framework (AI RMF 1.0)",
    publisher: "US National Institute of Standards and Technology (NIST)",
    date: "January 2023",
    url: "https://www.nist.gov/itl/ai-risk-management-framework",
  },
];

export const sourceById = new Map(SOURCES.map((s) => [s.id, s]));

/** The big picture: all data centres, not only AI. */
export const DATA_CENTRES = {
  source: "iea",
  points: [
    { year: "2024", twh: 415, note: "Estimated use, about 1.5% of the world's electricity" },
    { year: "2030", twh: 945, note: "Projected, with AI the main driver of growth", projected: true },
  ],
};

export interface PromptFigure {
  id: string;
  who: string;
  what: string;
  wh: number;
  extra?: string;
  source: string;
}

/** Company-reported figures for a single text prompt, measured in different ways. */
export const PROMPT_FIGURES: PromptFigure[] = [
  {
    id: "gemini",
    who: "Google, Gemini Apps",
    what: "Median text prompt",
    wh: 0.24,
    extra: "plus about 0.26 mL of water, roughly five drops",
    source: "google",
  },
  {
    id: "chatgpt",
    who: "OpenAI's CEO, ChatGPT",
    what: "Average query",
    wh: 0.34,
    source: "altman",
  },
];

/** A 10 W LED bulb: minutes of light for a given number of watt-hours. */
export const LED_WATTS = 10;
export const ledMinutes = (wh: number) => (wh / LED_WATTS) * 60;

export const TRAINING = {
  mwh: 1287,
  model: "GPT-3",
  source: "patterson",
};

/** What costs more than a short text answer, in order. Qualitative on purpose: the ratios aren't well established. */
export const HEAVIER = [
  { label: "Short text answer", icon: "notes" },
  { label: "Long reasoning or deep research", icon: "psychology" },
  { label: "Generated image", icon: "image" },
  { label: "Generated video", icon: "movie" },
];

// ── Right-size picker ─────────────────────────────────────────────────────

/** How heavy the recommended approach is, relative to the others. Qualitative, never a ratio. */
export type Weight = 1 | 2 | 3 | 4;
export const WEIGHT_LABEL: Record<Weight, string> = {
  1: "Lightest",
  2: "Light",
  3: "Heavier",
  4: "Heaviest",
};

export interface GreenTask {
  id: string;
  label: string;
  icon: string;
  /** The lightest option that does the job. */
  pick: string;
  reason: string;
  weight: Weight;
  /** When it's worth stepping up to something heavier. */
  stepUp: string;
  /** The common heavy habit to skip. */
  skip: string;
  /** Tool IDs from src/data/tools.ts. */
  tools: string[];
  /** Suggests the Hub's own on-device tutor. */
  tutor?: boolean;
}

export const GREEN_TASKS: GreenTask[] = [
  {
    id: "quick",
    label: "Quick fact or rewrite",
    icon: "bolt",
    pick: "A small, fast model",
    reason: "A short rewrite or a well-known fact doesn't need a big model or a thinking mode. Most assistants have a fast option.",
    weight: 1,
    stepUp: "Turn on web search only if the answer might have changed recently.",
    skip: "Reasoning or deep research mode for a one-line answer.",
    tools: ["chatgpt", "claude", "gemini"],
    tutor: true,
  },
  {
    id: "summarize",
    label: "Summarize a document",
    icon: "summarize",
    pick: "A standard model, the whole file, one clear prompt",
    reason: "Attach the document and say the length and focus you want, so one pass does the job.",
    weight: 2,
    stepUp: "Use a reasoning mode only for long, dense material you need compared or checked carefully.",
    skip: "Pasting a document in pieces across many messages.",
    tools: ["notebooklm", "claude", "chatgpt"],
  },
  {
    id: "study",
    label: "Study help",
    icon: "school",
    pick: "A small model on your own device, or a notebook grounded in your readings",
    reason: "Explanations and practice questions suit small models. A notebook tool keeps answers tied to your course material.",
    weight: 1,
    stepUp: "Use a larger assistant when you need depth or up-to-date facts.",
    skip: "Generating a video explainer when a paragraph would do.",
    tools: ["notebooklm", "quillbot"],
    tutor: true,
  },
  {
    id: "code",
    label: "Coding",
    icon: "code",
    pick: "Inline suggestions in your editor, plus a standard chat model",
    reason: "Short completions cover most everyday coding. Agents that edit many files run many steps, so save them for work that needs them.",
    weight: 2,
    stepUp: "Use an agent or reasoning mode for multi-file changes or a stubborn bug, with a clear scope.",
    skip: "Leaving agents running idle, or rerunning them without changing the instructions.",
    tools: ["github-copilot", "cursor", "claude-code"],
  },
  {
    id: "research",
    label: "Deep research",
    icon: "travel_explore",
    pick: "A paper search tool first, deep research mode second",
    reason: "Academic search finds and ranks real papers quickly. Deep research agents run many searches and long reasoning, so keep them for broad questions.",
    weight: 3,
    stepUp: "Use deep research for a broad, multi-source question that would otherwise take you hours.",
    skip: "Deep research for a question a single search answers.",
    tools: ["semantic-scholar", "elicit", "consensus", "perplexity"],
  },
  {
    id: "image",
    label: "Make an image",
    icon: "image",
    pick: "Text, a diagram or an existing image first",
    reason: "Generating an image takes much more energy than a text answer. A diagram or a stock image often does the job; if you do generate, describe it precisely so you need fewer tries.",
    weight: 3,
    stepUp: "Generate when you need something that doesn't exist yet.",
    skip: "Generating dozens of variations just to browse.",
    tools: ["napkin", "canva", "adobe-firefly"],
  },
  {
    id: "video",
    label: "Make a video",
    icon: "movie",
    pick: "A script, storyboard or slides first; generated video last",
    reason: "Video generation is one of the heaviest things AI does. Get the idea right in text, then generate short clips only where you need footage.",
    weight: 4,
    stepUp: "Generate short clips for shots you can't film or find.",
    skip: "Regenerating long clips to see what comes out.",
    tools: ["gamma", "descript", "runway"],
  },
];

export const greenTaskById = new Map(GREEN_TASKS.map((t) => [t.id, t]));

/** The picker's answer for a task ID; falls back to the first task. */
export function recommend(id: string | null | undefined): GreenTask {
  return (id && greenTaskById.get(id)) || GREEN_TASKS[0];
}

// ── Habits ────────────────────────────────────────────────────────────────

export interface Habit {
  id: string;
  title: string;
  why: string;
}

export const HABITS: Habit[] = [
  { id: "batch", title: "Batch related questions into one prompt", why: "One clear message beats five fragments, and the answer hangs together better." },
  { id: "context", title: "Give context up front", why: "Say who it's for, how long and what to focus on, and you'll need fewer retries." },
  { id: "no-blind-regen", title: "Fix the prompt instead of regenerating blindly", why: "Rerolling repeats the same guess. Say what was wrong and it improves." },
  { id: "reasoning-off", title: "Turn off reasoning and deep research for simple questions", why: "Thinking modes and research agents do far more work per answer. Save them for hard problems." },
  { id: "text-first", title: "Prefer text when text does the job", why: "Images and especially video take much more energy than words." },
  { id: "templates", title: "Reuse good prompts as templates", why: "A prompt that worked once saves you the trial and error next time." },
  { id: "close-agents", title: "Close idle agents and long-running tabs", why: "Agents can keep working in the background. Stop them when you're done." },
  { id: "smallest", title: "Pick the smallest model that works", why: "Try the fast option first and step up only when it falls short." },
];

// ── Responsible use ───────────────────────────────────────────────────────

export const PRINCIPLES = [
  { id: "transparency", icon: "visibility", title: "Transparency", body: "Say when and how you used AI, the way you'd cite a source." },
  { id: "fairness", icon: "balance", title: "Fairness", body: "Models can repeat biases in their training data. Check outputs that affect people." },
  { id: "privacy", icon: "lock", title: "Privacy", body: "Don't paste other people's personal data, or anything confidential, into a tool." },
  { id: "accountability", icon: "verified_user", title: "Accountability", body: "You own what you submit or publish, including the parts AI drafted." },
  { id: "oversight", icon: "supervisor_account", title: "Human oversight", body: "Keep a person in the loop for decisions that matter, and check before you act." },
];

export const GOVERNANCE = [
  {
    id: "eu-ai-act",
    title: "EU AI Act",
    body: "A risk-based law: the higher the risk an AI system poses, the stricter the rules, and a few uses are banned outright. It entered into force in 2024, with obligations phasing in over the following years.",
    source: "eu-ai-act",
  },
  {
    id: "nist",
    title: "NIST AI Risk Management Framework",
    body: "Voluntary US guidance, published in 2023, for organizations to map, measure and manage the risks of the AI they build and use.",
    source: "nist",
  },
  {
    id: "university",
    title: "University and course policies",
    body: "Rules differ by course, and the syllabus wins. Check USC's current guidance and ask your instructor when in doubt.",
  },
];

// ── Pledge ────────────────────────────────────────────────────────────────

export const PLEDGE = [
  "I'll pick the smallest model that does the job.",
  "I'll write one clear prompt before I regenerate.",
  "I'll use text before images, and images before video.",
  "I'll say when I've used AI, and check what it tells me.",
  "I'll keep other people's data out of AI tools.",
];
