(function () {
  "use strict";

  const DocumentModel = globalThis.StopLossDocumentModel;
  const OcrEngine = globalThis.StopLossOcrEngine;
  const Engine = globalThis.StopLossWorkbenchEngine;
  const Comparison = globalThis.StopLossComparisonEngine;
  const RuleLibrary = globalThis.StopLossRuleLibrary;

  const state = {
    mode: "standalone",
    leftAnalysis: null,
    rightAnalysis: null,
    analysis: null,
    comparison: null,
    section: "overview"
  };

  const $ = id => document.getElementById(id);
  const ui = {
    startView: $("startView"), workspaceView: $("workspaceView"), workflowGrid: $("workflowGrid"),
    leftFiles: $("leftFiles"), rightFiles: $("rightFiles"), leftFileList: $("leftFileList"), rightFileList: $("rightFileList"),
    leftManual: $("leftManual"), rightManual: $("rightManual"), rightCard: $("rightCard"),
    leftTitle: $("leftTitle"), leftHelp: $("leftHelp"), rightTitle: $("rightTitle"), rightHelp: $("rightHelp"),
    startError: $("startError"), analyzeButton: $("analyzeButton"), sessionInput: $("sessionInput"),
    matterTitle: $("matterTitle"), matterMeta: $("matterMeta"), sectionNav: $("sectionNav"), sectionTitle: $("sectionTitle"),
    sectionContent: $("sectionContent"), globalWarning: $("globalWarning"), newReviewButton: $("newReviewButton"),
    saveSessionButton: $("saveSessionButton"), executiveExportButton: $("executiveExportButton"), detailedExportButton: $("detailedExportButton"),
    excelExportButton: $("excelExportButton"), sourceDialog: $("sourceDialog"), sourceDialogTitle: $("sourceDialogTitle"),
    sourceMeta: $("sourceMeta"), sourceText: $("sourceText"), closeSourceButton: $("closeSourceButton"),
    busyLayer: $("busyLayer"), busyMessage: $("busyMessage"), forceOcrAll: $("forceOcrAll")
  };

  let pdfJsPromise = null;

  const modeCopy = {
    standalone: ["Policy and modifying documents", "Add the base policy, schedule, endorsements, riders, and amendments in controlling sequence.", "", ""],
    "plan-policy": ["Plan documents", "Add the plan document and signed amendments in sequence.", "Stop-loss documents", "Add the policy, schedule, riders, and endorsements in sequence."],
    renewal: ["Prior-term documents", "Add the expiring policy and its controlling modifiers.", "Renewal documents", "Add the renewal policy and its controlling modifiers."],
    "proposal-policy": ["Proposal / quote / binder", "Add all pre-issuance materials and qualifications.", "Issued policy", "Add the final policy, schedule, and endorsements."]
  };

  function element(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
      else if (value !== null && value !== undefined) node.setAttribute(key, String(value));
    });
    (Array.isArray(children) ? children : children == null ? [] : [children]).forEach(child => node.append(child.nodeType ? child : document.createTextNode(String(child))));
    return node;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
  function showBusy(message) { ui.busyMessage.textContent = message; ui.busyLayer.hidden = false; }
  function hideBusy() { ui.busyLayer.hidden = true; }
  function showError(message) { ui.startError.textContent = message; ui.startError.hidden = false; }
  function hideError() { ui.startError.hidden = true; ui.startError.textContent = ""; }

  function selectedMode() { return document.querySelector('input[name="mode"]:checked').value; }

  function updateMode() {
    state.mode = selectedMode();
    document.querySelectorAll(".workflow-card").forEach(card => card.classList.toggle("selected", card.querySelector("input").checked));
    const copy = modeCopy[state.mode];
    ui.leftTitle.textContent = copy[0]; ui.leftHelp.textContent = copy[1];
    ui.rightTitle.textContent = copy[2]; ui.rightHelp.textContent = copy[3];
    ui.rightCard.hidden = state.mode === "standalone";
  }

  function renderFileList(input, target) {
    clear(target);
    Array.from(input.files || []).forEach((file, index) => target.append(element("li", { text: `${index + 1}. ${file.name} (${Math.ceil(file.size / 1024)} KB)` })));
  }

  function assetUrl(relativePath) {
    const base = new URL(document.baseURI);
    const nestedBuild = /\/(?:dist|src)\/[^/]*$/.test(base.pathname);
    return new URL(`${nestedBuild ? "../" : "./"}vendor/${relativePath.replace(/^\//, "")}`, base).href;
  }

  async function getPdfJs() {
    if (globalThis.pdfjsLib) return globalThis.pdfjsLib;
    if (!pdfJsPromise) {
      pdfJsPromise = import(assetUrl("pdfjs/pdf.min.mjs")).then(module => {
        module.GlobalWorkerOptions.workerSrc = assetUrl("pdfjs/pdf.worker.min.mjs");
        return module;
      });
    }
    try { return await pdfJsPromise; }
    catch (error) { throw new Error(`The built-in PDF engine could not start. Open the included app through a static web server rather than directly from a local file. ${error.message || error}`); }
  }

  function reportOcrProgress(update) {
    const page = update.pageNumber ? `page ${update.pageNumber}${update.pageCount ? ` of ${update.pageCount}` : ""}` : "page";
    const percent = Number.isFinite(update.progress) ? ` (${update.progress}%)` : "";
    ui.busyMessage.textContent = `${update.documentName || "PDF"}: local OCR ${page}, ${update.status || "working"}${percent}`;
  }

  function reconstructPdfLines(items) {
    const lines = [];
    items.forEach(item => {
      const y = item.transform && item.transform[5] || 0;
      let line = lines.find(candidate => Math.abs(candidate.y - y) < 2.5);
      if (!line) { line = { y, items: [] }; lines.push(line); }
      line.items.push({ x: item.transform && item.transform[4] || 0, text: item.str || "" });
    });
    return lines.sort((a, b) => b.y - a.y).map(line => line.items.sort((a, b) => a.x - b.x).map(x => x.text).join(" ").replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
  }

  async function readPdf(file, ocrSession, forceAllPages) {
    const pdfjs = await getPdfJs();
    const loadingTask = pdfjs.getDocument({
      data: await file.arrayBuffer(),
      cMapUrl: assetUrl("pdfjs/cmaps/"),
      cMapPacked: true,
      standardFontDataUrl: assetUrl("pdfjs/standard_fonts/"),
      wasmUrl: assetUrl("pdfjs/wasm/")
    });
    const pdf = await loadingTask.promise;
    const pages = [];
    try {
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        ui.busyMessage.textContent = `${file.name}: extracting page ${pageNumber} of ${pdf.numPages}`;
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const nativeText = reconstructPdfLines(content.items);
        const decision = OcrEngine.shouldOcrPage(nativeText, { forceAllPages });
        let selected = { text: nativeText, method: "native", ocrUsed: false, nativeQuality: decision.nativeQuality, ocrQuality: null, ocrConfidence: null, selectionReason: "Native PDF extraction passed the text-quality threshold." };
        let ocrResult = null;
        let ocrError = null;
        if (decision.shouldOCR) {
          try {
            ocrResult = await ocrSession.recognizePage(page, { documentName: file.name, pageNumber, pageCount: pdf.numPages });
            selected = OcrEngine.selectPageText(nativeText, ocrResult);
          } catch (error) {
            ocrError = error && error.message ? error.message : String(error);
          }
        }
        pages.push({
          number: pageNumber,
          text: selected.text,
          originalText: selected.text,
          nativeText,
          extractionMethod: selected.method,
          ocr: {
            attempted: decision.shouldOCR,
            used: selected.ocrUsed,
            confidence: selected.ocrConfidence,
            reason: decision.reason,
            selectionReason: selected.selectionReason,
            nativeCharacters: decision.nativeQuality.characters,
            ocrCharacters: selected.ocrQuality ? selected.ocrQuality.characters : 0,
            engine: ocrResult && ocrResult.engine || `Tesseract.js ${OcrEngine.TESSERACT_VERSION}`,
            elapsedMs: ocrResult && ocrResult.elapsedMs || null,
            renderedDpi: ocrResult && ocrResult.renderedDpi || null,
            error: ocrError
          }
        });
        page.cleanup();
      }
    } finally {
      await pdf.destroy();
    }
    return pages;
  }

  async function readFile(file, sequence, side, ocrSession, forceAllPages) {
    const lower = file.name.toLowerCase();
    let pages;
    if (lower.endsWith(".pdf")) {
      pages = await readPdf(file, ocrSession, forceAllPages);
    } else if (lower.endsWith(".docx")) {
      if (!globalThis.mammoth) throw new Error(`${file.name}: Mammoth did not load. Check the network once, or use the manual text fallback.`);
      const result = await globalThis.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      pages = [{ number: 1, text: result.value }];
    } else {
      pages = [{ number: 1, text: await file.text() }];
    }
    return DocumentModel.parseDocument({ id: `${side}-${sequence + 1}`, name: file.name, pages, sequence });
  }

  async function readDocumentSet(input, manual, side, ocrSession, forceAllPages) {
    const files = Array.from(input.files || []);
    const documents = [];
    for (let index = 0; index < files.length; index += 1) {
      ui.busyMessage.textContent = `Reading ${files[index].name} (${index + 1} of ${files.length})`;
      documents.push(await readFile(files[index], index, side, ocrSession, forceAllPages));
    }
    if (manual.value.trim()) documents.push(DocumentModel.parseDocument({ id: `${side}-manual`, name: `${side === "left" ? "Document set A" : "Document set B"} manual text`, text: manual.value, sequence: documents.length }));
    return documents;
  }

  function sessionAnalyses() {
    return [state.leftAnalysis, state.rightAnalysis || state.analysis].filter(Boolean);
  }

  function activeAnalysis() { return state.mode === "standalone" ? state.analysis : state.rightAnalysis; }

  async function analyze() {
    hideError();
    const needsRight = state.mode !== "standalone";
    if (!(ui.leftFiles.files.length || ui.leftManual.value.trim())) return showError("Add at least one document or manual-text source to Document set A.");
    if (needsRight && !(ui.rightFiles.files.length || ui.rightManual.value.trim())) return showError("This comparison mode requires at least one document or manual-text source in Document set B.");
    showBusy("Reading documents...");
    const ocrSession = OcrEngine.createSession({ resolveAssetUrl: assetUrl, onProgress: reportOcrProgress, targetDpi: 220, maxPixels: 12000000 });
    try {
      const leftDocs = await readDocumentSet(ui.leftFiles, ui.leftManual, "left", ocrSession, ui.forceOcrAll.checked);
      state.leftAnalysis = Engine.analyzeMatter(leftDocs, RuleLibrary, state.mode === "standalone" ? "standalone" : state.mode);
      if (state.mode === "standalone") {
        state.analysis = state.leftAnalysis;
        state.rightAnalysis = null;
        state.comparison = null;
      } else {
        const rightDocs = await readDocumentSet(ui.rightFiles, ui.rightManual, "right", ocrSession, ui.forceOcrAll.checked);
        state.rightAnalysis = Engine.analyzeMatter(rightDocs, RuleLibrary, state.mode);
        state.analysis = null;
        state.comparison = Comparison.buildComparison(state.leftAnalysis, state.rightAnalysis, state.mode);
      }
      openWorkspace();
    } catch (error) {
      showError(error && error.message ? error.message : String(error));
    } finally {
      await ocrSession.terminate().catch(() => {});
      hideBusy();
    }
  }

  function navItems() {
    const items = [
      ["overview", "Overview"], ["documents", "Document health"], ["facts", "Policy at a Glance"],
      ["findings", "Findings"], ["completeness", "Completeness"], ["hierarchy", "Hierarchy"]
    ];
    if (state.mode !== "standalone") items.push(["comparison", "Concept comparison"], ["financial", "Financial terms"]);
    return items;
  }

  function openWorkspace() {
    ui.startView.hidden = true; ui.workspaceView.hidden = false;
    const docs = sessionAnalyses().flatMap(a => a.documents);
    ui.matterTitle.textContent = docs[0] ? docs[0].name.replace(/\.[^.]+$/, "") : "Review workspace";
    ui.matterMeta.textContent = `${modeCopy[state.mode][0]} | ${docs.length} document(s)`;
    clear(ui.sectionNav);
    navItems().forEach(([id, label]) => ui.sectionNav.append(element("button", { type: "button", text: label, "data-section": id, onclick: () => renderSection(id) })));
    const warnings = docs.flatMap(d => d.health.unreadablePages.map(page => `${d.name}, page ${page}`));
    ui.globalWarning.hidden = !warnings.length;
    ui.globalWarning.textContent = warnings.length ? `Automatic local OCR could not recover usable text from: ${warnings.join("; ")}. Those pages still require manual inspection and are not treated as reviewed.` : "";
    renderSection("overview");
  }

  function metric(label, value) { return element("div", { class: "metric" }, [element("strong", { text: String(value) }), element("span", { text: label })]); }

  function renderOverview() {
    const analyses = sessionAnalyses();
    const documents = analyses.flatMap(a => a.documents);
    const findings = analyses.flatMap(a => a.findings);
    const uniqueFindings = new Map(findings.map(f => [f.ruleId, f]));
    const events = analyses.flatMap(a => a.hierarchyEvents);
    const priorities = Array.from(uniqueFindings.values()).filter(f => ["Critical", "High"].includes(f.severity)).slice(0, 12);
    const favorable = Array.from(uniqueFindings.values()).filter(f => f.classification === "Favorable Provision");
    const ocrPages = documents.reduce((total, document) => total + document.health.ocrPages.length, 0);
    const intro = state.mode === "standalone" ? state.analysis.summary.text : `${state.leftAnalysis.summary.text} ${state.rightAnalysis.summary.text} ${state.comparison.caution}`;
    ui.sectionContent.append(
      element("div", { class: "metric-grid" }, [metric("Documents", documents.length), metric("OCR pages", ocrPages), metric("Current concepts", uniqueFindings.size), metric("Critical / high", priorities.length), metric("Favorable", favorable.length), metric("Hierarchy events", events.length)]),
      element("article", { class: "card" }, [element("h3", { text: "Executive summary" }), element("p", { text: intro })]),
      element("article", { class: "card" }, [element("h3", { text: "Top priority review leads" }), element("div", { class: "priority-list" }, priorities.length ? priorities.map(f => element("div", { class: "priority-row" }, [element("div", {}, [element("strong", { text: f.title }), element("div", { text: `${f.category} | ${f.classification}` })]), element("span", { class: `badge ${f.severity}`, text: f.severity })])) : [element("p", { text: "No critical or high-priority concepts were located in extractable text." })])]),
      element("article", { class: "card" }, [element("h3", { text: "Required review posture" }), element("p", { text: "Every candidate is a deterministic review lead. Standalone detection does not establish a confirmed plan/policy gap. Missing indicators are reported as not located or unable to determine. Reviewer dispositions control exports." })])
    );
  }

  function renderDocuments() {
    const docs = sessionAnalyses().flatMap(a => a.documents);
    const box = element("article", { class: "card" }, [element("h3", { text: "Parsing health and document model" })]);
    const list = element("div", { class: "document-health" });
    docs.forEach(doc => {
      const detail = `${doc.pages.length} page(s), ${doc.clauses.length} operative clause(s), role: ${doc.role}, sequence: ${doc.sequence + 1}`;
      const pageDetails = element("details");
      pageDetails.append(element("summary", { text: "Page extraction details" }));
      const pageList = element("ul", { class: "file-list" });
      doc.health.pages.forEach(page => pageList.append(element("li", { text: `Page ${page.page}: ${page.status}; ${page.extractionMethod}${page.ocrAttempted ? `; OCR attempted${page.ocrConfidence === null ? "" : ` at ${page.ocrConfidence}% confidence`}${page.ocrRenderedDpi === null ? "" : `, ${page.ocrRenderedDpi} DPI`}${page.ocrElapsedMs === null ? "" : `, ${Math.round(page.ocrElapsedMs / 100) / 10}s`}` : ""}${page.ocrError ? `; error: ${page.ocrError}` : ""}` })));
      pageDetails.append(pageList);
      list.append(element("div", { class: "health-row" }, [element("div", {}, [element("strong", { text: doc.name }), element("p", { text: detail }), element("p", { text: doc.health.warning }), pageDetails]), element("span", { class: `badge ${doc.health.status.startsWith("Readable") ? "Low" : "High"}`, text: doc.health.status })]));
    });
    box.append(list); ui.sectionContent.append(box);
  }

  function findFactSource(fact) {
    openSource({ title: fact.label, sourceDocument: fact.sourceDocument, page: fact.page, section: fact.section, hierarchyStatus: "extracted fact", operativeLanguage: fact.sourceText, extractionMethod: fact.extractionMethod, ocrConfidence: fact.ocrConfidence });
  }

  function renderFacts() {
    const facts = sessionAnalyses().flatMap(a => a.facts);
    const byField = new Map(); facts.forEach(f => { if (!byField.has(f.fieldId)) byField.set(f.fieldId, []); byField.get(f.fieldId).push(f); });
    const note = element("article", { class: "card" }, [element("h3", { text: "Policy at a Glance" }), element("p", { text: "Each value retains its source and can be overridden by the reviewer without altering the extracted value." })]);
    const grid = element("div", { class: "fact-grid" });
    Array.from(byField.values()).flatMap(items => items).forEach(fact => {
      const input = element("input", { class: "field-control", value: fact.reviewerValue || fact.value, "aria-label": `Reviewer value for ${fact.label}` });
      input.addEventListener("change", () => { fact.reviewerValue = input.value; fact.reviewerStatus = "Reviewed / edited"; });
      grid.append(element("article", { class: "fact-card" }, [element("label", { text: fact.label }), input, element("div", { class: "fact-source", text: `${fact.sourceDocument}, p. ${fact.page} | ${fact.confidence} finding confidence | ${fact.extractionMethod === "ocr" ? `local OCR${fact.ocrConfidence === null ? "" : ` ${fact.ocrConfidence}%`}` : "native text"}` }), element("button", { class: "source-button", type: "button", text: "View source", onclick: () => findFactSource(fact) })]));
    });
    if (!facts.length) grid.append(element("p", { text: "No structured fields were located in extractable text. Values were not inferred." }));
    ui.sectionContent.append(note, grid);
  }

  function allFindings() {
    const map = new Map();
    sessionAnalyses().flatMap(a => a.findings).forEach(f => {
      const key = state.mode === "standalone" ? f.ruleId : `${f.ruleId}-${f.sourceDocument}`;
      map.set(key, f);
    });
    return Array.from(map.values());
  }

  function findingControls(finding) {
    const classification = element("select", { class: "field-control" });
    ["Potential Coverage Gap", "Confirmed Plan/Policy Difference", "Financial Limitation", "Increased Retained Risk", "Timing Risk", "Administrative Requirement", "Eligibility Risk", "Underwriting/Disclosure Risk", "Pricing/Reimbursement Limitation", "Carrier Discretion", "Contract Interpretation Risk", "Compliance Interaction", "Dispute/Enforcement Provision", "Favorable Provision", "Informational", "Requires Attorney Review"].forEach(value => classification.append(element("option", { value, text: value })));
    classification.value = finding.classification; classification.addEventListener("change", () => finding.classification = classification.value);
    const severity = element("select", { class: "field-control" });
    ["Critical", "High", "Moderate", "Low", "Informational"].forEach(value => severity.append(element("option", { value, text: value })));
    severity.value = finding.severity; severity.addEventListener("change", () => finding.severity = severity.value);
    const disposition = element("select", { class: "field-control" });
    ["Include", "Exclude", "Needs Review", "Confirmed", "Resolved"].forEach(value => disposition.append(element("option", { value, text: value })));
    disposition.value = finding.disposition; disposition.addEventListener("change", () => { finding.disposition = disposition.value; finding.included = !["Exclude", "Resolved"].includes(disposition.value); });
    return element("div", { class: "review-grid" }, [element("label", { text: "Classification" }, classification), element("label", { text: "Severity" }, severity), element("label", { text: "Disposition" }, disposition)]);
  }

  function renderFindingCard(finding) {
    const include = element("input", { type: "checkbox", "aria-label": `Include ${finding.title}` }); include.checked = finding.included; include.addEventListener("change", () => finding.included = include.checked);
    const detail = element("div", { class: "finding-detail" }); detail.hidden = true;
    const toggle = element("button", { class: "quiet-button", type: "button", text: "Review", onclick: () => { detail.hidden = !detail.hidden; toggle.textContent = detail.hidden ? "Review" : "Collapse"; } });
    const sourceList = element("div", { class: "source-list" });
    finding.occurrences.forEach((occurrence, index) => sourceList.append(element("button", { class: "source-button", type: "button", text: `${index + 1}. ${occurrence.sourceDocument}, p. ${occurrence.page} | ${occurrence.hierarchyStatus}`, onclick: () => openSource(Object.assign({ title: finding.title }, occurrence)) })));
    const notes = element("textarea", { class: "review-notes", placeholder: "Reviewer notes", "aria-label": `Reviewer notes for ${finding.title}` }); notes.value = finding.reviewerNotes; notes.addEventListener("input", () => finding.reviewerNotes = notes.value);
    detail.append(
      element("div", {}, [element("strong", { text: "Operative language" }), element("blockquote", { text: finding.exactLanguage })]),
      element("div", {}, [element("strong", { text: "Why it matters" }), element("p", { text: finding.whyItMatters })]),
      element("div", {}, [element("strong", { text: "Practical consequence" }), element("p", { text: finding.practicalConsequence })]),
      element("div", {}, [element("strong", { text: "Recommended action" }), element("p", { text: finding.recommendedAction })]),
      element("div", {}, [element("strong", { text: "Source occurrences" }), sourceList]),
      findingControls(finding),
      element("label", {}, [element("strong", { text: "Reviewer notes" }), notes])
    );
    return element("article", { class: "finding-card", "data-severity": finding.severity }, [element("div", { class: "finding-summary" }, [include, element("div", {}, [element("h3", { text: finding.title }), element("p", { text: `${finding.category} | ${finding.classification} | ${finding.confidence} confidence | ${finding.occurrences.length} occurrence(s)` })]), toggle]), detail]);
  }

  function renderFindings() {
    const findings = allFindings();
    const search = element("input", { type: "search", placeholder: "Search findings, categories, or source language" });
    const severity = element("select"); severity.append(element("option", { value: "", text: "All severities" })); ["Critical", "High", "Moderate", "Low", "Informational"].forEach(x => severity.append(element("option", { value: x, text: x })));
    const category = element("select"); category.append(element("option", { value: "", text: "All categories" })); Array.from(new Set(findings.map(f => f.category))).sort().forEach(x => category.append(element("option", { value: x, text: x })));
    const includeAll = element("button", { class: "quiet-button", type: "button", text: "Include all", onclick: () => { findings.forEach(f => f.included = true); apply(); } });
    const excludeAll = element("button", { class: "quiet-button", type: "button", text: "Exclude all", onclick: () => { findings.forEach(f => f.included = false); apply(); } });
    const list = element("div", { class: "findings-list" });
    function apply() {
      clear(list); const q = search.value.toLowerCase().trim();
      findings.filter(f => (!severity.value || f.severity === severity.value) && (!category.value || f.category === category.value) && (!q || `${f.title} ${f.category} ${f.exactLanguage}`.toLowerCase().includes(q))).forEach(f => list.append(renderFindingCard(f)));
      if (!list.childElementCount) list.append(element("div", { class: "card", text: "No findings match the current filters." }));
    }
    search.addEventListener("input", apply); severity.addEventListener("change", apply); category.addEventListener("change", apply);
    ui.sectionContent.append(element("div", { class: "toolbar-row" }, [search, severity, category, includeAll, excludeAll]), list); apply();
  }

  function renderCompleteness() {
    const rows = activeAnalysis().completeness;
    const table = element("table");
    table.append(element("thead", {}, element("tr", {}, ["Concept", "Category", "Status", "Reason"].map(x => element("th", { text: x })))));
    const body = element("tbody");
    rows.forEach(row => body.append(element("tr", {}, [element("td", { text: row.concept }), element("td", { text: row.category }), element("td", { class: `status-${row.status.replace(/\s+/g, "-")}`, text: row.status }), element("td", { text: row.rationale })])));
    table.append(body); ui.sectionContent.append(element("article", { class: "card" }, [element("h3", { text: "Material-provision completeness matrix" }), element("p", { text: "Not located is not a confirmed gap. Search indicators and extraction limits are retained in the session." })]), element("div", { class: "table-wrap" }, table));
  }

  function renderHierarchy() {
    const events = sessionAnalyses().flatMap(a => a.hierarchyEvents);
    const box = element("article", { class: "card" }, [element("h3", { text: "Document hierarchy and amendment events" }), element("p", { text: "The workbench marks superseded language only where a modifying clause and affected concept can be linked deterministically. Unmapped hierarchy language remains visible for attorney review." })]);
    const list = element("div", { class: "findings-list" });
    events.forEach(event => list.append(element("article", { class: "finding-card", "data-severity": event.confidence === "Low" ? "High" : "Moderate" }, [element("div", { class: "finding-summary" }, [element("span", { class: "badge Moderate", text: event.action }), element("div", {}, [element("h3", { text: `${event.sourceDocument}, p. ${event.page}` }), element("p", { text: `${event.affectedRuleIds.length} mapped concept(s) | ${event.confidence} confidence | ${event.rationale}` })]), element("button", { class: "source-button", type: "button", text: "View modifying clause", onclick: () => openSource({ title: "Hierarchy event", sourceDocument: event.sourceDocument, page: event.page, section: event.section, hierarchyStatus: event.action, operativeLanguage: event.modifyingLanguage, extractionMethod: event.extractionMethod, ocrConfidence: event.ocrConfidence }) })])])));
    if (!events.length) list.append(element("p", { text: "No explicit hierarchy events were mapped in extractable text." }));
    ui.sectionContent.append(box, list);
  }

  function renderComparison() {
    const comparison = state.comparison;
    ui.sectionContent.append(element("article", { class: "card" }, [element("h3", { text: "Concept-paired comparison" }), element("p", { text: comparison.caution })]));
    const table = element("table");
    table.append(element("thead", {}, element("tr", {}, ["Concept"].concat(comparison.columns).map(x => element("th", { text: x })))));
    const body = element("tbody");
    comparison.rows.filter(row => row.included).forEach(row => body.append(element("tr", {}, [element("td", {}, [element("strong", { text: row.concept }), element("div", { text: row.classification })]), element("td", {}, element("pre", { text: row.leftLanguage })), element("td", {}, element("pre", { text: row.rightLanguage })), element("td", { text: row.nature }), element("td", { text: row.consequence }), element("td", { text: row.recommendedAction })])));
    table.append(body); ui.sectionContent.append(element("div", { class: "table-wrap" }, table));
  }

  function renderFinancial() {
    const table = element("table"); table.append(element("thead", {}, element("tr", {}, ["Term", "Set A", "Set B", "Change", "Risk-transfer interpretation"].map(x => element("th", { text: x })))));
    const body = element("tbody"); state.comparison.financialTerms.forEach(row => body.append(element("tr", {}, [element("td", { text: row.label }), element("td", { text: row.priorValue }), element("td", { text: row.currentValue }), element("td", { text: row.percentChange === null ? "Not calculated" : `${row.percentChange > 0 ? "+" : ""}${row.percentChange}%` }), element("td", { text: `${row.interpretation}${row.warning ? ` ${row.warning}` : ""}` })])));
    table.append(body); ui.sectionContent.append(element("article", { class: "card" }, [element("h3", { text: "Financial-terms comparison" }), element("p", { text: "Premium and commission assumptions are separate from attachment-point and other retained-risk movement." })]), element("div", { class: "table-wrap" }, table));
  }

  const renderers = { overview: renderOverview, documents: renderDocuments, facts: renderFacts, findings: renderFindings, completeness: renderCompleteness, hierarchy: renderHierarchy, comparison: renderComparison, financial: renderFinancial };

  function renderSection(id) {
    state.section = id; clear(ui.sectionContent);
    ui.sectionNav.querySelectorAll("button").forEach(button => button.classList.toggle("active", button.dataset.section === id));
    const label = navItems().find(([key]) => key === id); ui.sectionTitle.textContent = label ? label[1] : "Review";
    (renderers[id] || renderOverview)();
  }

  function openSource(source) {
    ui.sourceDialogTitle.textContent = source.title || "Provision source"; clear(ui.sourceMeta);
    [["Document", source.sourceDocument], ["Page", source.page], ["Section", source.section], ["Hierarchy", source.hierarchyStatus], ["Confidence", source.confidence], ["Extraction", source.extractionMethod === "ocr" ? "Automatic local OCR" : source.extractionMethod], ["OCR page confidence", Number.isFinite(source.ocrConfidence) ? `${source.ocrConfidence}%` : null], ["Trigger", source.exactTrigger]].filter(([, v]) => v !== undefined && v !== null).forEach(([term, value]) => ui.sourceMeta.append(element("dt", { text: term }), element("dd", { text: String(value) })));
    ui.sourceText.textContent = source.operativeLanguage || source.surroundingContext || "No source text available.";
    if (typeof ui.sourceDialog.showModal === "function") ui.sourceDialog.showModal(); else ui.sourceDialog.setAttribute("open", "");
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function saveBlob(name, type, content) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a"); link.href = url; link.download = name; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function wordDocument(detailed) {
    const analysis = activeAnalysis();
    const findings = allFindings().filter(f => f.included && !["Exclude", "Resolved"].includes(f.disposition));
    const selected = detailed ? findings : findings.filter(f => ["Critical", "High"].includes(f.severity)).slice(0, 12);
    const facts = analysis.facts.slice(0, detailed ? analysis.facts.length : 20);
    const completeness = analysis.completeness.filter(row => detailed || ["Located", "Multiple provisions located", "Unable to determine"].includes(row.status));
    const styles = "body{font-family:Arial,sans-serif;color:#17263a;line-height:1.45;margin:48px}h1{color:#0b2d4f;border-bottom:3px solid #1769aa;padding-bottom:8px}h2{color:#0b2d4f;margin-top:28px}table{width:100%;border-collapse:collapse;font-size:10pt}th{background:#dceaf4}th,td{border:1px solid #9fb0c0;padding:7px;vertical-align:top}.source{color:#617186;font-size:9pt}.warning{background:#fff4d8;padding:10px}";
    const extractionLabel = source => source.extractionMethod === "ocr" ? `automatic local OCR${Number.isFinite(source.ocrConfidence) ? ` (${source.ocrConfidence}% page confidence)` : ""}` : source.extractionMethod === "manual" ? "manual text" : "native text";
    const factRows = facts.map(f => `<tr><td>${escapeHtml(f.label)}</td><td>${escapeHtml(f.reviewerValue || f.value)}</td><td>${escapeHtml(f.sourceDocument)}, p. ${f.page}<br><span class="source">${escapeHtml(extractionLabel(f))}</span></td></tr>`).join("");
    const findingBlocks = selected.map(f => { const source = f.occurrences.find(o => o.hierarchyStatus !== "superseded") || f.occurrences[0] || f; return `<h3>${escapeHtml(f.title)} (${escapeHtml(f.severity)})</h3><p><b>${escapeHtml(f.classification)}</b> | ${escapeHtml(f.disposition)} | ${escapeHtml(f.confidence)} confidence</p><p><b>Source:</b> ${escapeHtml(f.sourceDocument)}, p. ${f.page}, ${escapeHtml(f.section)} | ${escapeHtml(extractionLabel(source))}</p><blockquote>${escapeHtml(f.exactLanguage)}</blockquote><p><b>Why it matters:</b> ${escapeHtml(f.whyItMatters)}</p><p><b>Recommended action:</b> ${escapeHtml(f.recommendedAction)}</p>${f.reviewerNotes ? `<p><b>Reviewer notes:</b> ${escapeHtml(f.reviewerNotes)}</p>` : ""}`; }).join("");
    const matrixRows = completeness.map(row => `<tr><td>${escapeHtml(row.concept)}</td><td>${escapeHtml(row.status)}</td><td>${escapeHtml(row.rationale)}</td></tr>`).join("");
    const comparisonHtml = state.comparison && detailed ? `<h2>Comparison matrix</h2><table><tr><th>Concept</th><th>Set A</th><th>Set B</th><th>Difference</th><th>Action</th></tr>${state.comparison.rows.filter(r => r.included).map(r => `<tr><td>${escapeHtml(r.concept)}</td><td>${escapeHtml(r.leftLanguage)}</td><td>${escapeHtml(r.rightLanguage)}</td><td>${escapeHtml(r.nature)}</td><td>${escapeHtml(r.recommendedAction)}</td></tr>`).join("")}</table>` : "";
    return `<!doctype html><html><head><meta charset="utf-8"><style>${styles}</style></head><body><h1>${detailed ? "Detailed Attorney Stop-Loss Review" : "Executive Stop-Loss Review"}</h1><p>${escapeHtml(new Date().toLocaleDateString())}</p><div class="warning">Deterministic review leads only. Reviewer dispositions control this report. Not located does not mean a confirmed gap.</div><h2>Executive summary</h2><p>${escapeHtml(analysis.summary.text)}</p><h2>Policy at a Glance</h2><table><tr><th>Field</th><th>Value</th><th>Source</th></tr>${factRows}</table><h2>${detailed ? "Selected findings" : "Priority findings"}</h2>${findingBlocks || "<p>No included findings met this report's selection criteria.</p>"}<h2>Completeness matrix</h2><table><tr><th>Concept</th><th>Status</th><th>Reason</th></tr>${matrixRows}</table>${comparisonHtml}<p class="source">Generated locally by Stop-Loss Policy Review Workbench v16.1.0. This report does not replace attorney judgment.</p></body></html>`;
  }

  function exportWord(detailed) { saveBlob(detailed ? "stop-loss-detailed-attorney-review.doc" : "stop-loss-executive-review.doc", "application/msword;charset=utf-8", wordDocument(detailed)); }

  function tsvCell(value) { return String(value == null ? "" : value).replace(/\t/g, " ").replace(/\r?\n/g, " "); }

  function exportExcel() {
    let rows;
    if (state.comparison) rows = [["Concept", "Category", "Set A Language", "Set B Language", "Difference", "Consequence", "Recommended Action", "Classification", "Severity", "Disposition"]].concat(state.comparison.rows.map(r => [r.concept, r.category, r.leftLanguage, r.rightLanguage, r.nature, r.consequence, r.recommendedAction, r.classification, r.severity, r.disposition]));
    else rows = [["Rule ID", "Title", "Category", "Classification", "Severity", "Confidence", "Document", "Page", "Section", "Hierarchy", "Extraction", "OCR Page Confidence", "Exact Language", "Why It Matters", "Recommended Action", "Disposition", "Reviewer Notes"]].concat(state.analysis.findings.map(f => { const source = f.occurrences.find(o => o.hierarchyStatus !== "superseded") || f.occurrences[0] || {}; return [f.ruleId, f.title, f.category, f.classification, f.severity, f.confidence, f.sourceDocument, f.page, f.section, f.hierarchyStatus, source.extractionMethod || "native", Number.isFinite(source.ocrConfidence) ? source.ocrConfidence : "", f.exactLanguage, f.whyItMatters, f.recommendedAction, f.disposition, f.reviewerNotes]; }));
    saveBlob("stop-loss-review-matrix.xls", "application/vnd.ms-excel;charset=utf-8", "\ufeff" + rows.map(row => row.map(tsvCell).join("\t")).join("\n"));
  }

  function saveSession() {
    const payload = { schemaVersion: "1.1.0", appVersion: "16.1.0", savedAt: new Date().toISOString(), mode: state.mode, leftAnalysis: state.leftAnalysis, rightAnalysis: state.rightAnalysis, analysis: state.analysis, comparison: state.comparison };
    saveBlob("stop-loss-review-session.json", "application/json;charset=utf-8", JSON.stringify(payload, null, 2));
  }

  async function openSession(file) {
    try {
      const payload = JSON.parse(await file.text());
      if (!["1.0.0", "1.1.0"].includes(payload.schemaVersion) || !payload.mode) throw new Error("Unsupported or invalid session schema.");
      state.mode = payload.mode; state.leftAnalysis = payload.leftAnalysis; state.rightAnalysis = payload.rightAnalysis; state.analysis = payload.analysis; state.comparison = payload.comparison;
      const radio = document.querySelector(`input[name="mode"][value="${CSS.escape(state.mode)}"]`); if (radio) radio.checked = true; updateMode(); openWorkspace();
    } catch (error) { showError(`Could not open session: ${error.message || error}`); }
  }

  function newReview() {
    state.leftAnalysis = state.rightAnalysis = state.analysis = state.comparison = null;
    ui.workspaceView.hidden = true; ui.startView.hidden = false; ui.leftFiles.value = ""; ui.rightFiles.value = ""; ui.leftManual.value = ""; ui.rightManual.value = ""; ui.forceOcrAll.checked = false; clear(ui.leftFileList); clear(ui.rightFileList); hideError();
  }

  ui.workflowGrid.addEventListener("change", updateMode);
  ui.leftFiles.addEventListener("change", () => renderFileList(ui.leftFiles, ui.leftFileList));
  ui.rightFiles.addEventListener("change", () => renderFileList(ui.rightFiles, ui.rightFileList));
  ui.analyzeButton.addEventListener("click", analyze);
  ui.sessionInput.addEventListener("change", () => ui.sessionInput.files[0] && openSession(ui.sessionInput.files[0]));
  ui.newReviewButton.addEventListener("click", newReview);
  ui.saveSessionButton.addEventListener("click", saveSession);
  ui.executiveExportButton.addEventListener("click", () => exportWord(false));
  ui.detailedExportButton.addEventListener("click", () => exportWord(true));
  ui.excelExportButton.addEventListener("click", exportExcel);
  ui.closeSourceButton.addEventListener("click", () => ui.sourceDialog.close());
  updateMode();
})();
