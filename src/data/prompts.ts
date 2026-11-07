/**
 * The prompt library: tested-by-reading starting points for the things students and instructors do
 * most. Each prompt gives the model context, a goal, limits and a format, asks it to show its
 * reasoning where that helps, and comes with the check you should make before trusting the answer.
 * Square brackets mark what you fill in.
 */

export type PromptCategory = "study" | "writing" | "research" | "code" | "teaching" | "work";

export const PROMPT_CATEGORIES: { id: PromptCategory; label: string; blurb: string }[] = [
  { id: "study", label: "Study", blurb: "Learn something, test yourself, plan your time." },
  { id: "writing", label: "Writing", blurb: "Get feedback and structure without handing over your voice." },
  { id: "research", label: "Research", blurb: "Find your way into a topic and check what you read." },
  { id: "code", label: "Code and data", blurb: "Understand, debug and plan." },
  { id: "teaching", label: "Teaching", blurb: "Activities, assignments and feedback for instructors." },
  { id: "work", label: "Work and life", blurb: "Emails, interviews, notes and decisions." },
];

export interface PromptEntry {
  id: string;
  title: string;
  category: PromptCategory;
  /** One sentence: when to reach for it. */
  when: string;
  /** The prompt. [Brackets] are what you fill in; a bracket that starts with "paste" is for a longer text. */
  prompt: string;
  /** What to check before you trust or use the answer. */
  check: string;
}

export const PROMPTS: PromptEntry[] = [
  // Study
  {
    id: "explain-new",
    title: "Explain it to a newcomer",
    category: "study",
    when: "A topic isn't clicking and the textbook assumes too much.",
    prompt:
      "Explain [topic] to me as if I'm a first-year student in [your major]. Start with a one-sentence summary, then give one concrete example, then the three most common misunderstandings. End by asking me one question to check I understood.",
    check: "Compare it with your lecture notes or textbook. If it names a rule, date or formula, look it up before you rely on it.",
  },
  {
    id: "quiz-me",
    title: "Quiz me on my notes",
    category: "study",
    when: "You want practice questions that match what you're actually studying.",
    prompt:
      "Quiz me on [topic] using only the notes below. Ask one question at a time and wait for my answer. After each answer, tell me what I got right and wrong and why before moving on. Start easy and get harder.\n\nNotes: [paste your notes]",
    check: "The questions are only as good as your notes. When it says an answer is wrong, check your notes before you change what you believe.",
  },
  {
    id: "study-plan",
    title: "Plan my study time",
    category: "study",
    when: "An exam is coming and you aren't sure how to split the time.",
    prompt:
      "I have [number of days] days before my [exam or course] on [subject]. I can study about [hours] hours a day. It covers: [topics]. Make a day-by-day plan with spaced review and one catch-up day. If you need more information, ask me questions first.",
    check: "Adjust it to your real week and to how well you already know each topic. A plan you can't keep isn't a plan.",
  },
  {
    id: "find-gaps",
    title: "Find the gaps in my understanding",
    category: "study",
    when: "You've summarized a topic and want to know what you've missed.",
    prompt:
      "Here is my summary of [topic]. Don't rewrite it. List what's missing or wrong, and what a professor would likely ask that I couldn't answer from this.\n\nSummary: [paste your summary]",
    check: "It doesn't know your course. Check what it flags against your syllabus and readings.",
  },
  // Writing
  {
    id: "feedback-not-rewrite",
    title: "Feedback, not a rewrite",
    category: "writing",
    when: "You've written a draft and want to improve it yourself.",
    prompt:
      "Give feedback on the draft below. Don't rewrite it. Tell me the three biggest problems with the argument or structure, quote the lines they come from, and ask me two questions that would help me fix them. My audience is [audience].\n\nDraft: [paste your draft]",
    check: "You decide what to change. If your course restricts AI feedback, check the rules first, and say you used it if they ask.",
  },
  {
    id: "outline",
    title: "Turn my ideas into an outline",
    category: "writing",
    when: "You have scattered thoughts and need a structure.",
    prompt:
      "Here are my rough ideas for [assignment]. Turn them into an outline with a thesis, three or four sections, and the evidence I'd still need to find for each. Don't add claims I haven't made.\n\nIdeas: [paste your ideas]",
    check: "Make sure the thesis is one you believe and can defend. The evidence it suggests is something to look for, not something to cite.",
  },
  {
    id: "tighten",
    title: "Tighten a paragraph, keep my voice",
    category: "writing",
    when: "A paragraph is wordy but you like what it says.",
    prompt:
      "Shorten the paragraph below by about a third without changing my meaning or my voice. Show each change as a list so I can accept or reject it.\n\nParagraph: [paste your paragraph]",
    check: "Read the result aloud. If a change drops something you meant, put it back.",
  },
  {
    id: "counterargument",
    title: "Argue against my thesis",
    category: "writing",
    when: "You want to test an argument before someone else does.",
    prompt:
      "My thesis is: [your thesis]. Give the three strongest objections a skeptical reader would raise. For each one, say what evidence I would need to answer it.",
    check: "Pick the objections that are really strong and answer them with sources you've read. Ignore any that rest on facts you can't confirm.",
  },
  // Research
  {
    id: "map-topic",
    title: "Map a topic before I search",
    category: "research",
    when: "You're starting a paper and don't know the landscape.",
    prompt:
      "I'm starting research on [topic] for [course or paper]. List the main questions researchers disagree about, the key terms I should search for, and the types of sources I should look for. Don't invent citations: if you name a study or an author, say how sure you are, and I'll check it.",
    check: "Treat every name, study and date as a lead. Look each one up in a library database before you use it; AI can invent sources that sound real.",
  },
  {
    id: "read-paper",
    title: "Read a paper with me",
    category: "research",
    when: "A paper is dense and you want a way in.",
    prompt:
      "Help me read this paper. In plain words, explain the research question, the method, the main finding and the limits. Then list three things I should check in the paper itself.\n\nPaper: [paste the abstract or text]",
    check: "Read the paper's own methods and limitations sections. A summary can leave out the caveat that matters.",
  },
  {
    id: "check-claim",
    title: "Check a claim",
    category: "research",
    when: "You found a statistic or claim and want to know if it holds up.",
    prompt:
      "I want to use this claim: [claim]. What would I need to find to verify it? Suggest search terms and the kinds of sources that would confirm or contradict it. Be clear about what you can't verify yourself.",
    check: "Do the checking yourself with primary sources. The model's answer is a plan for checking, not proof.",
  },
  {
    id: "compare-sources",
    title: "Compare two sources",
    category: "research",
    when: "Two readings seem to disagree.",
    prompt:
      "Below are summaries of two sources. List where they agree, where they disagree, and one question each source can't answer.\n\nSource A: [paste source A]\n\nSource B: [paste source B]",
    check: "Go back to the sources to confirm that the disagreement is real and not something the summaries blurred.",
  },
  // Code and data
  {
    id: "explain-code",
    title: "Explain this code",
    category: "code",
    when: "You've inherited code or copied an example you don't follow.",
    prompt:
      "Explain this code line by line for someone who knows [what you already know]. Then tell me what it would do with this input: [example input].\n\nCode: [paste the code]",
    check: "Run it with the example input and see if the output matches. If you can't explain a line yourself, don't hand it in.",
  },
  {
    id: "debug",
    title: "Debug without just handing me the fix",
    category: "code",
    when: "Something fails and you want to learn why.",
    prompt:
      "This code should [what it should do] but instead [what happens]. The error message is: [error message]. Don't just give me a fix: first tell me the most likely cause and how I can confirm it, then suggest a change.\n\nCode: [paste the code]",
    check: "Confirm the cause yourself before you change anything, then run the fix. Check your course's rules on AI help with code.",
  },
  {
    id: "analysis-plan",
    title: "Plan an analysis before I run it",
    category: "code",
    when: "You have data and a question but no plan.",
    prompt:
      "I have a dataset with these columns: [columns]. I want to answer: [your question]. Suggest an analysis plan: what to clean, what to calculate, which chart to use, and what could mislead me. Don't run anything yet.",
    check: "Never paste sensitive or identifiable data into an AI tool. Check every number against the data yourself.",
  },
  {
    id: "write-tests",
    title: "Write tests for a function",
    category: "code",
    when: "You want to know if a function really works.",
    prompt:
      "Write tests for the function below, including edge cases and inputs that should fail. Explain what each test checks.\n\nFunction: [paste the function]",
    check: "Run the tests. A test that passes for the wrong reason is worse than none, so read what each one asserts.",
  },
  // Teaching
  {
    id: "objective-activities",
    title: "From a learning objective to activities",
    category: "teaching",
    when: "You know what students should learn and need ways to practice it.",
    prompt:
      "I teach [course] to [level of students]. Here is a learning objective: [objective]. Suggest three activities that let students practice it, how long each takes, and how I would tell whether it worked.",
    check: "Adapt each activity to your class size and room. Treat them as ideas to test, not a finished lesson plan.",
  },
  {
    id: "assignment-holds-up",
    title: "Make an assignment hold up",
    category: "teaching",
    when: "You worry students could finish it by pasting it into an AI tool.",
    prompt:
      "Here is an assignment: [paste the assignment]. Where could a student complete it by pasting it into an AI tool without learning anything? Suggest changes that keep the learning goal but ask for process, reflection or in-class work. Keep the workload about the same.",
    check: "Try your revised assignment in an AI tool yourself. Say your AI policy clearly on the assignment, not only in the syllabus.",
  },
  {
    id: "feedback-comments",
    title: "Draft feedback tied to a rubric",
    category: "teaching",
    when: "You have a pile of papers and want a starting point for comments.",
    prompt:
      "Here is a rubric and a student paragraph. Draft three specific comments I could give, each tied to a rubric row. I will edit them.\n\nRubric: [paste the rubric]\n\nParagraph: [paste the paragraph]",
    check: "Remove names and anything identifying first, and follow your institution's rules about student work and privacy. You write the final comments.",
  },
  {
    id: "explain-levels",
    title: "Explain a concept three ways",
    category: "teaching",
    when: "You want a version for each audience.",
    prompt:
      "Explain [concept] three ways: for a first-year student, for a student in [field], and for a colleague outside the field. Keep each under 100 words.",
    check: "Check the technical details yourself. Simpler explanations are where errors hide best.",
  },
  // Work and life
  {
    id: "email",
    title: "Draft a professional email",
    category: "work",
    when: "You know what to say but not how to say it.",
    prompt:
      "Draft an email to [recipient, for example my professor] about [purpose]. Tone: polite and direct. Include these facts: [key facts and dates]. Keep it under 120 words. Then list anything I haven't said that they would need in order to reply.",
    check: "Read it as the recipient would. Make sure every date, name and request is right before you send it.",
  },
  {
    id: "interview",
    title: "Practice an interview",
    category: "work",
    when: "You have an interview coming up.",
    prompt:
      "I'm interviewing for [role] at [organization]. Ask me one question at a time, starting with common ones, and wait for my answer. After each answer, tell me what was clear and what was vague. My background: [paste a short summary of your background]",
    check: "Use the feedback to practice, not to script. Interviewers can tell when answers aren't yours.",
  },
  {
    id: "meeting-notes",
    title: "Turn notes into action items",
    category: "work",
    when: "A meeting ended and the notes are a mess.",
    prompt:
      "Turn these notes into a list of decisions and action items, with an owner and a deadline for each. Mark anything unclear as \"unclear\" instead of guessing.\n\nNotes: [paste the notes]",
    check: "Confirm owners and deadlines with the people involved. Don't paste confidential meeting notes into a public AI tool.",
  },
  {
    id: "decide",
    title: "Think through a decision",
    category: "work",
    when: "You're choosing between options and keep going in circles.",
    prompt:
      "I'm choosing between [options]. My priorities are [priorities]. List the trade-offs for each option, what I might regret about each, and two questions I should answer before deciding.",
    check: "It can organize your thinking but doesn't know your situation. The choice, and the facts behind it, are yours.",
  },
];

export const promptById = new Map(PROMPTS.map((p) => [p.id, p]));

/** The fill-in-the-blank names in a prompt, in order, each once. */
export function blanks(template: string): string[] {
  return [...new Set([...template.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]))];
}

/** Whether a blank wants a longer text, so it gets a bigger box. */
export const isLong = (name: string) => /^paste\b/i.test(name);

/** The prompt with whatever has been typed filled in; blanks left empty stay in brackets so it's clear what's missing. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\[([^\]]+)\]/g, (whole, name: string) => (values[name]?.trim() ? values[name].trim() : whole));
}

/** Prompts matching a search, by title, what they're for, and the prompt text. */
export function searchPrompts(q: string, category: PromptCategory | null): PromptEntry[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  return PROMPTS.filter((p) => (!category || p.category === category) && terms.every((t) => `${p.title} ${p.when} ${p.prompt}`.toLowerCase().includes(t)));
}
