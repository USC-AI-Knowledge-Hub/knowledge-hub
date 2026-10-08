import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * Offline mode: a service worker (scripts/offline/sw.template.js) keeps the app, its fonts and the
 * latest library data in this browser, so the lessons and the tutor open without internet. The
 * tutor's model files are kept separately by the model libraries (Cache Storage), so downloading a
 * model and saving the site together make a complete offline copy.
 *
 * It is opt-in: nothing registers until someone presses "Save for offline use", so ordinary visits
 * never see cached pages. Once saved, a flag in localStorage re-registers the worker on each visit,
 * which is how it picks up new versions of the site.
 */

const FLAG = "kh-offline";
const base = () => import.meta.env.BASE_URL;
const swUrl = () => `${base()}sw.js`;
const shellUrl = () => `${base()}shell.html`;

/** The service worker only exists in a production build, on a secure page, in a browser that has one. */
export const offlineSupported = () =>
  import.meta.env.PROD && typeof navigator !== "undefined" && "serviceWorker" in navigator && typeof caches !== "undefined";

const flagged = () => {
  try {
    return localStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
};

const setFlag = (on: boolean) => {
  try {
    if (on) localStorage.setItem(FLAG, "1");
    else localStorage.removeItem(FLAG);
  } catch {
    /* Blocked storage: the worker stays registered, just not renewed on each visit. */
  }
};

/** Whether the site is saved: a worker is running and the app shell is in the cache. */
export async function isSaved(): Promise<boolean> {
  if (!offlineSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration(base());
    return !!reg?.active && !!(await caches.match(shellUrl(), { ignoreVary: true }));
  } catch {
    return false;
  }
}

/** Saves the site for offline use. Resolves once everything is cached; rejects if it couldn't be. */
export async function saveOffline(): Promise<void> {
  if (!offlineSupported()) throw new Error("This browser can't save the site for offline use.");
  await navigator.serviceWorker.register(swUrl(), { scope: base() });
  await navigator.serviceWorker.ready;
  if (!(await isSaved())) throw new Error("The site didn't finish saving.");
  setFlag(true);
  notify();
}

/** Deletes the saved site (not the tutor's model, which has its own remove button). */
export async function removeOffline(): Promise<void> {
  setFlag(false);
  if (offlineSupported()) {
    const reg = await navigator.serviceWorker.getRegistration(base());
    await reg?.unregister();
    for (const name of await caches.keys()) if (name.startsWith("kh-")) await caches.delete(name);
  }
  notify();
}

/** Re-registers the worker on each visit after the site was saved, so updates arrive. */
export function resumeOffline() {
  if (offlineSupported() && flagged()) void navigator.serviceWorker.register(swUrl(), { scope: base() }).catch(() => undefined);
}

/** Asks the browser not to clear this site's data when storage runs low. */
export async function protectStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

// Chrome and Edge offer an install prompt once, early; keep it for the button on the offline page.
interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
let installPrompt: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installPrompt = e as InstallPrompt;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    notify();
  });
}
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};

export interface OfflineStatus {
  supported: boolean;
  online: boolean;
  /** null while checking. */
  saved: boolean | null;
  persisted: boolean | null;
  /** Bytes this site stores in the browser (the site and any tutor model), if the browser says. */
  usage: number | null;
  canInstall: boolean;
  installed: boolean;
}

export function useOffline(): OfflineStatus & {
  save(): Promise<void>;
  remove(): Promise<void>;
  protect(): Promise<void>;
  install(): Promise<void>;
} {
  const canInstall = useSyncExternalStore(subscribe, () => installPrompt !== null);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [saved, setSaved] = useState<boolean | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [usage, setUsage] = useState<number | null>(null);
  const [installed, setInstalled] = useState(false);

  const refresh = useCallback(async () => {
    setSaved(await isSaved());
    try {
      setPersisted((await navigator.storage?.persisted?.()) ?? null);
      setUsage((await navigator.storage?.estimate?.())?.usage ?? null);
    } catch {
      /* The browser doesn't say. */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setInstalled(window.matchMedia?.("(display-mode: standalone)").matches ?? false);
    const unsub = subscribe(() => void refresh());
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      unsub();
    };
  }, [refresh]);

  return {
    supported: offlineSupported(),
    online,
    saved,
    persisted,
    usage,
    canInstall,
    installed,
    async save() {
      await saveOffline();
      // Saving is the moment to ask: the page was just chosen, so browsers are most willing.
      setPersisted(await protectStorage());
      await refresh();
    },
    async remove() {
      await removeOffline();
      await refresh();
    },
    async protect() {
      setPersisted(await protectStorage());
      await refresh();
    },
    async install() {
      if (!installPrompt) return;
      await installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      notify();
    },
  };
}
