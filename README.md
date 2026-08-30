# Stop-Loss Policy Review Workbench

Version 16.1.0 is a local-first, deterministic browser workbench for stop-loss policy review and attorney adjudication. PDF parsing and automatic OCR run from repository-local assets without uploading policy pages.

The current canonical repository is `to-shreds/Policy-review`, repository ID `1133539912`. The upgrade kit's former path, `jonathanjablon-stack/Policy-review`, now redirects to the same GitHub repository.

## Production

- Browser entry point: `index.html`
- Versioned HTML entry point: `dist/StopLoss_Workbench_v16.1.0.html`
- Distribution entry point: `dist/index.html`
- Offline OCR package: `dist/StopLoss_Workbench_v16.1.0-offline.zip`
- Preserved v15.3b baseline: `archive/v15.3b/PA15.3b.html`

The three v16.1 HTML entry points are byte-identical at build time. The offline ZIP contains `index.html`, the local PDF/OCR runtime, the English language model, notices, and an asset-integrity manifest.

## Capabilities

- Standalone policy review
- Plan document versus stop-loss comparison
- Prior-year versus renewal comparison
- Proposal, quote, or binder versus issued-policy comparison
- Base-document, schedule, endorsement, and amendment hierarchy review
- Page- and clause-level provenance with all materially distinct occurrences
- Policy at a Glance with source references and reviewer overrides
- Structured completeness matrix using "not located" rather than automatic gap conclusions
- Editable classification, severity, notes, inclusion, and disposition
- Executive Word, detailed Word, Excel-compatible matrix, and JSON session exports
- PDF, DOCX, TXT, and manual-text ingestion
- Automatic local OCR for blank, sparse, garbled, or symbol-heavy PDF text layers
- Optional OCR of every PDF page for hybrid scans or inaccurate hidden text
- OCR progress, page confidence, extraction method, render DPI, timing, and failure provenance
- OCR provenance in findings, facts, source views, saved sessions, Word reports, and the standalone Excel matrix
- Explicit unresolved-page warnings when OCR still cannot recover usable text

## Run

Serve the repository directory with any static server:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

PDF.js 5.6.205, Tesseract.js 7.0.0, compatible WebAssembly cores, and the English OCR model are stored under `vendor/`. PDF parsing and OCR require no network connection and call no remote recognition service. Browser security rules prevent the required module and worker loading from a direct `file://` URL, so use a static server.

For a portable copy, extract `dist/StopLoss_Workbench_v16.1.0-offline.zip`, serve the extracted folder, and open its root URL. DOCX parsing still loads Mammoth.js 1.8.0 from a pinned CDN URL. Fully offline reviews can use PDF, TXT, manual text, or an existing JSON session.

## Build and verify

Node.js 18 or newer plus the `zip` and `unzip` commands are required.

```sh
npm test
npm run build
npm run verify
```

The equivalent network-free verification commands are:

```sh
node --test tests/*.test.js
node scripts/build.js
node scripts/verify-build.js
```

## Design posture

The engine identifies review leads. It does not silently convert keyword detection into legal certainty, call standalone policy language a confirmed plan/policy gap, treat unreadable pages as reviewed, or treat superseded provisions as current. Reviewer dispositions control report inclusion.

See `docs/ARCHITECTURE.md`, `docs/RULE_SYSTEM.md`, `docs/TESTING.md`, `docs/CORPUS_AND_EVALUATION.md`, and `docs/KNOWN_LIMITATIONS.md`.

## Rollback

The pre-OCR v16.0.0 artifact remains at `dist/StopLoss_Workbench_v16.0.0.html`, and its final canonical state is commit `b9f4349`. The v15.3b production source and exact hashes are recorded in `archive/v15.3b/BASELINE.md`. Revert the v16.1 release commits, restore v16.0.0, or restore the archived v15.3b file as the entry point.
