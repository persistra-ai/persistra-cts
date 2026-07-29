# PCS Conformance Levels

This document describes the PCS conformance levels and their current validation status.

This repository (persistra-cts) provides the PCS Conformance Test Suite (PCS-CTS), which validates conformance claims by executing scenarios and producing evidence artifacts.

## Definitions

- **Conformance Level**: A named set of behavioral requirements defined by the PCS RFC suite.
- **PCS-CTS**: The test suite that determines whether an implementation satisfies the behavioral requirements for a declared level.
- **Evidence Bundle**: The reproducible artifacts emitted by PCS-CTS for a given run (see docs/ARTIFACTS.md).

## L1 — Persistence

**Intent:** Validate that persistent cognitive state survives session boundaries and remains retrievable without relying on prompt history transport.

**Validation Status:** ✅ Validated (v1.0.0)

**Validated Capabilities (non-exhaustive):**
- Decision state recoverable after a session boundary
- Provenance captured for state creation and subsequent use
- Session-boundary conditions are externally observable in evidence artifacts

## L2 — Deterministic Governance

**Intent:** Validate that policy constraints and deterministic governance behaviors are enforced across session boundaries and remain stable under repeated evaluation.

**Validation Status:** ✅ Validated (v1.0.0)

**Validated Capabilities (non-exhaustive):**
- Policy constraints enforced deterministically
- Enforcement decisions produce observable trace evidence
- Namespace isolation behavior (if claimed) is externally testable

## L3 — Cross-Model Cognitive Continuity (CMCC)

**Intent:** Validate that required semantics remain invariant across model replacement events.

**Validation Status:** Scenario-level validation available (CTS-local model transition simulation). Multi-engine validation deferred.

**Validated Capabilities (non-exhaustive):**
- Decision state preserved across declared model boundary
- Continuity event captured in trace evidence
- Invariants (decision state preservation) verified post-transition

**Notes:**
- L3 scenarios use CTS-provided model labels to simulate model transitions.
- Scenarios validate CMCC invariants without requiring multiple inference engines.
- Multi-engine validation (actual model swaps) is deferred to future work.

## L4 — Federation

**Intent:** Validate that federated/distributed state coordination preserves required semantics across participants.

**Validation Status:** Specification complete; validation deferred

**Notes:**
- L4 scenarios may be expressed as evidence-producing demonstrations prior to formal validation.

## Stability and Versioning

- A PCS-CTS release MAY add new scenarios or refine scenario coverage.
- A PCS-CTS release MUST preserve the meaning of previously published conformance claims for the same PCS RFC version, except where explicitly documented as a breaking change.
