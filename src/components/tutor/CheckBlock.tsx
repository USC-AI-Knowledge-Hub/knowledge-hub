import { useRef, useState } from "react";
import { shuffle, type Check } from "../../lib/tutor/quests";
import { Icon } from "../Icon";

/**
 * One multiple-choice check. Options are shuffled each time it mounts.
 *
 * - "quest": pick again after a wrong answer until it's right; `onPass` returns the XP gained.
 * - "review": one try; the right answer and the explanation are shown either way.
 *
 * `onFirstAnswer` fires once, with whether the first attempt was right, for per-question stats.
 */
export function CheckBlock({
  check,
  name,
  spot = false,
  mode = "quest",
  legend,
  passedBefore = false,
  onFirstAnswer,
  onPass,
  onReviewed,
  onAnother,
}: {
  check: Check;
  name: string;
  spot?: boolean;
  mode?: "quest" | "review";
  legend?: string;
  passedBefore?: boolean;
  onFirstAnswer?(correct: boolean): void;
  onPass?(firstTry: boolean): number;
  onReviewed?(correct: boolean): void;
  onAnother?(): void;
}) {
  const [order] = useState(() => shuffle(check.options.length));
  const [choice, setChoice] = useState<number | null>(null);
  const [result, setResult] = useState<"right" | "wrong" | null>(null);
  const [misses, setMisses] = useState(0);
  const [gained, setGained] = useState(0);
  const [done, setDone] = useState(false);
  const feedback = useRef<HTMLDivElement>(null);
  const review = mode === "review";

  const submit = () => {
    if (choice === null) return;
    const correct = choice === check.answer;
    if (misses === 0) onFirstAnswer?.(correct);
    if (review) {
      setResult(correct ? "right" : "wrong");
      setDone(true);
      onReviewed?.(correct);
    } else if (correct) {
      setResult("right");
      setDone(true);
      setGained(onPass?.(misses === 0) ?? 0);
    } else {
      setResult("wrong");
      setMisses((m) => m + 1);
    }
    requestAnimationFrame(() => feedback.current?.focus());
  };

  return (
    <fieldset className={`t-check ${spot ? "spot" : ""}`}>
      <legend className="title-s">{legend ?? (spot ? "Tap the claim that's wrong" : check.question)}</legend>
      <div className="t-check-options">
        {order.map((i) => {
          const picked = choice === i;
          const cls = done && i === check.answer ? "right" : result === "wrong" && picked ? "wrong" : "";
          return (
            <label key={i} className={`t-option state ${picked ? "picked" : ""} ${cls}`}>
              <input
                type="radio"
                name={name}
                checked={picked}
                disabled={done}
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
      {!done && (
        <div className="t-actions">
          <button type="button" className="btn filled sm state" disabled={choice === null || result === "wrong"} onClick={submit}>
            Check answer
          </button>
          {passedBefore && <span className="body-s muted">You've passed this step before.</span>}
        </div>
      )}
      <div ref={feedback} tabIndex={-1} className="t-feedback-wrap" aria-live="polite">
        {result === "wrong" && !review && (
          <p className="t-feedback wrong body-m">
            <Icon name="close" />
            <span>
              <strong>Not quite.</strong> {spot ? "That one checks out. Look again for the claim that doesn't." : "Have another look at the notes, then pick again."}
            </span>
          </p>
        )}
        {result === "wrong" && review && (
          <p className="t-feedback wrong body-m">
            <Icon name="close" />
            <span>
              <strong>Not this time.</strong> The right answer is marked. {check.explain}
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
      {done && onAnother && (
        <div className="t-actions">
          <button type="button" className="btn text sm state" onClick={onAnother}>
            <Icon name="shuffle" />
            Try another question
          </button>
        </div>
      )}
    </fieldset>
  );
}
