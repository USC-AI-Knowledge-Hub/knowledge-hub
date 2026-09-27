import { useEffect, useRef, useState, type RefObject } from "react";
import type { SiteHit } from "../../lib/siteSearch";
import { PATH_QUESTIONS, pickPath, type Goal, type Role } from "../../lib/tutor/guide";
import { pathStore } from "../../lib/tutor/storage";
import { Icon } from "../Icon";
import { ToolMark } from "../ToolMark";
import { WavyProgress } from "../WavyProgress";
import { useTutor, type Item } from "./context";
import { Markdown } from "./Markdown";
import { Orb } from "./Shapes";
import { TASK_CHOICES } from "./TutorApp";

const KIND_ICON: Record<SiteHit["kind"], string> = { page: "web", lesson: "school", course: "video_library", path: "route", tool: "handyman" };

function HitButton({ hit }: { hit: SiteHit }) {
  const { go } = useTutor();
  return (
    <button type="button" className="t-hit state" onClick={() => go(hit.route)}>
      <Icon name={KIND_ICON[hit.kind]} />
      <span className="grow">
        <span className="label-l">{hit.title}</span>
        <span className="body-s muted">{hit.blurb}</span>
      </span>
    </button>
  );
}

export function Related({ hits }: { hits: SiteHit[] }) {
  const { go } = useTutor();
  if (!hits.length) return null;
  return (
    <div className="t-related">
      <p className="label-m muted">Related on this site</p>
      <div className="chip-row">
        {hits.slice(0, 3).map((h) => (
          <button key={h.route} type="button" className="chip state" onClick={() => go(h.route)}>
            <Icon name={KIND_ICON[h.kind]} />
            {h.title}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ModelHint() {
  const { engine, setView } = useTutor();
  if (engine.phase.name !== "off" && engine.phase.name !== "error") return null;
  return (
    <p className="body-s muted t-hint">
      <Icon name="info" size={16} />
      <span>
        This is from the lessons.{" "}
        <button type="button" className="t-link" onClick={() => setView({ name: "setup" })}>
          Download a model
        </button>{" "}
        to have the tutor answer in conversation.
      </span>
    </p>
  );
}

function Answer({ item }: { item: Extract<Item, { kind: "answer" }> }) {
  const thinking = item.state === "thinking";
  return (
    <div className="t-msg tutor" aria-busy={thinking || item.state === "streaming"}>
      <Orb size={28} thinking={thinking || item.state === "streaming"} className="t-msg-orb" />
      <div className="t-bubble">
        {item.label && <p className="label-m muted">{item.label}</p>}
        {thinking ? (
          <p className="body-m muted t-thinking">Thinking…</p>
        ) : (
          <div className={`body-m ${item.state === "streaming" ? "t-streaming" : ""} ${item.state === "error" ? "t-error" : ""}`}>
            <Markdown text={item.text} />
          </div>
        )}
        {(item.state === "done" || item.state === "stopped") && (
          <>
            <p className="body-s muted t-caveat">
              {item.state === "stopped" ? "Stopped. " : ""}Small on-device model. It can be wrong.
              {item.sources?.length ? ` Based on: ${item.sources.map((s) => s.title).join(", ")}.` : ""}
            </p>
            {item.related && <Related hits={item.related} />}
          </>
        )}
      </div>
    </div>
  );
}

function Nav({ item }: { item: Extract<Item, { kind: "nav" }> }) {
  const { go } = useTutor();
  const others = item.hits.filter((h) => h.route !== item.opened?.route);
  return (
    <div className="t-card">
      {item.opened ? (
        <p className="body-m t-opened">
          <Icon name="check_circle" filled />
          <span>
            Opened <strong>{item.opened.title}</strong>.
          </span>
          <button type="button" className="btn text sm state mobile-show" onClick={() => go(item.opened!.route)}>
            Show page
          </button>
        </p>
      ) : item.hits.length ? (
        <p className="body-m">Which one did you mean?</p>
      ) : (
        <p className="body-m">I couldn't find “{item.dest}” on this site.</p>
      )}
      {others.length > 0 && (
        <div className="t-hits">
          {item.opened && <p className="label-m muted">Also matching</p>}
          {others.map((h) => (
            <HitButton key={h.route} hit={h} />
          ))}
        </div>
      )}
      {!item.hits.length && (
        <button type="button" className="btn tonal sm state" onClick={() => go(`/search?q=${encodeURIComponent(item.dest)}`)}>
          <Icon name="search" />
          Search the site
        </button>
      )}
    </div>
  );
}

function Next({ item }: { item: Extract<Item, { kind: "next" }> }) {
  const { go } = useTutor();
  const r = item.rec;
  if (!r)
    return (
      <div className="t-card">
        <p className="body-m">You've marked every lesson in every path as done. Try a full course next.</p>
        <button type="button" className="btn tonal sm state" onClick={() => go("/learn/courses")}>
          Browse full courses
        </button>
      </div>
    );
  return (
    <div className="t-card t-next">
      <p className="label-m muted">Next up, {r.path.title.toLowerCase()}</p>
      <p className="title-m">{r.module.title}</p>
      <p className="body-m muted">{r.module.summary}</p>
      <WavyProgress value={r.done / r.total} label={`${r.done} of ${r.total} lessons done in the ${r.path.title}`} />
      <p className="body-s">{r.reason}</p>
      <div className="t-actions">
        <button type="button" className="btn filled sm state" onClick={() => go(`/learn/${r.module.id}`)}>
          Open the lesson
        </button>
        <button type="button" className="btn text sm state" onClick={() => go(`/learn/path/${r.path.id}`)}>
          See the path
        </button>
      </div>
    </div>
  );
}

function PathQuiz({ item }: { item: Extract<Item, { kind: "path" }> }) {
  const { update, go, announce } = useTutor();
  const step = !item.role ? 0 : !item.goal ? 1 : 2;
  if (step < 2) {
    const q = PATH_QUESTIONS[step as 0 | 1];
    return (
      <div className="t-card">
        <p className="label-m muted">Question {step + 1} of 2</p>
        <p className="title-s" id={`pq-${item.id}-${step}`}>
          {q.question}
        </p>
        <div className="t-options" role="group" aria-labelledby={`pq-${item.id}-${step}`}>
          {q.options.map((o) => (
            <button
              key={o.id}
              type="button"
              className="chip state"
              onClick={() => {
                if (step === 0) update(item.id, { role: o.id as Role });
                else {
                  update(item.id, { goal: o.id as Goal });
                  const p = pickPath(item.role!, o.id as Goal);
                  announce(`Recommended: ${p.title}. ${p.summary}`);
                }
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  }
  const p = pickPath(item.role!, item.goal!);
  return (
    <div className="t-card t-next">
      <p className="label-m muted">Try the</p>
      <p className="title-m">{p.title}</p>
      <p className="body-m muted">{p.summary}</p>
      <ol className="t-path-steps body-m">
        {p.steps.map((s) => (
          <li key={s.module}>{s.note}</li>
        ))}
      </ol>
      <div className="t-actions">
        <button
          type="button"
          className="btn filled sm state"
          onClick={() => {
            pathStore.set(p.id);
            go(`/learn/path/${p.id}`);
          }}
        >
          Follow this path
        </button>
      </div>
    </div>
  );
}

function ToolAsk() {
  const { act } = useTutor();
  const [text, setText] = useState("");
  return (
    <div className="t-card">
      <p className="title-s">What are you trying to do?</p>
      <div className="t-options">
        {TASK_CHOICES.map((c) => (
          <button key={c.task} type="button" className="chip state" onClick={() => act({ type: "toolTask", task: c.query }, c.label)}>
            {c.label}
          </button>
        ))}
      </div>
      <form
        className="t-inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) act({ type: "toolTask", task: text.trim() }, text.trim());
        }}
      >
        <label className="visually-hidden" htmlFor="t-tool-task">
          Describe your task
        </label>
        <input id="t-tool-task" value={text} onChange={(e) => setText(e.target.value)} placeholder="Or describe it, e.g. turn my notes into slides" />
        <button type="submit" className="icon-btn state" aria-label="Find tools" disabled={!text.trim()}>
          <Icon name="arrow_forward" />
        </button>
      </form>
    </div>
  );
}

function Tools({ item }: { item: Extract<Item, { kind: "tools" }> }) {
  const { go } = useTutor();
  if (!item.hits.length)
    return (
      <div className="t-card">
        <p className="body-m">No tool in our catalog matched that. Try describing the task in other words, or browse the tool map.</p>
        <button type="button" className="btn tonal sm state" onClick={() => go("/tools")}>
          Open the tools page
        </button>
      </div>
    );
  return (
    <div className="t-card">
      <p className="label-m muted">Best matches for “{item.task}”</p>
      <ul className="t-tools">
        {item.hits.map((h) => (
          <li key={h.tool.id}>
            <button type="button" className="t-tool state" onClick={() => go(`/tools/${h.tool.id}`)}>
              <ToolMark tool={h.tool} size={40} />
              <span className="grow">
                <span className="label-l">{h.tool.name}</span>
                <span className="body-s muted">{h.tool.bestFor}</span>
              </span>
              <Icon name="chevron_right" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Recall({ ideas }: { ideas: string[] }) {
  const [shown, setShown] = useState<Set<number>>(new Set());
  return (
    <ol className="t-recall">
      {ideas.map((k, i) => (
        <li key={k}>
          {shown.has(i) ? (
            <span className="body-m">{k}</span>
          ) : (
            <button type="button" className="btn outlined sm state" onClick={() => setShown(new Set(shown).add(i))} aria-label={`Reveal key idea ${i + 1}`}>
              Reveal idea {i + 1}
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}

function Reading({ item }: { item: Extract<Item, { kind: "reading" }> }) {
  const { go } = useTutor();
  return (
    <div className="t-card t-reading">
      <p className="label-m muted">{item.intro}</p>
      <p className="title-m">{item.title}</p>
      {item.paragraphs.map((p) => (
        <p key={p} className="body-m">
          {p}
        </p>
      ))}
      {item.bullets &&
        (item.recall ? (
          <Recall ideas={item.bullets} />
        ) : (
          <ul className="t-bullets body-m">
            {item.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ))}
      {item.route && (
        <div className="t-actions">
          <button type="button" className="btn tonal sm state" onClick={() => go(item.route!)}>
            {item.route.startsWith("/tools/") ? "Open the tool profile" : "Open the lesson"}
          </button>
        </div>
      )}
      {item.related && <Related hits={item.related} />}
      <ModelHint />
    </div>
  );
}

export function Thread({ scroller }: { scroller: RefObject<HTMLDivElement | null> }) {
  const { items } = useTutor();
  const end = useRef<HTMLDivElement>(null);
  const count = items.length;
  const lastText = items.at(-1)?.kind === "answer" ? (items.at(-1) as { text: string }).text.length : 0;

  // Follow new content, unless the student has scrolled up to read.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (near || lastText === 0) end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [count, lastText, scroller]);

  return (
    <div className="t-thread">
      {items.map((item) => {
        switch (item.kind) {
          case "user":
            return (
              <div key={item.id} className="t-msg user">
                <p className="t-bubble body-m">{item.text}</p>
              </div>
            );
          case "answer":
            return <Answer key={item.id} item={item} />;
          case "nav":
            return <Nav key={item.id} item={item} />;
          case "next":
            return <Next key={item.id} item={item} />;
          case "path":
            return <PathQuiz key={item.id} item={item} />;
          case "toolAsk":
            return <ToolAsk key={item.id} />;
          case "tools":
            return <Tools key={item.id} item={item} />;
          case "reading":
            return <Reading key={item.id} item={item} />;
        }
      })}
      <div ref={end} />
    </div>
  );
}
