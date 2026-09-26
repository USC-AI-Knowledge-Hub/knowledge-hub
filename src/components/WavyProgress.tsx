/**
 * M3 Expressive wavy linear progress. The completed part is a sine wave,
 * the remainder a flat track, separated by a small gap.
 */
export function WavyProgress({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(1, value));
  const width = 240;
  const end = v * width;
  const amp = 3;
  const wl = 20;
  let d = "M0 6";
  for (let x = 0; x <= end; x += 1) d += `L${x} ${(6 + amp * Math.sin((x / wl) * Math.PI * 2)).toFixed(2)}`;
  const gap = v > 0 && v < 1 ? 6 : 0;
  return (
    <svg
      className="wavy"
      viewBox={`0 0 ${width} 12`}
      preserveAspectRatio="none"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      style={{ width: "100%", height: 12, overflow: "visible" }}
    >
      {end + gap < width && (
        <line x1={end + gap} y1="6" x2={width} y2="6" stroke="var(--md-sys-color-secondary-container)" strokeWidth="4" strokeLinecap="round" />
      )}
      {v > 0 && <path d={d} fill="none" stroke="var(--md-sys-color-primary-container)" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}
