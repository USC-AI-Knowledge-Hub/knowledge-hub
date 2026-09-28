import { mc, type Quest } from "./types";

/** Level 3: AI and the world. */
export const level3: Quest[] = [
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
        checks: [
          mc(
            "According to the IEA, roughly what share of the world's electricity did data centres use in 2024?",
            ["About 1.5%", "About 15%", "About 0.01%", "About half"],
            "About 415 TWh, or roughly 1.5%. Small as a share, large in absolute terms, and projected to roughly double by 2030.",
          ),
          mc(
            "What does the IEA project for data centre electricity use by 2030?",
            ["Roughly double, to about 945 TWh", "A fall by half", "About the same as today", "A hundredfold increase"],
            "AI is the main driver of the projected growth.",
          ),
          mc(
            "Why treat energy estimates like these as ranges?",
            [
              "Estimates vary a lot between sources and methods",
              "The IEA doesn't publish numbers",
              "Electricity can't be measured",
              "They change every hour",
            ],
            "Different assumptions give different totals. Compare sources and look at the method.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "one-prompt",
        title: "One prompt",
        ask: "How much energy does one chatbot prompt use?",
        notes:
          "Some companies now publish per-prompt figures. Google reported in August 2025 that the median Gemini Apps text prompt uses about 0.24 Wh of electricity and about 0.26 mL of water, roughly five drops. OpenAI's CEO said in June 2025 that an average ChatGPT query uses about 0.34 Wh. For scale, 0.3 Wh is about what a 10-watt LED bulb uses in two minutes. These are company-reported figures for text prompts, measured in different ways; long reasoning answers, images and especially video use considerably more.",
        checks: [
          mc(
            "Google's reported figure for a median Gemini text prompt is closest to…",
            [
              "About a quarter of a watt-hour",
              "About 25 kilowatt-hours",
              "About the same as fully charging a laptop",
              "Zero, because it runs in the cloud",
            ],
            "About 0.24 Wh, a couple of minutes of an LED bulb. Small per prompt; the totals come from scale and from heavier kinds of generation.",
          ),
          mc(
            "Why can't Google's and OpenAI's per-prompt figures be compared exactly?",
            [
              "They're company-reported and measured in different ways",
              "One is measured in litres",
              "They describe the same model",
              "Neither company published a figure",
            ],
            "Median and average, and what's included in the count, can differ between reports.",
          ),
          mc(
            "Which uses considerably more energy than a typical text prompt?",
            ["Generating a video", "A short text reply", "Reading an answer already on screen", "Typing your prompt"],
            "Video generation takes far more computation than text.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "training-vs-use",
        title: "Training and everyday use",
        ask: "Is training a model or using it the bigger cost?",
        notes:
          "Training a large model is a big one-off cost: Patterson and colleagues (2021) estimated that training GPT-3 used about 1,287 MWh of electricity. Using a model, called inference, costs little per prompt but happens billions of times, so over a model's life, use can add up to more than training. Location matters too: the same electricity has a much smaller carbon footprint on a clean grid than on a coal-heavy one, and cooling can use a lot of water in some places.",
        checks: [
          mc(
            "Why can everyday use add up to more than training?",
            [
              "Each prompt is cheap, but there are billions of them",
              "Every prompt retrains the model",
              "Training is free once the data is collected",
              "It can't: training is always the larger cost",
            ],
            "Training happens once; inference happens every time anyone uses the model. Scale turns a small number into a large one.",
          ),
          mc(
            "What is inference?",
            [
              "Using a trained model to produce answers",
              "Training a model from scratch",
              "Collecting training data",
              "Cooling a data centre",
            ],
            "Every chatbot reply is inference.",
          ),
          mc(
            "Why does location matter for AI's carbon footprint?",
            [
              "The same electricity is cleaner on a low-carbon grid than on a coal-heavy one",
              "Models run faster near the equator",
              "Carbon depends only on the model's size",
              "It doesn't matter at all",
            ],
            "Where the data centre is, and how its grid is powered, changes the emissions for the same work.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "habits",
        title: "Habits that help",
        ask: "How can I use AI more efficiently?",
        notes:
          "Pick the smallest model that does the job: a quick rewrite doesn't need a large reasoning model. Don't regenerate blindly; fix the prompt instead, which also gets you a better answer. Batch related questions into one clear message. Use text when text will do, since generating images and especially video takes far more energy. Keep perspective: these habits save energy and your time, and the biggest levers are how companies build, power and cool data centres.",
        checks: [
          mc(
            "You need a one-paragraph summary of an article. What's the efficient choice?",
            [
              "A fast, small model with one clear prompt",
              "A large reasoning model, regenerated until it's perfect",
              "A generated video that summarizes it",
              "Ten short messages, one sentence at a time",
            ],
            "Match the model to the job and get the prompt right the first time. It's quicker for you and lighter on energy.",
          ),
          mc(
            "The answer isn't what you wanted. What's the more efficient move?",
            [
              "Fix the prompt with specific feedback",
              "Regenerate ten times",
              "Ask for a video instead",
              "Send the same vague prompt to a larger model",
            ],
            "A better prompt usually beats more attempts, for your time and for energy.",
          ),
          mc(
            "Where are the biggest levers on AI's energy use?",
            [
              "How companies build, power and cool data centres",
              "Whether you say please",
              "Your screen brightness",
              "How fast you type",
            ],
            "Personal habits help, but infrastructure choices matter most.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "this-tutor",
        title: "This tutor",
        ask: "Where does this tutor run?",
        notes:
          "This tutor's model runs on your own device, inside your browser. After the one-time download, your questions don't go to a data centre, and nothing you type leaves your browser. It isn't free: it uses your device's battery and graphics chip while it answers. Small models also make more mistakes than large ones, so they suit short explanations and practice; use bigger tools when you need depth or up-to-date facts.",
        checks: [
          mc(
            "What's true about this on-device tutor?",
            [
              "It uses your device's power instead of a data centre's, and it can be wrong",
              "It uses no energy at all",
              "It sends your questions to a server to check them",
              "It's more accurate than large cloud models",
            ],
            "Local means private and data-centre-free, not free of cost or error.",
          ),
          mc(
            "After the one-time download, where do your questions to this tutor go?",
            ["Nowhere; they stay in your browser", "To a data centre", "To your instructor", "To a search engine"],
            "The model runs in your browser, so nothing you type is sent anywhere.",
          ),
          mc(
            "When should you reach for a bigger tool than this tutor?",
            ["When you need depth or up-to-date facts", "For a quick definition", "To practise with a quiz", "Never"],
            "Small models suit short explanations and practice. They make more mistakes on hard or current questions.",
          ),
        ],
      },
    ],
  },
  {
    id: "bias",
    title: "Bias and fairness",
    blurb: "Where unfair outputs come from, and how to catch them.",
    icon: "balance",
    shape: "cookie6",
    lesson: "ethics-integrity",
    steps: [
      {
        kind: "learn",
        id: "sources",
        title: "Where bias comes from",
        ask: "How does an AI system end up biased?",
        notes:
          "AI systems learn from data made by people, so they absorb the patterns in it, including unfair ones. Bias can enter through what's in the data, when some groups, languages or places are underrepresented; through labels, when the people labelling bring their own assumptions; through the goal, when a system is trained on a proxy that correlates with a protected trait; and through use, when a tool built for one population is applied to another. A widely reported example: in 2018 Reuters reported that Amazon had scrapped an experimental hiring tool after finding it downgraded résumés that included the word “women's”, a pattern learned from past hiring data.",
        checks: [
          mc(
            "Why did Amazon's experimental hiring tool downgrade résumés mentioning “women's”?",
            ["It learned the pattern from past hiring data", "Engineers told it to", "It misread the language", "It was a random glitch"],
            "Nobody wrote that rule. The tool picked it up from which résumés had led to hires before.",
          ),
          mc(
            "Which is an example of bias entering through the data?",
            [
              "A speech model trained mostly on one accent",
              "A model that answers slowly",
              "An app with a dark theme",
              "A model with a short context window",
            ],
            "Underrepresented groups get worse results when the training data barely includes them.",
          ),
          mc(
            "What is a proxy in this context?",
            [
              "A feature that stands in for a protected trait, like a zip code that correlates with race",
              "A faster server",
              "A person who checks outputs",
              "A kind of token",
            ],
            "Removing a protected trait doesn't remove bias if a proxy for it stays in.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "gender-shades",
        title: "One number hides a lot",
        ask: "What did the Gender Shades study find?",
        notes:
          "In the 2018 Gender Shades study, Joy Buolamwini and Timnit Gebru tested commercial face-analysis systems that classified gender. Error rates were lowest for lighter-skinned men, under 1%, and highest for darker-skinned women, up to about 35%. The benchmark data commonly used to measure such systems overrepresented lighter-skinned people and men. After the study, the companies released updated systems with smaller gaps. The lesson generalises: a single overall accuracy figure can hide large differences between groups, so good evaluations report results for each group separately.",
        checks: [
          mc(
            "What did the Gender Shades study find?",
            [
              "Much higher error rates for darker-skinned women than for lighter-skinned men",
              "Equal accuracy for every group",
              "The systems worked best on children",
              "The systems couldn't detect faces at all",
            ],
            "Under 1% for lighter-skinned men, up to about 35% for darker-skinned women.",
          ),
          mc(
            "Why can a high overall accuracy figure be misleading?",
            [
              "It can hide large differences between groups",
              "Accuracy figures are always made up",
              "High accuracy means a system is biased",
              "It only counts the first test question",
            ],
            "An average over everyone can look good while one group gets poor results.",
          ),
          mc(
            "What's a good practice when evaluating an AI system?",
            [
              "Report results for each group separately",
              "Report one overall number",
              "Test only on the developers' own photos",
              "Skip testing if the model is large",
            ],
            "Breaking results down by group is how gaps are found and fixed.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "generative-bias",
        title: "Bias in generated content",
        ask: "Do chatbots and image generators show bias too?",
        notes:
          "Generative models show bias too. Image generators asked for “a doctor” or “a CEO” have often produced mostly men, and for “a nurse” mostly women, echoing and sometimes exaggerating patterns in their training images. Language models can associate names, dialects or countries with stereotypes, and can work less well in languages with less training text. Developers add filters and tuning to reduce this, sometimes overcorrecting in ways that create new errors. When you use AI for anything that describes or affects people, look at the outputs as a set and ask who is missing or misrepresented.",
        checks: [
          mc(
            "An image generator shows mostly men when asked for “a CEO”. Where does that pattern come from?",
            [
              "Patterns in its training images, sometimes exaggerated",
              "The prompt asked for men",
              "Random noise",
              "A written company rule",
            ],
            "Models reproduce, and can amplify, what's common in their data.",
          ),
          mc(
            "Why can a model work less well in some languages?",
            [
              "There's less training text in those languages",
              "Those languages have no grammar",
              "Models only read English letters",
              "Tokenizers ban them",
            ],
            "Less data means weaker results, which is a fairness issue for speakers of those languages.",
          ),
          mc(
            "What's a practical check for bias in generated outputs?",
            [
              "Look at many outputs together and ask who is missing or misrepresented",
              "Look at a single output",
              "Check the file size",
              "Ask the model if it's biased and accept the answer",
            ],
            "Patterns show up across a set, not in one example.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "fairness",
        title: "What counts as fair",
        ask: "Can't we just make AI fair?",
        notes:
          "Fairness has more than one definition, and they can conflict. One asks for equal rates of positive decisions across groups; another asks for equal error rates; another asks that a given score mean the same risk for everyone. Research in 2016 and 2017, prompted by debate over the COMPAS tool used to predict reoffending, showed that when groups have different underlying rates, a system generally can't satisfy all of these at once. Choosing between them is a question of values, not only of maths. That's why decisions about people, such as admissions, hiring, grading or credit, need human judgement, transparency and a way to appeal.",
        checks: [
          mc(
            "Why can't a risk score usually satisfy every definition of fairness at once?",
            [
              "When groups have different underlying rates, the definitions conflict mathematically",
              "Nobody has tried hard enough",
              "Computers can't divide",
              "Fairness has only one definition",
            ],
            "It's a mathematical result, so choosing a definition is a value judgement.",
          ),
          mc(
            "What prompted much of the 2016–17 research on conflicting fairness definitions?",
            ["Debate over the COMPAS reoffending tool", "The launch of ChatGPT", "The Dartmouth workshop", "AlexNet"],
            "Analyses of COMPAS disagreed about whether it was fair because they used different definitions.",
          ),
          mc(
            "What should high-stakes decisions about people include?",
            [
              "Human judgement, transparency and a way to appeal",
              "Only the model's score",
              "The fastest possible decision",
              "Secret criteria",
            ],
            "People affected by a decision should be able to understand and challenge it.",
          ),
        ],
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy and your data",
    blurb: "What happens to what you type, and what to keep out of AI tools.",
    icon: "lock",
    shape: "clover4",
    lesson: "limits",
    steps: [
      {
        kind: "learn",
        id: "where-it-goes",
        title: "Where your prompts go",
        ask: "What happens to what I type into an AI tool?",
        notes:
          "When you use a cloud AI tool, your prompts and files are sent to the provider's servers to be processed. What happens next depends on the product and your settings. Providers may keep conversations for a period, have staff or contractors review some of them for safety or quality, and, for many consumer products, use them to train future models unless you opt out. Business and education agreements often promise not to train on your data. Policies change, so check the current settings of the tool you use rather than relying on what was true last year.",
        checks: [
          mc(
            "What happens to a prompt you type into a cloud AI tool?",
            [
              "It's sent to the provider's servers and may be kept, depending on settings",
              "It stays only on your device",
              "It's deleted before anyone reads it",
              "It's published on the web",
            ],
            "Processing happens on the provider's servers. Retention depends on the product and your settings.",
          ),
          mc(
            "How can a consumer chatbot's conversations end up in future training?",
            [
              "Many consumer products use them for training unless you opt out",
              "They can't; training ended years ago",
              "Only if you type “train on this”",
              "Only when you upload images",
            ],
            "Look for the setting that controls training on your chats.",
          ),
          mc(
            "Why check a tool's data settings yourself?",
            [
              "Policies differ by product and change over time",
              "Settings are the same everywhere",
              "Providers never keep data",
              "It makes the model faster",
            ],
            "What was true last year may not be true now.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "keep-out",
        title: "What to keep out",
        ask: "What shouldn't I paste into a chatbot?",
        notes:
          "Keep some things out of AI tools unless the tool is approved for them: other people's personal information, passwords and ID numbers, health information, unpublished research data, confidential work documents, and anything covered by an agreement. In the United States, FERPA protects students' education records, so instructors and staff shouldn't paste identifiable student work or grades into tools that aren't approved for it. Research with human participants usually comes with data rules set by an ethics board. Removing names helps but isn't always enough, because other details can identify someone. When unsure, ask before you paste.",
        checks: [
          mc(
            "Which is safest to paste into an unapproved chatbot?",
            [
              "A paragraph from a published textbook you want explained",
              "A classmate's grades",
              "Interview transcripts from a research study",
              "A list of your passwords",
            ],
            "Published text has no privacy risk. The others involve other people's data or your security.",
          ),
          mc(
            "What does FERPA protect?",
            ["Students' education records in the United States", "Software patents", "Hospital bills in Europe", "Social media accounts"],
            "That's why identifiable student work and grades need approved tools.",
          ),
          mc(
            "Why isn't removing names always enough to anonymize data?",
            [
              "Other details, such as a rare job and a small town, can still identify someone",
              "Names are the only identifying detail",
              "AI tools add names back automatically",
              "It always is enough",
            ],
            "Combinations of ordinary details can point to one person.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "memory-sharing",
        title: "Memory, links and connections",
        ask: "What do chat memory and share links expose?",
        notes:
          "Chat apps increasingly remember things. Memory features save notes about you across chats, and a share link can make a whole conversation viewable by anyone who has the link. In 2025 some shared chats from a major provider appeared in search engine results after users had ticked an option making them discoverable, and the option was withdrawn. Check what an app remembers, review or delete saved memories, and think before sharing a link to a chat that contains personal details. Connecting an assistant to your email, calendar or drive also gives it access to everything there, including other people's messages.",
        checks: [
          mc(
            "What can a chat's share link expose?",
            [
              "The whole conversation, to anyone with the link",
              "Only the first message",
              "Nothing; links are private",
              "Only your username",
            ],
            "Read the chat through before you share the link.",
          ),
          mc(
            "You connect an assistant to your email. What does it gain access to?",
            [
              "Everything in your mailbox, including other people's messages",
              "Only emails you forward to it",
              "Nothing until you pay",
              "Only the subject lines",
            ],
            "Connections are convenient and broad. Grant only what you need.",
          ),
          mc(
            "What is a chat app's memory feature?",
            [
              "Saved notes about you that are added to future chats",
              "Extra memory chips in the server",
              "The model retraining on you each night",
              "A backup of your phone",
            ],
            "You can usually review and delete what's been saved.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "controls",
        title: "Controls you have",
        ask: "What can I do to protect my privacy with AI tools?",
        notes:
          "Most AI tools give you some control. You can often turn off training on your conversations, use a temporary chat that isn't saved to your history, delete past conversations, and clear saved memories. Deleting may not be instant: providers can keep data for a set period for safety reviews or legal reasons, which their policy should state. An account provided by your institution, where one exists, usually brings stronger contractual protections than a personal account. On-device models, like this tutor's, keep prompts on your own computer.",
        checks: [
          mc(
            "What's a temporary chat for?",
            [
              "A conversation that isn't saved to your history",
              "A faster model",
              "A chat that fact-checks itself",
              "A chat that expires your password",
            ],
            "Useful for one-off questions you don't want kept in your history.",
          ),
          mc(
            "You delete a conversation. Is it gone from the provider immediately?",
            [
              "Not always; providers may keep data for a set period, as their policy states",
              "Yes, always instantly",
              "No, it's kept forever by law",
              "Only if you delete your account",
            ],
            "Check the retention period in the provider's policy.",
          ),
          mc(
            "Why might an institution-provided account be better for coursework?",
            [
              "It usually comes with stronger contractual data protections",
              "It makes the model smarter",
              "It removes all usage limits",
              "It means you don't need to check answers",
            ],
            "Institutional agreements often rule out training on your data and set retention limits.",
          ),
        ],
      },
    ],
  },
  {
    id: "integrity",
    title: "Copyright and academic integrity",
    blurb: "Using AI honestly in coursework, and who owns what it makes.",
    icon: "gavel",
    shape: "cookie4",
    lesson: "ethics-integrity",
    steps: [
      {
        kind: "learn",
        id: "course-rules",
        title: "The course sets the rules",
        ask: "Am I allowed to use AI on my assignments?",
        notes:
          "Rules for AI in coursework vary by course, and even by assignment. One instructor may encourage AI for brainstorming, another may ban it entirely, and another may allow it with disclosure. The syllabus or assignment instructions set the rule; when they don't say, ask before you use it. Using AI where it isn't allowed, or submitting AI-written work as your own, can be treated as an academic integrity violation, like any other unauthorised help. Policies follow what you're meant to learn: if an assignment is practice in writing, having AI write it skips the learning the grade is meant to show.",
        checks: [
          mc(
            "Where do you find the rules for using AI on an assignment?",
            [
              "The syllabus or assignment instructions, and your instructor if they're unclear",
              "The AI tool's website",
              "A friend in another course",
              "There are no rules",
            ],
            "Rules vary by course and by assignment, so check each one.",
          ),
          mc(
            "The syllabus says nothing about AI. What should you do?",
            [
              "Ask the instructor before using it",
              "Assume anything goes",
              "Assume it's banned and tell nobody",
              "Use it and keep quiet",
            ],
            "A quick question avoids a much bigger problem later.",
          ),
          mc(
            "Why might a writing course ban AI drafting?",
            [
              "The assignment is practice in writing, and AI would skip that learning",
              "AI can't write in English",
              "Instructors dislike technology",
              "It's illegal everywhere",
            ],
            "Rules follow the purpose of the assignment.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "disclosure",
        title: "Say how you used it",
        ask: "How do I disclose that I used AI?",
        notes:
          "When AI use is allowed, say how you used it. A short note is usually enough: the tool, what you used it for, and what you changed, for example “I used Claude to suggest an outline, then wrote and revised the essay myself.” Some instructors ask for the prompts or a link to the chat. Citation styles such as APA and MLA have published guidance on citing generative AI. You remain responsible for everything you submit, including errors and invented sources that came from the tool. Keeping your drafts and notes also helps if you're asked to show your process.",
        checks: [
          mc(
            "What does a good AI disclosure note include?",
            [
              "The tool, what you used it for, and what you changed",
              "Only the word “AI”",
              "The model's parameter count",
              "An apology",
            ],
            "Specific enough that your instructor can see what's yours.",
          ),
          mc(
            "The AI invented a source and you submitted it. Who is responsible?",
            ["You are", "The AI company", "Your instructor", "Nobody, since an AI wrote it"],
            "Whatever you submit is yours, including the tool's mistakes.",
          ),
          mc(
            "Why keep drafts and notes when you use AI?",
            [
              "They show your process if you're asked about your work",
              "They make the AI smarter",
              "Copyright law requires them",
              "They reduce the file size",
            ],
            "A trail of drafts is the simplest evidence of your own work.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "ownership",
        title: "Who owns AI output",
        ask: "Can I copyright something AI made?",
        notes:
          "In the United States, copyright protects works of human authorship. The US Copyright Office has said that material generated entirely by AI from a prompt isn't protected, while human contributions, such as creative selection and arrangement of outputs or substantial edits, can be. In 2025 a federal appeals court upheld the human authorship requirement in Thaler v. Perlmutter. Rules differ in other countries, and each tool's terms of service also say how outputs may be used. This is general information, not legal advice; for anything commercial, ask your institution's copyright or legal office.",
        checks: [
          mc(
            "Under US copyright law, is an image made entirely by AI from a short prompt protected?",
            [
              "Generally no, because copyright requires human authorship",
              "Yes, the person who wrote the prompt owns it fully",
              "Yes, the AI owns it",
              "Only if it's printed",
            ],
            "The Copyright Office's position is that purely AI-generated material isn't protected.",
          ),
          mc(
            "What human contribution to AI-assisted work can be protected?",
            [
              "Creative selection, arrangement or substantial editing",
              "Typing a one-line prompt",
              "Pressing regenerate",
              "Choosing which model to use",
            ],
            "The protected part is what a person creatively contributed.",
          ),
          mc(
            "What did the 2025 Thaler v. Perlmutter appeals decision uphold?",
            [
              "The requirement that copyrighted works have a human author",
              "A ban on AI in schools",
              "An AI's right to own patents",
              "A tax on chatbots",
            ],
            "The court agreed that a work generated by a machine alone can't be registered.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "training-data",
        title: "Training data and copying",
        ask: "Is it legal to train AI on copyrighted work?",
        notes:
          "Generative models are trained on huge amounts of text, images and code collected from the web and other sources, much of it copyrighted. Whether that training is lawful without permission is being tested in many lawsuits, such as The New York Times' 2023 case against OpenAI and Microsoft, and the answers may differ by country. Separately, outputs can sometimes reproduce training material closely, such as a passage of a book, song lyrics or a recognisable character. When you publish or share AI output, you're responsible for not infringing someone else's work, so don't ask for copies of protected material and check output that looks familiar.",
        checks: [
          mc(
            "Is it settled whether training AI on copyrighted work without permission is legal?",
            [
              "No, it's being tested in lawsuits and may differ by country",
              "Yes, it's always legal",
              "Yes, it's always illegal",
              "It only matters for images",
            ],
            "Courts are still working through it, so treat confident claims either way with care.",
          ),
          mc(
            "AI output includes a long passage that looks like it's from a published novel. What should you do?",
            [
              "Don't publish it as yours; check it and avoid copying protected text",
              "Publish it; AI output is always original",
              "Change one word and publish it",
              "Credit the AI as the author",
            ],
            "You're responsible for what you publish, whoever generated it.",
          ),
          mc(
            "Which case is about training data rather than authorship?",
            [
              "The New York Times v. OpenAI and Microsoft (2023)",
              "Thaler v. Perlmutter",
              "Kasparov v. Deep Blue",
              "Dartmouth v. McCarthy",
            ],
            "Thaler is about who can be an author. The Times case is about using articles to train models.",
          ),
        ],
      },
    ],
  },
  {
    id: "jobs",
    title: "AI, jobs and skills",
    blurb: "What changes at work, and the skills that keep their value.",
    icon: "work",
    shape: "sunny",
    lesson: "ai-for-your-field",
    steps: [
      {
        kind: "learn",
        id: "tasks",
        title: "Tasks, not whole jobs",
        ask: "Will AI take my job?",
        notes:
          "Jobs are bundles of tasks, and AI tends to change tasks before it replaces whole jobs. Drafting, summarising, translating, coding and answering routine questions are tasks where current tools help most. Tasks that depend on physical work, relationships, accountability or judgement in unclear situations change less. That's why the same job can be affected very differently in different workplaces. Forecasts of how many jobs AI will affect vary widely between studies, depend on assumptions about adoption, and are often misquoted, so treat any single headline number with caution.",
        checks: [
          mc(
            "How does AI usually affect a job first?",
            [
              "It changes some of the tasks in it",
              "It replaces the whole job overnight",
              "It has no effect on any job",
              "It only changes job titles",
            ],
            "Look at the tasks in a job to see where AI fits.",
          ),
          mc(
            "Which task are current AI tools most likely to help with?",
            [
              "Drafting a routine report",
              "Comforting a patient in person",
              "Fixing a burst pipe",
              "Being accountable for a legal decision",
            ],
            "Text-heavy, routine tasks are where current tools help most.",
          ),
          mc(
            "A headline says AI will replace a precise share of all jobs by 2030. How should you read it?",
            [
              "With caution: forecasts vary widely and depend on assumptions",
              "As a fact",
              "As proof that no jobs will change",
              "As a law",
            ],
            "Check who made the forecast and what they assumed.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "evidence",
        title: "What studies show",
        ask: "Does AI actually make people more productive?",
        notes:
          "Some of the clearest evidence comes from field studies. A study of more than 5,000 customer-support agents by Brynjolfsson, Li and Raymond found that an AI assistant raised the number of issues resolved per hour by about 14% on average, with the largest gains for newer, less experienced agents and little gain for the most experienced. A study of consultants at Boston Consulting Group found AI helped on tasks within its abilities but made people more likely to get the wrong answer on a task just outside them, which the authors called a jagged frontier. Results depend on the task, the tool and how people use it.",
        checks: [
          mc(
            "In the customer-support study, who gained most from the AI assistant?",
            ["Newer, less experienced agents", "The most experienced agents", "Managers", "Nobody"],
            "The assistant spread what experienced agents knew to newer ones.",
          ),
          mc(
            "What is the “jagged frontier”?",
            [
              "AI helps on some tasks but hurts on tasks just outside its abilities, and the boundary isn't obvious",
              "A border between countries that ban AI",
              "The edge of a model's context window",
              "A type of chart",
            ],
            "Two tasks that look similar can fall on opposite sides of what AI does well.",
          ),
          mc(
            "What do these field studies suggest overall?",
            [
              "Results depend on the task, the tool and how people use it",
              "AI always doubles productivity",
              "AI never helps",
              "Only experts benefit",
            ],
            "Gains are real in some settings and negative in others.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "skills",
        title: "Skills that last",
        ask: "What skills matter most as AI improves?",
        notes:
          "The skills that keep their value are the ones AI can't supply for you. Domain knowledge lets you judge whether an answer is right. Clear writing and thinking make better prompts and better results. Verification, knowing how to check a claim, source or calculation, matters more as generated content grows. Judgement about when to use AI, and when not to, is itself a skill. Using AI to skip learning the basics can leave you unable to spot its mistakes, so use it to practise, get feedback and explore, not only to finish tasks faster.",
        checks: [
          mc(
            "Why does domain knowledge matter more, not less, with AI?",
            [
              "It lets you judge whether the AI's answer is right",
              "AI can't answer questions in any field",
              "Employers ban AI",
              "It doesn't matter anymore",
            ],
            "You can only catch errors in a field you understand.",
          ),
          mc(
            "What's the risk of using AI to skip learning the basics?",
            [
              "You may not be able to spot its mistakes",
              "The AI will get offended",
              "You'll use too few tokens",
              "There's no risk",
            ],
            "The basics are what let you check the output.",
          ),
          mc(
            "Which is a good way to use AI while learning?",
            [
              "Ask it to quiz you and give feedback on your attempts",
              "Have it write every assignment",
              "Copy its answers without reading them",
              "Use it only to skip readings",
            ],
            "Practice and feedback build skill; outsourcing skips it.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "showing",
        title: "Talking about AI skills",
        ask: "How do I show employers I can use AI well?",
        notes:
          "When you talk about AI skills with employers, be specific. Describe what you did, the tool, and how you checked the result, for example “I used an AI assistant to clean survey responses, then spot-checked 50 rows against the originals.” Knowing a tool's limits, handling data responsibly and following an organisation's rules count as much as speed. Ask about a workplace's AI policy before using tools with its data. Many roles now expect comfort with AI tools, but the lasting advantage comes from pairing them with expertise in your field.",
        checks: [
          mc(
            "Which is the strongest way to describe an AI skill on an application?",
            [
              "Say what you did, with which tool, and how you checked the result",
              "List every AI tool you've heard of",
              "Call yourself an AI expert",
              "Say AI did all your work",
            ],
            "A concrete example with a check shows judgement, not just tool use.",
          ),
          mc(
            "Before using an AI tool with your employer's data, what should you do?",
            ["Check the workplace's AI policy", "Use your personal account", "Ask a friend", "Nothing"],
            "Work data often comes with rules about which tools may see it.",
          ),
          mc(
            "Where does the lasting advantage come from?",
            [
              "Pairing AI tools with expertise in your field",
              "Knowing the most tools",
              "Typing prompts faster",
              "Always using the largest model",
            ],
            "Tools change quickly. Knowing your field lets you use any of them well.",
          ),
        ],
      },
    ],
  },
  {
    id: "governance",
    title: "AI rules and governance",
    blurb: "What the EU AI Act and NIST's framework do, in plain terms.",
    icon: "account_balance",
    shape: "soft12",
    lesson: "ethics-integrity",
    steps: [
      {
        kind: "learn",
        id: "layers-of-rules",
        title: "Layers of rules",
        ask: "What does AI governance mean?",
        notes:
          "Governance means the rules, standards and practices that shape how AI is built and used. It comes in layers: laws passed by governments, standards and voluntary frameworks, policies set by companies and universities, and the terms of each tool. Most rules focus on how AI is used rather than on the technology itself, because the same model can write a poem or screen job applicants, and the risks differ. Rules are changing quickly and differ by country. This quest gives a high-level picture, not legal advice.",
        checks: [
          mc(
            "Why do most AI rules focus on how AI is used?",
            [
              "The same model can be used for low-risk and high-risk purposes",
              "The technology never changes",
              "All models are identical",
              "Uses are easier to tax",
            ],
            "A poem and a hiring decision carry very different risks, even from the same model.",
          ),
          mc(
            "Which is an example of AI governance?",
            [
              "A university policy on AI in coursework",
              "A model's temperature setting",
              "A tokenizer's vocabulary",
              "A graphics chip's clock speed",
            ],
            "Institutional policies are one layer of governance, alongside laws and standards.",
          ),
          mc(
            "What's true of AI rules today?",
            [
              "They're changing quickly and differ by country",
              "They're the same worldwide",
              "They haven't changed since 1956",
              "There aren't any",
            ],
            "Check the current rules where you are, and when in doubt, ask.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "eu-ai-act",
        title: "The EU AI Act",
        ask: "What does the EU AI Act do?",
        notes:
          "The EU AI Act, which entered into force in August 2024, is the first broad AI law from a major jurisdiction. It sorts uses by risk. A few practices are banned, such as social scoring and some manipulative techniques. High-risk uses, including AI in education admissions and grading, hiring, credit and critical infrastructure, face requirements such as risk management, data quality, human oversight and documentation. Limited-risk uses carry transparency duties: people should know when they're talking to a chatbot, and deepfakes must be labelled. Most other uses, like spam filters, face no new obligations. Providers of general-purpose models have their own duties, and the rules phase in over several years.",
        checks: [
          mc(
            "How does the EU AI Act organise its rules?",
            [
              "By the level of risk of each use",
              "By the size of the company",
              "By the programming language used",
              "By the model's release year",
            ],
            "Banned, high-risk, limited-risk and minimal-risk uses face different rules.",
          ),
          mc(
            "Under the EU AI Act, which use counts as high-risk?",
            ["AI used to grade exams or decide admissions", "A spam filter", "A video game opponent", "A spell-checker"],
            "Uses that shape people's access to education, work or credit face the strictest requirements short of a ban.",
          ),
          mc(
            "What transparency duty does the Act set for chatbots?",
            [
              "People should know they're interacting with an AI",
              "Chatbots must be open source",
              "Chatbots must answer in every EU language",
              "None",
            ],
            "Limited-risk uses mainly carry disclosure duties.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "nist",
        title: "The NIST framework",
        ask: "What is the NIST AI Risk Management Framework?",
        notes:
          "In the United States, the National Institute of Standards and Technology (NIST) published the AI Risk Management Framework 1.0 in January 2023. It's voluntary guidance, not a law. It organises risk management into four functions: Govern (set up policies, roles and accountability), Map (understand a system's context and risks), Measure (test and track those risks) and Manage (act on them and keep monitoring). It describes trustworthy AI as valid and reliable, safe, secure and resilient, accountable and transparent, explainable, privacy-enhanced, and fair with harmful bias managed. Many organisations use it as a starting point for their own practices.",
        checks: [
          mc(
            "Is the NIST AI Risk Management Framework a law?",
            ["No, it's voluntary guidance", "Yes, a federal criminal law", "Yes, an EU regulation", "It's a software library"],
            "Organisations adopt it by choice, often as a basis for their own policies.",
          ),
          mc(
            "What are the NIST framework's four functions?",
            ["Govern, Map, Measure, Manage", "Plan, Build, Test, Ship", "Collect, Train, Deploy, Retire", "Detect, Deny, Delay, Defend"],
            "Govern sets up accountability; Map, Measure and Manage handle a system's risks.",
          ),
          mc(
            "In the NIST framework, what does the Measure function cover?",
            [
              "Testing and tracking a system's risks",
              "Counting a model's parameters",
              "Counting users",
              "Measuring server temperature",
            ],
            "You can't manage a risk you haven't measured.",
          ),
        ],
      },
      {
        kind: "learn",
        id: "in-practice",
        title: "Rules you'll meet",
        ask: "How does AI governance affect me day to day?",
        notes:
          "For students and staff, governance shows up in everyday rules: a course's AI policy, your institution's approved tools and data rules, a publisher's policy on AI in submissions, an employer's guidelines, and each tool's terms of use. Many journals, for example, don't allow an AI tool to be listed as an author and ask authors to disclose how AI was used. When rules overlap, following the stricter one keeps you safe. If you're building or deploying an AI system that affects people, use the frameworks: map the risks, test for them, and keep a person accountable.",
        checks: [
          mc(
            "What do many journals' policies say about AI and authorship?",
            [
              "An AI tool can't be listed as an author, and its use should be disclosed",
              "AI must be listed as first author",
              "AI use is always banned in research",
              "Nothing",
            ],
            "Authors take responsibility for a paper, which a tool can't do.",
          ),
          mc(
            "A course allows AI, but your lab's data rules don't allow it for lab data. What applies to the lab data?",
            ["The stricter lab rule", "The course rule", "Whichever you prefer", "Neither"],
            "When rules overlap, following the stricter one keeps you safe.",
          ),
          mc(
            "You're building an AI tool that screens applications. What does good governance suggest?",
            [
              "Map the risks, test for them, and keep a person accountable",
              "Launch first and fix problems later",
              "Hide how it works",
              "Let the tool decide alone",
            ],
            "Screening people is high-stakes, so it needs testing and human accountability.",
          ),
        ],
      },
    ],
  },
];
