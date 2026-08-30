"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const crypto = require("node:crypto");
const DocumentModel = require("../src/parsing/document-model.js");
const OcrEngine = require("../src/parsing/ocr-engine.js");
const Engine = require("../src/analysis/workbench-engine.js");
const Comparison = require("../src/comparison/comparison-engine.js");
const RuleLibrary = require("../rules/rule-library.js");

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function findFile(directory, pattern, label) {
  const matches = fs.readdirSync(directory).filter(name => pattern.test(name));
  if (matches.length !== 1) throw new Error(`${label}: expected one matching file, found ${matches.length}.`);
  return path.join(directory, matches[0]);
}

async function loadPdfJs() {
  if (typeof Promise.withResolvers !== "function") {
    Promise.withResolvers = function withResolvers() {
      let resolve;
      let reject;
      const promise = new Promise((accept, decline) => { resolve = accept; reject = decline; });
      return { promise, resolve, reject };
    };
  }
  if (typeof Uint8Array.prototype.toHex !== "function") {
    Object.defineProperty(Uint8Array.prototype, "toHex", { value() { return Buffer.from(this).toString("hex"); }, configurable: true });
  }
  // PDF.js's browser build checks these constructors at module load. This
  // calibration path extracts text only and never invokes their drawing APIs.
  if (typeof DOMMatrix === "undefined") global.DOMMatrix = class DOMMatrix {};
  if (typeof ImageData === "undefined") global.ImageData = class ImageData {};
  if (typeof Path2D === "undefined") global.Path2D = class Path2D {};
  const pdfModule = path.resolve(__dirname, "../vendor/pdfjs/pdf.min.mjs");
  const pdfjs = await import(pathToFileURL(pdfModule).href);
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(path.resolve(__dirname, "../vendor/pdfjs/pdf.worker.min.mjs")).href;
  return pdfjs;
}

async function parsePdf(pdfjs, file, id, role, sequence) {
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(fs.readFileSync(file)),
    cMapUrl: `${pathToFileURL(path.resolve(__dirname, "../vendor/pdfjs/cmaps")).href}/`,
    cMapPacked: true,
    wasmUrl: `${pathToFileURL(path.resolve(__dirname, "../vendor/pdfjs/wasm")).href}/`
  });
  const pdf = await loadingTask.promise;
  const pages = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = DocumentModel.reconstructPdfLines(content.items);
      pages.push({ number: pageNumber, text, nativeText: text, extractionMethod: "native", ocr: { attempted: false, used: false } });
      page.cleanup();
    }
  } finally {
    await pdf.destroy();
  }
  return DocumentModel.parseDocument({ id, name: path.basename(file), pages, role, sequence });
}

function fact(analysis, fieldId, contextLabel, value) {
  return analysis.facts.find(item => item.fieldId === fieldId && (!contextLabel || item.contextLabel === contextLabel) && (!value || item.value === value));
}

function financial(comparison, fieldId, contextLabel) {
  return comparison.financialTerms.find(item => item.fieldId === fieldId && item.contextLabel === contextLabel);
}

function pass(checks) {
  return Object.values(checks).every(Boolean);
}

async function main() {
  const corpusDir = path.resolve(argument("--corpus-dir") || "");
  if (!argument("--corpus-dir") || !fs.statSync(corpusDir, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error("Usage: node scripts/calibrate-corpus.js --corpus-dir /absolute/path/to/materialized-corpus");
  }

  const files = {
    policy: findFile(corpusDir, /^Crowne Management_ LLC 8-1-25 Policy .*\.pdf$/i, "Crowne policy"),
    zero: findFile(corpusDir, /^0% Commissions_.*\.pdf$/i, "zero-commission proposal"),
    ten: findFile(corpusDir, /^10% Commissions_.*\.pdf$/i, "ten-percent proposal"),
    attorney: findFile(corpusDir, /^Pasted text\(111\)\.txt$/i, "attorney analysis"),
    spd: findFile(corpusDir, /^Palmetto Propane SPD 2025 FINAL\.pdf$/i, "Palmetto SPD"),
    amendment1: findFile(corpusDir, /^Palmetto Propane SPD Amendment 1 - Signed\.pdf$/i, "Palmetto amendment 1"),
    amendment2: findFile(corpusDir, /^Palmetto Propane SPD Amendment 2 - Signed\.pdf$/i, "Palmetto amendment 2"),
    amendment3: findFile(corpusDir, /^Palmetto_20Propane_20SPD_20Amendment_203_20-_20Signed\.pdf$/i, "Palmetto amendment 3")
  };

  const pdfjs = await loadPdfJs();
  const policy = await parsePdf(pdfjs, files.policy, "crowne-policy", "policy", 0);
  const zero = await parsePdf(pdfjs, files.zero, "crowne-zero", "proposal", 1);
  const ten = await parsePdf(pdfjs, files.ten, "crowne-ten", "proposal", 1);
  const spd = await parsePdf(pdfjs, files.spd, "palmetto-spd", "plan", 0);
  const amendment1 = await parsePdf(pdfjs, files.amendment1, "palmetto-amd-1", "amendment", 1);
  const amendment2 = await parsePdf(pdfjs, files.amendment2, "palmetto-amd-2", "amendment", 2);
  const amendment3 = await parsePdf(pdfjs, files.amendment3, "palmetto-amd-3", "amendment", 3);

  const policyAnalysis = Engine.analyzeMatter([policy], RuleLibrary, "renewal");
  const zeroAnalysis = Engine.analyzeMatter([zero], RuleLibrary, "renewal");
  const tenAnalysis = Engine.analyzeMatter([ten], RuleLibrary, "renewal");
  const zeroComparison = Comparison.buildComparison(policyAnalysis, zeroAnalysis, "renewal");
  const tenComparison = Comparison.buildComparison(policyAnalysis, tenAnalysis, "renewal");
  const attorneyText = fs.readFileSync(files.attorney, "utf8");
  const palmettoAnalysis = Engine.analyzeMatter([spd, amendment1, amendment2, amendment3], RuleLibrary, "plan-policy");
  const explicitEvents = palmettoAnalysis.hierarchyEvents.filter(event => event.section === "Explicit REMOVE / REPLACE");
  const urgentOld = explicitEvents.find(event => /Amendment 2/i.test(event.sourceDocument) && /Urgent Care/i.test(event.replacementLanguage || ""));
  const urgentNew = explicitEvents.find(event => /Amendment_203/i.test(event.sourceDocument) && /Urgent Care/i.test(event.replacementLanguage || ""));
  const emergencyOld = explicitEvents.find(event => /Amendment 1/i.test(event.sourceDocument) && /Emergency Room Services/i.test(event.replacementLanguage || ""));
  const unchangedDeductible = explicitEvents.find(event => /Deductibles cross-apply/i.test(event.replacementLanguage || ""));
  const policyRateCap = policy.text.match(/Specific Premium Rate per Policy\s+Month per Covered Unit and the Aggregating Specific Deductible will not be increased more than 50%/i);
  const option3SpecificZero = financial(zeroComparison, "specific_attachment", "Renewal Option 3");
  const option3AggregateZero = financial(zeroComparison, "aggregating_specific", "Renewal Option 3");
  const option3SpecificTen = financial(tenComparison, "specific_attachment", "Renewal Option 3");
  const option3AggregateTen = financial(tenComparison, "aggregating_specific", "Renewal Option 3");
  const zeroCommission = fact(zeroAnalysis, "commission", "Renewal Option 3", "0.00%");
  const tenCommission = fact(tenAnalysis, "commission", "Renewal Option 3", "10.00%");
  const documents = [policy, zero, ten, spd, amendment1, amendment2, amendment3];
  const ocrCandidates = documents.flatMap(document => document.pages.filter(page => OcrEngine.shouldOcrPage(page.text).shouldOCR).map(page => `${document.id}:${page.number}`));

  const checks = {
    exactPageCounts: policy.pages.length === 44 && zero.pages.length === 8 && ten.pages.length === 8 && spd.pages.length === 98 && amendment1.pages.length === 2 && amendment2.pages.length === 1 && amendment3.pages.length === 1,
    noUnreadableNativePages: documents.every(document => document.health.unreadablePages.length === 0),
    policySpecific175: Boolean(fact(policyAnalysis, "specific_attachment", null, "175,000")),
    policyAggregating150: Boolean(fact(policyAnalysis, "aggregating_specific", null, "150,000")),
    zeroProposalOption3Values: Boolean(fact(zeroAnalysis, "specific_attachment", "Renewal Option 3", "300,000") && fact(zeroAnalysis, "aggregating_specific", "Renewal Option 3", "200,000")),
    tenProposalOption3Values: Boolean(fact(tenAnalysis, "specific_attachment", "Renewal Option 3", "300,000") && fact(tenAnalysis, "aggregating_specific", "Renewal Option 3", "200,000")),
    specificMovement71Point4: option3SpecificZero?.percentChange === 71.4 && option3SpecificTen?.percentChange === 71.4,
    aggregatingMovement33Point3: option3AggregateZero?.percentChange === 33.3 && option3AggregateTen?.percentChange === 33.3,
    commissionVariantsSeparated: Boolean(zeroCommission && tenCommission),
    commissionWarningPresent: zeroComparison.financialTerms.filter(item => item.fieldId === "commission").every(item => /must not be blended/i.test(item.warning || "")),
    rateCapExpressTermsLocated: Boolean(policyRateCap),
    rateCapDoesNotExpresslyCapSpecificAttachment: !/Specific Attachment Point[^.]{0,100}will not be increased more than 50%/i.test(policy.text),
    attorneyNuanceLocated: /does not expressly cap the Specific Attachment Point/i.test(attorneyText),
    explicitAmendmentPairsPreserved: explicitEvents.length === 7,
    urgentCareSequenceLinked: urgentOld?.status === "superseded" && urgentNew?.status === "current" && urgentNew?.supersedesEventId === urgentOld?.id,
    emergencySequenceLinked: emergencyOld?.status === "superseded",
    unchangedAmendmentLanguageRemainsCurrent: unchangedDeductible?.status === "current"
  };

  const output = {
    schemaVersion: "1.0.0",
    corpusHashes: Object.fromEntries(Object.entries(files).map(([key, file]) => [key, sha256(file)])),
    pages: Object.fromEntries(documents.map(document => [document.id, document.pages.length])),
    nativeOcrCandidates: ocrCandidates,
    financial: {
      zeroCommissionOption3: { specificAttachmentChange: option3SpecificZero?.percentChange ?? null, aggregatingSpecificChange: option3AggregateZero?.percentChange ?? null, commission: zeroCommission?.value ?? null },
      tenCommissionOption3: { specificAttachmentChange: option3SpecificTen?.percentChange ?? null, aggregatingSpecificChange: option3AggregateTen?.percentChange ?? null, commission: tenCommission?.value ?? null }
    },
    hierarchy: { explicitPairs: explicitEvents.length, current: explicitEvents.filter(event => event.status === "current").length, superseded: explicitEvents.filter(event => event.status === "superseded").length },
    checks,
    passed: pass(checks)
  };
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
  if (!output.passed) process.exitCode = 1;
}

main().catch(error => {
  process.stderr.write(`${error.name || "Error"}: ${error.message || String(error)}\n${error.stack || ""}\n`);
  process.exitCode = 1;
});
