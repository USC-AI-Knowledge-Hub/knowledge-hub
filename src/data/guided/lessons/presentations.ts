import type { GuidedLesson } from "../types";

export const presentations: GuidedLesson = {
  module: "presentations",
  objectives: [
    "Turn a five-point outline into a first-draft deck with Gamma, Canva or Microsoft Copilot.",
    "Rewrite slide headlines so each one states a point instead of naming a topic.",
    "Replace generic images and filler with your own evidence, and check every claim the tool added.",
  ],
  sections: [
    {
      heading: "Start from your outline, not a topic",
      body: "If you type “a presentation on community gardens”, the tool has to invent the argument, the evidence and the order. You get a tidy deck that says what every other deck on the topic says.\n\nGive it your thinking instead. A short outline does most of the work:\n\n- **The claim:** the one sentence you want the audience to remember.\n- **Three to five points** that support it, in the order you'd say them.\n- **The evidence** for each point, even if it's just a note like “survey chart here”.\n- **The audience and the time:** a ten-minute class talk is not a conference poster.\n\nThen let the tool do what it's good at. Gamma builds a whole deck from an outline. Canva's Magic Design puts it into a design you can edit by hand. Copilot in PowerPoint works inside the file you already have, though features depend on your license. The layout is the fast part; the argument has to come from you.",
      ask: "Why does a deck generated from a topic end up so generic?",
    },
    {
      heading: "Headlines that state the point",
      body: "Most generated slides have topic headlines: “Background”, “Key benefits”, “Results”. A topic tells the audience what the slide is about. It doesn't tell them what to think.\n\nA better headline is a short sentence that states the slide's point, such as “Plots near schools were used twice as often as plots near offices”. The body of the slide is then the evidence for that sentence.\n\nRewrite every headline yourself, even the ones that look fine. Two quick tests:\n\n- **Read only the headlines, in order.** Do they tell your whole argument? If not, a point is missing or buried.\n- **Ask what the slide proves.** If you can't say it in one sentence, the slide is doing too much or nothing at all.\n\nAI tools also like vague, punchy phrases (“Unlocking growth”). Swap them for something specific enough that someone could disagree with it.",
      ask: "What's the difference between a topic headline and one that states a point?",
    },
    {
      heading: "Replace filler with evidence",
      body: "A generated deck fills space: stock photos, icons, AI images and bullet lists that sound right but say little. Go through slide by slide and replace filler with something that supports the headline, like your own chart, a photo you took, a short quote from a source you read, or a diagram.\n\nThen check everything the tool wrote. Generators sometimes add numbers, dates or claims that weren't in your outline. Treat any fact you didn't supply as unverified: find a source for it or delete it. Diagram tools like Napkin are handy for showing a process, but they can suggest relationships your text never stated, so make sure the arrows mean what you mean.\n\nIf you keep an AI-generated image, say so on the slide or in your notes, and follow your course's rules on AI in assignments. Finally, cut any slide that doesn't earn its place. Fewer slides with real evidence beat many with decoration.",
      ask: "What should I do with a statistic the tool added that wasn't in my outline?",
    },
    {
      heading: "Make it readable, then make it yours",
      body: "Before you present, check the basics a generator can get wrong:\n\n- **Contrast and size:** text should be readable from the back of the room and not sit on a busy image.\n- **Color:** don't rely on color alone to carry meaning in a chart.\n- **Alt text:** describe meaningful images for anyone using a screen reader. AI can draft it; you check it.\n- **Export:** if your course needs a PowerPoint or PDF, export early and check the layout survived.\n\nKeep confidential material out of these tools, especially on a personal account.\n\nThe talk itself is still yours. AI can draft speaker notes, but rehearse out loud in your own words, or you'll sound like you're reading someone else's script. One useful trick: paste your headlines into an assistant and ask it to play a skeptical audience member with three hard questions. Answering those out loud is better preparation than polishing another slide.",
      ask: "How can an AI assistant help me rehearse, not just build the slides?",
    },
  ],
  example: {
    title: "From a generated draft to a deck that argues",
    body: "A student's outline for a ten-minute talk: claim “The campus garden should expand to a second site”, with three points on demand, cost and student wellbeing, plus a note to use their own survey.\n\n**Generated draft (Gamma):** eight slides titled “Introduction”, “The power of community gardens”, “Key benefits”, “Challenges”, “Conclusion”. Stock photos of vegetables. One slide says that gardens “reduce stress by 40%”, a figure that wasn't in the outline and has no source.\n\n**After editing:**\n\n- Headlines rewritten: “The garden's waitlist is longer than its plot count”, “A second site costs less than one semester of the current lease”, “Gardeners in our survey said it was their main break from screens”.\n- The stock photos replaced with the student's own survey chart and a photo of the waitlist board.\n- The 40% claim deleted after the student couldn't find a source for it.\n- Two filler slides cut. Speaker notes rewritten in the student's own words.\n\nThe tool saved an hour of layout. The edits made it an argument.",
  },
  deliverable: "Your five-point outline, the generated deck, and the edited deck with every headline rewritten to state its point, plus a note on any claim you removed or checked.",
  questions: [
    {
      id: "outline-first",
      prompt: "You have ten minutes to present on campus food insecurity. What's the best first input for an AI deck generator?",
      options: [
        "The single word “food insecurity” so the tool has room to be creative",
        "A request for twenty slides so you can delete the weak ones",
        "Your outline: the main claim, three to five points in order, and the evidence for each",
        "The name of a presenter whose style you like",
      ],
      answer: 2,
      explain: "The tool is good at layout but has to guess the argument if you don't give one. An outline keeps the thinking yours and the output specific.",
    },
    {
      id: "headline-point",
      prompt: "Which headline states a point rather than naming a topic?",
      options: [
        "Most respondents skipped breakfast on exam days",
        "Survey results",
        "Unlocking the power of data",
        "Key findings",
      ],
      answer: 0,
      explain: "A point headline is a sentence someone could agree or disagree with. The others only label what the slide is about, or say nothing specific.",
    },
    {
      id: "added-stat",
      prompt: "Your generated deck includes “72% of students prefer visual learning”. You didn't put that in your outline. What should you do?",
      options: [
        "Keep it; the tool must have found it somewhere",
        "Round it to 70% so it's less precise",
        "Move it to the last slide where it matters less",
        "Find a reliable source that supports it, or delete it",
      ],
      answer: 3,
      explain: "Generators can add plausible numbers with no source. Any fact you didn't supply is unverified until you find where it comes from.",
    },
    {
      id: "headline-test",
      prompt: "What's a quick way to check whether your deck makes its argument?",
      options: [
        "Count the slides and make sure there are at least ten",
        "Read only the headlines in order and see if they tell the whole story",
        "Check that every slide has an image",
        "Ask the tool whether the deck is persuasive",
      ],
      answer: 1,
      explain: "If the headlines alone carry the argument, the structure works. If they don't, a point is missing or buried in the body text.",
    },
    {
      id: "napkin-check",
      prompt: "Napkin turns your paragraph about a research process into a flow diagram. What's the main thing to check?",
      options: [
        "That the arrows and relationships match what your text actually says",
        "That it uses your favorite colors",
        "That it has more boxes than your paragraph has sentences",
        "Nothing; diagrams made from your own text are always accurate",
      ],
      answer: 0,
      explain: "Diagram tools can suggest links or orderings your text didn't state. You're responsible for what the diagram claims.",
    },
    {
      id: "stock-images",
      prompt: "Your deck is full of stock photos that look nice but don't show anything specific. What's the better replacement?",
      options: [
        "More AI-generated images in the same style",
        "Larger versions of the same photos",
        "Your own evidence: a chart, a photo you took, a short quote from a source",
        "Animated transitions to keep attention",
      ],
      answer: 2,
      explain: "Visuals should support the headline. Evidence you gathered does that; decoration only fills space.",
    },
    {
      id: "ai-image-disclose",
      prompt: "You decide to keep one AI-generated illustration in a class presentation. What's the responsible step?",
      options: [
        "Crop it so nobody can tell",
        "Say it's AI-generated and make sure your course allows it",
        "Credit yourself as the artist",
        "Nothing; images don't count as AI use",
      ],
      answer: 1,
      explain: "Being open about AI-generated images, and following the course's rules, is part of using these tools honestly.",
    },
    {
      id: "rehearse",
      prompt: "Which use of AI is most likely to improve your actual delivery?",
      options: [
        "Having it write a script you read word for word",
        "Asking it to add more slides",
        "Letting it choose your conclusion",
        "Asking it to play a skeptical audience member and answering its questions out loud",
      ],
      answer: 3,
      explain: "Practicing answers to hard questions in your own words builds the understanding a script can't. Reading generated notes tends to sound flat.",
    },
    {
      id: "accessibility",
      prompt: "Which check matters most for making your slides accessible?",
      options: [
        "Using at least three fonts for variety",
        "Placing text over busy photos so slides look full",
        "Readable contrast and size, alt text for meaningful images, and not using color alone to carry meaning",
        "Making every slide a different layout",
      ],
      answer: 2,
      explain: "Generated designs don't always get contrast or alt text right. These checks help everyone in the room, including people using screen readers.",
    },
    {
      id: "which-tool",
      prompt: "Your group already has a half-built PowerPoint file and wants AI help inside it. Which tool fits best?",
      options: [
        "Microsoft Copilot in PowerPoint, if your license includes it",
        "Napkin, because it makes whole decks",
        "Otter, because it transcribes talks",
        "NotebookLM, because it designs slides",
      ],
      answer: 0,
      explain: "Copilot works inside Office files you already have, though features vary by license. Napkin makes diagrams, not decks.",
    },
    {
      id: "confidential",
      prompt: "You're presenting an internship project that includes the company's unreleased sales figures. What should you do before using Gamma on a personal account?",
      options: [
        "Paste everything in; the deck is only for you",
        "Leave the confidential figures out of the tool and add them by hand, if you're allowed to share them at all",
        "Change the numbers slightly and paste them in",
        "Ask Gamma whether the data is confidential",
      ],
      answer: 1,
      explain: "Personal accounts on third-party tools aren't the place for confidential material. Check what you're allowed to share, then keep sensitive details out of the tool.",
    },
    {
      id: "export",
      prompt: "Your instructor wants a PowerPoint file, and you built the deck in Gamma. What's the sensible step?",
      options: [
        "Submit a link and hope it's accepted",
        "Take screenshots of each slide",
        "Rebuild it from scratch in PowerPoint the night before",
        "Export early and check the layout and fonts survived",
      ],
      answer: 3,
      explain: "Export fidelity varies between tools. Checking early leaves time to fix anything that broke.",
    },
    {
      id: "whose-job",
      prompt: "After using an AI deck generator, which part is still clearly your job?",
      options: [
        "The argument, the evidence and the delivery",
        "Choosing slide layouts",
        "Picking a color theme",
        "Aligning text boxes",
      ],
      answer: 0,
      explain: "The tools are fast at layout and design. What you're claiming, why it's true and how you say it can't be delegated.",
    },
  ],
  reflect: "Look at the edited deck next to the generated one. Which change made the biggest difference to how convincing it is, and what does that tell you about where AI helps and where it doesn't?",
  sources: [
    { title: "USC AI Knowledge Hub", url: "https://usc-ai-knowledge-hub.github.io/knowledge-hub/learn/presentations", license: "Original" },
  ],
};
