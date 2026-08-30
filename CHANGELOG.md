# Changelog

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
