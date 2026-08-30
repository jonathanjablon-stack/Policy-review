# Testing and acceptance

## Commands

```sh
node --test tests/*.test.js
node scripts/build.js
node scripts/verify-build.js
```

## Test layers

| Layer | Coverage |
| --- | --- |
| Rule schema | Stable IDs, required metadata, regex compilation, uniqueness, and minimum library size |
| Parsing | Page boundaries, headings, hyphenation, repeated margins, roles, provenance, and unreadable-page warnings |
| Analysis | Multiple occurrences, standalone classification, facts, hierarchy, completeness, and summaries |
| Comparison | Concept pairing, proposal/final distinction, mode columns, semantic change, and financial deltas |
| Calibration | Crowne-derived financial and endorsement propositions; Palmetto-style remove/replace sequences |
| Held-out | Underwriting, enforcement, and medical scenarios not used for rule-specific metadata |
| Negative controls | Targeted Medicare, arbitration/mediation, and confirmed-gap false-positive controls |
| Static security | No raw `innerHTML` assignment for source text, no telemetry/AI endpoints, required workflows and exports |
| Release | Byte-identical production artifacts, manifest hash, feature markers, and rule-library integrity |

## Latest verified run

- Automated tests: 34 passed, 0 failed
- Curated positive expectations: 44 of 44 located across development and held-out fixtures
- Targeted negative expectations: 4 of 4 avoided
- Crowne financial calibration: $175,000 to $300,000 = 71.4%; $150,000 to $200,000 = 33.3%
- Hierarchy: base exclusion supersession, unmapped hierarchy visibility, and remove/replace language all passed
- Rules: 136 unique IDs with required metadata and compilable detection patterns
- Production artifacts: 3 byte-identical HTML files verified against the manifest

The fixture corpus is deliberately small and proposition-focused. These results are regression evidence, not a claim of population-level precision or legal accuracy.

## Manual acceptance checklist

- Open each workflow card and confirm the correct document-set labels.
- Analyze a TXT sample in each mode.
- Expand a finding, edit classification, severity, disposition, and notes.
- Open each source occurrence and confirm document/page/section context.
- Save and reopen a JSON session.
- Open executive and detailed `.doc` files in Word.
- Open the `.xls` matrix in Excel and confirm columns.
- Test one ordinary text PDF and one DOCX with network access to pinned parsing libraries.
- Confirm image-only pages produce a manual-review warning.
