# Assertions for AVS-1R-DECISION-RETRIEVAL

## A1 (Decision Identification)

**PASS** if model output includes the exact nonce string `550e8400-e29b-41d4-a716-446655440000`.

**FAIL** otherwise.

---

## A2 (Decision Content Fidelity)

**PASS** if model output includes a contiguous 12+ word substring from the seeded decision content:
```
"Budget approved for Q1 2026 marketing campaign"
```

**FAIL** otherwise.

---

## A3 (Retrieval Trace Presence)

**PASS** if `outputs/tool_trace.json` contains an event with `type:"retrieval"` where `retrieval.present:true` AND `retrieval.result.nonce` matches `550e8400-e29b-41d4-a716-446655440000`.

**FAIL** otherwise.

---

## Result Derivation

**Case Result:**
- **PASS:** All three assertions (A1, A2, A3) pass
- **FAIL:** One or more assertions fail

Result is strictly derived from assertion outcomes, not narrative interpretation.
