/**
 * Material 3 Expressive shape library, approximated: scalloped "cookies",
 * clovers and soft bursts. Used for tool monograms and path badges so the
 * catalog has a visual identity without borrowing vendor logos.
 */

function wavePath(lobes: number, depth: number, rotate = 0, samples = 180): string {
  const pts: string[] = [];
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * Math.PI * 2;
    const r = 50 * (1 - depth + depth * (0.5 + 0.5 * Math.cos(lobes * (t + rotate))));
    pts.push(`${(50 + r * Math.cos(t)).toFixed(2)} ${(50 + r * Math.sin(t)).toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

export const SHAPES = {
  cookie4: wavePath(4, 0.14, Math.PI / 4),
  cookie6: wavePath(6, 0.12),
  cookie9: wavePath(9, 0.1),
  clover4: wavePath(4, 0.3, Math.PI / 4),
  sunny: wavePath(8, 0.08),
  soft12: wavePath(12, 0.06),
  circle: "M50 0a50 50 0 1 1 0 100a50 50 0 1 1 0-100Z",
} as const;

export type ShapeName = keyof typeof SHAPES;

const ORDER: ShapeName[] = ["cookie9", "clover4", "cookie6", "sunny", "cookie4", "soft12"];

export function shapeFor(key: string): ShapeName {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ORDER[h % ORDER.length];
}
