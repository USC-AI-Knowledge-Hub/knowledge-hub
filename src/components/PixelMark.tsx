import { useId } from "react";
import { clusterOf } from "../data/toolMap";
import type { Tool } from "../data/types";

/**
 * A tool's monogram as 8-bit pixel art on a little game-cartridge tile, in
 * its map category's color. Our retro stand-in for a logo: we never draw
 * vendor logos. Purely decorative (the name is always shown beside it) and
 * fully deterministic, so it's identical on every load.
 */

/** 5×7 pixel font. Each glyph is seven rows of five columns; "#" is lit. */
const FONT: Record<string, string> = {
  A: ".###.|#...#|#...#|#####|#...#|#...#|#...#",
  B: "####.|#...#|#...#|####.|#...#|#...#|####.",
  C: ".###.|#...#|#....|#....|#....|#...#|.###.",
  D: "####.|#...#|#...#|#...#|#...#|#...#|####.",
  E: "#####|#....|#....|####.|#....|#....|#####",
  F: "#####|#....|#....|####.|#....|#....|#....",
  G: ".###.|#...#|#....|#.###|#...#|#...#|.####",
  H: "#...#|#...#|#...#|#####|#...#|#...#|#...#",
  I: ".###.|..#..|..#..|..#..|..#..|..#..|.###.",
  J: "..###|...#.|...#.|...#.|...#.|#..#.|.##..",
  K: "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#",
  L: "#....|#....|#....|#....|#....|#....|#####",
  M: "#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#",
  N: "#...#|#...#|##..#|#.#.#|#..##|#...#|#...#",
  O: ".###.|#...#|#...#|#...#|#...#|#...#|.###.",
  P: "####.|#...#|#...#|####.|#....|#....|#....",
  Q: ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#",
  R: "####.|#...#|#...#|####.|#.#..|#..#.|#...#",
  S: ".####|#....|#....|.###.|....#|....#|####.",
  T: "#####|..#..|..#..|..#..|..#..|..#..|..#..",
  U: "#...#|#...#|#...#|#...#|#...#|#...#|.###.",
  V: "#...#|#...#|#...#|#...#|#...#|.#.#.|..#..",
  W: "#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.",
  X: "#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
  Y: "#...#|#...#|.#.#.|..#..|..#..|..#..|..#..",
  Z: "#####|....#|...#.|..#..|.#...|#....|#####",
  a: ".....|.....|.###.|....#|.####|#...#|.####",
  b: "#....|#....|#.##.|##..#|#...#|#...#|####.",
  c: ".....|.....|.###.|#....|#....|#...#|.###.",
  d: "....#|....#|.##.#|#..##|#...#|#...#|.####",
  e: ".....|.....|.###.|#...#|#####|#....|.###.",
  f: "..##.|.#..#|.#...|###..|.#...|.#...|.#...",
  g: ".....|.####|#...#|#...#|.####|....#|.###.",
  h: "#....|#....|#.##.|##..#|#...#|#...#|#...#",
  i: "..#..|.....|.##..|..#..|..#..|..#..|.###.",
  j: "...#.|.....|..##.|...#.|...#.|#..#.|.##..",
  k: "#....|#....|#..#.|#.#..|##...|#.#..|#..#.",
  l: ".##..|..#..|..#..|..#..|..#..|..#..|.###.",
  m: ".....|.....|##.#.|#.#.#|#.#.#|#...#|#...#",
  n: ".....|.....|#.##.|##..#|#...#|#...#|#...#",
  o: ".....|.....|.###.|#...#|#...#|#...#|.###.",
  p: ".....|.....|####.|#...#|####.|#....|#....",
  q: ".....|.....|.##.#|#..##|.####|....#|....#",
  r: ".....|.....|#.##.|##..#|#....|#....|#....",
  s: ".....|.....|.###.|#....|.###.|....#|####.",
  t: ".#...|.#...|###..|.#...|.#...|.#..#|..##.",
  u: ".....|.....|#...#|#...#|#...#|#..##|.##.#",
  v: ".....|.....|#...#|#...#|#...#|.#.#.|..#..",
  w: ".....|.....|#...#|#...#|#.#.#|#.#.#|.#.#.",
  x: ".....|.....|#...#|.#.#.|..#..|.#.#.|#...#",
  y: ".....|.....|#...#|#...#|.####|....#|.###.",
  z: ".....|.....|#####|...#.|..#..|.#...|#####",
  "0": ".###.|#...#|#..##|#.#.#|##..#|#...#|.###.",
  "1": "..#..|.##..|..#..|..#..|..#..|..#..|.###.",
  "2": ".###.|#...#|....#|...#.|..#..|.#...|#####",
  "3": "####.|....#|....#|.###.|....#|....#|####.",
  "4": "...#.|..##.|.#.#.|#..#.|#####|...#.|...#.",
  "5": "#####|#....|####.|....#|....#|#...#|.###.",
  "6": "..##.|.#...|#....|####.|#...#|#...#|.###.",
  "7": "#####|....#|...#.|..#..|.#...|.#...|.#...",
  "8": ".###.|#...#|#...#|.###.|#...#|#...#|.###.",
  "9": ".###.|#...#|#...#|.####|....#|...#.|.##..",
};

/** Tile grid: 16×16 "pixels". The screen window is x 1–14, y 1–10. */
const GRID = 16;

/** Lit pixels for a monogram, centered in the screen window. */
export function monogramPixels(monogram: string): [number, number][] {
  const chars = [...monogram].filter((c) => FONT[c]).slice(0, 2);
  const width = chars.length * 6 - 1;
  const x0 = 1 + Math.floor((14 - width) / 2);
  const out: [number, number][] = [];
  chars.forEach((c, n) => {
    FONT[c].split("|").forEach((row, y) => {
      [...row].forEach((bit, x) => {
        if (bit === "#") out.push([x0 + n * 6 + x, 2 + y]);
      });
    });
  });
  return out;
}

/** Cartridge outline, as rows of [x, width]: notched corners and a shoulder cut near the bottom. */
const BODY: [number, number, number][] = [
  // [y, x, width]
  [0, 1, 14],
  ...Array.from({ length: 11 }, (_, i) => [i + 1, 0, 16] as [number, number, number]),
  [12, 1, 14],
  [13, 1, 14],
  [14, 1, 14],
  [15, 2, 12],
];

export function PixelMark({ tool, size = 48, className = "" }: { tool: Pick<Tool, "id" | "monogram">; size?: number; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const cat = clusterOf[tool.id] ?? "assistants";
  const lit = monogramPixels(tool.monogram);
  const litSet = new Set(lit.map(([x, y]) => `${x},${y}`));
  // A hard drop shadow one pixel down and right, drawn as a 1-bit checkerboard dither.
  const shadow = lit.map(([x, y]) => [x + 1, y + 1] as [number, number]).filter(([x, y]) => !litSet.has(`${x},${y}`) && x < 15 && y < 11);

  const body = `var(--kh-cat-${cat})`;
  const screen = `var(--kh-cat-${cat}-container)`;
  const ink = `var(--kh-on-cat-${cat}-container)`;

  return (
    <svg
      className={`pixel-mark ${className}`}
      width={size}
      height={size}
      viewBox={`0 0 ${GRID} ${GRID}`}
      aria-hidden="true"
      shapeRendering="crispEdges"
      style={{ flex: "none" }}
    >
      <defs>
        <pattern id={`d${uid}`} width="1" height="1" patternUnits="userSpaceOnUse">
          <rect width="0.5" height="0.5" fill={body} />
          <rect x="0.5" y="0.5" width="0.5" height="0.5" fill={body} />
        </pattern>
        <pattern id={`s${uid}`} width="1" height="1" patternUnits="userSpaceOnUse">
          <rect y="0.5" width="1" height="0.5" fill={ink} opacity="0.07" />
        </pattern>
      </defs>
      {BODY.map(([y, x, w]) => (
        <rect key={y} x={x} y={y} width={w} height={1} fill={body} />
      ))}
      {/* Screen window with a one-pixel darker bezel line at the top. */}
      <rect x={1} y={1} width={14} height={10} fill={screen} />
      <rect x={1} y={1} width={14} height={1} fill={ink} opacity={0.1} />
      {shadow.map(([x, y]) => (
        <rect key={`s${x},${y}`} x={x} y={y} width={1} height={1} fill={`url(#d${uid})`} />
      ))}
      {lit.map(([x, y]) => (
        <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} fill={ink} />
      ))}
      <rect x={1} y={1} width={14} height={10} fill={`url(#s${uid})`} />
      {/* Cartridge grip ridges and a power light. */}
      <rect x={3} y={12} width={7} height={1} fill={screen} opacity={0.45} />
      <rect x={3} y={14} width={7} height={1} fill={screen} opacity={0.45} />
      <rect x={12} y={12} width={2} height={2} fill="var(--md-sys-color-tertiary-fixed-dim)" />
    </svg>
  );
}
