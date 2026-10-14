/**
 * The tool finder's catalog as the app sees it: the reviewed tools in the bundle, plus whatever the
 * daily discovery run added (public/data/discovered.json and taxonomy.json, read once at start-up).
 * If those files are missing or broken the site carries on with the reviewed tools alone.
 *
 * A small store rather than React context so plain functions (site search, the tutor's guide) can read
 * it too; components use `useCatalog()`.
 */
import { useSyncExternalStore } from "react";
import { STATIC_CATALOG, buildCatalog, sanitizeCategories, sanitizeDiscovered, type Catalog } from "../data/catalog";
import { tools } from "../data/tools";

let current: Catalog = STATIC_CATALOG;
const listeners = new Set<() => void>();

export const getCatalog = () => current;

export function setCatalog(next: Catalog) {
  current = next;
  listeners.forEach((l) => l());
}

export function useCatalog(): Catalog {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getCatalog,
    () => STATIC_CATALOG,
  );
}

/** Build a catalog from the two parsed files. Anything unreadable is ignored. */
export function catalogFrom(discovered: unknown, taxonomy: unknown): Catalog {
  return buildCatalog(tools, sanitizeDiscovered(discovered), sanitizeCategories(taxonomy));
}

export async function loadCatalog(): Promise<void> {
  const get = (name: string) =>
    fetch(`${import.meta.env.BASE_URL}data/${name}`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  const [discovered, taxonomy] = await Promise.all([get("discovered.json"), get("taxonomy.json")]);
  if (discovered || taxonomy) setCatalog(catalogFrom(discovered, taxonomy));
}
