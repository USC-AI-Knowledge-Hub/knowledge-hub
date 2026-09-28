import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { moduleById } from "../../data/learn";
import { buildMessages } from "../../lib/tutor/prompt";
import {
  RUBRIC,
  UNLOCK_AFTER,
  XP_FIRST_TRY,
  XP_QUEST_BONUS,
  checkFor,
  drawVariant,
  levelOf,
  levels,
  questById,
  questionId,
  variantCount,
  type DojoTask,
  type QuestStep,
} from "../../lib/tutor/quests";
import { scoreCount, scorePrompt, type RubricScore } from "../../lib/tutor/rubric";
import {
  lastSeen,
  levelNeeds,
  levelUnlocked,
  markSeen,
  nextQuest,
  questProgress,
  questStore,
  questUnlocked,
  recordAnswer,
  recordPass,
  resumeStep,
  useQuestState,
} from "../../lib/tutor/storage";
import { Icon } from "../Icon";
import { CheckBlock } from "./CheckBlock";
import { useTutor } from "./context";
import { Markdown } from "./Markdown";
import { Badge, Orb } from "./Shapes";

type GenState = { state: "idle" | "thinking" | "streaming" | "done" | "stopped" | "error"; text: string };
type Run = (mode: "quest" | "critique", notes: string, question: string) => Promise<void>;

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

  const run: Run = useCallback(
    async (mode, notes, question) => {
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

function Dojo({ id, task, onScored }: { id: string; task: DojoTask; onScored(prompt: string, score: RubricScore): void }) {
  const [text, setText] = useState("");
  const [score, setScore] = useState<RubricScore | null>(null);
  return (
    <div className="t-card t-dojo">
      <p className="label-m muted">Your task</p>
      <p className="title-s">{task.task}</p>
      <label htmlFor={`dojo-${id}`} className="body-s muted">
        Write the prompt you'd send to an AI assistant.
      </label>
      <textarea id={`dojo-${id}`} rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write your prompt here" />
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
            <p className="body-m t-stronger">{task.stronger}</p>
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
  const { go, setView } = useTutor();
  const head = useRef<HTMLHeadingElement>(null);
  // Whether this badge just opened the next level: open now, but not without it.
  const [opened] = useState(() => {
    const n = levelOf.get(questId)?.n ?? levels.length;
    const without = { ...s, badges: s.badges.filter((b) => b !== questId) };
    return n < levels.length && levelUnlocked(s, n + 1) && !levelUnlocked(without, n + 1) ? n + 1 : null;
  });
  const next = earned ? nextQuest(s, questId) : null;
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
      {opened && (
        <p className="t-unlocked label-l">
          <Icon name="lock_open" size={20} />
          Level {opened} is open: {levels[opened - 1].title}
        </p>
      )}
      <div className="t-actions center">
        {next && (
          <button type="button" className="btn filled sm state" onClick={() => setView({ name: "quest", quest: next })}>
            Next quest: {questById.get(next)!.title}
          </button>
        )}
        {lesson && (
          <button type="button" className={`btn ${next ? "tonal" : "filled"} sm state`} onClick={() => go(`/learn/${lesson.id}`)}>
            Continue with “{lesson.title}”
          </button>
        )}
        <button type="button" className="btn text sm state" onClick={onBack}>
          Back to the path
        </button>
      </div>
    </div>
  );
}

function LockedCheck({ questId }: { questId: string }) {
  const s = useQuestState();
  const level = levelOf.get(questId)!;
  const prev = levels[level.n - 2];
  const needs = levelNeeds(s, level.n);
  return (
    <div className="t-card t-locked-check">
      <Icon name="lock" />
      <p className="body-m">
        You're peeking ahead. Checks open with level {level.n}, after {UNLOCK_AFTER} finished quests in “{prev.title}” ({needs} to go).
      </p>
    </div>
  );
}

/**
 * One step, mounted fresh each time it's shown. It draws a check variant (or
 * dojo task) at random, never the one shown last time, and remembers the draw.
 */
function StepBody({
  questId,
  step,
  passed,
  locked,
  gen,
  run,
  onPassed,
}: {
  questId: string;
  step: QuestStep;
  passed: boolean;
  locked: boolean;
  gen: GenState;
  run: Run;
  onPassed(): void;
}) {
  const { engine } = useTutor();
  const ready = engine.ready;
  const [draw, setDraw] = useState(() => ({ n: 0, variant: drawVariant(variantCount(step), lastSeen(questStore.get(), questId, step.id)) }));
  const [passedNow, setPassedNow] = useState(false);
  const [dojoPrompt, setDojoPrompt] = useState<{ text: string; score: RubricScore } | null>(null);
  const { variant } = draw;
  const check = checkFor(step, variant);
  const task = step.kind === "dojo" ? step.tasks[variant] : null;

  useEffect(() => {
    if (!locked) markSeen(questId, step.id, variant);
  }, [questId, step.id, variant, locked]);

  // Learn steps: the tutor explains as soon as the step opens (or the model finishes loading).
  useEffect(() => {
    if (ready && step.kind === "learn") void run("quest", step.notes, step.ask);
  }, [ready]);

  const critique = (text: string, score: RubricScore) => {
    if (!task) return;
    const r = RUBRIC.map((x) => `${x.label}: ${score[x.id] ? "covered" : "missing"}`).join("; ");
    void run("critique", `${step.notes}\nTask: ${task.task}\nRubric check: ${r}.`, `My prompt: ${text}`);
  };

  const explain = () => {
    if (!ready) return;
    if (step.kind === "dojo" && dojoPrompt) critique(dojoPrompt.text, dojoPrompt.score);
    else void run("quest", step.notes, step.ask);
  };

  const pass = (firstTry: boolean) => {
    setPassedNow(true);
    onPassed();
    return recordPass(questId, step.id, firstTry).gained;
  };
  const checkBlock = (extra: Partial<Parameters<typeof CheckBlock>[0]> = {}) =>
    locked ? (
      <LockedCheck questId={questId} />
    ) : (
      <CheckBlock
        key={`${step.id}-${draw.n}`}
        check={check}
        name={`check-${questId}-${step.id}-${draw.n}`}
        passedBefore={passed}
        onFirstAnswer={(correct) => recordAnswer(questionId(questId, step.id, variant), correct)}
        onPass={pass}
        {...extra}
      />
    );

  if (step.kind === "learn")
    return (
      <>
        <div className="t-msg user">
          <p className="t-bubble body-m">{step.ask}</p>
        </div>
        <Explanation gen={gen} notes={step.notes} onRetry={explain} />
        {checkBlock({
          onAnother: step.checks.length > 1 ? () => setDraw((d) => ({ n: d.n + 1, variant: drawVariant(step.checks.length, d.variant) })) : undefined,
        })}
      </>
    );

  if (step.kind === "dojo")
    return (
      <>
        {locked ? (
          <div className="t-card t-dojo">
            <p className="label-m muted">Your task</p>
            <p className="title-s">{task!.task}</p>
          </div>
        ) : (
          <Dojo
            key={`${step.id}-${variant}`}
            id={step.id}
            task={task!}
            onScored={(text, score) => {
              setDojoPrompt({ text, score });
              if (ready) critique(text, score);
            }}
          />
        )}
        {dojoPrompt && ready && <Explanation gen={gen} notes={step.notes} onRetry={explain} />}
        {(dojoPrompt || locked) && checkBlock()}
      </>
    );

  return (
    <>
      <div className="t-msg user">
        <p className="t-bubble body-m">{step.question}</p>
      </div>
      <p className="body-s muted t-spot-intro">
        <Icon name="smart_toy" size={16} /> An AI assistant answered with four claims. One of them is wrong.
      </p>
      {checkBlock({
        spot: true,
        onPass: (f) => {
          if (ready) void run("quest", step.notes, step.ask);
          return pass(f);
        },
      })}
      {(passedNow || gen.state !== "idle") && (
        <>
          <div className="t-msg user">
            <p className="t-bubble body-m">{step.ask}</p>
          </div>
          <Explanation gen={gen} notes={step.notes} onRetry={explain} />
        </>
      )}
    </>
  );
}

export function QuestView({ questId, scroller }: { questId: string; scroller: RefObject<HTMLDivElement | null> }) {
  const quest = questById.get(questId)!;
  const s = useQuestState();
  const { engine, setView } = useTutor();
  const [index, setIndex] = useState(() => resumeStep(s, questId));
  const [finished, setFinished] = useState(false);
  const [passedNow, setPassedNow] = useState(false);
  const { gen, run, reset } = useExplain();
  const heading = useRef<HTMLHeadingElement>(null);
  const step = quest.steps[index];
  const passed = !!s.steps[questId]?.[step.id];
  const level = levelOf.get(questId);
  const locked = !questUnlocked(s, questId);

  // Each step: stop any answer in progress, reset, and move focus to the step.
  useEffect(() => {
    reset();
    setPassedNow(false);
    scroller.current?.scrollTo({ top: 0 });
    heading.current?.focus({ preventScroll: true });
    return () => {
      engine.stop();
    };
  }, [index]);

  if (finished) return <Complete questId={questId} onBack={() => setView({ name: "home" })} />;

  const { done } = questProgress(s, questId);
  const last = index === quest.steps.length - 1;
  const canNext = passed || passedNow || locked;

  return (
    <div className="t-quest-view">
      <div className="t-quest-top">
        {level && (
          <p className="label-l muted">
            Level {level.n}: {level.title}
          </p>
        )}
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

      <StepBody key={step.id} questId={questId} step={step} passed={passed} locked={locked} gen={gen} run={run} onPassed={() => setPassedNow(true)} />

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
          onClick={() => (last ? (locked ? setView({ name: "home" }) : setFinished(true)) : setIndex(index + 1))}
          aria-describedby={canNext ? undefined : `skip-${step.id}`}
        >
          {last ? (locked ? "Back to the path" : "Finish") : canNext ? "Next step" : "Skip"}
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
