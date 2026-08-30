"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const files = ["dist/StopLoss_Workbench_v16.0.0.html", "dist/index.html", "index.html"];
const buffers = files.map(file => fs.readFileSync(path.join(root, file)));
const hashes = buffers.map(buffer => crypto.createHash("sha256").update(buffer).digest("hex"));
if (new Set(hashes).size !== 1) throw new Error(`Production HTML artifacts differ: ${hashes.join(", ")}`);
const html = buffers[0].toString("utf8");
for (const required of ["Stop-Loss Policy Review Workbench", "Plan vs. stop-loss", "Prior vs. renewal", "Proposal vs. issued policy", "Policy at a Glance", "Save session JSON", "Executive Word", "Detailed Word", "Excel matrix"]) {
  if (!html.includes(required)) throw new Error(`Missing production feature marker: ${required}`);
}
if (/\.innerHTML\s*=/.test(html)) throw new Error("Production artifact assigns innerHTML; source-document rendering must stay text-safe.");
const rules = JSON.parse(fs.readFileSync(path.join(root, "rules/rule-library.json"), "utf8"));
if (rules.rules.length < 100) throw new Error(`Rule library unexpectedly small: ${rules.rules.length}`);
if (new Set(rules.rules.map(rule => rule.id)).size !== rules.rules.length) throw new Error("Duplicate rule IDs detected.");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "dist/MANIFEST.json"), "utf8"));
if (manifest.sha256 !== hashes[0]) throw new Error("Manifest hash does not match production artifact.");
process.stdout.write(`Verified ${files.length} identical artifacts, SHA-256 ${hashes[0]}, ${rules.rules.length} unique rules.\n`);
