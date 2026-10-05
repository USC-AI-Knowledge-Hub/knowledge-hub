import type { GuidedLesson } from "../types";

export const reasoningModels: GuidedLesson = {
  module: "reasoning-models",
  objectives: [
    "Explain what a reasoning model does differently: it writes out intermediate thinking before its final answer.",
    "Decide when a reasoning mode is worth its extra time and cost, and when a standard model is enough.",
    "Check a reasoning model's answer against an independent solution instead of trusting its visible steps.",
  ],
  sections: [
    {
      heading: "Thinking before answering",
      body: "A standard chat model starts writing its answer straight away. Each token it writes gets roughly the same amount of computation, so a hard problem gets no more effort than an easy one.\n\nA **reasoning model** first generates a long stretch of intermediate text, often called **thinking** or **reasoning tokens**. In it, the model works through the problem: breaking it into steps, trying an approach, noticing a mistake, going back and trying another. Only then does it write the final answer, which can draw on all that work because it sits in the model's context.\n\nSince a model does its computation token by token, writing more tokens means spending more computation on the problem. This is sometimes called spending more **test-time compute**: extra effort at the moment of answering, rather than a bigger model.\n\nMany apps show a summary of this thinking, or let you expand it, rather than the full raw text.\n\nThe key idea: a reasoning model spends extra computation by writing out its working before it answers.",
      ask: "Why does writing out more thinking help a model solve harder problems?",
    },
    {
      heading: "Where reasoning comes from",
      body: "The idea started with prompting. Researchers found that asking an ordinary model to “think step by step” before answering, known as **chain-of-thought prompting**, improved results on multi-step problems like word problems and logic puzzles.\n\nReasoning models build this habit in through training. Developers don't publish every detail, but the widely described approach uses **reinforcement learning** on problems with answers that can be checked automatically, such as math with known solutions or code with tests. Reasoning that leads to correct answers is rewarded, so the model learns useful habits: checking its work, trying alternatives, and not stopping at the first idea.\n\nThis explains where they are strongest: problems where a right answer exists and can be verified.\n\nMost assistants now either switch reasoning on automatically when a question looks hard, or let you choose a mode or an effort level. The names differ between products, but the trade-off is the same.\n\nThe key idea: reasoning is a trained skill, strongest on problems with checkable answers.",
      ask: "How is a reasoning model different from telling a normal model to think step by step?",
    },
    {
      heading: "When it's worth the wait",
      body: "Reasoning mode tends to help most on:\n\n- math, statistics and other quantitative problems\n- multi-step logic and planning with constraints, like a schedule that must satisfy several rules\n- finding bugs in code or designing a program\n- analysis that has to weigh several pieces of evidence\n\nIt adds little on quick rewrites, short translations, brainstorming, simple lookups and casual questions. There it is just slower, and it can overcomplicate a simple request.\n\nThe costs are real:\n\n- **Time.** Thinking can take from a few seconds to several minutes.\n- **Money.** On paid APIs, thinking tokens are generally billed as output tokens, even when you only see a summary.\n- **Context.** Thinking takes up room in the context window during the answer.\n\nChoosing a mode is a delegation decision: match the effort to how hard the task is and how much a wrong answer would cost.\n\nThe key idea: use reasoning for problems with several steps, and a standard model for quick language tasks.",
      ask: "How do I decide whether to switch reasoning on for a task?",
    },
    {
      heading: "Still fallible, and the steps aren't proof",
      body: "Reasoning models make fewer mistakes on hard problems, not zero. They still slip on arithmetic, misread the question, or build a long, careful argument on a wrong assumption made early on. A longer chain of steps also means more places for an error to creep in.\n\nThe visible reasoning is persuasive because it looks like a worked solution. But it is generated text, and often a summary. Research has found that a model's stated reasoning doesn't always reflect what actually drove its answer. Neat steps are not evidence that the answer is right.\n\nSo check the answer independently:\n\n- Compare it with your own solution or a known answer.\n- Plug the result back into the problem.\n- Run the code or the calculation yourself.\n- Ask for a check using a different method.\n\nIf two modes disagree, that tells you something is wrong, but agreement doesn't prove either is right.\n\nThe key idea: treat the visible reasoning as a lead to check, not as proof.",
      ask: "If I can see the model's reasoning, why do I still need to check its answer?",
    },
  ],
  example: {
    title: "Same puzzle, two modes",
    body: "A student takes a probability question they've already solved: “Two fair dice are rolled. At least one shows a 6. What is the probability that both show a 6?”\n\n**Their own answer first.** There are 36 equally likely outcomes. Those with at least one 6: six with the first die showing 6, six with the second, minus the one counted twice, so 11. Only one of those is double six. Answer: 1/11.\n\n**Reasoning off.** A quick answer might say 1/6, reasoning that the other die just needs to be a 6. That treats “at least one is a 6” as “the first die is a 6”, which is a different question.\n\n**Reasoning on.** The model takes longer and, in this case, lists the outcomes and reaches 1/11.\n\n**The comparison that matters** is against the student's own answer, not between the two modes. If both modes had said 1/6, agreement would have meant nothing. The student also notes the time each mode took and where the quick answer went wrong: it misread the condition, a classic slip that careful step-by-step work tends to catch.",
  },
  deliverable: "The problem, your own worked answer, the model's answers with reasoning off and on, and a short note on which were right, roughly how long each took, and where any mistake crept in.",
  questions: [
    {
      id: "what-differs",
      prompt: "What does a reasoning model do that a standard chat model doesn't?",
      options: [
        "It looks the answer up in a verified database",
        "It generates intermediate thinking before writing its final answer",
        "It uses a different alphabet of tokens",
        "It never makes mistakes on math",
      ],
      answer: 1,
      explain: "Reasoning models write out working first, which spends more computation on the problem before answering.",
    },
    {
      id: "why-helps",
      prompt: "Why does generating more thinking tokens tend to help on hard problems?",
      options: [
        "Each token involves computation, so more tokens means more computation spent on the problem",
        "Thinking tokens connect the model to the internet",
        "Longer text always sounds more convincing",
      ],
      answer: 0,
      explain: "A model computes one token at a time. Writing out steps gives it more computation and lets later steps use earlier ones.",
    },
    {
      id: "good-fit",
      prompt: "Which task is most likely to benefit from reasoning mode?",
      options: [
        "Rewording an email to sound friendlier",
        "Translating a short greeting",
        "Planning a lab rota that must satisfy six scheduling rules",
        "Suggesting names for a club",
      ],
      answer: 2,
      explain: "Problems with several interacting constraints benefit from step-by-step work. Quick language tasks don't.",
    },
    {
      id: "poor-fit",
      prompt: "You need 200 short product descriptions lightly edited for tone. What's the sensible choice?",
      options: [
        "The highest reasoning setting for every item",
        "A reasoning model, then ask it to explain each edit",
        "No AI at all",
        "A standard model, since the task is simple and reasoning would add time and cost",
      ],
      answer: 3,
      explain: "Light edits don't need multi-step thinking. Reasoning would mostly add delay and, on an API, cost.",
    },
    {
      id: "billing",
      prompt: "On a paid API, how are a reasoning model's thinking tokens usually charged?",
      options: [
        "They're free because you can't see them all",
        "They're generally billed as output tokens",
        "They're charged only if the answer is correct",
      ],
      answer: 1,
      explain: "Thinking is generated output, so it's generally billed as output tokens even when the app only shows a summary.",
    },
    {
      id: "faithful",
      prompt: "A model shows neat, convincing steps leading to its answer. What does that tell you?",
      options: [
        "The answer is proven correct",
        "The model checked its work against a textbook",
        "Nothing about correctness by itself; the steps are generated text and may not reflect what drove the answer",
        "The model used a calculator",
      ],
      answer: 2,
      explain: "Visible reasoning is useful to inspect, but research shows it isn't always a faithful record. Check the answer independently.",
    },
    {
      id: "verify",
      prompt: "What's the best way to check a reasoning model's answer to a problem from your problem set?",
      options: [
        "Compare it against your own worked solution or a known answer",
        "Ask the same model if it's sure",
        "Check whether the reasoning is long",
        "See if a second mode gives the same answer",
      ],
      answer: 0,
      explain: "An independent solution is the real test. Two modes agreeing can still both be wrong.",
    },
    {
      id: "cot",
      prompt: "How does chain-of-thought prompting relate to reasoning models?",
      options: [
        "They are unrelated ideas",
        "Chain-of-thought prompting only works on image models",
        "Reasoning models removed the need to ever write clear prompts",
        "Asking a model to think step by step came first; reasoning models are trained to do this well by default",
      ],
      answer: 3,
      explain: "Prompting for step-by-step thinking improved results, and reasoning models build that behavior in through training.",
    },
    {
      id: "rl",
      prompt: "Why are reasoning models especially strong on math and code?",
      options: [
        "Their training rewards reasoning that reaches answers which can be checked automatically, like known solutions or passing tests",
        "They have a built-in calculator for every step",
        "Math and code use fewer tokens",
      ],
      answer: 0,
      explain: "Reinforcement learning needs a way to tell right from wrong. Math and code provide it, so that's where training is most effective.",
    },
    {
      id: "early-error",
      prompt: "A reasoning model gives a long, careful answer that's wrong. What's a common cause?",
      options: [
        "It ran out of letters",
        "It built every later step on a wrong assumption made early on",
        "Reasoning models never check their work",
        "The answer was too short",
      ],
      answer: 1,
      explain: "A long chain can be internally consistent but rest on a misreading or a wrong early step. Check the starting assumptions.",
    },
    {
      id: "disagree",
      prompt: "Reasoning off and reasoning on give different answers. What should you do?",
      options: [
        "Trust reasoning on; it's always right",
        "Trust reasoning off; it's less likely to overthink",
        "Work out or look up the correct answer yourself, and find where each went wrong",
        "Average the two answers",
      ],
      answer: 2,
      explain: "Disagreement flags a problem but doesn't settle it. An independent check does.",
    },
    {
      id: "delegation",
      prompt: "What's the best way to think about choosing between reasoning and standard mode?",
      options: [
        "A delegation decision: matching the effort to the task's difficulty and the cost of a wrong answer",
        "A permanent setting you choose once",
        "A style preference with no effect on results",
      ],
      answer: 0,
      explain: "Different tasks deserve different modes. Harder, higher-stakes problems justify the extra time and cost.",
    },
    {
      id: "context",
      prompt: "Besides time and money, what else do thinking tokens use up?",
      options: [
        "Your device's storage",
        "Your account's password attempts",
        "Nothing else",
        "Room in the context window while the answer is being produced",
      ],
      answer: 3,
      explain: "Thinking is text in the model's context, so it takes up space alongside your input and the answer.",
    },
  ],
  reflect: "Think of a problem in your own work where a wrong answer would be costly. Would you use a reasoning mode for it, and how would you check the result without relying on the model's own explanation?",
  sources: [
    {
      title: "AI Fluency Framework (Rick Dakan and Joseph Feller)",
      url: "https://aifluencyframework.org/",
      license: "CC BY-NC-SA 4.0",
      note: "Adapted the idea of delegation: deciding how much to hand to AI, and in what mode, based on the task.",
    },
    { title: "USC AI Knowledge Hub", url: "https://studentslearningai.com/learn/reasoning-models", license: "Original" },
  ],
};
