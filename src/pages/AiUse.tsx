import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Icon } from "../components/Icon";
import { Segmented } from "../components/Segmented";
import {
  POLICY_STANCES,
  POLICY_USES,
  PURPOSES,
  STANCES,
  STYLE_CHECKED,
  STYLE_LINKS,
  USES,
  VERDICT_LABEL,
  apa,
  chicago,
  disclosure,
  mla,
  syllabusStatement,
  verdictFor,
  type Citation,
  type PolicyStance,
  type Stance,
} from "../data/aiUse";
import "../styles/aiuse.css";

/** A box of generated text with a copy button. */
function Output({ label, text, rows = 4 }: { label: string; text: string; rows?: number }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* The text is selectable, so it can still be copied by hand. */
    }
  };
  return (
    <div className="ai-out">
      <label className="label-l" htmlFor={`out-${label}`}>
        {label}
      </label>
      <textarea id={`out-${label}`} readOnly rows={rows} value={text} onFocus={(e) => e.currentTarget.select()} />
      <button type="button" className="btn tonal sm state" onClick={() => void copy()}>
        <Icon name={copied ? "check" : "content_copy"} size={18} />
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function Field({ id, label, value, onChange, type = "text", placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="ai-field">
      <label htmlFor={id} className="label-l">
        {label}
      </label>
      <input id={id} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function CanIUse() {
  const [stance, setStance] = useState<Stance>("unknown");
  return (
    <section className="section" id="can-i" aria-labelledby="can-h">
      <h2 id="can-h" className="headline-m">
        Can I use AI for this?
      </h2>
      <p className="body-m muted measure">
        Your instructor's rules decide, and they differ between courses. Pick what your course says and see how each use usually plays out.
      </p>
      <Segmented<Stance> label="What does your course say about AI?" value={stance} onChange={setStance} options={STANCES.map((s) => ({ value: s.id, label: s.label }))} />
      <p className="body-s muted">{STANCES.find((s) => s.id === stance)?.hint}</p>
      <ul className="ai-uses">
        {USES.map((u) => {
          const v = verdictFor(u, stance);
          return (
            <li key={u.id} className="ai-use card outlined" data-verdict={v.verdict}>
              <div className="ai-use-head">
                <h3 className="title-m">{u.label}</h3>
                <span className="ai-verdict label-l" data-verdict={v.verdict}>
                  <Icon name={v.verdict === "fine" ? "check_circle" : v.verdict === "check" ? "help" : "block"} size={18} filled />
                  {VERDICT_LABEL[v.verdict]}
                </span>
              </div>
              <p className="body-m">{v.why}</p>
              <p className="body-s muted">{u.advice}</p>
            </li>
          );
        })}
      </ul>
      <p className="body-s muted measure">
        This is general advice, not USC policy. When in doubt, ask your instructor, and keep your notes, drafts and chat links in case anyone asks how you
        worked.
      </p>
    </section>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

function Disclose() {
  const [tool, setTool] = useState("ChatGPT");
  const [company, setCompany] = useState("OpenAI");
  const [date, setDate] = useState(today);
  const [purposes, setPurposes] = useState<string[]>(["brainstorm ideas"]);
  const [changed, setChanged] = useState("");
  const text = disclosure({ tool, company, date, purposes, changed });
  return (
    <section className="section" id="disclose" aria-labelledby="disc-h">
      <h2 id="disc-h" className="headline-m">
        Say how you used it
      </h2>
      <p className="body-m muted measure">
        A short note at the end of your work, or in a cover message, shows you used AI honestly. Many instructors ask for one; some count a missing one as a problem.
      </p>
      <div className="ai-form">
        <Field id="d-tool" label="Tool" value={tool} onChange={setTool} />
        <Field id="d-company" label="Company" value={company} onChange={setCompany} />
        <Field id="d-date" label="Date you used it" value={date} onChange={setDate} type="date" />
        <fieldset className="ai-purposes">
          <legend className="label-l">What you used it for</legend>
          {PURPOSES.map((p) => (
            <label key={p} className="ai-check body-m">
              <input type="checkbox" checked={purposes.includes(p)} onChange={() => setPurposes(purposes.includes(p) ? purposes.filter((x) => x !== p) : [...purposes, p])} />
              {p}
            </label>
          ))}
        </fieldset>
        <div className="ai-field wide">
          <label htmlFor="d-changed" className="label-l">
            What you changed or checked (optional)
          </label>
          <input id="d-changed" value={changed} placeholder="I rewrote the outline in my own words and checked the dates" onChange={(e) => setChanged(e.target.value)} />
        </div>
      </div>
      <Output label="Your disclosure note" text={text} />
    </section>
  );
}

function Cite() {
  const [c, setC] = useState<Citation>({ tool: "ChatGPT", company: "OpenAI", date: today(), title: "", prompt: "", url: "", version: "" });
  const [withPrompt, setWithPrompt] = useState(false);
  const set = (k: keyof Citation) => (v: string) => setC({ ...c, [k]: v });
  const a = useMemo(() => apa(c), [c]);
  const m = useMemo(() => mla(c), [c]);
  return (
    <section className="section" id="cite" aria-labelledby="cite-h">
      <h2 id="cite-h" className="headline-m">
        Cite it
      </h2>
      <p className="body-m muted measure">
        Fill in what you know and copy the format your course uses. Most style guides ask you to cite AI when you quote it, paraphrase it or build on what it wrote.
        Formats last checked {STYLE_CHECKED}; they change, so check the official page and your instructor's preference.
      </p>
      <div className="ai-form">
        <Field id="c-tool" label="Tool" value={c.tool} onChange={set("tool")} />
        <Field id="c-company" label="Company" value={c.company} onChange={set("company")} />
        <Field id="c-version" label="Version (for MLA)" value={c.version} onChange={set("version")} placeholder="GPT-5" />
        <Field id="c-date" label="Date of the chat" value={c.date} onChange={set("date")} type="date" />
        <Field id="c-title" label="Title of the chat (for APA)" value={c.title} onChange={set("title")} placeholder="High school grammar concepts" />
        <Field id="c-url" label="Link to the chat or the tool" value={c.url} onChange={set("url")} placeholder="https://" />
        <div className="ai-field wide">
          <label htmlFor="c-prompt" className="label-l">
            Your prompt (for MLA and Chicago)
          </label>
          <input id="c-prompt" value={c.prompt} onChange={(e) => set("prompt")(e.target.value)} placeholder="Explain antibiotics in plain words" />
        </div>
      </div>

      <div className="ai-styles">
        <article className="card outlined">
          <h3 className="title-m">APA 7</h3>
          <p className="body-s muted">
            APA changed its format in September 2025: a specific chat is now cited like a document, with a title and a link. Many guides online still show the older 2023
            version, which used "[Large language model]".{" "}
            <a href={STYLE_LINKS.apa} target="_blank" rel="noopener noreferrer">
              APA's guidance
            </a>
          </p>
          <Output label="APA reference list entry" text={a.reference} />
          <Output label="APA in-text citation" text={a.inText} rows={1} />
        </article>
        <article className="card outlined">
          <h3 className="title-m">MLA 9</h3>
          <p className="body-s muted">
            The prompt is the title, the tool is the container, and the AI is not an author. For the in-text citation, use the first few words of the prompt.{" "}
            <a href={STYLE_LINKS.mla} target="_blank" rel="noopener noreferrer">
              MLA's guidance
            </a>
          </p>
          <Output label="MLA works cited entry" text={m.entry} />
          <Output label="MLA in-text citation" text={m.inText} rows={1} />
        </article>
        <article className="card outlined">
          <h3 className="title-m">Chicago</h3>
          <p className="body-s muted">
            Chicago uses a footnote and usually leaves generative AI out of the bibliography. If you edited the text, say so in your writing or the note.{" "}
            <a href={STYLE_LINKS.chicago} target="_blank" rel="noopener noreferrer">
              Chicago Manual of Style
            </a>
          </p>
          <label className="ai-check body-m">
            <input type="checkbox" checked={withPrompt} onChange={(e) => setWithPrompt(e.target.checked)} />
            Include my prompt in the note
          </label>
          <Output label="Chicago footnote" text={chicago(c, withPrompt)} />
        </article>
      </div>
      <p className="body-m measure">
        USC Libraries also has a{" "}
        <a href={STYLE_LINKS.usc} target="_blank" rel="noopener noreferrer">
          guide to citing generative AI
        </a>
        .
      </p>
    </section>
  );
}

function Instructors() {
  const [stance, setStance] = useState<PolicyStance>("disclose");
  const [uses, setUses] = useState<string[]>([POLICY_USES[0], POLICY_USES[1]]);
  const [disclose, setDisclose] = useState(true);
  const [extra, setExtra] = useState("");
  const text = syllabusStatement({ stance, uses, disclose, extra });
  return (
    <section className="section" id="instructors" aria-labelledby="inst-h">
      <h2 id="inst-h" className="headline-m">
        For instructors: write your AI policy
      </h2>
      <p className="body-m muted measure">
        Students say they want clear rules, and many instructors say their department hasn't given them any. Pick a stance, choose what you allow, and edit the draft.
        It isn't an official USC statement: check it against your department's and the university's policies.
      </p>
      <Segmented<PolicyStance> label="Your stance" value={stance} onChange={setStance} options={POLICY_STANCES.map((s) => ({ value: s.id, label: s.label }))} />
      <p className="body-s muted">{POLICY_STANCES.find((s) => s.id === stance)?.hint}</p>
      {(stance === "limited" || stance === "disclose") && (
        <fieldset className="ai-purposes">
          <legend className="label-l">{stance === "limited" ? "Uses you allow" : "Examples you'd mention"}</legend>
          {POLICY_USES.map((p) => (
            <label key={p} className="ai-check body-m">
              <input type="checkbox" checked={uses.includes(p)} onChange={() => setUses(uses.includes(p) ? uses.filter((x) => x !== p) : [...uses, p])} />
              {p}
            </label>
          ))}
        </fieldset>
      )}
      {stance !== "disclose" && (
        <label className="ai-check body-m">
          <input type="checkbox" checked={disclose} onChange={(e) => setDisclose(e.target.checked)} />
          Ask students to disclose when they use AI
        </label>
      )}
      <div className="ai-field wide">
        <label htmlFor="p-extra" className="label-l">
          Anything to add (optional)
        </label>
        <input id="p-extra" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Exams are closed to AI." />
      </div>
      <Output label="Draft syllabus statement" text={text} rows={10} />
    </section>
  );
}

export function AiUse() {
  return (
    <>
      <header className="page-head">
        <h1 className="display-s">Using AI in your coursework</h1>
        <p className="body-l muted measure">
          What's usually fine, how to say you used it, how to cite it, and how instructors can write a clear policy. In a 2026 survey of UK undergraduates, 95% used AI, but only
          36% felt their university encouraged it, so most students are working out the rules alone.{" "}
          <a href="https://www.hepi.ac.uk/reports/student-generative-ai-survey-2026/" target="_blank" rel="noopener noreferrer">
            HEPI survey
          </a>
        </p>
        <nav className="chip-row" aria-label="On this page">
          <a className="chip state" href="#can-i">
            Can I use AI for this?
          </a>
          <a className="chip state" href="#disclose">
            Say how you used it
          </a>
          <a className="chip state" href="#cite">
            Cite it
          </a>
          <a className="chip state" href="#instructors">
            For instructors
          </a>
        </nav>
      </header>
      <CanIUse />
      <Disclose />
      <Cite />
      <Instructors />
      <section className="section" aria-labelledby="more-h">
        <h2 id="more-h" className="headline-m">
          Keep going
        </h2>
        <ul className="ai-more body-l">
          <li>
            <Link to="/learn/ethics-integrity">Ethics and academic integrity</Link>, the lesson
          </li>
          <li>
            <Link to="/learn/limits">What AI gets wrong</Link>, so you know what to check
          </li>
          <li>
            <Link to="/start">Where to start</Link>, with free courses by level
          </li>
        </ul>
      </section>
    </>
  );
}
