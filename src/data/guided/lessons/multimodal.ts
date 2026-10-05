import type { GuidedLesson } from "../types";

export const multimodal: GuidedLesson = {
  module: "multimodal",
  objectives: [
    "Explain how a multimodal model takes in an image or audio, and how that differs from generating one.",
    "Use an assistant to transcribe and organize handwritten or visual material, and find the errors it makes.",
    "Apply consent and labeling rules when you create or share AI-generated images, audio or video.",
  ],
  sections: [
    {
      heading: "One model, many kinds of input",
      body: "A **multimodal** model works with more than text. Many assistants can now read a photo, a chart, a screenshot or a scanned page, and some can listen to speech and talk back.\n\nHere's roughly how an assistant reads an image. An **image encoder**, a neural network trained on large numbers of images, converts the picture into a sequence of vectors, often one for each small patch of the image. These are mapped into the same kind of numerical space as the model's text tokens. The language model then attends to the image vectors and your words together, which is how it can answer “What does this chart show?”\n\nAudio works in a similar way, or it is first turned into text by a speech recognition model. Either way, the reply is still text generated one token at a time, unless a speech model reads it aloud.\n\nThe key idea: the model “sees” an image as a sequence of learned vectors placed alongside your words, not as a person sees it.",
      ask: "How does a language model read a picture if it only works with tokens?",
    },
    {
      heading: "Reading images well, and where it slips",
      body: "Assistants are often good at transcribing printed text and reasonably neat handwriting, describing a scene, explaining a diagram, identifying the type of chart, and turning a photographed table into rows and columns.\n\nThey are weaker at small or blurry text, messy handwriting, counting many similar objects, reading exact values off a chart, fine spatial detail, and specialist notation such as equations or chemical structures.\n\nThe real danger is how they fail. When a model can't make out a word, it tends to write a plausible word rather than flag the gap. A dropped minus sign or a misread name comes out in the same clean text as everything else, so the transcript looks trustworthy even when it isn't.\n\nWhat helps:\n\n- Photograph straight on, in good light, and crop to what you need.\n- Ask it to mark unreadable words as [?] instead of guessing.\n- Compare the output with the original, line by line.\n\nThe key idea: a clean-looking transcript can hide confident guesses.",
      ask: "Why would a model guess a word instead of telling me it can't read it?",
    },
    {
      heading: "Generating images, audio and video",
      body: "Understanding media and generating it are different jobs, usually done by different models.\n\nMany image generators use **diffusion**. The model starts from random noise and removes it step by step, guided by your text prompt, until an image matching the description emerges. Video models extend this idea across frames. Voice models turn text into speech, and some can imitate a particular person's voice from a short recording.\n\nGenerated media follows the patterns in its training data, not the facts of your subject. That means:\n\n- It can fall back on stereotypes, such as who a “scientist” or a “nurse” looks like.\n- Text inside images and fine details are often garbled.\n- A generated diagram of a cell or a circuit can look authoritative and be wrong.\n\nLegal questions about training data and copyright are still being worked out, so check the tool's terms and your course or unit rules before using generated media in your work.\n\nThe key idea: a generated image is a plausible picture, not a record of anything real.",
      ask: "How does a diffusion model turn my text prompt into an image?",
    },
    {
      heading: "Consent, labels and deepfakes",
      body: "Realistic generated media of real people, often called **deepfakes**, can deceive, harass or damage someone's reputation. A few rules cover most situations:\n\n- **Consent first.** Never create realistic images, video or a cloned voice of a real person without their permission. That includes classmates, colleagues and instructors, even as a joke.\n- **Label what you share.** Say when an image, audio clip or video is AI-generated, in a caption or credit line, so no one mistakes it for a record of something real.\n- **Know the limits of provenance.** Some tools attach content credentials (based on the C2PA standard) or invisible watermarks to what they generate. These help, but they can be stripped, so their absence proves nothing.\n\nWhen you receive striking media, check where it came from and whether reliable sources report the same thing. AI detectors alone are not reliable enough to settle the question.\n\nUniversity conduct and academic integrity rules still apply when the content is AI-made.\n\nThe key idea: get consent, label it, and verify before you share.",
      ask: "If an image has no watermark, does that mean it's real?",
    },
  ],
  example: {
    title: "From whiteboard to study sheet",
    body: "A student photographs a page of handwritten statistics notes and sends it with this prompt:\n\n“Transcribe this page exactly. Mark any word or symbol you can't read as [?]. Don't fix, add or explain anything. Then, separately, organize the transcription under headings with bullet points, using only what's on the page.”\n\nAsking for two separate steps matters: first a faithful transcript, then the reorganized notes. It makes it much easier to see where the model changed something.\n\n**Checking it.** The student lays the transcript beside the photo and marks every difference. The kinds of errors to look for:\n\n- **Misread words:** a similar-looking word swapped in, such as “variation” for “variance”.\n- **Dropped or changed symbols:** a formula's n−1 becoming n, or a missing square root.\n- **Added content:** a definition or example that isn't on the page, which is most likely to slip into the organized version.\n- **Silent guesses:** words it didn't mark [?] even though the handwriting is unclear.\n\nThey correct the study sheet, count each type of error, and keep the corrected version, not the raw output.",
  },
  deliverable: "Your photo of the notes, the assistant's transcription and organized version, and a marked-up copy showing every error (misread words, changed symbols, added content), with a count of each type.",
  questions: [
    {
      id: "understand-vs-generate",
      prompt: "What's the difference between understanding an image and generating one?",
      options: [
        "There's none; the same process runs in both directions",
        "Understanding turns an image into information the model reasons about; generating builds a new image from a description, usually with a different kind of model",
        "Understanding is done by people and generating by AI",
      ],
      answer: 1,
      explain: "Reading an image and creating one are separate tasks, and are usually handled by different models or components.",
    },
    {
      id: "encoder",
      prompt: "How does a multimodal assistant take in a photo?",
      options: [
        "An image encoder turns it into a sequence of vectors that the language model attends to alongside your words",
        "It converts every pixel into a word",
        "It searches the web for a matching image and reads that page's text",
        "It asks a human to describe it",
      ],
      answer: 0,
      explain: "The encoder converts image patches into vectors placed in the same space as text tokens, so the model can relate them.",
    },
    {
      id: "silent-guess",
      prompt: "When a model can't read a handwritten word, what does it often do?",
      options: [
        "Always leaves a blank",
        "Refuses to transcribe the whole page",
        "Writes a plausible word in its place without flagging it",
        "Asks you to retake the photo",
      ],
      answer: 2,
      explain: "Models tend to fill gaps with plausible text, which is why transcripts need a line-by-line check.",
    },
    {
      id: "mark-unclear",
      prompt: "Which prompt change most helps you find transcription errors?",
      options: [
        "“Make it look polished.”",
        "“Fix any mistakes in my notes as you go.”",
        "“Be quick.”",
        "“Mark any word you can't read as [?] instead of guessing.”",
      ],
      answer: 3,
      explain: "Giving the model an explicit way to flag uncertainty reduces silent guesses and shows you where to look.",
    },
    {
      id: "weak-spot",
      prompt: "Which task is a multimodal assistant most likely to get subtly wrong?",
      options: [
        "Saying whether a photo shows indoors or outdoors",
        "Reading the exact value of a point on a crowded chart",
        "Identifying that an image is a bar chart",
      ],
      answer: 1,
      explain: "Precise values, small text and fine spatial detail are common weak spots. Broad descriptions are usually more reliable.",
    },
    {
      id: "diffusion",
      prompt: "How does a diffusion image generator produce a picture?",
      options: [
        "It starts from random noise and removes it step by step, guided by your prompt",
        "It finds a matching photo online and edits it",
        "It draws one pixel at a time from left to right using a dictionary",
      ],
      answer: 0,
      explain: "Diffusion models learn to turn noise into images that fit a text description, refining over many steps.",
    },
    {
      id: "diagram",
      prompt: "You generate a labeled diagram of a plant cell for a study guide. What should you do before using it?",
      options: [
        "Nothing; generated diagrams are drawn from textbooks",
        "Add a watermark",
        "Make it higher resolution",
        "Check every label and structure against a reliable source",
      ],
      answer: 3,
      explain: "Generators produce plausible images, not accurate ones. Labels are often garbled and structures can be wrong.",
    },
    {
      id: "consent",
      prompt: "A friend suggests making a funny video of your professor using a cloned voice. What's the right call?",
      options: [
        "Fine, as long as it's clearly a joke",
        "Fine if you only share it in a group chat",
        "Don't make it without the professor's permission",
        "Fine if the tool allows it",
      ],
      answer: 2,
      explain: "Realistic media of a real person needs their consent. Jokes spread beyond their audience, and conduct rules still apply.",
    },
    {
      id: "label",
      prompt: "You use an AI-generated image in a club flyer. What should you do?",
      options: [
        "Label it as AI-generated, for example in a small credit line",
        "Nothing, as long as it looks good",
        "Say you drew it yourself",
      ],
      answer: 0,
      explain: "Labeling generated media keeps people from mistaking it for a photo or original artwork.",
    },
    {
      id: "no-watermark",
      prompt: "A viral image has no watermark or content credentials. What does that tell you?",
      options: [
        "It's definitely a real photograph",
        "Not much; credentials and watermarks can be missing or stripped",
        "It's definitely AI-generated",
        "It was made by a person with a camera phone",
      ],
      answer: 1,
      explain: "Provenance signals help when present, but their absence proves nothing. Check the source and other reporting.",
    },
    {
      id: "detectors",
      prompt: "Why shouldn't you rely on an AI detector alone to decide whether media is fake?",
      options: [
        "Detectors are illegal to use",
        "Detectors only work on text",
        "Detectors always say everything is fake",
        "They aren't reliable enough, so they should be one signal among several, like source and corroboration",
      ],
      answer: 3,
      explain: "Detectors make mistakes in both directions. Where the media came from and whether others confirm it matter more.",
    },
    {
      id: "stereotype",
      prompt: "You ask for “a picture of a scientist” and get the same kind of person every time. Why?",
      options: [
        "The generator follows common patterns in its training data, including stereotypes",
        "Scientists all look alike",
        "The tool only has one image",
      ],
      answer: 0,
      explain: "Generated media reflects its training data. Be specific in the prompt and review results for stereotypes.",
    },
    {
      id: "separate-steps",
      prompt: "Why ask for an exact transcript first, then a reorganized version as a separate step?",
      options: [
        "It uses fewer tokens",
        "It makes the model more creative",
        "It makes changes and additions easier to spot against the original",
        "Models can't do both at once",
      ],
      answer: 2,
      explain: "A faithful transcript gives you a baseline to check. Reorganizing is where added content most often slips in.",
    },
  ],
  reflect: "Where could images, audio or video help your own work or study, and where would you draw the line on generating media? Describe one use you'd be comfortable with and one you wouldn't, and why.",
  sources: [
    {
      title: "Generative AI for Beginners, lesson 9: Building image generation applications (Microsoft)",
      url: "https://github.com/microsoft/generative-ai-for-beginners/tree/main/09-building-image-applications",
      license: "MIT",
      note: "Adapted the explanation of diffusion-based image generation from a text prompt, and the idea of setting boundaries on what gets generated.",
    },
    {
      title: "Generative AI for Beginners, lesson 2: Exploring and comparing different LLMs (Microsoft)",
      url: "https://github.com/microsoft/generative-ai-for-beginners/tree/main/02-exploring-and-comparing-different-llms",
      license: "MIT",
      note: "Adapted the overview of models for speech, image generation and multimodal input.",
    },
    { title: "USC AI Knowledge Hub", url: "https://studentslearningai.com/learn/multimodal", license: "Original" },
  ],
};
