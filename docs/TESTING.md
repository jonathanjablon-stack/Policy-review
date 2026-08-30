# Testing and acceptance

## Commands

```sh
node --test tests/*.test.js
node scripts/build.js
node scripts/verify-build.js
npm run calibrate:corpus -- --corpus-dir /absolute/path/to/materialized-corpus
```

## Test layers

| Layer | Coverage |
| --- | --- |
| OCR quality gate | Good native text, blank pages, sparse text, encoding noise, force-all-pages, and stronger-result selection |
| OCR provenance | Page health, engine metadata, confidence propagation, finding-confidence adjustment, and unresolved failures |
| OCR runtime assets | Local API, worker, three compatible WebAssembly cores, English model, licenses, and no remote recognition endpoint |
| Rule schema | Stable IDs, required metadata, regex compilation, uniqueness, and minimum library size |
| Parsing | PDF row reconstruction, page boundaries, headings, hyphenation, repeated margins, roles, provenance, proposal option tables, and unreadable-page warnings |
| Analysis | Multiple occurrences, standalone classification, facts, hierarchy, completeness, and summaries |
| Comparison | Concept pairing, proposal/final distinction, mode columns, semantic change, and financial deltas |
| Calibration | Synthetic Crowne and Palmetto propositions plus a separate actual-document run over 162 PDF pages and the attorney analysis |
| Held-out | Underwriting, enforcement, and medical scenarios not used for rule-specific metadata |
| Negative controls | Targeted Medicare, arbitration/mediation, and confirmed-gap false-positive controls |
| Static security | No raw `innerHTML` assignment for source text, no telemetry/AI endpoints, required workflows and exports |
| Release | Byte-identical HTML artifacts, vendor file hashes, offline ZIP integrity, reproducible package hash, feature markers, and rule-library integrity |

## Latest verified run

- Automated tests: 46 passed, 0 failed
- Curated positive expectations: 44 of 44 located across development and held-out fixtures
- Targeted negative expectations: 4 of 4 avoided
- Actual Crowne financial calibration: both proposals produced $175,000 to $300,000 = 71.4% and $150,000 to $200,000 = 33.3%; 0% and 10% commission variants remained separate
- Actual Palmetto hierarchy: seven explicit replacement pairs preserved, two exact later replacements marked earlier language superseded, and five unrelated replacements remained current
- Actual corpus parsing: 162 PDF pages had usable native text; the OCR quality gate identified four sparse or image-heavy pages for automatic OCR
- Rules: 136 unique IDs with required metadata and compilable detection patterns
- OCR runtime: generated stop-loss page recognized at 95 percent confidence with every required field recovered through Tesseract.js 7.0.0 and the bundled core/model
- Vendor assets: 209 file hashes and byte counts verified
- Production HTML: 3 byte-identical files, 140,119 bytes, SHA-256 `93be632ba97e2dac616b6c0ad19bf29eb57cb810c7e1110df55a95e0130392fd`
- Offline package: archive integrity and required entries passed; consecutive builds retained SHA-256 `ed95edab9d68b74858e3eae25942cac83d12603251732442e1aa7f8ef674db40`

The automated fixture corpus is deliberately small and proposition-focused. The separate actual-document calibration closes the required release scenarios, but neither result is a claim of population-level precision or legal accuracy.

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
