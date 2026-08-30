# Known limitations

1. The bundled OCR model is English. Pages in other languages require an additional trained-data model or manual review.
2. OCR accuracy depends on resolution, contrast, skew, handwriting, stamps, tables, and scan artifacts. Material language must be confirmed against the rendered source page.
3. Password-protected, corrupt, or unsupported PDFs can fail before a page can be rendered for OCR. OCR does not bypass encryption.
4. Local PDF and OCR assets must be served over HTTP or HTTPS. Browser security restrictions prevent the required module and worker loading when `index.html` is opened directly through `file://`.
5. Mammoth.js remains a pinned CDN dependency for DOCX parsing only. PDF, TXT, manual-text, and saved-session workflows remain available without it.
6. DOCX raw-text extraction does not expose authoritative printed page numbers. DOCX source references use the extracted document page placeholder.
7. Repeated-margin removal is conservative and requires at least three pages. Unusual layouts may retain headers or remove a genuinely repeated line.
8. Common stop-loss proposal rows retain labeled candidate columns, but arbitrary tables are still preserved as extracted text rather than reconstructed into a full semantic grid.
9. Exact REMOVE / AND REPLACE WITH chains are linked across sequenced amendments. Other hierarchy supersession still requires an explicit modifying verb and a mapped affected concept; complex cross-references can remain ambiguous and require attorney review.
10. Concept pairing is deterministic and token-based. It is stronger than a raw character diff but does not claim full semantic equivalence.
11. Policy at a Glance patterns can surface multiple candidate values. Reviewers must confirm controlling schedules and amendments.
12. Word exports are standards-compatible HTML documents with a `.doc` extension. Excel exports are tabular UTF-8 data with an `.xls` extension. They open in the named desktop applications but are not native OOXML packages.
13. Browser-only processing is bounded by device memory and CPU. Pages are capped at 12 million rendered pixels, and very large policies may require splitting.
14. Automated regression tests use short synthetic and sample-derived propositions. A separate actual-document calibration covers the required Crowne and Palmetto sequences, but neither test layer establishes population-level precision, recall, OCR accuracy, or legal accuracy.
15. No hidden generative-AI service resolves ambiguous clauses. This is deliberate; deterministic output and reviewer judgment remain visible.
