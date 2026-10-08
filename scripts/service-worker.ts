/**
 * Runs after scripts/prerender.ts. Writes dist/sw.js (the offline service worker, with the list of
 * files to save and a version that changes only when those files do) and dist/offline.json (how
 * big the saved site is, for the offline page).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { precacheFiles, renderServiceWorker, totalBytes, versionOf } from "./offline/build";

const dist = resolve(import.meta.dirname, "..", "dist");
const base = (process.env.BASE_PATH ?? "/").replace(/\/?$/, "/");
const files = precacheFiles(dist);
const template = readFileSync(join(import.meta.dirname, "offline", "sw.template.js"), "utf8");
const version = versionOf(dist, files, template);

writeFileSync(join(dist, "sw.js"), renderServiceWorker(template, { version, base, files, data: ["data/videos.json", "data/courses.json"] }));
const bytes = totalBytes(dist, files);
writeFileSync(join(dist, "offline.json"), JSON.stringify({ version, files: files.length, bytes }) + "\n");
console.log(`Service worker ${version}: ${files.length} files, ${(bytes / 1e6).toFixed(1)} MB.`);
