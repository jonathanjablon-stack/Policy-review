(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.StopLossComparisonEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function tokens(text) {
    return new Set(String(text || "").toLowerCase().replace(/[^a-z0-9%$]+/g, " ").split(/\s+/).filter(x => x.length > 2));
  }

  function similarity(a, b) {
    const left = tokens(a);
    const right = tokens(b);
    if (!left.size && !right.size) return 1;
    const intersection = Array.from(left).filter(x => right.has(x)).length;
    return intersection / Math.max(1, new Set([...left, ...right]).size);
  }

  function currentOccurrence(finding) {
    if (!finding) return null;
    return finding.occurrences.find(o => o.hierarchyStatus !== "superseded") || finding.occurrences[0] || null;
  }

  function modeColumns(mode) {
    if (mode === "plan-policy") return ["Plan Language", "Stop-Loss Language", "Difference", "Consequence", "Recommended Action"];
    if (mode === "renewal") return ["Prior Term", "Renewal Term", "Nature of Change", "Risk-Transfer Effect", "Recommended Review"];
    return ["Proposal / Quote / Binder", "Issued Policy", "Difference", "Contract Effect", "Recommended Action"];
  }

  function compareAnalyses(left, right, mode) {
    const leftMap = new Map(left.findings.map(f => [f.ruleId, f]));
    const rightMap = new Map(right.findings.map(f => [f.ruleId, f]));
    const ids = Array.from(new Set([...leftMap.keys(), ...rightMap.keys()])).sort();
    const rows = ids.map(ruleId => {
      const l = leftMap.get(ruleId) || null;
      const r = rightMap.get(ruleId) || null;
      const lo = currentOccurrence(l);
      const ro = currentOccurrence(r);
      const score = similarity(lo && lo.operativeLanguage, ro && ro.operativeLanguage);
      let nature = "Unchanged or closely corresponding";
      if (!l && r) nature = mode === "renewal" ? "Added in renewal" : "Present only in issued policy";
      else if (l && !r) nature = mode === "renewal" ? "Removed or not located in renewal" : "Promised or described, but not located in issued policy";
      else if (score < 0.72) nature = "Modified language";
      const materialDifference = nature !== "Unchanged or closely corresponding";
      let consequence = (r || l).whyItMatters;
      if (mode === "proposal-policy" && l && !r) consequence = "A proposal representation is not itself an issued-policy term. The expected feature requires contract confirmation.";
      if (mode === "plan-policy" && materialDifference && l && r) consequence = "The paired plan and stop-loss clauses differ materially enough to require attorney review of reimbursement consequences.";
      return {
        id: `comparison-${ruleId}`,
        ruleId,
        concept: (r || l).title,
        category: (r || l).category,
        leftLanguage: lo ? lo.operativeLanguage : "Not located in extractable text",
        leftSource: lo ? { document: lo.sourceDocument, page: lo.page, section: lo.section, extractionMethod: lo.extractionMethod, ocrConfidence: lo.ocrConfidence } : null,
        rightLanguage: ro ? ro.operativeLanguage : "Not located in extractable text",
        rightSource: ro ? { document: ro.sourceDocument, page: ro.page, section: ro.section, extractionMethod: ro.extractionMethod, ocrConfidence: ro.ocrConfidence } : null,
        nature,
        similarity: Number(score.toFixed(3)),
        consequence,
        recommendedAction: (r || l).recommendedAction,
        classification: mode === "plan-policy" && materialDifference && l && r ? "Confirmed Plan/Policy Difference" : (r || l).classification,
        severity: (r || l).severity,
        disposition: "Needs Review",
        included: materialDifference
      };
    });
    return { mode, columns: modeColumns(mode), rows };
  }

  function numericValue(value) {
    const match = String(value || "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  }

  function compareFinancialFacts(leftFacts, rightFacts) {
    const financial = new Set(["specific_attachment", "alternate_attachment", "aggregating_specific", "aggregate_attachment", "specific_percentage", "aggregate_percentage", "maximums", "benefit_basis", "premium_grace", "rate_cap", "commission"]);
    const groupedById = list => {
      const map = new Map();
      list.forEach(fact => {
        if (!financial.has(fact.fieldId)) return;
        if (!map.has(fact.fieldId)) map.set(fact.fieldId, []);
        const value = fact.reviewerValue || fact.value;
        const key = `${String(value).toLowerCase()}|${String(fact.contextLabel || "").toLowerCase()}|${fact.documentId || fact.sourceDocument}|${fact.page}`;
        if (!map.get(fact.fieldId).some(item => item.key === key)) map.get(fact.fieldId).push({ fact, value, key });
      });
      return map;
    };
    const left = groupedById(leftFacts);
    const right = groupedById(rightFacts);
    const ids = Array.from(new Set([...left.keys(), ...right.keys()])).filter(id => financial.has(id));
    return ids.flatMap(id => {
      const leftItems = left.get(id) || [];
      const rightItems = right.get(id) || [];
      const candidates = rightItems.length ? rightItems : [null];
      return candidates.map((rightItem, candidateIndex) => {
        const context = rightItem && rightItem.fact.contextLabel;
        const leftItem = leftItems.find(item => context && item.fact.contextLabel === context) || leftItems[0] || null;
        const l = leftItem && leftItem.fact;
        const r = rightItem && rightItem.fact;
        const priorValue = leftItem ? leftItem.value : "Not located";
        const currentValue = rightItem ? rightItem.value : "Not located";
        const ln = numericValue(priorValue);
        const rn = numericValue(currentValue);
        const change = ln !== null && rn !== null && ln !== 0 ? ((rn - ln) / Math.abs(ln)) * 100 : null;
        const interpretation = id === "specific_attachment" && change > 0 ? "Increased retained risk per covered person" : id === "aggregating_specific" && change > 0 ? "Increased retained aggregate-specific exposure" : change === 0 ? "No numeric change detected" : "Review the financial and contractual context";
        let warning = null;
        if (id === "commission") warning = "Commission changes are pricing assumptions and must not be blended into retained-risk movement.";
        else if (rightItems.length > 1) warning = "This is one candidate option from a multi-option document; no option is treated as selected without reviewer confirmation.";
        return {
        fieldId: id,
        label: `${(r || l).label}${context ? ` - ${context}` : rightItems.length > 1 ? ` - candidate ${candidateIndex + 1}` : ""}`,
        contextLabel: context || null,
        priorValue,
        currentValue,
        percentChange: change === null ? null : Number(change.toFixed(1)),
        interpretation,
        warning,
        priorSource: l ? { document: l.sourceDocument, page: l.page, contextLabel: l.contextLabel || null } : null,
        currentSource: r ? { document: r.sourceDocument, page: r.page, contextLabel: r.contextLabel || null } : null
      };
      });
    });
  }

  function buildComparison(left, right, mode) {
    const paired = compareAnalyses(left, right, mode);
    return Object.assign(paired, {
      schemaVersion: "1.0.0",
      engineVersion: "16.1.0",
      financialTerms: compareFinancialFacts(left.facts, right.facts),
      caution: mode === "proposal-policy" ? "Proposal, quote, and binder language is tracked separately from binding issued-policy language." : mode === "renewal" ? "Premium movement and retained-risk movement are reported separately." : "A confirmed difference requires actual paired language; a missing indicator alone is not a confirmed gap."
    });
  }

  return { tokens, similarity, modeColumns, compareAnalyses, numericValue, compareFinancialFacts, buildComparison };
});
