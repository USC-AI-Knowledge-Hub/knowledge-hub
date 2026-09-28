import type { GuidedLesson } from "../types";

export const whatIsGenai: GuidedLesson = {
  module: "what-is-genai",
  objectives: [
    "Explain how a generative model writes an answer by predicting one token at a time.",
    "Distinguish what a model learned in training from what tools like web search and file upload add when you ask.",
    "Predict when an AI answer is likely to vary or be wrong, and decide when to check it.",
  ],
  sections: [
    {
      heading: "Where generative AI fits",
      body: "Artificial intelligence is the broad field of making computers do tasks that seem to need intelligence. **Machine learning** is the part of AI where a system learns patterns from data instead of following rules a person wrote by hand. **Deep learning** is machine learning with large neural networks made of many layers. **Generative AI** is deep learning used to produce new content: text, images, audio, video or code.\n\nEarly chatbots matched keywords to scripted replies. A modern language model has instead been trained on a huge collection of text, and it writes a new response each time, shaped by the patterns it learned.\n\nIt also helps to separate the **model** from the **product**. ChatGPT, Claude and Gemini are products: apps that wrap one or more models with features like web search, file upload and memory.\n\nThe key idea: generative AI makes new content that follows learned patterns. It is not a search engine looking up a stored answer.",
      ask: "What's the difference between a model and the chatbot app I use?",
    },
    {
      heading: "Trained once, used many times",
      body: "A model is built in two very different phases.\n\n- **Training** happens once, before release. The model reads an enormous dataset and gradually adjusts billions of internal numbers, called parameters or weights, so it gets better at predicting text. This takes a great deal of computing power and time.\n- **Use** (often called inference) happens every time someone sends a prompt. The weights are fixed; the model applies what it learned to your input.\n\nTwo consequences follow. First, the model does not keep a copy of its training documents to look things up in; what it has is a compressed set of patterns. Second, its knowledge stops at a **training cut-off**, the point where its training data ends.\n\nThe model also doesn't learn from your conversation in the moment. It can use your corrections within the current chat, but its weights don't change. Some products add memory features, or may use chats to train future models depending on your settings; that's the product, not the model changing mid-chat.\n\nThe key idea: what the model knows was fixed when it was trained.",
      ask: "If I correct the model, does it learn from that for next time?",
    },
    {
      heading: "One token at a time",
      body: "Language models read and write in **tokens**: whole words, pieces of words, or punctuation.\n\nGiven all the text so far, the model calculates a probability for every token it could write next. One token is picked, added to the text, and the process repeats until the answer is complete. Every answer, however long, is built this way.\n\nAfter “The capital of France is”, one continuation is overwhelmingly likely. After “Suggest a title for my essay”, many continuations are plausible. Chat tools usually pick among likely tokens with some deliberate randomness (a setting often called temperature), so the same question in fresh chats can lead down different paths.\n\nThat's why asking the same question several times is revealing. Parts that stay the same reflect strong patterns in the training data. Parts that change are where the model has many plausible options. But consistency isn't proof: a common misconception can be repeated just as reliably as a fact.\n\nThe key idea: an answer is a chain of likely next tokens, not a retrieved record.",
      ask: "Why do I get a different answer when I ask the same question again?",
    },
    {
      heading: "Fluent is not the same as accurate",
      body: "Training rewards the model for producing text that looks like the text it learned from. That makes it very good at sounding right: correct grammar, the right tone, the familiar structure of an explanation or a citation.\n\nWhat the model doesn't have, by default, is a separate step that checks each claim against reality. When its training data holds strong, consistent patterns, the likely answer is usually the correct one. When the patterns are thin, such as niche topics, recent events, exact numbers, specific quotes or references, it still produces fluent text in the right shape. The result can be a confident, well-written answer that is partly or entirely made up. This is usually called a **hallucination**.\n\nSo tone tells you nothing about accuracy. A wrong date and a right date read the same. Specific, checkable details are the ones most worth checking.\n\nThe key idea: judge an answer by checking its claims, not by how confident it sounds.",
      ask: "Why can't the model tell when it's making something up?",
    },
    {
      heading: "Tools that ground the model",
      body: "Most assistants now put tools around the model:\n\n- **Web search** finds pages and passes their text to the model.\n- **File upload** gives the model your document to read.\n- **Code execution** lets the model write and run a program, for example to do exact arithmetic on a dataset.\n\nIn each case, the tool fetches or computes something, and the result is placed in the model's context, the text it can see while writing. The answer can then draw on that material instead of only on training patterns. This is called **grounding**, and it's how an assistant can tell you about last week's news despite its training cut-off.\n\nGrounding reduces errors but doesn't remove them. The model can misread a source, blend it with its own patterns, or cite a page that doesn't quite say what the answer claims. Open the source when it matters.\n\nThe key idea: know whether an answer came from the model's memory or from a tool, and check the source either way.",
      ask: "How does web search let the model answer questions about recent events?",
    },
  ],
  example: {
    title: "Catching the prediction in the act",
    body: "A student runs the module's activity in three steps.\n\n**1. Same question, three fresh chats.** They ask “What are the three biggest challenges for cities adapting to extreme heat?” The three answers share a core (tree cover, vulnerable residents, energy demand), but the wording, order and third point change each time. The shared core is where the training patterns are strong; the changing parts are where the model had several plausible options.\n\n**2. A recent fact, search off.** They ask what a city council decided at a meeting last week. With search off, a good answer says the model can't know events after its training data. A worse answer invents a plausible decision. Either way, nothing in the model's training covers that meeting.\n\n**3. The same question, search on.** Now the answer cites a news article. The student opens it and confirms the decision is described correctly.\n\n**Their two sentences:** “Without search, the model can only predict what sounds likely, so it can't know recent events. With search, it can answer from a real source, but I still had to open the source to know it was right.”",
  },
  deliverable: "Three answers to the same open-ended question with notes on what stayed the same and what changed, the search-off and search-on answers to a recent-fact question, and two sentences on what the difference tells you.",
  questions: [
    {
      id: "predict-not-retrieve",
      prompt: "You ask a chatbot a question with no tools switched on. What is it doing?",
      options: [
        "Looking up the answer in a stored copy of its training documents",
        "Generating a likely continuation, one token at a time, from patterns learned in training",
        "Searching the web and copying the best result",
        "Forwarding the question to a human expert",
      ],
      answer: 1,
      explain: "Without tools, the model only predicts text from learned patterns. It has no stored library to look answers up in.",
    },
    {
      id: "variation",
      prompt: "You ask the same open-ended question in three fresh chats and get three different answers. What's the main reason?",
      options: [
        "The model learned from your first chat and changed its mind",
        "Each chat is answered by a different company's model",
        "Each next token is picked with some randomness, so the answer can go down different paths",
      ],
      answer: 2,
      explain: "Chat tools sample among likely tokens rather than always picking the single most likely one, so open-ended questions produce varied answers.",
    },
    {
      id: "consistent-not-correct",
      prompt: "You get the same answer in all three fresh chats. What does that tell you?",
      options: [
        "The model has a strong pattern for it, but a widespread misconception can be repeated just as consistently",
        "The answer is definitely correct",
        "The model remembered your earlier chats",
        "The model has switched off its randomness",
      ],
      answer: 0,
      explain: "Consistency shows a strong pattern in the training data, not a verified fact. You still need to check claims that matter.",
    },
    {
      id: "cutoff",
      prompt: "With web search off, an assistant gives a detailed account of a news event from last week. What should you conclude?",
      options: [
        "The model was retrained overnight with the news",
        "It must be right, since it's so detailed",
        "The model searched the web anyway",
        "The details may be invented, because the event is after the model's training data ends",
      ],
      answer: 3,
      explain: "Without a tool fetching new information, the model can't know about events after its training cut-off. Detail is not evidence.",
    },
    {
      id: "fluency",
      prompt: "Why can a wrong answer sound as confident as a right one?",
      options: [
        "Models only sound confident after checking a source",
        "The model is trained to produce text that reads like good writing, and its tone isn't tied to whether a claim is true",
        "The model deliberately hides its uncertainty",
      ],
      answer: 1,
      explain: "Training optimizes for plausible, well-formed text. Nothing in the tone signals whether a specific claim was checked.",
    },
    {
      id: "trained-once",
      prompt: "You correct a model's mistake in a chat. What happens to the model itself?",
      options: [
        "Its weights are permanently updated for everyone",
        "Nothing, and it can't use your correction at all",
        "Its weights stay fixed, but it can use your correction for the rest of this conversation",
        "It's retrained only for your account",
      ],
      answer: 2,
      explain: "The model's weights were fixed in training. Your correction sits in the conversation, so it can be used there, but it doesn't retrain the model.",
    },
    {
      id: "token",
      prompt: "What is a token?",
      options: [
        "A single letter of the alphabet",
        "A full sentence",
        "A login code for the assistant",
        "A word, piece of a word or punctuation mark that the model reads and writes in",
      ],
      answer: 3,
      explain: "Models work in tokens: common words are often one token, longer or rarer words are split into pieces.",
    },
    {
      id: "hierarchy",
      prompt: "How does generative AI relate to machine learning?",
      options: [
        "It's a kind of machine learning that uses deep neural networks to produce new content",
        "It's the opposite of machine learning: rules written by hand",
        "It's a type of search engine built on machine learning indexes",
      ],
      answer: 0,
      explain: "Generative AI sits inside deep learning, which sits inside machine learning, which is part of AI.",
    },
    {
      id: "grounding",
      prompt: "What does uploading a file to an assistant actually change?",
      options: [
        "It retrains the model on your file",
        "It puts the file's text into the model's context, so the answer can draw on it",
        "It guarantees the answer is correct",
        "It makes the model stop predicting tokens",
      ],
      answer: 1,
      explain: "Tools add material to what the model can see while writing. The model is still predicting text, now with your document in view.",
    },
    {
      id: "grounded-check",
      prompt: "An assistant with search on cites a news article in its answer. What's still worth doing?",
      options: [
        "Nothing; answers with citations are always accurate",
        "Ask the same question again to see if the citation repeats",
        "Open the article and confirm it says what the answer claims",
        "Turn search off and compare",
      ],
      answer: 2,
      explain: "Grounding helps, but the model can still misread or overstate a source. The citation is where you check, not proof in itself.",
    },
    {
      id: "risky-request",
      prompt: "Which request is most likely to get a made-up detail?",
      options: [
        "Rewording a paragraph you pasted in",
        "Brainstorming names for a study group",
        "Explaining photosynthesis in general terms",
        "Giving the exact page number of a quote in a lesser-known book",
      ],
      answer: 3,
      explain: "Exact, specific details about thinly covered sources are where patterns are weakest and invention is most likely.",
    },
    {
      id: "code-tool",
      prompt: "You need the exact average of 40 numbers. Which setup is most reliable?",
      options: [
        "Have the assistant run code on the numbers, and check the code it ran",
        "Ask for the answer in a single reply without tools",
        "Ask three times and take the most common answer",
        "Ask it to be very careful",
      ],
      answer: 0,
      explain: "Predicting digits token by token can slip. Running code computes the result exactly, and you can check the code.",
    },
    {
      id: "product-model",
      prompt: "What's the difference between an assistant like ChatGPT and the model inside it?",
      options: [
        "There's no difference; the names are interchangeable",
        "The model is the phone app and the product is the server",
        "The product wraps one or more models with features like search, file upload and memory",
      ],
      answer: 2,
      explain: "Products add tools and features around a model. Knowing which feature produced an answer helps you judge it.",
    },
  ],
  reflect: "Think of one way you already use an AI assistant, or have seen someone else use one. Now that you know it predicts rather than retrieves, where in that use would you check its output, and how would you check it?",
  sources: [
    {
      title: "Generative AI for Beginners, lesson 1: Introduction to generative AI and LLMs (Microsoft)",
      url: "https://github.com/microsoft/generative-ai-for-beginners/tree/main/01-introduction-to-genai",
      license: "MIT",
      note: "Adapted the path from AI to machine learning, deep learning and generative AI, and the explanation of tokenization, next-token prediction and sampling with temperature.",
    },
    {
      title: "Generative AI for Beginners, lesson 2: Exploring and comparing different LLMs (Microsoft)",
      url: "https://github.com/microsoft/generative-ai-for-beginners/tree/main/02-exploring-and-comparing-different-llms",
      license: "MIT",
      note: "Adapted the distinction between a service and the model inside it.",
    },
    { title: "USC AI Knowledge Hub", url: "https://usc-ai-knowledge-hub.github.io/knowledge-hub/learn/what-is-genai", license: "Original" },
  ],
};
