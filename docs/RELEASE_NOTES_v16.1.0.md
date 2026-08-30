# Stop-Loss Policy Review Workbench v16.1.0

Version 16.1 adds automatic local OCR to the complete v16 review workbench.

## What changed

- Every PDF page first receives native text extraction through repository-local PDF.js 5.6.205.
- Blank, sparse, garbled, or symbol-heavy pages automatically enter local OCR.
- Tesseract.js 7.0.0, its worker, compatible WebAssembly cores, and the English model ship in the repository.
- A single lazy OCR worker is reused across both document sets and terminated after analysis.
- Reviewers can force OCR for every PDF page when a hidden text layer is inaccurate.
- Native and OCR text are scored, and the stronger result is retained.
- OCR method, page confidence, render DPI, timing, selection, and errors flow into document health and saved sessions.
- Findings, facts, hierarchy sources, Word reports, and the standalone Excel matrix expose OCR provenance.
- Pages that remain unreadable after OCR remain unresolved and are never counted as reviewed.

## Distribution

- Deployment entry point: `index.html`
- Versioned entry point: `dist/StopLoss_Workbench_v16.1.0.html`
- Portable package: `dist/StopLoss_Workbench_v16.1.0-offline.zip`
- HTML SHA-256: `e11ccf22af25260f0535fd1d9d4b8f8544be40a69b0a374f0d200249b168ee8f`
- Offline ZIP SHA-256: `64c8565eab317f7062a0e89f5e9885367f398f9b0a4e40607fbda159205a62a5`

Extract the offline ZIP and serve its directory over local HTTP. PDF parsing and OCR require no internet connection. DOCX parsing still uses the pinned Mammoth.js CDN script.

## Verification

- 43 automated tests passed.
- 209 vendored assets passed SHA-256 and byte-count verification.
- The offline ZIP passed archive integrity checks and produced the same SHA-256 across consecutive builds.
- A live Tesseract.js runtime smoke test using the bundled core and English model recognized all required fields from a generated stop-loss page at 95 percent confidence.

OCR remains a reading aid. Reviewers must confirm material terms against the source image.
