# Changelog

## 16.1.0 - 2026-08-30

### Added

- Automatic page-level OCR when native PDF text is blank, sparse, garbled, or symbol-heavy
- Reviewer option to OCR every PDF page and retain the stronger native or OCR result
- Repository-local Tesseract.js 7.0.0 worker, WebAssembly cores, and English language model
- Repository-local PDF.js 5.6.205 parsing and rendering assets
- OCR progress, confidence, render DPI, elapsed-time, selection, and error provenance
- OCR provenance in facts, findings, hierarchy events, source views, saved sessions, Word reports, and the standalone Excel matrix
- OCR quality-gate, selection, provenance, failure, runtime-asset, and no-remote-endpoint tests
- Reproducible offline ZIP with asset-integrity manifest and third-party notices

### Changed

- Unreadable-page warnings now represent pages that remain unresolved after automatic OCR
- OCR-sourced findings receive confidence adjustments when page confidence is below 80 percent
- PDF parsing no longer depends on a CDN
- Saved-session schema advanced to 1.1.0 while retaining v1.0.0 read compatibility

### Preserved

- The v16.0.0 HTML release remains under `dist/` for rollback
- OCR never turns an unreadable page into a reviewed page unless usable text is actually recovered

## 16.0.0 - 2026-08-30

### Added

- Clause-first document model with page and section provenance
- Page-health checks and explicit OCR/manual-review warnings
- 136-rule structured, versioned library
- Policy at a Glance with reviewer-editable values and sources
- Standalone, plan/policy, renewal, and proposal/final comparison modes
- Document hierarchy and superseded-language tracking
- Material-provision completeness matrix
- Attorney review filters, source viewer, notes, inclusion, severity, classification, and dispositions
- Executive and detailed Word exports, Excel-compatible matrix export, and JSON session persistence
- Development, held-out, negative, hierarchy, parsing, comparison, static-security, and release verification tests
- Standalone versioned build and release manifest

### Changed

- Replaced first-hit keyword deduplication with occurrence-preserving clause analysis
- Separated issue classification, severity, and confidence
- Reframed standalone findings as potential risks or review leads rather than automatic hard gaps
- Separated premium movement from retained-risk movement
- Updated the legacy redirect to the v16 entry point

### Preserved

- Exact v15.3b production HTML under `archive/v15.3b`
- PDF, DOCX, manual text, deterministic analysis, and Word output capabilities

### Removed

- No v15.3b source was deleted. The old production file remains at its original path and in the archive.
