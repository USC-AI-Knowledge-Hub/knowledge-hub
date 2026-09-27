import { useSyncExternalStore } from "react";
import { SHAPES, type ShapeName } from "../../lib/shapes";
import { Icon } from "../Icon";

const reducedQuery = typeof matchMedia === "undefined" ? null : matchMedia("(prefers-reduced-motion: reduce)");
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => {
      reducedQuery?.addEventListener("change", cb);
      return () => reducedQuery?.removeEventListener("change", cb);
    },
    () => !!reducedQuery?.matches,
  );
}

// Every shape in shapes.ts is sampled at the same 180 points, so SMIL can
// interpolate between them: the M3 Expressive morphing loading indicator.
const MORPH = (["cookie9", "clover4", "sunny", "cookie6", "soft12", "cookie9"] as ShapeName[]).map((s) => SHAPES[s]).join(";");

/**
 * The tutor's mark: a shape that morphs while it thinks. Decorative, so it's
 * hidden from assistive tech; callers announce state in text.
 */
export function Orb({ size = 40, thinking = false, className = "" }: { size?: number; thinking?: boolean; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <svg className={`orb ${thinking ? "thinking" : ""} ${className}`} width={size} height={size} viewBox="-4 -4 108 108" aria-hidden="true">
      <path d={SHAPES.cookie9} className="orb-shape">
        {thinking && !reduced && <animate attributeName="d" dur="3.2s" repeatCount="indefinite" values={MORPH} />}
      </path>
      <circle cx="50" cy="50" r="13" className="orb-core" />
    </svg>
  );
}

/** A quest badge: its shape and icon, filled gold when earned. */
export function Badge({ shape, icon, earned, size = 44 }: { shape: ShapeName; icon: string; earned: boolean; size?: number }) {
  return (
    <span className={`badge ${earned ? "earned" : ""}`} style={{ width: size, height: size }}>
      <svg viewBox="-3 -3 106 106" aria-hidden="true">
        <path d={SHAPES[shape]} />
      </svg>
      <Icon name={icon} filled={earned} size={Math.round(size * 0.46)} />
    </span>
  );
}

/** A progress ring around a quest's badge. */
export function Ring({ value, shape, icon, earned }: { value: number; shape: ShapeName; icon: string; earned: boolean }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <span className="ring" aria-hidden="true">
      <svg viewBox="0 0 68 68">
        <circle cx="34" cy="34" r={r} className="ring-track" />
        {v > 0 && <circle cx="34" cy="34" r={r} className="ring-fill" strokeDasharray={`${c * v} ${c}`} transform="rotate(-90 34 34)" />}
      </svg>
      <Badge shape={shape} icon={icon} earned={earned} size={44} />
    </span>
  );
}
