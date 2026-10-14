import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { Category } from "../../src/data/categories";
import type { Candidate } from "./grow";

/**
 * The optional second opinion. With ANTHROPIC_API_KEY set, a language model reads announcements the
 * pattern matcher can't, files tools more carefully, and judges whether a proposed new category is
 * really new. Everything it says is checked by the same rules as the pattern path (a tool is still
 * listed only with enough evidence, a category still needs several tools), and any failure falls back
 * to the pattern path, so the daily run never depends on it.
 */

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";

export interface Claude {
  /** Products and models named in posts. `index` points back into the posts given. */
  extract(posts: { source: string; title: string; summary: string }[], known: string[]): Promise<{ index: number; name: string; kind: "tool" | "model" }[]>;
  /** The categories a tool belongs to, most specific first, or none if nothing fits. */
  classify(tool: { name: string; text: string }, categories: Category[]): Promise<string[]>;
  /** A second look at a proposed new category: keep, rename or refuse. */
  review(draft: Candidate, categories: Category[]): Promise<Candidate | null>;
}

type Client = Pick<Anthropic, "beta">;

const Extracted = z.object({
  items: z.array(z.object({ index: z.number().int(), name: z.string(), kind: z.enum(["tool", "model"]) })),
});

const EXTRACT_SYSTEM = `You find new AI products in news and blog posts for the USC AI Knowledge Hub, which helps students and faculty choose AI tools.
List only products and models that people can use or try: an app, a service, a model they can run or call. Do not list companies, research papers, funding rounds, policy, events, or features of a product that is already on the known list.
Give the product's name without version numbers ("Veo", not "Veo 3.1"), as its makers write it. kind is "model" for a model family and "tool" for a product or app. If a post names no new product, list nothing for it. Never invent a name.`;

const Classified = z.object({ ids: z.array(z.string()) });
const CLASSIFY_SYSTEM = `You file AI tools into a category tree for the USC AI Knowledge Hub's tool finder.
Pick the most specific category or categories (at most 3) that describe what the tool is for, using only the ids you are given. Prefer a sub-category to its parent. If nothing fits well, return an empty list: an unfiled tool is better than a wrong one.`;

const Reviewed = z.object({
  decision: z.enum(["create", "existing", "refuse"]),
  label: z.string(),
  parent: z.string().nullable(),
  definition: z.string(),
  keywords: z.array(z.string()),
});
const REVIEW_SYSTEM = `A tool finder groups AI tools into categories. Tools keep turning up that fit no category, and several share the same purpose. Decide whether they deserve a new category.
- "existing": the purpose is already covered by an existing category, even under different words. Say so rather than making a near-duplicate.
- "refuse": the shared phrase is not a real purpose (a marketing word, a technology rather than a use, or too narrow to help someone choose a tool).
- "create": it is a distinct thing a person would look for. Give a short sentence-case label (2 to 4 words, no hype), the id of the broad category it belongs inside (or null if it stands alone), a one-sentence definition, and 4 to 8 keywords tools in it would use.`;

export function makeClaude(client: Client = new Anthropic()): Claude {
  const ask = async <T extends z.ZodType>(schema: T, system: string, input: unknown, max = 8000) => {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: max,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(schema) },
      system,
      messages: [{ role: "user", content: JSON.stringify(input, null, 1) }],
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) throw new Error(`Claude returned nothing (stop_reason: ${response.stop_reason})`);
    return response.parsed_output as z.infer<T>;
  };

  return {
    async extract(posts, known) {
      const out = await ask(Extracted, EXTRACT_SYSTEM + `\nKnown products (skip these): ${known.join(", ")}.`, posts.map((p, index) => ({ index, ...p, summary: p.summary.slice(0, 400) })));
      return out.items.filter((i) => i.index >= 0 && i.index < posts.length && i.name.trim().length > 1 && i.name.length <= 40);
    },
    async classify(tool, categories) {
      const ids = new Set(categories.map((c) => c.id));
      const tree = categories.map((c) => `${c.id}${c.parent ? ` (inside ${c.parent})` : ""}: ${c.label}. ${c.definition}`).join("\n");
      const out = await ask(Classified, `${CLASSIFY_SYSTEM}\n\nCategories:\n${tree}`, { name: tool.name, about: tool.text.slice(0, 900) }, 1000);
      return out.ids.filter((id) => ids.has(id)).slice(0, 3);
    },
    async review(draft, categories) {
      const tree = categories.map((c) => `${c.id}${c.parent ? ` (inside ${c.parent})` : ""}: ${c.label}. ${c.definition}`).join("\n");
      const out = await ask(Reviewed, `${REVIEW_SYSTEM}\n\nExisting categories:\n${tree}`, { phrase: draft.phrase, proposedLabel: draft.label, tools: draft.examples }, 1500);
      if (out.decision !== "create") return null;
      const label = out.label.trim().slice(0, 60);
      if (label.length < 3) return null;
      const roots = new Set(categories.filter((c) => !c.parent).map((c) => c.id));
      return {
        ...draft,
        label,
        parent: out.parent && roots.has(out.parent) ? out.parent : undefined,
        definition: out.definition.trim().slice(0, 240) || draft.definition,
        keywords: [draft.phrase, ...out.keywords.map((k) => k.trim().toLowerCase()).filter((k) => k.length > 1 && k.length <= 60)].slice(0, 8),
      };
    },
  };
}
