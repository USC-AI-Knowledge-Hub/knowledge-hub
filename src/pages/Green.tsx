import { useCallback, useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { Icon } from "../components/Icon";
import { ToolMark } from "../components/ToolMark";
import {
  DATA_CENTRES,
  GOVERNANCE,
  GREEN_TASKS,
  HABITS,
  HEAVIER,
  LED_WATTS,
  PLEDGE,
  PRINCIPLES,
  PROMPT_FIGURES,
  SOURCES,
  TRAINING,
  WEIGHT_LABEL,
  ledMinutes,
  recommend,
  sourceById,
} from "../data/green";
import { toolById } from "../data/tools";
import { SHAPES } from "../lib/shapes";
import "../styles/green.css";

const HABITS_KEY = "kh-green-habits";
const PLEDGE_KEY = "kh-green-pledge";

/** A value kept in this browser only. Falls back to memory when storage is blocked. */
function useStored<T>(key: string, initial: T, valid: (v: unknown) => v is T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      return valid(parsed) ? parsed : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* Private mode or blocked storage: this visit only. */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
const isPledge = (v: unknown): v is string | null => v === null || typeof v === "string";

/** The tutor listens for Ctrl/⌘+K on the window. */
function openTutor() {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
}

function Cite({ id }: { id: string }) {
  const s = sourceById.get(id);
  if (!s) return null;
  return (
    <a href={`#src-${id}`} className="green-cite">
      {s.short}, {s.date}
    </a>
  );
}

const fmt = (n: number, digits = 0) => n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });

// ── Hero sprout ───────────────────────────────────────────────────────────

const LEAF = "M0 0C9-11 31-13 46 0C31 13 9 11 0 0Z";
/** Leaf slots up the stem, bottom first: y position, side and angle. Two seedling leaves, then one per habit. */
const SLOTS = [
  { y: 214, side: -1, a: -14 },
  { y: 210, side: 1, a: 14 },
  { y: 192, side: -1, a: -20 },
  { y: 176, side: 1, a: 22 },
  { y: 158, side: -1, a: -26 },
  { y: 140, side: 1, a: 26 },
  { y: 122, side: -1, a: -30 },
  { y: 104, side: 1, a: 30 },
  { y: 88, side: -1, a: -34 },
  { y: 74, side: 1, a: 34 },
];
const SEEDLING = 2;
const BASE = 232;
const TOP = 52;

function Sprout({ grown, bloom }: { grown: number; bloom: boolean }) {
  // The stem reaches just past the highest leaf, or all the way up to the flower.
  const tip = bloom ? TOP : SLOTS[Math.min(grown, SLOTS.length) - 1].y - 18;
  const reach = (BASE - tip) / (BASE - TOP);
  return (
    <svg className="sprout" viewBox="0 0 240 260" aria-hidden="true">
      <path className="sprout-sun" d={SHAPES.sunny} transform="translate(168 18) scale(0.52)" />
      <path className="sprout-hill" d="M0 260C40 226 90 214 120 214S200 226 240 260Z" />
      <path
        className="sprout-stem"
        d={`M120 ${BASE}C118 190 124 120 120 ${TOP}`}
        pathLength={1}
        strokeDasharray="1 1"
        strokeDashoffset={1 - reach}
      />
      {SLOTS.map((s, i) => (
        <g key={i} transform={`translate(120 ${s.y}) rotate(${s.side < 0 ? 180 - s.a : s.a})`}>
          <path className={`sprout-leaf ${i < grown ? "on" : ""}`} d={LEAF} />
        </g>
      ))}
      <g className={`sprout-bloom ${bloom ? "on" : ""}`} transform={`translate(120 ${TOP})`}>
        <path d={SHAPES.clover4} transform="translate(-20 -20) scale(0.4)" />
        <circle r="7" />
      </g>
    </svg>
  );
}

// ── Footprint ─────────────────────────────────────────────────────────────

function DataCentreBars() {
  const max = Math.max(...DATA_CENTRES.points.map((p) => p.twh));
  return (
    <figure className="dc-chart">
      <figcaption className="visually-hidden">
        Data centre electricity use: about 415 TWh in 2024, projected about 945 TWh in 2030 (IEA).
      </figcaption>
      {DATA_CENTRES.points.map((p) => (
        <div key={p.year} className="dc-row">
          <span className="label-l dc-year">{p.year}</span>
          <div className="dc-track">
            <span className={`dc-bar ${p.projected ? "projected" : ""}`} style={{ width: `${(p.twh / max) * 100}%` }} />
          </div>
          <span className="dc-value">
            <span className="title-m">~{fmt(p.twh)} TWh</span>
            <span className="body-s muted">{p.note}</span>
          </span>
        </div>
      ))}
    </figure>
  );
}

function Footprint() {
  return (
    <section className="section" aria-labelledby="footprint-h">
      <div className="section-head">
        <div>
          <h2 id="footprint-h" className="headline-m">
            The footprint, in proportion
          </h2>
          <p className="body-m muted measure">Honest numbers at the right scale. All are estimates, and sources measure in different ways.</p>
        </div>
      </div>

      <div className="fp-grid">
        <article className="fp-card fp-prompt">
          <h3 className="title-l">One text prompt</h3>
          <p className="body-m muted">Company-reported figures for a typical text answer.</p>
          <ul className="fp-figures">
            {PROMPT_FIGURES.map((f) => (
              <li key={f.id}>
                <span className="fp-wh">
                  ~{f.wh} <span className="title-m">Wh</span>
                </span>
                <span className="body-m">
                  <strong>{f.what}</strong>, {f.who}
                  {f.extra ? `, ${f.extra}` : ""}. <Cite id={f.source} />
                </span>
              </li>
            ))}
          </ul>
          <div className="fp-bulb">
            <Icon name="lightbulb" filled size={28} />
            <p className="body-m">
              That's about a {LED_WATTS} W LED bulb left on for {fmt(ledMinutes(PROMPT_FIGURES[0].wh), 1)} to {fmt(ledMinutes(PROMPT_FIGURES[1].wh))}{" "}
              minutes. Small per prompt; the totals come from scale.
            </p>
          </div>
        </article>

        <article className="fp-card">
          <h3 className="title-l">All data centres</h3>
          <p className="body-m muted">
            Everything online, not only AI, but AI is the fastest-growing part. <Cite id={DATA_CENTRES.source} />
          </p>
          <DataCentreBars />
        </article>

        <article className="fp-card">
          <h3 className="title-l">Training, then everyday use</h3>
          <p className="body-m">
            Training {TRAINING.model} was estimated at about {fmt(TRAINING.mwh)} MWh, a one-off cost. <Cite id={TRAINING.source} /> Each use
            costs little, but it happens billions of times, so over a model's life use can add up to more.
          </p>
          <p className="body-m muted">Where it runs matters too: the same electricity has a much smaller carbon footprint on a clean grid.</p>
        </article>

        <article className="fp-card">
          <h3 className="title-l">What costs more</h3>
          <p className="body-m muted">Compared with a short text answer. The exact gaps vary by model and aren't well measured, so we show the order, not ratios.</p>
          <ol className="heavier" aria-label="From lighter to heavier">
            {HEAVIER.map((h, i) => (
              <li key={h.label} style={{ ["--i" as string]: i }}>
                <Icon name={h.icon} size={20} />
                <span className="label-l">{h.label}</span>
              </li>
            ))}
          </ol>
          <p className="heavier-scale body-s muted" aria-hidden="true">
            <span>Lighter</span>
            <span>Heavier</span>
          </p>
        </article>
      </div>

      <p className="fp-perspective body-l measure">
        <Icon name="public" size={22} />
        <span>
          The biggest levers sit with the companies that build, power and cool data centres. Your habits still add up across millions of
          people, and they usually get you a better answer faster.
        </span>
      </p>
    </section>
  );
}

// ── Picker ────────────────────────────────────────────────────────────────

function Weight({ weight }: { weight: 1 | 2 | 3 | 4 }) {
  return (
    <span className="weight" data-weight={weight}>
      <span className="weight-steps" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <i key={n} className={n <= weight ? "on" : ""} />
        ))}
      </span>
      <span className="label-l">{WEIGHT_LABEL[weight]}</span>
    </span>
  );
}

function Picker() {
  const [params, setParams] = useSearchParams();
  const task = recommend(params.get("task"));
  const choose = useCallback(
    (id: string) => {
      const next = new URLSearchParams(params);
      next.set("task", id);
      setParams(next, { replace: true, preventScrollReset: true });
    },
    [params, setParams],
  );
  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const i = GREEN_TASKS.findIndex((t) => t.id === task.id);
    const j = (i + step + GREEN_TASKS.length) % GREEN_TASKS.length;
    choose(GREEN_TASKS[j].id);
    e.currentTarget.querySelectorAll<HTMLButtonElement>("button")[j]?.focus();
  };
  const picks = task.tools.map((id) => toolById.get(id)).filter((t) => t !== undefined);

  return (
    <section className="section" id="right-size" aria-labelledby="picker-h">
      <div className="section-head">
        <div>
          <h2 id="picker-h" className="headline-m">
            Right-size the model
          </h2>
          <p className="body-m muted measure">Pick what you're doing. We'll suggest the lightest option that still does the job well.</p>
        </div>
      </div>

      <div className="picker">
        <div className="picker-tasks" role="radiogroup" aria-label="What are you doing?" onKeyDown={onKey}>
          {GREEN_TASKS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={t.id === task.id}
              tabIndex={t.id === task.id ? 0 : -1}
              className="picker-task state"
              onClick={() => choose(t.id)}
            >
              <Icon name={t.icon} filled={t.id === task.id} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="picker-result" aria-live="polite" data-task={task.id}>
          <div className="picker-top">
            <p className="body-m picker-for">For {task.label.toLowerCase()}</p>
            <Weight weight={task.weight} />
          </div>
          <h3 className="headline-s picker-pick">{task.pick}</h3>
          <p className="body-l">{task.reason}</p>

          <dl className="picker-notes">
            <div>
              <dt className="label-l">
                <Icon name="trending_up" size={20} /> Step up when
              </dt>
              <dd className="body-m">{task.stepUp}</dd>
            </div>
            <div>
              <dt className="label-l">
                <Icon name="do_not_disturb_on" size={20} /> Skip
              </dt>
              <dd className="body-m">{task.skip}</dd>
            </div>
          </dl>

          {task.tutor && (
            <div className="picker-tutor">
              <Icon name="devices" size={22} />
              <p className="body-m">
                This Hub's tutor is a small model that runs on your own device, so simple explanations don't need a data centre at all. It
                still uses your battery, and it can be wrong.
              </p>
              <button type="button" className="btn sm state" onClick={openTutor}>
                Open the tutor
              </button>
            </div>
          )}

          <div className="picker-tools">
            <p className="label-l muted">Tools in the catalog that fit</p>
            <ul>
              {picks.map((t) => (
                <li key={t.id}>
                  <Link to={`/tools/${t.id}`} className="picker-tool state">
                    <ToolMark tool={t} size={32} />
                    <span className="label-l">{t.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Habits ────────────────────────────────────────────────────────────────

function Ring({ done, total }: { done: number; total: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="green-ring" role="img" aria-label={`${done} of ${total} habits`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="green-ring-track" cx="50" cy="50" r={r} />
        <circle className="green-ring-fill" cx="50" cy="50" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - done / total)} />
      </svg>
      <span className="green-ring-label">
        <span className="headline-s">{done}</span>
        <span className="body-s muted">of {total}</span>
      </span>
    </div>
  );
}

function Habits({ done, setDone }: { done: string[]; setDone: (d: string[]) => void }) {
  const count = HABITS.filter((h) => done.includes(h.id)).length;
  const all = count === HABITS.length;
  const toggle = (id: string) => setDone(done.includes(id) ? done.filter((x) => x !== id) : [...done, id]);
  return (
    <section className="section" id="habits" aria-labelledby="habits-h">
      <div className="habits-head">
        <div>
          <h2 id="habits-h" className="headline-m">
            Efficient habits
          </h2>
          <p className="body-m muted measure">
            Tick the ones you already do. They save energy and your time. Saved in this browser only.
          </p>
        </div>
        <Ring done={count} total={HABITS.length} />
      </div>

      <ul className="habits">
        {HABITS.map((h) => {
          const on = done.includes(h.id);
          return (
            <li key={h.id}>
              <label className={`habit ${on ? "on" : ""}`}>
                <input type="checkbox" checked={on} onChange={() => toggle(h.id)} />
                <span className="habit-box" aria-hidden="true">
                  <Icon name="check" size={20} />
                </span>
                <span className="habit-text">
                  <span className="title-m">{h.title}</span>
                  <span className="body-m muted">{h.why}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="habits-foot" aria-live="polite">
        {all ? (
          <p className="habits-done body-l">
            <Icon name="local_florist" filled size={24} />
            All eight. Your sprout is in bloom, and your prompts are probably sharper too.
          </p>
        ) : count > 0 ? (
          <p className="body-m muted">
            {HABITS.length - count} to go. Try one this week.
          </p>
        ) : (
          <p className="body-m muted">Start with any one. Batching questions is an easy first win.</p>
        )}
        {count > 0 && (
          <button type="button" className="btn sm text state" onClick={() => setDone([])}>
            Clear ticks
          </button>
        )}
      </div>
    </section>
  );
}

// ── Responsible use ───────────────────────────────────────────────────────

function Responsible() {
  return (
    <section className="section" aria-labelledby="responsible-h">
      <div className="section-head">
        <div>
          <h2 id="responsible-h" className="headline-m">
            Responsible use and governance
          </h2>
          <p className="body-m muted measure">Using AI lightly is one part. Using it fairly and openly is the other.</p>
        </div>
      </div>

      <ul className="principles">
        {PRINCIPLES.map((p) => (
          <li key={p.id} className="principle">
            <span className="principle-icon">
              <Icon name={p.icon} size={22} />
            </span>
            <h3 className="title-m">{p.title}</h3>
            <p className="body-m muted">{p.body}</p>
          </li>
        ))}
      </ul>

      <h3 className="title-l gov-head">Who sets the rules</h3>
      <ul className="gov">
        {GOVERNANCE.map((g) => (
          <li key={g.id} className="gov-item">
            <h4 className="title-m">{g.title}</h4>
            <p className="body-m">
              {g.body} {g.source && <Cite id={g.source} />}
            </p>
            {g.id === "university" && (
              <Link to="/learn/ethics-integrity" className="btn sm text state">
                Ethics and academic integrity lesson
              </Link>
            )}
          </li>
        ))}
      </ul>
      <p className="body-s muted gov-note">A plain-language overview, not legal advice.</p>
    </section>
  );
}

// ── Pledge ────────────────────────────────────────────────────────────────

function Pledge({ pledged, setPledged }: { pledged: string | null; setPledged: (v: string | null) => void }) {
  const date = pledged ? new Date(pledged).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null;
  return (
    <section className="section" id="pledge" aria-labelledby="pledge-h">
      <div className="pledge">
        <div className="pledge-card">
          <h2 id="pledge-h" className="headline-m">
            The green AI pledge
          </h2>
          <ul className="pledge-lines">
            {PLEDGE.map((line) => (
              <li key={line} className="body-l">
                <Icon name="eco" filled={!!pledged} size={22} />
                {line}
              </li>
            ))}
          </ul>
          <div className="pledge-action" aria-live="polite">
            {pledged ? (
              <>
                <p className="title-m">You took the pledge on {date}. Thank you.</p>
                <button type="button" className="btn sm text state" onClick={() => setPledged(null)}>
                  Undo
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn green state" onClick={() => setPledged(new Date().toISOString())}>
                  <Icon name="eco" />
                  Take the pledge
                </button>
                <p className="body-s">Just for you: it's saved in this browser and nowhere else.</p>
              </>
            )}
          </div>
        </div>

        <div className="pledge-next">
          <h3 className="title-l">Keep going</h3>
          <ul className="next-links">
            <li>
              <button type="button" className="next-link state" onClick={openTutor}>
                <Icon name="eco" />
                <span>
                  <span className="title-m">AI and the environment</span>
                  <span className="body-m muted">A five-step quest in the tutor. Open it with Ctrl/⌘+K.</span>
                </span>
              </button>
            </li>
            <li>
              <Link to="/learn/limits" className="next-link state">
                <Icon name="report" />
                <span>
                  <span className="title-m">What AI gets wrong</span>
                  <span className="body-m muted">Hallucinations, bias and how to catch them.</span>
                </span>
              </Link>
            </li>
            <li>
              <Link to="/learn/ethics-integrity" className="next-link state">
                <Icon name="gavel" />
                <span>
                  <span className="title-m">Ethics and academic integrity</span>
                  <span className="body-m muted">Privacy, copyright, disclosure and course policy.</span>
                </span>
              </Link>
            </li>
            <li>
              <Link to="/tools" className="next-link state">
                <Icon name="hub" />
                <span>
                  <span className="title-m">The tool map</span>
                  <span className="body-m muted">Find a tool that fits the task, not the biggest one.</span>
                </span>
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export function Green() {
  const [done, setDone] = useStored(HABITS_KEY, [] as string[], isStringArray);
  const [pledged, setPledged] = useStored<string | null>(PLEDGE_KEY, null, isPledge);
  const count = HABITS.filter((h) => done.includes(h.id)).length;

  return (
    <div className="green-page">
      <section className="green-hero">
        <div className="green-hero-copy">
          <h1 className="display-l">Use AI well, and lightly.</h1>
          <p className="body-l measure">
            AI runs on electricity and water. The encouraging part: much of what you can change comes down to everyday choices, like
            which model you pick and how you write a prompt. The same choices usually get you better answers, faster.
          </p>
          <div className="hero-actions">
            <a href="#right-size" className="btn green state">
              <Icon name="tune" />
              Right-size your model
            </a>
            <a href="#habits" className="btn outlined state">
              <Icon name="checklist" />
              Check your habits
            </a>
          </div>
        </div>
        <div className="green-hero-art">
          <Sprout grown={SEEDLING + count} bloom={count === HABITS.length} />
          <p className="body-s sprout-caption">
            {count === HABITS.length
              ? "In full bloom."
              : count
                ? `${count} ${count === 1 ? "habit" : "habits"} ticked. It grows a leaf for each one below.`
                : "It grows a leaf for each habit you tick below."}
          </p>
        </div>
      </section>

      <Footprint />
      <Picker />
      <Habits done={done} setDone={setDone} />
      <Responsible />
      <Pledge pledged={pledged} setPledged={setPledged} />

      <section className="section" aria-labelledby="sources-h">
        <h2 id="sources-h" className="headline-s section-head">
          Sources
        </h2>
        <ol className="sources">
          {SOURCES.map((s) => (
            <li key={s.id} id={`src-${s.id}`} className="body-m">
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
              <span className="muted">
                {" "}
                {s.publisher}, {s.date}.
              </span>
            </li>
          ))}
        </ol>
        <p className="body-s muted sources-note">
          Figures are estimates and company-reported numbers, measured in different ways. Treat them as ranges, not precise values.
        </p>
      </section>
    </div>
  );
}
