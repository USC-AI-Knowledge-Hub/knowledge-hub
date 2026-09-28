import { describe, expect, it } from "vitest";
import { moduleById, paths } from "../../../data/learn";
import { PATH_QUESTIONS, intentOf, nextModule, pickPath, planNavigation, routeMessage, toolQuestion } from "../guide";
import { LIMITS, buildMessages, clip, stripThink, type ChatMessage } from "../prompt";
import { quests } from "../quests";
import { DEFAULT_MODEL, MODELS, WASM_MODEL, modelById, onnxFile } from "../registry";
import { bestQuestStep, ground, lessonNotes } from "../retrieval";
import { scoreCount, scorePrompt } from "../rubric";

describe("what to learn next", () => {
  it("starts new students on the student starter path", () => {
    const n = nextModule([])!;
    expect(n.path.id).toBe("student");
    expect(n.module.id).toBe("what-is-genai");
  });

  it("continues the path with the most progress", () => {
    const builder = paths.find((p) => p.id === "builder")!;
    const done = builder.steps.slice(0, 3).map((s) => s.module);
    const n = nextModule(done)!;
    expect(n.path.id).toBe("builder");
    expect(n.module.id).toBe(builder.steps[3].module);
    expect(n.reason).toMatch(/3 of 6/);
  });

  it("prefers the path the student is on", () => {
    const n = nextModule(["what-is-genai"], "faculty")!;
    expect(n.path.id).toBe("faculty");
    expect(n.module.id).toBe("limits");
  });

  it("moves on when a path is finished", () => {
    const student = paths.find((p) => p.id === "student")!.steps.map((s) => s.module);
    const n = nextModule(student)!;
    expect(n.path.id).not.toBe("student");
    expect(student).not.toContain(n.module.id);
  });

  it("returns null when everything is done", () => {
    expect(nextModule(paths.flatMap((p) => p.steps.map((s) => s.module)))).toBeNull();
  });
});

describe("pick a path", () => {
  it("maps answers to sensible paths", () => {
    expect(pickPath("undergrad", "coursework").id).toBe("student");
    expect(pickPath("grad", "research").id).toBe("researcher");
    expect(pickPath("faculty", "teach").id).toBe("faculty");
    expect(pickPath("maker", "build").id).toBe("builder");
    expect(pickPath("undergrad", "build").id).toBe("builder");
  });

  it("always recommends a real path", () => {
    for (const r of PATH_QUESTIONS[0].options) for (const g of PATH_QUESTIONS[1].options) expect(paths).toContain(pickPath(r.id, g.id));
  });
});

describe("navigation", () => {
  it("ignores ordinary questions", () => {
    expect(planNavigation("What is a token?")).toBeNull();
  });

  it("goes straight to a clear winner", () => {
    const p = planNavigation("take me to the courses")!;
    expect(p.go?.route).toBe("/learn/courses");
    expect(planNavigation("open the tools page")!.go?.route).toBe("/tools");
    expect(planNavigation("where is the video library?")!.go?.route).toBe("/watch");
  });

  it("finds lessons and tools by name", () => {
    expect(planNavigation("take me to the prompting lesson")!.hits[0].route).toBe("/learn/prompting");
    expect(planNavigation("open claude code")!.hits.map((h) => h.route)).toContain("/tools/claude-code");
  });

  it("offers choices instead of guessing when it's close", () => {
    for (const q of ["take me to the courses", "open ethics", "show me agents", "go to data"]) {
      const p = planNavigation(q)!;
      if (p.go && p.hits[1]) expect(p.go.score).toBeGreaterThanOrEqual(2 * p.hits[1].score);
    }
  });
});

describe("routing a message", () => {
  it("sends each kind of message to the right place", () => {
    expect(routeMessage("What should I learn next?")).toEqual({ type: "intent", intent: "next" });
    expect(routeMessage("find me a tool for slides")).toMatchObject({ type: "tool" });
    expect(routeMessage("take me to the courses")).toMatchObject({ type: "nav", plan: { go: { route: "/learn/courses" } } });
    expect(routeMessage("What is a token?")).toEqual({ type: "chat" });
  });

  it("treats “show me how…” as a question, not a destination", () => {
    expect(routeMessage("show me how attention works")).toEqual({ type: "chat" });
    expect(routeMessage("can you show me an example of a good prompt")).toEqual({ type: "chat" });
    expect(planNavigation("show me what tokens are")).toBeNull();
  });
});

describe("intents", () => {
  it("recognizes tool questions", () => {
    const t = toolQuestion("Which tool should I use to make slides?")!;
    expect(t.hits.map((h) => h.tool.id)).toContain("gamma");
    expect(toolQuestion("What is attention?")).toBeNull();
  });

  it("recognizes path questions", () => {
    expect(intentOf("What should I learn next?")).toBe("next");
    expect(intentOf("Can you pick a path for me?")).toBe("path");
    expect(intentOf("What is a transformer?")).toBeNull();
  });
});

describe("grounding", () => {
  it("finds the right lesson and quest notes", () => {
    const g = ground("What is a token?");
    expect(g.lesson?.id).toBe("llms");
    expect(g.notes).toMatch(/token/i);
    expect(g.related.length).toBeGreaterThan(0);
    expect(g.related.length).toBeLessThanOrEqual(3);
  });

  it("uses quest notes for topics outside the lessons", () => {
    expect(bestQuestStep("how much electricity does a chatbot prompt use")?.quest.id).toBe("environment");
    expect(bestQuestStep("what was the dartmouth workshop")?.quest.id).toBe("history");
    expect(bestQuestStep("pizza recipes")).toBeNull();
  });

  it("keeps notes inside the budget", () => {
    for (const q of ["What is a token?", "How do agents and RAG work together with prompting?", "energy use of data centres", "zzz"]) {
      expect(ground(q).notes.length).toBeLessThanOrEqual(LIMITS.notes);
    }
    expect(lessonNotes(moduleById.get("llms")!)).toMatch(/Key ideas:/);
  });
});

describe("prompt assembly", () => {
  const long = "word ".repeat(2000);

  it("puts the notes in a short system prompt", () => {
    const m = buildMessages("answer", "Tokens are word pieces.", "What is a token?");
    expect(m[0].role).toBe("system");
    expect(m[0].content).toContain("Tokens are word pieces.");
    expect(m[0].content).toMatch(/120 words/);
    expect(m.at(-1)).toEqual({ role: "user", content: "What is a token?" });
  });

  it("keeps at most six recent turns, starting with the student", () => {
    const history: ChatMessage[] = Array.from({ length: 12 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `turn ${i}` }));
    const m = buildMessages("answer", "notes", "next", history);
    const turns = m.slice(1, -1);
    expect(turns.length).toBeLessThanOrEqual(LIMITS.turns);
    expect(turns[0].role).toBe("user");
    expect(turns.at(-1)!.content).toBe("turn 11");
  });

  it("never exceeds the total length limit", () => {
    const history: ChatMessage[] = Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: long }));
    const m = buildMessages("answer", long, long, history);
    const size = m.reduce((n, x) => n + x.content.length, 0);
    expect(size).toBeLessThanOrEqual(LIMITS.total);
    expect(m[0].content.length).toBeLessThan(LIMITS.notes + 700);
    expect(m.at(-1)!.content.length).toBeLessThanOrEqual(LIMITS.question);
  });

  it("clips at a word boundary", () => {
    expect(clip("one two three four five", 12)).toBe("one two…");
    expect(clip("short", 12)).toBe("short");
  });

  it("strips reasoning blocks", () => {
    expect(stripThink("<think>hmm, tokens</think>\n\nA token is a word piece.")).toBe("A token is a word piece.");
    expect(stripThink("A token<think>still thinking")).toBe("A token");
    expect(stripThink("leftover reasoning</think>Answer.")).toBe("Answer.");
    expect(stripThink("<think></think>Answer <b>ok</b>")).toBe("Answer <b>ok</b>");
    expect(stripThink("Plain answer.")).toBe("Plain answer.");
  });
});

describe("prompt rubric", () => {
  it("scores a lazy prompt low and a strong one high", () => {
    expect(scoreCount(scorePrompt("help me study bio"))).toBeLessThanOrEqual(2);
    // Every stronger prompt in every dojo task covers the whole rubric.
    const strong = quests.flatMap((q) => q.steps.flatMap((s) => (s.kind === "dojo" ? s.tasks.map((t) => t.stronger) : [])));
    expect(strong.length).toBeGreaterThanOrEqual(6);
    for (const p of strong) expect(scoreCount(scorePrompt(p)), p.slice(0, 60)).toBe(5);
  });

  it("scores nothing for an empty prompt", () => {
    expect(scoreCount(scorePrompt("   "))).toBe(0);
  });
});

describe("model registry", () => {
  it("recommends a Qwen model under 500 MB and offers a WASM fallback", () => {
    const d = modelById.get(DEFAULT_MODEL)!;
    expect(d.name).toMatch(/Qwen/);
    expect(d.variants.webgpu!.mb).toBeLessThan(500);
    expect(modelById.get(WASM_MODEL)!.variants.wasm).toBeDefined();
    for (const m of MODELS) expect(Object.keys(m.variants).length).toBeGreaterThan(0);
  });

  it("maps dtypes to Transformers.js file names", () => {
    expect(onnxFile("q4f16")).toBe("model_q4f16.onnx");
    expect(onnxFile("q8")).toBe("model_quantized.onnx");
  });
});
