import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { tools } from "../../src/data/tools";
import { topics } from "../../src/data/topics";
import type { Difficulty } from "../../src/data/types";
import type { Candidate } from "./quality";

/**
 * Optional second opinion from Claude. When ANTHROPIC_API_KEY is set, new
 * videos are classified in batches: difficulty, tools, topics, a one-line
 * "what you'll learn", and whether the video actually teaches something.
 * Any failure falls back to the keyword heuristic, so the daily run never
 * breaks because of this step.
 */

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";

const TOOL_IDS = tools.map((t) => t.id) as [string, ...string[]];
const TOPIC_IDS = topics.map((t) => t.id) as [string, ...string[]];

const Result = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      educational: z.boolean(),
      difficulty: z.enum(["beginner", "intermediate", "advanced"]),
      tools: z.array(z.enum(TOOL_IDS)),
      topics: z.array(z.enum(TOPIC_IDS)),
      summary: z.string(),
    }),
  ),
});

export interface ClaudeLabel {
  educational: boolean;
  difficulty: Difficulty;
  tools: string[];
  topics: string[];
  summary: string;
}

const SYSTEM = `You label YouTube videos for the USC AI Knowledge Hub, a site where USC students and faculty learn to use AI tools. Your labels decide which videos appear on the site and at what level.

For each video decide:
- educational: true only if a viewer would come away able to do or understand something new about AI tools. News roundups with substance count. Pure hype, reaction videos, get-rich-quick schemes, giveaways and trailers with no teaching do not.
- difficulty, for a university audience:
  - beginner: assumes no prior experience with the tool; setup, first uses, core concepts.
  - intermediate: assumes regular use; better workflows, prompting technique, features most people miss.
  - advanced: code, APIs, agents, automation pipelines, RAG, evaluation, or deep technical explanation.
- tools: which of the catalog's tools the video substantially teaches. Leave it empty rather than guess from a passing mention.
- topics: up to three learning topics it covers.
- summary: one plain sentence, at most 140 characters, saying what the viewer will learn. Start with a verb. No hype, no emoji, no channel name.

Tool catalog: ${tools.map((t) => `${t.id} (${t.name})`).join(", ")}.
Topics: ${topics.map((t) => `${t.id} (${t.label})`).join(", ")}.

Return one item per input video, using the input id.`;

export async function classifyWithClaude(
  batch: (Candidate & { heuristicTools: string[] })[],
): Promise<Map<string, ClaudeLabel>> {
  const client = new Anthropic();
  const input = batch.map((v) => ({
    id: v.id,
    title: v.title,
    channel: v.channel,
    minutes: v.duration ? Math.round(v.duration / 60) : null,
    description: v.description.slice(0, 700),
    keyword_tool_guess: v.heuristicTools,
  }));

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(Result) },
    system: SYSTEM,
    messages: [{ role: "user", content: JSON.stringify(input, null, 1) }],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`Claude returned no labels (stop_reason: ${response.stop_reason})`);
  }

  const out = new Map<string, ClaudeLabel>();
  for (const item of response.parsed_output.items) {
    out.set(item.id, {
      educational: item.educational,
      difficulty: item.difficulty,
      tools: item.tools,
      topics: item.topics.slice(0, 3),
      summary: item.summary.slice(0, 180),
    });
  }
  return out;
}
