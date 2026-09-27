/**
 * The tool pop-up on /tools: a liquid-glass dialog split 1:3. The left pane
 * is the tool's card (pixel mark, access, lineage); the right pane scrolls
 * through the full review and the videos. Deep-linkable with ?tool=<id>.
 *
 * The glass is progressive: frosted blur everywhere backdrop-filter works,
 * plus an SVG refraction in Chromium, and a solid surface when someone asks
 * for reduced transparency. Text always sits on panes opaque enough for AA.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { clusterById, clusterOf, links } from "../data/toolMap";
import { toolById } from "../data/tools";
import { Icon } from "./Icon";
import { Level } from "./Level";
import { PixelMark } from "./PixelMark";
import type { Cost, UscAccess } from "../data/types";
import { COST_LABEL, ToolReview, ToolVideos } from "./ToolProfile";
import "../styles/map.css";

/** Chromium can run an SVG filter on the backdrop; other engines ignore it, so only opt in there. */
const canRefract = () => typeof navigator !== "undefined" && "userAgentData" in navigator;

function Lineage({ id, onOpen }: { id: string; onOpen: (id: string) => void }) {
  const groups = [
    { title: "Runs on", list: links.filter((l) => l.from === id && l.kind === "built-on"), end: "to" as const },
    { title: "Lets you pick", list: links.filter((l) => l.from === id && l.kind === "choose"), end: "to" as const },
    { title: "Built on it", list: links.filter((l) => l.to === id && l.kind === "built-on"), end: "from" as const },
    { title: "Available in", list: links.filter((l) => l.to === id && l.kind === "choose"), end: "from" as const },
  ].filter((g) => g.list.length);
  if (!groups.length) return null;
  return (
    <div className="sheet-lineage">
      {groups.map((g) => (
        <div key={g.title}>
          <h3 className="label-l">{g.title}</h3>
          <ul>
            {g.list.map((l) => {
              const other = toolById.get(l[g.end]);
              if (!other) return null;
              return (
                <li key={other.id}>
                  <button type="button" className="lineage-chip state" onClick={() => onOpen(other.id)} title={l.note}>
                    <PixelMark tool={other} size={24} />
                    {other.name}
                  </button>
                </li>
              );
            })}
          </ul>
          {g.list.length === 1 && <p className="body-s sheet-lineage-note">{g.list[0].note}</p>}
        </div>
      ))}
    </div>
  );
}

/** Cost as coins: none for free, one for a free tier, two for paid. The label always sits beside it. */
function Coins({ cost }: { cost: Cost }) {
  const n = cost === "free" ? 0 : cost === "freemium" ? 1 : 2;
  return (
    <span className="coins" aria-hidden="true">
      {[0, 1].map((i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 7 7" shapeRendering="crispEdges" className={i < n ? "on" : ""}>
          <path d="M2 0h3v1h1v1h1v3h-1v1h-1v1h-3v-1h-1v-1h-1v-3h1v-1h1z" className="coin-edge" />
          <path d="M2 1h3v1h1v3h-1v1h-3v-1h-1v-3h1z" className="coin-face" />
          <path d="M3 2h1v3h-1z" className="coin-mark" />
        </svg>
      ))}
    </span>
  );
}

const PASS: Record<UscAccess, { label: string; icon: string }> = {
  provided: { label: "USC pass", icon: "verified" },
  check: { label: "Check USC", icon: "help" },
  personal: { label: "Personal account", icon: "person" },
};

/** USC access as a pixel badge. */
function UscPass({ usc }: { usc: UscAccess }) {
  const p = PASS[usc];
  return (
    <span className={`usc-pass px-font ${usc}`}>
      <Icon name={p.icon} filled={usc === "provided"} size={16} />
      {p.label}
    </span>
  );
}

export function ToolSheet({ toolId, onClose, onOpen }: { toolId: string | null; onClose: () => void; onOpen: (id: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [refract] = useState(canRefract);
  const tool = toolId ? toolById.get(toolId) : undefined;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (tool && !d.open) {
      d.showModal();
      // Start reading position on the review, so arrow keys and Page Down scroll it straight away.
      scroller.current?.focus({ preventScroll: true });
    }
    if (!tool && d.open) d.close();
  }, [tool]);

  // A new tool starts at the top of its review. (Below 1000px the whole sheet scrolls instead of the pane.)
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    scroller.current?.parentElement?.scrollTo({ top: 0 });
  }, [toolId]);

  const cat = tool ? clusterOf[tool.id] : "assistants";
  const cluster = clusterById.get(cat);

  return (
    <dialog
      ref={ref}
      className={`tool-sheet cat-${cat} ${refract ? "refract" : ""}`}
      aria-labelledby="tool-sheet-title"
      onCancel={(e) => {
        // Escape: let the URL drive closing, so Back and Escape stay in step.
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {refract && (
        <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
          <filter id="kh-glass-refract" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="2" result="soft" />
            <feDisplacementMap in="SourceGraphic" in2="soft" scale="46" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      )}
      {tool && cluster && (
        <div className="sheet-grid">
          <button type="button" className="icon-btn sheet-close state" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>

          <aside className="sheet-left">
            {/* Character select: the logo on a little CRT, then the tool's stats. Every stat is a real profile field. */}
            <div className="sheet-crt">
              <PixelMark tool={tool} size={160} className="sheet-mark sheet-mark-lg" />
              <PixelMark tool={tool} size={64} className="sheet-mark sheet-mark-sm" />
            </div>
            <div className="sheet-id">
              <h2 id="tool-sheet-title" className="px-font sheet-name">
                {tool.name}
              </h2>
              <p className="body-m sheet-maker">by {tool.maker}</p>
            </div>
            <dl className="sheet-stats">
              <div>
                <dt className="px-font">Class</dt>
                <dd>
                  <Icon name={cluster.icon} size={18} />
                  <span>{cluster.label}</span>
                </dd>
              </div>
              <div>
                <dt className="px-font">Difficulty</dt>
                <dd>
                  <Level level={tool.difficulty} />
                </dd>
              </div>
              <div>
                <dt className="px-font">Cost</dt>
                <dd>
                  <Coins cost={tool.cost} />
                  {COST_LABEL[tool.cost]}
                </dd>
              </div>
              <div>
                <dt className="px-font">Access</dt>
                <dd>
                  <UscPass usc={tool.usc} />
                </dd>
              </div>
            </dl>
            <p className="body-l sheet-bestfor">{tool.bestFor}</p>
            {tool.uscNote && (
              <p className="body-s sheet-usc">
                <Icon name="school" size={18} />
                {tool.uscNote}
              </p>
            )}
            <Lineage id={tool.id} onOpen={onOpen} />
            <div className="sheet-actions">
              <a href={tool.url} target="_blank" rel="noreferrer" className="btn filled sm state">
                <Icon name="open_in_new" />
                Open {tool.name}
              </a>
              <Link to={`/tools/${tool.id}`} className="btn outlined sm state">
                Open full page
              </Link>
            </div>
          </aside>

          <div className="sheet-right" ref={scroller} tabIndex={-1}>
            <ToolReview tool={tool} variant="sheet" />
            <ToolVideos tool={tool} variant="sheet" />
          </div>
        </div>
      )}
    </dialog>
  );
}
