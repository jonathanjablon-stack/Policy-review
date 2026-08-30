"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const OcrEngine = require("../src/parsing/ocr-engine.js");
const DocumentModel = require("../src/parsing/document-model.js");
const Engine = require("../src/analysis/workbench-engine.js");
const RuleLibrary = require("../rules/rule-library.js");

const GOOD_NATIVE_TEXT = "This policy page contains complete and readable contract language explaining covered benefits, claim administration, reimbursement requirements, deadlines, exclusions, and all other material provisions for the policyholder.";

test("automatic OCR quality gate accepts a substantive native text layer", () => {
  const decision = OcrEngine.shouldOcrPage(GOOD_NATIVE_TEXT);
  assert.equal(decision.shouldOCR, false);
  assert.equal(decision.nativeQuality.needsOCR, false);
});

test("automatic OCR quality gate catches blank, sparse, and garbled pages", () => {
  for (const text of ["", "SCHEDULE", "� � � @@@ ### $$$ %%"]) {
    const decision = OcrEngine.shouldOcrPage(text);
    assert.equal(decision.shouldOCR, true, JSON.stringify(decision));
    assert.ok(decision.reason.length > 0);
  }
});

test("reviewer can force OCR on a page with a good native text layer", () => {
  const decision = OcrEngine.shouldOcrPage(GOOD_NATIVE_TEXT, { forceAllPages: true });
  assert.equal(decision.shouldOCR, true);
  assert.match(decision.reason, /every PDF page/i);
});

test("OCR replaces inadequate native extraction only when it is stronger", () => {
  const recovered = OcrEngine.selectPageText("", { text: GOOD_NATIVE_TEXT, confidence: 91.7 });
  assert.equal(recovered.method, "ocr");
  assert.equal(recovered.ocrUsed, true);
  assert.equal(recovered.ocrConfidence, 91.7);

  const retained = OcrEngine.selectPageText(GOOD_NATIVE_TEXT, { text: "illegible", confidence: 12 });
  assert.equal(retained.method, "native");
  assert.equal(retained.ocrUsed, false);
});

test("OCR provenance and page confidence flow into facts and findings", () => {
  const doc = DocumentModel.parseDocument({
    id: "ocr-policy",
    name: "ocr-policy.pdf",
    pages: [{
      number: 1,
      text: "SCHEDULE OF INSURANCE\nSpecific Attachment Point: $175,000. Experimental treatment is excluded under this policy. Claims must be administered according to the complete reimbursement, eligibility, and notice provisions stated in the contract.",
      nativeText: "",
      extractionMethod: "ocr",
      ocr: { attempted: true, used: true, confidence: 55.4, reason: "blank native page", engine: "Tesseract.js 7.0.0", elapsedMs: 1200, renderedDpi: 220 }
    }]
  });
  assert.deepEqual(doc.health.ocrPages, [1]);
  assert.equal(doc.health.pages[0].status, "Readable (OCR)");
  assert.equal(doc.health.pages[0].ocrEngine, "Tesseract.js 7.0.0");

  const result = Engine.analyzeMatter([doc], RuleLibrary, "standalone");
  const fact = result.facts.find(item => item.fieldId === "specific_attachment");
  assert.equal(fact.extractionMethod, "ocr");
  assert.equal(fact.ocrConfidence, 55.4);
  assert.equal(fact.confidence, "Moderate");

  const occurrence = result.findings.flatMap(item => item.occurrences).find(item => item.sourceDocument === "ocr-policy.pdf");
  assert.equal(occurrence.extractionMethod, "ocr");
  assert.equal(occurrence.ocrConfidence, 55.4);
  assert.equal(occurrence.confidence, "Low");
});

test("a page still blank after OCR remains unresolved", () => {
  const doc = DocumentModel.parseDocument({
    id: "unresolved-scan",
    name: "unresolved-scan.pdf",
    pages: [{ number: 1, text: "", nativeText: "", extractionMethod: "native", ocr: { attempted: true, used: false, confidence: 0, error: "recognition failed" } }]
  });
  assert.deepEqual(doc.health.unreadablePages, [1]);
  assert.deepEqual(doc.health.ocrFailedPages, [1]);
  assert.equal(doc.health.pages[0].status, "OCR failed");
  const result = Engine.analyzeMatter([doc], RuleLibrary, "standalone");
  assert.ok(result.completeness.every(row => row.status === "Unable to determine"));
  assert.match(result.completeness[0].rationale, /after automatic local OCR/i);
});
