import { existsSync, readFileSync } from "node:fs";
import { buildCatalog, sanitizeCategories, sanitizeDiscovered } from "../../src/data/catalog";
import { tools as reviewed } from "../../src/data/tools";

/** What the pipeline searches for and tags: the reviewed tools plus the ones daily discovery listed. */
export interface PipelineTool {
  id: string;
  name: string;
  queries: string[];
  match: string[];
  exclude: string[];
}

const DATA = new URL("../../public/data/", import.meta.url);
const read = (name: string): unknown => {
  try {
    const url = new URL(name, DATA);
    return existsSync(url) ? JSON.parse(readFileSync(url, "utf8")) : null;
  } catch {
    return null;
  }
};

/**
 * Reviewed tools first, then discovered ones. A broken or missing discovery file just means no discovered tools.
 * A discovered tool that discovery couldn't file in any category isn't used, unless an editor added it: those are
 * mostly generic words mistaken for products ("Businesses", "Playground"), and tagging with them filled the
 * library with off-topic videos.
 */
export function loadPipelineTools(): { all: PipelineTool[]; discovered: PipelineTool[] } {
  const catalog = buildCatalog(reviewed, sanitizeDiscovered(read("discovered.json")), sanitizeCategories(read("taxonomy.json")));
  const all: PipelineTool[] = catalog.tools
    .filter((t) => t.reviewed || t.tasks.length > 0 || t.origin === "editor")
    .map((t) => ({ id: t.id, name: t.name, queries: t.queries, match: t.match, exclude: t.exclude ?? [] }));
  return { all, discovered: all.filter((t) => !catalog.toolById.get(t.id)?.reviewed) };
}
