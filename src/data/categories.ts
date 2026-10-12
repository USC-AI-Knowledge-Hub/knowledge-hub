/**
 * The tool finder's categories, as a two-level tree: broad categories ("Create video") and the more
 * specific ones inside them ("Text to video"). A tool belongs to the most specific category that fits, and
 * to that category's parent automatically.
 *
 * These are the seed categories, written and owned by editors; nothing removes them. The daily
 * discovery run (scripts/discovery) can add more to public/data/taxonomy.json when enough new tools
 * share a purpose that nothing here describes. See src/lib/taxonomy.ts for how tools are classified.
 */

export type CategoryId = string;

export interface Category {
  /** Stable forever: tools and links refer to it. Lowercase letters, digits and hyphens. */
  id: CategoryId;
  label: string;
  /** Material Symbols name. */
  icon: string;
  /** Set for a sub-category. Only two levels: the parent must be a broad category. */
  parent?: CategoryId;
  /** One sentence on what belongs here. Shown on the page and given to the classifier. */
  definition: string;
  /**
   * Precise words and phrases that signal the category. The classifier reads a tool's description for
   * these, so each should be specific: "text to video", not "app". Phrases count for more than words.
   */
  keywords: string[];
  /** Loose everyday words people type when they search ("slides", "essay"). Search only, never classification. */
  cues?: string[];
  /** Seed categories are editors'; auto ones were created by the discovery run. */
  origin: "seed" | "auto";
  createdAt?: string;
}

const seed = (c: Omit<Category, "origin">): Category => ({ ...c, origin: "seed" });

export const SEED_CATEGORIES: Category[] = [
  seed({
    id: "write",
    label: "Write",
    icon: "edit_note",
    definition: "Drafting, editing and improving text.",
    keywords: ["writing assistant", "write", "essay", "proofread", "grammar", "paraphrase", "rewrite", "copywriting", "email", "draft", "text editor"],
    cues: ["writing", "email", "cover letter", "rephrase", "reword", "edit my writing", "spelling"],
  }),
  seed({
    id: "research",
    label: "Research",
    icon: "travel_explore",
    definition: "Finding, reading and checking sources and papers.",
    keywords: ["research", "literature review", "academic papers", "citations", "scholarly", "sources", "peer reviewed", "search engine", "answer engine", "fact check"],
    cues: ["paper", "papers", "literature", "lit review", "cite", "journal", "studies", "evidence", "disputed", "academic"],
  }),
  seed({
    id: "analyze",
    label: "Analyze data",
    icon: "query_stats",
    definition: "Working with spreadsheets, datasets and statistics.",
    keywords: ["data analysis", "spreadsheet", "dataset", "statistics", "charts", "visualization", "analytics", "business intelligence", "data science"],
    cues: ["data", "excel", "csv", "chart", "graph", "stats", "analyze", "analysis", "regression"],
  }),
  seed({
    id: "present",
    label: "Make a presentation",
    icon: "slideshow",
    definition: "Slides, posters, diagrams and pitch decks.",
    keywords: ["presentation", "slide deck", "slides", "pitch deck", "infographic", "diagram", "poster"],
    cues: ["slide", "deck", "powerpoint", "ppt", "keynote", "pitch"],
  }),
  seed({
    id: "image",
    label: "Create an image",
    icon: "palette",
    definition: "Making and editing pictures, art and design.",
    keywords: ["image generation", "text to image", "image generator", "photo editing", "illustration", "graphic design", "artwork", "logo"],
    cues: ["image", "images", "picture", "photo", "art", "drawing", "generate an image"],
  }),
  seed({
    id: "video",
    label: "Create video",
    icon: "movie",
    definition: "Making, animating and editing video.",
    keywords: ["video", "text to video", "video generation", "video generator", "video editing", "footage", "animation", "film", "cinematic", "image to video"],
    cues: ["videos", "clip", "edit video", "youtube"],
  }),
  seed({
    id: "audio",
    label: "Voice & audio",
    icon: "graphic_eq",
    definition: "Speech, music, recording and transcription.",
    keywords: ["voice", "speech", "audio", "text to speech", "voice cloning", "music generation", "transcription", "podcast", "dubbing", "narration"],
    cues: ["transcribe", "transcript", "recording", "captions", "lecture recording", "meeting notes"],
  }),
  seed({
    id: "code",
    label: "Code",
    icon: "code",
    definition: "Writing, reviewing and running software.",
    keywords: ["coding", "code generation", "programming", "software development", "developer", "code editor", "ide", "debugging", "app builder", "coding agent", "api"],
    cues: ["code", "program", "debug", "app", "website", "python", "javascript", "script"],
  }),
  seed({
    id: "study",
    label: "Study",
    icon: "school",
    definition: "Learning, revising and understanding material.",
    keywords: ["study", "flashcards", "quiz", "tutor", "learning", "exam", "revision", "explain concepts", "homework"],
    cues: ["learn", "exam", "notes", "revise", "understand", "explain", "reading"],
  }),
  seed({
    id: "teach",
    label: "Teach",
    icon: "co_present",
    definition: "Planning lessons and supporting students.",
    keywords: ["teaching", "lesson plan", "classroom", "rubric", "syllabus", "educators", "instructor", "curriculum", "grading"],
    cues: ["teach", "class", "students", "lecture slides"],
  }),
  seed({
    id: "automate",
    label: "Automate a workflow",
    icon: "account_tree",
    definition: "Connecting apps and handing repetitive work to software.",
    keywords: ["automation", "workflow", "no code", "integrations", "agents", "ai agent", "connect apps", "orchestration"],
    cues: ["automate", "workflows", "integrate", "zap", "repetitive"],
  }),
  seed({
    id: "design3d",
    label: "3D, design & game development",
    icon: "view_in_ar",
    definition: "3D models, CAD and engineering design, and building games.",
    keywords: ["3d", "3d model", "cad", "game engine", "game development", "game", "rendering", "architecture design", "product design", "engineering design", "animation pipeline", "digital twin"],
    cues: ["unity", "unreal", "blender", "autodesk", "3d printing", "level design"],
  }),

  // Sub-categories. Each sits in a broad category above and shows only once a tool belongs to it.
  seed({
    id: "image-generation",
    label: "Image generation",
    icon: "auto_awesome",
    parent: "image",
    definition: "Making new pictures from a text description.",
    keywords: ["text to image", "image generation", "image generator", "generate images", "diffusion", "art generator"],
  }),
  seed({
    id: "image-editing",
    label: "Photo editing & design",
    icon: "tune",
    parent: "image",
    definition: "Editing, retouching and laying out existing images.",
    keywords: ["photo editing", "image editing", "retouch", "background removal", "upscale", "graphic design", "design templates", "generative fill"],
  }),
  seed({
    id: "text-to-video",
    label: "Text to video",
    icon: "movie_creation",
    parent: "video",
    definition: "Generating video clips from a prompt or a still image.",
    keywords: ["text to video", "video generation", "video generator", "image to video", "generate video", "ai video", "video model", "cinematic clips"],
  }),
  seed({
    id: "video-editing",
    label: "Video editing",
    icon: "content_cut",
    parent: "video",
    definition: "Cutting, captioning and improving recorded video.",
    keywords: ["video editing", "video editor", "edit video", "captions", "clip", "repurpose", "trim", "subtitles"],
  }),
  seed({
    id: "avatars",
    label: "Avatars & presenters",
    icon: "face",
    parent: "video",
    definition: "Talking presenters and digital humans made from a script.",
    keywords: ["avatar", "digital human", "ai presenter", "talking head", "lip sync", "virtual presenter"],
  }),
  seed({
    id: "speech-voice",
    label: "Speech & voice",
    icon: "record_voice_over",
    parent: "audio",
    definition: "Turning text into speech, cloning voices and dubbing.",
    keywords: ["text to speech", "voice cloning", "voice generator", "dubbing", "speech synthesis", "voice agent", "narration"],
  }),
  seed({
    id: "music",
    label: "Music",
    icon: "music_note",
    parent: "audio",
    definition: "Composing and generating music and sound.",
    keywords: ["music generation", "music generator", "compose music", "song", "sound effects", "soundtrack"],
  }),
  seed({
    id: "transcription",
    label: "Transcription & notes",
    icon: "subtitles",
    parent: "audio",
    definition: "Turning speech into text and meeting notes.",
    keywords: ["transcription", "transcribe", "meeting notes", "speech to text", "captions", "note taker", "meeting assistant"],
  }),
  seed({
    id: "code-assistants",
    label: "Coding assistants",
    icon: "terminal",
    parent: "code",
    definition: "Assistants that help write and review code in an editor or terminal.",
    keywords: ["coding assistant", "code completion", "code editor", "pair programmer", "coding agent", "code review", "autocomplete", "terminal"],
  }),
  seed({
    id: "app-builders",
    label: "App & website builders",
    icon: "web",
    parent: "code",
    definition: "Building whole apps and websites by describing them.",
    keywords: ["app builder", "website builder", "build apps", "vibe coding", "no code app", "prototype", "web app"],
  }),
  seed({
    id: "literature-search",
    label: "Literature search",
    icon: "menu_book",
    parent: "research",
    definition: "Finding and mapping academic papers and citations.",
    keywords: ["literature review", "academic papers", "citation", "scholarly", "paper search", "research papers", "scientific literature"],
  }),
  seed({
    id: "3d-generation",
    label: "3D generation",
    icon: "deployed_code",
    parent: "design3d",
    definition: "Making 3D models and scenes from text or images.",
    keywords: ["text to 3d", "3d generation", "3d model", "image to 3d", "mesh", "3d asset", "3d scene"],
  }),
  seed({
    id: "game-dev",
    label: "Game development",
    icon: "sports_esports",
    parent: "design3d",
    definition: "Building games and interactive worlds.",
    keywords: ["game engine", "game development", "game design", "level design", "npc", "game assets", "game"],
  }),
  seed({
    id: "cad-design",
    label: "CAD & engineering design",
    icon: "architecture",
    parent: "design3d",
    definition: "Designing parts, buildings and products with computer-aided design.",
    keywords: ["cad", "engineering design", "product design", "architecture", "manufacturing", "generative design", "simulation", "bim"],
  }),
];

export const SEED_IDS = new Set(SEED_CATEGORIES.map((c) => c.id));
