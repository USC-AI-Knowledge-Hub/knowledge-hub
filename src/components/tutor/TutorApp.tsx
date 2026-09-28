import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { matchPath, useLocation, useNavigate } from "react-router";
import { moduleById, pathById } from "../../data/learn";
import { TASK_LABEL, toolById } from "../../data/tools";
import type { Task } from "../../data/types";
import { searchSite, searchTools, type SiteHit } from "../../lib/siteSearch";
import { nextModule, routeMessage } from "../../lib/tutor/guide";
import { buildMessages, type ChatMessage, type Mode } from "../../lib/tutor/prompt";
import { onAsk, takeAsks } from "../../lib/tutor/bridge";
import { followUpContext, ground, moduleNotes, toolNotesById, type Source } from "../../lib/tutor/retrieval";
import { pathStore } from "../../lib/tutor/storage";
import { useTutorEngine } from "../../lib/tutor/useEngine";
import { useProgress } from "../../lib/progress";
import "../../styles/tutor.css";
import { TutorContext, type Action, type Item, type NewItem, type TutorApi, type View } from "./context";
import { TutorSheet } from "./TutorSheet";

export type PageContext =
  | { kind: "lesson"; id: string; title: string }
  | { kind: "tool"; id: string; title: string }
  | { kind: "tools" }
  | { kind: "path"; id: string; title: string }
  | null;

export function pageContext(pathname: string): PageContext {
  // A guided lesson, inside a course or on its own.
  const g = matchPath("/learn/path/:path/:id", pathname) ?? matchPath("/learn/lesson/:id", pathname);
  if (g) {
    const m = moduleById.get(g.params.id ?? "");
    return m ? { kind: "lesson", id: m.id, title: m.title } : null;
  }
  const p = matchPath("/learn/path/:id", pathname);
  if (p) {
    const path = pathById.get(p.params.id ?? "");
    return path ? { kind: "path", id: path.id, title: path.title } : null;
  }
  const l = matchPath("/learn/:id", pathname);
  if (l) {
    const m = moduleById.get(l.params.id ?? "");
    return m ? { kind: "lesson", id: m.id, title: m.title } : null;
  }
  const t = matchPath("/tools/:id", pathname);
  if (t) {
    const tool = toolById.get(t.params.id ?? "");
    return tool ? { kind: "tool", id: tool.id, title: tool.name } : null;
  }
  if (matchPath("/tools", pathname)) return { kind: "tools" };
  return null;
}

/** Where the student is, in words the model can use: "the lesson “Prompting that works”". */
export function pageLabel(pathname: string): string | undefined {
  const c = pageContext(pathname);
  if (c?.kind === "lesson") return `the lesson “${c.title}”`;
  if (c?.kind === "path") return `the learning path “${c.title}”`;
  if (c?.kind === "tool") return `the tool page for ${c.title}`;
  if (c?.kind === "tools") return "the tool map, which finds AI tools by task";
  const exact: Record<string, string> = {
    "/": "the home page",
    "/learn": "the Learn page, with lessons and learning paths",
    "/learn/courses": "the list of full video courses",
    "/watch": "the Watch page, with videos, trends, talks and podcasts",
    "/green": "the Green AI page, about using AI efficiently and responsibly",
    "/search": "the search page",
    "/about": "the About page",
  };
  return exact[pathname.replace(/\/$/, "") || "/"];
}

/**
 * The tutor itself, loaded on first open (see Tutor.tsx) and kept mounted
 * afterwards so the conversation and any loaded model survive closing the sheet.
 */
export default function TutorApp({ open, setOpen }: { open: boolean; setOpen(open: boolean): void }) {
  const engine = useTutorEngine();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { done } = useProgress();
  const [view, setView] = useState<View>({ name: "home" });
  const [items, setItems] = useState<Item[]>([]);
  const [live, setLive] = useState("");
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const nextId = useRef(1);
  const page = pageContext(pathname);
  const pageRef = useRef(page);
  pageRef.current = page;
  /** The last free-chat topic, so follow-ups like "show me how it works" keep it. */
  const lastTopic = useRef<string | null>(null);

  const push = useCallback((item: NewItem): number => {
    const id = nextId.current++;
    setItems((xs) => [...xs, { ...item, id } as Item]);
    return id;
  }, []);

  const update = useCallback((id: number, patch: Partial<Item>) => {
    setItems((xs) => xs.map((x) => (x.id === id ? ({ ...x, ...patch } as Item) : x)));
  }, []);

  const announce = useCallback((text: string) => {
    setLive("");
    // A fresh node each time so screen readers announce repeats.
    requestAnimationFrame(() => setLive(text.slice(0, 400)));
  }, []);

  const close = useCallback(() => setOpen(false), [setOpen]);

  const go = useCallback(
    (route: string) => {
      navigate(route);
      if (matchMedia("(max-width: 599px)").matches) setOpen(false);
    },
    [navigate, setOpen],
  );

  /** History for the model: earlier free-chat questions paired with their finished answers. */
  const history = (): ChatMessage[] => {
    const out: ChatMessage[] = [];
    let question: string | null = null;
    for (const x of itemsRef.current) {
      if (x.kind === "user") question = x.text;
      else if (x.kind === "answer" && x.state === "done" && !x.label && question) {
        out.push({ role: "user", content: question }, { role: "assistant", content: x.text });
        question = null;
      }
    }
    return out;
  };

  const generate = useCallback(
    async (
      mode: Mode,
      notes: string,
      question: string,
      extra: { label?: string; related?: SiteHit[]; sources?: Source[]; withHistory?: boolean; maxNewTokens?: number; page?: string; watch?: string[] },
    ) => {
      const msgs = buildMessages(mode, notes, question, extra.withHistory ? history() : [], extra.page);
      const id = push({ kind: "answer", text: "", state: "thinking", label: extra.label, related: extra.related, sources: extra.sources, watch: extra.watch });
      try {
        const r = await engine.generate(msgs, (t) => update(id, { text: t, state: "streaming" } as Partial<Item>), extra.maxNewTokens);
        const text = r.text || "I couldn't come up with an answer. Try asking a different way.";
        update(id, { text, state: r.stopped ? "stopped" : "done" } as Partial<Item>);
        announce(`Tutor answered: ${text}`);
      } catch (err) {
        const message = err instanceof Error && err.name !== "CancelledError" ? `The tutor hit a problem: ${err.message}` : "Stopped.";
        update(id, { text: message, state: "error" } as Partial<Item>);
        announce(message);
      }
    },
    [engine.generate, push, update, announce],
  );

  const act = useCallback(
    (a: Action, label: string) => {
      setView({ name: "chat" });
      push({ kind: "user", text: label });
      const ready = engine.ready;
      switch (a.type) {
        case "next": {
          const ctx = pageRef.current;
          const rec = nextModule(done, ctx?.kind === "path" ? ctx.id : pathStore.get());
          push({ kind: "next", rec });
          announce(rec ? `Next up: ${rec.module.title}.` : "You've finished every lesson in every path.");
          break;
        }
        case "path":
          push({ kind: "path" });
          break;
        case "toolAsk":
          push({ kind: "toolAsk" });
          break;
        case "toolTask": {
          const hits = searchTools(a.task).slice(0, 3);
          push({ kind: "tools", task: a.task, hits });
          announce(hits.length ? `Tools for ${a.task}: ${hits.map((h) => h.tool.name).join(", ")}.` : `No tools matched ${a.task}.`);
          if (ready && hits.length) {
            const notes = hits.map((h) => `${h.tool.name}: ${h.tool.bestFor}`).join("\n");
            void generate("frame", notes, `Which tool should I try first to ${a.task}?`, { label: "Where to start", maxNewTokens: 60 });
          }
          break;
        }
        case "quiz": {
          const m = moduleById.get(a.module);
          if (!m) break;
          if (ready) void generate("quiz", moduleNotes(m.id), `Quiz me on the lesson “${m.title}”.`, { label: `Quiz: ${m.title}` });
          else
            push({
              kind: "reading",
              title: m.title,
              intro: "Say each key idea in your own words, then reveal it to check.",
              paragraphs: [],
              bullets: m.keyIdeas,
              recall: true,
              route: `/learn/${m.id}`,
            });
          break;
        }
        case "simpler": {
          const m = moduleById.get(a.module);
          if (!m) break;
          if (ready) void generate("simpler", moduleNotes(m.id), `Explain “${m.title}” more simply.`, { label: `Simpler: ${m.title}` });
          else push({ kind: "reading", title: m.title, intro: "The lesson in two parts:", paragraphs: [m.what, m.why], route: `/learn/${m.id}` });
          break;
        }
        case "toolWhen": {
          const t = toolById.get(a.tool);
          if (!t) break;
          if (ready) void generate("tool", toolNotesById(t.id), `When should I use ${t.name}?`, { label: `When to use ${t.name}` });
          else
            push({
              kind: "reading",
              title: t.name,
              intro: `${t.bestFor}`,
              paragraphs: [`Pick something else for: ${t.poorUses.join("; ").toLowerCase()}.`],
              bullets: t.bestUses,
              route: `/tools/${t.id}`,
            });
          break;
        }
      }
    },
    [engine.ready, done, push, announce, generate],
  );

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      setView({ name: "chat" });

      // 1. The path guide, tool finder and navigation never use the model.
      const route = routeMessage(text);
      if (route.type === "intent") return act({ type: route.intent }, text);
      if (route.type === "tool") return act({ type: "toolTask", task: route.task }, text);
      if (route.type === "nav") {
        const nav = route.plan;
        push({ kind: "user", text });
        push({ kind: "nav", dest: nav.dest, hits: nav.hits, opened: nav.go });
        if (nav.go) {
          navigate(nav.go.route);
          announce(`Opened ${nav.go.title}.`);
        } else announce(nav.hits.length ? `Found ${nav.hits.length} places for ${nav.dest}.` : `Nothing on this site matched ${nav.dest}.`);
        return;
      }

      // 2. Free chat, grounded in the lessons and quest notes. A follow-up that names no topic
      //    ("explain its architecture") carries over the one before; the lesson the student
      //    is reading wins ties, and the model is told which page they're on.
      push({ kind: "user", text });
      const context = followUpContext(text, lastTopic.current);
      lastTopic.current = context ? `${context} ${text}`.slice(-200) : text;
      const ctx = pageRef.current;
      const g = ground(text, { context, prefer: ctx?.kind === "lesson" ? ctx.id : undefined });
      if (engine.ready) {
        void generate("answer", g.notes, text, { related: g.related, sources: g.sources, withHistory: true, page: pageLabel(pathname), watch: g.modules });
      } else if (g.lesson) {
        push({
          kind: "reading",
          title: g.lesson.title,
          intro: "Here's what the closest lesson says.",
          paragraphs: [g.lesson.what],
          bullets: g.lesson.keyIdeas,
          route: `/learn/${g.lesson.id}`,
          related: g.related.filter((h) => h.route !== `/learn/${g.lesson!.id}`),
          watch: g.modules,
        });
        announce(`From the lesson ${g.lesson.title}: ${g.lesson.what}`);
      } else {
        const related = searchSite(text, 3);
        push({
          kind: "reading",
          title: "Nothing in the lessons covers that",
          intro: related.length ? "These might help:" : "Try the quests below, or ask about tokens, prompting or AI tools.",
          paragraphs: [],
          related,
        });
      }
    },
    [act, announce, engine.ready, generate, navigate, pathname, push],
  );

  // Questions handed over by pages ("Ask the tutor about this section", reflection feedback).
  useEffect(() => {
    const run = () => {
      for (const ask of takeAsks()) {
        setView({ name: "chat" });
        push({ kind: "user", text: ask.question });
        const sources = ask.source ? [ask.source] : undefined;
        if (engine.ready) void generate(ask.mode === "feedback" ? "reflect" : "answer", ask.notes, ask.question, { sources });
        else if (ask.fallback)
          push({
            kind: "reading",
            title: ask.fallback.title,
            intro: "Here's that part of the lesson again. Download a model (menu above) and the tutor will explain it in other words and take follow-up questions.",
            paragraphs: ask.fallback.body
              .split(/\n\n+|\n(?=[-*] )/)
              .map((p) => p.replace(/\*\*/g, "").replace(/^[-*] /, "• ")),
            route: ask.source?.route,
          });
      }
    };
    run();
    return onAsk(run);
  }, [engine.ready, generate, push]);

  // Load a model the student downloaded before, from cache, the first time they open the tutor.
  useEffect(() => {
    if (open) engine.resume();
  }, [open, engine]);

  const api = useMemo<TutorApi>(
    () => ({ engine, items, view, setView, send, act, update, go, announce, close }),
    [engine, items, view, send, act, update, go, announce, close],
  );

  return (
    <TutorContext.Provider value={api}>
      {open && <TutorSheet page={page} />}
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        {live}
      </div>
    </TutorContext.Provider>
  );
}

export const TASK_CHOICES: { task: Task; label: string; query: string }[] = [
  { task: "write", label: TASK_LABEL.write, query: "write and edit an essay" },
  { task: "research", label: TASK_LABEL.research, query: "find research papers" },
  { task: "present", label: TASK_LABEL.present, query: "make slides" },
  { task: "analyze", label: TASK_LABEL.analyze, query: "analyze a spreadsheet" },
  { task: "audio", label: "Transcribe audio", query: "transcribe a lecture recording" },
  { task: "code", label: TASK_LABEL.code, query: "write code" },
  { task: "image", label: TASK_LABEL.image, query: "generate an image" },
  { task: "automate", label: TASK_LABEL.automate, query: "automate a workflow" },
];

