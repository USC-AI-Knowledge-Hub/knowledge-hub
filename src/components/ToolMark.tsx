import type { Tool } from "../data/types";
import { PixelMark } from "./PixelMark";

/**
 * A tool's mark everywhere on the site: its logo as retro pixel art on a tile.
 * Decorative; the tool's name is always shown beside it.
 */
export function ToolMark({ tool, size = 48 }: { tool: Pick<Tool, "id" | "monogram">; size?: number }) {
  return <PixelMark tool={tool} size={size} />;
}
