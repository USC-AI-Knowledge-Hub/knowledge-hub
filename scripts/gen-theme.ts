/**
 * Generates Material 3 color tokens (light, dark, and high-contrast variants)
 * from the USC brand colors using Google's material-color-utilities.
 *
 *   npm run theme
 *
 * Output: src/styles/tokens.css — never edit that file by hand.
 */
import { writeFileSync } from "node:fs";
import {
  argbFromHex,
  hexFromArgb,
  Hct,
  Blend,
  DynamicScheme,
  Variant,
  MaterialDynamicColors,
  TonalPalette,
} from "@material/material-color-utilities";
import { clusters } from "../src/data/toolMap";

const CARDINAL = "#990000";
const GOLD = "#FFCC00";

/** Difficulty palette: hue families picked for meaning, then harmonized to cardinal. */
const CUSTOM = {
  beginner: "#1B8A5A",
  intermediate: GOLD,
  advanced: "#5B3FD1",
};

const ROLES = [
  "primary", "onPrimary", "primaryContainer", "onPrimaryContainer",
  "secondary", "onSecondary", "secondaryContainer", "onSecondaryContainer",
  "tertiary", "onTertiary", "tertiaryContainer", "onTertiaryContainer",
  "error", "onError", "errorContainer", "onErrorContainer",
  "surface", "onSurface", "surfaceVariant", "onSurfaceVariant",
  "surfaceDim", "surfaceBright",
  "surfaceContainerLowest", "surfaceContainerLow", "surfaceContainer",
  "surfaceContainerHigh", "surfaceContainerHighest",
  "inverseSurface", "inverseOnSurface", "inversePrimary",
  "outline", "outlineVariant", "shadow", "scrim",
  "primaryFixed", "primaryFixedDim", "onPrimaryFixed", "onPrimaryFixedVariant",
  "tertiaryFixed", "tertiaryFixedDim", "onTertiaryFixed", "onTertiaryFixedVariant",
] as const;

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());

function schemeVars(scheme: DynamicScheme): string[] {
  const out: string[] = [];
  for (const role of ROLES) {
    const color = (MaterialDynamicColors as unknown as Record<string, { getArgb(s: DynamicScheme): number }>)[role];
    out.push(`--md-sys-color-${kebab(role)}: ${hexFromArgb(color.getArgb(scheme))};`);
  }
  return out;
}

function customVars(isDark: boolean): string[] {
  const out: string[] = [];
  const source = argbFromHex(CARDINAL);
  for (const [name, hex] of Object.entries(CUSTOM)) {
    const harmonized = Blend.harmonize(argbFromHex(hex), source);
    const hct = Hct.fromInt(harmonized);
    const palette = TonalPalette.fromHueAndChroma(hct.hue, Math.max(hct.chroma, 48));
    const tones = isDark
      ? { color: 80, on: 20, container: 30, onContainer: 90 }
      : { color: 40, on: 100, container: 90, onContainer: 10 };
    out.push(`--kh-${name}: ${hexFromArgb(palette.tone(tones.color))};`);
    out.push(`--kh-on-${name}: ${hexFromArgb(palette.tone(tones.on))};`);
    out.push(`--kh-${name}-container: ${hexFromArgb(palette.tone(tones.container))};`);
    out.push(`--kh-on-${name}-container: ${hexFromArgb(palette.tone(tones.onContainer))};`);
  }
  return out;
}

/**
 * Tool map categories. Each cluster's seed is harmonized to cardinal like the
 * difficulty colors. Several seeds share the red-to-purple arc, so the hues
 * are then spread: a fixed coordinate descent (1° steps, 30 passes) that keeps
 * each hue near its seed (general assistants are pinned) while pushing it at least MIN_HUE_GAP degrees from
 * every other category, and MIN_LEVEL_GAP from the three difficulty hues. Stable output.
 */
const MIN_HUE_GAP = 26;
/** Difficulty hues get a wider berth: a category must never read as a level. */
const MIN_LEVEL_GAP = 30;
const MAX_SHIFT = 90;

const hueDist = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

function spreadClusterHues(): { id: string; hue: number; chroma: number }[] {
  const source = argbFromHex(CARDINAL);
  const anchors = Object.values(CUSTOM).map((hex) => Hct.fromInt(Blend.harmonize(argbFromHex(hex), source)).hue);
  const items = clusters.map((c) => {
    const hct = Hct.fromInt(Blend.harmonize(argbFromHex(c.seed), source));
    return { id: c.id, seed: hct.hue, hue: hct.hue, chroma: hct.chroma };
  });
  const cost = (i: number, h: number) => {
    let c = 0.01 * hueDist(h, items[i].seed) ** 2;
    for (const a of anchors) c += Math.max(0, MIN_LEVEL_GAP - hueDist(h, a)) ** 2;
    let nearest = 180;
    items.forEach((o, j) => {
      if (j === i) return;
      const d = hueDist(h, o.hue);
      nearest = Math.min(nearest, d);
      c += Math.max(0, MIN_HUE_GAP - d) ** 2;
    });
    for (const a of anchors) nearest = Math.min(nearest, hueDist(h, a));
    // Between two equally close options, prefer the one with more room around it.
    return c - 1.5 * Math.min(nearest, 60);
  };
  for (let pass = 0; pass < 30; pass++) {
    items.forEach((it, i) => {
      // General assistants stay on their seed: the other clusters link to them, and red reads as the Hub's own.
      if (it.id === "assistants") return;
      let best = it.hue;
      let bestCost = cost(i, it.hue);
      for (let d = -MAX_SHIFT; d <= MAX_SHIFT; d++) {
        const h = (Math.round(it.seed) + d + 360) % 360;
        const c = cost(i, h);
        if (c < bestCost - 1e-9) [best, bestCost] = [h, c];
      }
      it.hue = best;
    });
  }
  return items.map(({ id, hue, chroma }) => ({ id, hue, chroma }));
}

const CLUSTER_HUES = spreadClusterHues();

function clusterVars(isDark: boolean, contrast: number): string[] {
  const out: string[] = [];
  for (const { id, hue, chroma } of CLUSTER_HUES) {
    // Low-chroma seeds (slate) keep a little color so the halo still reads as a hue.
    const palette = TonalPalette.fromHueAndChroma(hue, Math.min(Math.max(chroma, 40), 64));
    const tones = isDark
      ? { color: 80, container: contrast > 0 ? 25 : 30, onContainer: contrast > 0 ? 98 : 90 }
      : { color: contrast > 0 ? 30 : 45, container: 90, onContainer: contrast > 0 ? 5 : 10 };
    out.push(`--kh-cat-${id}: ${hexFromArgb(palette.tone(tones.color))};`);
    out.push(`--kh-cat-${id}-container: ${hexFromArgb(palette.tone(tones.container))};`);
    out.push(`--kh-on-cat-${id}-container: ${hexFromArgb(palette.tone(tones.onContainer))};`);
  }
  return out;
}

/**
 * Fidelity keeps cardinal true in primaryContainer. Three deliberate overrides:
 * secondary is a quiet cardinal-tinted neutral for selection states,
 * tertiary is USC gold (the default would be a computed blue complement), and
 * neutrals are pulled down to a whisper of cardinal so surfaces read as paper,
 * not pink.
 */
function block(isDark: boolean, contrast: number): string[] {
  const source = Hct.fromInt(argbFromHex(CARDINAL));
  const gold = Hct.fromInt(argbFromHex(GOLD));
  const scheme = new DynamicScheme({
    sourceColorHct: source,
    variant: Variant.FIDELITY,
    contrastLevel: contrast,
    isDark,
    specVersion: "2025",
    secondaryPalette: TonalPalette.fromHueAndChroma(source.hue, 14),
    tertiaryPalette: TonalPalette.fromHueAndChroma(gold.hue, gold.chroma),
    neutralPalette: TonalPalette.fromHueAndChroma(source.hue, 3),
    neutralVariantPalette: TonalPalette.fromHueAndChroma(source.hue, 7),
  });
  return [...schemeVars(scheme), ...customVars(isDark), ...clusterVars(isDark, contrast)];
}

const indent = (lines: string[], n = 2) => lines.map((l) => " ".repeat(n) + l).join("\n");

const css = `/* AUTO-GENERATED by scripts/gen-theme.ts — do not edit. Seed: USC Cardinal ${CARDINAL}. */
:root,
:root[data-theme="light"] {
  color-scheme: light;
${indent(block(false, 0))}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
${indent(block(true, 0), 4)}
  }
}

:root[data-theme="dark"] {
  color-scheme: dark;
${indent(block(true, 0))}
}

@media (prefers-contrast: more) {
  :root:not([data-theme="dark"]) {
${indent(block(false, 1), 4)}
  }
}
`;

console.log(CLUSTER_HUES.map((c) => `${c.id} ${Math.round(c.hue)}°`).join(", "));
writeFileSync(new URL("../src/styles/tokens.css", import.meta.url), css);
console.log("Wrote src/styles/tokens.css");
