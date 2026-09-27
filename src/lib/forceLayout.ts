/**
 * A small deterministic force layout for the tool map. No randomness and a
 * fixed number of ticks, so the map is identical on every load and never
 * jitters. Nodes are boxes (the mark plus its name), so collision is
 * box-against-box rather than circles.
 */
import { clusterOf, clusters, type ClusterId } from "../data/toolMap";
import { tools } from "../data/tools";

export interface LayoutNode {
  id: string;
  group: string;
  w: number;
  h: number;
}

export interface LayoutGroup {
  id: string;
  x: number;
  y: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface LayoutOptions {
  /** Simulation steps. More is smoother, not different in kind. */
  ticks?: number;
  /** Empty space kept between any two boxes. */
  gap?: number;
  /** Extra space kept between boxes of different groups, so clusters read as separate. */
  groupGap?: number;
}

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

export function forceLayout(nodes: LayoutNode[], groups: LayoutGroup[], opts: LayoutOptions = {}): Map<string, Point> {
  const { ticks = 320, gap = 8, groupGap = 64 } = opts;
  const center = new Map(groups.map((g) => [g.id, g]));
  const seen = new Map<string, number>();

  // Start each node on a sunflower spiral around its group's center.
  const p = nodes.map((n) => {
    const g = center.get(n.group);
    if (!g) throw new Error(`Unknown group "${n.group}" for node "${n.id}"`);
    const i = seen.get(n.group) ?? 0;
    seen.set(n.group, i + 1);
    const r = 70 * Math.sqrt(i);
    return { x: g.x + r * Math.cos(i * GOLDEN), y: g.y + r * Math.sin(i * GOLDEN), vx: 0, vy: 0 };
  });

  const separate = (strength: number) => {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const pad = a.group === b.group ? gap : groupGap;
        const hw = (a.w + b.w) / 2 + pad;
        const hh = (a.h + b.h) / 2 + pad;
        let dx = p[j].x - p[i].x;
        let dy = p[j].y - p[i].y;
        if (Math.abs(dx) >= hw || Math.abs(dy) >= hh) continue;
        let dist = Math.hypot(dx, dy);
        if (dist < 1e-6) {
          // Exactly stacked: split them along a fixed, index-based angle. Never random.
          dx = Math.cos(i + j);
          dy = Math.sin(i + j);
          dist = 0;
        }
        const len = Math.hypot(dx, dy);
        const ux = dx / len;
        const uy = dy / len;
        // Push along the line between centers, just far enough for the boxes to clear.
        // Moving apart along the real direction packs groups into round blobs rather than rows.
        const clear = Math.min(Math.abs(ux) > 1e-9 ? hw / Math.abs(ux) : Infinity, Math.abs(uy) > 1e-9 ? hh / Math.abs(uy) : Infinity);
        const s = (clear - dist) * 0.5 * strength;
        p[i].x -= ux * s;
        p[i].y -= uy * s;
        p[j].x += ux * s;
        p[j].y += uy * s;
      }
    }
  };

  for (let t = 0; t < ticks; t++) {
    const alpha = 1 - t / ticks;
    // Pull toward the group center. It never fades fully, so groups pack into round blobs, not lines.
    const pull = 0.04 * Math.max(alpha, 0.35);
    nodes.forEach((n, i) => {
      const g = center.get(n.group)!;
      p[i].vx += (g.x - p[i].x) * pull;
      p[i].vy += (g.y - p[i].y) * pull;
    });
    // Mild repulsion between different groups, so neighbors lean away from each other.
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].group === nodes[j].group) continue;
        const dx = p[j].x - p[i].x;
        const dy = p[j].y - p[i].y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 300 * 300 || d2 === 0) continue;
        const f = (900 * alpha) / d2;
        p[i].vx -= dx * f;
        p[i].vy -= dy * f;
        p[j].vx += dx * f;
        p[j].vy += dy * f;
      }
    }
    for (const q of p) {
      q.vx *= 0.6;
      q.vy *= 0.6;
      q.x += q.vx;
      q.y += q.vy;
    }
    separate(0.7);
  }
  // Settle: collisions only, until nothing overlaps.
  for (let t = 0; t < 200; t++) separate(1);

  return new Map(nodes.map((n, i) => [n.id, { x: Math.round(p[i].x * 10) / 10, y: Math.round(p[i].y * 10) / 10 }]));
}

/* ── The tool map's own layout ─────────────────────────────────────────── */

/** Node box on the map: the pixel mark on top, the name (up to two lines) below. */
export const NODE_W = 128;
export const NODE_H = 100;
/** Room around the outermost nodes for halos and cluster labels. */
export const MARGIN = 110;
const SPREAD = { w: 1600, h: 1040 };

/**
 * Where each cluster sits. General assistants in the middle, because most
 * links point at them; the rest on an ellipse around it, with the clusters
 * that link to the assistants (code, research, study) placed closest.
 */
const ANGLE: Record<ClusterId, number> = {
  code: 0,
  media: 58,
  automate: 122,
  research: 180,
  study: 238,
  create: 302,
  assistants: 0,
};

export function clusterCenters(): Map<ClusterId, Point> {
  const cx = SPREAD.w / 2;
  const cy = SPREAD.h / 2;
  return new Map(
    clusters.map((c) => {
      if (c.id === "assistants") return [c.id, { x: cx, y: cy }];
      const a = (ANGLE[c.id] * Math.PI) / 180;
      return [c.id, { x: cx + 440 * Math.cos(a), y: cy + 250 * Math.sin(a) }];
    }),
  );
}

export interface ToolMapLayout {
  nodes: Map<string, Point>;
  centers: Map<ClusterId, Point>;
  /** World size in layout units; positions run from 0 to this. */
  world: { w: number; h: number };
}

let cached: ToolMapLayout | null = null;

/** Positions for every tool on the map (box centers, in world units). Computed once. */
export function toolMapLayout(): ToolMapLayout {
  if (cached) return cached;
  const centers = clusterCenters();
  const nodes = forceLayout(
    tools.map((t) => ({ id: t.id, group: clusterOf[t.id], w: NODE_W, h: NODE_H })),
    [...centers].map(([id, c]) => ({ id, ...c })),
  );
  // Shift everything so the nodes' bounding box starts at MARGIN.
  const xs = [...nodes.values()].map((p) => p.x);
  const ys = [...nodes.values()].map((p) => p.y);
  const dx = MARGIN + NODE_W / 2 - Math.min(...xs);
  const dy = MARGIN + NODE_H / 2 - Math.min(...ys);
  const shift = (p: Point) => ({ x: p.x + dx, y: p.y + dy });
  cached = {
    nodes: new Map([...nodes].map(([id, p]) => [id, shift(p)])),
    centers: new Map([...centers].map(([id, p]) => [id, shift(p)])),
    world: {
      w: Math.max(...xs) - Math.min(...xs) + NODE_W + MARGIN * 2,
      h: Math.max(...ys) - Math.min(...ys) + NODE_H + MARGIN * 2,
    },
  };
  return cached;
}
