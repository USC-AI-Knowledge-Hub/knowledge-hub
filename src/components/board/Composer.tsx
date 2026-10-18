import { useEffect, useId, useState } from "react";
import { Icon } from "../Icon";
import { BODY_MAX, NAME_MAX, problemWith } from "../../lib/board/rules";

/** The box for a new topic or a reply. Remembers the name, says what's wrong before sending. */
export function Composer({
  initialName,
  initialBody = "",
  label,
  submitLabel,
  rows = 4,
  autoFocus,
  askName = true,
  onSubmit,
  onCancel,
}: {
  initialName: string;
  initialBody?: string;
  label: string;
  submitLabel: string;
  rows?: number;
  autoFocus?: boolean;
  /** An edit keeps the original name, so it doesn't ask. */
  askName?: boolean;
  onSubmit: (name: string, body: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const id = useId();
  const [name, setName] = useState(initialName);
  const [body, setBody] = useState(initialBody);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!name && initialName) setName(initialName);
  }, [initialName, name]);

  const submit = async () => {
    const problem = problemWith(askName ? name : "x", body);
    if (problem) return setError(problem);
    setBusy(true);
    setError("");
    try {
      await onSubmit(name, body);
      setBody("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="board-composer"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {askName && (
        <div className="board-field">
          <label htmlFor={`${id}-name`} className="label-l">
            Your name
          </label>
          <input id={`${id}-name`} value={name} maxLength={NAME_MAX} autoComplete="nickname" onChange={(e) => setName(e.target.value)} />
        </div>
      )}
      <div className="board-field">
        <label htmlFor={`${id}-body`} className="label-l">
          {label}
        </label>
        <textarea id={`${id}-body`} rows={rows} value={body} autoFocus={autoFocus} onChange={(e) => setBody(e.target.value)} aria-describedby={`${id}-count`} />
        <span id={`${id}-count`} className="body-s muted board-count" data-over={body.length > BODY_MAX}>
          {body.length} / {BODY_MAX}
        </span>
      </div>
      {error && (
        <p role="alert" className="board-error body-m">
          <Icon name="error" size={18} /> {error}
        </p>
      )}
      <div className="board-actions">
        <button type="submit" className="btn filled sm state" disabled={busy}>
          {busy ? "Sending…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn text sm state" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
