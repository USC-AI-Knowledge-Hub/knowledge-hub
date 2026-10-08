import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** Files that make up the offline copy of the app, as paths relative to dist (forward slashes). */
export function precacheFiles(dist: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.push(relative(dist, full).split(sep).join("/"));
    }
  };
  walk(join(dist, "assets"));
  const fixed = ["shell.html", "favicon.svg", "favicon.png", "icon-512.png", "manifest.webmanifest"];
  return [...out.filter((f) => !f.endsWith(".map")), ...fixed].sort();
}

/** A short fingerprint of the files' names and contents, and of the worker's own code: the worker only updates when the app does. */
export function versionOf(dist: string, files: string[], template = ""): string {
  const h = createHash("sha1").update(template);
  for (const f of files) h.update(f).update(readFileSync(join(dist, f)));
  return h.digest("hex").slice(0, 10);
}

export function renderServiceWorker(template: string, opts: { version: string; base: string; files: string[]; data: string[] }): string {
  const urls = (list: string[]) => JSON.stringify(list.map((f) => opts.base + f));
  const out = template
    .replace("__VERSION__", opts.version)
    .replace("__BASE__", opts.base)
    .replace("__FILES__", urls(opts.files))
    .replace("__DATA__", urls(opts.data));
  if (/__(VERSION|BASE|FILES|DATA)__/.test(out.replace(/\/\*[\s\S]*?\*\//, ""))) throw new Error("The service worker template has an unfilled marker.");
  return out;
}

export const totalBytes = (dist: string, files: string[]) => files.reduce((s, f) => s + statSync(join(dist, f)).size, 0);
