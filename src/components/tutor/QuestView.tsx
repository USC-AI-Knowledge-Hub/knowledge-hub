import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { moduleById } from "../../data/learn";
import { buildMessages } from "../../lib/tutor/prompt";
import { RUBRIC, XP_FIRST_TRY, XP_QUEST_BONUS, questById, type QuestStep } from "../../lib/tutor/quests";
import { optionOrder, scoreCount, scorePrompt, type RubricScore } from "../../lib/tutor/rubric";
import { questProgress, recordPass, resumeStep, useQuestState } from "../../lib/tutor/storage";
import { Icon } from "../Icon";
import { useTutor } from "./context";
import { Markdown } from "./Markdown";
import { Badge, Orb } from "./Shapes";

type GenState = { state: "idle" | "thinking" | "streaming" | "done" | "stopped" | "error"; text: string };

/** Streams one tutor explanation for a step, grounded in that step's notes. */
function useExplain() {
  const { engine, announce } = useTutor();
  const [gen, setGen] = useState<GenState>({ state: "idle", text: "" });
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = useCallback(
    async (mode: "quest" | "critique", notes: string, question: string) => {
      setGen({ state: "thinking", text: "" });
      try {
        const r = await engine.generate(buildMessages(mode, notes, question), (t) => alive.current && setGen({ state: "streaming", text: t }));
        if (!alive.current) return;
        setGen({ state: r.stopped ? "stopped" : "done", text: r.text });
        announce(`Tutor: ${r.text}`);
      } catch (err) {
        if (alive.current) setGen({ state: "error", text: err instanceof Error && err.name !== "CancelledError" ? err.message : "" });
      }
    },
    [engine, announce],
  );
  return { gen, run, reset: () => setGen({ state: "idle", text: "" }) };
}

function Explanation({ gen, notes, onRetry }: { gen: GenState; notes: string; onRetry(): void }) {
  const { engine, setView } = useTutor();
  if (!engine.ready || gen.state === "idle") {
    return (
      <div className="t-card t-notes">
        <p className="label-m muted">From the notes</p>
        <p className="body-m">{notes}</p>
        {!engine.ready && (
          <p className="body-s muted t-hint">
            <Icon name="info" size={16} />
            <span>
              <button type="button" className="t-link" onClick={() => setView({ name: "setup" })}>
                Download a model
              </button>{" "}
              to have the tutor explain this and take follow-up questions.
            </span>
          </p>
        )}
      </div>
    );
  }
  const busy = gen.state === "thinking" || gen.state === "streaming";
  return (
    <div className="t-msg tutor" aria-busy={busy}>
      <Orb size={28} thinking={busy} className="t-msg-orb" />
      <div className="t-bubble">
        {gen.state === "thinking" ? (
          <p className="body-m muted t-thinking">Thinking…</p>
        ) : gen.state === "error" ? (
          <p className="body-m t-error">
            The tutor couldn't answer{gen.text ? `: ${gen.text}` : "."}{" "}
            <button type="button" className="t-link" onClick={onRetry}>
              Try again
            </button>
          </p>
        ) : (
          <div className={`body-m ${gen.state === "streaming" ? "t-streaming" : ""}`}>
            <Markdown text={gen.text} />
          </div>
        )}
        {!busy && gen.state !== "error" && (
          <>
            <p className="body-s muted t-caveat">{gen.state === "stopped" ? "Stopped. " : ""}Small on-device model. It can be wrong.</p>
            <details className="t-source">
              <summary className="label-m">Show the notes it used</summary>
              <p className="body-s">{notes}</p>
            </details>
          </>
        )}
      </div>
    </div>
  );
}

function CheckBlock({
  step,
  seed,
  passedBefore,
  onPass,
}: {
  step: QuestStep;
  seed: string;
  passedBefore: boolean;
  onPass(firstTry: boolean): number;
}) {
  const { check } = step;
  const spot = step.kind === "spot";
  const order = spot ? check.options.map((_, i) => i) : optionOrder(check, seed);
  const [choice, setChoice] = useState<number | null>(null);
  const [result, setResult] = useState<"right" | "wrong" | null>(null);
  const [misses, setMisses] = useState(0);
  const [gained, setGained] = useState(0);
  const feedback = useRef<HTMLDivElement>(null);
  const name = `check-${seed}`;

  const submit = () => {
    if (choice === null) return;
    if (choice === check.answer) {
      setResult("right");
      setGained(onPass(misses === 0));
    } else {
      setResult("wrong");
      setMisses((m) => m + 1);
    }
    requestAnimationFrame(() => feedback.current?.focus());
  };

  const locked = result === "right";
  return (
    <fieldset className={`t-check ${spot ? "spot" : ""}`}>
      <legend className="title-s">{spot ? "Tap the claim that's wrong" : check.question}</legend>
      <div className="t-check-options">
        {order.map((i) => {
          const picked = choice === i;
          const cls = locked && i === check.answer ? "right" : result === "wrong" && picked ? "wrong" : "";
          return (
            <label key={i} className={`t-option state ${picked ? "picked" : ""} ${cls}`}>
              <input
                type="radio"
                name={name}
                checked={picked}
                disabled={locked}
                onChange={() => {
                  setChoice(i);
                  if (result === "wrong") setResult(null);
                }}
              />
              <span className="t-option-mark" aria-hidden="true">
                {cls === "right" ? <Icon name="check" size={18} /> : cls === "wrong" ? <Icon name="close" size={18} /> : null}
              </span>
              <span className="body-m">{check.options[i]}</span>
            </label>
          );
        })}
      </div>
      {!locked && (
        <div className="t-actions">
          <button type="button" className="btn filled sm state" disabled={choice === null || result === "wrong"} onClick={submit}>
            Check answer
          </button>
          {passedBefore && <span className="body-s muted">You've passed this one before.</span>}
        </div>
      )}
      <div ref={feedback} tabIndex={-1} className="t-feedback-wrap" aria-live="polite">
        {result === "wrong" && (
          <p className="t-feedback wrong body-m">
            <Icon name="close" />
            <span>
              <strong>Not quite.</strong> {spot ? "That one checks out. Look again for the claim that doesn't." : "Have another look at the notes, then pick again."}
            </span>
          </p>
        )}
        {result === "right" && (
          <div className="t-feedback right body-m">
            <Icon name="check_circle" filled />
            <span>
              <strong>Correct.</strong> {check.explain}
            </span>
            {gained > 0 && <span className="t-xp-pop label-l">+{gained} XP</span>}
          </div>
        )}
      </div>
    </fieldset>
  );
}

function Dojo({ step, onScored }: { step: Extract<QuestStep, { kind: "dojo" }>; onScored(prompt: string, score: RubricScore): void }) {
  const [text, setText] = useState("");
  const [score, setScore] = useState<RubricScore | null>(null);
  return (
    <div className="t-card t-dojo">
      <p className="label-m muted">Your task</p>
      <p className="title-s">{step.task}</p>
      <label htmlFor={`dojo-${step.id}`} className="body-s muted">
        Write the prompt you'd send to an AI assistant.
      </label>
      <textarea id={`dojo-${step.id}`} rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your prompt here" />
      <div className="t-actions">
        <button
          type="button"
          className="btn filled sm state"
          disabled={text.trim().length < 5}
          onClick={() => {
            const s = scorePrompt(text);
            setScore(s);
            onScored(text, s);
          }}
        >
          {score ? "Score again" : "Score my prompt"}
        </button>
      </div>
      {score && (
        <div className="t-rubric" aria-live="polite">
          <p className="title-s">
            {scoreCount(score)} of {RUBRIC.length} on the rubric
          </p>
          <ul>
            {RUBRIC.map((r) => (
              <li key={r.id} className={score[r.id] ? "yes" : "no"}>
                <Icon name={score[r.id] ? "check_circle" : "radio_button_unchecked"} filled={score[r.id]} size={20} />
                <span className="body-m">
                  <strong>{r.label}.</strong> {score[r.id] ? "Covered." : r.hint}
                </span>
              </li>
            ))}
          </ul>
          <details className="t-source" open>
            <summary className="label-m">A stronger version</summary>
            <p className="body-m t-stronger">{step.stronger}</p>
          </details>
        </div>
      )}
    </div>
  );
}

function Complete({ questId, onBack }: { questId: string; onBack(): void }) {
  const q = questById.get(questId)!;
  const s = useQuestState();
  const { done, total } = questProgress(s, questId);
  const earned = s.badges.includes(questId);
  const lesson = moduleById.get(q.lesson);
  const { go } = useTutor();
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => head.current?.focus(), []);
  return (
    <div className="t-complete">
      <div className={`t-complete-badge ${earned ? "pop" : ""}`}>
        <Badge shape={q.shape} icon={q.icon} earned={earned} size={112} />
      </div>
      <h3 ref={head} tabIndex={-1} className="headline-s">
        {earned ? "Badge earned" : "Almost there"}
      </h3>
      <p className="body-m muted">
        {earned
          ? `You finished “${q.title}” and earned a ${XP_QUEST_BONUS} XP bonus.`
          : `You've passed ${done} of ${total} checks. Finish the rest to earn the badge.`}
      </p>
      <div className="t-actions center">
        {lesson && (
          <button type="button" className="btn filled sm state" onClick={() => go(`/learn/${lesson.id}`)}>
            Continue with “{lesson.title}”
          </button>
        )}
        <button type="button" className="btn text sm state" onClick={onBack}>
          Back to quests
        </button>
      </div>
    </div>
  );
}

export function QuestView({ questId, scroller }: { questId: string; scroller: RefObject<HTMLDivElement | null> }) {
  const quest = questById.get(questId)!;
  const s = useQuestState();
  const { engine, setView } = useTutor();
  const [index, setIndex] = useState(() => resumeStep(s, questId));
  const [finished, setFinished] = useState(false);
  const [passedNow, setPassedNow] = useState(false);
  const [dojoPrompt, setDojoPrompt] = useState<{ text: string; score: RubricScore } | null>(null);
  const { gen, run, reset } = useExplain();
  const heading = useRef<HTMLHeadingElement>(null);
  const step = quest.steps[index];
  const passed = !!s.steps[questId]?.[step.id];
  const ready = engine.ready;

  // Each step: stop any answer in progress, reset, and move focus to the step.
  useEffect(() => {
    reset();
    setPassedNow(false);
    setDojoPrompt(null);
    scroller.current?.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
    return () => {
      engine.stop();
    };
  }, [index]);

  // Learn steps: the tutor explains as soon as the step opens (or the model finishes loading).
  useEffect(() => {
    if (ready && step.kind === "learn") void run("quest", step.notes, step.ask);
  }, [ready, index]);

  const explain = () => {
    if (!ready) return;
    if (step.kind === "dojo" && dojoPrompt) {
      const r = RUBRIC.map((x) => `${x.label}: ${dojoPrompt.score[x.id] ? "covered" : "missing"}`).join("; ");
      void run("critique", `${step.notes}\nTask: ${step.task}\nRubric check: ${r}.`, `My prompt: ${dojoPrompt.text}`);
    } else void run("quest", step.notes, step.ask);
  };

  if (finished) return <Complete questId={questId} onBack={() => setView({ name: "home" })} />;

  const { done } = questProgress(s, questId);
  const last = index === quest.steps.length - 1;
  const canNext = passed || passedNow;

  return (
    <div className="t-quest-view">
      <div className="t-quest-top">
        <p className="headline-s">{quest.title}</p>
        <ol className="t-steps" aria-label={`${done} of ${quest.steps.length} steps passed`}>
          {quest.steps.map((st, i) => (
            <li
              key={st.id}
              className={`${s.steps[questId]?.[st.id] ? "passed" : ""} ${i === index ? "current" : ""}`}
              aria-current={i === index ? "step" : undefined}
            >
              <span className="visually-hidden">
                Step {i + 1}: {st.title}
                {s.steps[questId]?.[st.id] ? ", passed" : ""}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <h4 ref={heading} tabIndex={-1} className="title-l t-step-title">
        <span className="label-l muted">
          Step {index + 1} of {quest.steps.length}
        </span>
        {step.title}
      </h4>

      {step.kind === "learn" && (
        <>
          <div className="t-msg user">
            <p className="t-bubble body-m">{step.ask}</p>
          </div>
          <Explanation gen={gen} notes={step.notes} onRetry={explain} />
          <CheckBlock key={step.id} step={step} seed={`${questId}/${step.id}`} passedBefore={passed} onPass={(f) => (setPassedNow(true), recordPass(questId, step.id, f).gained)} />
        </>
      )}

      {step.kind === "dojo" && (
        <>
          <Dojo
            key={step.id}
            step={step}
            onScored={(text, score) => {
              setDojoPrompt({ text, score });
              if (ready) {
                const r = RUBRIC.map((x) => `${x.label}: ${score[x.id] ? "covered" : "missing"}`).join("; ");
                void run("critique", `${step.notes}\nTask: ${step.task}\nRubric check: ${r}.`, `My prompt: ${text}`);
              }
            }}
          />
          {dojoPrompt && ready && <Explanation gen={gen} notes={step.notes} onRetry={explain} />}
          {dojoPrompt && (
            <CheckBlock key={step.id} step={step} seed={`${questId}/${step.id}`} passedBefore={passed} onPass={(f) => (setPassedNow(true), recordPass(questId, step.id, f).gained)} />
          )}
        </>
      )}

      {step.kind === "spot" && (
        <>
          <div className="t-msg user">
            <p className="t-bubble body-m">{step.question}</p>
          </div>
          <p className="body-s muted t-spot-intro">
            <Icon name="smart_toy" size={16} /> An AI assistant answered with four claims. One of them is wrong.
          </p>
          <CheckBlock
            key={step.id}
            step={step}
            seed={`${questId}/${step.id}`}
            passedBefore={passed}
            onPass={(f) => {
              setPassedNow(true);
              if (ready) void run("quest", step.notes, step.ask);
              return recordPass(questId, step.id, f).gained;
            }}
          />
          {(passedNow || gen.state !== "idle") && (
            <>
              <div className="t-msg user">
                <p className="t-bubble body-m">{step.ask}</p>
              </div>
              <Explanation gen={gen} notes={step.notes} onRetry={explain} />
            </>
          )}
        </>
      )}

      <nav className="t-step-nav" aria-label="Quest steps">
        <button type="button" className="btn text sm state" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          <Icon name="arrow_back" />
          Back
        </button>
        {gen.state === "thinking" || gen.state === "streaming" ? (
          <button type="button" className="btn outlined sm state" onClick={engine.stop}>
            <Icon name="stop" />
            Stop
          </button>
        ) : null}
        <button
          type="button"
          className={`btn sm state ${canNext ? "filled" : "outlined"}`}
          onClick={() => (last ? setFinished(true) : setIndex(index + 1))}
          aria-describedby={canNext ? undefined : `skip-${step.id}`}
        >
          {last ? "Finish" : canNext ? "Next step" : "Skip"}
          <Icon name={last ? "flag" : "arrow_forward"} />
        </button>
      </nav>
      {!canNext && (
        <p id={`skip-${step.id}`} className="body-s muted t-skip-note">
          Skipping earns no XP. You can come back to any step.
        </p>
      )}
      <p className="visually-hidden">Each correct check earns {XP_FIRST_TRY} XP on the first try.</p>
    </div>
  );
}
