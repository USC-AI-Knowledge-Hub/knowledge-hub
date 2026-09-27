import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { resetQuests, useModelChoice } from "../../lib/tutor/storage";
import type { Phase } from "../../lib/tutor/useEngine";
import { Icon } from "../Icon";
import { useTutor } from "./context";
import { Home } from "./Home";
import { QuestView } from "./QuestView";
import { Setup } from "./Setup";
import { Orb } from "./Shapes";
import { Thread } from "./Thread";
import type { PageContext } from "./TutorApp";

export function statusText(phase: Phase, declined: boolean): string {
  switch (phase.name) {
    case "off":
      return phase.missing ? "Model not on this device" : declined ? "Reading mode" : "No model downloaded";
    case "loading":
      return phase.fromCache ? "Loading from this device" : `Downloading ${Math.floor((phase.loaded / Math.max(1, phase.total)) * 100)}%`;
    case "compiling":
      return "Getting the model ready";
    case "ready":
      return `${phase.model.name.replace(/ Instruct$/, "")} on ${phase.device === "webgpu" ? "WebGPU" : "your processor"}`;
    case "error":
      return "The model didn't load";
  }
}

function Menu({ onClose }: { onClose(): void }) {
  const { engine, setView, announce } = useTutor();
  const choice = useModelChoice();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    const away = (e: PointerEvent) => {
      if (!ref.current?.parentElement?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [onClose]);

  const onKey = (e: KeyboardEvent) => {
    const items = [...(ref.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length]?.focus();
    } else if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    } else if (e.key === "Tab") onClose();
  };

  const canRemove = choice.status === "downloaded" || engine.phase.name !== "off";
  return (
    <div className="t-menu" role="menu" aria-label="Tutor settings" ref={ref} onKeyDown={onKey}>
      <button type="button" role="menuitem" className="state" onClick={() => (setView({ name: "setup" }), onClose())}>
        <Icon name="download" />
        {engine.ready ? "Change model" : "Download a model"}
      </button>
      {canRemove && (
        <button
          type="button"
          role="menuitem"
          className="state"
          onClick={async () => {
            onClose();
            await engine.remove();
            announce("Removed the downloaded model from this browser.");
          }}
        >
          <Icon name="delete" />
          Remove downloaded model
        </button>
      )}
      <button
        type="button"
        role="menuitem"
        className="state"
        onClick={() => {
          onClose();
          if (confirm("Reset your quest progress, XP, badges and streak?")) {
            resetQuests();
            announce("Quest progress reset.");
          }
        }}
      >
        <Icon name="restart_alt" />
        Reset quest progress
      </button>
    </div>
  );
}

function Composer() {
  const { send, engine, view } = useTutor();
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, [view.name]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [text]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || engine.busy) return;
    send(text);
    setText("");
  };

  return (
    <form className="t-composer" onSubmit={submit}>
      <label htmlFor="tutor-input" className="visually-hidden">
        Ask the tutor
      </label>
      <textarea
        id="tutor-input"
        ref={ref}
        rows={1}
        value={text}
        placeholder="Ask about AI, or say “take me to…”"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
      />
      {engine.busy ? (
        <button type="button" className="icon-btn t-send stop" onClick={engine.stop} aria-label="Stop answering">
          <Icon name="stop" filled />
        </button>
      ) : (
        <button type="submit" className="icon-btn t-send" aria-label="Send" disabled={!text.trim()}>
          <Icon name="arrow_upward" />
        </button>
      )}
    </form>
  );
}

export function TutorSheet({ page }: { page: PageContext }) {
  const t = useTutor();
  const { engine, view, setView, close } = t;
  const choice = useModelChoice();
  const [menu, setMenu] = useState(false);
  const sheet = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const loading = engine.phase.name === "loading" || engine.phase.name === "compiling";

  // Scroll to the top when the view changes; views manage their own scrolling after that.
  useEffect(() => {
    body.current?.scrollTo({ top: 0 });
  }, [view.name]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !e.defaultPrevented) {
      e.preventDefault();
      if (menu) setMenu(false);
      else close();
    }
  };


  return (
    <aside ref={sheet} className="tutor-sheet" role="dialog" aria-modal="false" aria-labelledby="tutor-title" onKeyDown={onKey}>
      <header className="t-head">
        {view.name !== "home" ? (
          <button type="button" className="icon-btn state" onClick={() => setView({ name: "home" })} aria-label="Back to tutor home">
            <Icon name="arrow_back" />
          </button>
        ) : (
          <Orb size={40} thinking={engine.busy || loading} className="t-head-orb" />
        )}
        <div className="t-head-text">
          <h2 id="tutor-title" className="title-l">
            AI tutor
          </h2>
          <p className="body-s muted t-status">
            <span className={`t-dot ${engine.phase.name}`} aria-hidden="true" />
            {statusText(engine.phase, choice.status === "declined")}
            {engine.mock && " (test engine)"}
          </p>
        </div>
        <div className="t-menu-wrap">
          <button
            type="button"
            className="icon-btn state"
            aria-label="Tutor settings"
            aria-haspopup="menu"
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
          >
            <Icon name="more_vert" />
          </button>
          {menu && <Menu onClose={() => setMenu(false)} />}
        </div>
        <button type="button" className="icon-btn state" onClick={close} aria-label="Close the tutor">
          <Icon name="close" />
        </button>
      </header>

      <div className="t-body" ref={body}>
        {view.name === "home" && <Home page={page} />}
        {view.name === "chat" && <Thread scroller={body} />}
        {view.name === "quest" && <QuestView key={view.quest} questId={view.quest} scroller={body} />}
        {view.name === "setup" && <Setup />}
      </div>

      {(view.name === "home" || view.name === "chat") && <Composer />}
    </aside>
  );
}
