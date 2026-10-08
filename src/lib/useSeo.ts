import { useEffect } from "react";
import { useLocation } from "react-router";
import { SITE_NAME, canonicalUrl, headTags, pageMeta } from "./seo";

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Keeps the tab title, description, canonical link and structured data in step with the page,
 * since the app changes pages without reloading. The build writes the same tags into each page's
 * HTML (scripts/prerender.ts) so search engines get them without running this.
 */
export function useSeo() {
  const { pathname } = useLocation();
  useEffect(() => {
    const meta = pageMeta(pathname);
    if (!meta) {
      document.title = `Page not found | ${SITE_NAME}`;
      setMeta("name", "robots", "noindex, follow");
      document.head.querySelector('link[rel="canonical"]')?.remove();
      document.head.querySelector("#seo-jsonld")?.remove();
      return;
    }
    document.title = meta.title;
    for (const t of headTags(meta)) setMeta(t.name ? "name" : "property", (t.name ?? t.property)!, t.content);
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonicalUrl(meta.path);
    // Replace the page's structured data with this page's. Earlier pages' data would be wrong here.
    document.head.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove());
    if (meta.jsonLd.length) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = "seo-jsonld";
      script.textContent = JSON.stringify(meta.jsonLd.length === 1 ? meta.jsonLd[0] : meta.jsonLd);
      document.head.appendChild(script);
    }
  }, [pathname]);
}
