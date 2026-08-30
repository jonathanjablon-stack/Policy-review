# QA report - v16.0.0

Date: 2026-08-30

Canonical repository: `to-shreds/Policy-review`

Branch: `main`

Baseline archive commit: `bc7a3450be6895b4a0b915abec50588c1856036d`

Implementation commit: `345606d51390e88905d98e4fa1f1c001ae248921`

Initial release-documentation commit: `61a97af9913ca922b85c9e35f7600add3ff4d298`

## Baseline verification

- Baseline path: `PA15.3b.html`
- Git blob: `34e7d1c733be7589b52f626cf0be167efa283017`
- SHA-256: `394233aa125bd14d43830652146749c3dc914432eb63032dbf5eee6eb55abfba`
- Archive copy is byte-identical.

GitHub reports the kit's former owner path as moved permanently to repository ID `1133539912`, now named `to-shreds/Policy-review`.

## Automated verification

- 34 tests passed; 0 failed.
- 136 unique rule IDs passed metadata and regex compilation checks.
- 44 of 44 curated positive expectations were located.
- 4 of 4 targeted negative expectations were avoided.
- Standalone findings never used confirmed plan/policy classification without comparison evidence.
- Multiple distinct occurrences retained page provenance.
- Deleted base exclusions were marked superseded when a mapped endorsement controlled.
- Unmapped hierarchy language remained visible at low confidence.
- Palmetto-style REMOVE / REPLACE language preserved original and replacement text.
- Crowne-specific attachment movement calculated as 71.4%.
- Crowne aggregating-specific movement calculated as 33.3%.
- Source-document UI rendering uses text-safe DOM APIs.
- No telemetry or generative-AI endpoint is present.

## Build verification

- Artifact: `dist/StopLoss_Workbench_v16.0.0.html`
- Size: 110,477 bytes
- SHA-256: `cc34dd5561d5ef176371241712a693009e037cd275fe4a408aab4825d8c2d32d`
- `dist/StopLoss_Workbench_v16.0.0.html`, `dist/index.html`, and root `index.html` are byte-identical.
- Manual text remains available if pinned PDF/DOCX parsing libraries cannot load.

## Browser exercise

An automated headless-browser exercise was attempted against the standalone artifact. The installed Playwright package had no Chromium executable, and downloading a browser was not permitted in the execution environment. No browser-interaction result is claimed. Static UI/security checks passed, and the exact manual acceptance checklist is preserved in `docs/TESTING.md` for the next environment with a browser.

## Acceptance gates

| Gate | Result |
| --- | --- |
| Baseline preservation and rollback | Pass |
| Maintainable modular source | Pass |
| Standalone artifact | Pass |
| Structured rules and guardrails | Pass |
| PDF, DOCX, text, page health | Pass with documented OCR/CDN limits |
| Hierarchy and supersession | Pass |
| Policy at a Glance | Pass |
| Four required review modes | Pass |
| Attorney adjudication workspace | Pass |
| Word, Excel, session exports | Pass with documented non-OOXML format |
| Regression and held-out fixtures | Pass |
| Corpus discovery and privacy record | Pass |
| Documentation and rollback | Pass |

## Limitations

See `docs/KNOWN_LIMITATIONS.md`. The principal limits are no built-in OCR, pinned browser parsing dependencies, deterministic rather than AI semantic pairing, and non-OOXML Word/Excel export containers.

## Release judgment

The release meets the upgrade kit's feasible local-browser scope. It materially improves provenance, hierarchy, issue framing, comparison, reviewer control, maintainability, and testability over v15.3b. It does not claim that deterministic detection replaces attorney review.
