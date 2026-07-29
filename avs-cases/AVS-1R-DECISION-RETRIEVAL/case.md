# Case: AVS-1R-DECISION-RETRIEVAL

## Purpose

Verify that a previously seeded decision can be retrieved and cited by nonce across session boundaries when PCS is present.

## Preconditions

- A decision is seeded into PCS with:
  - `decision_id`: `DR-abc12345`
  - `nonce`: `550e8400-e29b-41d4-a716-446655440000`
  - `content`: `"Budget approved for Q1 2026 marketing campaign"`
- PCS-ON condition has access to PCS kernel endpoints.
- PCS-OFF condition has no access to PCS kernel endpoints.

## Procedure

1. Provide the invocation prompt (verbatim from `inputs/invocation_prompt.txt`).
2. Collect model output.
3. Collect tool trace (if applicable).
4. Evaluate assertions A1, A2, A3 (see `expected_assertions.md`).

## Artifacts

- `inputs/state_seed.json` — Decision seeded into PCS state layer
- `inputs/invocation_prompt.txt` — Invocation prompt provided to model
- `expected_assertions.md` — Binary pass/fail criteria for assertions

## Expected Outcome

**PCS-ON:**
- Assertions A1, A2, A3 pass
- Model retrieves decision from state layer
- Model cites nonce in output

**PCS-OFF:**
- Assertions A1, A2, A3 fail
- Model has no access to state layer
- Model cannot retrieve or cite decision
