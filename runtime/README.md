# Bundled PCS Runtime

**Purpose:** Provide runtime implementation for CTS validation and demos

**Status:** Bundled with persistra-cts for self-contained evaluation

**Note:** This runtime is bundled into `persistra-cts` to eliminate external dependencies. Evaluators do not need to clone or configure this as a separate repository.

---

## Overview

This is a **minimal PCS runtime** that provides the core substrate functionality needed for validation tests and demos. It demonstrates that governance and decision consistency can operate as a deterministic boundary outside the model.

**What it is:**
- 11+ components, ~3,765 lines of code
- File-based persistence (survives process restart)
- Deterministic contradiction detection
- Structural enforcement traces
- Semantic retrieval (EVS-7)
- Air-gapped embeddings (EVS-9)
- Contextual salience engine (EVS-10)
- Meta-programming interface (EVS-11)
- Vision anchor persistence (EVS-8)
- Audit logging (AVS-2A)

**What it is NOT:**
- Production-ready system
- Scalable infrastructure
- Full PCS implementation
- HTTP server or API

---

## Architecture (4 Components)

### 1. Decision Store (`decision-store.js`)

**Purpose:** Persistent state layer

**Proves:** State ≠ prompt text

**Capabilities:**
- `createDecision(statement, supersedes)` - Create decision record
- `getLatestDecision()` - Retrieve active decision
- `listDecisions()` - List all decisions
- File-based persistence (survives process restart)

**Storage:** JSON file at `data/decisions.json`

---

### 2. Policy Enforcement Point (`policy-enforcement-point.js`)

**Purpose:** Deterministic boundary outside model

**Proves:** Governance relocation

**Capabilities:**
- `validate(candidateOutput)` - Intercept and validate model output
- Retrieves decision state
- Evaluates contradiction deterministically
- Blocks or allows with trace
- Toggleable (PCS-ON/PCS-OFF)

**Critical:** This runs BEFORE output reaches user. Model never controls enforcement outcome.

---

### 3. Contradiction Detector (`contradiction-detector.js`)

**Purpose:** Deterministic contradiction detection

**Proves:** Boundary authority (not semantic AI)

**Implementation:**
- Hard-coded rules (Java vs Python, etc.)
- Deterministic, not NLP
- Sufficient for AVS-2C validation

**Note:** This is intentionally simple. The goal is proving the boundary exists, not building sophisticated NLP.

---

### 4. Trace Emitter (`trace-emitter.js`)

**Purpose:** Generate structural enforcement traces

**Proves:** Boundary acted independently

**Capabilities:**
- `emit(params)` - Generate enforcement trace
- SHA256 hashing
- Machine-readable JSON
- File-based trace storage

**Output:** `traces/trace-<timestamp>-<hash>.json`

---

## Runtime Orchestrator (`runtime.js`)

**Purpose:** Coordinate model execution with PEP validation

**Flow:**
1. User prompt → Model (stateless execution)
2. Model output → PEP (interception)
3. PEP retrieves decision state
4. PEP checks contradiction
5. If violation: Block + emit trace
6. If allowed: Pass through + emit trace

**Key methods:**
- `execute(modelFn, prompt)` - Run model with PEP validation
- `createDecision(statement)` - Create persistent decision
- `setPEPEnabled(enabled)` - Toggle PCS-ON/PCS-OFF

---

## Usage

### Standalone Test

```bash
node test-runtime.js
```

This runs the AVS-2C scenario:
- Session 1: Establish decision (e.g., "Use Java")
- Session 2 PCS-ON: Attempt contradiction → BLOCKED
- Session 2 PCS-OFF: Attempt contradiction → PROPAGATES
- Revision workflow: Create DR-002 superseding DR-001

### Integration with AVS Harness

See `persistra-reference-architecture/evidence/avs-validation/harness/run-avs-2c-live.js`

The harness integrates this runtime with real models (Claude, Llama) to generate validation evidence.

---

## AVS-2C Validation Results

**Date:** 2026-02-22  
**Status:** ✅ COMPLETE

**Results:**
- Claude Sonnet 4.6: 10/10 (5 PCS-ON, 5 PCS-OFF)
- Llama 3.1 8B: 10/10 (5 PCS-ON, 5 PCS-OFF)

**Assertions:**
- A1 (Decision Consistency Detection): 10/10 PASS
- A2 (Enforcement Trace Generated): 10/10 PASS
- A3 (Contradiction Propagation): 10/10 PASS

**Evidence:** 138 files frozen and hashed

---

## What This Proves

**Evaluators can no longer say "this is just tool calls" because:**

1. **Enforcement is not inside the model**
   - PEP blocks output before reaching user
   - Model never controls enforcement outcome
   - 10/10 contradictions blocked in PCS-ON

2. **Persistence is not prompt replay**
   - Decision Store survives process restart
   - File-based storage independent of context
   - State artifacts have timestamps and lineage

3. **Contradiction cannot propagate (PCS-ON)**
   - 100% detection rate across 2 models
   - Deterministic boundary enforcement
   - Structural traces prove boundary acted

4. **Trace is external and structural**
   - Machine-readable JSON with SHA256 hashes
   - Independent of model reasoning
   - Proves governance relocation

5. **Process restart does not remove state**
   - Decision Store persists across sessions
   - Lineage preserved (DR-002 supersedes DR-001)
   - Demonstrates architectural boundary

**This is architectural relocation.**

```
Inference engine = stateless execution unit
Governance + decision consistency = deterministic boundary outside model
```

---

## Design Constraints

**Intentionally minimal:**
- No salience engine
- No federation
- No emergent skills
- No kernel HTTP server
- No UI
- No embeddings
- No complex NLP

**Just the smallest undeniable runtime demonstrating governance relocation.**

---

## Files

```
pcs-runtime/
├── decision-store.js          # Persistent state layer
├── policy-enforcement-point.js # Deterministic boundary
├── contradiction-detector.js   # Hard-coded rules
├── trace-emitter.js           # Structural traces
├── runtime.js                 # Orchestrator
├── test-runtime.js            # Standalone test
├── data/                      # Decision storage
│   └── decisions.json
└── traces/                    # Enforcement traces
    └── trace-*.json
```

---

## Relationship to PCS Specification

This runtime is **not** a full PCS implementation. It is a minimal proof-of-concept demonstrating:
- Decision Record persistence (RFC-PCS-0003)
- Policy Enforcement Point boundary (RFC-PCS-0002)
- Enforcement trace generation (RFC-PCS-0004)

For full PCS conformance, see:
- `persistra-spec` (normative requirements)
- `persistra-cts` (conformance testing)
- `persistra-reference-architecture` (architectural topology)

---

## License

See parent repository for licensing terms.

---

**End of README.md**
