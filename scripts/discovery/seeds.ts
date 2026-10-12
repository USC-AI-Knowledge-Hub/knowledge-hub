import type { DiscoveredTool } from "../../src/data/types";
import { toDiscoveredTool } from "./build-tool";

/**
 * Tools added by hand to get the catalog started where it was thin. They are listed like any
 * discovered tool (the site marks them "not reviewed yet"), are filed by the same classifier, and are
 * never expired. Anything the daily run finds on its own doesn't need to be here. Addresses are
 * checked every month; if one goes dead the link is dropped, not left broken.
 */
interface Seed {
  name: string;
  maker: string;
  url: string;
  bestFor: string;
  kind?: "tool" | "model";
}

export const SEEDS: Seed[] = [
  { name: "Higgsfield", maker: "Higgsfield", url: "https://higgsfield.ai/", bestFor: "An AI video and image creation platform with camera-motion controls for short cinematic clips." },
  { name: "Google Flow", maker: "Google", url: "https://labs.google/flow", bestFor: "Google's AI filmmaking tool for generating and editing video scenes, built on its Veo video model." },
  { name: "Veo", maker: "Google DeepMind", url: "https://deepmind.google/models/veo/", bestFor: "Google DeepMind's text-to-video generation model.", kind: "model" },
  { name: "Sora", maker: "OpenAI", url: "https://sora.com/", bestFor: "OpenAI's text-to-video generation model and app." },
  { name: "Kling", maker: "Kuaishou", url: "https://klingai.com/", bestFor: "An AI video generator that makes clips from text prompts or still images." },
  { name: "Seedance", maker: "ByteDance", url: "https://seed.bytedance.com/", bestFor: "ByteDance's video generation model for short clips from text or images.", kind: "model" },
  { name: "Luma Dream Machine", maker: "Luma AI", url: "https://lumalabs.ai/dream-machine", bestFor: "An AI video generator from Luma AI that turns text and images into video." },
  { name: "Pika", maker: "Pika", url: "https://pika.art/", bestFor: "An AI video generator for turning text and images into short, stylised clips." },
  { name: "Hailuo", maker: "MiniMax", url: "https://hailuoai.video/", bestFor: "MiniMax's AI video generator for text-to-video and image-to-video clips." },
  { name: "Unity AI", maker: "Unity", url: "https://unity.com/ai", bestFor: "Unity's AI assistant and generators built into the Unity game engine for game development." },
  { name: "Autodesk AI", maker: "Autodesk", url: "https://www.autodesk.com/", bestFor: "Autodesk's AI features across its design, 3D and engineering software for CAD and product design." },
  { name: "Meshy", maker: "Meshy", url: "https://www.meshy.ai/", bestFor: "Turns text prompts and images into 3D models and 3D assets." },
  { name: "Tripo", maker: "VAST", url: "https://www.tripo3d.ai/", bestFor: "Generates 3D models from text or images for games and design." },
  { name: "Suno", maker: "Suno", url: "https://suno.com/", bestFor: "An AI music generator that makes songs with vocals from a text prompt." },
  { name: "Udio", maker: "Udio", url: "https://www.udio.com/", bestFor: "An AI music generator that composes songs from a text prompt." },
  { name: "Harvey", maker: "Harvey", url: "https://www.harvey.ai/", bestFor: "An AI assistant for legal work such as contract review and legal research." },
  { name: "OpenEvidence", maker: "OpenEvidence", url: "https://www.openevidence.com/", bestFor: "An AI search tool that answers medical questions with citations from the clinical literature." },
];

/** The seeds as catalog entries, not yet filed. `today` is the first and last day they were seen. */
export function seedTools(today: string): DiscoveredTool[] {
  return SEEDS.map((s) =>
    toDiscoveredTool({
      id: s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: s.name,
      maker: s.maker,
      url: s.url,
      urlKind: "site",
      kind: s.kind ?? "tool",
      bestFor: s.bestFor,
      tasks: [],
      evidence: [],
      firstSeen: today,
      lastSeen: today,
      origin: "editor",
    }),
  );
}
