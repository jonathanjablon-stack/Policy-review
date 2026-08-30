"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

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

test("PDF parsing and OCR use repository-local runtime assets", () => {
  assert.match(html, /Automatic local OCR/);
  assert.match(html, /parsing\/ocr-engine\.js/);
  assert.match(app, /import\(assetUrl\("pdfjs\/pdf\.min\.mjs"\)\)/);
  assert.match(app, /OcrEngine\.shouldOcrPage/);
  assert.match(app, /ocrSession\.recognizePage/);
  assert.doesNotMatch(html, /cdnjs[^"']*pdf|unpkg[^"']*pdf|jsdelivr[^"']*pdf/i);
});

test("vendored OCR engine, WebAssembly cores, English model, and licenses are present", () => {
  const required = [
    ["vendor/tesseract/tesseract.min.js", 50000],
    ["vendor/tesseract/worker.min.js", 100000],
    ["vendor/tesseract/core/tesseract-core-lstm.wasm.js", 3000000],
    ["vendor/tesseract/core/tesseract-core-simd-lstm.wasm.js", 3000000],
    ["vendor/tesseract/core/tesseract-core-relaxedsimd-lstm.wasm.js", 3000000],
    ["vendor/tesseract/lang/eng.traineddata.gz", 1000000],
    ["vendor/tesseract/LICENSE.tesseract-js.md", 1000],
    ["vendor/pdfjs/pdf.min.mjs", 300000],
    ["vendor/pdfjs/pdf.worker.min.mjs", 1000000],
    ["vendor/pdfjs/LICENSE.pdfjs", 1000]
  ];
  for (const [relative, minimumBytes] of required) {
    const stat = fs.statSync(path.join(root, relative));
    assert.ok(stat.isFile(), relative);
    assert.ok(stat.size > minimumBytes, `${relative} is unexpectedly small`);
  }
  const language = zlib.gunzipSync(fs.readFileSync(path.join(root, "vendor/tesseract/lang/eng.traineddata.gz")));
  assert.ok(language.length > 3000000, "English trained-data payload is unexpectedly small");
});

test("OCR implementation declares no remote recognition endpoint", () => {
  const ocr = fs.readFileSync(path.join(root, "src/parsing/ocr-engine.js"), "utf8");
  assert.doesNotMatch(ocr, /https?:\/\/|fetch\s*\(|XMLHttpRequest|WebSocket/);
  assert.match(ocr, /TESSERACT_VERSION = "7\.0\.0"/);
});
