/**
 * Guided quests. Each step pairs a question the tutor answers with notes we
 * wrote, so a small model paraphrases accurate material instead of inventing
 * it. Every step ends with a multiple-choice check graded in code, so a quest
 * works (and teaches) even when the model is weak or not downloaded.
 *
 * Step kinds:
 *  - "learn": ask → tutor answers from notes → check.
 *  - "dojo":  the student writes a prompt for `task`; it's scored against the
 *             rubric in code, the tutor critiques it, then a check.
 *  - "spot":  the student reads an AI answer with one planted error and picks
 *             the wrong claim (the check's options are the claims); the tutor
 *             then explains how to catch it.
 */

export interface Check {
  question: string;
  options: string[];
  /** Index of the one correct option. */
  answer: number;
  /** Shown after answering, right or wrong. */
  explain: string;
}

interface StepBase {
  id: string;
  title: string;
  /** The question the tutor answers, phrased as the student would ask it. */
  ask: string;
  /** Facts the tutor must stick to. Plain sentences; also shown as the reading card. */
  notes: string;
  check: Check;
}

export interface LearnStep extends StepBase {
  kind: "learn";
}

export interface DojoStep extends StepBase {
  kind: "dojo";
  /** What the student's prompt should get an AI to do. */
  task: string;
  /** A stronger prompt for the same task, shown after the critique. */
  stronger: string;
}

export interface SpotStep extends StepBase {
  kind: "spot";
  /** What someone asked the AI. */
  question: string;
  /** The AI's answer. Its claims are the check's options; `check.answer` is the planted error. */
}

export type QuestStep = LearnStep | DojoStep | SpotStep;

export interface Quest {
  id: string;
  title: string;
  blurb: string;
  /** Material Symbols name for the badge. */
  icon: string;
  /** Shape from src/lib/shapes.ts for the badge. */
  shape: "cookie9" | "clover4" | "cookie6" | "sunny" | "cookie4" | "soft12";
  /** A lesson to continue with afterwards. */
  lesson: string;
  steps: QuestStep[];
}

export const XP_FIRST_TRY = 10;
export const XP_RETRY = 5;
export const XP_QUEST_BONUS = 25;

/** The dojo rubric. Also used to score a student's prompt in code (see rubric.ts). */
export const RUBRIC = [
  { id: "context", label: "Role or context", hint: "Say who you are, who it's for, or what it needs to know." },
  { id: "task", label: "Task", hint: "Name the exact job with a clear verb." },
  { id: "format", label: "Format", hint: "Describe the output: a table, five bullets, 150 words." },
  { id: "constraints", label: "Constraints", hint: "Say what to avoid or stick to: level, tone, sources." },
  { id: "examples", label: "Examples", hint: "Show a sample of what good looks like." },
] as const;

export type RubricId = (typeof RUBRIC)[number]["id"];

const RUBRIC_NOTES =
  "A strong prompt usually covers five things. Role or context: who you are, who the output is for, and background the model can't guess. Task: the exact job, with a clear verb. Format: the shape of the output, such as a table, five bullets or 150 words. Constraints: what to avoid or stick to, the level, the tone. Examples: a short sample of what good looks like. Not every prompt needs all five, but missing context and missing format cause most weak answers.";

export const quests: Quest[] = [
  {
    id: "transformer",
    title: "Inside a transformer",
    blurb: "Follow a sentence through the model, from tokens to the next word.",
    icon: "hub",
    shape: "cookie9",
    lesson: "llms",
    steps: [
      {
        kind: "learn",
        id: "tokens",
        title: "Tokens",
        ask: "What is a token, and why doesn't the model just read words?",
        notes:
          "A language model reads text as tokens: common words, pieces of words, punctuation and spaces. A tokenizer splits text using a fixed vocabulary set before training, usually tens of thousands to a couple of hundred thousand entries (Qwen2.5 has about 150,000). Common words are often one token; rarer words split into several pieces. In English a token is roughly three-quarters of a word on average. Context limits and prices are counted in tokens, not words.",
        check: {
          question: "Why might a model miscount the letters in “strawberry”?",
          options: [
            "It sees tokens, which can be chunks of several letters, not single letters",
            "It never learned the alphabet",
            "Letters are removed from text before training",
            "The word is too long for its context window",
          ],
          answer: 0,
          explain: "The model receives word pieces as IDs, so individual letters are hidden inside tokens. Counting letters means reasoning about something it never directly sees.",
        },
      },
      {
        kind: "learn",
        id: "embeddings",
        title: "Embeddings",
        ask: "How does a token become something a network can compute with?",
        notes:
          "Each token ID is looked up in an embedding table and becomes a long list of numbers, a vector. In Qwen2.5 0.5B each token becomes 896 numbers. Training arranges these vectors so tokens used in similar ways end up close together. Attention on its own ignores word order, so the model also adds position information; many modern models rotate the vectors by an angle that depends on each token's position (rotary position embeddings).",
        check: {
          question: "What does an embedding give the model?",
          options: [
            "A vector of numbers for each token, where tokens used in similar ways sit close together",
            "A dictionary definition of each word",
            "A picture of each word",
            "The token's position in alphabetical order",
          ],
          answer: 0,
          explain: "Embeddings are learned vectors. Nearness in that space reflects how tokens are used, which is what later layers build on.",
        },
      },
      {
        kind: "learn",
        id: "attention",
        title: "Attention",
        ask: "What is attention actually doing?",
        notes:
          "Attention lets each token gather information from other tokens. For every token the model computes a query (what am I looking for?), a key (what do I contain?) and a value (what do I pass on?). It compares a token's query with the keys of the other tokens, turns the match scores into weights that add up to one, and takes a weighted mix of their values. That's how “it” in “The trophy didn't fit in the case because it was too small” can draw on “case”. Models run many attention heads in parallel, each free to learn a different kind of relationship. In chat models a token can only look at tokens that came before it.",
        check: {
          question: "In attention, what decides how much one token draws from another?",
          options: [
            "How well its query matches the other token's key",
            "How close the two words are in the dictionary",
            "Which of the two tokens is longer",
            "A fixed grammar rule written by engineers",
          ],
          answer: 0,
          explain: "Query–key matches become weights. Nobody hand-writes them: the model learns which relationships matter during training.",
        },
      },
      {
        kind: "learn",
        id: "layers",
        title: "Layers",
        ask: "Why stack so many layers?",
        notes:
          "A transformer block is attention followed by a small feed-forward network applied to each token, with residual connections that add each part's output back onto its input, and normalization that keeps the numbers stable. Models stack many identical blocks: Qwen2.5 0.5B has 24, and large models have around a hundred. Earlier layers tend to capture local patterns such as grammar; later layers build more abstract features. None of this is written by hand. It's learned during training by nudging the weights to predict text better.",
        check: {
          question: "What's inside one transformer block?",
          options: [
            "Attention, then a feed-forward network, joined by residual connections",
            "A database lookup and a web search",
            "One hand-written rule per grammar concept",
            "A compressed copy of the training data",
          ],
          answer: 0,
          explain: "Every block has the same two parts. Stacking many of them lets the model build more abstract features layer by layer.",
        },
      },
      {
        kind: "learn",
        id: "next-token",
        title: "Next-token prediction",
        ask: "How does the model turn all that into an answer?",
        notes:
          "After the last layer, the model turns the final token's vector into a score for every token in its vocabulary, and softmax turns the scores into probabilities. One token is picked and appended to the text, and the whole process runs again, one token at a time, until the model produces a stop token or reaches a length limit. Pre-training teaches this on huge amounts of text; instruction tuning and feedback from people then shape it into a helpful assistant. Nothing is looked up: the answer is generated from patterns stored in the weights.",
        check: {
          question: "How does a chatbot write a paragraph?",
          options: [
            "It predicts one token at a time, feeding each new token back in",
            "It retrieves a stored paragraph that matches",
            "It writes the whole paragraph at once, then checks it",
            "It searches the web for each sentence",
          ],
          answer: 0,
          explain: "Generation is a loop: predict, pick, append, repeat. That's why answers appear word by word.",
        },
      },
      {
        kind: "learn",
        id: "context",
        title: "The context window",
        ask: "What's a context window, and why do long chats go wrong?",
        notes:
          "The context window is the most tokens a model can consider at once: the hidden instructions, the conversation so far, any files, and its own reply. It ranges from a few thousand tokens in small models to hundreds of thousands or more in large ones. Anything outside the window isn't seen at all. Even inside it, models can pay less attention to material buried in the middle of a long input. Because attention compares tokens with each other, cost grows quickly with length. That's why long chats drift, and why a fresh chat with a short summary often works better.",
        check: {
          question: "A two-hour chat has started ignoring your first instructions. What's the likely cause?",
          options: [
            "Early messages fell out of, or got lost in, the context window",
            "The model got tired",
            "The model learned from you and changed its mind",
            "Your instructions were removed from its training data",
          ],
          answer: 0,
          explain: "The model only sees what fits in its window, and it attends less well to the middle of long inputs. Start fresh with a summary of what matters.",
        },
      },
    ],
  },
  {
    id: "press-send",
    title: "What happens when you press send",
    blurb: "Why the same question gets different answers, and why some are made up.",
    icon: "send",
    shape: "clover4",
    lesson: "what-is-genai",
    steps: [
      {
        kind: "learn",
        id: "wrapping",
        title: "Your message becomes tokens",
        ask: "What happens to my message first?",
        notes:
          "The app wraps your message with hidden instructions (a system prompt) and the earlier conversation, then the tokenizer turns all of it into tokens. The model sees one long sequence of token IDs, with special tokens marking where each speaker's turn starts and ends. The model itself has no memory between messages: each time, the app sends the conversation back in. Memory features work by adding saved notes to that sequence.",
        check: {
          question: "How does a chatbot “remember” what you said three messages ago?",
          options: [
            "The app sends the earlier conversation back in with each new message",
            "The model updates its weights after every message",
            "It stores your chat inside its neural network",
            "It doesn't; it guesses",
          ],
          answer: 0,
          explain: "The weights don't change while you chat. The conversation is re-sent every turn, which is also why very long chats hit the context limit.",
        },
      },
      {
        kind: "learn",
        id: "sampling",
        title: "Sampling",
        ask: "How does the model choose each word?",
        notes:
          "For each position the model outputs a probability for every possible next token. Always taking the most likely one (greedy decoding) tends to sound flat and repetitive, so apps usually sample: they pick at random, weighted by the probabilities. Settings such as top-p limit the choice to the most likely tokens that together cover, say, 90% of the probability, which cuts off strange long-shot picks.",
        check: {
          question: "What does “sampling” mean here?",
          options: [
            "Picking the next token at random, weighted by the model's probabilities",
            "Testing the model on a sample of users",
            "Copying a sample answer from the training data",
            "Reading a sample of the web before answering",
          ],
          answer: 0,
          explain: "A weighted random pick at every step. Likely tokens win most of the time, but not always.",
        },
      },
      {
        kind: "learn",
        id: "temperature",
        title: "Temperature",
        ask: "What is temperature?",
        notes:
          "Temperature reshapes the probabilities before sampling. A low temperature, near 0, sharpens them so the likeliest token almost always wins: good for facts, code and extracting data. A higher temperature, around 1, flattens them so less likely tokens are picked more often: more varied, sometimes more creative, and more error-prone. Temperature doesn't make a model smarter or more accurate; it changes how adventurous its choices are. Many chat apps don't let you change it.",
        check: {
          question: "You want the same precise output each time you extract data from a table. Which temperature?",
          options: ["Low, close to 0", "High, close to 2", "Medium, to balance creativity", "It makes no difference"],
          answer: 0,
          explain: "Low temperature makes the model stick to its most likely tokens, so runs agree more often. It doesn't guarantee the output is correct.",
        },
      },
      {
        kind: "learn",
        id: "variation",
        title: "Why answers vary",
        ask: "Why do I get a different answer when I ask the same thing twice?",
        notes:
          "Because tokens are sampled, one different early choice sends the rest of the answer down a different path. Different chats also carry different context, system prompts change between app versions, and tools that search the web get different results. Variation helps when brainstorming and is a warning sign for facts: if two runs disagree on a fact, at least one of them is wrong, so check a source.",
        check: {
          question: "Two runs give different dates for the same event. What should you conclude?",
          options: [
            "At least one is wrong, so check a reliable source",
            "The second answer is the corrected one",
            "Both are right in different contexts",
            "The model is broken and should be reported",
          ],
          answer: 0,
          explain: "Disagreement between runs is a free signal that the model isn't sure. Neither answer is more trustworthy for coming later.",
        },
      },
      {
        kind: "learn",
        id: "hallucination",
        title: "Why models make things up",
        ask: "Why do models make things up?",
        notes:
          "A model is trained to produce likely-sounding text, not to check facts. When its training data is thin on a topic, it still produces something fluent: a plausible citation, statistic or quote. It usually can't tell you it's unsure, because confident wording isn't the same as knowledge. Grounding it in sources, search results or your own documents reduces made-up answers but doesn't remove them. Specific names, numbers, dates, quotes and references are the riskiest parts of any answer.",
        check: {
          question: "Which part of an AI answer most needs checking?",
          options: [
            "A specific statistic with a source attached",
            "The overall structure of the answer",
            "The tone of the writing",
            "The greeting at the start",
          ],
          answer: 0,
          explain: "Specific, checkable details are where invented material hides, and a source attached to them makes them look more trustworthy than they are.",
        },
      },
    ],
  },
  {
    id: "environment",
    title: "AI and the environment",
    blurb: "What AI really costs in energy and water, and habits that help.",
    icon: "eco",
    shape: "sunny",
    lesson: "limits",
    steps: [
      {
        kind: "learn",
        id: "data-centres",
        title: "Data centres at scale",
        ask: "How much electricity does AI use?",
        notes:
          "The International Energy Agency (IEA) estimates that data centres used about 415 TWh of electricity in 2024, about 1.5% of the world's electricity. That covers all data centres, not only AI, but AI is the fastest-growing part. The IEA projects data centre use will roughly double to about 945 TWh by 2030, with AI the main driver. Estimates like these vary a lot between sources, so treat them as ranges rather than precise figures.",
        check: {
          question: "According to the IEA, roughly what share of the world's electricity did data centres use in 2024?",
          options: ["About 1.5%", "About 15%", "About 0.01%", "About half"],
          answer: 0,
          explain: "About 415 TWh, or roughly 1.5%. Small as a share, large in absolute terms, and projected to roughly double by 2030.",
        },
      },
      {
        kind: "learn",
        id: "one-prompt",
        title: "One prompt",
        ask: "How much energy does one chatbot prompt use?",
        notes:
          "Some companies now publish per-prompt figures. Google reported in August 2025 that the median Gemini Apps text prompt uses about 0.24 Wh of electricity and about 0.26 mL of water, roughly five drops. OpenAI's CEO said in June 2025 that an average ChatGPT query uses about 0.34 Wh. For scale, 0.3 Wh is about what a 10-watt LED bulb uses in two minutes. These are company-reported figures for text prompts, measured in different ways; long reasoning answers, images and especially video use considerably more.",
        check: {
          question: "Google's reported figure for a median Gemini text prompt is closest to…",
          options: [
            "About a quarter of a watt-hour",
            "About 25 kilowatt-hours",
            "About the same as fully charging a laptop",
            "Zero, because it runs in the cloud",
          ],
          answer: 0,
          explain: "About 0.24 Wh, a couple of minutes of an LED bulb. Small per prompt; the totals come from scale and from heavier kinds of generation.",
        },
      },
      {
        kind: "learn",
        id: "training-vs-use",
        title: "Training and everyday use",
        ask: "Is training a model or using it the bigger cost?",
        notes:
          "Training a large model is a big one-off cost: Patterson and colleagues (2021) estimated that training GPT-3 used about 1,287 MWh of electricity. Using a model, called inference, costs little per prompt but happens billions of times, so over a model's life, use can add up to more than training. Location matters too: the same electricity has a much smaller carbon footprint on a clean grid than on a coal-heavy one, and cooling can use a lot of water in some places.",
        check: {
          question: "Why can everyday use add up to more than training?",
          options: [
            "Each prompt is cheap, but there are billions of them",
            "Every prompt retrains the model",
            "Training is free once the data is collected",
            "It can't: training is always the larger cost",
          ],
          answer: 0,
          explain: "Training happens once; inference happens every time anyone uses the model. Scale turns a small number into a large one.",
        },
      },
      {
        kind: "learn",
        id: "habits",
        title: "Habits that help",
        ask: "How can I use AI more efficiently?",
        notes:
          "Pick the smallest model that does the job: a quick rewrite doesn't need a large reasoning model. Don't regenerate blindly; fix the prompt instead, which also gets you a better answer. Batch related questions into one clear message. Use text when text will do, since generating images and especially video takes far more energy. Keep perspective: these habits save energy and your time, and the biggest levers are how companies build, power and cool data centres.",
        check: {
          question: "You need a one-paragraph summary of an article. What's the efficient choice?",
          options: [
            "A fast, small model with one clear prompt",
            "A large reasoning model, regenerated until it's perfect",
            "A generated video that summarizes it",
            "Ten short messages, one sentence at a time",
          ],
          answer: 0,
          explain: "Match the model to the job and get the prompt right the first time. It's quicker for you and lighter on energy.",
        },
      },
      {
        kind: "learn",
        id: "this-tutor",
        title: "This tutor",
        ask: "Where does this tutor run?",
        notes:
          "This tutor's model runs on your own device, inside your browser. After the one-time download, your questions don't go to a data centre, and nothing you type leaves your browser. It isn't free: it uses your device's battery and graphics chip while it answers. Small models also make more mistakes than large ones, so they suit short explanations and practice; use bigger tools when you need depth or up-to-date facts.",
        check: {
          question: "What's true about this on-device tutor?",
          options: [
            "It uses your device's power instead of a data centre's, and it can be wrong",
            "It uses no energy at all",
            "It sends your questions to a server to check them",
            "It's more accurate than large cloud models",
          ],
          answer: 0,
          explain: "Local means private and data-centre-free, not free of cost or error.",
        },
      },
    ],
  },
  {
    id: "history",
    title: "A short history of AI",
    blurb: "Seventy years in five stops, from Dartmouth to ChatGPT.",
    icon: "history_edu",
    shape: "cookie6",
    lesson: "what-is-genai",
    steps: [
      {
        kind: "learn",
        id: "dartmouth",
        title: "1956: a name for the field",
        ask: "Where did the idea of “artificial intelligence” start?",
        notes:
          "The term “artificial intelligence” comes from a 1955 proposal for a summer workshop at Dartmouth College, held in 1956 and organized by John McCarthy, Marvin Minsky, Nathaniel Rochester and Claude Shannon. Its premise was that every aspect of learning could in principle be described precisely enough for a machine to simulate it. Early AI focused on symbols and rules: logic, search and games.",
        check: {
          question: "Where did the field get its name?",
          options: [
            "A 1956 summer workshop at Dartmouth College",
            "IBM's 1997 chess match",
            "The 2017 transformer paper",
            "A 1980s science fiction film",
          ],
          answer: 0,
          explain: "McCarthy coined the term for the Dartmouth proposal. The workshop is usually treated as the founding of AI as a field.",
        },
      },
      {
        kind: "learn",
        id: "perceptron-winters",
        title: "1958 to the 1980s: hype and winters",
        ask: "What were the AI winters?",
        notes:
          "In 1958 Frank Rosenblatt introduced the perceptron, a simple learning machine loosely inspired by neurons that adjusted its weights from examples. Expectations ran far ahead of results. Funding and interest fell sharply in the 1970s after critical reviews, including the UK's 1973 Lighthill report, and again in the late 1980s when expensive rule-based “expert systems” disappointed. These slumps are called AI winters.",
        check: {
          question: "What was an “AI winter”?",
          options: [
            "A period when funding and interest collapsed after hype outran results",
            "A season when computers ran too cold to work",
            "The time it took to train the first neural network",
            "A 1990s project to model the weather with AI",
          ],
          answer: 0,
          explain: "Twice, promises outran what the technology could do, and money and attention dried up. A useful memory whenever hype peaks.",
        },
      },
      {
        kind: "learn",
        id: "backprop",
        title: "1986: backpropagation",
        ask: "What is backpropagation, and why did it matter?",
        notes:
          "In 1986 David Rumelhart, Geoffrey Hinton and Ronald Williams popularized backpropagation: a way to work out how much each weight in a multi-layer network contributed to its error, so every weight can be adjusted a little to reduce it. The idea had earlier roots, but their paper showed networks could learn useful internal representations. Backpropagation is still how today's models are trained.",
        check: {
          question: "What does backpropagation do?",
          options: [
            "Works out how to adjust every weight in a network to reduce its error",
            "Copies a network's answers back into its training data",
            "Runs a network backwards to generate text",
            "Removes layers that aren't needed",
          ],
          answer: 0,
          explain: "It assigns blame for the error to each weight, layer by layer. Training is this step repeated billions of times.",
        },
      },
      {
        kind: "learn",
        id: "deep-blue-alexnet",
        title: "1997 and 2012: chess and images",
        ask: "What changed between Deep Blue and AlexNet?",
        notes:
          "In 1997 IBM's Deep Blue beat world chess champion Garry Kasparov in a six-game match. It relied on specialized hardware searching huge numbers of positions per second and an evaluation tuned with chess experts, not on learning from data the way modern systems do. In 2012 AlexNet, a deep neural network trained on GPUs by Alex Krizhevsky, Ilya Sutskever and Geoffrey Hinton, won the ImageNet image recognition challenge by a wide margin. That result started the deep learning boom: lots of data, big networks and GPUs.",
        check: {
          question: "Why was AlexNet's 2012 win a turning point?",
          options: [
            "It showed deep networks trained on GPUs could beat other methods by a wide margin",
            "It was the first computer to beat a chess champion",
            "It introduced the transformer",
            "It was the first chatbot",
          ],
          answer: 0,
          explain: "Deep Blue was search and hand-tuned rules. AlexNet showed learning from data at scale was the way forward.",
        },
      },
      {
        kind: "learn",
        id: "transformers-chatgpt",
        title: "2017 to 2022: transformers to ChatGPT",
        ask: "How did we get from transformers to ChatGPT?",
        notes:
          "In 2017 researchers at Google published “Attention Is All You Need”, introducing the transformer. It replaced step-by-step recurrent networks with attention, which trains efficiently in parallel on GPUs. OpenAI's GPT-3 (2020) showed that a very large transformer could pick up tasks from a few examples in the prompt. ChatGPT, a GPT model tuned for conversation with feedback from people, was released on November 30, 2022, and reached a mass audience within weeks.",
        check: {
          question: "Which order is right?",
          options: [
            "Transformer paper (2017), GPT-3 (2020), ChatGPT (2022)",
            "GPT-3 (2017), transformer paper (2020), ChatGPT (2022)",
            "ChatGPT (2017), transformer paper (2020), GPT-3 (2022)",
            "Transformer paper (2017), ChatGPT (2020), GPT-3 (2022)",
          ],
          answer: 0,
          explain: "Architecture first, then scale, then tuning for conversation. Five years from paper to a product used by millions.",
        },
      },
    ],
  },
  {
    id: "dojo",
    title: "Prompting dojo",
    blurb: "Write prompts, get them scored against a rubric, and see a stronger version.",
    icon: "sports_martial_arts",
    shape: "cookie4",
    lesson: "prompting",
    steps: [
      {
        kind: "learn",
        id: "rubric",
        title: "The rubric",
        ask: "What makes a prompt good?",
        notes: RUBRIC_NOTES,
        check: {
          question: "Which part of the rubric covers “as a table with three columns”?",
          options: ["Format", "Role or context", "Constraints", "Examples"],
          answer: 0,
          explain: "Format describes the shape of the output. Asking for it up front saves a round of “can you put that in a table?”.",
        },
      },
      {
        kind: "dojo",
        id: "study-prompt",
        title: "Round one: a study partner",
        task: "Get an AI to help you prepare for a biology exam on cellular respiration.",
        ask: "How can I make my prompt stronger?",
        notes: RUBRIC_NOTES,
        stronger:
          "I'm a first-year biology student with an exam on cellular respiration in three days. Act as a patient tutor. Quiz me with 8 short questions, one at a time, starting easy (glycolysis) and getting harder (the electron transport chain). Wait for my answer before giving feedback, and don't tell me the answer until I've tried. Example of the style I want: “What does glycolysis produce from one glucose molecule?”",
        check: {
          question: "In the stronger prompt, which part is a constraint?",
          options: [
            "“Don't tell me the answer until I've tried”",
            "“I'm a first-year biology student”",
            "“Quiz me with 8 short questions”",
            "“Example of the style I want”",
          ],
          answer: 0,
          explain: "It limits what the model may do. The student line is context, “8 short questions” is format, and the sample question is an example.",
        },
      },
      {
        kind: "learn",
        id: "examples",
        title: "Show, don't tell",
        ask: "Why include an example in a prompt?",
        notes:
          "Showing one or two examples of the output you want, called few-shot prompting, is often the fastest way to get a particular style or format. The model copies the pattern: length, tone, structure. Label examples clearly, keep them short, and vary them so the model doesn't copy one too literally.",
        check: {
          question: "Your flashcards keep coming out as long paragraphs. What's the quickest fix?",
          options: [
            "Add two short example cards in the format you want",
            "Ask again and hope for better",
            "Tell it to “be better”",
            "Switch to a bigger model",
          ],
          answer: 0,
          explain: "An example pins down length and structure more precisely than any description.",
        },
      },
      {
        kind: "dojo",
        id: "feedback-prompt",
        title: "Round two: honest feedback",
        task: "Get useful feedback on your cover letter for a campus research assistant job.",
        ask: "How can I make my prompt stronger?",
        notes: RUBRIC_NOTES,
        stronger:
          "You're a hiring manager for a campus psychology lab. Below is the job ad and my cover letter for a research assistant role. List the three biggest problems, most important first, each with a one-sentence fix. Don't rewrite the letter, and keep my voice. Job ad: [paste]. My letter: [paste].",
        check: {
          question: "Why ask for “the three biggest problems, most important first”?",
          options: [
            "It sets a format that keeps the feedback focused and usable",
            "Models can only count to three",
            "It makes the model more polite",
            "It guarantees the feedback is correct",
          ],
          answer: 0,
          explain: "A bounded, ranked list stops the model from burying the one thing that matters under ten minor notes.",
        },
      },
      {
        kind: "learn",
        id: "iterate",
        title: "When the answer misses",
        ask: "What should I do when the first answer is bad?",
        notes:
          "Treat prompting as a conversation. Say what was wrong and what you want instead, for example “shorter, and skip the introduction”, rather than regenerating and hoping. If a chat has drifted, start a fresh one with a better prompt. When you're not sure what context the model needs, ask it to ask you questions first.",
        check: {
          question: "The answer is too long and too basic. What's the best next message?",
          options: [
            "“Shorter, and assume I know the basics of statistics”",
            "Press regenerate until it improves",
            "“That's wrong, try again”",
            "Start over with the same prompt in a new chat",
          ],
          answer: 0,
          explain: "Specific feedback about length and level gives the model something to act on. Regenerating repeats the same guess.",
        },
      },
    ],
  },
  {
    id: "spot",
    title: "Spot the hallucination",
    blurb: "Find the made-up claim hiding in a confident answer.",
    icon: "fact_check",
    shape: "soft12",
    lesson: "research-verification",
    steps: [
      {
        kind: "learn",
        id: "why",
        title: "Confident and wrong",
        ask: "Why do confident answers still go wrong?",
        notes:
          "Language models write fluently whether or not they know something, so a made-up detail reads exactly like a real one. Common forms: invented citations that look properly formatted, real people given the wrong achievements, wrong dates or numbers, and quotes nobody said. Made-up details are often mixed with true ones, which makes the whole answer feel trustworthy.",
        check: {
          question: "What makes hallucinations hard to spot?",
          options: [
            "They're written as fluently as true claims and mixed in with them",
            "They're always in a different font",
            "They only appear in very long answers",
            "Models mark them with a warning",
          ],
          answer: 0,
          explain: "There's no visual tell. The only reliable signal is checking the specific claims.",
        },
      },
      {
        kind: "spot",
        id: "transformer-award",
        title: "Round one: the transformer",
        question: "Who introduced the transformer, and when?",
        ask: "How could I have caught that?",
        notes:
          "The transformer was introduced in the 2017 paper “Attention Is All You Need” by researchers at Google. The 2018 Turing Award went to Yoshua Bengio, Geoffrey Hinton and Yann LeCun for their work on deep learning, not to the transformer's authors. Pairing a real award and a real year with the wrong people is a typical hallucination. To check, search the award's official list of winners.",
        check: {
          question: "Which claim is wrong?",
          options: [
            "The transformer was introduced in the 2017 paper “Attention Is All You Need”.",
            "The paper's authors were researchers at Google.",
            "It replaced recurrent networks with attention, which made training easier to run in parallel.",
            "Its authors received the 2018 Turing Award for it.",
          ],
          answer: 3,
          explain: "The 2018 Turing Award went to Bengio, Hinton and LeCun for deep learning. A real award, a real year, the wrong people.",
        },
      },
      {
        kind: "spot",
        id: "citation",
        title: "Round two: the source",
        question: "Give me a source on how much electricity data centres use.",
        ask: "How do I check whether a citation is real?",
        notes:
          "The International Energy Agency (IEA) publishes estimates of data centre electricity use, including about 415 TWh in 2024 in its 2025 report Energy and AI. The citation “Smith, J. (2023). The Carbon Cost of Chatbots. Nature 612, 45–52” is invented for this exercise: it has every part of a real reference and none of the substance. To check a citation, search its exact title in Google Scholar or the USC Libraries catalog, then open it and find the sentence that supports the claim.",
        check: {
          question: "Which claim is wrong?",
          options: [
            "The International Energy Agency publishes estimates of data centre electricity use.",
            "Its 2025 report Energy and AI estimated data centres used about 415 TWh in 2024.",
            "See also: Smith, J. (2023). “The Carbon Cost of Chatbots.” Nature 612, 45–52.",
            "Estimates vary between sources, so compare more than one.",
          ],
          answer: 2,
          explain: "That reference doesn't exist. Invented citations are among the most common hallucinations: search the exact title before you trust it.",
        },
      },
      {
        kind: "spot",
        id: "chatgpt-first",
        title: "Round three: firsts",
        question: "How did ChatGPT get started?",
        ask: "Why are “firsts” risky claims?",
        notes:
          "OpenAI released ChatGPT on November 30, 2022. It was a GPT model tuned for conversation with feedback from human reviewers, and it reached a mass audience within weeks. It was not the first program to hold a conversation in English: ELIZA, written by Joseph Weizenbaum at MIT in the mid-1960s, did that decades earlier. Claims about the first, the biggest or the only are easy to state and often wrong, so check them.",
        check: {
          question: "Which claim is wrong?",
          options: [
            "OpenAI released ChatGPT on November 30, 2022.",
            "It was built on a GPT model tuned with feedback from human reviewers.",
            "It was the first computer program ever to hold a conversation in English.",
            "It reached a mass audience within weeks.",
          ],
          answer: 2,
          explain: "ELIZA held typed conversations in the 1960s. Superlatives like “first” and “only” deserve a quick search.",
        },
      },
      {
        kind: "learn",
        id: "habits",
        title: "A checking habit",
        ask: "How do I check an AI answer quickly?",
        notes:
          "Check the claims that carry weight: names, numbers, dates, quotes and citations. Open the source and find the sentence that supports the claim; a link that exists isn't the same as a link that says that. Search citation titles in Google Scholar or the library catalog. You can ask the model where each claim comes from, but then verify it yourself. Be most careful with details that sound specific and convenient.",
        check: {
          question: "An AI gives you a citation that fits your argument perfectly. What do you do first?",
          options: [
            "Search the exact title in Google Scholar or the library catalog",
            "Ask the AI whether it's sure",
            "Cite it, since it has page numbers",
            "Ask a different AI to confirm it",
          ],
          answer: 0,
          explain: "Only the source itself can confirm a citation. Asking a model if it's sure gets you another fluent guess.",
        },
      },
    ],
  },
];

export const questById = new Map(quests.map((q) => [q.id, q]));
