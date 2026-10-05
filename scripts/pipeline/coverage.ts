import { tools } from "../../src/data/tools";
import type { Video } from "../../src/data/types";
import { SETTINGS } from "./config";

/** Tools the library barely covers. They get the evergreen search and filters (see SETTINGS.sparseTool). */
export function sparseTools(videos: Pick<Video, "tools">[]): Set<string> {
  const count = new Map<string, number>();
  for (const v of videos) for (const t of v.tools) count.set(t, (count.get(t) ?? 0) + 1);
  return new Set(tools.filter((t) => (count.get(t.id) ?? 0) < SETTINGS.sparseTool).map((t) => t.id));
}
