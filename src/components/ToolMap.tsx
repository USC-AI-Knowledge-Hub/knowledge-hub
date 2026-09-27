/**
 * The AI tool map: every tool as a node, grouped into category clusters with
 * a colored glow behind each, and lines for "runs on" / "lets you pick".
 *
 * Layout comes from a deterministic force simulation (src/lib/forceLayout),
 * computed once. Pan and zoom write a CSS transform straight to the world
 * layer through a ref, so dragging never re-renders React. Nodes are real
 * buttons in cluster order, so the map works from the keyboard.
 */
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from "react";
import { clusterById, clusterOf, clusters, links, type ClusterId, type ToolLink } from "../data/toolMap";
import { toolById, tools } from "../data/tools";
import { NODE_H, NODE_W, toolMapLayout, type Point } from "../lib/forceLayout";
import { Icon } from "./Icon";
import { PixelMark } from "./PixelMark";
import "../styles/map.css";

interface View {
  x: number;
  y: number;
  k: number;
}

export interface ToolMapHandle {
  /** Animate to fit these tools (or everything). */
  fit: (ids?: string[]) => void;
}

const MIN_K = 0.3;
const MAX_K = 2.4;
/** Mark center, relative to the node box center. */
const MARK_DY = -NODE_H / 2 + 4 + 24;

const reduceMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const ease = (t: number) => 1 - (1 - t) ** 3;

/** Cluster order, then catalog order: the tab order through the map. */
const ORDERED = clusters.flatMap((c) => tools.filter((t) => clusterOf[t.id] === c.id));

function edgeGeometry(a: Point, b: Point) {
  const ax = a.x;
  const ay = a.y + MARK_DY;
  const bx = b.x;
  const by = b.y + MARK_DY;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // Bow the line a little to one side so parallel links stay apart.
  const bow = Math.min(0.16 * len, 90);
  const cx = (ax + bx) / 2 - uy * bow;
  const cy = (ay + by) / 2 + ux * bow;
  // Trim the ends so lines stop at the tile's edge instead of under it.
  const trim = (px: number, py: number, qx: number, qy: number, d: number) => {
    const l = Math.hypot(qx - px, qy - py) || 1;
    return [px + ((qx - px) / l) * d, py + ((qy - py) / l) * d];
  };
  const [sx, sy] = trim(ax, ay, cx, cy, 34);
  const [ex, ey] = trim(bx, by, cx, cy, 38);
  return {
    d: `M${sx.toFixed(1)} ${sy.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`,
    mid: { x: 0.25 * sx + 0.5 * cx + 0.25 * ex, y: 0.25 * sy + 0.5 * cy + 0.25 * ey },
  };
}

const names = (ids: string[], and = false) => {
  const n = ids.map((id) => toolById.get(id)?.name ?? id);
  return n.length > 1 ? `${n.slice(0, -1).join(", ")} ${and ? "and" : "or"} ${n[n.length - 1]}` : n[0];
};

/** Plain-language lines for a tool's links, for the hover callout. */
function calloutLines(id: string): { kind: ToolLink["kind"]; label: string; names: string }[] {
  const out: { kind: ToolLink["kind"]; label: string; names: string }[] = [];
  const runsOn = links.filter((l) => l.from === id && l.kind === "built-on").map((l) => l.to);
  const picks = links.filter((l) => l.from === id && l.kind === "choose").map((l) => l.to);
  const powers = links.filter((l) => l.to === id && l.kind === "built-on").map((l) => l.from);
  const inside = links.filter((l) => l.to === id && l.kind === "choose").map((l) => l.from);
  if (runsOn.length) out.push({ kind: "built-on", label: "Runs on", names: names(runsOn) });
  if (picks.length) out.push({ kind: "choose", label: "Lets you pick", names: names(picks) });
  if (powers.length) out.push({ kind: "built-on", label: "Built on it", names: names(powers, true) });
  if (inside.length) out.push({ kind: "choose", label: "Available in", names: names(inside, true) });
  return out;
}

export function ToolMap({
  highlight,
  activeCluster,
  selected,
  onOpen,
  onCluster,
  handle,
}: {
  /** Tools to emphasize (search matches or a cluster). Null shows everything normally. */
  highlight: Set<string> | null;
  activeCluster: ClusterId | null;
  selected: string | null;
  onOpen: (id: string) => void;
  onCluster: (id: ClusterId) => void;
  handle?: Ref<ToolMapHandle>;
}) {
  const { nodes, world } = toolMapLayout();
  const viewport = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const view = useRef<View>({ x: 0, y: 0, k: 1 });
  const anim = useRef(0);
  const touched = useRef(false);
  const [hover, setHover] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const active = hover ?? focus ?? selected;

  const apply = useCallback(() => {
    const v = view.current;
    if (layer.current) layer.current.style.transform = `translate3d(${v.x}px, ${v.y}px, 0) scale(${v.k})`;
    viewport.current?.style.setProperty("--k", String(v.k));
  }, []);

  /** Keep at least part of the world on screen. */
  const clamp = useCallback(
    (v: View): View => {
      const el = viewport.current;
      if (!el) return v;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const k = Math.min(MAX_K, Math.max(MIN_K, v.k));
      return {
        k,
        x: Math.min(w * 0.75, Math.max(w * 0.25 - world.w * k, v.x)),
        y: Math.min(h * 0.75, Math.max(h * 0.25 - world.h * k, v.y)),
      };
    },
    [world.w, world.h],
  );

  const animateTo = useCallback(
    (target: View, ms = 480) => {
      cancelAnimationFrame(anim.current);
      const to = clamp(target);
      if (reduceMotion() || ms === 0) {
        view.current = to;
        apply();
        return;
      }
      const from = { ...view.current };
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / ms);
        const e = ease(t);
        // Interpolate zoom in log space so it feels even, and keep the screen-center path straight.
        const k = Math.exp(Math.log(from.k) + (Math.log(to.k) - Math.log(from.k)) * e);
        view.current = { k, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e };
        apply();
        if (t < 1) anim.current = requestAnimationFrame(step);
      };
      anim.current = requestAnimationFrame(step);
    },
    [apply, clamp],
  );

  const fitView = useCallback(
    (ids?: string[]): View => {
      const el = viewport.current;
      const w = el?.clientWidth || 800;
      const h = el?.clientHeight || 600;
      const pts = (ids?.length ? ids : [...nodes.keys()]).map((id) => nodes.get(id)).filter((p): p is Point => Boolean(p));
      const pad = ids?.length ? 90 : 40;
      // Cluster labels sit above the top row, so leave room for them.
      const x0 = Math.min(...pts.map((p) => p.x)) - NODE_W / 2 - pad;
      const x1 = Math.max(...pts.map((p) => p.x)) + NODE_W / 2 + pad;
      const y0 = Math.min(...pts.map((p) => p.y)) - NODE_H / 2 - pad - 44;
      const y1 = Math.max(...pts.map((p) => p.y)) + NODE_H / 2 + pad;
      let k = Math.min(MAX_K, Math.max(MIN_K, Math.min(w / (x1 - x0), h / (y1 - y0), ids?.length ? 1 : 1.1)));
      // On a phone, fitting everything makes names unreadable. Stay readable, centered on the target, and let people pan.
      if (w < 600) k = Math.max(k, Math.min(0.6, h / (y1 - y0)));
      return { k, x: (w - (x0 + x1) * k) / 2, y: (h - (y0 + y1) * k) / 2 };
    },
    [nodes],
  );

  useImperativeHandle(handle, () => ({ fit: (ids) => animateTo(fitView(ids)) }), [animateTo, fitView]);

  // First fit, and refit on resize until the person has moved the map themselves.
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    view.current = fitView();
    apply();
    const ro = new ResizeObserver(() => {
      if (!touched.current) {
        view.current = fitView();
        apply();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [apply, fitView]);

  // Pan (drag), pinch and wheel zoom. Native listeners: wheel must be non-passive.
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let start: { view: View; pts: { x: number; y: number }[] } | null = null;
    let dragged = false;

    const zoomAt = (k: number, cx: number, cy: number, base = view.current) => {
      const nk = Math.min(MAX_K, Math.max(MIN_K, k));
      return clamp({ k: nk, x: cx - ((cx - base.x) / base.k) * nk, y: cy - ((cy - base.y) / base.k) * nk });
    };
    const local = (e: PointerEvent | WheelEvent) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const begin = () => {
      start = { view: { ...view.current }, pts: [...pointers.values()].map((p) => ({ ...p })) };
    };

    const down = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      if ((e.target as HTMLElement).closest(".map-controls")) return;
      cancelAnimationFrame(anim.current);
      pointers.set(e.pointerId, local(e));
      dragged = false;
      begin();
    };
    const move = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId) || !start) return;
      pointers.set(e.pointerId, local(e));
      const pts = [...pointers.values()];
      if (pts.length === 1 && start.pts.length === 1) {
        const dx = pts[0].x - start.pts[0].x;
        const dy = pts[0].y - start.pts[0].y;
        if (!dragged && Math.hypot(dx, dy) < 6) return;
        if (!dragged) {
          dragged = true;
          // Capture only once it's clearly a drag, so plain clicks still reach the node buttons.
          el.setPointerCapture(e.pointerId);
          el.classList.add("dragging");
        }
        view.current = clamp({ ...start.view, x: start.view.x + dx, y: start.view.y + dy });
      } else if (pts.length >= 2 && start.pts.length >= 2) {
        dragged = true;
        const [a, b] = pts;
        const [a0, b0] = start.pts;
        const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y) || 1;
        const d1 = Math.hypot(b.x - a.x, b.y - a.y);
        const c0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };
        const c1 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const z = zoomAt(start.view.k * (d1 / d0), c0.x, c0.y, start.view);
        view.current = clamp({ ...z, x: z.x + c1.x - c0.x, y: z.y + c1.y - c0.y });
      }
      touched.current = true;
      apply();
    };
    const up = (e: PointerEvent) => {
      if (!pointers.delete(e.pointerId)) return;
      el.classList.remove("dragging");
      // A second finger lifting shouldn't turn the pinch into a jump: restart from here.
      if (pointers.size) begin();
      else start = null;
    };
    const click = (e: MouseEvent) => {
      if (dragged) {
        e.stopPropagation();
        e.preventDefault();
        dragged = false;
      }
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      cancelAnimationFrame(anim.current);
      const p = local(e);
      const unit = e.deltaMode === 1 ? 16 : 1;
      view.current = zoomAt(view.current.k * Math.exp(-e.deltaY * unit * 0.0016), p.x, p.y);
      touched.current = true;
      apply();
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("click", click, true);
    el.addEventListener("wheel", wheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("click", click, true);
      el.removeEventListener("wheel", wheel);
    };
  }, [apply, clamp]);

  const zoomBy = (f: number) => {
    const el = viewport.current;
    if (!el) return;
    touched.current = true;
    const v = view.current;
    const cx = el.clientWidth / 2;
    const cy = el.clientHeight / 2;
    const k = Math.min(MAX_K, Math.max(MIN_K, v.k * f));
    animateTo({ k, x: cx - ((cx - v.x) / v.k) * k, y: cy - ((cy - v.y) / v.k) * k }, 220);
  };

  /** Keyboard focus on a node that's off screen brings it into view. */
  const reveal = (id: string, target: HTMLElement) => {
    if (!target.matches(":focus-visible")) return;
    const el = viewport.current;
    const p = nodes.get(id);
    if (!el || !p) return;
    const v = view.current;
    const sx = p.x * v.k + v.x;
    const sy = p.y * v.k + v.y;
    const m = 60;
    if (sx < m || sy < m || sx > el.clientWidth - m || sy > el.clientHeight - m) {
      animateTo({ k: v.k, x: el.clientWidth / 2 - p.x * v.k, y: el.clientHeight / 2 - p.y * v.k }, 300);
    }
  };

  // Where each cluster's label goes: centered above its top row.
  const labels = useMemo(
    () =>
      clusters.map((c) => {
        const pts = tools.filter((t) => clusterOf[t.id] === c.id).map((t) => nodes.get(t.id)!);
        const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
        const y = Math.min(...pts.map((p) => p.y)) - NODE_H / 2 - 24;
        return { c, x, y };
      }),
    [nodes],
  );

  const lit = (id: string) => !highlight || highlight.has(id);
  const shownLinks = links.filter((l) => l.kind === "built-on" || l.from === active || l.to === active);
  // Hover or focus (not the open pop-up, which covers the map) gets a callout spelling out its links.
  const pointed = hover ?? focus;
  const callout = pointed ? calloutLines(pointed) : [];
  const calloutAt = pointed ? nodes.get(pointed) : undefined;

  return (
    <div
      ref={viewport}
      className="map-viewport"
      role="group"
      aria-label="Map of AI tools by category. Drag to move, scroll or pinch to zoom."
      data-filtering={highlight ? "" : undefined}
    >
      <div ref={layer} className="map-world" style={{ width: world.w, height: world.h }}>
        <svg className="map-svg" width={world.w} height={world.h} viewBox={`0 0 ${world.w} ${world.h}`} aria-hidden="true">
          <defs>
            {clusters.map((c) => (
              <radialGradient key={c.id} id={`halo-${c.id}`}>
                <stop offset="0%" style={{ stopColor: `var(--kh-cat-${c.id})`, stopOpacity: "var(--halo-a)" }} />
                <stop offset="55%" style={{ stopColor: `var(--kh-cat-${c.id})`, stopOpacity: "calc(var(--halo-a) * 0.45)" }} />
                <stop offset="100%" style={{ stopColor: `var(--kh-cat-${c.id})`, stopOpacity: 0 }} />
              </radialGradient>
            ))}
            {(["built-on", "choose", "active"] as const).map((m) => (
              <marker key={m} id={`arrow-${m}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10z" className={`arrowhead ${m}`} />
              </marker>
            ))}
          </defs>
          <g className="halos">
            {clusters.map((c) => (
              <g
                key={c.id}
                className="halo"
                data-dim={(activeCluster && activeCluster !== c.id) || (highlight && !tools.some((t) => clusterOf[t.id] === c.id && highlight.has(t.id))) ? "" : undefined}
              >
                {tools
                  .filter((t) => clusterOf[t.id] === c.id)
                  .map((t) => {
                    const p = nodes.get(t.id)!;
                    return <circle key={t.id} cx={p.x} cy={p.y} r={118} fill={`url(#halo-${c.id})`} />;
                  })}
              </g>
            ))}
          </g>
          <g className="edges">
            {shownLinks.map((l) => {
              const g = edgeGeometry(nodes.get(l.from)!, nodes.get(l.to)!);
              const on = active === l.from || active === l.to;
              const dim = highlight && !(highlight.has(l.from) && highlight.has(l.to));
              return (
                <path
                  key={`${l.from}-${l.to}`}
                  d={g.d}
                  className={`edge ${l.kind} ${on ? "on" : ""} ${dim && !on ? "dim" : ""}`}
                  markerEnd={`url(#arrow-${on ? "active" : l.kind})`}
                />
              );
            })}
          </g>
        </svg>

        {calloutAt && callout.length > 0 && (
          <div className="map-callout" style={{ left: calloutAt.x, top: calloutAt.y + NODE_H / 2 + 4 }} aria-hidden="true">
            {callout.map((line) => (
              <p key={line.label}>
                <svg viewBox="0 0 24 8" className="map-callout-line">
                  <path d="M1 4H17" className={`edge ${line.kind}`} />
                  <path d="M16 0.5L23 4L16 7.5z" className={`arrowhead ${line.kind}`} />
                </svg>
                <span>
                  <strong>{line.label}</strong> {line.names}
                </span>
              </p>
            ))}
          </div>
        )}

        {labels.map(({ c, x, y }) => (
          <div key={c.id} className="map-cluster-slot" style={{ left: x, top: y }}>
            <button
              type="button"
              className={`map-cluster cat-${c.id} state`}
              aria-pressed={activeCluster === c.id}
              onClick={() => onCluster(c.id)}
              title={c.blurb}
            >
              <Icon name={c.icon} size={20} />
              {c.label}
            </button>
          </div>
        ))}

        {ORDERED.map((t) => {
          const p = nodes.get(t.id)!;
          const cat = clusterOf[t.id];
          const parent = links.find((l) => l.from === t.id && l.kind === "built-on");
          return (
            <button
              key={t.id}
              type="button"
              className={`map-node cat-${cat}`}
              style={{ left: p.x - NODE_W / 2, top: p.y - NODE_H / 2, width: NODE_W, height: NODE_H }}
              data-dim={lit(t.id) ? undefined : ""}
              data-match={highlight?.has(t.id) ? "" : undefined}
              data-selected={selected === t.id ? "" : undefined}
              data-tool={t.id}
              onClick={() => onOpen(t.id)}
              onPointerEnter={(e) => e.pointerType === "mouse" && setHover(t.id)}
              onPointerLeave={() => setHover((h) => (h === t.id ? null : h))}
              onFocus={(e) => {
                setFocus(t.id);
                reveal(t.id, e.currentTarget);
              }}
              onBlur={() => setFocus((f) => (f === t.id ? null : f))}
            >
              <span className="map-node-mark">
                <PixelMark tool={t} size={48} />
                {t.usc === "provided" && (
                  <span className="map-node-usc" title="USC provides it">
                    <Icon name="verified" filled size={14} />
                  </span>
                )}
              </span>
              <span className="map-node-name">{t.name}</span>
              <span className="visually-hidden">
                , {clusterById.get(cat)?.label}
                {t.usc === "provided" ? ", USC provides it" : ""}
                {parent ? `, runs on ${toolById.get(parent.to)?.name}` : ""}
              </span>
            </button>
          );
        })}
      </div>

      <div className="map-controls">
        <button type="button" className="icon-btn state" onClick={() => zoomBy(1.3)} aria-label="Zoom in">
          <Icon name="add" />
        </button>
        <button type="button" className="icon-btn state" onClick={() => zoomBy(1 / 1.3)} aria-label="Zoom out">
          <Icon name="remove" />
        </button>
        <button
          type="button"
          className="icon-btn state"
          onClick={() => {
            touched.current = false;
            animateTo(fitView(highlight ? [...highlight] : undefined));
          }}
          aria-label="Fit the map to the screen"
        >
          <Icon name="fit_screen" />
        </button>
      </div>
    </div>
  );
}
