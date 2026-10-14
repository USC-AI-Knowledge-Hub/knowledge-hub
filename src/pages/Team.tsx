import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Icon } from "../components/Icon";
import { ToolMark } from "../components/ToolMark";
import { GISCUS, TEAM_TOOLS, teamTool, threadTerm } from "../data/team";
import { toolById } from "../data/tools";
import "../styles/team.css";

const isDarkNow = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};

function useDark() {
  const [dark, setDark] = useState(isDarkNow);
  useEffect(() => {
    const update = () => setDark(isDarkNow());
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", update);
    return () => {
      mo.disconnect();
      mq.removeEventListener("change", update);
    };
  }, []);
  return dark;
}

function useOnline() {
  const [on, setOn] = useState(() => navigator.onLine);
  useEffect(() => {
    const f = () => setOn(navigator.onLine);
    addEventListener("online", f);
    addEventListener("offline", f);
    return () => {
      removeEventListener("online", f);
      removeEventListener("offline", f);
    };
  }, []);
  return on;
}

const themeFor = (dark: boolean) => (dark ? "dark" : "light");

/** Loads giscus for one tool's thread. Re-mounts the embed when the tool changes. */
function Thread({ toolId }: { toolId: string }) {
  const host = useRef<HTMLDivElement>(null);
  const dark = useDark();
  const darkRef = useRef(dark);
  darkRef.current = dark;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    el.replaceChildren();
    const s = document.createElement("script");
    s.src = "https://giscus.app/client.js";
    s.async = true;
    s.crossOrigin = "anonymous";
    const attrs: Record<string, string> = {
      "data-repo": GISCUS.repo,
      "data-repo-id": GISCUS.repoId,
      "data-category": GISCUS.category,
      "data-category-id": GISCUS.categoryId,
      "data-mapping": "specific",
      "data-term": threadTerm(toolId),
      "data-strict": "1",
      "data-reactions-enabled": "1",
      "data-emit-metadata": "0",
      "data-input-position": "top",
      "data-theme": themeFor(darkRef.current),
      "data-lang": "en",
      "data-loading": "lazy",
    };
    for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
    el.append(s);
    return () => el.replaceChildren();
  }, [toolId]);

  useEffect(() => {
    document
      .querySelector<HTMLIFrameElement>("iframe.giscus-frame")
      ?.contentWindow?.postMessage({ giscus: { setConfig: { theme: themeFor(dark) } } }, "https://giscus.app");
  }, [dark]);

  return <div ref={host} className="team-thread" />;
}

function Switcher({ current, onPick }: { current: string; onPick: (id: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const tool = toolById.get(current);
  const open = () => ref.current?.showModal();
  return (
    <>
      <button type="button" className="team-switch state" onClick={open} aria-haspopup="dialog">
        {tool && <ToolMark tool={tool} size={32} />}
        <span className="team-switch-text">
          <span className="body-s muted">Now viewing</span>
          <span className="title-m">{tool?.name}</span>
        </span>
        <span className="btn sm outlined team-switch-cta">
          <Icon name="swap_horiz" size={20} />
          Switch tool
        </span>
      </button>
      <dialog
        ref={ref}
        className="team-dialog"
        aria-labelledby="team-dialog-h"
        onClick={(e) => e.target === ref.current && ref.current?.close()}
      >
        <div className="team-dialog-body">
          <div className="team-dialog-head">
            <h2 id="team-dialog-h" className="title-l">
              Pick a tool's board
            </h2>
            <button type="button" className="icon-btn state" aria-label="Close" onClick={() => ref.current?.close()}>
              <Icon name="close" />
            </button>
          </div>
          <ul className="team-grid">
            {TEAM_TOOLS.map((id) => {
              const t = toolById.get(id);
              if (!t) return null;
              return (
                <li key={id}>
                  <button
                    type="button"
                    className="team-pick state"
                    aria-pressed={id === current}
                    onClick={() => {
                      onPick(id);
                      ref.current?.close();
                    }}
                  >
                    <ToolMark tool={t} size={48} />
                    <span className="label-l">{t.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </dialog>
    </>
  );
}

export function Team() {
  const [params, setParams] = useSearchParams();
  const toolId = teamTool(params.get("tool"));
  const tool = toolById.get(toolId);
  const online = useOnline();
  const live = GISCUS.categoryId !== "";
  const pick = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("tool", id);
    setParams(next, { replace: true, preventScrollReset: true });
  };

  return (
    <div className="team-page">
      <header className="page-head team-hero">
        <h1 className="display-l">AI Team</h1>
        <p className="body-l measure">
          One board for each of eight tools. Share prompts, compare notes and ask what worked for other students.
        </p>
      </header>

      <Switcher current={toolId} onPick={pick} />

      <section className="team-board" aria-labelledby="team-board-h">
        <h2 id="team-board-h" className="title-l">
          {tool?.name} board
        </h2>
        {!online ? (
          <p className="team-note body-m">The board needs the internet. Reconnect and it will load.</p>
        ) : !live ? (
          <p className="team-note body-m">The boards aren't switched on yet. Check back soon.</p>
        ) : (
          <Thread key={toolId} toolId={toolId} />
        )}
        <p className="body-s muted team-foot">
          Sign in with a free GitHub account to post. Your GitHub username shows next to your comments, and posts are public. Use the
          menu on a comment to report it. Comments are students' own views, not advice from USC or the tool's maker.
        </p>
      </section>
    </div>
  );
}
