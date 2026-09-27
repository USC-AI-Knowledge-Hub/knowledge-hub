import { memo } from "react";
import { PIXEL_LOGOS } from "../data/pixelLogos";
import type { Tool } from "../data/types";
import "../styles/map.css";

/**
 * A tool's logo as 8-bit pixel art on a small retro tile: a stepped-corner
 * square with a one-pixel ink outline and a hard pixel drop shadow.
 * Decorative (the name is always shown beside it) and identical on every load.
 */

/** Tile rows as [x0, x1] spans: the corners step in by two, then one. */
const TILE: [number, number][] = [[2, 13], [1, 14], ...Array.from({ length: 12 }, () => [0, 15] as [number, number]), [1, 14], [2, 13]];

interface Run {
  x: number;
  y: number;
  w: number;
  fill: string;
}

/** Merge each row's same-colored neighbors into one rect: fewer nodes, no hairline seams. */
function runs(grid: string[], palette: Record<string, string>): Run[] {
  const out: Run[] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const c = row[x];
      if (c === ".") {
        x++;
        continue;
      }
      let w = 1;
      while (row[x + w] === c) w++;
      out.push({ x, y, w, fill: palette[c] });
      x += w;
    }
  });
  return out;
}

const cache = new Map<string, Run[]>();
function logoRuns(id: string): Run[] {
  let r = cache.get(id);
  if (!r) {
    const logo = PIXEL_LOGOS[id];
    r = logo ? runs(logo.grid, logo.palette) : [];
    cache.set(id, r);
  }
  return r;
}

/**
 * Pixels stay square only at whole (or half) pixel sizes, so the art snaps
 * to the largest crisp size that fits and is centered in the box.
 */
export function pixelUnit(size: number) {
  return size >= 32 ? Math.floor(size / 16) : Math.max(1, Math.floor(size / 8) / 2);
}

export const PixelMark = memo(function PixelMark({
  tool,
  size = 48,
  className = "",
}: {
  tool: Pick<Tool, "id" | "monogram">;
  size?: number;
  className?: string;
}) {
  const unit = pixelUnit(size);
  const pad = (size / unit - 16) / 2;
  const logo = PIXEL_LOGOS[tool.id];
  const shadow = Math.max(1, Math.round(unit / 2));
  return (
    <svg
      className={`pixel-mark ${className}`}
      width={size}
      height={size}
      viewBox={`${-pad} ${-pad} ${16 + pad * 2} ${16 + pad * 2}`}
      aria-hidden="true"
      shapeRendering="crispEdges"
      style={{ flex: "none", ["--px-shadow" as string]: `${shadow}px` }}
    >
      {TILE.map(([a, b], y) => (
        <rect key={`t${y}`} x={a} y={y} width={b - a + 1} height={1} className="px-ink" />
      ))}
      {TILE.slice(1, -1).map(([a, b], i) => (
        <rect key={`f${i}`} x={a + 1} y={i + 1} width={b - a - 1} height={1} className="px-tile" />
      ))}
      {logo ? (
        logoRuns(tool.id).map((r) => <rect key={`${r.x},${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />)
      ) : (
        // Unknown tool: its monogram's first letter as a plain block, so nothing breaks.
        <text x="8" y="11.5" textAnchor="middle" className="px-fallback">
          {tool.monogram.slice(0, 1)}
        </text>
      )}
    </svg>
  );
});
