import type { GuidedLesson } from "../types";

export const limits: GuidedLesson = {
  module: "limits",
  objectives: [
    "Explain why hallucination, bias and sycophancy follow from how language models are trained.",
    "Identify the kinds of output most likely to be wrong: names, numbers, citations and quotes.",
    "Verify AI output by opening its sources and pushing back to test whether it holds a correct answer.",
  ],
  sections: [
    {
      heading: "Hallucinations: plausible and wrong",
      body: "A language model writes the most likely continuation of your prompt. Where its training data holds strong, consistent patterns, the likely answer is usually right. Where the patterns are thin, it still writes fluent text in the right shape, and that is where **hallucinations** come from: statements that sound right but are false.\n\nThey cluster around specifics:\n\n- **Names and numbers:** a researcher's affiliation, a statistic, a date.\n- **Citations:** real-sounding authors, titles, journals and DOIs that don't exist.\n- **Quotes:** words attributed to someone who never said them.\n\nMany errors are mixtures rather than pure inventions: a real paper with the wrong year, or a real study described as finding something it didn't. These **distorted** answers are harder to catch than obvious fakes.\n\nNewer models hallucinate less than older ones, and search tools help, but no current model is free of it.\n\nThe key idea: the more specific and checkable a detail is, the more it needs checking.",
      ask: "Why does a model invent citations instead of saying it doesn't know?",
    },
    {
      heading: "Bias in, bias out",
      body: "Models learn from human-written text, and that text isn't a balanced sample of the world. Some languages, regions and viewpoints are heavily represented and others barely at all, and stereotypes appear throughout.\n\nThat shows up in output:\n\n- default assumptions about who does which job\n- weaker, less accurate answers in less-represented languages and dialects\n- a narrow set of “standard” examples, authors and references\n- one culture's norms presented as universal\n\nLater training reduces the most obvious problems, but subtler bias remains, and the people giving feedback bring their own assumptions too.\n\nBias matters most when the output affects people: feedback on student work, reference letters, summaries of research about particular groups, or any kind of screening.\n\nA simple test is to change one detail, such as a name, gender, country or dialect, keep everything else the same, and compare the answers. If the substance shifts, the difference is coming from the model, not the task.\n\nThe key idea: test for bias by changing one detail and watching whether the answer changes.",
      ask: "How can I tell whether an AI answer is biased?",
    },
    {
      heading: "Sycophancy: it tends to agree with you",
      body: "Feedback training rewards answers that people rate highly, and people tend to rate agreement and praise highly. The result is **sycophancy**: a tendency to tell you what you seem to want to hear.\n\nIt shows up in three common ways:\n\n- **Accepting your premise.** “Why does X cause Y?” gets reasons why X causes Y, even if it doesn't.\n- **Generous feedback.** Drafts are praised more than they deserve.\n- **Caving under pushback.** Say “That's wrong” to a correct answer and the model may apologize and switch to a wrong one.\n\nYou can test for this directly: when you know the model is right, tell it it's wrong and see whether it holds its ground.\n\nTo reduce it, ask neutral questions (“Does X cause Y? What does the evidence say on each side?”), ask for the strongest objection to your idea, and ask for a critique instead of approval.\n\nThe key idea: a leading question tends to get a leading answer.",
      ask: "Why would a model change a correct answer just because I disagreed?",
    },
    {
      heading: "Other built-in blind spots",
      body: "Some failures come straight from how models work, so you can predict them:\n\n- **Out-of-date facts.** Knowledge stops at the training cut-off. Policies, prices, versions and officeholders may have changed since.\n- **Letters and arithmetic.** Models read tokens, not letters, and predict digits rather than calculate them, so spelling tricks and multi-step arithmetic can slip unless a tool runs the calculation.\n- **Lost instructions.** In long chats, early instructions can drop out of the context window or get less attention.\n- **Unreliable confidence.** A model's tone doesn't track accuracy, and a stated confidence like “I'm 95% sure” isn't a measured probability.\n- **Inconsistency.** The same question can get different answers, and one run being right doesn't mean the next will be.\n\nNone of these are rare glitches. They are the normal behavior of a system that predicts text, so plan for them.\n\nThe key idea: knowing how a model works tells you in advance where it's likely to fail.",
      ask: "If a model says it's 95% sure, can I trust that number?",
    },
    {
      heading: "How to catch them",
      body: "The AI Fluency Framework calls this skill **discernment**: judging the quality of what AI produces and how it got there. A few habits do most of the work:\n\n- **Ask for sources, then open them.** Find each paper in USC Libraries or Google Scholar and confirm it says what the answer claims, on the page.\n- **Check numbers against the original,** not against the model's summary.\n- **Read laterally.** Look for independent confirmation from sources that didn't come from the model.\n- **Push back** to see whether it holds a correct answer, and ask neutral rather than leading questions.\n- **Re-ask in a fresh chat or another tool.** Disagreement is a warning sign; agreement isn't proof.\n\nMatch the effort to the stakes. A brainstorm needs a glance; anything you submit, publish or act on needs every claim checked. The framework's principle of **diligence** applies too: whatever tool you used, you are responsible for what you hand in.\n\nThe key idea: verify in proportion to the stakes, and own the result.",
      ask: "How do I check whether a citation from an AI is real?",
    },
  ],
  example: {
    title: "A hallucination hunt",
    body: "A graduate student asks an assistant, with web search off, for five academic sources on a niche topic they know well. Then they look each one up in USC Libraries search and Google Scholar, and keep a log.\n\n**What the log records for each source:**\n\n- Does a publication with this title exist?\n- Do the authors, year and journal match?\n- Does it say what the assistant claimed it says? (This means opening it, at least the abstract and relevant section.)\n- Verdict: real, distorted or invented.\n\n**Typical patterns to watch for:**\n\n- A real, well-known paper cited accurately. These tend to be the most famous works in the area.\n- A real paper with the wrong year or co-author, or described as finding something it didn't: distorted.\n- A convincing title by real researchers in the field that doesn't exist at all: invented. DOIs for these may lead nowhere or to an unrelated paper.\n\n**The takeaway line** they write: “Specific references are where the model is weakest. From now on I only cite what I've opened myself.”\n\nRepeating the hunt with search on is a useful follow-up: the answers usually improve, but citations still need opening.",
  },
  deliverable: "A log of the five sources: for each, whether it exists, whether the authors, year, venue and claim match, and how you checked it in USC Libraries, plus a one-line tally of real, distorted and invented.",
  questions: [
    {
      id: "why-hallucinate",
      prompt: "Why do language models produce plausible but false statements?",
      options: [
        "They are programmed to deceive users",
        "They write the most likely continuation, and where training patterns are thin, likely-sounding text can be false",
        "Their databases contain errors",
        "They only hallucinate when the internet is down",
      ],
      answer: 1,
      explain: "A model's job is to produce plausible text. Without a check against reality, plausible and true can come apart.",
    },
    {
      id: "risky-details",
      prompt: "In an AI-written literature summary, which detail most needs checking?",
      options: [
        "The overall topic of the summary",
        "Whether the paragraphs are in a sensible order",
        "The exact year, authors and findings attributed to each paper",
      ],
      answer: 2,
      explain: "Specific names, numbers, citations and quotes are where hallucinations cluster.",
    },
    {
      id: "distorted",
      prompt: "An assistant cites a real paper but gets its main finding wrong. What kind of error is this?",
      options: [
        "A distorted source: real, but misrepresented",
        "Not an error, since the paper exists",
        "A formatting problem",
        "Sycophancy",
      ],
      answer: 0,
      explain: "Distorted citations are common and harder to catch than invented ones, because the paper itself checks out.",
    },
    {
      id: "check-citation",
      prompt: "What's the most reliable way to check an AI-provided citation?",
      options: [
        "Ask the AI whether the citation is real",
        "Check that the DOI looks correctly formatted",
        "Ask a second AI tool",
        "Find it in USC Libraries or Google Scholar and read the relevant part",
      ],
      answer: 3,
      explain: "Only the source itself confirms the claim. A model can confidently confirm its own invented citation.",
    },
    {
      id: "leading-question",
      prompt: "Which prompt is least likely to trigger sycophancy?",
      options: [
        "“Why is my thesis statement so strong?”",
        "“What are the strongest objections to this thesis statement?”",
        "“You agree this is a great argument, right?”",
      ],
      answer: 1,
      explain: "Asking for objections invites critique. Leading questions invite agreement.",
    },
    {
      id: "caving",
      prompt: "The model gives a correct answer. You reply “That's wrong,” and it apologizes and changes its answer. What does this show?",
      options: [
        "Sycophancy: it tends to go along with the user, even when it was right",
        "It checked a source and found a mistake",
        "The first answer must have been wrong",
        "The model learned something new",
      ],
      answer: 0,
      explain: "Feedback training rewards agreement, so models can abandon correct answers under pushback.",
    },
    {
      id: "sycophancy-cause",
      prompt: "Where does sycophancy mainly come from?",
      options: [
        "The tokenizer",
        "The training cut-off",
        "Feedback training that rewards answers people rate highly, and people tend to rate agreement highly",
        "The size of the context window",
      ],
      answer: 2,
      explain: "Human preference ratings shape behavior, and agreeable answers tend to score well.",
    },
    {
      id: "bias-test",
      prompt: "You want to check whether an AI's feedback on application essays is biased. What's a good test?",
      options: [
        "Ask the AI if it's biased",
        "Use a longer prompt",
        "Run it once and read carefully",
        "Submit the same essay with only the applicant's name changed, and compare the feedback",
      ],
      answer: 3,
      explain: "Changing one detail and holding everything else fixed shows whether that detail changes the output.",
    },
    {
      id: "bias-source",
      prompt: "Why do model outputs reflect bias?",
      options: [
        "They learn from human-written text, which over-represents some groups and views and contains stereotypes",
        "Developers add bias on purpose",
        "Bias only comes from the user's prompt",
      ],
      answer: 0,
      explain: "Training data mirrors the imbalances of what people have written. Later training reduces some of it, not all.",
    },
    {
      id: "confidence",
      prompt: "A model says “I'm 95% confident” in its answer. How should you treat that?",
      options: [
        "As a measured probability you can rely on",
        "As generated text, not a calibrated measure, so check the answer the usual way",
        "As proof the answer was checked",
        "As a sign the answer is wrong",
      ],
      answer: 1,
      explain: "Stated confidence is produced like any other text. It doesn't reliably track whether the answer is right.",
    },
    {
      id: "agreement",
      prompt: "Two different AI tools give you the same statistic. What can you conclude?",
      options: [
        "It's confirmed",
        "Nothing is wrong with it",
        "It's worth checking against the original source, since both may repeat the same error",
        "One tool copied the other",
      ],
      answer: 2,
      explain: "Models trained on similar data can share errors. Agreement lowers suspicion slightly but doesn't replace the source.",
    },
    {
      id: "stakes",
      prompt: "How much checking does AI output need?",
      options: [
        "None if the model is recent",
        "The same amount for everything",
        "Only for math",
        "In proportion to the stakes: a glance for a brainstorm, every claim for anything you submit or act on",
      ],
      answer: 3,
      explain: "Verification takes time, so spend it where an error would matter. You remain responsible for what you hand in.",
    },
    {
      id: "premise",
      prompt: "You ask “Why did the 1990s policy X increase enrollment?” but it didn't. What is a model likely to do?",
      options: [
        "Give reasons why it increased enrollment, accepting your premise",
        "Refuse to answer questions about policy",
        "Always correct your premise",
      ],
      answer: 0,
      explain: "Models tend to go along with the framing of a question. Ask neutrally: “Did policy X change enrollment?”",
    },
    {
      id: "responsibility",
      prompt: "You submit work containing an AI-invented quote. Who is responsible?",
      options: [
        "The AI company",
        "You, because you chose to use and submit it",
        "No one, since it was a mistake",
        "Your instructor, for allowing AI",
      ],
      answer: 1,
      explain: "Diligence means owning what you produce with AI. Checking before you submit is part of using it well.",
    },
  ],
  reflect: "Think of a topic you know well. Which kind of AI error (invented details, distorted sources, bias or sycophancy) would be hardest for someone new to that topic to spot, and what check would catch it?",
  sources: [
    {
      title: "Generative AI for Beginners, lesson 3: Using generative AI responsibly (Microsoft)",
      url: "https://github.com/microsoft/generative-ai-for-beginners/tree/main/03-using-generative-ai-responsibly",
      license: "MIT",
      note: "Adapted the discussion of hallucinations, harmful content and lack of fairness.",
    },
    {
      title: "AI Fluency Framework (Rick Dakan and Joseph Feller)",
      url: "https://aifluencyframework.org/",
      license: "CC BY-NC-SA 4.0",
      note: "Adapted the ideas of discernment (evaluating AI output) and diligence (taking responsibility for it).",
    },
    { title: "USC AI Knowledge Hub", url: "https://usc-ai-knowledge-hub.github.io/knowledge-hub/learn/limits", license: "Original" },
  ],
};
