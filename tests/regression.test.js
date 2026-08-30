"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const DocumentModel = require("../src/parsing/document-model.js");
const Engine = require("../src/analysis/workbench-engine.js");
const RuleLibrary = require("../rules/rule-library.js");

const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/calibration-cases.json"), "utf8"));

for (const group of ["development", "heldOut"]) {
  for (const fixture of fixtures[group]) {
    test(`${group}: ${fixture.id} returns every expected rule`, () => {
      const doc = DocumentModel.parseDocument({ id: fixture.id, name: `${fixture.id}.txt`, role: fixture.role, text: fixture.text });
      const result = Engine.analyzeMatter([doc], RuleLibrary, "standalone");
      const ids = new Set(result.findings.map(x => x.ruleId));
      for (const expected of fixture.expectedRules) assert.ok(ids.has(expected), `${fixture.id} missed ${expected}`);
    });
  }
}

for (const fixture of fixtures.negativeControls) {
  test(`negative control: ${fixture.id}`, () => {
    const doc = DocumentModel.parseDocument({ id: fixture.id, name: `${fixture.id}.txt`, text: fixture.text });
    const result = Engine.analyzeMatter([doc], RuleLibrary, "standalone");
    const ids = new Set(result.findings.map(x => x.ruleId));
    for (const forbidden of fixture.forbiddenRules || []) assert.ok(!ids.has(forbidden), `${fixture.id} produced ${forbidden}`);
    for (const forbidden of fixture.forbiddenClassifications || []) assert.ok(result.findings.every(x => x.classification !== forbidden));
  });
}

test("held-out evaluation is isolated from rule fixture metadata", () => {
  assert.ok(fixtures.heldOut.length >= 3);
  assert.ok(RuleLibrary.rules.every(rule => rule.regression.positive.length === 0 && rule.regression.negative.length === 0));
});
