/**
 * Retro 8-bit renditions of each tool's logo, used only to identify a tool
 * next to its name. Each logo is a 16×16 grid, one character per pixel:
 * "." is empty, any other character is a key into that logo's palette.
 * The outer ring of the grid is left for the tile's outline, so logos are
 * drawn in the 14×14 interior.
 *
 * Sources: shapes marked "Simple Icons" start from the official marks in
 * Simple Icons (CC0), rasterized by scripts/gen-pixel-logos.ts into
 * pixelLogos.simple.ts, some then touched up by hand here so they read at
 * 16 pixels. Everything else is a hand-drawn homage in the brand's colors,
 * or, where we don't know the logo, a pixel icon of what the tool does.
 * No other logo sources.
 *
 * Palette colors are fixed (not theme tokens): every logo sits on the same
 * light tile in both themes, so black marks stay visible in dark mode.
 */

export interface PixelLogo {
  grid: string[];
  palette: Record<string, string>;
  /** Where the design comes from, for editors. */
  source: "simple-icons" | "simple-icons, touched up" | "homage" | "icon";
}

const INK = "#1d1a1a";
const WHITE = "#ffffff";

/** Pads a 14×14 interior drawing to the full 16×16 grid. */
function inner(rows: string[]): string[] {
  const body = rows.map((r) => `.${r.padEnd(14, ".").slice(0, 14)}.`);
  while (body.length < 14) body.push(".".repeat(16));
  return [".".repeat(16), ...body.slice(0, 14), ".".repeat(16)];
}


export const PIXEL_LOGOS: Record<string, PixelLogo> = {
  /* ── General assistants ─────────────────────────────────────────────── */
  chatgpt: {
    // Homage to OpenAI's knot: a hexagonal rosette of swirling blades around an open eye.
    source: "homage",
    palette: { k: INK },
    grid: inner([
      ".....kkkk.....",
      "...kkkkk.kk...",
      ".kkkkkkk.kkkk.",
      "kk.kkkk.kkkkkk",
      "kkk.kkk.kk..kk",
      "kkk.kk..k.kk.k",
      "kkkk.....kkkkk",
      "kkkkk.....kkkk",
      "k.kk.k..kk.kkk",
      "kk..kk.kkk.kkk",
      "kkkkkk.kkkk.kk",
      ".kkkk.kkkkkkk.",
      "...kk.kkkkk...",
      ".....kkkk.....",
    ]),
  },
  claude: {
    // Simple Icons "claude", redrawn so the rays stay separate at 14 px.
    source: "simple-icons, touched up",
    palette: { a: "#D97757" },
    grid: inner([
      "......a..a....",
      "..a...a..a....",
      "...a..a.a...a.",
      "...aa.a.a..a..",
      "....a.aaa.a...",
      ".aa..aaaaa....",
      "...aaaaaaaaaaa",
      "aaaaaaaaaaa...",
      "....aaaaa..aa.",
      "...a.aaa.a....",
      "..a..a.a..aa..",
      ".a...a..a...a.",
      "....a...a.....",
      "....a....a....",
    ]),
  },
  gemini: {
    // Simple Icons "googlegemini": the four-point spark, drawn to fill the tile.
    source: "simple-icons, touched up",
    palette: { a: "#8E75B2", b: "#6B8FE8" },
    grid: inner([
      "......bb......",
      "......bb......",
      ".....bbbb.....",
      ".....bbba.....",
      "....bbbaaa....",
      "..bbbbaaaaaa..",
      "bbbbbaaaaaaaaa",
      "bbbbaaaaaaaaaa",
      "..bbaaaaaaaa..",
      "....aaaaaa....",
      ".....aaaa.....",
      ".....aaaa.....",
      "......aa......",
      "......aa......",
    ]),
  },
  copilot: {
    // Homage to Microsoft Copilot's multicolor pinwheel.
    source: "homage",
    palette: { b: "#1B6AE8", t: "#12A37F", o: "#F7852F", p: "#E0439A" },
    grid: inner([
      "..............",
      ".p.....bbbbbb.",
      ".pp....bbbbb..",
      ".ppp...bbbb...",
      ".pppp..bbb....",
      ".ppppp.bb.....",
      ".ppppppb......",
      "......otttttt.",
      ".....oo.ttttt.",
      "....ooo..tttt.",
      "...oooo...ttt.",
      "..ooooo....tt.",
      ".oooooo.....t.",
      "..............",
    ]),
  },

  /* ── Research and papers ────────────────────────────────────────────── */
  perplexity: {
    // Simple Icons "perplexity", redrawn: spine, diagonals and the frame.
    source: "simple-icons, touched up",
    palette: { a: "#1AA3B8" },
    grid: inner([
      ".a....aa....a.",
      "..a...aa...a..",
      "...a..aa..a...",
      ".aaaaaaaaaaaa.",
      ".a..a.aa.a..a.",
      ".a.a..aa..a.a.",
      ".aa...aa...aa.",
      ".a....aa....a.",
      ".aa...aa...aa.",
      ".a.a..aa..a.a.",
      ".aaaa.aa.aaaa.",
      "....a.aa.a....",
      "...a..aa..a...",
      "..a...aa...a..",
    ]),
  },
  elicit: {
    // A magnifier over a paper: what Elicit does. Not its logo.
    source: "icon",
    palette: { k: "#6B6360", l: "#B9AFA9", e: "#E0662F" },
    grid: inner([
      ".kkkkkkkk.....",
      ".k......k.....",
      ".k.llll.k.....",
      ".k......k.....",
      ".k.lll.eeee...",
      ".k....e....e..",
      ".k.l.e......e.",
      ".k...e......e.",
      ".k...e......e.",
      ".kkkk.e....e..",
      ".......eeeee..",
      "...........ee.",
      "............ee",
      ".............e",
    ]),
  },
  scispace: {
    // An open book with a spark: reading papers with AI help. Not its logo.
    source: "icon",
    palette: { u: "#6C47FF", s: "#F3B61F" },
    grid: inner([
      "...........s..",
      "..........sss.",
      "...........s..",
      "..............",
      ".uuu......uuu.",
      "u...uu..uu...u",
      "u.....uu.....u",
      "u.uu..uu..uu.u",
      "u.....uu.....u",
      "u.uu..uu..uu.u",
      "u.....uu.....u",
      ".uuu..uu..uuu.",
      "....uu..uu....",
      "..............",
    ]),
  },
  consensus: {
    // A speech bubble with a check: the agreement across studies. Not its logo.
    source: "icon",
    palette: { c: "#1A56DB", w: WHITE },
    grid: inner([
      "..............",
      "..cccccccccc..",
      ".cccccccccccc.",
      "ccccccccccwwcc",
      "cccccccccwwccc",
      "ccwwccccwwcccc",
      "cccwwccwwccccc",
      "ccccwwwwcccccc",
      "cccccwwccccccc",
      ".cccccccccccc.",
      "..cccccccccc..",
      "..ccc.........",
      "..cc..........",
      "..c...........",
    ]),
  },
  scite: {
    // Quote marks, green and red: citations that support or contrast. Not its logo.
    source: "icon",
    palette: { g: "#2E9E4F", r: "#D64545" },
    grid: inner([
      "..............",
      "..............",
      "..............",
      ".gggg....rrrr.",
      "gggggg..rrrrrr",
      "gggggg..rrrrrr",
      "gggggg..rrrrrr",
      ".ggggg...rrrrr",
      "....gg.....rr.",
      "...gg.....rr..",
      "..gg.....rr...",
      "..............",
    ]),
  },
  researchrabbit: {
    // A rabbit, in the app's green.
    source: "homage",
    palette: { g: "#2BA66B", k: INK },
    grid: inner([
      "...g.g........",
      "...g.g........",
      "..gg.g........",
      "..gg.gg.......",
      "..ggggg.......",
      ".gggkgg.......",
      "ggggggggggg...",
      ".gggggggggggg.",
      "..ggggggggggg.",
      "..gggggggggggg",
      "..gggggggggg..",
      "...gg....gg...",
      "..ggg...ggg...",
      "..............",
    ]),
  },
  "semantic-scholar": {
    // Simple Icons "semanticscholar": pages fanning into a check.
    source: "simple-icons, touched up",
    palette: { a: "#1857B6" },
    grid: inner([
      "..............",
      "..............",
      "..aaaaaaaaaa..",
      "...aa......a..",
      ".a..aaaaaa.a..",
      ".aa..aa...a...",
      "..aa..aa..a...",
      "...aa..aaa...a",
      "....aa..a...aa",
      ".....aaa...aa.",
      "......aa.aa...",
      ".......aaa....",
      "........a.....",
      "..............",
    ]),
  },

  /* ── Study and writing ──────────────────────────────────────────────── */
  notebooklm: {
    // Simple Icons "notebooklm": nested arches.
    source: "simple-icons, touched up",
    palette: { k: INK },
    grid: inner([
      "..............",
      "..............",
      ".....kkkk.....",
      "...kkkkkkkk...",
      "..kkk....kkk..",
      ".kk........kk.",
      ".kk..kkkk..kk.",
      "kk..kkkkkk..kk",
      "kk.kk....kk.kk",
      "kk.k......k.kk",
      "kk.k......k.kk",
      "kk.k......k.kk",
      "..............",
      "..............",
    ]),
  },
  otter: {
    // An otter's face.
    source: "homage",
    palette: { b: "#8A5A3B", c: "#F2DFC5", k: INK },
    grid: inner([
      "..............",
      "..bb......bb..",
      ".bbbbbbbbbbbb.",
      ".bbbbbbbbbbbb.",
      "bbbkbbbbbbkbbb",
      "bbbkbbbbbbkbbb",
      "bbbbccccccbbbb",
      "bbbccckkcccbbb",
      "bbcckcccckccbb",
      ".bbccccccccbb.",
      "..bbbccccbbb..",
      "....bbbbbb....",
      "..............",
      "..............",
    ]),
  },
  grammarly: {
    // Simple Icons "grammarly": the G in a speech bubble.
    source: "simple-icons, touched up",
    palette: { g: "#027E6F", w: WHITE },
    grid: inner([
      "....gggggg....",
      "..gggggggggg..",
      ".gggggggggggg.",
      ".gggwwwwwwggg.",
      "gggwwggggwwggg",
      "ggwwgggggggggg",
      "ggwwggggwwwwgg",
      "ggwwggggwwwwgg",
      "ggwwgggggwwggg",
      "gggwwgggwwgggg",
      "ggggwwwwwwggg.",
      "ggggggggggggg.",
      "gggggggggggg..",
      "gggggggggg....",
    ]),
  },
  quillbot: {
    // A quill, in QuillBot green.
    source: "homage",
    palette: { q: "#499557", d: "#2F6B3A" },
    grid: inner([
      "...........qqq",
      ".........qqqqq",
      "........qqqqdq",
      ".......qqqqdqq",
      "......qqqqdqqq",
      ".....qqqqdqqq.",
      "....qqqqdqqq..",
      "....qqqdqqq...",
      "...qqqdqqq....",
      "...qqdqq......",
      "...qdqq.......",
      "..dd..........",
      ".d............",
      "d.............",
    ]),
  },

  /* ── Code and data ──────────────────────────────────────────────────── */
  "github-copilot": {
    // Simple Icons "githubcopilot": the goggled head.
    source: "simple-icons, touched up",
    palette: { k: INK },
    grid: inner([
      "..............",
      "....kkkkkk....",
      "..kkkkkkkkkk..",
      ".kk..kkkk..kk.",
      ".k....kk....k.",
      ".k....kk....k.",
      "kkk..kkkk..kkk",
      "kkkkkk..kkkkkk",
      "kk.k......k.kk",
      "kk.k.k..k.k.kk",
      "kk.k.k..k.k.kk",
      ".kkk......kkk.",
      "...kkkkkkkk...",
      "..............",
    ]),
  },
  cursor: {
    // Simple Icons "cursor": the hexagon with its pointer facet.
    source: "simple-icons, touched up",
    palette: { k: INK, w: "#F4EFE8" },
    grid: inner([
      "......kk......",
      "....kkkkkk....",
      "..kkkkkkkkkk..",
      ".kkkkkkkkkkkk.",
      ".kwwwwwwwwwkk.",
      ".kkwwwwwwwkkk.",
      ".kkkwwwwwwkkk.",
      ".kkkkwwwwkkkk.",
      ".kkkkkwwwkkkk.",
      ".kkkkkkwwkkkk.",
      ".kkkkkkkwkkkk.",
      "..kkkkkkkkkk..",
      "....kkkkkk....",
      "......kk......",
    ]),
  },
  "claude-code": {
    // Claude Code's pixel critter, in Claude orange.
    source: "homage",
    palette: { a: "#D97757", k: INK },
    grid: inner([
      "..............",
      "..............",
      "..aaaaaaaaaa..",
      "..aaaaaaaaaa..",
      "..aakaaaakaa..",
      "..aakaaaakaa..",
      "aaaaaaaaaaaaaa",
      "aaaaaaaaaaaaaa",
      "..aaaaaaaaaa..",
      "..aaaaaaaaaa..",
      "..a.a....a.a..",
      "..a.a....a.a..",
      "..............",
      "..............",
    ]),
  },
  replit: {
    // Simple Icons "replit".
    source: "simple-icons, touched up",
    palette: { a: "#F26207" },
    grid: inner([
      "..............",
      "..aaaaa.......",
      "..aaaaa.......",
      "..aaaaa.......",
      "..aaaaa.......",
      "...aaaa.......",
      ".......aaaaa..",
      ".......aaaaa..",
      ".......aaaaa..",
      "...aaaa.......",
      "..aaaaa.......",
      "..aaaaa.......",
      "..aaaaa.......",
      "..aaaaa.......",
    ]),
  },
  julius: {
    // A bar chart with a trend line: data analysis. Not its logo.
    source: "icon",
    palette: { t: "#0F9D8A", o: "#F28C28", k: "#6B6360" },
    grid: inner([
      "..............",
      "............o.",
      "..........oo..",
      ".........o....",
      ".......oo..tt.",
      "......o....tt.",
      "....oo..tt.tt.",
      "...o....tt.tt.",
      ".oo..tt.tt.tt.",
      ".....tt.tt.tt.",
      "..tt.tt.tt.tt.",
      "..tt.tt.tt.tt.",
      "..tt.tt.tt.tt.",
      "kkkkkkkkkkkkkk",
    ]),
  },

  /* ── Slides and design ──────────────────────────────────────────────── */
  gamma: {
    // A pixel γ.
    source: "homage",
    palette: { v: "#7C3AED" },
    grid: inner([
      "..............",
      ".vv.......vv..",
      "..vv.....vv...",
      "..vv.....vv...",
      "...vv...vv....",
      "...vv...vv....",
      "....vv.vv.....",
      "....vvvvv.....",
      ".....vvv......",
      "....vv.vv.....",
      "....vv.vv.....",
      "....vvvvv.....",
      ".....vvv......",
      "..............",
    ]),
  },
  canva: {
    // Homage to Canva's teal-to-purple circle with its C.
    source: "homage",
    palette: { t: "#00C4CC", m: "#3E7BEF", p: "#7D2AE8", w: WHITE },
    grid: inner([
      "....tttttt....",
      "..ttttttttmm..",
      ".ttttttttmmmm.",
      ".ttttwwwwwmmm.",
      "ttttwwtmmwwmpp",
      "tttwwtmmmmmppp",
      "tttwwmmmmmpppp",
      "tttwwmmmmppppp",
      "tttwwmmmpppppp",
      "ttmmwwmpwwpppp",
      ".mmmmwwwwwppp.",
      ".mmmmpppppppp.",
      "..mmpppppppp..",
      "....pppppp....",
    ]),
  },
  napkin: {
    // A napkin with a diagram sketched on it.
    source: "homage",
    palette: { k: INK, w: WHITE, r: "#E0483E", g: "#C9BFB3" },
    grid: inner([
      "..............",
      ".kkkkkkkkkkkk.",
      ".kwwwwwwwwwwk.",
      ".kwrrrwwwwwwk.",
      ".kwrwrrrrwwwk.",
      ".kwrrrwwrwwwk.",
      ".kwwwwwrrrrwk.",
      ".kwwwwwrwwrwk.",
      ".kwwwwwrrrrwk.",
      ".kwwwwwwwwwkk.",
      ".kwwwwwwwwkgk.",
      ".kwwwwwwwkggk.",
      ".kkkkkkkkkkk..",
      "..............",
    ]),
  },

  /* ── Image, video and voice ─────────────────────────────────────────── */
  midjourney: {
    // Homage to Midjourney's sailboat.
    source: "homage",
    palette: { k: INK },
    grid: inner([
      "..............",
      ".......k......",
      "......kk......",
      ".....kkk......",
      "....kkkk.k....",
      "...kkkkk.kk...",
      "..kkkkkk.kkk..",
      ".kkkkkkk.kkkk.",
      "kkkkkkkk.kkkkk",
      "..............",
      "kkkkkkkkkkkkkk",
      ".kkkkkkkkkkkk.",
      "..kkkkkkkkkk..",
      "..............",
    ]),
  },
  runway: {
    // Homage to Runway's geometric R.
    source: "homage",
    palette: { k: INK },
    grid: inner([
      "..............",
      "..kkkkkkkk....",
      "..kkkkkkkkkk..",
      "..kkk....kkkk.",
      "..kkk.....kkk.",
      "..kkk.....kkk.",
      "..kkk....kkkk.",
      "..kkkkkkkkkk..",
      "..kkkkkkkkk...",
      "..kkk...kkkk..",
      "..kkk....kkkk.",
      "..kkk.....kkkk",
      "..kkk......kkk",
      "..............",
    ]),
  },
  "adobe-firefly": {
    // Homage to the Firefly app tile: "Ff" on dark red.
    source: "homage",
    palette: { d: "#3B0A0A", f: "#FF7A6B" },
    grid: inner([
      ".dddddddddddd.",
      "dddddddddddddd",
      "dddddddddddddd",
      "dddddddddddddd",
      "ddfffffdddffdd",
      "ddfddddddfdddd",
      "ddfdddddffffdd",
      "ddffffdddfdddd",
      "ddfddddddfdddd",
      "ddfddddddfdddd",
      "ddfddddddfdddd",
      "dddddddddddddd",
      "dddddddddddddd",
      ".dddddddddddd.",
    ]),
  },
  descript: {
    // A waveform and a text cursor: editing audio like a document. Not its logo.
    source: "icon",
    palette: { b: "#2D6BFF", k: INK },
    grid: inner([
      "..............",
      "............kk",
      ".......b.....k",
      ".......b.....k",
      ".....b.b.b...k",
      "...b.b.b.b.b.k",
      ".b.b.b.b.b.b.k",
      ".b.b.b.b.b.b.k",
      "...b.b.b.b.b.k",
      ".....b.b.b...k",
      ".......b.....k",
      ".......b.....k",
      "............kk",
      "..............",
    ]),
  },
  elevenlabs: {
    // Simple Icons "elevenlabs": the two bars.
    source: "simple-icons, touched up",
    palette: { a: INK },
    grid: inner([
      "..............",
      "....aa..aa....",
      "....aa..aa....",
      "....aa..aa....",
      "....aa..aa....",
      "....aa..aa....",
      "....aa..aa....",
      "....aa..aa....",
      "....aa..aa....",
      "....aa..aa....",
      "....aa..aa....",
      "....aa..aa....",
      "....aa..aa....",
      "..............",
    ]),
  },

  /* ── Automation ─────────────────────────────────────────────────────── */
  zapier: {
    // Zapier's app icon: the asterisk on orange. (Simple Icons ships the wordmark, which is mush at 16 px.)
    source: "homage",
    palette: { o: "#FF4F00", w: WHITE },
    grid: inner([
      ".oooooooooooo.",
      "oooooowwoooooo",
      "oowooowwooowoo",
      "ooowoowwoowooo",
      "oooowwwwwwoooo",
      "oooowwwwwwoooo",
      "owwwwwwwwwwwwo",
      "owwwwwwwwwwwwo",
      "oooowwwwwwoooo",
      "oooowwwwwwoooo",
      "ooowoowwoowooo",
      "oowooowwooowoo",
      "oooooowwoooooo",
      ".oooooooooooo.",
    ]),
  },
  n8n: {
    // Simple Icons "n8n": nodes branching, redrawn as rings that survive 16 px.
    source: "simple-icons, touched up",
    palette: { p: "#EA4B71" },
    grid: inner([
      "..............",
      "..........pp..",
      ".........p..p.",
      ".........p..p.",
      ".........ppp..",
      ".pp...pp.p....",
      "p..ppp..p.....",
      "p..ppp..p.....",
      ".pp...pp.p....",
      ".........ppp..",
      ".........p..p.",
      ".........p..p.",
      "..........pp..",
      "..............",
    ]),
  },
};
