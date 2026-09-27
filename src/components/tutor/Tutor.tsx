import { lazy, Suspense, useEffect, useRef, useState } from "react";
import "../../styles/tutor.css";
import { Orb } from "./Shapes";

/**
 * The on-device AI tutor, mounted once in Layout. Only this button and the
 * keyboard shortcut are in the main bundle; the tutor loads on first open
 * (prefetched when the button is hovered or focused). The model itself only
 * downloads when the student chooses to.
 */
const load = () => import("./TutorApp");
const TutorApp = lazy(load);

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const SHORTCUT = isMac ? "⌘K" : "Ctrl+K";

export function Tutor() {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const fab = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open) setStarted(true);
    // Return focus to the button when the sheet closes.
    else if (wasOpen.current) requestAnimationFrame(() => fab.current?.focus());
    wasOpen.current = open;
  }, [open]);

  // Ctrl/⌘+K toggles the tutor from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      {!open && (
        <button
          ref={fab}
          type="button"
          className="tutor-fab"
          onClick={() => setOpen(true)}
          onPointerEnter={() => void load()}
          onFocus={() => void load()}
          aria-keyshortcuts="Control+K Meta+K"
          aria-label={`Ask the tutor (${SHORTCUT})`}
        >
          <Orb size={26} className="fab-orb" />
          <span>Ask the tutor</span>
          <span className="fab-tip" aria-hidden="true">
            {SHORTCUT}
          </span>
        </button>
      )}
      {started && (
        <Suspense fallback={open ? <div className="tutor-sheet t-loading" role="status" aria-label="Opening the tutor" /> : null}>
          <TutorApp open={open} setOpen={setOpen} />
        </Suspense>
      )}
    </>
  );
}
