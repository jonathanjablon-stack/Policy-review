"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "src/ui/app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "src/index.html"), "utf8");

test("source-document text is rendered through textContent", () => {
  assert.match(app, /sourceText\.textContent/);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
});

test("application declares no telemetry or generative AI endpoint", () => {
  assert.doesNotMatch(app + html, /analytics|segment\.com|mixpanel|openai\.com\/v1|anthropic|generativelanguage/i);
});

test("all mandatory workflows and exports are present", () => {
  for (const marker of ["standalone", "plan-policy", "renewal", "proposal-policy", "Executive Word", "Detailed Word", "Excel matrix", "Save session JSON"]) assert.ok(html.includes(marker), marker);
});

test("file inputs accept PDF and DOCX and manual fallback remains available", () => {
  assert.match(html, /accept="\.pdf,\.docx/);
  assert.match(html, /Manual text fallback/);
});
