import { XMLParser } from "fast-xml-parser";
import type { FeedItem } from "./types";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text", processEntities: true, htmlEntities: true });

const text = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === "object") return text((v as Record<string, unknown>)["#text"]);
  return "";
};

/** Plain text from a post's HTML: tags, entities and extra spaces gone. */
export function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

/** Addresses a post links to, in order, https only. */
export function linksIn(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const raw = m[1].replace(/&amp;/g, "&");
    try {
      const u = new URL(raw);
      if (u.protocol === "https:" && !out.includes(u.toString())) out.push(u.toString());
    } catch {
      /* A relative or broken link: no use for finding a site. */
    }
  }
  return out;
}

const dateOf = (v: unknown): string => {
  const s = text(v);
  const t = Date.parse(s);
  return Number.isNaN(t) ? "" : new Date(t).toISOString().slice(0, 10);
};

const linkOf = (v: unknown): string => {
  const list = Array.isArray(v) ? v : v == null ? [] : [v];
  // Atom: <link href="…" rel="alternate">. RSS: <link>…</link>.
  const objs = list.filter((l) => typeof l === "object") as Record<string, string>[];
  const alt = objs.find((l) => !l["@_rel"] || l["@_rel"] === "alternate") ?? objs[0];
  if (alt?.["@_href"]) return alt["@_href"];
  return text(list.find((l) => typeof l === "string") ?? list[0]).trim();
};

/** Reads an RSS 2.0, RSS 1.0 (RDF) or Atom feed. Items without a title or an https link are skipped. */
export function parseFeed(xml: string): FeedItem[] {
  const doc = parser.parse(xml);
  const raw = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? doc?.["rdf:RDF"]?.item ?? [];
  const entries: Record<string, unknown>[] = Array.isArray(raw) ? raw : [raw];
  const items: FeedItem[] = [];
  for (const e of entries) {
    if (!e || typeof e !== "object") continue;
    const title = stripHtml(text(e.title));
    const link = linkOf(e.link) || text(e.guid);
    const html = text(e["content:encoded"]) || text(e.content) || text(e.description) || text(e.summary);
    if (!title || !/^https:\/\//.test(link)) continue;
    items.push({
      title,
      link,
      date: dateOf(e.pubDate ?? e.published ?? e.updated ?? e["dc:date"]),
      summary: stripHtml(text(e.description) || text(e.summary) || html).slice(0, 600),
      links: linksIn(html).slice(0, 12),
    });
  }
  return items;
}
