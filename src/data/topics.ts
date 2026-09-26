/**
 * Learning topics. The pipeline tags each video with the topics it matches so
 * every learning module can show fresh videos next to its curated ones.
 */
export interface Topic {
  id: string;
  label: string;
  match: string[];
}

export const topics: Topic[] = [
  { id: "genai-basics", label: "What is generative AI", match: ["what is (generative )?ai", "generative ai explained", "ai basics", "ai for beginners", "intro(duction)? to (generative )?ai", "how does ai work"] },
  { id: "chat-basics", label: "Using AI assistants", match: ["how to use (chat ?gpt|claude|gemini|copilot)", "(chat ?gpt|claude|gemini) (for beginners|tutorial|basics|guide)", "getting started with (chat ?gpt|claude|gemini)"] },
  { id: "llms", label: "How LLMs work", match: ["large language models?", "\\bllms?\\b", "transformers?", "attention mechanism", "tokens?(ization)?\\b", "how (chat ?gpt|llms?) works?"] },
  { id: "reasoning", label: "Reasoning models", match: ["reasoning models?", "thinking models?", "chain[- ]of[- ]thought", "extended thinking", "deep think"] },
  { id: "multimodal", label: "Image, video & audio", match: ["multimodal", "image generation", "text[- ]to[- ](image|video|speech)", "ai video", "ai images?", "voice (clone|cloning|agent)"] },
  { id: "agents", label: "AI agents", match: ["\\bagents?\\b", "agentic", "\\bmcp\\b", "model context protocol", "computer use", "tool (use|calling)"] },
  { id: "rag", label: "RAG & your own data", match: ["\\brag\\b", "retrieval[- ]augmented", "vector (db|database|store)", "embeddings?", "chat with (your|pdf|documents)"] },
  { id: "limits", label: "Limits & hallucinations", match: ["hallucinat", "ai (mistakes|fails|limitations)", "can('|no)t (ai|chat ?gpt)", "fact[- ]check", "bias(es)? in ai"] },
  { id: "prompting", label: "Prompting", match: ["prompt(ing| engineering)?", "system prompts?", "custom instructions"] },
  { id: "research", label: "Research & verification", match: ["research (with|using) ai", "ai (for|in) research", "literature reviews?", "citations?", "deep research", "academic (papers?|sources)", "fact[- ]check"] },
  { id: "writing", label: "Writing", match: ["ai writing", "writ(e|ing) (with|using) ai", "(academic|essay|creative|technical) writing", "essays?", "proofread"] },
  { id: "data", label: "Data analysis", match: ["data analysis", "analy[sz]e data", "spreadsheets?", "excel", "csv", "charts?", "pandas", "sql"] },
  { id: "coding", label: "Coding with AI", match: ["\\bcod(e|ing)\\b", "programming", "python", "javascript", "vibe cod", "build an? (app|website)"] },
  { id: "presenting", label: "Presentations", match: ["presentations?", "slides?", "slide decks?", "powerpoint", "pitch decks?"] },
  { id: "automation", label: "Automation", match: ["automat(e|ion|ions)", "workflows?", "zaps?\\b", "no[- ]code"] },
  { id: "field", label: "AI for your field", match: ["for (doctors|lawyers|marketers|teachers|nurses|engineers|accountants|designers|researchers|business)", "in (healthcare|law|finance|marketing|education|journalism)"] },
  { id: "teaching", label: "Teaching with AI", match: ["teach(ers|ing)", "educators?", "classroom", "lesson plans?", "course design"] },
  { id: "assessment", label: "Assessment", match: ["assessments?", "grading", "assignments?", "academic integrity", "cheating"] },
  { id: "ethics", label: "Ethics & integrity", match: ["ethic(s|al)", "academic integrity", "copyright", "privacy", "responsible ai", "ai policy", "regulation"] },
];

export const topicById = new Map(topics.map((t) => [t.id, t]));
