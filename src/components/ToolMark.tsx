import { SHAPES, shapeFor } from "../lib/shapes";
import type { Tool } from "../data/types";

const FILLS = [
  ["var(--md-sys-color-primary-container)", "#fff"],
  ["var(--md-sys-color-tertiary-fixed-dim)", "var(--md-sys-color-on-tertiary-fixed)"],
  ["var(--md-sys-color-secondary-container)", "var(--md-sys-color-on-secondary-container)"],
  ["var(--kh-advanced-container)", "var(--kh-on-advanced-container)"],
  ["var(--kh-beginner-container)", "var(--kh-on-beginner-container)"],
  ["var(--md-sys-color-inverse-surface)", "var(--md-sys-color-inverse-on-surface)"],
] as const;

function fillFor(id: string) {
  let h = 7;
  for (const c of id) h = (h * 17 + c.charCodeAt(0)) >>> 0;
  return FILLS[h % FILLS.length];
}

/** A tool's monogram inside an Expressive shape. Decorative: the name is always shown beside it. */
export function ToolMark({ tool, size = 48 }: { tool: Pick<Tool, "id" | "monogram">; size?: number }) {
  const [bg, fg] = fillFor(tool.id);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ flex: "none" }}>
      <path d={SHAPES[shapeFor(tool.id)]} fill={bg} />
      <text
        x="50"
        y="51"
        textAnchor="middle"
        dominantBaseline="central"
        fill={fg}
        style={{ font: "700 38px var(--kh-font)", fontStretch: "110%", fontVariationSettings: '"ROND" 100' }}
      >
        {tool.monogram}
      </text>
    </svg>
  );
}
