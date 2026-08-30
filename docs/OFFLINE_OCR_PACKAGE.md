# Offline OCR package

This package contains Stop-Loss Policy Review Workbench v16.1.0 together with its local PDF.js and Tesseract.js runtime assets and English OCR model.

## Start the workbench

Browsers restrict Web Workers and module loading from `file://` URLs. Extract the ZIP, open a terminal in the extracted folder, and serve it locally. For example:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

No internet connection is required for PDF parsing or OCR. DOCX parsing currently loads Mammoth.js 1.8.0 from its pinned CDN URL, so use PDF, TXT, or the manual-text fallback when fully offline.

## OCR behavior

- Every PDF page first receives native PDF text extraction.
- OCR starts automatically when the native text is blank, sparse, garbled, or symbol-heavy.
- The optional “OCR every PDF page” checkbox recognizes all pages and retains the stronger result.
- A single Tesseract worker is reused throughout the review and terminated afterward.
- The document-health view records whether OCR was attempted or used, its page confidence, render DPI, elapsed time, and any failure.
- Findings, facts, source views, saved sessions, and exports retain OCR provenance.

OCR is a reading aid, not a substitute for confirming material language against the rendered source page. Pages that remain unreadable after OCR are marked unresolved and are not treated as reviewed.
