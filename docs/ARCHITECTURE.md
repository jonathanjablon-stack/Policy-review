# Architecture

## Overview

Version 16 separates parsing, clause analysis, comparison, rules, UI, tests, and build output while retaining a standalone browser artifact.

```text
Files or manual text
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
| `src/parsing/document-model.js` | Normalization, repeated-margin removal, page health, role inference, heading detection, and clause segmentation |
| `src/analysis/workbench-engine.js` | Rule matching, fact extraction, occurrence retention, hierarchy events, findings, completeness, and summaries |
| `src/comparison/comparison-engine.js` | Concept pairing, mode-specific differences, financial normalization, and retained-risk change calculations |
| `rules/rule-library.js` | Maintainable source for stable, versioned rule metadata |
| `rules/rule-library.json` | Generated inspectable representation used for review and release verification |
| `src/ui/app.js` | File ingestion, workspace rendering, reviewer edits, source viewer, session persistence, and exports |
| `scripts/build.js` | Creates byte-identical standalone production entry points and a release manifest |
| `scripts/verify-build.js` | Confirms artifact identity, feature markers, safe source rendering, manifest hash, and rule uniqueness |

## Data flow

1. PDF pages are extracted separately. DOCX and text inputs retain their document identity.
2. Each page is normalized without flattening page boundaries.
3. Page text is segmented into bounded operative clauses with headings and source lines.
4. Every rule occurrence is retained with document, page, section, trigger, clause, and confidence rationale.
5. Explicit delete or replace events can mark an older matching concept superseded. Uncertain targets remain visible.
6. Findings group occurrences only after provenance is preserved.
7. Comparisons pair stable concept IDs and distinguish plan/policy, renewal, and proposal/final-contract consequences.
8. Reviewer edits remain session state and determine exported content.

## Security

- Policy text is processed locally in the browser.
- No telemetry or generative-AI endpoint exists.
- Source-document strings are inserted into the interface with `textContent`.
- Export HTML escapes reviewer and document text.
- Test fixtures use synthetic identifiers and short, proposition-level language.

## Deployment

The build inlines all application source, styles, and rule data. PDF.js and Mammoth.js remain pinned runtime dependencies because bundling their complete distributions would materially enlarge the source repository. The app reports a clear error and offers manual text when either dependency is unavailable.
