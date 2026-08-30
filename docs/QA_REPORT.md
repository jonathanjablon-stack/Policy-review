# QA report - v16.1.0

Date: 2026-08-30

Canonical repository: `to-shreds/Policy-review`

Branch: `main`

Pre-OCR v16.0.0 commit: `b9f43493293d7257ca7947acc6ed20c391e6fe6c`

## Baseline verification

- The v16.0.0 production artifact remains at `dist/StopLoss_Workbench_v16.0.0.html`.
- The v15.3b baseline remains at `PA15.3b.html` and `archive/v15.3b/PA15.3b.html`.
- The v15.3b Git blob remains `34e7d1c733be7589b52f626cf0be167efa283017`.
- The v15.3b SHA-256 remains `394233aa125bd14d43830652146749c3dc914432eb63032dbf5eee6eb55abfba`.
- GitHub reports the former owner path as moved permanently to repository ID `1133539912`, now named `to-shreds/Policy-review`.

## Automated verification

- 46 tests passed; 0 failed.
- 136 unique rule IDs passed metadata and regex compilation checks.
- 44 of 44 curated positive expectations were located.
- 4 of 4 targeted negative expectations were avoided.
- Standalone findings never used confirmed plan/policy classification without comparison evidence.
- Multiple distinct occurrences retained page provenance.
- Deleted base exclusions were marked superseded when a mapped endorsement controlled.
- Unmapped hierarchy language remained visible at low confidence.
- Multi-option proposal tables retained labeled candidate values instead of collapsing to the first column.
- Exact later REMOVE / REPLACE chains superseded only matching earlier replacement language.
- Crowne-specific attachment movement calculated as 71.4 percent.
- Crowne aggregating-specific movement calculated as 33.3 percent.
- Commission variants remained separate from retained-risk calculations.
- Source-document UI rendering uses text-safe DOM APIs.
- No telemetry, generative-AI endpoint, or remote OCR endpoint is present.

## OCR verification

- The automatic quality gate skipped a substantive native text layer.
- Blank, sparse, and garbled page text triggered OCR.
- The force-all-pages override triggered OCR on good native text.
- OCR replaced native text only when the OCR result scored materially higher.
- Extraction method and OCR confidence flowed into facts and findings.
- A page still blank after attempted OCR remained unresolved and drove `Unable to determine` completeness status.
- Tesseract.js 7.0.0 recognized a generated stop-loss schedule through the bundled WebAssembly core and English model at 95 percent confidence.
- The runtime smoke test recovered `STOP-LOSS POLICY SCHEDULE`, `175,000`, `90 days`, and `SL-2026-1042`.

The runtime smoke test used Tesseract.js's Node worker from the same 7.0.0 distribution with the repository's bundled core and language model. It validates actual engine recognition and those packaged assets. It does not claim a browser-worker interaction test.

## Actual corpus calibration

- The mandatory Crowne sequence passed against the 44-page policy, both 8-page proposals, and attorney analysis.
- The policy baseline retained $175,000 specific and $150,000 aggregating-specific values.
- Renewal Option 3 retained $300,000 specific and $200,000 aggregating-specific values in both proposals.
- Both proposal comparisons produced 71.4 percent and 33.3 percent retained-risk movements.
- The 0 percent and 10 percent commission variants remained distinct and carried an explicit normalization warning.
- The rate-cap check identified the express cap on the specific premium rate and aggregating-specific deductible, did not claim an express cap on the specific attachment point, and matched the attorney analysis nuance.
- The mandatory Palmetto sequence passed against the 98-page SPD and all three amendments.
- Seven explicit replacement pairs were preserved; five remained current and two were superseded by exact later replacement chains.
- Unrelated amendment language remained current.
- All 162 PDF pages had usable native text. The quality gate identified four sparse or image-heavy pages as automatic OCR candidates.
- Proprietary source text and binaries remain outside the repository. The calibration runner records input hashes and emits aggregate results only.

## Build verification

- HTML artifact: `dist/StopLoss_Workbench_v16.1.0.html`
- HTML size: 140,119 bytes
- HTML SHA-256: `93be632ba97e2dac616b6c0ad19bf29eb57cb810c7e1110df55a95e0130392fd`
- Offline package: `dist/StopLoss_Workbench_v16.1.0-offline.zip`
- Offline package size: 8,799,140 bytes
- Offline package SHA-256: `ed95edab9d68b74858e3eae25942cac83d12603251732442e1aa7f8ef674db40`
- `dist/StopLoss_Workbench_v16.1.0.html`, `dist/index.html`, and root `index.html` are byte-identical.
- 209 vendored PDF and OCR runtime files passed recorded byte-count and SHA-256 checks.
- The ZIP passed archive integrity and required-entry checks.
- A second complete build produced the identical ZIP SHA-256.

## Browser exercise

The environment exposes the Playwright package but no Chromium executable. A full browser click-through is therefore not claimed. Static application and security checks passed, the real OCR engine smoke test passed, and the exact browser acceptance checklist is preserved in `docs/TESTING.md`.

## Acceptance gates

| Gate | Result |
| --- | --- |
| Baseline preservation and rollback | Pass |
| Maintainable modular source | Pass |
| Production HTML and offline package | Pass |
| Automatic local PDF OCR | Pass for logic, runtime engine, model, assets, and package; browser click-through pending |
| OCR failure and unresolved-page handling | Pass |
| OCR provenance and confidence | Pass |
| Structured rules and guardrails | Pass |
| PDF, DOCX, TXT, and manual text | Pass with documented DOCX CDN limit |
| Hierarchy and supersession | Pass |
| Mandatory actual-document calibration | Pass |
| Policy at a Glance | Pass |
| Four required review modes | Pass |
| Attorney adjudication workspace | Pass |
| Word, Excel, and session exports | Pass with documented non-OOXML format |
| Regression and held-out fixtures | Pass |
| Documentation, licenses, integrity, and rollback | Pass |

## Limitations

See `docs/KNOWN_LIMITATIONS.md`. The principal limits are English-only OCR data, scan-dependent recognition accuracy, a required static server, a pinned DOCX-only CDN dependency, deterministic rather than AI semantic pairing, and non-OOXML Word/Excel export containers.

## Release judgment

The v16.1 release closes the prior no-OCR limitation with a local engine, automatic page-quality decisions, auditable provenance, explicit failure handling, and a portable package. It does not claim that OCR or deterministic detection replaces source verification and attorney review.
