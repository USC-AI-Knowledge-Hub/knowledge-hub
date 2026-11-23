/**
 * The Watch explorer: the video library as a map of tasks. On wide screens the tasks sit around a hub as tiles;
 * picking one (or searching for it) zooms the camera in and its tools fan out around it. On phones the same
 * choices are a grid of tiles and a row of tool chips. Everything is a real button, so it works from the keyboard,
 * and Escape zooms back out. The map data comes from src/lib/watchMap.ts.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useCatalog } from "../lib/catalogStore";
import { CENTER, MIN_ON_MAP, WORLD, taskPositions, toolPositions, type MapTask, type VideoMap } from "../lib/watchMap";
import { Icon } from "./Icon";
import { ToolMark } from "./ToolMark";
import "../styles/explorer.css";

const videos = (n: number) => `${n} ${n === 1 ? "video" : "videos"}`;

/** Most tools drawn around a task; the rest are chips under the map. */
const RING_MAX = 10;
const ZOOM = 1.35;
const MAX_H = 560;

export function TaskExplorer({
  map,
  total,
  task,
  tool,
  onTask,
  onTool,
}: {
  map: VideoMap;
  total: number;
  task: string | null;
  tool: string | null;
  onTask: (id: string | null) => void;
  onTool: (id: string | null) => void;
}) {
  const { toolById } = useCatalog();
  const viewport = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (task || tool) && !(e.target instanceof HTMLInputElement)) {
        if (tool) onTool(null);
        else onTask(null);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [task, tool, onTask, onTool]);

  const onMap = useMemo(() => map.tasks.filter((t) => t.count >= MIN_ON_MAP), [map.tasks]);
  const minor = map.tasks.filter((t) => t.count < MIN_ON_MAP);
  const positions = useMemo(() => taskPositions(onMap.length), [onMap.length]);
  const posOf = new Map(onMap.map((t, i) => [t.id, positions[i]]));
  const found = task ? map.tasks.find((t) => t.id === task) ?? null : null;
  // A small task isn't on the map, so it's chosen from the chips and the map stays at the overview.
  const focused = found && posOf.has(found.id) ? found : null;
  const focusAt = focused ? posOf.get(focused.id)! : CENTER;
  const ring = focused ? focused.tools.slice(0, RING_MAX) : [];
  const toolAt = focused ? toolPositions(focusAt, ring.length, 205) : [];
  const extra = focused ? focused.tools.slice(RING_MAX) : [];

  // Camera: fit the world to the viewport's width, then zoom toward the focused task.
  // Never taller than MAX_H, so the videos below stay in reach; the map then centers in the extra width.
  const s = width ? Math.min(width / WORLD.w, MAX_H / WORLD.h) : 1;
  const k = focused ? ZOOM : 1;
  const height = WORLD.h * s;
  const tx = width / 2 - focusAt.x * s * k;
  const ty = height / 2 - focusAt.y * s * k;
  const camera = { transform: `translate(${tx}px, ${ty}px) scale(${s * k})` };

  const toolName = (id: string) => toolById.get(id)?.name ?? id;
  const pick = (t: MapTask) => {
    if (task === t.id && !tool) onTask(null);
    else onTask(t.id);
  };

  return (
    <div className="tx">
      {/* Wide screens: the map. */}
      <div className="tx-graph" ref={viewport} style={{ height: height || undefined }} role="group" aria-label="Video library map">
        <div className="tx-world" style={camera}>
          <svg className="tx-lines" width={WORLD.w} height={WORLD.h} aria-hidden="true" overflow="visible">
            {!focused &&
              onMap.map((t) => {
                const p = posOf.get(t.id)!;
                return <line key={t.id} x1={CENTER.x} y1={CENTER.y} x2={p.x} y2={p.y} />;
              })}
            {focused &&
              ring.map((t, i) => (
                <line key={t.id} x1={focusAt.x} y1={focusAt.y} x2={toolAt[i].x} y2={toolAt[i].y} className={tool === t.id ? "on" : ""} />
              ))}
          </svg>

          {!focused && (
            <button type="button" className="tx-hub state" style={{ left: CENTER.x, top: CENTER.y }} onClick={() => onTask(null)} aria-label={`All videos, ${total}`}>
              <Icon name="smart_display" size={28} />
              <span className="title-m">{total}</span>
              <span className="label-m">videos</span>
            </button>
          )}

          {onMap.map((t) => {
            const p = posOf.get(t.id)!;
            const dim = focused && focused.id !== t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`tx-task state${focused?.id === t.id ? " is-focus" : ""}${dim ? " is-dim" : ""}`}
                style={{ left: p.x, top: p.y }}
                aria-pressed={task === t.id}
                tabIndex={dim ? -1 : 0}
                aria-hidden={dim || undefined}
                onClick={() => pick(t)}
              >
                <Icon name={t.icon} size={26} />
                <span className="tx-task-label title-s">{t.label}</span>
                <span className="tx-task-count label-m">{videos(t.count)}</span>
                {!focused && (
                  <span className="tx-task-marks" aria-hidden="true">
                    {t.tools.slice(0, 3).map((x) => {
                      const tm = toolById.get(x.id);
                      return tm ? <ToolMark key={x.id} tool={tm} size={16} /> : null;
                    })}
                  </span>
                )}
              </button>
            );
          })}

          {ring.map((t, i) => {
            const tm = toolById.get(t.id);
            return (
              <button
                key={t.id}
                type="button"
                className="tx-tool state"
                style={{ left: toolAt[i].x, top: toolAt[i].y, animationDelay: `${i * 30}ms` }}
                aria-pressed={tool === t.id}
                onClick={() => onTool(tool === t.id ? null : t.id)}
              >
                {tm && <ToolMark tool={tm} size={32} />}
                <span className="tx-tool-name label-l">{t.name}</span>
                <span className="label-m muted">{t.count}</span>
              </button>
            );
          })}
        </div>

        {focused && (
          <button type="button" className="tx-back btn tonal sm state" onClick={() => onTask(null)}>
            <Icon name="zoom_out_map" size={18} />
            All tasks
          </button>
        )}
        {!focused && <p className="tx-hint body-s muted">Pick a task to zoom in, or search above.</p>}
      </div>

      {minor.length > 0 && (
        <div className="tx-minor">
          <span className="label-l muted">Smaller topics</span>
          <ul className="chip-row" aria-label="Smaller topics">
            {minor.map((t) => (
              <li key={t.id}>
                <button type="button" className="chip state" aria-pressed={task === t.id} onClick={() => onTask(task === t.id ? null : t.id)}>
                  <Icon name={t.icon} size={18} />
                  {t.label}
                  <span className="chip-count">{t.count}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Phones: the same choices as tiles. */}
      <div className="tx-tiles">
        {!found ? (
          <ul className="tx-tile-grid" aria-label="Tasks">
            {map.tasks.map((t) => (
              <li key={t.id}>
                <button type="button" className="tx-tile state" aria-pressed={false} onClick={() => onTask(t.id)}>
                  <Icon name={t.icon} size={24} />
                  <span className="title-s">{t.label}</span>
                  <span className="label-m muted">{videos(t.count)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="tx-tile-focus">
            <button type="button" className="btn text sm state" onClick={() => onTask(null)}>
              <Icon name="arrow_back" size={18} />
              All tasks
            </button>
            <p className="title-m tx-tile-title">
              <Icon name={found.icon} size={22} /> {found.label}
            </p>
          </div>
        )}
      </div>

      {/* Tools that didn't fit the ring (wide screens), or every tool (phones). */}
      {found && found.tools.length > 0 && (
        <div className={`tx-more${extra.length || !focused ? "" : " phone-only"}`}>
          <span className="label-l muted">{focused && extra.length ? "More tools in this task" : "Tools"}</span>
          <ul className="chip-row" aria-label={`Tools in ${found.label}`}>
            {found.tools.map((t, i) => {
              const tm = toolById.get(t.id);
              return (
                <li key={t.id} className={focused && i < RING_MAX ? "phone-only" : undefined}>
                  <button type="button" className="chip state tool-chip" aria-pressed={tool === t.id} onClick={() => onTool(tool === t.id ? null : t.id)}>
                    {tm && <ToolMark tool={tm} size={16} />}
                    {toolName(t.id)}
                    <span className="chip-count">{t.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
