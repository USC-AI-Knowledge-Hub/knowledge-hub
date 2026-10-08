/**
 * Draws public/og.png (the preview image shown when a page is shared), public/favicon.png and
 * public/icon-512.png (the install icon) from the brand shapes. Run `npm run brand-images` after changing the colors or wording here.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const pub = join(import.meta.dirname, "..", "public");
const svg = readFileSync(join(pub, "favicon.svg"), "utf8").replace(/<svg /, '<svg width="100%" height="100%" ');

const card = `<!doctype html><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  body { margin: 0; width: 1200px; height: 630px; background: #990000; color: #fff; font-family: "Helvetica Neue", Arial, "Liberation Sans", sans-serif; display: flex; align-items: center; padding: 0 96px; gap: 72px; }
  .logo { width: 300px; height: 300px; flex: none; background: #fff; border-radius: 72px; padding: 36px; }
  h1 { font-size: 84px; line-height: 1.04; margin: 0 0 28px; letter-spacing: -1px; }
  p { font-size: 33px; line-height: 1.3; margin: 0; color: #FFE7A0; }
  .bar { width: 120px; height: 10px; background: #FFCC00; margin: 0 0 28px; border-radius: 5px; }
</style>
<div class="logo">${svg}</div>
<div><div class="bar"></div><h1>USC AI Knowledge Hub</h1><p>Learn AI. Use AI. Understand what's next.</p><p style="margin-top:20px;color:#fff;font-size:30px">Guides for students, professors and researchers</p></div>`;

const icon = `<!doctype html><meta charset="utf-8"><style>body{margin:0;width:192px;height:192px;background:#fff}</style>${svg}`;

const big = `<!doctype html><meta charset="utf-8"><style>body{margin:0;width:512px;height:512px;background:#fff;display:grid;place-items:center}div{width:384px;height:384px}</style><div>${svg}</div>`;

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
const page = await browser.newPage();
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(card);
writeFileSync(join(pub, "og.png"), await page.screenshot());
await page.setViewportSize({ width: 192, height: 192 });
await page.setContent(icon);
writeFileSync(join(pub, "favicon.png"), await page.screenshot());
await page.setViewportSize({ width: 512, height: 512 });
await page.setContent(big);
writeFileSync(join(pub, "icon-512.png"), await page.screenshot());
await browser.close();
console.log("Wrote public/og.png, public/favicon.png and public/icon-512.png");
