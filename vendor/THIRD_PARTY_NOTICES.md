# Third-party notices

The following components are distributed with Stop-Loss Policy Review Workbench v16.1.0 so PDF parsing and OCR can run locally in the browser.

| Component | Version | Purpose | License | Upstream |
|---|---:|---|---|---|
| PDF.js | 5.6.205 | PDF parsing and page rendering | Apache-2.0 | <https://github.com/mozilla/pdf.js> |
| Tesseract.js | 7.0.0 | Browser worker and OCR orchestration | Apache-2.0 | <https://github.com/naptha/tesseract.js> |
| tesseract.js-core | 7.0.0 | Tesseract WebAssembly cores | Apache-2.0 | <https://github.com/naptha/tesseract.js-core> |
| tessdata_fast English model | 5.x | English OCR language data | Apache-2.0 | <https://github.com/tesseract-ocr/tessdata_fast> |

Full license texts and upstream license notices are stored beside the corresponding files in `vendor/pdfjs` and `vendor/tesseract`. PDF.js also distributes third-party font, image-codec, and color-management notices in its `standard_fonts`, `cmaps`, and `wasm` directories.

These assets execute locally. The workbench does not call a remote OCR endpoint or upload policy pages for recognition.
