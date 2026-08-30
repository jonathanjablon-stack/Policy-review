"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const childProcess = require("node:child_process");

const root = path.resolve(__dirname, "..");
const files = ["dist/StopLoss_Workbench_v16.1.0.html", "dist/index.html", "index.html"];
const buffers = files.map(file => fs.readFileSync(path.join(root, file)));
const hashes = buffers.map(buffer => crypto.createHash("sha256").update(buffer).digest("hex"));
if (new Set(hashes).size !== 1) throw new Error(`Production HTML artifacts differ: ${hashes.join(", ")}`);
const html = buffers[0].toString("utf8");
for (const required of ["Stop-Loss Policy Review Workbench", "Plan vs. stop-loss", "Prior vs. renewal", "Proposal vs. issued policy", "Policy at a Glance", "Save session JSON", "Executive Word", "Detailed Word", "Excel matrix", "Automatic local OCR", "TESSERACT_VERSION = \"7.0.0\"", "OcrEngine.shouldOcrPage", "ocrSession.recognizePage"]) {
  if (!html.includes(required)) throw new Error(`Missing production feature marker: ${required}`);
}
if (/\.innerHTML\s*=/.test(html)) throw new Error("Production artifact assigns innerHTML; source-document rendering must stay text-safe.");
const rules = JSON.parse(fs.readFileSync(path.join(root, "rules/rule-library.json"), "utf8"));
if (rules.rules.length < 100) throw new Error(`Rule library unexpectedly small: ${rules.rules.length}`);
if (new Set(rules.rules.map(rule => rule.id)).size !== rules.rules.length) throw new Error("Duplicate rule IDs detected.");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "dist/MANIFEST.json"), "utf8"));
if (manifest.sha256 !== hashes[0]) throw new Error("Manifest hash does not match production artifact.");
if (!manifest.ocr || !manifest.ocr.automatic || !manifest.ocr.repositoryLocalAssets) throw new Error("Release manifest does not certify automatic repository-local OCR.");

const vendorRoot = path.join(root, "vendor");
const vendorManifest = JSON.parse(fs.readFileSync(path.join(vendorRoot, "MANIFEST.json"), "utf8"));
for (const entry of vendorManifest.files) {
  const content = fs.readFileSync(path.join(vendorRoot, entry.path));
  if (content.length !== entry.bytes) throw new Error(`Vendor byte count mismatch: ${entry.path}`);
  if (crypto.createHash("sha256").update(content).digest("hex") !== entry.sha256) throw new Error(`Vendor hash mismatch: ${entry.path}`);
}

const packagePath = path.join(root, "dist", manifest.offlinePackage);
const packageContent = fs.readFileSync(packagePath);
if (packageContent.length !== manifest.offlinePackageBytes) throw new Error("Offline-package byte count does not match the release manifest.");
if (crypto.createHash("sha256").update(packageContent).digest("hex") !== manifest.offlinePackageSha256) throw new Error("Offline-package hash does not match the release manifest.");
childProcess.execFileSync("unzip", ["-tqq", packagePath], { stdio: "pipe" });
const entries = childProcess.execFileSync("unzip", ["-Z1", packagePath], { encoding: "utf8" });
for (const required of ["index.html", "README.md", "vendor/MANIFEST.json", "vendor/pdfjs/pdf.min.mjs", "vendor/pdfjs/pdf.worker.min.mjs", "vendor/tesseract/tesseract.min.js", "vendor/tesseract/worker.min.js", "vendor/tesseract/lang/eng.traineddata.gz"]) {
  if (!entries.split(/\r?\n/).includes(required)) throw new Error(`Offline package is missing ${required}`);
}
process.stdout.write(`Verified ${files.length} identical HTML artifacts, ${vendorManifest.files.length} vendor assets, offline package ${manifest.offlinePackageSha256}, and ${rules.rules.length} unique rules.\n`);
