# PCS-CTS Traceability Matrix

**Status:** Informative  
**Purpose:** Map RFC requirements → CTS scenarios → Observable evidence fields  
**Version:** 1.0 (Evidence Contract Release v0.1.0)

---

## Overview

This document provides clear lineage from normative PCS RFC requirements to CTS test scenarios to observable evidence fields in trace artifacts.

**Structure:** RFC Requirement → CTS Scenario(s) → Evidence Fields

---

## L1: Persistence (RFC-PCS-0002)

### RFC-PCS-0002 §4.1: Decision State Persistence

**Requirement:** Decision state MUST survive session boundaries and remain retrievable without relying on prompt history transport.

**CTS Scenario:** `L1.persistence.decision-state-recovery`

**Evidence Fields:**
```
trace.phases[0] (seed-decision):
  - phase: "seed-decision"
  - decisionId: string
  - nonce: string
  - acknowledged: boolean

trace.phases[1] (session-boundary):
  - phase: "session-boundary"
  - boundaryType: "hard-reset"

trace.phases[2] (retrieve-decision):
  - phase: "retrieve-decision"
  - retrievalEvidence.present: boolean
  - retrievalEvidence.matchedId: boolean
  - retrievalEvidence.matchedNonce: boolean
  - retrievalEvidence.trigger: "explicit-query" | "background" | "none"
```

**Pass Criteria:**
- `retrievalEvidence.present === true`
- `retrievalEvidence.matchedId === true` OR `retrievalEvidence.matchedNonce === true`
- `retrievalEvidence.trigger === "explicit-query"`

---

### RFC-PCS-0002 §4.2: Session Boundary Integrity

**Requirement:** Session boundaries MUST enforce hard resets. No context window carryover. Retrieval MUST be explicit and observable.

**CTS Scenario:** `L1.persistence.session-boundary-integrity`

**Evidence Fields:**
```
trace.phases[0] (seed-decision):
  - phase: "seed-decision"
  - decisionId: string
  - nonce: string

trace.phases[1] (session-boundary):
  - phase: "session-boundary"
  - boundaryType: "hard-reset"

trace.phases[2] (neutral-prompt):
  - phase: "neutral-prompt"
  - retrievalEvidence.present: boolean
  - retrievalEvidence.trigger: "explicit-query" | "background" | "none"
  - retrievalEvidence.scope: "decision-state" | "policy-state" | "intent-state" | "other" | "unknown"

trace.phases[3] (retrieve-decision):
  - phase: "retrieve-decision"
  - retrievalEvidence.present: boolean
  - retrievalEvidence.trigger: "explicit-query" | "background" | "none"
  - retrievalEvidence.scope: "decision-state" | "policy-state" | "intent-state" | "other" | "unknown"
```

**Pass Criteria:**
- Neutral prompt: `retrievalEvidence.trigger !== "none"` implies `retrievalEvidence.scope !== "decision-state"`
- Explicit query: `retrievalEvidence.present === true` AND `retrievalEvidence.trigger === "explicit-query"`

**Anti-Cheating:** Prevents malicious target from claiming "retrieve everything always" for decision state on neutral prompts.

---

## L2: Governance (RFC-PCS-0003 Governance Invariants)

### RFC-PCS-0003 §5.1: Deterministic Policy Enforcement

**Requirement:** Policy constraints MUST be enforced deterministically across session boundaries. Enforcement decisions MUST be observable in trace evidence.

**CTS Scenario:** `L2.governance.policy-enforcement`

**Evidence Fields:**
```
trace.phases[0] (seed-policy):
  - phase: "seed-policy"
  - policyId: string
  - nonce: string
  - constraint: string
  - acknowledged: boolean

trace.phases[1] (session-boundary):
  - phase: "session-boundary"
  - boundaryType: "hard-reset"

trace.phases[2] (attempt-violation):
  - phase: "attempt-violation"
  - prompt: string (contains forbidden term)
  - enforcementDecision.emitted: boolean
  - enforcementDecision.decision: "ALLOW" | "DENY"
  - enforcementDecision.policyId: string
  - enforcementDecision.violatedTerms: string[]
  - responseExcerpt: string
```

**Pass Criteria:**
- `enforcementDecision.emitted === true`
- `enforcementDecision.decision === "DENY"`
- `enforcementDecision.policyId` matches seeded policy
- `enforcementDecision.violatedTerms` contains forbidden term from prompt

**Determinism:** Same policy + same prompt = same enforcement decision (reproducible).

---

### RFC-PCS-0003 §5.2: Policy Determinism and Repeatability

**Requirement:** Policy enforcement MUST be deterministic - same input produces same output repeatably.

**CTS Scenario:** `L2.governance.policy-determinism-repeatability`

**Evidence Fields:**
```
trace.phases[2] (first-violation-attempt):
  - enforcementDecision.emitted: boolean
  - enforcementDecision.decision: "ALLOW" | "DENY"
  - enforcementDecision.violatedTerms: string[]

trace.phases[3] (second-violation-attempt):
  - enforcementDecision.emitted: boolean
  - enforcementDecision.decision: "ALLOW" | "DENY"
  - enforcementDecision.violatedTerms: string[]

trace.phases[4] (determinism-check):
  - invariants.bothEmitted: boolean
  - invariants.bothDeny: boolean
  - invariants.violatedTermsMatch: boolean
  - invariants.deterministic: boolean
```

**Pass Criteria:**
- Both attempts emit enforcement decision
- Both attempts result in DENY
- Violated terms match exactly (same trace shape)

---

### RFC-PCS-0003 §5.3: Namespace Isolation

**Requirement:** Namespace isolation MUST be enforced - policies in namespace A do not leak to namespace B.

**CTS Scenario:** `L2.governance.namespace-isolation`

**Evidence Fields:**
```
trace.phases[2] (attempt-in-namespace-B):
  - namespace: "namespace-B"
  - enforcementDecision.emitted: boolean
  - enforcementDecision.decision: "ALLOW" | "DENY"

trace.phases[3] (query-namespace-B):
  - namespace: "namespace-B"
  - policyLeakage: boolean

trace.phases[4] (verify-enforcement-namespace-A):
  - namespace: "namespace-A"
  - enforcementDecision.emitted: boolean
  - enforcementDecision.decision: "ALLOW" | "DENY"

trace.phases[5] (isolation-check):
  - invariants.notEnforcedInB: boolean
  - invariants.noLeakageToB: boolean
  - invariants.stillEnforcedInA: boolean
  - invariants.isolated: boolean
```

**Pass Criteria:**
- Policy from A NOT enforced in namespace B
- Policy from A NOT retrievable in namespace B
- Policy from A still enforced in namespace A

---

### RFC-PCS-0003 §5.4: Policy Continuity Across Boundaries

**Requirement:** Policy loaded in session A MUST persist and be enforced in subsequent sessions.

**CTS Scenario:** `L2.governance.policy-continuity-across-boundary`

**Evidence Fields:**
```
trace.phases[2] (enforce-session-B):
  - enforcementDecision.emitted: boolean
  - enforcementDecision.decision: "ALLOW" | "DENY"
  - enforcementDecision.policyId: string

trace.phases[4] (enforce-session-C):
  - enforcementDecision.emitted: boolean
  - enforcementDecision.decision: "ALLOW" | "DENY"
  - enforcementDecision.policyId: string

trace.phases[5] (continuity-check):
  - invariants.enforcedInB: boolean
  - invariants.enforcedInC: boolean
  - invariants.policyIdMatchesB: boolean
  - invariants.policyIdMatchesC: boolean
  - invariants.continuous: boolean
```

**Pass Criteria:**
- Policy enforced in session B (after first boundary)
- Policy enforced in session C (after second boundary)
- Both reference same policy ID
- Both result in DENY

---

## L3: Continuity (RFC-PCS-0003 CMCC Invariants)

### RFC-PCS-0003 §6: Cross-Model Cognitive Continuity

**Requirement:** Required semantics (decision state, policy constraints) MUST remain invariant across model replacement events.

**CTS Scenario:** `L3.continuity.model-transition-decision-recovery`

**Evidence Fields:**
```
trace.phases[0] (seed-source-model):
  - phase: "seed-source-model"
  - sourceModel: string (e.g., "MODEL_ALPHA")
  - decisionId: string
  - nonce: string
  - sentinelToken: string

trace.phases[1] (model-transition):
  - phase: "model-transition"
  - boundaryType: "hard-reset"
  - sourceModel: string
  - targetModel: string
  - continuityEvent.confirmed: boolean
  - continuityEvent.reason: string

trace.phases[2] (retrieve-target-model):
  - phase: "retrieve-target-model"
  - targetModel: string (e.g., "MODEL_BETA")
  - retrievalEvidence.present: boolean
  - retrievalEvidence.matchedId: boolean
  - retrievalEvidence.matchedNonce: boolean
  - retrievalEvidence.containsSentinel: boolean
  - retrievalEvidence.trigger: "explicit-query" | "background" | "none"
  - continuityEvent.confirmed: boolean
  - continuityEvent.sourceModel: string
  - continuityEvent.targetModel: string

trace.phases[3] (governance-check):
  - phase: "governance-check"
  - enforcementDecision.emitted: boolean
  - enforcementDecision.decision: "ALLOW" | "DENY"

trace.phases[4] (invariants-check):
  - phase: "invariants-check"
  - invariants.decisionStatePreserved: boolean
  - invariants.sentinelTokenPreserved: boolean
  - continuityEvent.confirmed: boolean
  - continuityEvent.sourceModel: string
  - continuityEvent.targetModel: string
```

**Pass Criteria:**
- `continuityEvent.confirmed === true`
- `retrievalEvidence.present === true`
- `invariants.decisionStatePreserved === true`

**CMCC Invariants:**
- Decision state preserved across model boundary
- Policy enforcement still works after transition
- Continuity event explicitly captured in trace

**Note:** This scenario uses CTS-provided model labels (e.g., "MODEL_ALPHA", "MODEL_BETA") to simulate model transitions. It validates CMCC invariants without requiring multiple inference engines.

---

## Evidence Bundle Structure

All scenarios emit evidence bundles with three files:

### conformance.json
```json
{
  "pcs_spec_version": "v0.1-draft",
  "pcs_cts_version": "0.1.0",
  "scenarios": [
    {
      "id": "L1.persistence.decision-state-recovery",
      "passed": true
    }
  ],
  "passed": true,
  "cts_build": { "commit": "...", "tag": "...", "dirty": false },
  "target_build": { "commit": "...", "tag": "...", "dirty": false }
}
```

### trace.json
```json
{
  "scenario": "L1.persistence.decision-state-recovery",
  "phases": [
    { "phase": "seed-decision", ... },
    { "phase": "session-boundary", ... },
    { "phase": "retrieve-decision", ... }
  ]
}
```

### attestation.txt
```
PCS-CTS Attestation
timestamp: 2026-02-13T...
hash(conformance.json): sha256:...
hash(trace.json): sha256:...
target.fingerprint.sha256: ...
target.git.commit: ...
target.git.tag: ...
```

---

## Traceability Summary Table

| RFC Requirement | CTS Scenario | Evidence Field | Pass Criteria |
|----------------|--------------|----------------|---------------|
| RFC-PCS-0002 §4.1 (Decision Persistence) | L1.persistence.decision-state-recovery | `trace.phases[2].retrievalEvidence.present` | `=== true` |
| RFC-PCS-0002 §4.1 (Decision Persistence) | L1.persistence.decision-state-recovery | `trace.phases[2].retrievalEvidence.matchedId` | `=== true` OR `matchedNonce === true` |
| RFC-PCS-0002 §4.2 (Session Boundary) | L1.persistence.session-boundary-integrity | `trace.phases[2].retrievalEvidence.trigger` | `!== "none"` implies `scope !== "decision-state"` |
| RFC-PCS-0002 §4.2 (Session Boundary) | L1.persistence.session-boundary-integrity | `trace.phases[3].retrievalEvidence.present` | `=== true` |
| RFC-PCS-0003 §5 (Policy Enforcement) | L2.governance.policy-enforcement | `trace.phases[2].enforcementDecision.emitted` | `=== true` |
| RFC-PCS-0003 §5 (Policy Enforcement) | L2.governance.policy-enforcement | `trace.phases[2].enforcementDecision.decision` | `=== "DENY"` |
| RFC-PCS-0003 §6 (CMCC Invariants) | L3.continuity.model-transition-decision-recovery | `trace.phases[2].continuityEvent.confirmed` | `=== true` |
| RFC-PCS-0003 §6 (CMCC Invariants) | L3.continuity.model-transition-decision-recovery | `trace.phases[4].invariants.decisionStatePreserved` | `=== true` |

---

## Verification Workflow

1. **Run CTS scenario:**
   ```bash
   node runners/run-cts.js --target <path> --scenario <id> --clean
   ```

2. **Inspect trace.json:**
   ```bash
   cat output/<run-id>/trace.json | jq '.phases[2].retrievalEvidence'
   ```

3. **Verify evidence bundle:**
   ```bash
   node runners/verify-evidence.js output/<run-id>
   ```

4. **Check conformance:**
   ```bash
   cat output/<run-id>/conformance.json | jq '.passed'
   ```

---

## Document Status

**Status:** Informative  
**Scope:** PCS-CTS Evidence Contract Release v0.1.0  
**Version:** 1.0  
**Maintenance:** Updated when new scenarios or RFC requirements are added
