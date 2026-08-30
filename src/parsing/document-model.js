(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.StopLossDocumentModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CONTROL_RE = /\b(schedule (?:of insurance )?(?:controls?|prevails?)|policy (?:controls?|prevails?)|plan (?:controls?|prevails?)|notwithstanding|this (?:endorsement|amendment) (?:modifies|changes|deletes|replaces|amends)|remov(?:e|es|ed)|delet(?:e|es|ed)|replac(?:e|es|ed)|amended to read|add(?:s|ed)?|incorporated into)\b/i;
  const HEADING_RE = /^(?:ARTICLE|SECTION|PART|SCHEDULE|ENDORSEMENT|AMENDMENT|EXHIBIT|ADDENDUM|RIDER|DEFINITIONS?|EXCLUSIONS?|ELIGIBILITY|CLAIMS?|GENERAL PROVISIONS?|BENEFITS?)\b|^(?:\d+(?:\.\d+)*|[A-Z]|[IVXLC]+)[.)]\s+[A-Z]/;

  function normalizeText(value) {
    return String(value == null ? "" : value)
      .replace(/\u0000/g, "")
      .replace(/\r\n?/g, "\n")
      .replace(/([A-Za-z])-\s*\n\s*([a-z])/g, "$1$2")
      .replace(/[\t\u00a0]+/g, " ")
      .replace(/[ ]{2,}/g, " ")
      .replace(/\n[ ]+/g, "\n")
      .trim();
  }

  function inferRole(name, text, suppliedRole) {
    if (suppliedRole) return suppliedRole;
    const sample = `${name}\n${text.slice(0, 3000)}`;
    if (/proposal|quote|illustration|binder/i.test(sample)) return "proposal";
    if (/amendment/i.test(sample)) return "amendment";
    if (/endorsement|rider/i.test(sample)) return "endorsement";
    if (/summary plan description|\bSPD\b|employee benefit plan/i.test(sample)) return "plan";
    return "policy";
  }

  function lineFingerprint(line) {
    return line.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim();
  }

  function removeRepeatedMargins(pages) {
    if (pages.length < 3) return pages;
    const counts = new Map();
    pages.forEach(page => {
      const lines = page.text.split("\n").map(x => x.trim()).filter(Boolean);
      const candidates = lines.slice(0, 3).concat(lines.slice(-3));
      new Set(candidates.map(lineFingerprint).filter(x => x.length > 3)).forEach(x => counts.set(x, (counts.get(x) || 0) + 1));
    });
    const repeated = new Set(Array.from(counts).filter(([, n]) => n / pages.length >= 0.6).map(([x]) => x));
    return pages.map(page => ({
      number: page.number,
      text: page.text.split("\n").filter(line => !repeated.has(lineFingerprint(line))).join("\n").trim(),
      originalText: page.originalText
    }));
  }

  function pageHealth(page) {
    const letters = (page.text.match(/[A-Za-z]/g) || []).length;
    const replacement = (page.text.match(/\ufffd/g) || []).length;
    const status = letters < 20 ? "Unreadable or image-only" : letters < 100 ? "Low extractable text" : replacement > Math.max(3, letters * 0.02) ? "Encoding concerns" : "Readable";
    return { page: page.number, status, extractableCharacters: letters, requiresOCR: letters < 20 };
  }

  function isHeading(line) {
    const value = line.trim();
    if (!value || value.length > 150) return false;
    if (HEADING_RE.test(value)) return true;
    const letters = value.replace(/[^A-Za-z]/g, "");
    return letters.length >= 4 && value === value.toUpperCase() && !/[.!?]$/.test(value);
  }

  function segmentPage(page, documentId, name) {
    const lines = page.text.split("\n");
    const clauses = [];
    let section = "Unlabeled section";
    let buffer = [];
    let startLine = 1;

    function flush(endLine) {
      const text = buffer.join(" ").replace(/\s+/g, " ").trim();
      if (text) {
        clauses.push({
          id: `${documentId}-p${page.number}-c${clauses.length + 1}`,
          documentId,
          sourceDocument: name,
          page: page.number,
          section,
          lineStart: startLine,
          lineEnd: endLine,
          text,
          normalizedText: text.toLowerCase(),
          hierarchySignal: CONTROL_RE.test(text)
        });
      }
      buffer = [];
    }

    lines.forEach((raw, index) => {
      const line = raw.trim();
      if (!line) {
        flush(index + 1);
        startLine = index + 2;
        return;
      }
      if (isHeading(line)) {
        flush(index);
        section = line;
        startLine = index + 1;
        buffer = [line];
        return;
      }
      if (buffer.length && /^(?:\d+(?:\.\d+)*|[A-Z]|[ivx]+)[.)]\s+/i.test(line) && buffer.join(" ").length > 180) {
        flush(index);
        startLine = index + 1;
      }
      buffer.push(line);
      if (buffer.join(" ").length > 2400) {
        flush(index + 1);
        startLine = index + 2;
      }
    });
    flush(lines.length);
    return clauses;
  }

  function parseDocument(input) {
    const name = input.name || "Untitled document";
    const id = input.id || `doc-${Math.random().toString(36).slice(2, 10)}`;
    const rawPages = Array.isArray(input.pages) && input.pages.length
      ? input.pages.map((p, i) => ({ number: p.number || i + 1, originalText: String(p.text || ""), text: normalizeText(p.text) }))
      : normalizeText(input.text).split(/\f|\n\s*\[\[PAGE BREAK\]\]\s*\n/i).map((text, i) => ({ number: i + 1, originalText: text, text: normalizeText(text) }));
    const pages = removeRepeatedMargins(rawPages);
    const allText = pages.map(p => p.text).join("\n\n");
    const role = inferRole(name, allText, input.role);
    const clauses = pages.flatMap(page => segmentPage(page, id, name));
    const health = pages.map(pageHealth);
    const unreadablePages = health.filter(x => x.requiresOCR).map(x => x.page);
    return {
      id,
      name,
      role,
      sequence: Number.isFinite(input.sequence) ? input.sequence : 0,
      pages,
      clauses,
      text: allText,
      health: {
        status: unreadablePages.length ? "Review required" : "Readable",
        pages: health,
        unreadablePages,
        warning: unreadablePages.length ? `Pages requiring OCR or manual inspection: ${unreadablePages.join(", ")}` : "No image-only pages detected from extracted text."
      }
    };
  }

  return { normalizeText, inferRole, removeRepeatedMargins, segmentPage, parseDocument, isHeading };
});
