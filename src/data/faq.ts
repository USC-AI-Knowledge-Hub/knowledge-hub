import { paths } from "./learn";
import { tools } from "./tools";

/**
 * Questions on the home page. They are written the way people search for them, and the same
 * text goes into the page's structured data, so what search engines read matches what visitors see.
 */
export interface Faq {
  q: string;
  /** Plain text. */
  a: string;
  /** Where to go next. */
  link: { to: string; label: string };
}

const stepCount = (id: string) => {
  const p = paths.find((x) => x.id === id);
  return p ? p.steps.length : 0;
};

export const faqs: Faq[] = [
  {
    q: "How do I start learning to use AI?",
    a: `Pick the path that fits you: Student starter, Faculty path, Research path or Builder path. Each is a short sequence of guided lessons that starts with how AI works and ends with a small project you can use. If you only have half an hour, read “What generative AI actually is” first.`,
    link: { to: "/learn", label: "See the learning paths" },
  },
  {
    q: "I'm a professor and new to AI. Where should I begin?",
    a: `Start with the Faculty path. Its ${stepCount("faculty")} lessons cover how the models work and where they go wrong, how to prompt well, teaching with AI, redesigning assessment, research workflows, and policy and academic integrity. None of it needs coding.`,
    link: { to: "/learn/path/faculty", label: "Open the Faculty path" },
  },
  {
    q: "How can students use AI for coursework without breaking the rules?",
    a: `The Student starter walks through using AI to understand, draft and check your work, then ends with a lesson on integrity. Rules differ by course, so it teaches you to read your syllabus and use AI only in the ways your instructors allow.`,
    link: { to: "/learn/path/student", label: "Open the Student starter" },
  },
  {
    q: "Which AI tools should I use?",
    a: `The tools page reviews ${tools.length} AI tools the same way: what each is best at, where it fails, and what it means for your privacy and your coursework. Filter by the job you are trying to do, such as writing, research, studying or teaching.`,
    link: { to: "/tools", label: "Find the right tool" },
  },
  {
    q: "Is the AI tutor private?",
    a: `The tutor runs a small language model inside your browser, on your own device. After the one-time model download, nothing you type is sent to a server. A small model can be wrong, so the tutor shows the notes it used.`,
    link: { to: "/learn", label: "Try it from any lesson" },
  },
  {
    q: "How often is the video library updated?",
    a: `Every morning. An automated run searches YouTube for each tool, filters out hype and low-quality videos, and sorts what is left by tool and difficulty, so beginners and experienced users each find something to watch.`,
    link: { to: "/watch", label: "Browse the videos" },
  },
];
