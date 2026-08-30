# Stop-Loss Policy Review Workbench

Version 16.0.0 is a local-first, deterministic browser workbench for stop-loss policy review and attorney adjudication.

The current canonical repository is `to-shreds/Policy-review`, repository ID `1133539912`. The upgrade kit's former path, `jonathanjablon-stack/Policy-review`, now redirects to the same GitHub repository.

## Production

- Browser entry point: `index.html`
- Versioned standalone artifact: `dist/StopLoss_Workbench_v16.0.0.html`
- Distribution entry point: `dist/index.html`
- Preserved v15.3b baseline: `archive/v15.3b/PA15.3b.html`

The three v16 HTML entry points are byte-identical at build time.

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
- Image-only and low-text page warnings

## Run

Open `index.html` directly, or serve the repository directory with any static server:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

PDF and DOCX parsing use pinned browser libraries loaded from cdnjs. Manual TXT input and previously saved JSON sessions remain available when those libraries cannot load.

## Build and verify

Node.js 18 or newer is required.

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

The v15.3b production source and exact hashes are recorded in `archive/v15.3b/BASELINE.md`. Revert the v16 release commits or restore that archived file as the entry point.
