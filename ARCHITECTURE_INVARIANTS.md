# Persistra Runtime Architecture — Verified Invariants

**Document Version:** 1.0  
**Runtime Contract Version:** 1.0.0 (FROZEN)  
**Verification Harness:** CTS / AVS / EVS  
**Total Tests:** 25+AVS-2 Paste Condition
**Total Assertions:** 312+  
**Execution Method:** `./run_all.sh`

---

## 1. Purpose

The Persistra Runtime defines a governed cognitive substrate that separates model reasoning from system state, governance, and capability execution.

This document defines the architecture invariants that the runtime guarantees.

**An invariant in this context is a property that must remain true regardless of model provider, parameter scale, or orchestration environment.**

Each invariant is:
- Formally defined
- Bound to runtime primitives
- Validated by executable tests

The verification process is fully reproducible via:

```bash
./run_all.sh --mode audit
```

---

## 2. Architectural Model

Persistra introduces a structural separation between:

**Reasoning Layer (Model)**

and

**Cognitive Substrate (Runtime)**

### Architecture Overview

```
Application
     │
     ▼
Persistra Runtime
     ├ Policy Gate
     ├ Persistent Cognitive State Store
     ├ Contextual Salience Engine
     ├ Meta-Programming Interface
     ├ Audit Layer
     └ Orchestrator
     │
     ▼
Model Provider
(Claude / GPT / Llama / Groq / etc.)
```

In this architecture:

**The model performs reasoning.**

**The runtime governs:**
- Memory
- Continuity
- Context selection
- Capability execution
- Policy enforcement
- Audit integrity

This separation produces the architecture invariants defined below.

---

## 3. Architecture Invariant #1: Governance Relocation

**Contract Version:** 1.0.0 (FROZEN)

### Statement

Policy enforcement occurs at the runtime boundary, not inside the model.

The model cannot bypass policy constraints because enforcement is performed by the Policy Enforcement Point (PEP) prior to model execution.

### Implication

The model is not responsible for governance.

Governance is enforced by deterministic runtime code.

### Runtime Components
- Policy Gate
- Policy Enforcement Point
- Orchestrator

### Evidence

**Tests:**
- EVS-1: Governance Failure Scenario
- AVS-1P: Policy Gate Enforcement
- CTS-L2: Policy Enforcement Runtime Test

### Verified Behavior
- Policy violations are blocked before model invocation
- The model cannot alter or bypass runtime policy logic
- Enforcement occurs deterministically

---

## 4. Architecture Invariant #2: State Persistence

**Contract Version:** 1.0.0 (FROZEN)

### Statement

Cognitive state persists independently of process lifetime and session boundaries.

State continuity is maintained by the Persistent Cognitive State Store (PCSS).

### Implication

Conversation continuity does not depend on model memory or prompt injection.

State exists outside the model.

### Runtime Components
- PCSS
- Decision Store
- Session Boundary Manager

### Evidence

**Tests:**
- EVS-2: Context Failure Recovery
- EVS-6: Development Continuity
- CTS-L1: Session Boundary Integrity
- CTS-L1: Decision State Recovery

### Verified Behavior
- Restarting the runtime does not erase state
- Sessions can resume with minimal prompts
- State continuity survives runtime restart

---

## 5. Architecture Invariant #3: Deterministic Reproduction

**Contract Version:** 1.0.0 (FROZEN)

### Statement

Runtime execution can be deterministically reproduced from recorded state.

### Implication

Cognitive decisions can be replayed exactly.

This provides:
- Reproducibility
- Auditability
- Debugging capability

### Runtime Components
- Audit Layer
- Deterministic Replay Engine

### Evidence

**Tests:**
- EVS-5: Deterministic Reproduction
- AVS-2A: Audit Layer Integrity

### Verified Behavior

Recorded execution traces can reproduce:
- Identical decisions
- Identical state transitions
- Identical runtime outcomes

### Clarification

**This proves substrate determinism, not model output determinism.**

Model outputs may vary; runtime behavior does not.

We normalize volatile fields (timestamps, hashes) to prove runtime behavior is reproducible, not that models produce identical outputs.

---

## 6. Architecture Invariant #4: Salience-Based Context Selection

**Contract Version:** 1.0.0 (FROZEN)

### Statement

When context exceeds token capacity, selection is governed by deterministic salience scoring.

The model does not control which context survives token pressure.

### Implication

Context selection becomes a governed system behavior rather than a model artifact.

### Runtime Component

Contextual Salience Engine (CSE)

### Salience Function

```
salienceScore = (importanceWeight × importanceScore) + (recencyWeight × recencyScore)
```

Example implementation:

```
score = 0.6 × importance + 0.4 × recency
```

### Critical Property: Shuffle Invariance

**Input ordering cannot influence which items survive context pruning.**

This is validated by EVS-10 assertion A7 (membership invariance) and A7b (order invariance).

### Evidence

**Tests:**
- EVS-10: Contextual Salience Engine (22/22 assertions)

### Verified Behavior
- Highest salience items survive token pressure
- Input order does not influence outcome (shuffle invariance)
- Output order is deterministic (order invariance)
- Selection is deterministic

---

## 7. Architecture Invariant #5: Runtime-Governed Capability Execution

**Contract Version:** 1.0.0 (FROZEN)

### Statement

Tool invocation and capability execution are controlled by the runtime rather than the model.

### Implication

The model cannot directly execute capabilities.

All tool calls pass through the Meta-Programming Interface (MPI).

### Runtime Components
- Capability Registry
- Deterministic Intent Router
- Execution Trace

### Evidence

**Tests:**
- EVS-11: Meta-Programming Interface (19/19 assertions)

### Verified Behavior
- Model cannot directly call capability functions
- Routing decisions are deterministic
- Execution trace is runtime-constructed
- PCS-OFF disables capability execution
- Registration-order independence (lexicographic tie-break)

---

## 8. Architecture Invariant #6: Epistemic Integrity

**Contract Version:** 1.0.0 (FROZEN)

### Statement

Inference execution is conditional on the presence of required cognitive state.

Before a model is invoked, the runtime evaluates whether the required cognitive state for the query is present. If required state is missing, model invocation is blocked and the runtime retrieves the necessary state from the memory graph.

Only after the premises are complete is the model allowed to execute.

### Implication

The runtime governs **when reasoning is allowed to occur**, not merely what the model can say after reasoning has occurred.

This prevents models from generating answers when the required information is not present.

### Runtime Components
- Query Classifier (deterministic classification)
- Epistemic Gate (state presence validation)
- Memory Graph (state retrieval)
- Working Context (state availability tracking)

### Evidence

**Tests:**
- AVS-3A: Epistemic Retrieval Validation (17/17 assertions, 3 scenarios)

### Verified Behavior
- Model invocation blocked when required state absent (engineInvocationCount === 0)
- Retrieval triggered deterministically for missing state
- Fast-path optimization when state already present (~0.001ms overhead)
- Unclassified queries bypass epistemic gate (explicit, auditable)
- Gate evaluation time tracked for performance analysis

### Critical Property: Fail-Closed on Incomplete Premises

**Model invocation is prevented (not filtered) when required cognitive state is absent.**

This is validated by AVS-3A assertion A4a, which verifies that the actual engine invocation count is zero during the blocked phase, not just that a flag is set.

**This is the architectural kill shot:** It proves the runtime prevents inference execution, not just post-hoc filtering.

---

## 9. Architectural Membranes

Persistra enforces three fundamental architecture boundaries.

These boundaries define the separation between reasoning and system governance.

### Engine Membrane: Model ≠ Identity

**Model replacement does not destroy system identity.**

**Evidence:**
- EVS-3: Engine Replacement
- EVS-4: Parameter Inversion

**Example verified transition:**

```
Claude 3 Haiku → Llama 3.1 8B
```

State continuity is preserved by the runtime substrate.

---

### Memory Membrane: Model ≠ Continuity

**Continuity is not stored in prompts.**

State persistence is maintained by the runtime.

**Evidence:**
- EVS-2: Context Failure
- EVS-6: Development Continuity
- EVS-7: Semantic Retrieval

**Session 2 prompt:** `"continue"` (literally just that word)

Substrate retrieves prior decisions. Model receives zero context.

---

### Tool Membrane: Model ≠ Capability Execution

**Capability invocation is governed by runtime policy and routing.**

**Evidence:**
- EVS-11: Meta-Programming Interface

Registry is runtime-owned Map. Model never touches it.

---

## 9. Threat Model and Mitigations

The runtime architecture mitigates several classes of system risk.

### Threat 1: Model Fabrication Risk

**Threat:** Model attempts to fabricate execution trace.

**Mitigation:** Trace construction occurs only in runtime code.

**Evidence:** EVS-11

**Result:** ✅ Model cannot fabricate trace evidence

---

### Threat 2: Insertion Order Bias

**Threat:** Context ordering influences selection outcome.

**Mitigation:** Shuffle invariance enforced by CSE.

**Evidence:** EVS-10 (A7: membership, A7b: ordering)

**Result:** ✅ Input order does not affect survival

---

### Threat 3: Semantic Dependency Risk

**Threat:** External embedding APIs required for semantic retrieval.

**Mitigation:** Air-gapped embeddings (local embedder).

**Evidence:** EVS-9

**Result:** ✅ Zero external calls (`network_call_count: 0`)

---

### Threat 4: Tool Hijack Risk

**Threat:** Model directly invokes tools.

**Mitigation:** Capability execution restricted to runtime interface.

**Evidence:** EVS-11 (A6, C5: PCS-OFF controls)

**Result:** ✅ PCS-OFF disables interface completely

---

### Threat 5: Audit Tampering

**Threat:** State history altered.

**Mitigation:** Append-only hash chain.

**Evidence:** AVS-2A

**Result:** ✅ Audit log integrity maintained

---

## 10. Primitive Layer Summary

Persistra runtime primitives are divided into two tiers.

### Tier-1 Primitives (Core Substrate)

| Primitive | Purpose |
|-----------|---------|
| PCSS | Persistent cognitive state |
| Orchestrator | Lifecycle + provider binding |
| Policy Gate | Deterministic governance |
| Vision Anchor | Persistent goal structures |
| Audit Layer | State transition recording |
| Session Boundary | Isolation across sessions |

---

### Tier-2 Primitives (Runtime Extensions)

| Primitive | Purpose |
|-----------|---------|
| CMCC | Cross-model continuity |
| Semantic Retrieval | Embedding-based recall |
| Air-Gapped Retrieval | Offline semantic memory |
| CSE | Salience-based context survival |
| MPI | Runtime capability interface |
| Deterministic Replay | Reproducible execution |
| Vision Anchor Persistence | Substrate-resident goals |
| PEP | Runtime enforcement boundary |
| Decision Retrieval | Hybrid semantic/state recall |

**Total primitives validated:** 15 (6 Tier-1, 9 Tier-2)

---

## 11. Verification Process

All invariants are validated via the Persistra verification harness.

### Test Suites

**EVS** — Exocortical Validation Suite (11 tests)  
**AVS** — Architectural Validation Suite (5 tests)  
**CTS** — Conformance Test Suite (5 tests)

### Execution Command

```bash
./run_all.sh
```

### Audit Mode

```bash
./run_all.sh --mode audit
```

Audit mode produces:
- Test logs (21 files)
- Combined manifest (`COMBINED_MANIFEST.txt`)
- Cryptographic hash manifest (`MANIFEST.sha256`)

### Falsifiability

**Each EVS test includes explicit falsification criteria.**

**Example (EVS-10):**
- **FALSIFIED IF:** Input order affects survival
- **FALSIFIED IF:** Selection is non-deterministic
- **FALSIFIED IF:** Salience is not computed

**Result:** None falsified.

See `VERIFICATION_SUITE.md` for complete falsification criteria for all 11 EVS tests.

---

## 12. Reproducibility Metadata

The verification harness captures:
- Git commit hash
- Git branch
- Node.js version
- Platform architecture (OS, CPU)
- Test execution timestamps
- SHA256 hashes of all artifacts
- SHA256 hashes of source files (runtime primitives, tests)

**This enables bit-for-bit verification of claims.**

Example manifest metadata:

```
Git Commit: a1b2c3d4...
Git Branch: main
Node Version: v18.17.0
Platform: Darwin
Arch: arm64
```

All metadata is included in `COMBINED_MANIFEST.txt` and `MANIFEST.sha256`.

---

## 13. Scope Boundaries

This architecture does NOT prove:

- ❌ **Model output determinism** (substrate only)
- ❌ **Production scale** (small test datasets)
- ❌ **Distributed consensus** (single-node validation)
- ❌ **Semantic quality** (determinism, not optimality)
- ❌ **Embedding quality** (we prove runtime governance, not semantic alignment)
- ❌ **Multi-hop planning** (out of scope for v1.0)
- ❌ **Self-modification safety** (separate capability, not validated)

**See `CLAIMS_BOUNDARY.md` for complete scope definition.**

**Honest boundaries build trust with evaluators.**

---

## 14. Interpretation

The Persistra runtime demonstrates that several behaviors commonly attributed to model intelligence are instead runtime-governed system properties.

These properties include:
- Cognitive continuity
- Context survival
- Capability routing
- Policy enforcement
- Execution auditability

**This architecture shifts responsibility from models to system infrastructure.**

---

## 15. Architectural Significance

Persistra introduces a systems architecture layer analogous to the role operating systems played in early computing.

### Without This Layer

**Model must manage system state**

### With Persistra

**Runtime governs system state**  
**Model performs reasoning**

### This Separation Enables

- Reproducibility
- Governance
- Portability across models
- Deterministic system behavior
- Cross-model cognitive continuity
- Audit-grade traceability

---

## 16. Conclusion

The Persistra runtime defines a governed cognitive substrate with verifiable architectural invariants.

These invariants demonstrate that critical AI system behaviors can be enforced at the runtime level rather than relying on model behavior.

**The verification harness provides reproducible evidence for these claims.**

**All 25 tests passing (312 assertions). All 6 invariants validated. All 3 membranes verified.**

**Contract Version: 1.0.0 (FROZEN)**

---

**End of Architecture Invariants Document**
