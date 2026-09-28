import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { Icon } from "../components/Icon";
import { Level } from "../components/Level";
import { Markdown } from "../components/tutor/Markdown";
import { WavyProgress } from "../components/WavyProgress";
import { lessonByModule } from "../data/guided";
import { guidedPathById, pathModules } from "../data/guided/paths";
import { CHECK_PASS, CHECK_SIZE, type GuidedLesson } from "../data/guided/types";
import { moduleById } from "../data/learn";
import type { Module } from "../data/types";
import { minutesLabel } from "../lib/format";
import { drawCheck, guidedStore, useGuided, type DrawnQuestion } from "../lib/guided";
import { useProgress } from "../lib/progress";
import { askTutor } from "../lib/tutor/bridge";
import "../styles/guided.css";
import { NotFound } from "./NotFound";

type Step =
  | { kind: "overview"; label: string }
  | { kind: "section"; label: string; index: number }
  | { kind: "example"; label: string }
  | { kind: "practice"; label: string }
  | { kind: "check"; label: string }
  | { kind: "reflect"; label: string }
  | { kind: "done"; label: string };

function stepsFor(lesson: GuidedLesson): Step[] {
  return [
    { kind: "overview", label: "Overview" },
    ...lesson.sections.map((s, index) => ({ kind: "section" as const, label: s.heading, index })),
    { kind: "example", label: "Example" },
    { kind: "practice", label: "Try it" },
    { kind: "check", label: "Check" },
    { kind: "reflect", label: "Reflect" },
    { kind: "done", label: "Done" },
  ];
}

const plain = (md: string) => md.replace(/\*\*/g, "");

/** A guided lesson, one step at a time, with the tutor alongside. */
export function LessonPlayer() {
  const { path: pathId, id = "" } = useParams();
  const lesson = lessonByModule.get(id);
  const module = moduleById.get(id);
  const course = pathId ? guidedPathById.get(pathId) : undefined;
  useGuided(); // re-render when progress changes
  const saved = guidedStore.lesson(id);
  const [at, setAt] = useState(() => Math.min(saved.step, lesson ? stepsFor(lesson).length - 1 : 0));
  const top = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setAt(Math.min(guidedStore.lesson(id).step, lesson ? stepsFor(lesson).length - 1 : 0));
  }, [id, lesson]);

  if (!lesson || !module || (pathId && !course)) return <NotFound />;

  const steps = stepsFor(lesson);
  const step = steps[at];
  const base = course ? `/learn/path/${course.path}` : "/learn";
  const route = course ? `${base}/${id}` : `/learn/lesson/${id}`;
  const order = course ? pathModules(course) : [];
  const nextId = order[order.indexOf(id) + 1];
  const next = nextId ? moduleById.get(nextId) : undefined;

  const go = (i: number) => {
    const clamped = Math.max(0, Math.min(steps.length - 1, i));
    setAt(clamped);
    if (clamped > guidedStore.lesson(id).step) guidedStore.updateLesson(id, { step: clamped });
    requestAnimationFrame(() => top.current?.focus({ preventScroll: false }));
  };

  // Moving past the check needs a pass; everything else is free to explore.
  const checkIndex = steps.findIndex((s) => s.kind === "check");
  const blocked = step.kind === "check" && !saved.passed;

  return (
    <div className="lesson-player">
      <header className="page-head lp-head">
        <Link to={base} className="crumb">
          <Icon name="arrow_back" />
          {course ? `${guidedCourseTitle(course.path)} course` : "Learn"}
        </Link>
        <div className="module-meta">
          <Level level={module.difficulty} />
          <span className="label-l muted">{minutesLabel(module.minutes)}</span>
          {saved.passed && (
            <span className="label-l lp-passed">
              <Icon name="check_circle" filled size={18} />
              Passed
            </span>
          )}
        </div>
        <h1 className="headline-l">{module.title}</h1>
        <nav className="lp-steps" aria-label="Lesson steps">
          <ol>
            {steps.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  className={`lp-step state ${i === at ? "current" : ""} ${i <= saved.step || i < at ? "reached" : ""}`}
                  aria-current={i === at ? "step" : undefined}
                  disabled={i > checkIndex && !saved.passed}
                  onClick={() => go(i)}
                  title={s.label}
                >
                  <span className="visually-hidden">
                    Step {i + 1}: {s.label}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <span className="label-m muted">
            Step {at + 1} of {steps.length}: {step.label}
          </span>
        </nav>
      </header>

      <div className="lp-layout">
        <article className="lp-main">
          <h2 ref={top} tabIndex={-1} className="headline-s lp-step-title">
            {step.kind === "section" ? lesson.sections[step.index].heading : step.label === "Try it" ? module.tryIt.title : stepTitle(step)}
          </h2>

          {step.kind === "overview" && <Overview lesson={lesson} module={module} />}
          {step.kind === "section" && <Section lesson={lesson} index={step.index} route={route} title={module.title} />}
          {step.kind === "example" && (
            <div className="card filled lp-example">
              <p className="title-m">{lesson.example.title}</p>
              <Markdown text={lesson.example.body} />
            </div>
          )}
          {step.kind === "practice" && <Practice lesson={lesson} module={module} route={route} />}
          {step.kind === "check" && <Check lesson={lesson} module={module} />}
          {step.kind === "reflect" && <Reflect lesson={lesson} module={module} route={route} />}
          {step.kind === "done" && <Done module={module} next={next} course={course?.path} last={!!course && !next} />}

          <div className="lp-nav">
            <button type="button" className="btn outlined state" onClick={() => go(at - 1)} disabled={at === 0}>
              <Icon name="arrow_back" />
              Back
            </button>
            {at < steps.length - 1 && (
              <button type="button" className="btn filled state" onClick={() => go(at + 1)} disabled={blocked}>
                {blocked ? `Pass the check to continue` : `Next: ${steps[at + 1].label}`}
                {!blocked && <Icon name="arrow_forward" />}
              </button>
            )}
          </div>
        </article>

        <aside className="lp-side" aria-label="Study companion">
          <div className="card outlined lp-companion">
            <p className="title-m">
              <Icon name="forum" />
              Stuck? Ask the tutor
            </p>
            <p className="body-s muted">It answers from this lesson, right here beside it. Try one of these:</p>
            <ul>
              {lesson.sections.map((s) => (
                <li key={s.heading}>
                  <button
                    type="button"
                    className="lp-suggest state"
                    onClick={() =>
                      askTutor({ question: s.ask, notes: `${s.heading}: ${plain(s.body)}`, source: { title: `${module.title}: ${s.heading}`, route }, fallback: { title: s.heading, body: s.body } })
                    }
                  >
                    {s.ask}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

const guidedCourseTitle = (pathId: string) =>
  ({ student: "Student starter", faculty: "Faculty", researcher: "Research", builder: "Builder" })[pathId] ?? "Course";

function stepTitle(step: Step): string {
  switch (step.kind) {
    case "overview":
      return "What you'll learn";
    case "example":
      return "Worked example";
    case "check":
      return "Check your understanding";
    case "reflect":
      return "Reflect";
    case "done":
      return "Lesson complete";
    default:
      return step.label;
  }
}

function Overview({ lesson, module }: { lesson: GuidedLesson; module: Module }) {
  return (
    <div className="lp-overview">
      <p className="body-l measure">{module.summary}</p>
      <p className="title-s">By the end, you'll be able to:</p>
      <ul className="ideas">
        {lesson.objectives.map((o) => (
          <li key={o} className="body-l">
            {o}
          </li>
        ))}
      </ul>
      <p className="body-m muted measure">
        Read one short section at a time. Ask the tutor about anything unclear, try it yourself, then pass a {CHECK_SIZE}-question check. Questions come
        from a larger bank, so each attempt is different.
      </p>
    </div>
  );
}

function Section({ lesson, index, route, title }: { lesson: GuidedLesson; index: number; route: string; title: string }) {
  const s = lesson.sections[index];
  const source = { title: `${title}: ${s.heading}`, route };
  return (
    <div className="lp-section">
      <div className="lp-reading body-l">
        <Markdown text={s.body} />
      </div>
      <div className="lp-ask">
        <button type="button" className="btn tonal sm state" onClick={() => askTutor({ question: s.ask, notes: `${s.heading}: ${plain(s.body)}`, source, fallback: { title: s.heading, body: s.body } })}>
          <Icon name="forum" />
          Ask: {s.ask}
        </button>
        <button
          type="button"
          className="btn text sm state"
          onClick={() =>
            askTutor({
              question: `Explain “${s.heading}” another way, with an everyday example.`,
              notes: `${s.heading}: ${plain(s.body)}`,
              source,
              fallback: { title: s.heading, body: s.body },
            })
          }
        >
          Explain it another way
        </button>
      </div>
    </div>
  );
}

function Practice({ lesson, module, route }: { lesson: GuidedLesson; module: Module; route: string }) {
  const saved = guidedStore.lesson(module.id);
  return (
    <div className="lp-practice">
      <ol className="lp-practice-steps">
        {module.tryIt.steps.map((s) => (
          <li key={s} className="body-l">
            {s}
          </li>
        ))}
      </ol>
      <p className="body-m">
        <strong>You'll have:</strong> {lesson.deliverable}
      </p>
      <div className="lp-row">
        <label className="lp-check-done body-m">
          <input type="checkbox" checked={saved.practiced} onChange={(e) => guidedStore.updateLesson(module.id, { practiced: e.target.checked })} />
          I did this
        </label>
        <button
          type="button"
          className="btn text sm state"
          onClick={() =>
            askTutor({
              question: `How do I get started on “${module.tryIt.title}”?`,
              notes: `Activity: ${module.tryIt.title}. Steps: ${module.tryIt.steps.join(" ")} Example: ${plain(lesson.example.body)}`,
              source: { title: `${module.title}: try it`, route },
              fallback: { title: lesson.example.title, body: lesson.example.body },
            })
          }
        >
          <Icon name="forum" />
          Get help getting started
        </button>
      </div>
    </div>
  );
}

function Check({ lesson, module }: { lesson: GuidedLesson; module: Module }) {
  const { isDone, toggle } = useProgress();
  const saved = guidedStore.lesson(module.id);
  const [round, setRound] = useState(0);
  const questions = useMemo<DrawnQuestion[]>(
    () => drawCheck(lesson.questions, CHECK_SIZE, { missed: saved.missed, lastDrawn: saved.lastDrawn }),
    // A new draw per round only; not on every progress update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lesson, round],
  );
  const [picked, setPicked] = useState<Record<string, number>>({});
  const answered = questions.filter((q) => picked[q.id] !== undefined);
  const score = questions.filter((q) => picked[q.id] === q.answer).length;
  const finished = answered.length === questions.length;

  useEffect(() => setPicked({}), [round]);

  useEffect(() => {
    if (!finished) return;
    const s = guidedStore.lesson(module.id);
    const wrong = questions.filter((q) => picked[q.id] !== q.answer).map((q) => q.id);
    const right = new Set(questions.filter((q) => picked[q.id] === q.answer).map((q) => q.id));
    const passed = score >= CHECK_PASS;
    guidedStore.updateLesson(module.id, {
      best: Math.max(s.best, score),
      passed: s.passed || passed,
      missed: [...new Set([...s.missed.filter((id) => !right.has(id)), ...wrong])],
      lastDrawn: questions.map((q) => q.id),
    });
    if (passed && !isDone(module.id)) toggle(module.id);
    // Record each finished round once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, round]);

  return (
    <div className="lp-check">
      <p className="body-m muted">
        {CHECK_SIZE} questions, drawn at random from {lesson.questions.length}. Get {CHECK_PASS} right to pass. {saved.missed.length > 0 && "Questions you missed before may come back."}
      </p>
      <ol className="lp-questions">
        {questions.map((q, qi) => {
          const choice = picked[q.id];
          const done = choice !== undefined;
          return (
            <li key={`${round}-${q.id}`} className="card outlined lp-q">
              <fieldset disabled={done}>
                <legend className="title-s">
                  <span className="lp-q-num">{qi + 1}</span>
                  {q.prompt}
                </legend>
                <div className="lp-options">
                  {q.options.map((o, oi) => {
                    const state = !done ? "" : oi === q.answer ? "right" : oi === choice ? "wrong" : "";
                    return (
                      <label key={oi} className={`lp-option state ${state}`}>
                        <input type="radio" name={`${round}-${q.id}`} checked={choice === oi} onChange={() => setPicked((p) => ({ ...p, [q.id]: oi }))} />
                        <span className="body-m">{o}</span>
                        {state === "right" && <Icon name="check_circle" filled size={20} />}
                        {state === "wrong" && <Icon name="cancel" filled size={20} />}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              {done && (
                <p className={`body-m lp-explain ${choice === q.answer ? "right" : "wrong"}`} role="status">
                  <strong>{choice === q.answer ? "Right. " : "Not quite. "}</strong>
                  {q.explain}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {finished && (
        <div className={`card filled lp-result ${score >= CHECK_PASS ? "pass" : ""}`} role="status">
          <WavyProgress value={score / questions.length} label={`${score} of ${questions.length} right`} />
          <p className="title-m">
            {score} of {questions.length} right. {score >= CHECK_PASS ? "Passed. Nice work." : `You need ${CHECK_PASS} to pass.`}
          </p>
          <button type="button" className="btn tonal sm state" onClick={() => setRound((r) => r + 1)}>
            <Icon name="shuffle" />
            {score >= CHECK_PASS ? "Try a new set anyway" : "Try a new set"}
          </button>
        </div>
      )}
    </div>
  );
}

function Reflect({ lesson, module, route }: { lesson: GuidedLesson; module: Module; route: string }) {
  const [text, setText] = useState(() => guidedStore.lesson(module.id).reflection);
  useEffect(() => {
    const t = setTimeout(() => guidedStore.updateLesson(module.id, { reflection: text }), 400);
    return () => clearTimeout(t);
  }, [text, module.id]);
  return (
    <div className="lp-reflect">
      <p className="body-l measure">{lesson.reflect}</p>
      <label htmlFor="lp-reflection" className="visually-hidden">
        Your reflection
      </label>
      <textarea id="lp-reflection" className="lp-textarea body-m" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="A few sentences is plenty. It stays in this browser." />
      <div className="lp-row">
        <span className="body-s muted">Saved in this browser only.</span>
        <button
          type="button"
          className="btn tonal sm state"
          disabled={text.trim().length < 20}
          onClick={() =>
            askTutor({
              question: `Here's my reflection on “${module.title}”: ${text.trim()}`,
              notes: `Lesson: ${module.title}. Objectives: ${lesson.objectives.join(" ")} Reflection question: ${lesson.reflect} Student's reflection: ${text.trim()}`,
              source: { title: `${module.title}: reflection`, route },
              mode: "feedback",
            })
          }
        >
          <Icon name="forum" />
          Get feedback from the tutor
        </button>
      </div>
    </div>
  );
}

function Done({ module, next, course, last }: { module: Module; next?: Module; course?: string; last: boolean }) {
  return (
    <div className="lp-done">
      <p className="body-l measure">
        You've finished “{module.title}”. {last ? "That was the last lesson in this course. The capstone project is next." : ""}
      </p>
      <div className="lp-row">
        {next && course && (
          <Link to={`/learn/path/${course}/${next.id}`} className="btn filled state">
            Next lesson: {next.title}
            <Icon name="arrow_forward" />
          </Link>
        )}
        {last && course && (
          <Link to={`/learn/path/${course}#capstone`} className="btn filled state">
            Go to the capstone
            <Icon name="arrow_forward" />
          </Link>
        )}
        <Link to={course ? `/learn/path/${course}` : `/learn/${module.id}`} className="btn outlined state">
          {course ? "Back to the course" : "Back to the lesson page"}
        </Link>
      </div>
    </div>
  );
}
