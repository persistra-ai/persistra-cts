# Persistra Runtime — Claims Boundary

**Version:** 1.0.0  
**Status:** FROZEN  
**Date:** 2026-03-03

---

## Purpose

This document defines the **precise boundary** between what PCS proves and what it does not prove.

---

## ✅ What We Prove

### 1. Governance is Architectural, Not Behavioral

**Claim:** Enforcement occurs at the runtime boundary, not inside the model.

**Evidence:**
- Policy Enforcement Point (PEP) intercepts output before user sees it
- 100% contradiction detection rate (EVS-1, AVS-1P)
- Model cannot control enforcement outcome
- PCS-OFF control: contradictions propagate when disabled

**Test Coverage:** EVS-1, AVS-1P (4/4 tests passing)

**What this does NOT prove:**
- ❌ Enforcement quality (we prove determinism, not correctness)
- ❌ Semantic understanding of policies (we use pattern matching)
- ❌ Production-scale policy management

---

### 2. Continuity is Substrate-Mediated, Not Prompt-Carried

**Claim:** State survives session boundaries and model transitions.

**Evidence:**
- Session 2 prompt = `"continue"` (zero state injection)
- Retrieval evidence proves substrate-mediated continuity
- Cross-model transitions work (Claude → Llama)
- PCS-OFF control: retrieval fails when disabled

**Test Coverage:** EVS-2, EVS-3, EVS-4, EVS-6 (39/39 assertions passing)

**What this does NOT prove:**
- ❌ Distributed state synchronization (in-memory only)
- ❌ Consensus protocols (no Raft/Paxos)
- ❌ Multi-node federation (foundation established, not implemented)

---

### 3. Selection Under Pressure is Salience-Based, Not Arbitrary

**Claim:** Context selection is deterministic and salience-prioritized.

**Evidence:**
- Shuffle invariance: same items, same order, regardless of input permutation
- Order invariance: output order is deterministic (A7b)
- Salience function: `(0.4 * recency) + (0.6 * importance)`
- Deterministic sorting with stable tie-break

**Test Coverage:** EVS-10 (22/22 assertions passing)

**What this does NOT prove:**
- ❌ Salience function optimality (we prove determinism, not quality)
- ❌ Semantic salience (we use recency + importance, not embeddings)
- ❌ Production-scale CSE with emergent behaviors

---

### 4. Capability Execution is Runtime-Governed

**Claim:** Tool routing and execution is runtime-controlled, not model-controlled.

**Evidence:**
- Capability registry is runtime-owned Map
- Intent routing is deterministic (keyword-regex-v1)
- Registration-order independence (B4b)
- Model cannot fabricate trace evidence
- PCS-OFF fails closed

**Test Coverage:** EVS-11 (19/19 assertions passing)

**What this does NOT prove:**
- ❌ Semantic intent routing (we use keyword/regex, not embeddings)
- ❌ Multi-hop planning (out of scope)
- ❌ Self-modification safety (separate capability)

---

### 5. Substrate Behavior is Reproducible

**Claim:** Runtime execution is deterministically reproducible.

**Evidence:**
- Record/replay with hash equivalence
- Normalized trace hashing
- Cassette-based replay (zero provider calls)

**Test Coverage:** EVS-5 (5/5 assertions passing)

**What this does NOT prove:**
- ❌ Model output determinism (we prove substrate determinism)
- ❌ Bit-for-bit replay (we normalize volatile fields)
- ❌ Distributed replay across nodes

---

### 6. Semantic Retrieval is Runtime-Governed

**Claim:** Retrieval method selection is runtime-controlled with deterministic thresholds.

**Evidence:**
- Real OpenAI embeddings (text-embedding-3-small)
- Similarity scores cross deterministic thresholds
- Method selection is trace-visible
- Fallback behavior is explicit and auditable

**Test Coverage:** EVS-7 (16/16 assertions passing)

**What this does NOT prove:**
- ❌ Embedding quality or semantic alignment
- ❌ Federated semantic retrieval across nodes
- ❌ Production-scale semantic search

---

### 7. Air-Gapped Operation Works

**Claim:** Semantic retrieval works with local embeddings, zero external calls.

**Evidence:**
- Local embedder (all-MiniLM-L6-v2, 384 dimensions)
- `network_call_count: 0` (runtime-enforced)
- AirGapGuard fails closed (no silent fallback)

**Test Coverage:** EVS-9 (18/18 assertions passing)

**What this does NOT prove:**
- ❌ Local embedder quality vs cloud embedders
- ❌ Production-scale local embedding generation
- ❌ GPU acceleration or optimization

---

## ❌ What We Do NOT Prove

### 1. Distributed Consensus

**Status:** Out of scope for v1.0

**Why:** In-memory substrate only, no Raft/Paxos implementation

**Future work:** Distributed consensus validation pending

---

### 2. Federated Semantic Retrieval

**Status:** Foundation established, not yet implemented

**Why:** EVS-7 proves runtime-governed retrieval, but only single-node

**Future work:** Cross-node semantic queries require distributed memory graph

---

### 3. Production Scale

**Status:** Tests use small datasets

**Why:** Validation focuses on architectural properties, not performance

**Future work:** Scale testing, concurrent access patterns, large datasets

---

### 4. Model Output Determinism

**Status:** Explicitly out of scope

**Why:** We prove substrate determinism, not model determinism

**Clarification:** EVS-5 proves runtime behavior is reproducible via normalized trace hashing, NOT that models produce identical outputs

---

### 5. Semantic Quality

**Status:** Not an architectural claim

**Why:** We prove retrieval is runtime-governed, not embedding quality

**Clarification:** EVS-7 validates threshold governance and method selection, NOT semantic alignment or relevance

---

### 6. Self-Modification Safety

**Status:** Separate capability, not validated in EVS-11

**Why:** EVS-11 proves capability execution is runtime-governed, NOT that self-modification is safe

**Future work:** File write controller, approval workflows, rollback mechanisms (separate EVS)

---

### 7. Multi-Hop Planning

**Status:** Out of scope for EVS-11 v1.0

**Why:** Minimal primitive focuses on single-intent routing

**Future work:** Multi-hop planning validation pending

---

### 8. Embedding-Based Intent Routing

**Status:** Deferred to future enhancement

**Why:** EVS-11 uses keyword/regex for determinism, not embeddings

**Rationale:** Avoids conflation with EVS-7 (semantic retrieval)

**Future work:** Semantic routing mode validation pending

---

## Scope Boundaries (Summary)

| Capability | Proven | Not Proven |
|------------|--------|------------|
| **Governance** | Deterministic enforcement | Semantic policy understanding |
| **Continuity** | Substrate-mediated state | Distributed consensus |
| **Retrieval** | Runtime-governed method selection | Embedding quality |
| **Selection** | Salience-based determinism | Salience function optimality |
| **Capabilities** | Runtime-governed execution | Self-modification safety |
| **Reproduction** | Substrate determinism | Model output determinism |
| **Air-Gapped** | Local embeddings work | Local vs cloud quality comparison |

---

## Test Coverage Limitations

### Small Datasets

**All tests use small datasets:**
- EVS-10: 50 candidates maximum
- EVS-11: 4 capabilities maximum
- EVS-7: 2 decisions (PostgreSQL vs Redis)

**Why:** Validation focuses on architectural properties, not performance

**Future work:** Scale testing with thousands of items

---

### Mock-Based Components

**CTS-L4 uses mock memory graph:**
- Validates trace contract
- Does NOT validate distributed synchronization

**Future work:** Real distributed memory graph implementation

---

### Single-Node Only

**All tests run on single node:**
- No distributed state
- No consensus protocols
- No federated retrieval

**Future work:** Multi-node validation

---

## Version Boundary

**Contract Version 1.0.0 (FROZEN) includes:**
- ✅ All 13 EVS tests (163 assertions)
- ✅ All 6 AVS tests (89 assertions)
- ✅ AVS-2P Paste Condition (60 assertions, optional)
- ✅ All 6 CTS conformance tests
- ✅ Normalized evidence schema
- ✅ Frozen strategy versions
- ✅ Total: 252 core assertions + 60 optional = 312 total

**Contract Version 1.0.0 does NOT include:**
- ❌ Distributed consensus
- ❌ Federated semantic retrieval
- ❌ Production scale validation
- ❌ Multi-hop planning
- ❌ Self-modification safety

**Future versions (1.1.0+) may add:**
- Distributed consensus validation
- Semantic routing mode
- Write approval interface
- Scale testing suite

---

## Evaluator Guidance

**When evaluating Persistra, ask:**

1. ✅ "Does it prove governance is architectural?" → YES (EVS-1, AVS-1P)
2. ✅ "Does it prove continuity is substrate-mediated?" → YES (EVS-2, EVS-3, EVS-4, EVS-6)
3. ✅ "Does it prove selection is deterministic?" → YES (EVS-10)
4. ✅ "Does it prove capability execution is runtime-governed?" → YES (EVS-11)
5. ❌ "Does it prove distributed consensus?" → NO (explicitly out of scope)
6. ❌ "Does it prove production scale?" → NO (small datasets)
7. ❌ "Does it prove model output determinism?" → NO (substrate determinism only)

**This boundary is deliberate and documented.**

---

## Conclusion

**We prove:**
- Governance relocation (model ≠ enforcement)
- Substrate-mediated continuity (model ≠ memory)
- Deterministic selection (salience-based, not arbitrary)
- Runtime-governed capabilities (model ≠ execution)

**We do NOT prove:**
- Distributed consensus
- Production scale
- Model output determinism
- Semantic quality

**Contract Version: 1.0.0 (FROZEN)**

---

**End of Claims Boundary Document**
