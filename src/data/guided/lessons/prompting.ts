import type { GuidedLesson } from "../types";

export const prompting: GuidedLesson = {
  module: "prompting",
  objectives: [
    "Write a prompt that covers context, task, format, constraints and examples.",
    "Use examples (zero-, one- and few-shot) and cues to steer the shape of an answer.",
    "Improve a weak answer by critiquing it and asking for a revision, instead of starting over.",
  ],
  sections: [
    {
      heading: "A prompt is a brief",
      body: "A language model is a very capable collaborator who knows nothing about your situation: not your class, not your reader, not what you already tried. It fills every gap with a guess, and the guess is usually the most generic answer.\n\nSo think of a prompt as a brief you'd hand a new teaching assistant. A good brief usually covers five things:\n\n- **Context:** who you are, who the output is for, and what it's for.\n- **Task:** the exact job, with a clear verb (summarize, compare, draft, critique).\n- **Format:** the shape you want: five bullets, a table, 150 words.\n- **Constraints:** what to stick to or avoid: level, tone, sources.\n- **Examples:** a short sample of what good looks like.\n\nNot every prompt needs all five. Missing context and missing format cause most weak answers.",
      ask: "Why does a model give generic answers when my prompt is short?",
    },
    {
      heading: "Instructions and content",
      body: "Most useful prompts have two parts: an instruction (what to do) and the content it applies to (the text, data or notes). Keep them visibly separate so the model doesn't confuse your notes with your request.\n\nA simple habit: put the instruction first, then the content between clear markers, then repeat the key instruction at the end if the content is long. For example: “Summarize the article below in three sentences for a first-year student.” followed by the article in quotes, and then “Three sentences, no jargon.”\n\nLong inputs push your instruction far away from where the model starts writing. Restating it at the end, which Microsoft's course calls “doubling down”, helps the model keep it in view.",
      ask: "Why should I repeat the instruction after a long piece of text?",
    },
    {
      heading: "Show, don't just tell: examples and cues",
      body: "A model copies patterns very well. If you show it one or two examples of the output you want, it usually infers the style, length and structure better than any description.\n\n- **Zero-shot:** an instruction and no examples. Fine for simple tasks.\n- **One-shot:** one example of input and output, then your new input.\n- **Few-shot:** several examples. Useful when the pattern is subtle, like a grading style or a citation format.\n\nA **cue** is a lighter version: you start the answer yourself. Ending your prompt with “Top three takeaways:\n1.” nudges the model into a numbered list that begins where you want it to.\n\nExamples are powerful, so choose them carefully. The model copies their flaws too.",
      ask: "What's the difference between one-shot and few-shot prompting?",
    },
    {
      heading: "Iterate like an editor",
      body: "Your first prompt is a draft. When the answer is off, don't start over: say what's wrong and ask for a revision. “Too formal. Cut it to 120 words and use one example from biology.” is faster and more precise than rewriting the whole prompt.\n\nThree moves that help:\n\n- **Ask it to ask you first:** “Before you start, ask me up to three questions about anything you need.” This surfaces missing context.\n- **Give it an out:** “If the article doesn't say, write ‘not stated’.” This reduces invented details.\n- **Save what works:** a prompt that worked once becomes a template you can reuse with new content.\n\nPrompting is a trial-and-error process. You bring the judgment about whether the answer is right; the model brings speed.",
      ask: "How does giving the model an “out” reduce made-up answers?",
    },
  ],
  example: {
    title: "From a lazy prompt to a good brief",
    body: "**Before:** “Summarize this article.”\n\nThe model returns a solid but generic paragraph at an unknown level, with the details it happened to find interesting.\n\n**After:** “I'm a first-year student preparing for a seminar discussion. Summarize the article below for someone who hasn't read it. Use five bullets: the main claim, the evidence, one limitation the authors admit, one question I could raise in discussion, and a one-line takeaway. Plain language, no quotes longer than ten words. If the article doesn't cover one of these, write ‘not stated’.”\n\nWhat changed: context (who it's for and why), a precise task, a fixed format, constraints on language and quotes, and an out for missing information. The answer is now shorter, checkable against the article, and useful for the seminar.",
  },
  deliverable: "Your lazy prompt, your rewritten prompt, both answers side by side, and one sentence on what made the difference.",
  questions: [
    {
      id: "five-parts",
      prompt: "Which of these is not one of the five parts of a good brief?",
      options: ["The model's parameter count", "Context", "Format", "Constraints"],
      answer: 0,
      explain: "A brief covers context, task, format, constraints and examples. How big the model is doesn't belong in the prompt.",
    },
    {
      id: "generic",
      prompt: "Why does a very short prompt usually get a generic answer?",
      options: [
        "The model fills every missing detail with the most typical guess",
        "Short prompts use fewer tokens, so the model tries less hard",
        "Models refuse to write detailed answers to short prompts",
        "Short prompts turn off the model's knowledge",
      ],
      answer: 0,
      explain: "The model doesn't know your audience, purpose or format, so it defaults to the most common version of the answer.",
    },
    {
      id: "few-shot",
      prompt: "You want the model to write feedback in the same style as three comments you've written. What's the best approach?",
      options: [
        "Include your three comments as examples, then ask for feedback on the new work",
        "Describe your style in one word, like “friendly”",
        "Ask for feedback and fix the style afterwards",
        "Use the longest model available",
      ],
      answer: 0,
      explain: "Few-shot prompting shows the pattern. Examples communicate tone, length and structure better than a description.",
    },
    {
      id: "cue",
      prompt: "What does ending a prompt with “Key findings:\n1.” do?",
      options: [
        "It cues the model to continue as a numbered list",
        "It limits the answer to one finding",
        "It tells the model to search for findings online",
        "Nothing; models ignore the end of a prompt",
      ],
      answer: 0,
      explain: "A cue starts the answer for the model, which then continues in that format.",
    },
    {
      id: "out",
      prompt: "“If the text doesn't say, answer ‘not stated’.” What is this instruction for?",
      options: [
        "It gives the model an acceptable answer when information is missing, so it's less likely to invent one",
        "It makes the answer shorter",
        "It stops the model from reading the text",
        "It forces the model to search the web",
      ],
      answer: 0,
      explain: "Without an out, a model tends to produce something plausible. Giving it permission to say “not stated” reduces fabrication.",
    },
    {
      id: "iterate",
      prompt: "The answer is close but too long and too formal. What's the most efficient next step?",
      options: [
        "Tell it what to change: shorter, less formal, and a target length",
        "Delete the chat and write a completely new prompt",
        "Ask the same prompt again and hope for better luck",
        "Switch to a different AI tool",
      ],
      answer: 0,
      explain: "Specific feedback on a draft is usually faster and more precise than starting over.",
    },
    {
      id: "separate",
      prompt: "Why keep your instruction visibly separate from the text you paste in?",
      options: [
        "So the model doesn't mistake parts of your notes for the request",
        "Because models can only read one paragraph at a time",
        "To reduce the price of the request",
        "It makes no difference",
      ],
      answer: 0,
      explain: "Clear separation, like quotes or markers around the content, helps the model tell the task from the material.",
    },
    {
      id: "double-down",
      prompt: "You paste a 10-page article. Where should the key instruction go?",
      options: [
        "At the start, and repeated briefly at the end",
        "Only in the middle of the article",
        "Nowhere; the model will work out what you want",
        "In a separate chat",
      ],
      answer: 0,
      explain: "Restating the instruction after long content keeps it close to where the model starts writing.",
    },
    {
      id: "ask-first",
      prompt: "What's a benefit of asking the model to ask you questions before it starts?",
      options: [
        "It surfaces context you forgot to give",
        "It makes the model more confident",
        "It guarantees the answer is correct",
        "It uses fewer tokens",
      ],
      answer: 0,
      explain: "Its questions show you what's missing from your brief. Answering them usually improves the result more than rewording.",
    },
    {
      id: "examples-flaws",
      prompt: "What's a risk of including examples in your prompt?",
      options: [
        "The model may copy their flaws, like errors or an odd length",
        "Models can't read examples",
        "Examples always make answers worse",
        "Examples delete the rest of the prompt",
      ],
      answer: 0,
      explain: "Models imitate examples closely, including their mistakes. Pick examples you'd be happy to see copied.",
    },
    {
      id: "template",
      prompt: "What's a prompt template?",
      options: [
        "A prompt that worked, saved with blanks for new content",
        "A setting that makes the model answer faster",
        "A list of banned words",
        "A way to hide your prompt from the model",
      ],
      answer: 0,
      explain: "Templates let you reuse a proven brief. You swap in new content and get consistent results.",
    },
    {
      id: "judgment",
      prompt: "In prompting, what remains your job rather than the model's?",
      options: [
        "Judging whether the answer is right and fit for purpose",
        "Choosing which tokens the model predicts",
        "Counting the words in the answer",
        "Nothing; a good prompt guarantees a good answer",
      ],
      answer: 0,
      explain: "A strong prompt improves the odds, but you still check the answer against the source and your purpose.",
    },
  ],
  reflect: "Think of a task you did this week that an AI could help with. Write the brief you'd give it, using the five parts. Which part was hardest to fill in, and why?",
  sources: [
    {
      title: "Generative AI for Beginners, lesson 4: Prompt engineering fundamentals (Microsoft)",
      url: "https://github.com/microsoft/generative-ai-for-beginners/tree/main/04-prompt-engineering-fundamentals",
      license: "MIT",
      note: "Adapted the ideas of primary content, zero/one/few-shot examples, cues, templates, doubling down and giving the model an out.",
    },
    { title: "USC AI Knowledge Hub", url: "https://usc-ai-knowledge-hub.github.io/knowledge-hub/learn/prompting", license: "Original" },
  ],
};
