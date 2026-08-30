"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const DocumentModel = require("../src/parsing/document-model.js");
const Engine = require("../src/analysis/workbench-engine.js");
const Comparison = require("../src/comparison/comparison-engine.js");
const RuleLibrary = require("../rules/rule-library.js");

function parse(name, text, role, sequence) { return DocumentModel.parseDocument({ id: name.replace(/\W/g, "-"), name, text, role, sequence }); }

test("rule library has unique stable IDs and complete required metadata", () => {
  assert.ok(RuleLibrary.rules.length >= 100);
  assert.equal(new Set(RuleLibrary.rules.map(rule => rule.id)).size, RuleLibrary.rules.length);
  for (const rule of RuleLibrary.rules) {
    for (const key of ["id", "version", "title", "category", "issueClassification", "defaultSeverity", "detection", "hierarchyBehavior", "comparisonBehavior", "missingConceptBehavior", "whyItMatters", "recommendedAction", "regression"]) assert.ok(rule[key], `${rule.id} missing ${key}`);
    assert.doesNotThrow(() => new RegExp(rule.detection.patterns[0], rule.detection.flags));
  }
});

test("normalization repairs line-break hyphenation and preserves paragraphs", () => {
  const value = DocumentModel.normalizeText("experi-\nmental\r\n\r\nNext clause");
  assert.match(value, /experimental/);
  assert.match(value, /\n\nNext clause/);
});

test("document parsing preserves page boundaries and provenance", () => {
  const doc = parse("sample.txt", "SECTION 1\nSpecific Deductible: $100,000\fSECTION 2\nProof of loss within 90 days", "policy", 0);
  assert.equal(doc.pages.length, 2);
  assert.ok(doc.clauses.some(clause => clause.page === 2));
  assert.ok(doc.clauses.every(clause => clause.sourceDocument === "sample.txt"));
});

test("PDF line reconstruction preserves reading rows by position", () => {
  const text = DocumentModel.reconstructPdfLines([
    { str: "$175,000", transform: [1, 0, 0, 1, 300, 700] },
    { str: "Annual Specific Deductible", transform: [1, 0, 0, 1, 20, 700] },
    { str: "Renewal Option 3", transform: [1, 0, 0, 1, 20, 720] }
  ]);
  assert.equal(text, "Renewal Option 3\nAnnual Specific Deductible $175,000");
});

test("repeated headers and footers are removed across pages", () => {
  const pages = [1, 2, 3].map(number => ({ number, text: `CONFIDENTIAL POLICY\nSECTION ${number}\nUnique clause ${number}.\nPage ${number}` }));
  const doc = DocumentModel.parseDocument({ id: "repeat", name: "repeat.pdf", pages });
  assert.ok(doc.pages.every(page => !page.text.includes("CONFIDENTIAL POLICY")));
});

test("image-only pages are never treated as reviewed", () => {
  const doc = DocumentModel.parseDocument({ id: "scan", name: "scan.pdf", pages: [{ number: 1, text: "" }, { number: 2, text: "Readable policy language with many words explaining the policy and claim administration requirements in detail." }] });
  assert.deepEqual(doc.health.unreadablePages, [1]);
  assert.match(doc.health.warning, /1/);
});

test("role inference separates proposals, amendments, plans, and policies", () => {
  assert.equal(parse("renewal quote.pdf", "Renewal Option", null, 0).role, "proposal");
  assert.equal(parse("Amendment 2.pdf", "REMOVE AND REPLACE WITH", null, 0).role, "amendment");
  assert.equal(parse("SPD.pdf", "Summary Plan Description", null, 0).role, "plan");
  assert.equal(parse("contract.pdf", "Policy term", null, 0).role, "policy");
});

test("analysis retains materially distinct occurrences", () => {
  const doc = parse("multiple.pdf", "SCHEDULE\nSpecific Deductible: $100,000.\fENDORSEMENT\nThe Specific Deductible is $125,000.", "policy", 0);
  const result = Engine.analyzeMatter([doc], RuleLibrary, "standalone");
  const finding = result.findings.find(x => x.ruleId === "FIN-SPECIFIC-ATTACHMENT");
  assert.ok(finding);
  assert.equal(finding.occurrences.length, 2);
  assert.deepEqual(finding.occurrences.map(o => o.page), [1, 2]);
});

test("standalone detection does not produce confirmed plan-policy difference", () => {
  const result = Engine.analyzeMatter([parse("policy.pdf", "Experimental treatment is excluded.", "policy", 0)], RuleLibrary, "standalone");
  assert.ok(result.findings.length);
  assert.ok(result.findings.every(f => f.classification !== "Confirmed Plan/Policy Difference"));
});

test("fact extraction retains source page, text, and confidence", () => {
  const result = Engine.analyzeMatter([parse("policy.pdf", "SCHEDULE\nSpecific Attachment Point: $175,000. Specific Payable Percentage: 100%.", "policy", 0)], RuleLibrary, "standalone");
  const fact = result.facts.find(x => x.fieldId === "specific_attachment");
  assert.equal(fact.value, "175,000");
  assert.equal(fact.page, 1);
  assert.match(fact.sourceText, /175,000/);
  assert.equal(fact.confidence, "High");
});

test("hierarchy engine marks deleted base concepts superseded", () => {
  const base = parse("base-policy.pdf", "EXCLUSIONS\nAn illegal act or felony is excluded.", "policy", 0);
  const endorsement = parse("mirroring-endorsement.pdf", "PLAN MIRRORING ENDORSEMENT\nThis endorsement modifies the Policy. The illegal acts exclusion is deleted.", "endorsement", 1);
  const result = Engine.analyzeMatter([base, endorsement], RuleLibrary, "standalone");
  const finding = result.findings.find(x => x.ruleId === "EXC-ILLEGAL-ACTS");
  assert.ok(finding.occurrences.some(o => o.sourceDocument === "base-policy.pdf" && o.hierarchyStatus === "superseded"));
  assert.ok(finding.occurrences.some(o => o.sourceDocument === "mirroring-endorsement.pdf" && o.hierarchyStatus === "controlling modifier"));
});

test("unmapped hierarchy language remains low-confidence and visible", () => {
  const amendment = parse("amendment.pdf", "This amendment deletes the prior sentence and replaces it with the following language.", "amendment", 1);
  const events = Engine.hierarchyEvents([amendment], RuleLibrary.rules);
  assert.ok(events.length);
  assert.ok(events.some(event => event.confidence === "Low"));
});

test("Palmetto-style REMOVE and REPLACE sequence retains original and replacement", () => {
  const amendment = parse("Amendment 1.pdf", "AMENDMENT 1\nREMOVE: Emergency room copay is $100. AND REPLACE WITH: Emergency room copay is $250.", "amendment", 1);
  const events = Engine.hierarchyEvents([amendment], RuleLibrary.rules);
  const event = events.find(x => x.action === "delete" || x.action === "replace");
  assert.ok(event);
  assert.match(event.originalLanguage, /\$100/);
  assert.match(event.replacementLanguage, /\$250/);
});

test("later exact amendment replacements supersede only the language they replace", () => {
  const first = parse("Amendment 1.pdf", "AMENDMENT 1\nREMOVE: Deductibles accumulate separately. AND REPLACE WITH: Deductibles cross-apply.\nREMOVE: Emergency Room Services 100% after deductible. AND REPLACE WITH: Emergency Room Services 100% after guided provider deductible.", "amendment", 1);
  const second = parse("Amendment 2.pdf", "AMENDMENT 2\nREMOVE: Urgent Care $70 copay, then 100%. AND REPLACE WITH: Urgent Care $70 copay, then 100% after guided provider deductible.", "amendment", 2);
  const third = parse("Amendment 3.pdf", "AMENDMENT 3\nREMOVE: Urgent Care $70 copay, then 100% after guided provider deductible. AND REPLACE WITH: Urgent Care $70 copay applied to guided out of pocket, then 100%.\nREMOVE: Emergency Room Services 100% after guided provider deductible. AND REPLACE WITH: Emergency Room Services includes direct inpatient admission within 24 hours; 100% after guided provider deductible.", "amendment", 3);
  const events = Engine.hierarchyEvents([first, second, third], RuleLibrary.rules);
  assert.equal(events.length, 5);
  const deductible = events.find(event => /Deductibles cross-apply/i.test(event.replacementLanguage));
  const oldUrgent = events.find(event => /Urgent Care \$70 copay, then 100% after guided/i.test(event.replacementLanguage));
  const oldEmergency = events.find(event => /^Emergency Room Services 100% after guided/i.test(event.replacementLanguage));
  const newUrgent = events.find(event => /guided out of pocket/i.test(event.replacementLanguage));
  assert.equal(deductible.status, "current");
  assert.equal(oldUrgent.status, "superseded");
  assert.equal(oldEmergency.status, "superseded");
  assert.equal(newUrgent.status, "current");
  assert.equal(newUrgent.supersedesEventId, oldUrgent.id);
});

test("completeness distinguishes located, multiple, not located, and unable to determine", () => {
  const readable = Engine.analyzeMatter([parse("readable.pdf", "Specific Deductible: $100,000. Specific Deductible: $125,000.", "policy", 0)], RuleLibrary, "standalone");
  assert.equal(readable.completeness.find(x => x.conceptId === "FIN-SPECIFIC-ATTACHMENT").status, "Multiple provisions located");
  assert.equal(readable.completeness.find(x => x.conceptId === "ENF-ARBITRATION").status, "Not located");
  const unreadable = Engine.analyzeMatter([DocumentModel.parseDocument({ id: "scan", name: "scan.pdf", pages: [{ number: 1, text: "" }] })], RuleLibrary, "standalone");
  assert.equal(unreadable.completeness.find(x => x.conceptId === "ENF-ARBITRATION").status, "Unable to determine");
});

test("comparison pairs semantically corresponding concepts", () => {
  const left = Engine.analyzeMatter([parse("plan.pdf", "Medical necessity means appropriate under the Plan.", "plan", 0)], RuleLibrary, "plan-policy");
  const right = Engine.analyzeMatter([parse("policy.pdf", "Medical necessity is determined in the Company's sole discretion.", "policy", 0)], RuleLibrary, "plan-policy");
  const comparison = Comparison.buildComparison(left, right, "plan-policy");
  const row = comparison.rows.find(x => x.ruleId === "MED-MEDICAL-NECESSITY");
  assert.ok(row);
  assert.equal(row.classification, "Confirmed Plan/Policy Difference");
  assert.equal(comparison.columns[0], "Plan Language");
});

test("proposal comparison distinguishes representation from issued term", () => {
  const quote = Engine.analyzeMatter([parse("quote.pdf", "Advance funding included.", "proposal", 0)], RuleLibrary, "proposal-policy");
  const policy = Engine.analyzeMatter([parse("policy.pdf", "Policy term is January 1 through December 31.", "policy", 0)], RuleLibrary, "proposal-policy");
  const comparison = Comparison.buildComparison(quote, policy, "proposal-policy");
  const row = comparison.rows.find(x => x.ruleId === "ADMIN-ADVANCE");
  assert.match(row.nature, /not located in issued policy/i);
  assert.match(row.consequence, /not itself an issued-policy term/i);
});

test("renewal financial comparison calculates retained-risk increases", () => {
  const prior = Engine.analyzeMatter([parse("prior.pdf", "Specific Attachment Point: $175,000. Aggregating Specific Deductible: $150,000.", "policy", 0)], RuleLibrary, "renewal");
  const renewal = Engine.analyzeMatter([parse("renewal.pdf", "Specific Attachment Point: $300,000. Aggregating Specific Deductible: $200,000.", "policy", 0)], RuleLibrary, "renewal");
  const result = Comparison.buildComparison(prior, renewal, "renewal");
  assert.equal(result.financialTerms.find(x => x.fieldId === "specific_attachment").percentChange, 71.4);
  assert.equal(result.financialTerms.find(x => x.fieldId === "aggregating_specific").percentChange, 33.3);
});

test("multi-option proposal tables preserve option labels and calculate each candidate separately", () => {
  const prior = parse("prior.pdf", "SCHEDULE\nSpecific Attachment Point: $175,000. Aggregating Specific Deductible: $150,000.", "policy", 0);
  const proposal = parse("renewal proposal.pdf", "Plan Description Current Renewal Option 1 Renewal Option 2\nAnnual Specific Deductible per Individual $ 175,000 $ 175,000 $ 225,000\nAggregating Specific Additional Plan Liability $ 150,000 $ 150,000 $ 700,000\nQuoted Rate(s) include Commission of 10.00% 0.00% 0.00%\fPlan Description Renewal Option 3\nAnnual Specific Deductible per Individual $ 300,000\nAggregating Specific Additional Plan Liability $ 200,000\nQuoted Rate(s) include Commission of 0.00%", "proposal", 1);
  const renewal = Engine.analyzeMatter([proposal], RuleLibrary, "renewal");
  const optionThreeFact = renewal.facts.find(fact => fact.fieldId === "specific_attachment" && fact.contextLabel === "Renewal Option 3");
  assert.equal(optionThreeFact.value, "300,000");
  const result = Comparison.buildComparison(Engine.analyzeMatter([prior], RuleLibrary, "renewal"), renewal, "renewal");
  assert.equal(result.financialTerms.find(row => row.fieldId === "specific_attachment" && row.contextLabel === "Renewal Option 3").percentChange, 71.4);
  assert.equal(result.financialTerms.find(row => row.fieldId === "aggregating_specific" && row.contextLabel === "Renewal Option 3").percentChange, 33.3);
  assert.ok(result.financialTerms.some(row => row.fieldId === "commission" && /must not be blended/i.test(row.warning)));
});

test("comparison similarity is deterministic", () => {
  assert.equal(Comparison.similarity("alpha beta gamma", "alpha beta gamma"), 1);
  assert.ok(Comparison.similarity("alpha beta gamma", "alpha delta epsilon") < 0.5);
});

test("matter summary reports counts without legal certainty", () => {
  const result = Engine.analyzeMatter([parse("policy.pdf", "Arbitration applies. Advance funding endorsement included.", "policy", 0)], RuleLibrary, "standalone");
  assert.match(result.summary.text, /review leads, not legal conclusions/i);
  assert.equal(result.summary.counts.documents, 1);
});
