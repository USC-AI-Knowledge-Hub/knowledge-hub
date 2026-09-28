import type { GuidedPath } from "./types";

/**
 * The four learning paths as guided courses. Units group lessons into a
 * sequence that builds; each course ends with a capstone that uses what it
 * taught. Lessons are Learn modules, so a module can appear in several paths.
 */
export const guidedPaths: GuidedPath[] = [
  {
    path: "student",
    welcome:
      "For students who want to use AI confidently in their coursework, without shortcuts that backfire. Each lesson takes 30–60 minutes: read a short section at a time, ask the tutor about anything unclear, try it yourself, then pass a quick check. The tutor sits beside every lesson; use it as much as you like.",
    outcomes: [
      "Explain in plain words what a language model does, and why it makes mistakes.",
      "Brief an AI assistant well and improve its answers through feedback.",
      "Check AI output against real sources before you rely on it.",
      "Use AI in your own subject in ways your instructors allow.",
      "Build a personal set of prompts and habits for one of your courses.",
    ],
    units: [
      {
        title: "How AI works",
        intro: "Start with a working mental model. Once you know that a model predicts likely text, most of its strengths and failures stop being surprising.",
        modules: ["what-is-genai", "limits"],
      },
      {
        title: "Using AI well",
        intro: "Now put it to work. You'll set up an assistant, learn to brief it properly, and build the checking habit that separates good use from risky use.",
        modules: ["chat-assistants", "prompting", "research-verification"],
      },
      {
        title: "Making it yours",
        intro: "Apply what you've learned to your writing and your major, and decide where the lines are. This unit is about judgment as much as technique.",
        modules: ["writing", "ai-for-your-field", "ethics-integrity"],
      },
    ],
    capstone: {
      title: "Your AI study kit for one course",
      brief: "Pick a course you're taking this term and build a small, honest kit for using AI in it: what you'll use it for, the prompts that work, how you'll check its output, and where you won't use it.",
      steps: [
        "Read the course's AI policy, or ask the instructor, and write it down in one sentence.",
        "Choose three tasks where AI could help you learn (not do the work for you), such as quizzing yourself or explaining a reading.",
        "Write and test a prompt for each task. Revise each at least once.",
        "For one task, check the AI's answer against the course material and note anything wrong.",
        "Write a short disclosure statement you could attach to work where you used AI.",
      ],
      checklist: [
        "The policy is stated in your own words.",
        "Each prompt covers context, task and format.",
        "At least one AI error was found and corrected, or you explain how you checked.",
        "The disclosure says what you used, for what, and how you checked it.",
      ],
    },
  },
  {
    path: "faculty",
    welcome:
      "For instructors, TAs and teaching staff. The course moves from how these systems work to what they mean for your teaching, your assessments and your research. Each lesson is self-contained, so you can skip ahead to what's most urgent for you, and the tutor can explain any section in more depth.",
    outcomes: [
      "Explain to colleagues and students how language models work and where they fail.",
      "Use AI to prepare teaching materials, with checks that keep them accurate.",
      "Redesign an assessment so it still measures what you intend.",
      "Write a clear, fair AI policy for a course.",
    ],
    units: [
      {
        title: "Foundations",
        intro: "What these systems are and how they fail. This is the ground your teaching decisions will stand on, and what students will ask you about.",
        modules: ["what-is-genai", "llms", "limits"],
      },
      {
        title: "Teaching with AI",
        intro: "Practical use in your own preparation and in class, followed by the harder question of what assessment should look like now.",
        modules: ["prompting", "ai-for-teaching", "assessment"],
      },
      {
        title: "Research and policy",
        intro: "Use AI in your research without lowering your standards, and set expectations for your students that you can explain and enforce.",
        modules: ["research-verification", "ethics-integrity"],
      },
    ],
    capstone: {
      title: "Redesign one assignment and write its AI policy",
      brief: "Take one assignment you teach, test it against current AI tools, redesign it so it measures what you intend, and write the AI policy that goes with it.",
      steps: [
        "Paste the assignment prompt into two AI assistants and grade the results with your rubric.",
        "Decide what the assignment is meant to show about student learning.",
        "Redesign it: add process evidence, an in-class component, personal context, or a permitted and disclosed AI step.",
        "Write a policy paragraph: what's allowed, what isn't, and how students should disclose AI use.",
        "Share the redesign with a colleague or the tutor and revise once.",
      ],
      checklist: [
        "You recorded how well AI did on the original assignment.",
        "The redesign states what learning it measures.",
        "The policy is specific enough that a student could follow it.",
        "Students have a clear way to disclose AI use.",
      ],
    },
  },
  {
    path: "researcher",
    welcome:
      "For graduate students and researchers who want AI to speed up their work without weakening it. The course covers how models reason and fail, then literature search, data analysis and grounded answers, with verification at every step.",
    outcomes: [
      "Choose when a reasoning model helps and when it doesn't.",
      "Run an AI-assisted literature search and verify every source.",
      "Analyze data with AI while checking the code it runs.",
      "Ground AI answers in your own documents and spot when they drift.",
      "Disclose AI use in research in line with journal and university norms.",
    ],
    units: [
      {
        title: "How models think, and fail",
        intro: "Research use demands an accurate picture of what models can and can't do. This unit covers how they work, what reasoning models add, and the failure modes to plan for.",
        modules: ["llms", "reasoning-models", "limits"],
      },
      {
        title: "Research workflows",
        intro: "The core of the course: literature, data and your own documents. Each lesson pairs a workflow with the checks that make it trustworthy.",
        modules: ["research-verification", "data-analysis", "rag"],
      },
      {
        title: "Writing and integrity",
        intro: "Close with writing: where AI helps a researcher's drafts, and the disclosure and integrity norms that apply to publications.",
        modules: ["writing", "ethics-integrity"],
      },
    ],
    capstone: {
      title: "A verified literature map",
      brief: "Use AI tools to map the literature on a question from your field, and keep a verification log that shows every source was checked.",
      steps: [
        "Write a focused research question.",
        "Use two research tools (for example Elicit and ResearchRabbit) to find candidate papers.",
        "Open each paper you keep and confirm the claim you're citing it for.",
        "Group the papers into themes and note one gap.",
        "Write a paragraph disclosing how AI was used, as you would for a journal.",
      ],
      checklist: [
        "At least ten papers, each opened and checked.",
        "The log records any paper that didn't say what the AI claimed.",
        "Themes and the gap are in your own words.",
        "The disclosure names the tools and how you verified their output.",
      ],
    },
  },
  {
    path: "builder",
    welcome:
      "For students who want to build with AI: code, grounded assistants, agents and automations. You'll need some comfort with a computer and ideally a little code, but each lesson explains what it assumes. The tutor can help whenever a concept is new.",
    outcomes: [
      "Explain how LLMs work well enough to design around their limits.",
      "Write prompts for systems, not just chats.",
      "Use AI coding tools and review what they produce.",
      "Build a grounded assistant (RAG) and an agent with tools.",
      "Ship a small automation and evaluate whether it works.",
    ],
    units: [
      {
        title: "Under the hood",
        intro: "Builders need a precise model of the model: tokens, context, reasoning, and how prompts behave when they're part of a system rather than a chat.",
        modules: ["llms", "prompting", "reasoning-models"],
      },
      {
        title: "Building with models",
        intro: "Now build: code with AI, ground a model in your own data, and give it tools. Each lesson ends with something that runs.",
        modules: ["coding", "rag", "agents"],
      },
      {
        title: "Shipping it",
        intro: "Automate a real workflow and work with images, audio and video, then evaluate what you made before others rely on it.",
        modules: ["automation", "multimodal"],
      },
    ],
    capstone: {
      title: "Ship a small, evaluated AI tool",
      brief: "Build a small tool that solves a real problem for you or a club, such as a grounded Q&A over your notes or an automation that saves a weekly chore, and evaluate it honestly.",
      steps: [
        "Write a one-paragraph spec: who it's for, what it does, and what counts as a correct answer.",
        "Build the smallest working version with the tools from this course.",
        "Write ten test cases, including three that should fail or be refused.",
        "Run them, record the results, and fix the worst failure.",
        "Write a short README: how it works, its limits, and what data it uses.",
      ],
      checklist: [
        "The spec defines what correct means.",
        "Ten test cases with recorded results.",
        "At least one failure found and fixed.",
        "The README states the limits and data handling honestly.",
      ],
    },
  },
];

export const guidedPathById = new Map(guidedPaths.map((p) => [p.path, p]));

/** A path's lessons in order, flattened from its units. */
export const pathModules = (p: GuidedPath) => p.units.flatMap((u) => u.modules);
