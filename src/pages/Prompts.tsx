import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Icon } from "../components/Icon";
import { PROMPTS, PROMPT_CATEGORIES, blanks, fill, isLong, searchPrompts, type PromptCategory, type PromptEntry } from "../data/prompts";
import "../styles/prompts.css";

function Template({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]]+\])/).map((part, i) =>
        part.startsWith("[") ? (
          <mark key={i} className="pr-blank">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

function Card({ p }: { p: PromptEntry }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"" | "prompt" | "link">("");
  const names = blanks(p.prompt);
  const filled = fill(p.prompt, values);
  const copy = async (what: "prompt" | "link") => {
    try {
      await navigator.clipboard.writeText(what === "prompt" ? filled : `${location.origin}/prompts#${p.id}`);
      setCopied(what);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      /* The text is on the page, so it can be copied by hand. */
    }
  };
  return (
    <article className="pr-card card outlined" id={p.id}>
      <header>
        <h3 className="title-l">{p.title}</h3>
        <p className="body-m muted">{p.when}</p>
      </header>
      <p className="pr-text body-m" aria-label="Prompt">
        {open ? filled : <Template text={p.prompt} />}
      </p>
      {open && (
        <div className="pr-fields">
          {names.map((n) => (
            <div key={n} className="pr-field">
              <label className="label-l" htmlFor={`${p.id}-${n}`}>
                {n}
              </label>
              {isLong(n) ? (
                <textarea id={`${p.id}-${n}`} rows={3} value={values[n] ?? ""} onChange={(e) => setValues({ ...values, [n]: e.target.value })} />
              ) : (
                <input id={`${p.id}-${n}`} value={values[n] ?? ""} onChange={(e) => setValues({ ...values, [n]: e.target.value })} />
              )}
            </div>
          ))}
        </div>
      )}
      <div className="pr-actions">
        <button type="button" className="btn filled sm state" onClick={() => void copy("prompt")}>
          <Icon name={copied === "prompt" ? "check" : "content_copy"} size={18} />
          {copied === "prompt" ? "Copied" : "Copy prompt"}
        </button>
        <button type="button" className="btn outlined sm state" aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon name="edit_note" size={18} />
          {open ? "Hide the blanks" : "Fill in the blanks"}
        </button>
        <button type="button" className="btn text sm state" onClick={() => void copy("link")}>
          <Icon name={copied === "link" ? "check" : "link"} size={18} />
          {copied === "link" ? "Link copied" : "Copy link"}
        </button>
      </div>
      <p className="pr-check body-s">
        <Icon name="fact_check" size={18} />
        <span>
          <strong>Check before you trust it.</strong> {p.check}
        </span>
      </p>
    </article>
  );
}

export function Prompts() {
  const [params, setParams] = useSearchParams();
  const category = (PROMPT_CATEGORIES.some((c) => c.id === params.get("c")) ? params.get("c") : null) as PromptCategory | null;
  const q = params.get("q") ?? "";
  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true, preventScrollReset: true });
  };
  const shown = searchPrompts(q, category);
  return (
    <>
      <header className="page-head">
        <h1 className="display-s">Prompts that work</h1>
        <p className="body-l muted measure">
          {PROMPTS.length} starting points for studying, writing, research, code, teaching and everyday work. Each one gives the AI context, a goal, limits and a
          format, and says what to check before you trust the answer. Fill in the brackets, copy, and refine from there.
        </p>
        <p className="body-m measure pr-privacy">
          <Icon name="lock" size={20} />
          Use a personal account for AI tools, and don't paste confidential or sensitive information, including student records, into them.
        </p>
      </header>

      <section className="section" aria-labelledby="habits-h">
        <h2 id="habits-h" className="headline-s">
          What makes these work
        </h2>
        <ul className="pr-habits body-l">
          <li>
            <strong>Say who it's for and what you want.</strong> "As a first-year student in biology" changes the answer.
          </li>
          <li>
            <strong>Set limits.</strong> Length, tone, and what not to do ("don't rewrite it") keep it useful.
          </li>
          <li>
            <strong>Ask for a format.</strong> A list, a table or one question at a time is easier to use than a wall of text.
          </li>
          <li>
            <strong>Then refine.</strong> The first answer is a draft. Tell it what to change, and check it.
          </li>
        </ul>
        <p className="body-m">
          Want the full lesson? See <Link to="/learn/prompting">Prompting that works</Link>.
        </p>
      </section>

      <section className="section" aria-labelledby="lib-h">
        <h2 id="lib-h" className="headline-m">
          The library
        </h2>
        <div className="pr-controls">
          <div className="pr-search">
            <label className="label-l" htmlFor="pr-q">
              Search prompts
            </label>
            <input id="pr-q" type="search" value={q} placeholder="quiz, debug, email…" onChange={(e) => set("q", e.target.value || null)} />
          </div>
          <div className="chip-row" role="group" aria-label="Category">
            <button type="button" className="chip state" aria-pressed={category === null} onClick={() => set("c", null)}>
              All
            </button>
            {PROMPT_CATEGORIES.map((c) => (
              <button key={c.id} type="button" className="chip state" aria-pressed={category === c.id} onClick={() => set("c", c.id)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        {category && <p className="body-m muted">{PROMPT_CATEGORIES.find((c) => c.id === category)?.blurb}</p>}
        <p className="body-s muted" aria-live="polite">
          {shown.length} {shown.length === 1 ? "prompt" : "prompts"}
        </p>
        {shown.length === 0 ? (
          <p className="body-l">No prompts match. Try fewer words, or clear the category.</p>
        ) : (
          <div className="pr-list">
            {shown.map((p) => (
              <Card key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
