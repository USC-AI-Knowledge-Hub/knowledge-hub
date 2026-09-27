/**
 * A tool's review and its videos, shared by the full tool page (/tools/:id)
 * and the tool map's pop-up so the two never drift apart.
 */
import type { ReactNode } from "react";
import { Link } from "react-router";
import { courses } from "../data/courses";
import { modules } from "../data/learn";
import type { Cost, Tool, UscAccess } from "../data/types";
import { DIFFICULTIES, DIFFICULTY_BLURB, DIFFICULTY_LABEL } from "../data/types";
import { live, useCourseStatus } from "../lib/courses";
import { useFeed } from "../lib/feed";
import { longDate } from "../lib/format";
import { CourseCard } from "./CourseCard";
import { Icon } from "./Icon";
import { Bars } from "./Level";
import { VideoRow } from "./VideoCard";

export const COST_LABEL: Record<Cost, string> = { free: "Free", freemium: "Free tier", paid: "Paid" };

export function UscBadge({ usc }: { usc: UscAccess }) {
  if (usc === "provided")
    return (
      <span className="usc-badge provided">
        <Icon name="verified" filled size={16} />
        USC provides
      </span>
    );
  if (usc === "check")
    return (
      <span className="usc-badge">
        <Icon name="help" size={16} />
        Check USC access
      </span>
    );
  return null;
}

function List({ items, tone }: { items: string[]; tone: "good" | "bad" }) {
  return (
    <ul className={`plist ${tone}`}>
      {items.map((x) => (
        <li key={x} className="body-m">
          <Icon name={tone === "good" ? "check_circle" : "block"} size={20} />
          {x}
        </li>
      ))}
    </ul>
  );
}

type Variant = "page" | "sheet";

/** Section heading: h2 on the page, h3 in the pop-up (where the tool name is the h2). */
function H({ variant, className, children, id }: { variant: Variant; className: string; children: ReactNode; id?: string }) {
  return variant === "page" ? (
    <h2 id={id} className={className}>
      {children}
    </h2>
  ) : (
    <h3 id={id} className={className}>
      {children}
    </h3>
  );
}

/** Privacy, integrity, review dates and related lessons. */
function ToolFacts({ tool, variant }: { tool: Tool; variant: Variant }) {
  const related = modules.filter((m) => m.tools.includes(tool.id)).slice(0, 4);
  return (
    <>
      <div className="card outlined side-card">
        <Icon name="shield_person" />
        <H variant={variant} className="title-m">
          Privacy and data
        </H>
        <p className="body-m">{tool.privacy}</p>
      </div>
      <div className="card outlined side-card">
        <Icon name="gavel" />
        <H variant={variant} className="title-m">
          Academic integrity
        </H>
        <p className="body-m">{tool.integrity}</p>
      </div>
      <div className="card outlined side-card">
        <Icon name="event_available" />
        <H variant={variant} className="title-m">
          Review status
        </H>
        <p className="body-m">
          Last reviewed {longDate(tool.lastReviewed)}
          <br />
          Next review {longDate(tool.nextReview)}
        </p>
        <p className="body-s muted">Reviewed by the USC AI Knowledge Hub student team.</p>
      </div>
      {related.length > 0 && (
        <div className="card outlined side-card">
          <Icon name="school" />
          <H variant={variant} className="title-m">
            Lessons that use it
          </H>
          <ul className="side-links">
            {related.map((m) => (
              <li key={m.id}>
                <Link to={`/learn/${m.id}`} className="body-m">
                  {m.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

/**
 * The written review. On the page the quick start leads and the facts sit in
 * a sidebar; in the pop-up it reads top to bottom, starting with what makes
 * the tool different.
 */
export function ToolReview({ tool, variant }: { tool: Tool; variant: Variant }) {
  const quick = (
    <div id={variant === "page" ? "quickstart" : undefined} className="card filled quickstart">
      <H variant={variant} className="headline-s">
        5-minute quick start
      </H>
      <ol>
        {tool.quickStart.map((s) => (
          <li key={s} className="body-l">
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
  const uses = (
    <div className="profile-pair">
      <div>
        <H variant={variant} className="title-l">
          Best uses
        </H>
        <List items={tool.bestUses} tone="good" />
      </div>
      <div>
        <H variant={variant} className="title-l">
          Poor uses
        </H>
        <List items={tool.poorUses} tone="bad" />
      </div>
    </div>
  );
  const different = (
    <div>
      <H variant={variant} className="title-l">
        What makes it different
      </H>
      <p className="body-l measure">{tool.different}</p>
    </div>
  );
  const strengths = (
    <div className="profile-pair">
      <div>
        <H variant={variant} className="title-l">
          Strengths
        </H>
        <List items={tool.strengths} tone="good" />
      </div>
      <div>
        <H variant={variant} className="title-l">
          Weaknesses
        </H>
        <List items={tool.weaknesses} tone="bad" />
      </div>
    </div>
  );

  if (variant === "sheet")
    return (
      <div className="profile-main sheet-review">
        {different}
        {uses}
        {quick}
        {strengths}
        <div className="sheet-facts">
          <ToolFacts tool={tool} variant={variant} />
        </div>
      </div>
    );

  return (
    <section className="section profile" aria-label="Tool review">
      <div className="profile-main">
        {quick}
        {uses}
        {different}
        {strengths}
      </div>
      <aside className="profile-side">
        <ToolFacts tool={tool} variant={variant} />
      </aside>
    </section>
  );
}

/** Feed videos for a tool in three difficulty columns, plus full courses that teach it. */
export function ToolVideos({ tool, variant }: { tool: Tool; variant: Variant }) {
  const { feed } = useFeed();
  const status = useCourseStatus();
  const videos = (feed?.videos ?? []).filter((v) => v.tools.includes(tool.id));
  const toolCourses = courses
    .filter((c) => c.tools?.includes(tool.id))
    .map((c) => live(c, status))
    .filter((c) => c.available);
  const big = variant === "page" ? "headline-m" : "headline-s";

  const levels = (
    <section className={variant === "page" ? "section" : "sheet-section"} aria-labelledby={`levels-h-${variant}`}>
      <div className="section-head">
        <div>
          <H variant={variant} id={`levels-h-${variant}`} className={big}>
            Learn {tool.name}, level by level
          </H>
          <p className="body-m muted">{videos.length ? "Updated daily. Start in the column that matches you." : "Videos appear here after the first daily run."}</p>
        </div>
        <Link to={`/watch?tool=${tool.id}`} className="btn text state">
          All {tool.name} videos
        </Link>
      </div>
      <div className="level-cols">
        {DIFFICULTIES.map((d) => {
          const list = videos.filter((v) => v.difficulty === d).sort((a, b) => b.score - a.score);
          return (
            <div key={d} className={`level-col ${d}`}>
              <div className="level-col-head">
                <Bars level={d} />
                {variant === "page" ? <h3 className="title-m">{DIFFICULTY_LABEL[d]}</h3> : <h4 className="title-m">{DIFFICULTY_LABEL[d]}</h4>}
                <span className="label-m">{list.length}</span>
              </div>
              <p className="body-s level-col-blurb">{DIFFICULTY_BLURB[d]}</p>
              <div className="level-col-list">
                {list.slice(0, 4).map((v) => (
                  <VideoRow key={v.id} video={v} />
                ))}
                {!list.length && <p className="body-s muted">Nothing at this level yet.</p>}
              </div>
              {list.length > 4 && (
                <Link to={`/watch?tool=${tool.id}&level=${d}`} className="btn text sm state">
                  {list.length - 4} more
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );

  const full =
    toolCourses.length > 0 ? (
      <section className={variant === "page" ? "section" : "sheet-section"} aria-labelledby={`tc-h-${variant}`}>
        <div className="section-head">
          <div>
            <H variant={variant} id={`tc-h-${variant}`} className={big}>
              Full courses
            </H>
            <p className="body-m muted">Structured courses that teach {tool.name}, start to finish.</p>
          </div>
        </div>
        <div className="grid cols-videos">
          {toolCourses.map((c) => (
            <CourseCard key={c.id} course={c} compact />
          ))}
        </div>
      </section>
    ) : null;

  // The pop-up leads with full courses: a planned sequence is the better start when someone opens a tool to learn it.
  return variant === "page" ? (
    <>
      {levels}
      {full}
    </>
  ) : (
    <>
      {full}
      {levels}
    </>
  );
}
