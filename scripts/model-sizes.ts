/**
 * Checks the tutor's model registry against the Hugging Face API: for every
 * model and device variant, adds up the files the browser downloads (the
 * ONNX weights for that dtype, any external data files, and the config and
 * tokenizer files) and compares the total with the registry's size.
 *
 *   npm run model-sizes          print the table, fail if any size is off by > 15%
 *
 * Needs network access to huggingface.co (CI has it).
 */
import { MODELS, SIDE_FILES, onnxFile, type Device } from "../src/lib/tutor/registry";

const TOLERANCE = 0.15;
const API = "https://huggingface.co/api/models";

interface TreeEntry {
  type: "file" | "directory";
  path: string;
  size: number;
  lfs?: { size: number };
}

async function tree(repo: string, dir = ""): Promise<TreeEntry[]> {
  const url = `${API}/${repo}/tree/main${dir ? `/${dir}` : ""}`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, { headers: { "user-agent": "usc-ai-knowledge-hub/model-sizes" } });
    if (res.ok) return (await res.json()) as TreeEntry[];
    if (attempt >= 3 || res.status === 404) throw new Error(`${url}: HTTP ${res.status}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}

const sizeOf = (e: TreeEntry) => e.lfs?.size ?? e.size;
const mb = (bytes: number) => (bytes / 1e6).toFixed(1).padStart(7);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

let failed = false;
const rows: string[] = [];

for (const model of MODELS) {
  const [root, onnx] = await Promise.all([tree(model.repo), tree(model.repo, "onnx")]);
  const side = SIDE_FILES.map((f) => root.find((e) => e.path === f)).filter((e): e is TreeEntry => !!e);
  for (const [device, variant] of Object.entries(model.variants) as [Device, NonNullable<(typeof model.variants)[Device]>][]) {
    const name = onnxFile(variant.dtype);
    // The .onnx file plus external data (model_q4f16.onnx_data, model_q4f16.onnx_data_1, ...).
    const pattern = new RegExp(`^onnx/${escape(name)}(_data(_\\d+)?)?$`);
    const weights = onnx.filter((e) => e.type === "file" && pattern.test(e.path));
    if (!weights.some((e) => e.path === `onnx/${name}`)) {
      console.error(`✗ ${model.repo}: onnx/${name} not found. Available: ${onnx.map((e) => e.path.replace("onnx/", "")).join(", ")}`);
      failed = true;
      continue;
    }
    const files = [...weights, ...side];
    const actual = files.reduce((n, e) => n + sizeOf(e), 0);
    const expected = variant.mb * 1e6;
    const off = (expected - actual) / actual;
    const ok = Math.abs(off) <= TOLERANCE;
    if (!ok) failed = true;
    rows.push(
      `${ok ? "✓" : "✗"} ${model.name.padEnd(24)} ${device.padEnd(7)} ${variant.dtype.padEnd(6)} actual ${mb(actual)} MB  registry ${mb(expected)} MB  ${(off * 100).toFixed(1).padStart(6)}%`,
    );
    for (const f of files) rows.push(`    ${f.path.padEnd(36)} ${mb(sizeOf(f))} MB`);
  }
}

console.log(rows.join("\n"));
if (failed) {
  console.error(`\nA registry size in src/lib/tutor/registry.ts is off by more than ${TOLERANCE * 100}%, or a file is missing. Update it from the table above.`);
  process.exit(1);
}
console.log("\nEvery registry size is within 15% of what the browser downloads.");
