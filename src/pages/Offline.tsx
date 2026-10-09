import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "../components/Icon";
import { useOffline } from "../lib/offline";
import { mbLabel, modelById, variantOf } from "../lib/tutor/registry";
import { openTutor } from "../lib/tutor/bridge";
import { isCached, isMockMode } from "../lib/tutor/engine";
import { useModelChoice } from "../lib/tutor/storage";
import "../styles/offline.css";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

function size(bytes: number | null) {
  if (bytes === null) return null;
  return bytes >= 1e9 ? `${(bytes / 1e9).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1e6))} MB`;
}

function Step({ n, done, title, children }: { n: number; done: boolean; title: string; children: ReactNode }) {
  return (
    <li className={`off-step card outlined ${done ? "done" : ""}`}>
      <span className="off-mark title-m" aria-hidden="true">
        {done ? <Icon name="check" /> : n}
      </span>
      <div className="off-body">
        <h2 className="title-l">
          {title}
          {done && <span className="visually-hidden"> (done)</span>}
        </h2>
        {children}
      </div>
    </li>
  );
}

/** Save the site and a tutor model to this device, so the lessons and the tutor work without internet. */
export function Offline() {
  const off = useOffline();
  const model = useModelChoice();
  const [busy, setBusy] = useState<"save" | "remove" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bytes, setBytes] = useState<number | null>(null);

  // How big the saved site is, from the build. Only fetched when online; the page reads fine without it.
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}offline.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { bytes?: number } | null) => setBytes(j?.bytes ?? null))
      .catch(() => undefined);
  }, []);

  // The tutor remembers a choice even if the browser later clears the files, so check they're there.
  const [present, setPresent] = useState<boolean | null>(null);
  const picked = model.status === "downloaded" ? modelById.get(model.model) : undefined;
  useEffect(() => {
    if (model.status !== "downloaded" || !picked) return setPresent(null);
    if (isMockMode()) return setPresent(true);
    let live = true;
    isCached(picked, model.device).then((ok) => live && setPresent(ok));
    return () => {
      live = false;
    };
  }, [model, picked]);
  const chosen = present === false ? undefined : picked;
  const chosenMb = chosen && model.status === "downloaded" ? variantOf(chosen, model.device)?.mb : undefined;
  const saved = off.saved === true;
  const modelReady = !!chosen;
  const ready = saved && modelReady;

  const run = async (what: "save" | "remove", fn: () => Promise<void>) => {
    setBusy(what);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(
        what === "save"
          ? "Couldn't save the site. Check your connection and try again."
          : e instanceof Error
            ? e.message
            : "Something went wrong.",
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <header className="page-head">
        <p className="label-l muted">Offline mode</p>
        <h1 className="display-s">Use the tutor without internet</h1>
        <p className="body-l muted measure">
          Save the site and a tutor model to this device. Then open the bookmark on a flight, in a dead zone or when campus Wi-Fi fails, and
          the lessons and the tutor still work.
        </p>
        <div className="off-top">
          <p className={`off-net label-l ${off.online ? "online" : "offline"}`} role="status">
            <Icon name={off.online ? "wifi" : "wifi_off"} size={20} />
            {off.online ? "You're online" : ready ? "You're offline, and everything you saved is here" : "You're offline"}
          </p>
          {ready && (
            <button type="button" className="btn filled state" onClick={openTutor}>
              <Icon name="chat_bubble" />
              Open the tutor
            </button>
          )}
        </div>
      </header>

      {!off.supported && (
        <div className="empty">
          <Icon name="cloud_off" size={32} />
          <p className="title-m">Offline mode isn't available here</p>
          <p className="body-m muted measure">
            It needs the live site in a browser that supports service workers, such as recent Chrome, Edge, Firefox or Safari. It doesn't run
            in private windows or from a local preview.
          </p>
        </div>
      )}

      <ol className="off-steps">
        <Step n={1} done={saved} title="Save the site to this device">
          <p className="body-m muted measure">
            Keeps the pages, lessons, quests and quizzes, plus the tutor itself, in your browser{bytes ? ` (about ${size(bytes)})` : ""}. Your progress
            is already stored on this device.
          </p>
          <div className="off-actions">
            {saved ? (
              <>
                <span className="off-state label-l">
                  <Icon name="check_circle" filled size={20} />
                  Saved. It works offline.
                </span>
                <button type="button" className="btn text sm state" disabled={busy !== null} onClick={() => run("remove", off.remove)}>
                  Remove the saved site
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn filled state"
                disabled={!off.supported || !off.online || busy !== null || off.saved === null}
                onClick={() => run("save", off.save)}
              >
                <Icon name="download_for_offline" />
                {busy === "save" ? "Saving…" : "Save for offline use"}
              </button>
            )}
          </div>
          {!saved && !off.online && <p className="body-s muted">Connect to the internet to save the site.</p>}
          {error && (
            <p className="body-s off-error" role="alert">
              {error}
            </p>
          )}
        </Step>

        <Step n={2} done={modelReady} title="Download a tutor model">
          {present === false && (
            <p className="body-s off-error" role="alert">
              The model you chose isn't on this device any more. Your browser may have cleared it. Download it again to use the tutor offline.
            </p>
          )}
          {chosen ? (
            <p className="body-m measure">
              <strong>{chosen.name}</strong> is on this device{chosenMb ? ` (${mbLabel(chosenMb)})` : ""}. It runs entirely in your browser.
            </p>
          ) : (
            <p className="body-m muted measure">
              The tutor answers using a small language model that runs on your device. It's a one-time download of roughly 200 to 600 MB, so
              use Wi-Fi.
            </p>
          )}
          <div className="off-actions">
            <button type="button" className={`btn ${chosen ? "text sm" : "filled"} state`} onClick={openTutor}>
              <Icon name={chosen ? "swap_horiz" : "psychology"} />
              {chosen ? "Change the model" : "Choose a model"}
            </button>
          </div>
        </Step>

        <Step n={3} done={off.persisted === true} title="Keep it from being cleared">
          <p className="body-m muted measure">
            When a device runs low on space, browsers can delete what a site has stored. Asking the browser to protect it makes that much less
            likely.
          </p>
          <div className="off-actions">
            {off.persisted ? (
              <span className="off-state label-l">
                <Icon name="check_circle" filled size={20} />
                Protected by your browser.
              </span>
            ) : (
              <>
                <button type="button" className="btn tonal state" disabled={!off.supported} onClick={off.protect}>
                  <Icon name="shield" />
                  Ask the browser to protect it
                </button>
                {off.persisted === false && saved && (
                  <p className="body-s muted measure">
                    Your browser said not yet. Bookmarking or installing the site usually changes that; then try again.
                  </p>
                )}
              </>
            )}
          </div>
        </Step>

        <Step n={4} done={off.installed} title="Bookmark it or install it">
          <p className="body-m muted measure">
            Bookmark this page ({isMac ? "⌘D" : "Ctrl+D"}) and open the bookmark when you're offline. Or install the site as an app so it has its
            own icon.
          </p>
          <div className="off-actions">
            {off.installed ? (
              <span className="off-state label-l">
                <Icon name="check_circle" filled size={20} />
                You're using the installed app.
              </span>
            ) : off.canInstall ? (
              <button type="button" className="btn tonal state" onClick={off.install}>
                <Icon name="install_desktop" />
                Install as an app
              </button>
            ) : (
              <p className="body-s muted measure">
                Your browser's menu has an install option (in Chrome and Edge, look for "Install" in the address bar or the ⋮ menu; in
                Safari, Share, then Add to Home Screen).
              </p>
            )}
          </div>
        </Step>
      </ol>

      <section className="off-limits card filled" aria-labelledby="off-works">
        <div>
          <h2 id="off-works" className="title-l">
            Works offline
          </h2>
          <ul className="ideas">
            <li className="body-m">Lessons, quests and quizzes, with your progress.</li>
            <li className="body-m">The tutor, using the model you downloaded.</li>
            <li className="body-m">The tool guides, learning paths and last-saved video library.</li>
          </ul>
        </div>
        <div>
          <h2 className="title-l">Needs internet</h2>
          <ul className="ideas">
            <li className="body-m">Watching videos, and the daily library refresh.</li>
            <li className="body-m">Opening a tool's own website.</li>
            <li className="body-m">The first model download, and updates to the site.</li>
          </ul>
        </div>
      </section>

      <p className="body-s muted measure off-foot">
        {off.usage !== null ? `This site is using ${size(off.usage)} on this device, including any model. ` : ""}
        The tutor runs on your graphics chip in browsers with WebGPU (recent Chrome and Edge), or more slowly on your processor.
      </p>
    </>
  );
}
