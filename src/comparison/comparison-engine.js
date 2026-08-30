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
        leftSource: lo ? { document: lo.sourceDocument, page: lo.page, section: lo.section } : null,
        rightLanguage: ro ? ro.operativeLanguage : "Not located in extractable text",
        rightSource: ro ? { document: ro.sourceDocument, page: ro.page, section: ro.section } : null,
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
    const financial = new Set(["specific_attachment", "alternate_attachment", "aggregating_specific", "aggregate_attachment", "specific_percentage", "aggregate_percentage", "maximums", "benefit_basis", "premium_grace", "rate_cap"]);
    const firstById = list => {
      const map = new Map();
      list.forEach(f => { if (!map.has(f.fieldId)) map.set(f.fieldId, f); });
      return map;
    };
    const left = firstById(leftFacts);
    const right = firstById(rightFacts);
    const ids = Array.from(new Set([...left.keys(), ...right.keys()])).filter(id => financial.has(id));
    return ids.map(id => {
      const l = left.get(id) || null;
      const r = right.get(id) || null;
      const ln = numericValue(l && l.value);
      const rn = numericValue(r && r.value);
      const change = ln !== null && rn !== null && ln !== 0 ? ((rn - ln) / Math.abs(ln)) * 100 : null;
      return {
        fieldId: id,
        label: (r || l).label,
        priorValue: l ? l.value : "Not located",
        currentValue: r ? r.value : "Not located",
        percentChange: change === null ? null : Number(change.toFixed(1)),
        interpretation: id === "specific_attachment" && change > 0 ? "Increased retained risk per covered person" : id === "aggregating_specific" && change > 0 ? "Increased retained aggregate-specific exposure" : change === 0 ? "No numeric change detected" : "Review the financial and contractual context",
        warning: /premium|commission/.test(id) ? "Normalize commission assumptions before comparing premium." : null
      };
    });
  }

  function buildComparison(left, right, mode) {
    const paired = compareAnalyses(left, right, mode);
    return Object.assign(paired, {
      schemaVersion: "1.0.0",
      engineVersion: "16.0.0",
      financialTerms: compareFinancialFacts(left.facts, right.facts),
      caution: mode === "proposal-policy" ? "Proposal, quote, and binder language is tracked separately from binding issued-policy language." : mode === "renewal" ? "Premium movement and retained-risk movement are reported separately." : "A confirmed difference requires actual paired language; a missing indicator alone is not a confirmed gap."
    });
  }

  return { tokens, similarity, modeColumns, compareAnalyses, numericValue, compareFinancialFacts, buildComparison };
});
