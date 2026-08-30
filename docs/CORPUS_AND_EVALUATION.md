# Corpus and evaluation record

## Discovery outcome

The project and File Library were searched by every exact filename in `02_PROJECT_FILE_DISCOVERY.md` and `03_CORPUS_MANIFEST.md` before any upload request.

- Ten of the twelve manifest filenames resolved to relevant exact-name materials.
- The exact files named `Pasted text.txt` and `Outline.docx` were unrelated filename collisions.
- The relevant attorney analysis was located as `Pasted text(111).txt`.
- The relevant outline was located as `Outline(1).docx`; `Outline(2).docx` was a duplicate.
- The four description-only sources remained unlocated: standalone Wellpoint year-over-year comparison, Prudential comparative analysis dated November 6, 2025, final renewal-rate-cap memorandum, and delayed-payment memorandum dated June 17, 2026.

The eight documents required for the two mandatory calibration sequences were subsequently materialized from the File Library and exercised through the repository-local PDF.js extraction path. Proprietary full text is not committed.

## How the corpus was used

| Corpus role | Release use |
| --- | --- |
| Crowne 2025 policy and endorsements | Financial facts, schedule priority, mirroring, advance funding, rate-cap scope, material changes, deadlines, and dispute concepts |
| Wellpoint 2026 proposals | Proposal status, commission caution, conditions, and retained-risk calculations |
| Attorney analysis | Nuanced rate-cap characterization without declaring breach or carrier freedom |
| Palmetto SPD and three amendments | Plan-side concepts and amendment sequencing |
| Practice materials | Comparison fields, workflow categories, and document-alignment scenarios |

## Actual-document calibration

The reproducible calibration runner is `scripts/calibrate-corpus.js`. It accepts an external corpus directory, hashes each input, parses each PDF with the same vendored PDF.js build used by the browser, and emits only aggregate results and pass/fail checks.

| Sequence | Files exercised | Result |
| --- | --- | --- |
| Crowne renewal | 44-page 2025 policy, both 8-page 2026 proposals, and attorney analysis | Pass: $175,000 to $300,000 = 71.4%; $150,000 to $200,000 = 33.3%; 0% and 10% commission variants remained separate; rate-cap scope matched the express endorsement language and attorney nuance |
| Palmetto amendments | 98-page SPD plus amendments 1, 2, and 3 | Pass: seven explicit REMOVE / REPLACE pairs preserved; five remained current; two were superseded by exact later replacement chains; unrelated amendment language remained current |

All 162 PDF pages had usable native text. The automatic OCR quality gate separately identified four sparse or image-heavy pages as OCR candidates: each proposal cover page and Palmetto SPD pages 2 and 84. Material calibration terms were located on native-text pages. The bundled OCR runtime, model, automatic selection logic, provenance, and failure handling remain covered by the OCR tests and live engine smoke test.

The actual-document run uses external inputs and is not part of `npm test`. Run it after materializing the corpus:

```sh
npm run calibrate:corpus -- --corpus-dir /absolute/path/to/materialized-corpus
```

## Privacy

Committed fixtures use synthetic document names and short proposition-level clauses. They omit participant names, email addresses, phone numbers, policy numbers, claimants, and other unnecessary identifiers.

## Split

- Development fixtures cover Crowne-derived financial, mirroring, advance-funding, federal-payment, and recovery propositions.
- Held-out fixtures cover underwriting, enforcement, and medical scenarios.
- Adversarial negative controls target Medicare, arbitration/mediation, and unsupported confirmed-gap characterization.
- Actual-document calibration is a separate release gate and never copies proprietary source text into the repository.

No private corpus document is treated as legal authority. Official authority must be consulted for legal propositions.
