import { useState } from "react";
import { WavyProgress } from "../WavyProgress";
import { Icon } from "../Icon";
import { UNLOCK_AFTER, XP_REVIEW, XP_REVIEW_BONUS, levels, quests, type Level } from "../../lib/tutor/quests";
import { modelById, mbLabel } from "../../lib/tutor/registry";
import { REVIEW_SIZE, reviewPool } from "../../lib/tutor/review";
import {
  levelDone,
  levelNeeds,
  levelUnlocked,
  liveStreak,
  questProgress,
  questUnlocked,
  today,
  useModelChoice,
  useQuestState,
} from "../../lib/tutor/storage";
import { ReviewView } from "./ReviewView";
import { useTutor, type Action } from "./context";
import { Badge, Ring } from "./Shapes";
import type { PageContext } from "./TutorApp";

function ModelCard() {
  const { engine, setView } = useTutor();
  const choice = useModelChoice();
  const { phase } = engine;

  if (phase.name === "loading" || phase.name === "compiling") {
    const pct = phase.name === "loading" ? phase.loaded / Math.max(1, phase.total) : 1;
    return (
      <button type="button" className="t-model-slim state" onClick={() => setView({ name: "setup" })}>
        <span className="grow">
          <span className="label-l">{phase.name === "compiling" ? "Getting the model ready" : phase.fromCache ? "Loading the model from this device" : "Downloading the model"}</span>
          <WavyProgress value={pct} label="Model download progress" />
        </span>
        <Icon name="chevron_right" />
      </button>
    );
  }
  if (phase.name === "ready") return null;

  if (phase.name === "error" || (phase.name === "off" && phase.missing)) {
    return (
      <div className="t-model-card warn">
        <p className="title-s">{phase.name === "error" ? "The model didn't load" : "Your downloaded model is gone"}</p>
        <p className="body-m">
          {phase.name === "error" ? phase.message : "Your browser cleared its saved copy. Quests and navigation still work; download again to chat."}
        </p>
        <div className="t-actions">
          <button type="button" className="btn tonal sm state" onClick={() => setView({ name: "setup" })}>
            {phase.name === "error" ? "See options" : "Download again"}
          </button>
        </div>
      </div>
    );
  }

  if (choice.status === "declined") {
    return (
      <button type="button" className="t-model-slim state" onClick={() => setView({ name: "setup" })}>
        <Icon name="menu_book" />
        <span className="grow body-m">
          <span className="label-l">Reading mode.</span> Quests, navigation and the tool finder work. Download a model to chat.
        </span>
        <Icon name="chevron_right" />
      </button>
    );
  }

  const m = modelById.get(engine.suggested)!;
  const v = m.variants[engine.capability?.device ?? "webgpu"] ?? Object.values(m.variants)[0]!;
  return (
    <div className="t-model-card">
      <p className="title-m">Want answers in conversation?</p>
      <p className="body-m">
        Everything here works as it is. Add a small language model ({mbLabel(v.mb)}) and the tutor explains things in its own words and takes follow-up
        questions. It runs on your device: nothing you type leaves your browser.
      </p>
      <div className="t-actions">
        <button type="button" className="btn filled sm state" onClick={() => setView({ name: "setup" })}>
          <Icon name="download" />
          Choose a model
        </button>
        <button type="button" className="btn text sm state" onClick={engine.decline}>
          Not now
        </button>
      </div>
    </div>
  );
}

function Progress() {
  const s = useQuestState();
  const streak = liveStreak(s.streak);
  return (
    <div className="t-progress">
      <div className="t-stats">
        <p className="t-xp">
          <span className="t-xp-num">{s.xp}</span>
          <span className="label-l">XP</span>
        </p>
        <p className="label-l t-streak">
          <Icon name="local_fire_department" filled={streak > 0} size={20} />
          {streak === 0 ? "Start a streak today" : streak === 1 ? "1-day streak" : `${streak}-day streak`}
        </p>
      </div>
      <ul className="t-shelf" aria-label={`Badges: ${s.badges.length} of ${quests.length} earned`}>
        {quests.map((q) => {
          const earned = s.badges.includes(q.id);
          return (
            <li key={q.id} title={`${q.title}${earned ? "" : " (not earned yet)"}`}>
              <Badge shape={q.shape} icon={q.icon} earned={earned} size={30} />
              <span className="visually-hidden">
                {q.title}: {earned ? "earned" : "not earned yet"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ReviewCard({ onStart }: { onStart(): void }) {
  const s = useQuestState();
  const ready = reviewPool(s).length > 0;
  const xpToday = s.reviewDay !== today();
  return (
    <div className={`t-review-card ${ready ? "" : "empty"}`}>
      <span className="t-review-icon" aria-hidden="true">
        <Icon name="replay" />
      </span>
      <div className="grow">
        <p className="title-s">Daily review</p>
        <p className="body-s muted">
          {ready
            ? `${REVIEW_SIZE} mixed questions from quests you've finished, with more of the ones you missed. ${
                xpToday ? `Up to ${REVIEW_SIZE * XP_REVIEW + XP_REVIEW_BONUS} XP today.` : "Today's review XP is earned; keep practising."
              }`
            : "Finish your first quest and its questions show up here for review."}
        </p>
      </div>
      {ready && (
        <button type="button" className="btn tonal sm state" onClick={onStart}>
          Start review
        </button>
      )}
    </div>
  );
}

function LevelBlock({ level }: { level: Level }) {
  const s = useQuestState();
  const { setView } = useTutor();
  const open = levelUnlocked(s, level.n);
  const done = levelDone(s, level);
  const needs = levelNeeds(s, level.n);
  const complete = done === level.quests.length;
  const id = `t-level-${level.n}`;
  return (
    <li className={`t-level ${open ? "open" : "locked"} ${complete ? "complete" : ""}`} aria-labelledby={id}>
      <div className="t-level-head">
        <span className="t-level-num" aria-hidden="true">
          {complete ? <Icon name="check" size={20} /> : open ? level.n : <Icon name="lock" size={18} />}
        </span>
        <div className="grow">
          <h4 id={id} className="title-m">
            <span className="visually-hidden">Level {level.n}: </span>
            {level.title}
          </h4>
          <p className="body-s muted">
            {open
              ? `Level ${level.n} · ${done} of ${level.quests.length} quests done`
              : `Level ${level.n} · opens after ${UNLOCK_AFTER} quests in level ${level.n - 1} (${needs} to go). Tap a quest to peek.`}
          </p>
        </div>
      </div>
      <ul className="t-quests">
        {level.quests.map((q) => {
          const { done: stepsDone, total } = questProgress(s, q.id);
          const earned = s.badges.includes(q.id);
          const unlocked = questUnlocked(s, q.id);
          return (
            <li key={q.id}>
              <button type="button" className={`t-quest state ${unlocked ? "" : "peek"}`} onClick={() => setView({ name: "quest", quest: q.id })}>
                <Ring value={stepsDone / total} shape={q.shape} icon={q.icon} earned={earned} />
                <span className="title-s">{q.title}</span>
                <span className="body-s muted">
                  {!unlocked ? `Peek · ${total} steps` : earned ? "Badge earned" : stepsDone ? `${stepsDone} of ${total} steps` : `${total} steps`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

function Path({ onReview }: { onReview(): void }) {
  return (
    <>
      <Progress />
      <ReviewCard onStart={onReview} />
      <ol className="t-path">
        {levels.map((l) => (
          <LevelBlock key={l.n} level={l} />
        ))}
      </ol>
    </>
  );
}

function Chip({ action, label, icon }: { action: Action; label: string; icon: string }) {
  const { act } = useTutor();
  return (
    <button type="button" className="chip state t-chip" onClick={() => act(action, label)}>
      <Icon name={icon} />
      {label}
    </button>
  );
}

export function Home({ page }: { page: PageContext }) {
  const { send, items, setView } = useTutor();
  const [reviewing, setReviewing] = useState(false);
  if (reviewing) return <ReviewView onExit={() => setReviewing(false)} />;
  return (
    <div className="t-home">
      <section className="t-hello">
        <h3 className="headline-s">What do you want to understand today?</h3>
        <p className="body-m muted">Take a quest, ask a question, or ask me to find something on this site.</p>
      </section>

      <ModelCard />

      {page && (
        <section className="t-section" aria-labelledby="t-onpage">
          <h3 id="t-onpage" className="title-s">
            On this page
          </h3>
          <div className="chip-row">
            {page.kind === "lesson" && (
              <>
                <Chip action={{ type: "quiz", module: page.id }} label="Quiz me on this lesson" icon="quiz" />
                <Chip action={{ type: "simpler", module: page.id }} label="Explain this more simply" icon="lightbulb" />
              </>
            )}
            {page.kind === "tool" && <Chip action={{ type: "toolWhen", tool: page.id }} label="When should I use this tool?" icon="help" />}
            {page.kind === "path" && <Chip action={{ type: "next" }} label="What's next on this path?" icon="route" />}
            {(page.kind === "tools" || page.kind === "tool") && <Chip action={{ type: "toolAsk" }} label="Which tool for…?" icon="handyman" />}
          </div>
        </section>
      )}

      <section className="t-section" aria-labelledby="t-quests">
        <div className="t-section-head">
          <h3 id="t-quests" className="title-s">
            Training path
          </h3>
          <span className="body-s muted">
            Short quests with checks, in three levels. Finish {UNLOCK_AFTER} quests in a level to open the next. Earn XP and badges.
          </span>
        </div>
        <Path onReview={() => setReviewing(true)} />
      </section>

      <section className="t-section" aria-labelledby="t-find">
        <h3 id="t-find" className="title-s">
          Find your way
        </h3>
        <div className="chip-row">
          {items.length > 0 && (
            <button type="button" className="chip state t-chip" onClick={() => setView({ name: "chat" })}>
              <Icon name="forum" />
              Back to the conversation
            </button>
          )}
          <Chip action={{ type: "next" }} label="What should I learn next?" icon="school" />
          <Chip action={{ type: "path" }} label="Pick a path for me" icon="route" />
          {page?.kind !== "tools" && page?.kind !== "tool" && <Chip action={{ type: "toolAsk" }} label="Which tool for…?" icon="handyman" />}
          <button type="button" className="chip state t-chip" onClick={() => send("Take me to the full courses")}>
            <Icon name="video_library" />
            Take me to the courses
          </button>
        </div>
      </section>
    </div>
  );
}
