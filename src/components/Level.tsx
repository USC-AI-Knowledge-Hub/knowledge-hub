import { DIFFICULTIES, DIFFICULTY_LABEL, type Difficulty } from "../data/types";

/** Signal-strength bars: the one difficulty glyph used everywhere on the site. */
export function Bars({ level }: { level: Difficulty }) {
  const n = DIFFICULTIES.indexOf(level) + 1;
  return (
    <span className="bars" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <i key={i} className={i <= n ? "on" : ""} />
      ))}
    </span>
  );
}

export function Level({ level }: { level: Difficulty }) {
  return (
    <span className={`level ${level}`}>
      <Bars level={level} />
      {DIFFICULTY_LABEL[level]}
    </span>
  );
}
