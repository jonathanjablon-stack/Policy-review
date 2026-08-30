# Known limitations

1. The browser app detects image-only or low-text PDF pages but does not perform OCR. It identifies exact pages requiring OCR or manual review.
2. PDF.js and Mammoth.js are pinned CDN runtime dependencies. If unavailable, PDF/DOCX extraction cannot start; manual text and saved-session workflows remain available.
3. DOCX raw-text extraction does not expose authoritative printed page numbers. DOCX source references use the extracted document page placeholder.
4. Repeated-margin removal is conservative and requires at least three pages. Unusual layouts may retain headers or remove a genuinely repeated line.
5. Tables are preserved as extracted text, not reconstructed into a full semantic grid.
6. Hierarchy supersession requires an explicit modifying verb and a mapped affected concept. Complex cross-references can remain ambiguous and require attorney review.
7. Concept pairing is deterministic and token-based. It is stronger than a raw character diff but does not claim full semantic equivalence.
8. Policy at a Glance patterns can surface multiple candidate values. Reviewers must confirm controlling schedules and amendments.
9. Word exports are standards-compatible HTML documents with a `.doc` extension. Excel exports are tabular UTF-8 data with an `.xls` extension. They open in the named desktop applications but are not native OOXML packages.
10. Browser-only processing is bounded by device memory. Very large policies may require splitting or pre-extraction.
11. Automated tests use short synthetic and sample-derived propositions. Reported results do not establish population-level precision, recall, or legal accuracy.
12. No hidden generative-AI service resolves ambiguous clauses. This is deliberate; deterministic output and reviewer judgment remain visible.
