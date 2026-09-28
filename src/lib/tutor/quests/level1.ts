import { mc, type Quest } from "./types";

/** Level 1: how AI works. */
export const level1: Quest[] = [
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
        checks: [
          mc(
            "Why might a model miscount the letters in “strawberry”?",
            [
              "It sees tokens, which can be chunks of several letters, not single letters",
              "It never learned the alphabet",
              "Letters are removed from text before training",
              "The word is too long for its context window",
            ],
            "The model receives word pieces as IDs, so individual letters are hidden inside tokens. Counting letters means reasoning about something it never directly sees.",
          ),
          mc(
            "Roughly how many tokens is a 750-word English essay?",
            ["About 1,000", "About 75", "Exactly 750", "About 750,000"],
            "A token is about three-quarters of a word on average in English, so 750 words is roughly 1,000 tokens.",
          ),
          mc(
            "A tool says its limit is 8,000 tokens. What is it counting?",
            [
              "Chunks of text such as common words, word pieces and punctuation",
              "Characters, one per letter",
              "Sentences",
              "Seconds of processing time",
            ],
            "Limits and prices are counted in tokens: the pieces the tokenizer splits text into.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "embeddings",
        title: "Embeddings",
        ask: "How does a token become something a network can compute with?",
        notes:
          "Each token ID is looked up in an embedding table and becomes a long list of numbers, a vector. In Qwen2.5 0.5B each token becomes 896 numbers. Training arranges these vectors so tokens used in similar ways end up close together. Attention on its own ignores word order, so the model also adds position information; many modern models rotate the vectors by an angle that depends on each token's position (rotary position embeddings).",
        checks: [
          mc(
            "What does an embedding give the model?",
            [
              "A vector of numbers for each token, where tokens used in similar ways sit close together",
              "A dictionary definition of each word",
              "A picture of each word",
              "The token's position in alphabetical order",
            ],
            "Embeddings are learned vectors. Nearness in that space reflects how tokens are used, which is what later layers build on.",
          ),
          mc(
            "Which pair of words would likely sit closest together in embedding space?",
            ["“cat” and “kitten”", "“cat” and “cast”", "“cat” and “carburetor”", "“cat” and “the”"],
            "Closeness reflects how words are used, not how they're spelled. “Cast” looks similar but is used very differently.",
          ),
          mc(
            "Why does a transformer add position information to its token vectors?",
            [
              "Attention on its own doesn't know word order",
              "To sort the tokens alphabetically",
              "To make the vocabulary smaller",
              "To remove repeated words",
            ],
            "Without position information, “dog bites man” and “man bites dog” would look the same to attention.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "attention",
        title: "Attention",
        ask: "What is attention actually doing?",
        notes:
          "Attention lets each token gather information from other tokens. For every token the model computes a query (what am I looking for?), a key (what do I contain?) and a value (what do I pass on?). It compares a token's query with the keys of the other tokens, turns the match scores into weights that add up to one, and takes a weighted mix of their values. That's how “it” in “The trophy didn't fit in the case because it was too small” can draw on “case”. Models run many attention heads in parallel, each free to learn a different kind of relationship. In chat models a token can only look at tokens that came before it.",
        checks: [
          mc(
            "In attention, what decides how much one token draws from another?",
            [
              "How well its query matches the other token's key",
              "How close the two words are in the dictionary",
              "Which of the two tokens is longer",
              "A fixed grammar rule written by engineers",
            ],
            "Query–key matches become weights. Nobody hand-writes them: the model learns which relationships matter during training.",
          ),
          mc(
            "In a chat model, which tokens can a token attend to?",
            [
              "Only the tokens that came before it",
              "Only the token right after it",
              "Every token in its training data",
              "Only tokens in the same sentence",
            ],
            "Chat models generate left to right, so each token can look back but never ahead.",
          ),
          mc(
            "Why do models run many attention heads in parallel?",
            [
              "Each head can learn a different kind of relationship between tokens",
              "Each head handles a different user",
              "Extra heads make the vocabulary larger",
              "One head checks the other heads for errors",
            ],
            "One head might track which noun a pronoun refers to while another follows sentence structure. Nobody assigns these roles; they're learned.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "layers",
        title: "Layers",
        ask: "Why stack so many layers?",
        notes:
          "A transformer block is attention followed by a small feed-forward network applied to each token, with residual connections that add each part's output back onto its input, and normalization that keeps the numbers stable. Models stack many identical blocks: Qwen2.5 0.5B has 24, and large models have around a hundred. Earlier layers tend to capture local patterns such as grammar; later layers build more abstract features. None of this is written by hand. It's learned during training by nudging the weights to predict text better.",
        checks: [
          mc(
            "What's inside one transformer block?",
            [
              "Attention, then a feed-forward network, joined by residual connections",
              "A database lookup and a web search",
              "One hand-written rule per grammar concept",
              "A compressed copy of the training data",
            ],
            "Every block has the same two parts. Stacking many of them lets the model build more abstract features layer by layer.",
          ),
          mc(
            "Who decides what each layer does?",
            [
              "Nobody directly: it's learned in training by nudging the weights to predict text better",
              "Linguists write the rules for each layer",
              "The user, through the prompt",
              "Each layer copies rules from a grammar book",
            ],
            "The architecture is designed by people; what each layer computes comes from training.",
          ),
          mc(
            "What does a residual connection do?",
            [
              "Adds a part's output back onto its input",
              "Deletes tokens the model doesn't need",
              "Connects the model to the internet",
              "Stores the conversation between messages",
            ],
            "Each block adds its contribution to what came in, so information can flow through many layers without being lost.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "next-token",
        title: "Next-token prediction",
        ask: "How does the model turn all that into an answer?",
        notes:
          "After the last layer, the model turns the final token's vector into a score for every token in its vocabulary, and softmax turns the scores into probabilities. One token is picked and appended to the text, and the whole process runs again, one token at a time, until the model produces a stop token or reaches a length limit. Pre-training teaches this on huge amounts of text; instruction tuning and feedback from people then shape it into a helpful assistant. Nothing is looked up: the answer is generated from patterns stored in the weights.",
        checks: [
          mc(
            "How does a chatbot write a paragraph?",
            [
              "It predicts one token at a time, feeding each new token back in",
              "It retrieves a stored paragraph that matches",
              "It writes the whole paragraph at once, then checks it",
              "It searches the web for each sentence",
            ],
            "Generation is a loop: predict, pick, append, repeat. That's why answers appear word by word.",
          ),
          mc(
            "What turns the model's scores for every possible next token into probabilities?",
            ["Softmax", "The tokenizer", "The embedding table", "The system prompt"],
            "Softmax turns raw scores into probabilities that add up to one. Then one token is picked.",
          ),
          mc(
            "When does the model stop writing?",
            [
              "When it produces a stop token or reaches a length limit",
              "When it runs out of facts",
              "After exactly one paragraph",
              "When its answer matches one in a database",
            ],
            "A stop token is just another token the model can predict. Apps also cap the length.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "context",
        title: "The context window",
        ask: "What's a context window, and why do long chats go wrong?",
        notes:
          "The context window is the most tokens a model can consider at once: the hidden instructions, the conversation so far, any files, and its own reply. It ranges from a few thousand tokens in small models to hundreds of thousands or more in large ones. Anything outside the window isn't seen at all. Even inside it, models can pay less attention to material buried in the middle of a long input. Because attention compares tokens with each other, cost grows quickly with length. That's why long chats drift, and why a fresh chat with a short summary often works better.",
        checks: [
          mc(
            "A two-hour chat has started ignoring your first instructions. What's the likely cause?",
            [
              "Early messages fell out of, or got lost in, the context window",
              "The model got tired",
              "The model learned from you and changed its mind",
              "Your instructions were removed from its training data",
            ],
            "The model only sees what fits in its window, and it attends less well to the middle of long inputs. Start fresh with a summary of what matters.",
          ),
          mc(
            "What takes up space in the context window?",
            [
              "The hidden instructions, the conversation, attached files and the reply itself",
              "Only your latest message",
              "Only the model's reply",
              "Only attached files",
            ],
            "Everything the model reads or writes in a turn counts toward the window.",
          ),
          mc(
            "You paste a 300-page report into a model with a small window. What happens to the part that doesn't fit?",
            [
              "The model doesn't see it at all",
              "The model summarizes it automatically",
              "It's stored in the model's memory for later",
              "The model reads it more slowly",
            ],
            "Text outside the window is invisible to the model. Some apps cut it off, others refuse; either way it can't be used.",
          ),
        ],
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
        checks: [
          mc(
            "How does a chatbot “remember” what you said three messages ago?",
            [
              "The app sends the earlier conversation back in with each new message",
              "The model updates its weights after every message",
              "It stores your chat inside its neural network",
              "It doesn't; it guesses",
            ],
            "The weights don't change while you chat. The conversation is re-sent every turn, which is also why very long chats hit the context limit.",
          ),
          mc(
            "What is a system prompt?",
            [
              "Hidden instructions the app adds before your message",
              "The first message you type",
              "The model's training data",
              "An error message from the server",
            ],
            "Apps use a system prompt to set the assistant's behaviour. You usually can't see it, but the model reads it every turn.",
          ),
          mc(
            "How do “memory” features in chat apps work?",
            [
              "The app saves notes about you and adds them to what it sends the model",
              "The model retrains on your chats every night",
              "The model grows new layers for each user",
              "Your messages are stored inside the tokenizer",
            ],
            "Memory is text added to the conversation, not a change to the model itself.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "sampling",
        title: "Sampling",
        ask: "How does the model choose each word?",
        notes:
          "For each position the model outputs a probability for every possible next token. Always taking the most likely one (greedy decoding) tends to sound flat and repetitive, so apps usually sample: they pick at random, weighted by the probabilities. Settings such as top-p limit the choice to the most likely tokens that together cover, say, 90% of the probability, which cuts off strange long-shot picks.",
        checks: [
          mc(
            "What does “sampling” mean here?",
            [
              "Picking the next token at random, weighted by the model's probabilities",
              "Testing the model on a sample of users",
              "Copying a sample answer from the training data",
              "Reading a sample of the web before answering",
            ],
            "A weighted random pick at every step. Likely tokens win most of the time, but not always.",
          ),
          mc(
            "What is greedy decoding?",
            [
              "Always picking the single most likely next token",
              "Picking the longest possible token",
              "Charging more for longer answers",
              "Using as much of the context window as possible",
            ],
            "Greedy decoding is predictable but tends to sound flat and repeat itself, which is why apps usually sample.",
          ),
          mc(
            "What does a top-p setting of 0.9 do?",
            [
              "Limits the pick to the likeliest tokens that together cover 90% of the probability",
              "Keeps the top 90 tokens",
              "Makes the model 90% accurate",
              "Uses 90% of the context window",
            ],
            "It trims the long tail of unlikely tokens, so odd picks become rarer.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "temperature",
        title: "Temperature",
        ask: "What is temperature?",
        notes:
          "Temperature reshapes the probabilities before sampling. A low temperature, near 0, sharpens them so the likeliest token almost always wins: good for facts, code and extracting data. A higher temperature, around 1, flattens them so less likely tokens are picked more often: more varied, sometimes more creative, and more error-prone. Temperature doesn't make a model smarter or more accurate; it changes how adventurous its choices are. Many chat apps don't let you change it.",
        checks: [
          mc(
            "You want the same precise output each time you extract data from a table. Which temperature?",
            ["Low, close to 0", "High, close to 2", "Medium, to balance creativity", "It makes no difference"],
            "Low temperature makes the model stick to its most likely tokens, so runs agree more often. It doesn't guarantee the output is correct.",
          ),
          mc(
            "What does raising the temperature do?",
            [
              "Flattens the probabilities, so less likely tokens are picked more often",
              "Makes the model know more",
              "Makes every answer longer",
              "Makes the model search the web",
            ],
            "Higher temperature means more varied choices: sometimes more creative, and more error-prone.",
          ),
          mc(
            "Which statement about temperature is true?",
            [
              "It changes how adventurous the choices are, not how much the model knows",
              "A temperature of 0 guarantees correct answers",
              "A high temperature uses newer training data",
              "It measures how hot the servers run",
            ],
            "Temperature only reshapes the probabilities the model already produced.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "variation",
        title: "Why answers vary",
        ask: "Why do I get a different answer when I ask the same thing twice?",
        notes:
          "Because tokens are sampled, one different early choice sends the rest of the answer down a different path. Different chats also carry different context, system prompts change between app versions, and tools that search the web get different results. Variation helps when brainstorming and is a warning sign for facts: if two runs disagree on a fact, at least one of them is wrong, so check a source.",
        checks: [
          mc(
            "Two runs give different dates for the same event. What should you conclude?",
            [
              "At least one is wrong, so check a reliable source",
              "The second answer is the corrected one",
              "Both are right in different contexts",
              "The model is broken and should be reported",
            ],
            "Disagreement between runs is a free signal that the model isn't sure. Neither answer is more trustworthy for coming later.",
          ),
          mc(
            "Why can one different early word change the whole answer?",
            [
              "Each token is predicted from the ones before it, so the answer follows a new path",
              "The model restarts its training",
              "The app picks a different stored answer",
              "Early words are ignored",
            ],
            "Every choice becomes part of the input for the next one, so small differences grow.",
          ),
          mc(
            "When is variation between runs useful?",
            ["When brainstorming ideas", "When looking up a date", "When extracting numbers from a table", "When quoting a source"],
            "Different runs give you more ideas to choose from. For facts, variation is a warning sign instead.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "hallucination",
        title: "Why models make things up",
        ask: "Why do models make things up?",
        notes:
          "A model is trained to produce likely-sounding text, not to check facts. When its training data is thin on a topic, it still produces something fluent: a plausible citation, statistic or quote. It usually can't tell you it's unsure, because confident wording isn't the same as knowledge. Grounding it in sources, search results or your own documents reduces made-up answers but doesn't remove them. Specific names, numbers, dates, quotes and references are the riskiest parts of any answer.",
        checks: [
          mc(
            "Which part of an AI answer most needs checking?",
            [
              "A specific statistic with a source attached",
              "The overall structure of the answer",
              "The tone of the writing",
              "The greeting at the start",
            ],
            "Specific, checkable details are where invented material hides, and a source attached to them makes them look more trustworthy than they are.",
          ),
          mc(
            "Why does a model produce a fake citation instead of saying it doesn't know?",
            [
              "It's trained to produce likely-sounding text, and a citation-shaped answer is likely",
              "It's programmed to deceive",
              "It copies from a list of fake citations",
              "It knows the real one but hides it",
            ],
            "Fluent text is what training rewards. Without a check against sources, fluent and false look the same.",
          ),
          mc(
            "Does connecting a model to search results stop it making things up?",
            [
              "It reduces made-up answers but doesn't remove them",
              "Yes, completely",
              "No, it makes them more common",
              "Only for maths questions",
            ],
            "Grounding helps, but the model can still misread or go beyond its sources. Check the claims that matter.",
          ),
        ],
      },
    ],
  },
  {
    id: "training",
    title: "How a model learns",
    blurb: "Pre-training, fine-tuning and feedback from people, in plain words.",
    icon: "model_training",
    shape: "cookie6",
    lesson: "llms",
    steps: [
      {
        kind: "learn",
        id: "pretraining",
        title: "Pre-training",
        ask: "What happens when a model is trained?",
        notes:
          "Pre-training is the first and largest stage. The model reads a huge collection of text, much of it from the public web plus books and code, and at each position it tries to predict the next token. At the start its weights are random, so its guesses are nonsense. Each guess is scored, and the weights are adjusted slightly to make the right token a little more likely. Repeated over trillions of tokens, this teaches grammar, facts, styles and some reasoning patterns. The result, called a base model, continues text well but isn't yet a helpful assistant: ask it a question and it may reply with more questions.",
        checks: [
          mc(
            "What task does a model practise during pre-training?",
            [
              "Predicting the next token in huge amounts of text",
              "Answering questions written by teachers",
              "Searching the web",
              "Memorizing a dictionary in order",
            ],
            "Next-token prediction on a huge text collection is where most of a model's knowledge comes from.",
          ),
          mc(
            "You ask a base model, fresh from pre-training, “What is the capital of France?” What might it do?",
            [
              "Continue the text, for example with more quiz questions",
              "Refuse, because it hasn't been told it's allowed to answer",
              "Always reply “Paris” and stop",
              "Ask to be fine-tuned first",
            ],
            "A base model continues text. A list of quiz questions is a likely continuation of a quiz question.",
          ),
          mc(
            "What are a model's weights at the very start of pre-training?",
            [
              "Random, so its guesses are nonsense",
              "Copied from Wikipedia",
              "Set by hand to follow grammar rules",
              "Already tuned to answer questions",
            ],
            "Everything the model can do comes from adjusting those random starting weights.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "loss",
        title: "Learning from mistakes",
        ask: "How does a model actually get better during training?",
        notes:
          "Training needs a number that says how wrong the model was. This is the loss: for next-token prediction it's large when the model gave the right token a low probability and small when it gave it a high one. Backpropagation works out how each weight contributed to the loss, and gradient descent nudges every weight a tiny step in the direction that lowers it. The size of that step is set by the learning rate. Nobody tells the model what a noun or a fact is; what it knows comes from millions of these small corrections. That's also why it absorbs whatever patterns, and errors, are in its data.",
        checks: [
          mc(
            "What is the loss during training?",
            [
              "A number that measures how wrong the model's prediction was",
              "Training data that went missing",
              "The money spent on computers",
              "Tokens that fell out of the context window",
            ],
            "Training is about pushing this number down, one small step at a time.",
          ),
          mc(
            "What does gradient descent do?",
            [
              "Nudges every weight a small step in the direction that lowers the loss",
              "Deletes the weights that caused an error",
              "Adds more training data",
              "Asks a person to fix the answer",
            ],
            "Backpropagation says which way each weight should move; gradient descent takes the step.",
          ),
          mc(
            "A training set repeats a common misconception many times. What's likely?",
            [
              "The model can learn it, because it learns whatever patterns are in the data",
              "The model filters it out automatically",
              "Training stops with an error",
              "The model marks it as false",
            ],
            "The model learns patterns, not truth. Data quality shapes what it believes.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "instruction-tuning",
        title: "Fine-tuning",
        ask: "How does a base model become a chat assistant?",
        notes:
          "After pre-training, developers fine-tune the model on a much smaller set of example conversations: an instruction or question paired with a good response, often written or checked by people. This is called supervised fine-tuning or instruction tuning. It uses the same learning method, but the examples teach a format and a behaviour: answer the question, follow instructions, use a chat layout with turns for each speaker. Fine-tuning mostly shapes how the model uses what it already learned and adds relatively little new knowledge. Organisations also fine-tune models on their own examples to fit a task, such as a house style or a support workflow.",
        checks: [
          mc(
            "What does instruction tuning mainly change?",
            [
              "How the model behaves: following instructions and answering in a chat format",
              "How many facts it knows",
              "The size of its vocabulary",
              "How fast the computer runs it",
            ],
            "Fine-tuning shapes behaviour. Most knowledge still comes from pre-training.",
          ),
          mc(
            "What does instruction-tuning data mostly look like?",
            [
              "Example instructions paired with good responses",
              "Random web pages",
              "Lists of banned words",
              "Photos with captions",
            ],
            "Many examples of the behaviour you want, learned with the same method as pre-training.",
          ),
          mc(
            "A company wants a model to reply in its support team's style. What's a common approach?",
            [
              "Fine-tune it on examples of good support replies",
              "Pre-train a new model on a dictionary",
              "Raise the temperature",
              "Shorten the context window",
            ],
            "Fine-tuning on examples is a good fit for style and format. It's a poor fit for facts that change often.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "rlhf",
        title: "Feedback from people",
        ask: "What is RLHF?",
        notes:
          "Reinforcement learning from human feedback (RLHF) is a further tuning stage. The model writes several answers to the same prompt, and people rank which one is better. Those rankings train a separate reward model that predicts what people prefer. The main model is then adjusted to produce answers the reward model scores highly. This made chat assistants noticeably more helpful and more likely to decline harmful requests, and it was part of how ChatGPT was trained. It has side effects: people tend to rate confident, agreeable answers well, so models can learn to flatter or agree too easily, which is called sycophancy. Some labs also use AI feedback guided by written principles.",
        checks: [
          mc(
            "In RLHF, what do people do?",
            [
              "Compare answers and rank which is better",
              "Write every answer the model will ever give",
              "Label each token by hand",
              "Delete bad training data",
            ],
            "Ranking is quicker than writing perfect answers, and it captures preferences that are hard to describe.",
          ),
          mc(
            "What does the reward model learn?",
            [
              "To predict which answers people would prefer",
              "To pay the people who rank answers",
              "To search the web for facts",
              "To count tokens",
            ],
            "The reward model stands in for the human raters, so the main model can be tuned against it at scale.",
          ),
          mc(
            "Why might an assistant agree with you too easily?",
            [
              "People tend to rate agreeable, confident answers highly, and the model learned that",
              "It can read your mind",
              "Agreeing uses fewer tokens",
              "Its temperature is set to zero",
            ],
            "This is sycophancy, a side effect of tuning on human ratings. Push back and ask for evidence.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "cutoff",
        title: "The knowledge cutoff",
        ask: "Why doesn't a model know about recent events?",
        notes:
          "A model's knowledge comes from its training data, which ends at a date called the knowledge cutoff. Events after it are unknown unless the app adds them, for example with web search or documents you upload. Retraining a large model is slow and expensive, so its knowledge can't simply be topped up each day. Asking about something recent can produce a confident answer built from older patterns. A model also often can't reliably tell you its own cutoff or which sources it learned from. When a question depends on recent facts, prices, rules or people's current roles, use a tool that searches and shows its sources, then check them.",
        checks: [
          mc(
            "What is a knowledge cutoff?",
            [
              "The date the model's training data ends",
              "The maximum length of an answer",
              "The point where a model refuses to answer",
              "The day a model is switched off",
            ],
            "Anything after the cutoff is unknown to the model unless the app supplies it.",
          ),
          mc(
            "You ask a model about a rule that changed last month. What's the safe move?",
            [
              "Use a tool that searches current sources, and check them",
              "Trust the answer if it sounds confident",
              "Ask the same model twice",
              "Raise the temperature",
            ],
            "A model without search answers from older patterns, often confidently.",
          ),
          mc(
            "Why don't companies retrain large models every day with the news?",
            [
              "Training a large model is slow and expensive",
              "News isn't allowed in training data",
              "A model can only be trained once",
              "Retraining erases the tokenizer",
            ],
            "That's why apps add search or documents for recent facts instead.",
          ),
        ],
      },
    ],
  },
  {
    id: "reasoning",
    title: "Reasoning models",
    blurb: "Why some models think before they answer, and when that's worth the wait.",
    icon: "psychology",
    shape: "clover4",
    lesson: "reasoning-models",
    steps: [
      {
        kind: "learn",
        id: "chain-of-thought",
        title: "Step by step",
        ask: "Why does asking a model to think step by step help?",
        notes:
          "Researchers found that asking a model to work through a problem step by step before answering, called chain-of-thought prompting, improves results on maths and logic problems (Wei and colleagues, 2022). The reason fits how models work: each token is produced with a fixed amount of computation, so writing out intermediate steps gives the model more tokens to work with, and each step can build on the written result of the last. A short answer to a multi-step question forces the model to jump straight to a conclusion, which is where many errors come from.",
        checks: [
          mc(
            "Why can “work through it step by step” help on a maths problem?",
            [
              "Writing intermediate steps gives the model more tokens to compute with, each building on the last",
              "It makes the model open a calculator website",
              "It changes the model's weights",
              "It lowers the temperature automatically",
            ],
            "Each token gets a fixed amount of computation. More written steps means more computation spent on the problem.",
          ),
          mc(
            "What is chain-of-thought prompting?",
            [
              "Asking the model to write out its reasoning before the answer",
              "Linking several chatbots together",
              "Sending the same prompt many times",
              "Giving the model a chain of documents",
            ],
            "It was one of the first simple prompts shown to improve maths and logic results.",
          ),
          mc(
            "Which question benefits most from step-by-step reasoning?",
            [
              "A multi-step word problem",
              "Translating “hello” into Spanish",
              "Fixing a typo",
              "Naming the capital of Japan",
            ],
            "Single-step questions gain little. Problems with several dependent steps gain the most.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "reasoning-training",
        title: "Trained to reason",
        ask: "What makes a reasoning model different?",
        notes:
          "Reasoning models are trained to produce a long chain of thought on their own before giving a final answer. They're typically trained with reinforcement learning on problems whose answers can be checked automatically, such as maths and code, so the model is rewarded for reaching correct answers and picks up habits like checking its work and trying another approach when stuck. OpenAI's o1 (2024) and DeepSeek-R1 (2025) were early widely known examples, and many assistants now offer a thinking or reasoning mode. Some apps show a summary of the reasoning; others hide it.",
        checks: [
          mc(
            "How are reasoning models commonly trained?",
            [
              "With reinforcement learning on problems whose answers can be checked",
              "By copying one textbook",
              "By giving them a bigger tokenizer",
              "By removing their attention layers",
            ],
            "Rewarding correct final answers teaches the model reasoning habits that get there more often.",
          ),
          mc(
            "What does a reasoning model do before its final answer?",
            [
              "Writes a long chain of thought",
              "Looks the answer up in a database",
              "Asks a human for help",
              "Nothing different from other models",
            ],
            "That extra thinking is what you're waiting for when a reasoning mode takes longer.",
          ),
          mc(
            "Why are maths and code popular training tasks for reasoning models?",
            [
              "Their answers can be checked automatically, so correct reasoning can be rewarded",
              "They're the only subjects on the internet",
              "They need no tokens",
              "People can't solve them",
            ],
            "A test suite or a known answer gives a clear reward signal without a person grading each attempt.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "thinking-time",
        title: "Thinking takes time",
        ask: "When is a reasoning model worth using?",
        notes:
          "Letting a model spend more computation while it answers, for instance by writing more reasoning tokens, is called test-time or inference-time compute. On hard maths, science and coding problems, more thinking often gives better answers. The cost is real: reasoning tokens take time, are usually billed and counted against usage limits even when you don't see them, and use more energy. For simple tasks, such as rewording an email or looking up a definition, extra reasoning adds waiting without improving the result, and occasionally the model overthinks a simple question.",
        checks: [
          mc(
            "What's the trade-off of a reasoning mode?",
            [
              "Often better on hard problems, but slower and more costly",
              "Always faster and cheaper",
              "It never makes mistakes",
              "It only works offline",
            ],
            "Hidden reasoning tokens still take time, money and energy.",
          ),
          mc(
            "Which task is a poor fit for a reasoning model?",
            [
              "Rewording a short email",
              "Debugging a tricky piece of code",
              "A multi-step physics problem",
              "Checking the logic of a proof",
            ],
            "Simple rewrites gain nothing from long thinking; you just wait longer.",
          ),
          mc(
            "What is “test-time compute”?",
            [
              "Computation spent while the model answers, such as extra reasoning tokens",
              "Time spent grading exams",
              "The computation used to train the model",
              "A score on a benchmark",
            ],
            "It's spending more effort per question instead of making the model bigger.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "faithfulness",
        title: "Reading the reasoning",
        ask: "Can I trust the reasoning a model shows me?",
        notes:
          "A model's written reasoning is useful to read, but it isn't a guaranteed window into how the answer was produced. Researchers have found cases where a model reached its answer because of something, such as a hint planted in the prompt, that its written reasoning never mentioned. Reasoning models can also make an error in the middle of a chain and carry it to a confident conclusion. Treat the reasoning like a classmate's worked solution: follow it, check each step that matters, and check the final answer independently when it counts.",
        checks: [
          mc(
            "Is a model's visible reasoning an exact record of how it decided?",
            [
              "No, the written reasoning can leave out what actually drove the answer",
              "Yes, it's a full log of its computation",
              "Yes, if it's longer than a page",
              "Only when the temperature is zero",
            ],
            "Studies have caught models using planted hints without mentioning them in their reasoning.",
          ),
          mc(
            "A reasoning chain looks careful, but one middle step is wrong. What about the final answer?",
            [
              "It can still be wrong, even if it sounds confident",
              "It's right, because the model checked itself",
              "The error is fixed automatically",
              "Only the first step matters",
            ],
            "Errors carry forward. Check the steps that the answer depends on.",
          ),
          mc(
            "What's a good way to use a model's reasoning?",
            [
              "Read it like a worked solution and check the steps that matter",
              "Skip it and trust the answer",
              "Cite it as a source",
              "Assume longer reasoning is always right",
            ],
            "The reasoning helps you find where to check, not whether to check.",
          ),
        ],
      },
    ],
  },
  {
    id: "multimodal",
    title: "Images, audio and video",
    blurb: "How models see pictures, hear speech and make media, and where they slip.",
    icon: "image",
    shape: "sunny",
    lesson: "multimodal",
    steps: [
      {
        kind: "learn",
        id: "seeing",
        title: "How a model sees",
        ask: "How can a language model understand an image?",
        notes:
          "Models that accept images, often called vision-language models, turn a picture into tokens too. A common approach splits the image into small square patches, for example 16 by 16 pixels, turns each patch into a vector with a vision encoder, and passes those vectors into the language model alongside the text tokens. The model then attends across words and image patches together, which is how it can describe a chart or read a sign. Because images are often resized and broken into patches, fine details such as tiny text, exact counts of many objects and precise positions are common sources of mistakes.",
        checks: [
          mc(
            "How does a vision-language model usually take in an image?",
            [
              "It splits the image into patches and turns each into a vector the model attends to",
              "It reads the image's file name",
              "A person writes a description for it",
              "It searches for the image online",
            ],
            "Image patches become vectors, much like tokens, so attention can connect them with the words.",
          ),
          mc(
            "Which task is a vision model most likely to get wrong?",
            [
              "Counting exactly 47 people in a crowd photo",
              "Saying whether a photo shows a dog",
              "Describing the main colours",
              "Naming the objects in a simple scene",
            ],
            "Exact counts of many small objects are a known weak spot.",
          ),
          mc(
            "Why can small text in a screenshot trip up a vision model?",
            [
              "Images are often resized and cut into patches, so fine detail gets lost",
              "Models can't read any text in images",
              "Screenshots are blocked by the app",
              "Text in images uses more electricity",
            ],
            "Crop or zoom to the part that matters, or paste the text directly.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "diffusion",
        title: "Making images",
        ask: "How do image generators make pictures?",
        notes:
          "Most image generators use diffusion. During training, the model sees images with increasing amounts of random noise added and learns to predict and remove that noise, guided by a caption. To generate, it starts from pure noise and removes noise step by step, steered by your prompt, until an image emerges. It doesn't paste together stored pictures; it produces new pixels from learned patterns. Common weaknesses include lettering, hands, and exact counts or layouts, though newer models have improved. Generators can still reproduce well-known styles, characters or logos closely, which raises copyright and trademark questions.",
        checks: [
          mc(
            "How does a diffusion model make an image?",
            [
              "It starts from random noise and removes it step by step, guided by the prompt",
              "It stitches together photos from a database",
              "It draws one pixel for each word of the prompt",
              "It searches the web for a match",
            ],
            "Generation runs the denoising it learned in training, starting from pure noise.",
          ),
          mc(
            "What does a diffusion model learn in training?",
            [
              "To predict and remove noise from images, guided by captions",
              "To memorize every image exactly",
              "To count pixels",
              "To turn images into code",
            ],
            "Learning to undo noise, many times over, is what lets it produce new images from scratch.",
          ),
          mc(
            "Why can a generated image still raise copyright questions?",
            [
              "It can closely reproduce well-known characters, styles or logos",
              "The model owns the copyright to everything it makes",
              "Diffusion always copies one stored image exactly",
              "It can't; generated images are always original",
            ],
            "New pixels can still look very like protected work. Check before you publish.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "audio",
        title: "Speech and voices",
        ask: "How reliable are AI transcripts and voices?",
        notes:
          "Speech recognition turns audio into text. Models such as OpenAI's Whisper (2022) were trained on hundreds of thousands of hours of audio paired with transcripts, and they transcribe many languages well. Accuracy drops with background noise, overlapping speakers, accents that were rare in the training data, and specialist terms, and transcription models can occasionally insert words that were never said. Text-to-speech runs the other way and can sound very natural; voice cloning can copy a person's voice from a short sample, which enables scams and impersonation. Check a transcript before quoting it, and get consent before recording or cloning anyone.",
        checks: [
          mc(
            "Where is an AI transcript most likely to be wrong?",
            [
              "Noisy audio with overlapping speakers and specialist terms",
              "A clear recording of one speaker",
              "Short, common phrases",
              "A slow reading of a simple text",
            ],
            "Noise, crosstalk, unusual accents and jargon are the usual trouble spots.",
          ),
          mc(
            "Why check an AI transcript before quoting it?",
            [
              "It can mishear words and occasionally insert words that weren't said",
              "Transcripts are always perfect, but quoting takes time",
              "Transcripts leave out all punctuation",
              "It's only needed for video",
            ],
            "A misquote is your responsibility, not the tool's. Listen to the passage you quote.",
          ),
          mc(
            "What risk does voice cloning create?",
            [
              "A voice can be copied from a short sample and used to impersonate someone",
              "Speakers lose their own voice",
              "It only works on famous people",
              "It stops transcripts working",
            ],
            "Be wary of urgent calls asking for money or codes, even in a familiar voice.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "video-provenance",
        title: "Video and fakes",
        ask: "How do I tell if a video is real?",
        notes:
          "Video generation extends image methods across time, which is much more demanding: every frame has to stay consistent with the frames around it, and it takes far more computation than text or still images. Generated video and audio have made convincing fakes easier to produce. Visual clues such as odd hands, flickering details or mismatched lip movement help but are becoming less reliable, so check where the media came from: the original uploader, coverage by reliable outlets, and any provenance label. The C2PA standard, backed by companies including Adobe, Microsoft and Google, attaches signed information about how a file was made, but labels can be stripped, so a missing label proves nothing.",
        checks: [
          mc(
            "A shocking video of a public figure is spreading. What's the best first check?",
            [
              "Find where it came from: the original uploader and reliable coverage",
              "Look only for odd-looking hands",
              "Trust it if it's high resolution",
              "Ask a chatbot whether it's real",
            ],
            "Provenance beats pixel-peeping. Clues in the image are getting harder to see.",
          ),
          mc(
            "What does a C2PA content credential do?",
            [
              "Attaches signed information about how a file was made",
              "Stops the file from being copied",
              "Proves the event in the video happened",
              "Removes AI-generated content",
            ],
            "It records how a file was made and edited. It says nothing about whether the scene is true.",
          ),
          mc(
            "A video has no provenance label. What does that tell you?",
            [
              "Nothing on its own, because labels can be stripped or never added",
              "It's definitely real",
              "It's definitely AI-generated",
              "It's illegal to share",
            ],
            "Most media has no label at all. Check the source instead.",
          ),
        ],
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
          "The term “artificial intelligence” comes from a 1955 proposal for a summer workshop at Dartmouth College, held in 1956. John McCarthy coined the term, and he organized the proposal with Marvin Minsky, Nathaniel Rochester and Claude Shannon. Its premise was that every aspect of learning could in principle be described precisely enough for a machine to simulate it. Early AI focused on symbols and rules: logic, search and games.",
        checks: [
          mc(
            "Where did the field get its name?",
            [
              "A 1956 summer workshop at Dartmouth College",
              "IBM's 1997 chess match",
              "The 2017 transformer paper",
              "A 1980s science fiction film",
            ],
            "McCarthy coined the term for the Dartmouth proposal. The workshop is usually treated as the founding of AI as a field.",
          ),
          mc(
            "What approach dominated early AI research?",
            [
              "Symbols and rules: logic, search and games",
              "Huge neural networks trained on GPUs",
              "Chatbots trained on the web",
              "Image generation",
            ],
            "Learning from data at scale came much later. Early AI tried to write intelligence down as rules.",
          ),
          mc(
            "Who coined the term “artificial intelligence”?",
            ["John McCarthy", "Alan Turing", "Geoffrey Hinton", "Frank Rosenblatt"],
            "McCarthy used it in the 1955 Dartmouth proposal. Turing had written about thinking machines earlier, under other names.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "perceptron-winters",
        title: "1958 to the 1980s: hype and winters",
        ask: "What were the AI winters?",
        notes:
          "In 1958 Frank Rosenblatt introduced the perceptron, a simple learning machine loosely inspired by neurons that adjusted its weights from examples. Expectations ran far ahead of results. Funding and interest fell sharply in the 1970s after critical reviews, including the UK's 1973 Lighthill report, and again in the late 1980s when expensive rule-based “expert systems” disappointed. These slumps are called AI winters.",
        checks: [
          mc(
            "What was an “AI winter”?",
            [
              "A period when funding and interest collapsed after hype outran results",
              "A season when computers ran too cold to work",
              "The time it took to train the first neural network",
              "A 1990s project to model the weather with AI",
            ],
            "Twice, promises outran what the technology could do, and money and attention dried up. A useful memory whenever hype peaks.",
          ),
          mc(
            "What was the perceptron?",
            [
              "A simple learning machine, loosely inspired by neurons, that adjusted its weights from examples",
              "The first chess computer",
              "A 1970s report criticizing AI",
              "An expert system for medicine",
            ],
            "Rosenblatt's 1958 perceptron is an early ancestor of today's neural networks.",
          ),
          mc(
            "Why did interest in expert systems collapse in the late 1980s?",
            [
              "They were expensive and disappointed compared with what was promised",
              "They were banned by law",
              "They became too intelligent to control",
              "Computers stopped being sold",
            ],
            "Hand-written rules were costly to build and brittle outside narrow cases.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "backprop",
        title: "1986: backpropagation",
        ask: "What is backpropagation, and why did it matter?",
        notes:
          "In 1986 David Rumelhart, Geoffrey Hinton and Ronald Williams popularized backpropagation: a way to work out how much each weight in a multi-layer network contributed to its error, so every weight can be adjusted a little to reduce it. The idea had earlier roots, but their paper showed networks could learn useful internal representations. Backpropagation is still how today's models are trained.",
        checks: [
          mc(
            "What does backpropagation do?",
            [
              "Works out how to adjust every weight in a network to reduce its error",
              "Copies a network's answers back into its training data",
              "Runs a network backwards to generate text",
              "Removes layers that aren't needed",
            ],
            "It assigns blame for the error to each weight, layer by layer. Training is this step repeated billions of times.",
          ),
          mc(
            "Who popularized backpropagation in 1986?",
            [
              "Rumelhart, Hinton and Williams",
              "McCarthy and Minsky",
              "Krizhevsky and Sutskever",
              "Rosenblatt alone",
            ],
            "The idea had earlier roots, but their 1986 paper made it widely used.",
          ),
          mc(
            "Is backpropagation still used today?",
            [
              "Yes, it's still how today's models are trained",
              "No, expert systems replaced it",
              "Only in chess programs",
              "Only for image models",
            ],
            "From small networks to the largest language models, training still relies on it.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "deep-blue-alexnet",
        title: "1997 and 2012: chess and images",
        ask: "What changed between Deep Blue and AlexNet?",
        notes:
          "In 1997 IBM's Deep Blue beat world chess champion Garry Kasparov in a six-game match. It relied on specialized hardware searching huge numbers of positions per second and an evaluation tuned with chess experts, not on learning from data the way modern systems do. In 2012 AlexNet, a deep neural network trained on GPUs by Alex Krizhevsky, Ilya Sutskever and Geoffrey Hinton, won the ImageNet image recognition challenge by a wide margin. That result started the deep learning boom: lots of data, big networks and GPUs.",
        checks: [
          mc(
            "Why was AlexNet's 2012 win a turning point?",
            [
              "It showed deep networks trained on GPUs could beat other methods by a wide margin",
              "It was the first computer to beat a chess champion",
              "It introduced the transformer",
              "It was the first chatbot",
            ],
            "Deep Blue was search and hand-tuned rules. AlexNet showed learning from data at scale was the way forward.",
          ),
          mc(
            "How did Deep Blue beat Kasparov in 1997?",
            [
              "Specialized hardware searching huge numbers of positions, with an expert-tuned evaluation",
              "A neural network trained on millions of online games",
              "By generating text about chess",
              "By copying Kasparov's own moves",
            ],
            "It was a triumph of search and engineering, not of learning from data.",
          ),
          mc(
            "Which three ingredients did AlexNet bring together?",
            [
              "Lots of data, a big neural network and GPUs",
              "Rules, logic and search",
              "Expert systems, databases and chess",
              "Speech, video and robots",
            ],
            "The same recipe, scaled up enormously, is behind today's models.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "transformers-chatgpt",
        title: "2017 to 2022: transformers to ChatGPT",
        ask: "How did we get from transformers to ChatGPT?",
        notes:
          "In 2017 researchers at Google published “Attention Is All You Need”, introducing the transformer. It replaced step-by-step recurrent networks with attention, which trains efficiently in parallel on GPUs. OpenAI's GPT-3 (2020) showed that a very large transformer could pick up tasks from a few examples in the prompt. ChatGPT, a GPT model tuned for conversation with feedback from people, was released on November 30, 2022, and reached a mass audience within weeks.",
        checks: [
          mc(
            "Which order is right?",
            [
              "Transformer paper (2017), GPT-3 (2020), ChatGPT (2022)",
              "GPT-3 (2017), transformer paper (2020), ChatGPT (2022)",
              "ChatGPT (2017), transformer paper (2020), GPT-3 (2022)",
              "Transformer paper (2017), ChatGPT (2020), GPT-3 (2022)",
            ],
            "Architecture first, then scale, then tuning for conversation. Five years from paper to a product used by millions.",
          ),
          mc(
            "What did GPT-3 show in 2020?",
            [
              "A very large transformer could pick up tasks from a few examples in the prompt",
              "Chess could be solved completely",
              "Images could be classified on GPUs",
              "Rules beat neural networks",
            ],
            "Few-shot learning from the prompt made one model useful for many tasks without retraining.",
          ),
          mc(
            "What did the transformer replace, making training easier to run in parallel?",
            ["Step-by-step recurrent networks", "GPUs", "Tokenizers", "Backpropagation"],
            "Recurrent networks read one token after another. Attention looks at all of them at once, which suits GPUs.",
          ),
        ],
      },
    ],
  },
];
