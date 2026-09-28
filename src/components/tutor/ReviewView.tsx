import { useEffect, useRef, useState } from "react";
import { XP_REVIEW, XP_REVIEW_BONUS, questById } from "../../lib/tutor/quests";
import { pickReview, reviewSource, type ReviewItem } from "../../lib/tutor/review";
import { questStore, recordAnswer, recordReview, today, useQuestState } from "../../lib/tutor/storage";
import { Icon } from "../Icon";
import { CheckBlock } from "./CheckBlock";
import { useTutor } from "./context";

/**
 * Daily review: five questions from finished quests, weighted toward ones
 * missed before. One try per question; the answer and explanation show
 * either way. Lives inside Home, so it needs no view of its own.
 */
export function ReviewView({ onExit }: { onExit(): void }) {
  const [items, setItems] = useState<ReviewItem[]>(() => pickReview(questStore.get()));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [summary, setSummary] = useState<{ right: number; gained: number } | null>(null);
  const [round, setRound] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const s = useQuestState();
  const { setView } = useTutor();

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "nearest" });
  }, [index, summary, round]);

  const restart = () => {
    setItems(pickReview(questStore.get()));
    setIndex(0);
    setAnswers([]);
    setSummary(null);
    setRound((r) => r + 1);
  };

  const back = (
    <button type="button" className="btn text sm state t-review-back" onClick={onExit}>
      <Icon name="arrow_back" />
      Back to the path
    </button>
  );

  if (!items.length)
    return (
      <div className="t-review">
        {back}
        <h3 ref={heading} tabIndex={-1} className="headline-s">
          Nothing to review yet
        </h3>
        <p className="body-m muted">Finish a quest and its questions show up here.</p>
      </div>
    );

  if (summary) {
    const missed = items.filter((_, i) => answers[i] === false);
    return (
      <div className="t-review">
        {back}
        <div className="t-review-score">
          <p className="t-xp-num" aria-hidden="true">
            {summary.right}/{items.length}
          </p>
          <h3 ref={heading} tabIndex={-1} className="headline-s">
            {summary.right === items.length ? "All correct" : `${summary.right} of ${items.length} correct`}
          </h3>
          <p className="body-m muted">
            {summary.gained > 0
              ? `+${summary.gained} XP, and your streak is safe for today.`
              : "You've already earned today's review XP. Practice still counts toward what comes up next time."}
          </p>
        </div>
        {missed.length > 0 && (
          <div className="t-section">
            <h4 className="title-s">To go over again</h4>
            <p className="body-s muted">These come up more often in your next reviews until you get them right.</p>
            <ul className="t-review-missed">
              {missed.map((m) => (
                <li key={m.qid}>
                  <button type="button" className="t-model-slim state" onClick={() => setView({ name: "quest", quest: m.questId })}>
                    <Icon name="replay" />
                    <span className="grow body-m">{reviewSource(m)}</span>
                    <Icon name="chevron_right" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="t-actions">
          <button type="button" className="btn filled sm state" onClick={restart}>
            <Icon name="shuffle" />
            Another review
          </button>
          <button type="button" className="btn text sm state" onClick={onExit}>
            Done
          </button>
        </div>
      </div>
    );
  }

  const item = items[index];
  const answered = answers[index] !== undefined;
  const last = index === items.length - 1;
  const quest = questById.get(item.questId)!;
  const xpToday = s.reviewDay !== today();

  return (
    <div className="t-review">
      {back}
      <div className="t-quest-top">
        <p className="headline-s">Daily review</p>
        <ol className="t-steps" aria-label={`Question ${index + 1} of ${items.length}`}>
          {items.map((it, i) => (
            <li key={it.qid} className={`${answers[i] === true ? "passed" : answers[i] === false ? "missed" : ""} ${i === index ? "current" : ""}`} />
          ))}
        </ol>
      </div>
      <h4 ref={heading} tabIndex={-1} className="title-l t-step-title">
        <span className="label-l muted">
          Question {index + 1} of {items.length}
        </span>
        <span className="t-review-from body-m">{reviewSource(item)}</span>
      </h4>
      {item.prompt && (
        <>
          <div className="t-msg user">
            <p className="t-bubble body-m">{item.prompt}</p>
          </div>
          <p className="body-s muted t-spot-intro">
            <Icon name="smart_toy" size={16} /> An AI assistant answered with four claims. One of them is wrong.
          </p>
        </>
      )}
      <CheckBlock
        key={`${round}-${item.qid}`}
        check={item.check}
        name={`review-${round}-${index}`}
        mode="review"
        spot={!!item.prompt}
        onFirstAnswer={(correct) => recordAnswer(item.qid, correct)}
        onReviewed={(correct) => setAnswers((a) => Object.assign([...a], { [index]: correct }))}
      />
      <nav className="t-step-nav" aria-label="Review questions">
        <span className="body-s muted">
          <Icon name={quest.icon} size={16} /> {xpToday ? `Up to ${items.length * XP_REVIEW + XP_REVIEW_BONUS} XP today` : "Practice round"}
        </span>
        <button
          type="button"
          className={`btn sm state ${answered ? "filled" : "outlined"}`}
          disabled={!answered}
          onClick={() => {
            if (!last) return setIndex(index + 1);
            const right = answers.filter(Boolean).length;
            setSummary({ right, gained: recordReview(right) });
          }}
        >
          {last ? "See results" : "Next question"}
          <Icon name={last ? "flag" : "arrow_forward"} />
        </button>
      </nav>
    </div>
  );
}
