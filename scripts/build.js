"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const rules = require(path.join(root, "rules/rule-library.js"));

let html = read("src/index.html");
html = html.replace('<link rel="stylesheet" href="styles.css">', `<style>\n${read("src/styles.css")}\n</style>`);

const sources = [
  ["../rules/rule-library.js", "rules/rule-library.js"],
  ["parsing/document-model.js", "src/parsing/document-model.js"],
  ["analysis/workbench-engine.js", "src/analysis/workbench-engine.js"],
  ["comparison/comparison-engine.js", "src/comparison/comparison-engine.js"],
  ["ui/app.js", "src/ui/app.js"]
];
for (const [reference, source] of sources) {
  html = html.replace(`<script src="${reference}"></script>`, `<script>\n${read(source)}\n</script>`);
}

const banner = `<!-- Stop-Loss Policy Review Workbench v16.0.0 | Rule library ${rules.version} | deterministic local processing -->`;
html = html.replace("<!doctype html>", `<!doctype html>\n${banner}`);

const dist = path.join(root, "dist");
fs.mkdirSync(dist, { recursive: true });
const outputs = [
  path.join(dist, "StopLoss_Workbench_v16.0.0.html"),
  path.join(dist, "index.html"),
  path.join(root, "index.html")
];
outputs.forEach(file => fs.writeFileSync(file, html));
fs.writeFileSync(path.join(root, "rules/rule-library.json"), `${JSON.stringify(rules, null, 2)}\n`);

const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const manifest = {
  version: "16.0.0",
  ruleLibraryVersion: rules.version,
  builtAt: process.env.SOURCE_DATE_EPOCH
    ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
    : "2026-08-30T00:00:00.000Z",
  artifact: "StopLoss_Workbench_v16.0.0.html",
  sha256: sha256(html),
  bytes: Buffer.byteLength(html),
  localProcessing: true,
  externalRuntimeDependencies: ["PDF.js 3.11.174", "Mammoth.js 1.8.0"],
  manualTextFallback: true
};
fs.writeFileSync(path.join(dist, "MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
