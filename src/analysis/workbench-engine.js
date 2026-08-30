(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.StopLossWorkbenchEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const FACT_DEFINITIONS = [
    ["carrier", "Carrier", "(?:issued by|underwritten by|carrier[:\\s]+)([A-Z][A-Za-z&.,' -]{2,80}(?:Insurance Company|Life Insurance Company|Insurance Co\\.?))"],
    ["policyholder", "Policyholder", "(?:policyholder|policy holder|insured|employer)[:\\s]+([A-Z][^\\n;]{2,100})"],
    ["policy_number", "Policy number", "(?:policy (?:number|no\\.?|#))[:\\s#]*([A-Z0-9-]{4,40})"],
    ["jurisdiction", "Jurisdiction / state issued", "(?:state issued|jurisdiction|governing law)[:\\s]+([A-Z][A-Za-z ]{2,40})"],
    ["policy_term", "Policy term", "(?:policy term|policy period)[:\\s]+([^\\n;]{5,100})"],
    ["effective_date", "Effective date", "(?:effective date|effective)[:\\s]+((?:January|February|March|April|May|June|July|August|September|October|November|December) \\d{1,2}, \\d{4}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})"],
    ["expiration_date", "Expiration date", "(?:expiration date|expires?)[:\\s]+((?:January|February|March|April|May|June|July|August|September|October|November|December) \\d{1,2}, \\d{4}|\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})"],
    ["claim_administrator", "Claim administrator", "(?:claim administrator|claims administrator|third[- ]party administrator|TPA)[:\\s]+([^\\n;]{2,100})"],
    ["pbm", "PBM", "(?:pharmacy benefit manager|PBM)[:\\s]+([^\\n;]{2,100})"],
    ["network", "Network", "(?:provider network|network)[:\\s]+([^\\n;]{2,100})"],
    ["cost_containment", "Cost containment vendor", "(?:cost containment vendor|cost containment)[:\\s]+([^\\n;]{2,100})"],
    ["rbp_vendor", "RBP vendor", "(?:reference[- ]based pricing vendor|RBP vendor)[:\\s]+([^\\n;]{2,100})"],
    ["specific_attachment", "Specific attachment point", "(?:specific deductible|specific attachment point|annual specific deductible)[:\\s$]*([0-9][0-9,]*(?:\\.\\d{2})?)"],
    ["alternate_attachment", "Alternate / contingent attachment point", "(?:alternate|contingent|special risk) (?:specific deductible|attachment point)[:\\s$]*([0-9][0-9,]*(?:\\.\\d{2})?)"],
    ["aggregating_specific", "Aggregating specific deductible", "(?:aggregating specific deductible|aggregate specific deductible|additional plan liability)[:\\s$]*([0-9][0-9,]*(?:\\.\\d{2})?)"],
    ["aggregate_attachment", "Aggregate attachment point / factor", "(?:aggregate attachment point|aggregate factor|minimum aggregate attachment)[:\\s$]*([^\\n;]{2,80})"],
    ["specific_percentage", "Specific payable percentage", "(?:specific payable percentage|specific reimbursement percentage|specific coinsurance)[:\\s]*(\\d{1,3}\\s*%)"],
    ["aggregate_percentage", "Aggregate payable percentage", "(?:aggregate payable percentage|aggregate reimbursement percentage|aggregate coinsurance)[:\\s]*(\\d{1,3}\\s*%)"],
    ["maximums", "Annual / lifetime / policy maximum", "(?:maximum (?:benefit|reimbursement|liability)|lifetime maximum|policy period maximum)[:\\s$]*([^\\n;]{2,80})"],
    ["benefit_basis", "Contract / benefit basis", "(?:contract type|contract basis|benefit basis)[:\\s]+([^\\n;]{2,80}|(?:12|15|18|24|36|48|60|72)[/-](?:12|15|18|24|36))"],
    ["incurred_window", "Incurred window", "(?:incurred (?:from|between|during)|incurred window)[:\\s]+([^\\n;]{3,100})"],
    ["paid_window", "Paid window", "(?:paid (?:from|between|during)|paid window)[:\\s]+([^\\n;]{3,100})"],
    ["run_in", "Run-in", "(?:run[- ]?in)[:\\s]+([^\\n;]{2,80})"],
    ["run_out", "Run-out", "(?:run[- ]?out)[:\\s]+([^\\n;]{2,80})"],
    ["terminal_liability", "Terminal liability", "(?:terminal liability)[:\\s]+([^\\n;]{2,80})"],
    ["advance_funding", "Advance funding", "((?:expedited )?advance(?:d)? funding)"],
    ["plan_mirroring", "Plan mirroring", "(plan mirroring|mirrors? the plan)"],
    ["no_new_laser", "No-new-laser protection", "(no new (?:laser|special risk limitation))"],
    ["rate_cap", "Rate-cap protection", "((?:renewal )?rate cap|rate increase shall not exceed[^\\n;]{0,50})"],
    ["reporting_threshold", "High-dollar reporting threshold", "(?:reporting threshold|report claims? (?:expected )?to exceed)[:\\s$]*([0-9][0-9,]*)"],
    ["notice_deadline", "Claim notice deadline", "(?:notice of claim|claim notice)[^\\n;]{0,60}?(\\d+\\s+(?:days?|months?))"],
    ["proof_deadline", "Proof-of-loss deadline", "(?:proof of loss|proof[- ]of[- ]loss)[^\\n;]{0,80}?(\\d+\\s+(?:days?|months?))"],
    ["premium_grace", "Premium / grace terms", "(?:grace period)[^\\n;]{0,50}?(\\d+\\s+days?)"],
    ["endorsements", "Attached endorsements", "((?:endorsement|rider|amendment) (?:number|no\\.?|#)?\\s*[A-Z0-9-]+[^\\n;]{0,80})"]
  ].map(([id, label, pattern]) => ({ id, label, pattern, flags: "gi" }));

  const ACTIONS = [
    ["delete", /\b(?:remov(?:e|es|ed)|delet(?:e|es|ed)|strik(?:e|es|en))\b/i],
    ["replace", /\b(?:replac(?:e|es|ed)|amended to read|and replace with)\b/i],
    ["add", /\b(?:add|adds|added|incorporated into)\b/i],
    ["priority", /\b(?:controls?|prevails?|notwithstanding)\b/i],
    ["modify", /\b(?:modifies|changes|amends)\b/i]
  ];

  function compile(pattern, flags) {
    try { return new RegExp(pattern, flags || "gi"); }
    catch (error) { return null; }
  }

  function occurrenceKey(ruleId, clause, match) {
    return `${ruleId}|${clause.documentId}|${clause.page}|${clause.id}|${match.index}|${match[0].toLowerCase()}`;
  }

  function confidenceFor(rule, match, clause) {
    const exact = match[0].trim().split(/\s+/).length >= 2;
    if (clause.extractionMethod === "ocr" && Number.isFinite(clause.ocrConfidence)) {
      if (clause.ocrConfidence < 60) return { level: "Low", rationale: `The indicator came from local OCR with ${clause.ocrConfidence}% page confidence and requires source-image confirmation.` };
      if (clause.ocrConfidence < 80) return { level: "Moderate", rationale: `The indicator came from local OCR with ${clause.ocrConfidence}% page confidence and should be checked against the rendered page.` };
    }
    if (exact && clause.text.length <= 1800) return { level: "High", rationale: "A multi-word rule indicator appears in a bounded operative clause." };
    if (exact) return { level: "Moderate", rationale: "A rule indicator appears in a long clause that requires contextual review." };
    return { level: "Low", rationale: "A short indicator appears and may be ambiguous outside its full provision." };
  }

  function analyzeDocument(document, rules) {
    const occurrences = [];
    const seen = new Set();
    rules.forEach(rule => {
      const patterns = rule.detection && rule.detection.patterns || [];
      document.clauses.forEach(clause => {
        patterns.forEach(pattern => {
          const regex = compile(pattern, rule.detection.flags || "gi");
          if (!regex) return;
          let match;
          while ((match = regex.exec(clause.text)) !== null) {
            const key = occurrenceKey(rule.id, clause, match);
            if (!seen.has(key)) {
              seen.add(key);
              const confidence = confidenceFor(rule, match, clause);
              occurrences.push({
                id: `occ-${occurrences.length + 1}-${rule.id}`,
                ruleId: rule.id,
                documentId: document.id,
                sourceDocument: document.name,
                documentRole: document.role,
                sequence: document.sequence,
                page: clause.page,
                section: clause.section,
                exactTrigger: match[0],
                operativeLanguage: clause.text,
                surroundingContext: clause.text,
                clauseId: clause.id,
                hierarchyStatus: "current",
                supersededBy: null,
                confidence: confidence.level,
                confidenceRationale: confidence.rationale,
                extractionMethod: clause.extractionMethod || "native",
                ocrConfidence: Number.isFinite(clause.ocrConfidence) ? clause.ocrConfidence : null,
                ocrAttempted: Boolean(clause.ocrAttempted)
              });
            }
            if (!match[0]) regex.lastIndex += 1;
          }
        });
      });
    });
    return occurrences;
  }

  function extractFacts(document) {
    const facts = [];
    FACT_DEFINITIONS.forEach(def => {
      const regex = compile(def.pattern, def.flags);
      if (!regex) return;
      document.clauses.forEach(clause => {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(clause.text)) !== null) {
          const value = String(match[1] || match[0]).replace(/\s+/g, " ").trim().replace(/[.,;:]$/, "");
          if (value && !facts.some(f => f.fieldId === def.id && f.value.toLowerCase() === value.toLowerCase() && f.documentId === document.id)) {
            facts.push({
              id: `fact-${document.id}-${def.id}-${facts.length + 1}`,
              fieldId: def.id,
              label: def.label,
              value,
              sourceDocument: document.name,
              documentId: document.id,
              page: clause.page,
              section: clause.section,
              sourceText: clause.text,
              confidence: clause.extractionMethod === "ocr" && Number.isFinite(clause.ocrConfidence) && clause.ocrConfidence < 80 ? "Moderate" : match[1] ? "High" : "Moderate",
              extractionMethod: clause.extractionMethod || "native",
              ocrConfidence: Number.isFinite(clause.ocrConfidence) ? clause.ocrConfidence : null,
              reviewerValue: null,
              reviewerStatus: "Unreviewed"
            });
          }
          if (!match[0]) regex.lastIndex += 1;
        }
      });
    });
    return facts;
  }

  function actionFor(text) {
    const found = ACTIONS.find(([, regex]) => regex.test(text));
    return found ? found[0] : null;
  }

  function hierarchyEvents(documents, rules) {
    const events = [];
    documents.forEach(document => {
      document.clauses.filter(c => c.hierarchySignal || /amendment|endorsement|schedule/i.test(c.section)).forEach(clause => {
        const action = actionFor(clause.text);
        if (!action) return;
        const affectedRuleIds = [];
        rules.forEach(rule => {
          if ((rule.detection.patterns || []).some(pattern => {
            const regex = compile(pattern, "i");
            return regex && regex.test(clause.text);
          })) affectedRuleIds.push(rule.id);
        });
        const pair = clause.text.match(/\b(?:REMOVE|DELETE|STRIKE)\b[:\s]+(.{1,900}?)\b(?:AND REPLACE WITH|REPLACE WITH|ADD)\b[:\s]+(.{1,1400})/i);
        events.push({
          id: `hier-${events.length + 1}`,
          documentId: document.id,
          sourceDocument: document.name,
          documentRole: document.role,
          sequence: document.sequence,
          page: clause.page,
          section: clause.section,
          action,
          affectedRuleIds,
          originalLanguage: pair ? pair[1].trim() : null,
          replacementLanguage: pair ? pair[2].trim() : null,
          modifyingLanguage: clause.text,
          extractionMethod: clause.extractionMethod || "native",
          ocrConfidence: Number.isFinite(clause.ocrConfidence) ? clause.ocrConfidence : null,
          ocrAttempted: Boolean(clause.ocrAttempted),
          confidence: affectedRuleIds.length ? "Moderate" : "Low",
          rationale: affectedRuleIds.length ? "The modifying clause contains an indicator for the affected concept." : "A hierarchy verb is present, but the affected concept could not be mapped deterministically."
        });
      });
    });
    return events;
  }

  function applyHierarchy(occurrences, events) {
    const destructive = new Set(["delete", "replace"]);
    events.filter(event => destructive.has(event.action) && event.affectedRuleIds.length).forEach(event => {
      occurrences.forEach(occurrence => {
        const isOlder = occurrence.sequence < event.sequence || (occurrence.sequence === event.sequence && occurrence.documentId !== event.documentId && occurrence.documentRole !== "endorsement" && occurrence.documentRole !== "amendment");
        if (isOlder && event.affectedRuleIds.includes(occurrence.ruleId)) {
          occurrence.hierarchyStatus = "superseded";
          occurrence.supersededBy = event.id;
        }
      });
    });
    occurrences.forEach(occurrence => {
      if ((occurrence.documentRole === "amendment" || occurrence.documentRole === "endorsement") && occurrence.hierarchyStatus === "current") {
        occurrence.hierarchyStatus = "controlling modifier";
      }
    });
    return occurrences;
  }

  function buildFindings(occurrences, rules, mode) {
    const byRule = new Map();
    rules.forEach(rule => byRule.set(rule.id, []));
    occurrences.forEach(occurrence => {
      if (!byRule.has(occurrence.ruleId)) byRule.set(occurrence.ruleId, []);
      byRule.get(occurrence.ruleId).push(occurrence);
    });
    return rules.filter(rule => byRule.get(rule.id).length).map(rule => {
      const all = byRule.get(rule.id).sort((a, b) => a.sequence - b.sequence || a.page - b.page);
      const current = all.filter(o => o.hierarchyStatus !== "superseded");
      const lead = current[0] || all[0];
      const confidence = current.some(o => o.confidence === "High") ? "High" : current.some(o => o.confidence === "Moderate") ? "Moderate" : "Low";
      return {
        id: `finding-${rule.id}`,
        ruleId: rule.id,
        title: rule.title,
        category: rule.category,
        classification: mode === "standalone" && rule.issueClassification === "Confirmed Plan/Policy Difference" ? "Potential Coverage Gap" : rule.issueClassification,
        severity: rule.defaultSeverity,
        confidence,
        sourceDocument: lead.sourceDocument,
        page: lead.page,
        section: lead.section,
        hierarchyStatus: current.length ? lead.hierarchyStatus : "superseded only",
        exactLanguage: lead.operativeLanguage,
        context: lead.surroundingContext,
        whyItMatters: rule.whyItMatters,
        practicalConsequence: rule.analysis,
        recommendedAction: rule.recommendedAction,
        negotiationPoint: rule.negotiationPoint,
        reviewerQuestions: rule.reviewerQuestions,
        occurrences: all,
        reviewerNotes: "",
        disposition: "Needs Review",
        included: rule.issueClassification !== "Informational",
        ruleVersion: rule.version
      };
    });
  }

  function completenessMatrix(rules, occurrences, documents) {
    const unreadable = documents.some(d => d.health.unreadablePages.length);
    return rules.map(rule => {
      const found = occurrences.filter(o => o.ruleId === rule.id && o.hierarchyStatus !== "superseded");
      const superseded = occurrences.filter(o => o.ruleId === rule.id && o.hierarchyStatus === "superseded");
      let status = "Not located";
      if (found.length > 1) status = "Multiple provisions located";
      else if (found.length === 1) status = found[0].confidence === "Low" ? "Possibly addressed" : "Located";
      else if (superseded.length) status = "Possibly addressed";
      else if (unreadable) status = "Unable to determine";
      return {
        conceptId: rule.id,
        concept: rule.title,
        category: rule.category,
        status,
        rationale: found.length ? `${found.length} current occurrence(s) retained with provenance.` : superseded.length ? "Only superseded language was located." : unreadable ? "No current occurrence was located, and one or more pages remained unreadable after automatic local OCR." : "No indicator was located in the extractable text. This is not a legal conclusion or a confirmed gap.",
        searchedFor: rule.positiveIndicators,
        occurrences: found.map(o => ({ document: o.sourceDocument, page: o.page, section: o.section }))
      };
    });
  }

  function priorityRank(value) {
    return { Critical: 0, High: 1, Moderate: 2, Low: 3, Informational: 4 }[value] ?? 5;
  }

  function matterSummary(findings, documents, events) {
    const current = findings.filter(f => f.hierarchyStatus !== "superseded only");
    const priority = current.filter(f => priorityRank(f.severity) <= 1);
    const favorable = current.filter(f => f.classification === "Favorable Provision");
    const unreadable = documents.flatMap(d => d.health.unreadablePages.map(page => `${d.name} p. ${page}`));
    return {
      text: `${documents.length} document(s) were parsed into operative clauses. The deterministic review produced ${current.length} current finding concept(s), including ${priority.length} critical/high-priority concept(s) and ${favorable.length} favorable concept(s). Detection identifies review leads, not legal conclusions.`,
      counts: { documents: documents.length, findings: current.length, priority: priority.length, favorable: favorable.length, hierarchyEvents: events.length },
      unreadablePages: unreadable
    };
  }

  function analyzeMatter(documents, ruleLibrary, mode) {
    const rules = ruleLibrary.rules || ruleLibrary;
    const ordered = documents.slice().sort((a, b) => a.sequence - b.sequence);
    const occurrences = ordered.flatMap(document => analyzeDocument(document, rules));
    const events = hierarchyEvents(ordered, rules);
    applyHierarchy(occurrences, events);
    const findings = buildFindings(occurrences, rules, mode || "standalone").sort((a, b) => priorityRank(a.severity) - priorityRank(b.severity) || a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
    const facts = ordered.flatMap(extractFacts);
    const completeness = completenessMatrix(rules, occurrences, ordered);
    return {
      schemaVersion: "1.0.0",
      engineVersion: "16.1.0",
      ruleLibraryVersion: ruleLibrary.version || "unknown",
      mode: mode || "standalone",
      createdAt: new Date().toISOString(),
      documents: ordered,
      facts,
      hierarchyEvents: events,
      findings,
      completeness,
      summary: matterSummary(findings, ordered, events)
    };
  }

  return {
    FACT_DEFINITIONS,
    analyzeDocument,
    extractFacts,
    hierarchyEvents,
    applyHierarchy,
    buildFindings,
    completenessMatrix,
    analyzeMatter
  };
});
