# Corpus and evaluation record

## Discovery outcome

The project and File Library were searched by every exact filename in `02_PROJECT_FILE_DISCOVERY.md` and `03_CORPUS_MANIFEST.md` before any upload request.

- Ten of the twelve manifest filenames resolved to relevant exact-name materials.
- The exact files named `Pasted text.txt` and `Outline.docx` were unrelated filename collisions.
- The relevant attorney analysis was located as `Pasted text(111).txt`.
- The relevant outline was located as `Outline(1).docx`; `Outline(2).docx` was a duplicate.
- The four description-only sources remained unlocated: standalone Wellpoint year-over-year comparison, Prudential comparative analysis dated November 6, 2025, final renewal-rate-cap memorandum, and delayed-payment memorandum dated June 17, 2026.

Binary materialization of several corpus files was unavailable during the release run, but their indexed extracted text and the kit's calibration records were available. Proprietary full text is not committed.

## How the corpus was used

| Corpus role | Release use |
| --- | --- |
| Crowne 2025 policy and endorsements | Financial facts, schedule priority, mirroring, advance funding, rate-cap scope, material changes, deadlines, and dispute concepts |
| Wellpoint 2026 proposals | Proposal status, commission caution, conditions, and retained-risk calculations |
| Attorney analysis | Nuanced rate-cap characterization without declaring breach or carrier freedom |
| Palmetto SPD and three amendments | Plan-side concepts and amendment sequencing |
| Practice materials | Comparison fields, workflow categories, and document-alignment scenarios |

## Privacy

Committed fixtures use synthetic document names and short proposition-level clauses. They omit participant names, email addresses, phone numbers, policy numbers, claimants, and other unnecessary identifiers.

## Split

- Development fixtures cover Crowne-derived financial, mirroring, advance-funding, federal-payment, and recovery propositions.
- Held-out fixtures cover underwriting, enforcement, and medical scenarios.
- Adversarial negative controls target Medicare, arbitration/mediation, and unsupported confirmed-gap characterization.

No private corpus document is treated as legal authority. Official authority must be consulted for legal propositions.
