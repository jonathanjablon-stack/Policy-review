# Architecture

## Overview

Version 16.1 separates parsing, local OCR, clause analysis, comparison, rules, UI, tests, and build output. Large PDF and OCR runtime files remain repository-local assets and are distributed with a reproducible offline package.

```text
Files or manual text
  -> native PDF page extraction
  -> automatic text-quality gate and local OCR when needed
  -> page-preserving document model
  -> operative-clause segmentation
  -> hierarchy and rule evaluation
  -> facts, findings, completeness, and provenance
  -> concept-paired comparison when selected
  -> attorney review workspace and controlled exports
```

## Components

| Component | Responsibility |
| --- | --- |
| `src/parsing/ocr-engine.js` | Native-text quality assessment, PDF page rendering, lazy local Tesseract worker lifecycle, recognition, and native/OCR result selection |
| `src/parsing/document-model.js` | Normalization, repeated-margin removal, page health, role inference, heading detection, and clause segmentation |
| `src/analysis/workbench-engine.js` | Rule matching, fact extraction, occurrence retention, hierarchy events, findings, completeness, and summaries |
| `src/comparison/comparison-engine.js` | Concept pairing, mode-specific differences, financial normalization, and retained-risk change calculations |
| `rules/rule-library.js` | Maintainable source for stable, versioned rule metadata |
| `rules/rule-library.json` | Generated inspectable representation used for review and release verification |
| `src/ui/app.js` | File ingestion, local PDF.js loading, shared OCR session, workspace rendering, reviewer edits, source viewer, session persistence, and exports |
| `vendor/pdfjs` | Repository-local PDF.js parser, worker, fonts, CMaps, and image-codec assets |
| `vendor/tesseract` | Repository-local Tesseract.js API, worker, compatible WebAssembly cores, and English model |
| `scripts/build.js` | Creates byte-identical production entry points, vendor and release manifests, and a reproducible offline ZIP |
| `scripts/verify-build.js` | Confirms artifact identity, feature markers, safe source rendering, asset hashes, ZIP integrity, release hashes, and rule uniqueness |

## Data flow

1. PDF.js extracts each page's native text layer separately.
2. The OCR quality gate checks character, letter, word, encoding, alphanumeric, and symbol-noise measures. It can also be overridden to recognize every page.
3. A page that needs OCR is rendered at a target 220 DPI, capped at 12 million pixels, and sent to one reusable local Tesseract worker.
4. Native and OCR text are scored. OCR replaces native text only when it is materially stronger.
5. Each page is normalized without flattening page boundaries. OCR attempt, use, confidence, engine, timing, DPI, selection rationale, and errors remain attached.
6. Page text is segmented into bounded operative clauses with headings and source lines.
7. Every rule occurrence is retained with document, page, section, trigger, clause, extraction method, OCR confidence, and finding-confidence rationale.
8. Explicit delete or replace events can mark an older matching concept superseded. Uncertain targets remain visible.
9. Findings group occurrences only after provenance is preserved.
10. Comparisons pair stable concept IDs and distinguish plan/policy, renewal, and proposal/final-contract consequences.
11. Reviewer edits remain session state and determine exported content.

## Security

- Policy text is processed locally in the browser.
- PDF pages are rendered and recognized locally. The OCR implementation declares no remote recognition endpoint.
- No telemetry or generative-AI endpoint exists.
- Source-document strings are inserted into the interface with `textContent`.
- Export HTML escapes reviewer and document text.
- Test fixtures use synthetic identifiers and short, proposition-level language.

## Deployment

The build inlines application source, styles, and rule data. PDF.js and Tesseract remain external to the HTML only because their runtime assets and English model are large; they are stored in the same repository and offline ZIP. A static HTTP server is required because browsers restrict module workers and Web Workers loaded from `file://` URLs. Mammoth.js remains a pinned CDN dependency only for DOCX parsing. The app reports a clear error and retains TXT, manual-text, and saved-session workflows when DOCX support is unavailable.
