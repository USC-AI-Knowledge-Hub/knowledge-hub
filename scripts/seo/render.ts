import { canonicalUrl, headTags, type Block, type PageMeta } from "../../src/lib/seo";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function blockHtml(b: Block): string {
  if ("items" in b) return `<${b.kind}>${b.items.map((i) => `<li>${esc(i)}</li>`).join("")}</${b.kind}>`;
  return `<${b.kind}>${esc(b.text)}</${b.kind}>`;
}

/** The page's text as plain HTML. The app replaces it as soon as it starts; crawlers and no-script visitors keep it. */
export function bodyHtml(meta: PageMeta, base: string): string {
  const href = (to: string) => esc(base + to.replace(/^\//, ""));
  const links = meta.links.length
    ? `<nav aria-label="Related pages"><ul>${meta.links.map((l) => `<li><a href="${href(l.to)}">${esc(l.label)}</a></li>`).join("")}</ul></nav>`
    : "";
  return `<main class="prerender"><h1>${esc(meta.heading)}</h1>${meta.content.map(blockHtml).join("")}${links}</main>`;
}

/** The title, description, canonical link, social tags and structured data for a page. */
export function headHtml(meta: PageMeta): string {
  const tags = headTags(meta).map((t) => `<meta ${t.name ? `name="${t.name}"` : `property="${t.property}"`} content="${esc(t.content)}" />`);
  const ld = meta.jsonLd.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`);
  return [`<title>${esc(meta.title)}</title>`, ...tags, `<link rel="canonical" href="${canonicalUrl(meta.path)}" />`, ...ld].join("\n    ");
}

/** Fills the built index.html with one page's head tags and text. */
export function renderPage(template: string, meta: PageMeta, base: string): string {
  const root = '<div id="root"></div>';
  if (!template.includes(root) || !template.includes("</head>")) throw new Error("index.html doesn't have the expected root element and head.");
  return template
    .replace(/<title>[\s\S]*?<\/title>\s*/, "")
    .replace(/<meta name="description"[^>]*>\s*/, "")
    .replace("</head>", () => `${headHtml(meta)}\n  </head>`)
    .replace(root, () => `<div id="root">${bodyHtml(meta, base)}</div>`);
}

export function sitemapXml(paths: string[]): string {
  const urls = paths.map((p) => `  <url><loc>${esc(canonicalUrl(p))}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export const robotsTxt = (siteUrl: string) => `User-agent: *\nAllow: /\nDisallow: /search\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
