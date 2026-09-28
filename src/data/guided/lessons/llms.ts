import type { GuidedLesson } from "../types";

export const llms: GuidedLesson = {
  module: "llms",
  objectives: [
    "Describe how a large language model turns text into tokens, relates them with attention and predicts the next token.",
    "Explain what pre-training, fine-tuning and feedback training each give a model.",
    "Diagnose forgotten instructions, outdated facts and miscounted letters by linking each to tokens, the context window or the training cut-off.",
  ],
  sections: [
    {
      heading: "Tokens: how a model reads",
      body: "Before a model sees your text, a **tokenizer** splits it into tokens. Common words are often a single token; rarer or longer words are split into several pieces; spaces and punctuation are folded into tokens too. Each token becomes a number, and each number is then turned into an **embedding**: a long list of numbers the network can calculate with.\n\nThis has practical effects:\n\n- **Letters are hidden.** A model might see “straw” + “berry”, not s-t-r-a-w-b-e-r-r-y, so counting letters, spelling backwards or making anagrams can trip it up.\n- **Limits and prices are in tokens.** Context windows, output limits and API pricing are all counted in tokens, usually with input and output counted separately.\n- **Languages differ.** Tokenizers are usually built from English-heavy text, so many other languages need more tokens to say the same thing.\n\nThe key idea: the model works with tokens, not letters or whole words.",
      ask: "Why do language models struggle to count the letters in a word?",
    },
    {
      heading: "Attention: relating tokens to each other",
      body: "Modern LLMs are **transformers**: a stack of layers that repeatedly refine each token's embedding. The key step in each layer is **attention**. For every token, attention weighs how relevant each other token in the context is, and mixes in information from the ones that matter most.\n\nTake “The trophy didn't fit in the suitcase because it was too big.” To handle “it”, the model needs to connect it to “trophy”, not “suitcase”. Attention is the mechanism that lets distant words influence each other like this. Each layer has several attention “heads”, which learn to pick up different kinds of relationships.\n\nIn a model that generates text, each position can only attend to the tokens before it, since the later ones haven't been written yet. After the final layer, the model turns the last position into a probability for every possible next token.\n\nTransformers also process all the tokens of an input in parallel, which made training on very large datasets practical.\n\nThe key idea: attention is how any part of the input can shape the next token.",
      ask: "What does attention actually do inside a transformer?",
    },
    {
      heading: "Pre-training, fine-tuning and feedback",
      body: "A chat model goes through several stages of training.\n\n- **Pre-training.** The model learns to predict the next token across a huge collection of text. It's self-supervised: the text itself supplies the right answers, so no one has to label it. This is where the model picks up grammar, facts, writing styles and patterns of reasoning. The result is a **base model**: it continues text well, but it isn't an assistant. Ask it a question and it might just continue with more questions.\n- **Fine-tuning.** The base model is trained further on examples of instructions paired with good responses, so it learns to follow requests, use formats and hold a conversation.\n- **Feedback training.** People (and sometimes other models) compare responses, and the model is trained toward the preferred ones. Reinforcement learning from human feedback (RLHF) is one well-known method. This makes answers more helpful and safer, but it can also reward answers that simply please the rater.\n\nThe key idea: pre-training gives knowledge and language; later training shapes behavior.",
      ask: "What's the difference between a base model and a chat assistant?",
    },
    {
      heading: "The context window",
      body: "The **context window** is everything the model can see at once: the system instructions set by the app, the conversation so far, any files or pasted text, tool results, and the reply it is writing. It is measured in tokens, and every model has a maximum.\n\nThe model has no memory outside this window. Each reply is computed fresh from what's in it. When a conversation grows past the limit, the app has to drop, trim or summarize older material, and that's when early instructions and details quietly disappear.\n\nEven inside the limit, long contexts aren't used evenly. Details buried in the middle of a very long input are more likely to be overlooked than those near the start or end.\n\nPractical habits:\n\n- Restate key instructions when a chat gets long.\n- Start a fresh chat for a new task.\n- Paste the relevant section rather than the whole document.\n\nThe key idea: if it isn't in the window, the model can't use it.",
      ask: "Why does a model forget my instructions in a long conversation?",
    },
    {
      heading: "The training cut-off",
      body: "Pre-training data is collected up to a certain date, the **training cut-off**. The model has no knowledge of anything after it unless a tool, such as web search or an uploaded document, places that information in the context window.\n\nThis causes quieter problems too:\n\n- **Outdated facts.** A policy, software version, price or officeholder may have changed since the cut-off, and the model will state the old one confidently.\n- **Thin coverage near the cut-off.** Events shortly before the cut-off were often written about less at the time, so the model's picture of them can be patchy.\n- **Guessing about the present.** Asked about recent events without tools, a model may fill in something plausible instead of saying it doesn't know. It may not even be sure of its own cut-off date.\n\nWhen you need something current, turn on search or give it the source, and check dates in its answer.\n\nThe key idea: for anything recent or likely to change, ground the answer in a dated source.",
      ask: "How can a model answer questions about things after its training cut-off?",
    },
  ],
  example: {
    title: "Why the assistant “forgot” the rule",
    body: "A TA pastes a 30-page syllabus into a chat and writes: “Answer students' questions in two sentences and cite the syllabus section number.”\n\n**Early on:** answers are short and cited. The instruction and the syllabus are both in the context window, and the instruction is close by.\n\n**Twenty turns later**, after pasting two more long documents: answers are long and uncited. What happened?\n\n- The conversation may have outgrown the window, so the app trimmed or summarized the oldest part, which held the instruction.\n- Even if nothing was dropped, the instruction is now one short line among thousands of tokens, and long contexts aren't attended to evenly.\n\n**The fix:** start a fresh chat with the instruction first, then only the syllabus, and restate the rule after the syllabus. For questions about one policy, paste just that section.\n\n**Bonus check:** the TA asks “When were the latest university guidelines on AI use updated?” with search off. The model gives a plausible date. Because that date could be after its training cut-off, the TA checks the university website instead.",
  },
  deliverable: "Notes from your context-window probe: the model's first and later answers about the article's opening paragraph, whether it still got them right after twenty turns, and what it said about an event after its training cut-off, with one sentence explaining each result.",
  questions: [
    {
      id: "letters",
      prompt: "A model says “strawberry” has two r's. What's the most likely reason?",
      options: [
        "It sees the word as a few tokens, not as individual letters",
        "It was never trained on the word “strawberry”",
        "Its context window is full",
        "It's deliberately testing you",
      ],
      answer: 0,
      explain: "Tokenization hides individual letters, so letter-level tasks like counting or spelling backwards are unreliable.",
    },
    {
      id: "pricing",
      prompt: "An API charges per token. Which request will usually cost the most?",
      options: [
        "A one-line question with a one-line answer",
        "A 50-page document pasted in with a two-page summary requested",
        "A yes-or-no question",
      ],
      answer: 1,
      explain: "Both input and output are counted in tokens, and a 50-page document is a lot of input tokens.",
    },
    {
      id: "attention",
      prompt: "In “The trophy didn't fit in the suitcase because it was too big”, what lets the model link “it” to “trophy”?",
      options: [
        "The tokenizer",
        "The training cut-off",
        "A dictionary lookup",
        "Attention, which weighs how relevant each earlier token is",
      ],
      answer: 3,
      explain: "Attention lets each token draw on the other tokens that matter to it, even when they're far apart.",
    },
    {
      id: "causal",
      prompt: "When a model is generating text, which tokens can each position attend to?",
      options: [
        "Only the tokens before it, since later ones haven't been written yet",
        "Every token in the final answer, including ones not yet written",
        "Only the single token immediately before it",
      ],
      answer: 0,
      explain: "Generation goes left to right. Each new token is predicted from everything before it.",
    },
    {
      id: "pretraining",
      prompt: "What is the model learning to do during pre-training?",
      options: [
        "Follow instructions from human-written examples",
        "Look up answers in a database",
        "Predict the next token across a very large collection of text",
        "Rank responses by how helpful they are",
      ],
      answer: 2,
      explain: "Pre-training is self-supervised next-token prediction. Following instructions and preferences come in later stages.",
    },
    {
      id: "base-model",
      prompt: "You type “What causes inflation?” into a base model that hasn't been fine-tuned. What might happen?",
      options: [
        "It refuses, because base models can't read questions",
        "It gives a polished assistant-style answer with headings",
        "It asks you to log in",
        "It continues the text, perhaps with more questions, as if completing a document",
      ],
      answer: 3,
      explain: "A base model continues text. Fine-tuning and feedback training are what turn it into an assistant that answers.",
    },
    {
      id: "feedback-side-effect",
      prompt: "Feedback training rewards answers that people prefer. What's one side effect to watch for?",
      options: [
        "The model can't use tokens any more",
        "The model may lean toward answers that please you rather than ones that are right",
        "The model forgets its pre-training",
      ],
      answer: 1,
      explain: "Raters often prefer agreeable answers, so feedback training can nudge models toward telling you what you want to hear.",
    },
    {
      id: "window-contents",
      prompt: "Which of these is not in the model's context window when it answers you?",
      options: [
        "The conversation so far in this chat",
        "The app's system instructions",
        "A file you uploaded to a different chat last month, with memory features off",
        "The reply it is currently writing",
      ],
      answer: 2,
      explain: "The model can only use what is in the current window. Other chats aren't included unless a memory feature adds them.",
    },
    {
      id: "long-chat",
      prompt: "After a long chat, the model ignores a formatting rule you gave at the start. What's the best fix?",
      options: [
        "Start a fresh chat with the rule up front, or restate the rule now",
        "Type the rule in capital letters in the same long chat, once",
        "Switch off web search",
        "Ask it to try harder",
      ],
      answer: 0,
      explain: "Old instructions may have been trimmed or lost among many tokens. Putting the rule back in view is what works.",
    },
    {
      id: "middle",
      prompt: "You paste a 200-page report but only need chapter 3. What's the best approach?",
      options: [
        "Paste the whole report so the model has everything",
        "Paste chapter 3, plus any short context it needs",
        "Paste the table of contents only",
        "Describe the report from memory",
      ],
      answer: 1,
      explain: "Long contexts aren't used evenly, and the part you need can get lost. Giving only what's relevant keeps it in focus.",
    },
    {
      id: "cutoff",
      prompt: "With search off, you ask about software released after the model's training cut-off. What's most likely?",
      options: [
        "It knows about it, because models update daily",
        "It automatically searches the web",
        "It either says it doesn't know or confidently describes something plausible but unreliable",
      ],
      answer: 2,
      explain: "Nothing after the cut-off is in the model's training. Without a tool fetching information, it can only guess.",
    },
    {
      id: "outdated",
      prompt: "A model tells you a library function's current name. Why should you check the official documentation?",
      options: [
        "Models can't write code",
        "Documentation is always wrong",
        "Function names are random",
        "The name may have changed since the model's training cut-off",
      ],
      answer: 3,
      explain: "Anything that changes over time, like versions, prices or policies, may be out of date in the model's training data.",
    },
    {
      id: "languages",
      prompt: "The same paragraph in English and in another language uses different numbers of tokens. Why does that matter?",
      options: [
        "Token counts affect how much fits in the context window and what API use costs",
        "It means the model can't read the other language",
        "It doesn't matter at all",
      ],
      answer: 0,
      explain: "Limits and pricing are in tokens, so text that needs more tokens fills the window faster and costs more.",
    },
    {
      id: "embedding",
      prompt: "What is an embedding?",
      options: [
        "A hidden instruction inside a prompt",
        "A list of numbers representing a token that the network calculates with",
        "A picture inserted into a document",
        "The model's training cut-off date",
      ],
      answer: 1,
      explain: "Each token is turned into a vector of numbers, and the transformer's layers refine those vectors.",
    },
  ],
  reflect: "Think of a time an AI tool did something odd: forgot what you said, got a recent fact wrong, or fumbled a simple spelling or counting task. Which idea from this lesson (tokens, attention, the context window or the training cut-off) best explains it, and what would you do differently next time?",
  sources: [
    {
      title: "Generative AI for Beginners, lesson 1: Introduction to generative AI and LLMs (Microsoft)",
      url: "https://github.com/microsoft/generative-ai-for-beginners/tree/main/01-introduction-to-genai",
      license: "MIT",
      note: "Adapted the explanation of the tokenizer, next-token prediction and the transformer's attention mechanism.",
    },
    {
      title: "Generative AI for Beginners, lesson 2: Exploring and comparing different LLMs (Microsoft)",
      url: "https://github.com/microsoft/generative-ai-for-beginners/tree/main/02-exploring-and-comparing-different-llms",
      license: "MIT",
      note: "Adapted the ideas of foundation models built by self-supervised training and adapted by fine-tuning, and decoder-only models.",
    },
    { title: "USC AI Knowledge Hub", url: "https://usc-ai-knowledge-hub.github.io/knowledge-hub/learn/llms", license: "Original" },
  ],
};
