/**
 * Runs after `vite build`. The app is a single-page app, so every address would otherwise start
 * as the same empty page. This writes a real HTML page for each route (its own title,
 * description, canonical link, structured data and readable text), plus sitemap.xml and
 * robots.txt, so search engines and link previews get the right page without running any script.
 * The app takes over in the browser as usual.
 *
 * The page details come from src/lib/seo.ts, which reads the lesson files with Vite's
 * import.meta.glob, so it is loaded through Vite rather than plain Node.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createServer } from "vite";

type Seo = typeof import("../src/lib/seo");
type Render = typeof import("./seo/render");

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const base = (process.env.BASE_PATH ?? "/").replace(/\/?$/, "/");
const template = readFileSync(join(dist, "index.html"), "utf8");

const vite = await createServer({ root, base: "/", appType: "custom", server: { middlewareMode: true }, logLevel: "error" });
try {
  const { SITE_URL, allPaths, pageMeta, sitemapPaths } = (await vite.ssrLoadModule("/src/lib/seo.ts")) as Seo;
  const { renderPage, robotsTxt, sitemapXml } = (await vite.ssrLoadModule("/scripts/seo/render.ts")) as Render;

  let count = 0;
  for (const path of allPaths()) {
    const meta = pageMeta(path);
    if (!meta) throw new Error(`No page details for ${path}`);
    const file = path === "/" ? join(dist, "index.html") : join(dist, path, "index.html");
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, renderPage(template, meta, base));
    count += 1;
  }

  const listed = sitemapPaths();
  writeFileSync(join(dist, "sitemap.xml"), sitemapXml(listed));
  writeFileSync(join(dist, "robots.txt"), robotsTxt(SITE_URL));
  console.log(`Prerendered ${count} pages and a sitemap with ${listed.length} addresses.`);
} finally {
  await vite.close();
}
