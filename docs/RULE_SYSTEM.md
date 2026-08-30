# Rule system

## Library contract

Rule library version 1.0.0 contains 136 unique stable rule IDs. Every rule carries:

- ID, version, title, and category
- issue classification, default severity, and deterministic detection patterns
- context, positive, negative, and forbidden indicators
- hierarchy, comparison, and missing-concept behavior
- explanation, why it matters, reviewer questions, action, and negotiation point
- regression metadata and ambiguity notes

The source is `rules/rule-library.js`; `rules/rule-library.json` is generated for inspection and release tooling.

## Coverage

The library covers policy and financial structure, eligibility, plan and vendor changes, medical and clinical terms, pricing, federal payment interactions, other coverage and recovery, underwriting, claims administration, enforcement, exclusions, and favorable provisions.

The v15.3b concepts remain represented, including policy term, benefit basis, specific and aggregate terms, experimental treatment, plan-amendment approval, policy-conflict clauses, allowable-charge limits, incurred and paid definitions, medical necessity, Medicare pricing and coordination, illegal acts, contractually assumed liability, claim deadlines, and missing-provision review.

## Interpretation guardrails

- Standalone detection is not classified as a confirmed plan/policy difference.
- A rule occurrence is a review lead, not a legal conclusion.
- Multiple occurrences are retained before grouping.
- Missing indicators produce "Not located" or "Unable to determine," not an automatic gap.
- Medicare eligibility is not treated as entitlement.
- Recoverable amounts are not treated as actually recovered amounts.
- Proposal language is not treated as binding policy language.
- Premium change is not treated as retained-risk change.

## Hierarchy

The engine recognizes delete, remove, strike, replace, amend, add, incorporate, modify, control, prevail, and notwithstanding language. A destructive event marks an older occurrence superseded only when the modifying clause also maps to the affected stable concept. Low-confidence, unmapped hierarchy events remain visible for attorney review.

## Adding a rule

1. Add a unique stable ID and metadata row in `rules/rule-library.js`.
2. Add custom analysis and action text when generic metadata is insufficient.
3. Add positive, negative, ambiguity, hierarchy, and comparison fixtures as applicable.
4. Run `node --test tests/*.test.js`.
5. Rebuild and run `node scripts/verify-build.js`.
6. Record material rule behavior changes in `CHANGELOG.md`.
