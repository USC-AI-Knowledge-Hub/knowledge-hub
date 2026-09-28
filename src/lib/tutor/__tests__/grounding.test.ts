import { describe, expect, it } from "vitest";
import { pageLabel } from "../../../components/tutor/TutorApp";
import { buildMessages, stripFiller } from "../prompt";
import { followUpContext, ground } from "../retrieval";
import { watchFor } from "../watch";

/** A conversation as the tutor sees it: each question with the topic carried over from before. */
function converse(questions: string[], prefer?: string) {
  let last: string | null = null;
  return questions.map((q) => {
    const context = followUpContext(q, last);
    last = context ? `${context} ${q}` : q;
    return { q, context, g: ground(q, { context, prefer }) };
  });
}

describe("grounding a real conversation", () => {
  // From a student's session: every answer came from the wrong lesson.
  const turns = converse(["explain llms to me", "explain its architecture", "give its full structure", "what are attention models", "show me how it works"], "ai-for-your-field");

  it("answers an off-topic question on a lesson page from the right lesson", () => {
    expect(turns[0].g.sources[0].title).toBe("How large language models work");
  });

  it("keeps the topic for follow-ups that name none", () => {
    expect(turns[1].context).toMatch(/llms/);
    expect(turns[2].context).toMatch(/llms/);
    expect(turns[4].context).toMatch(/attention/);
  });

  it("finds the transformer's parts for architecture questions", () => {
    for (const t of turns.slice(1, 3)) {
      expect(t.g.sources.map((s) => s.title)).toContain("Inside a transformer");
      expect(t.g.notes).toMatch(/Embeddings/);
      expect(t.g.notes).toMatch(/Layers/);
    }
  });

  it("explains attention from the attention notes", () => {
    for (const t of turns.slice(3)) expect(t.g.notes).toMatch(/^Attention:/m);
  });

  it("never grounds in unrelated lessons", () => {
    for (const t of turns) expect(t.g.sources.map((s) => s.title).join()).not.toMatch(/for your major|Automating|What AI gets wrong/);
  });
});

describe("grounding single questions", () => {
  it.each([
    ["why do chatbots make things up", "Spot the hallucination"],
    ["what is RAG", "RAG: AI over your own documents"],
    ["how much electricity does one prompt use", "AI and the environment"],
    ["what was the dartmouth workshop", "A short history of AI"],
  ])("%s", (q, source) => {
    expect(ground(q).sources[0]?.title).toBe(source);
  });

  it("uses the page's lesson for a vague question there", () => {
    expect(ground("explain this", { prefer: "rag" }).sources[0]?.title).toBe("RAG: AI over your own documents");
  });

  it("starts fresh when a question names its own topic", () => {
    expect(followUpContext("what is RAG", "explain llms to me")).toBeNull();
  });
});

describe("answer quality", () => {
  it("strips closing offers of help", () => {
    expect(stripFiller("Attention lets each token look at the others. Let me know how I can explain this architecture!")).toBe(
      "Attention lets each token look at the others.",
    );
    expect(stripFiller("Tokens are pieces of words. Feel free to ask more. I hope this helps!")).toBe("Tokens are pieces of words.");
    expect(stripFiller("Let me know.")).toBe("Let me know.");
  });

  it("tells the model which page the student is on", () => {
    expect(pageLabel("/learn/prompting")).toBe("the lesson “Prompting that works”");
    expect(pageLabel("/green")).toMatch(/Green AI/);
    const [system] = buildMessages("answer", "notes", "q", [], pageLabel("/learn/prompting"));
    expect(system.content).toContain("The student is on the lesson “Prompting that works”");
  });

  it("suggests a mix of videos for the lessons an answer used", () => {
    const list = watchFor(["llms", "what-is-genai"], null);
    expect(list.length).toBeGreaterThanOrEqual(4);
    expect(new Set(list.map((v) => v.kind)).size).toBeGreaterThanOrEqual(2);
    expect(new Set(list.map((v) => v.key)).size).toBe(list.length);
  });
});
