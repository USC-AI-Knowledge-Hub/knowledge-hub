/*
 * The offline service worker. scripts/service-worker.ts fills in the three markers below at build
 * time and writes the result to dist/sw.js. It only does anything for people who pressed "Save for
 * offline use" (src/lib/offline.ts registers it); everyone else never loads it.
 *
 *  - The app (pages' scripts, styles, icons and a generic page, shell.html) is saved when this
 *    version installs, and replaced as a set when a new version installs.
 *  - Page loads go to the network first and fall back to shell.html, which the app turns into
 *    whatever page the address asks for. So online visits are never stale.
 *  - Data files (the video library) are network-first with the last copy as the fallback.
 *  - Google Fonts (including the icon font) are saved the first time they load.
 *  - Everything else, including the tutor's model files, is left alone: the model libraries keep
 *    those in Cache Storage themselves.
 */
const VERSION = "__VERSION__";
const BASE = "__BASE__";
const FILES = __FILES__;
const DATA = __DATA__;

const SHELL_CACHE = "kh-shell-" + VERSION;
const DATA_CACHE = "kh-data";
const FONT_CACHE = "kh-fonts";
const SHELL = BASE + "shell.html";
const SLOW_MS = 4000;
/** How long an unsaved font may hold up a page. The stylesheet blocks rendering, so a stalled connection must not hang it. */
const FONT_WAIT_MS = 2500;

/** The app's files don't vary by request (the page asks for them with different headers than this worker saved them with), so ignore Vary. */
const LOOKUP = { ignoreVary: true };

const after = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL_CACHE);
      await Promise.all(
        FILES.map(async (url) => {
          const res = await fetch(url, { cache: "reload" });
          if (!res.ok) throw new Error(url + " returned " + res.status);
          await shell.put(url, res);
        }),
      );
      // The library files are a nicety: saving the app shouldn't fail because one is missing.
      const data = await caches.open(DATA_CACHE);
      await Promise.all(
        DATA.map((url) =>
          fetch(url, { cache: "reload" })
            .then((res) => res.ok && data.put(url, res))
            .catch(() => undefined),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) if (name.startsWith("kh-shell-") && name !== SHELL_CACHE) await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (req.mode === "navigate") event.respondWith(page(req));
    else if (url.pathname.startsWith(BASE + "data/")) event.respondWith(networkFirst(req));
    else event.respondWith(saved(req, url));
  } else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(staleWhileRevalidate(req));
  }
});

/** A page load: the network if it answers promptly, otherwise the saved generic page. */
async function page(req) {
  try {
    return await Promise.race([fetch(req), after(SLOW_MS).then(() => Promise.reject(new Error("slow")))]);
  } catch {
    return (await caches.match(SHELL, LOOKUP)) || Response.error();
  }
}

/** The app's own files: saved copy first. Files under /assets/ have hashed names, so a miss is saved too. */
async function saved(req, url) {
  const hit = await caches.match(req, LOOKUP);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && url.pathname.startsWith(BASE + "assets/")) (await caches.open(SHELL_CACHE)).put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    // The app adds ?d=<day> to some data URLs, so match on the path alone.
    const hit = await cache.match(req, { ignoreSearch: true, ignoreVary: true });
    if (hit) return hit;
    throw err;
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(FONT_CACHE);
  const hit = await cache.match(req, LOOKUP);
  const fresh = fetch(req)
    .then((res) => {
      if (res.ok || res.type === "opaque") cache.put(req, res.clone());
      return res;
    })
    .catch(() => undefined);
  return hit || (await Promise.race([fresh, after(FONT_WAIT_MS)])) || Response.error();
}
