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
| OCR quality gate | Good native text, blank pages, sparse text, encoding noise, force-all-pages, and stronger-result selection |
| OCR provenance | Page health, engine metadata, confidence propagation, finding-confidence adjustment, and unresolved failures |
| OCR runtime assets | Local API, worker, three compatible WebAssembly cores, English model, licenses, and no remote recognition endpoint |
| Rule schema | Stable IDs, required metadata, regex compilation, uniqueness, and minimum library size |
| Parsing | Page boundaries, headings, hyphenation, repeated margins, roles, provenance, and unreadable-page warnings |
| Analysis | Multiple occurrences, standalone classification, facts, hierarchy, completeness, and summaries |
| Comparison | Concept pairing, proposal/final distinction, mode columns, semantic change, and financial deltas |
| Calibration | Crowne-derived financial and endorsement propositions; Palmetto-style remove/replace sequences |
| Held-out | Underwriting, enforcement, and medical scenarios not used for rule-specific metadata |
| Negative controls | Targeted Medicare, arbitration/mediation, and confirmed-gap false-positive controls |
| Static security | No raw `innerHTML` assignment for source text, no telemetry/AI endpoints, required workflows and exports |
| Release | Byte-identical HTML artifacts, vendor file hashes, offline ZIP integrity, reproducible package hash, feature markers, and rule-library integrity |

## Latest verified run

- Automated tests: 43 passed, 0 failed
- Curated positive expectations: 44 of 44 located across development and held-out fixtures
- Targeted negative expectations: 4 of 4 avoided
- Crowne financial calibration: $175,000 to $300,000 = 71.4%; $150,000 to $200,000 = 33.3%
- Hierarchy: base exclusion supersession, unmapped hierarchy visibility, and remove/replace language all passed
- Rules: 136 unique IDs with required metadata and compilable detection patterns
- OCR runtime: generated stop-loss page recognized at 95 percent confidence with every required field recovered through Tesseract.js 7.0.0 and the bundled core/model
- Vendor assets: 209 file hashes and byte counts verified
- Production HTML: 3 byte-identical files, 130,323 bytes, SHA-256 `e11ccf22af25260f0535fd1d9d4b8f8544be40a69b0a374f0d200249b168ee8f`
- Offline package: archive integrity and required entries passed; consecutive builds retained SHA-256 `64c8565eab317f7062a0e89f5e9885367f398f9b0a4e40607fbda159205a62a5`

The fixture corpus is deliberately small and proposition-focused. These results are regression evidence, not a claim of population-level precision or legal accuracy.

## Manual acceptance checklist

- Open each workflow card and confirm the correct document-set labels.
- Analyze a TXT sample in each mode.
- Expand a finding, edit classification, severity, disposition, and notes.
- Open each source occurrence and confirm document/page/section context.
- Analyze an ordinary text PDF and confirm OCR is not attempted on substantive pages.
- Analyze an image-only PDF and confirm OCR starts automatically, reports progress, and marks recovered pages `Readable (OCR)`.
- Analyze a hybrid PDF with “OCR every PDF page” selected and confirm the stronger native or OCR result is retained per page.
- Confirm document health displays OCR attempt/use, confidence, DPI, time, and any error.
- Confirm an OCR-sourced fact and finding display extraction provenance in the source viewer and exports.
- Simulate a missing or invalid OCR asset and confirm the page remains unresolved instead of being counted as reviewed.
- Save and reopen a JSON session.
- Open executive and detailed `.doc` files in Word.
- Open the `.xls` matrix in Excel and confirm columns.
- Test one DOCX with network access to the pinned Mammoth.js script.
- Extract the offline ZIP, serve it locally, disconnect the network, and confirm PDF parsing plus OCR still work.
