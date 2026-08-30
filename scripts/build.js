"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const childProcess = require("node:child_process");

const root = path.resolve(__dirname, "..");
const version = "16.1.0";
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const rules = require(path.join(root, "rules/rule-library.js"));
const sha256 = value => crypto.createHash("sha256").update(value).digest("hex");
const builtAt = process.env.SOURCE_DATE_EPOCH
  ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
  : "2026-08-30T00:00:00.000Z";

function walkFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(absolute) : [absolute];
  }).sort();
}

let html = read("src/index.html");
html = html.replace('<link rel="stylesheet" href="styles.css">', `<style>\n${read("src/styles.css")}\n</style>`);

const sources = [
  ["../rules/rule-library.js", "rules/rule-library.js"],
  ["parsing/document-model.js", "src/parsing/document-model.js"],
  ["parsing/ocr-engine.js", "src/parsing/ocr-engine.js"],
  ["analysis/workbench-engine.js", "src/analysis/workbench-engine.js"],
  ["comparison/comparison-engine.js", "src/comparison/comparison-engine.js"],
  ["ui/app.js", "src/ui/app.js"]
];
for (const [reference, source] of sources) {
  html = html.replace(`<script src="${reference}"></script>`, `<script>\n${read(source)}\n</script>`);
}

const banner = `<!-- Stop-Loss Policy Review Workbench v${version} | Rule library ${rules.version} | deterministic local processing with automatic local OCR -->`;
html = html.replace("<!doctype html>", `<!doctype html>\n${banner}`);

const dist = path.join(root, "dist");
fs.mkdirSync(dist, { recursive: true });
const outputs = [
  path.join(dist, `StopLoss_Workbench_v${version}.html`),
  path.join(dist, "index.html"),
  path.join(root, "index.html")
];
outputs.forEach(file => fs.writeFileSync(file, html));
fs.writeFileSync(path.join(root, "rules/rule-library.json"), `${JSON.stringify(rules, null, 2)}\n`);

const vendorRoot = path.join(root, "vendor");
const vendorManifestPath = path.join(vendorRoot, "MANIFEST.json");
const vendorFiles = walkFiles(vendorRoot).filter(file => file !== vendorManifestPath);
const vendorManifest = {
  schemaVersion: "1.0.0",
  generatedAt: builtAt,
  components: [
    { name: "PDF.js", version: "5.6.205", purpose: "Local PDF parsing and page rendering", license: "Apache-2.0" },
    { name: "Tesseract.js", version: "7.0.0", purpose: "Local browser OCR orchestration", license: "Apache-2.0" },
    { name: "tesseract.js-core", version: "7.0.0", purpose: "Tesseract WebAssembly runtime", license: "Apache-2.0" },
    { name: "tessdata_fast eng", version: "5.x", purpose: "English OCR language model", license: "Apache-2.0" }
  ],
  files: vendorFiles.map(file => {
    const content = fs.readFileSync(file);
    return { path: path.relative(vendorRoot, file).replace(/\\/g, "/"), bytes: content.length, sha256: sha256(content) };
  })
};
fs.writeFileSync(vendorManifestPath, `${JSON.stringify(vendorManifest, null, 2)}\n`);

const packageName = `StopLoss_Workbench_v${version}-offline.zip`;
const packagePath = path.join(dist, packageName);
const staging = path.join(dist, `.offline-package-v${version}`);
fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });
fs.copyFileSync(path.join(root, "index.html"), path.join(staging, "index.html"));
fs.copyFileSync(path.join(root, "docs/OFFLINE_OCR_PACKAGE.md"), path.join(staging, "README.md"));
fs.cpSync(vendorRoot, path.join(staging, "vendor"), { recursive: true });
const packageFiles = walkFiles(staging);
const fixedTime = new Date(builtAt);
packageFiles.forEach(file => fs.utimesSync(file, fixedTime, fixedTime));
fs.rmSync(packagePath, { force: true });
childProcess.execFileSync("zip", ["-X", "-q", packagePath, ...packageFiles.map(file => path.relative(staging, file))], { cwd: staging });
fs.rmSync(staging, { recursive: true, force: true });
const packageContent = fs.readFileSync(packagePath);

const manifest = {
  version,
  ruleLibraryVersion: rules.version,
  builtAt,
  artifact: `StopLoss_Workbench_v${version}.html`,
  sha256: sha256(html),
  bytes: Buffer.byteLength(html),
  offlinePackage: packageName,
  offlinePackageSha256: sha256(packageContent),
  offlinePackageBytes: packageContent.length,
  localProcessing: true,
  pdfRuntime: "PDF.js 5.6.205 (repository-local)",
  ocr: { automatic: true, engine: "Tesseract.js 7.0.0", language: "eng", repositoryLocalAssets: true },
  externalRuntimeDependencies: ["Mammoth.js 1.8.0 (DOCX parsing only)"],
  manualTextFallback: true
};
fs.writeFileSync(path.join(dist, "MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
