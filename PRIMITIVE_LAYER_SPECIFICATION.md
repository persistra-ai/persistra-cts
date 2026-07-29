# Persistra Runtime Architecture — Primitive Layer Specification

**Document Version:** 1.0  
**Runtime Contract Version:** 1.0.0 (FROZEN)  
**Specification Scope:** Primitive Runtime Layer  
**Reference Tests:** CTS / AVS / EVS  
**Verification Command:** `./run_all.sh --mode audit`

---

## 1. Purpose

The Persistra runtime implements a minimal cognitive substrate for AI systems.

This substrate introduces a primitive layer that separates:

**Model Reasoning**

from

**System Governance, Memory, Continuity, Capability Execution**

The primitive layer defines the minimum set of runtime components required to produce the architecture invariants verified by the Persistra test harness.

**These primitives function similarly to kernel primitives in operating systems.**

---

## 2. Architectural Principle

The primitive layer enforces a structural rule:

**Models perform reasoning.**  
**Runtime primitives govern cognition.**

The runtime is responsible for:
- Cognitive state
- Memory persistence
- Policy enforcement
- Capability routing
- Context prioritization
- Auditability

**This design ensures that system properties do not depend on model behavior.**

---

## 3. Primitive Layer Overview

The Persistra runtime contains two primitive tiers.

**Tier-1 Primitives** (Core Cognitive Substrate)

**Tier-2 Primitives** (Runtime Extensions)

### Primitive Stability Guarantee

**All Tier-1 primitives are frozen at Contract Version 1.0.0.**

This means:
- Primitive interfaces will not change
- Primitive behavior is deterministic
- Primitive contracts are verified by tests

**Breaking changes require a new contract version (e.g., 2.0.0).**

This stability enables:
- Hardware acceleration roadmaps
- Long-term infrastructure planning
- Predictable upgrade paths

---

## 4. Tier-1 Primitives

### Core Cognitive Substrate

Tier-1 primitives define the minimum runtime kernel required for cognitive persistence and governance.

These primitives correspond to the smallest viable architecture capable of enforcing the verified invariants.

### Tier-1 Primitive List

| Primitive | Purpose |
|-----------|---------|
| Persistent Cognitive State Store (PCSS) | Substrate-resident cognitive state |
| Orchestrator | Runtime lifecycle and model binding |
| Policy Gate | Deterministic governance enforcement |
| Vision Anchor | Persistent goal structures |
| Audit Layer | Append-only state transition record |
| Session Boundary | Isolation between runtime sessions |

---

## 5. Persistent Cognitive State Store (PCSS)

**Contract Version:** 1.0.0 (FROZEN)

### Purpose

The PCSS maintains all cognitive state outside the model.

### Responsibilities
- Store decisions
- Store memory
- Store session context
- Store goal anchors

### Properties

**Persistent** — State survives process restart  
**Append-safe** — State transitions are recorded  
**Model-agnostic** — State is independent of model provider

### Implication

Model replacement does not erase cognitive state.

### Related Tests

- CTS-L1: Decision State Recovery
- EVS-2: Context Failure
- EVS-6: Development Continuity

---

## 6. Orchestrator

**Contract Version:** 1.0.0 (FROZEN)

### Purpose

The orchestrator manages the lifecycle of runtime execution.

### Responsibilities
- Bind runtime to model provider
- Manage request lifecycle
- Coordinate primitive execution
- Control runtime configuration

### Key Capability

**Provider abstraction.**

The runtime can execute against multiple model providers without altering system state.

**Example:**

```
Claude → Llama → Groq
```

### Related Tests

- EVS-3: Engine Replacement
- EVS-4: Parameter Inversion
- CTS-L3: Cross-Model Cognitive Continuity

---

## 7. Policy Gate

**Contract Version:** 1.0.0 (FROZEN)

### Purpose

The policy gate enforces governance rules.

### Responsibilities
- Enforce deterministic constraints
- Block prohibited operations
- Enforce policy before model execution

### Design Principle

**Policies are evaluated before the model receives a request.**

### Implication

Models cannot bypass governance rules.

### Related Tests

- EVS-1: Governance Failure
- AVS-1P: Policy Gate
- CTS-L2: Policy Enforcement

---

## 8. Vision Anchor

**Contract Version:** 1.0.0 (FROZEN)

### Purpose

The Vision Anchor stores persistent goal structures.

### Responsibilities
- Maintain system objectives
- Store strategic goals
- Anchor long-term intent

### Properties

**Persistent** — Goals survive sessions  
**Model-independent** — Goals are runtime-owned  
**Runtime-owned** — Model cannot alter goals directly

### Implication

Goals remain stable across sessions and model transitions.

### Related Tests

- EVS-8: Vision Anchor Persistence

---

## 9. Audit Layer

**Contract Version:** 1.0.0 (FROZEN)

### Purpose

The audit layer records state transitions.

### Responsibilities
- Record runtime events
- Produce reproducible execution traces
- Support deterministic replay

### Data Model

**Append-only log** — No deletions  
**Hash-chain protected** — Tamper detection

### Implication

Execution history cannot be silently altered.

### Related Tests

- AVS-2A: Audit Layer
- EVS-5: Deterministic Replay

---

## 10. Session Boundary

**Contract Version:** 1.0.0 (FROZEN)

### Purpose

The session boundary enforces isolation between runtime executions.

### Responsibilities
- Prevent state leakage
- Control state injection
- Isolate session context

### Properties

**Hard isolation** — Sessions cannot access each other's state  
**Runtime-controlled state loading** — Only runtime loads state

### Related Tests

- CTS-L1: Session Boundary Integrity

---

## 11. Tier-2 Primitives

### Runtime Extensions

Tier-2 primitives extend the substrate with additional cognitive behaviors.

These primitives rely on Tier-1 infrastructure but are not required for basic runtime operation.

### Tier-2 Primitive List

| Primitive | Purpose |
|-----------|---------|
| Cross-Model Cognitive Continuity (CMCC) | Preserve cognition across model transitions |
| Semantic Retrieval | Embedding-based recall |
| Air-Gapped Retrieval | Offline semantic recall |
| Contextual Salience Engine (CSE) | Token-pressure context prioritization |
| Meta-Programming Interface (MPI) | Runtime capability routing |
| Deterministic Replay | Reproduce recorded execution |
| Vision Anchor Persistence | Persistent strategic state |
| Policy Enforcement Point (PEP) | Runtime enforcement boundary |
| Decision Retrieval | Hybrid semantic + state recall |

---

## 12. Contextual Salience Engine (CSE)

**Contract Version:** 1.0.0 (FROZEN)

### Purpose

Select context under token pressure.

### Problem

LLM context windows are finite.

Traditional systems rely on heuristic ordering.

### Solution

The CSE prioritizes context by salience scoring.

**Example function:**

```
salienceScore = 0.6 × importanceScore + 0.4 × recencyScore
```

### Critical Property: Shuffle Invariance

**Context survival cannot depend on insertion order.**

This is validated by EVS-10 assertion A7 (membership invariance) and A7b (order invariance).

### Related Tests

- EVS-10: Contextual Salience Engine (22/22 assertions)

---

## 13. Meta-Programming Interface (MPI)

**Contract Version:** 1.0.0 (FROZEN)

### Purpose

Provide a runtime-controlled interface for capability execution.

### Responsibilities
- Register capabilities
- Route intent to capabilities
- Execute tools
- Produce execution trace

### Governance Rule

**The model cannot directly invoke capability functions.**

All tool execution must pass through the runtime interface.

### Related Tests

- EVS-11: Meta-Programming Interface (19/19 assertions)

---

## 14. Cross-Model Cognitive Continuity (CMCC)

**Contract Version:** 1.0.0 (FROZEN)

### Purpose

Allow cognitive state to survive model replacement.

### Design

State is stored in the runtime substrate.

Models read and write state but do not own it.

### Implication

Systems can move between models without losing cognitive continuity.

### Related Tests

- EVS-3: Engine Replacement
- EVS-4: Parameter Inversion
- CTS-L3: Cross-Model Cognitive Continuity

---

## 15. Deterministic Replay

**Contract Version:** 1.0.0 (FROZEN)

### Purpose

Allow exact reproduction of runtime execution.

### Mechanism

Replay execution from recorded audit log.

### Use Cases
- Debugging
- Compliance verification
- Security auditing

### Related Tests

- EVS-5: Deterministic Reproduction

---

## 16. Primitive Layer Relationships

Primitive interactions form the runtime execution pipeline.

```
Application Request
      │
      ▼
Policy Gate
      │
      ▼
Session Boundary
      │
      ▼
PCSS + Decision Retrieval
      │
      ▼
Contextual Salience Engine
      │
      ▼
Model Execution
      │
      ▼
Meta-Programming Interface
      │
      ▼
Audit Layer
```

This pipeline enforces the architecture invariants.

### Primitive Dependencies

**Tier-1 (no external dependencies):**
```
├─ PCSS (foundational)
├─ Orchestrator (foundational)
├─ Policy Gate (foundational)
├─ Vision Anchor (depends on PCSS)
├─ Audit Layer (foundational)
└─ Session Boundary (depends on PCSS)
```

**Tier-2 (depends on Tier-1):**
```
├─ CMCC (depends on PCSS, Orchestrator)
├─ Semantic Retrieval (depends on PCSS)
├─ Air-Gapped Retrieval (depends on Semantic Retrieval)
├─ CSE (depends on PCSS)
├─ MPI (depends on Orchestrator, Audit Layer)
├─ Deterministic Replay (depends on Audit Layer)
├─ PEP (depends on Policy Gate)
└─ Decision Retrieval (depends on PCSS, Semantic Retrieval)
```

**This shows clean layering.**

---

## 17. Why These Primitives Exist

The primitives emerged from solving five fundamental system problems.

| Problem | Primitive |
|---------|-----------|
| Memory persistence | PCSS |
| Model replacement | CMCC |
| Token pressure | CSE |
| Capability routing | MPI |
| Governance enforcement | Policy Gate |

**Together they form the minimum viable cognitive substrate.**

---

## 18. Hardware Implications

Some primitives correspond to potential hardware acceleration.

### Acceleration Targets

| Primitive | Acceleration Target | Rationale |
|-----------|---------------------|-----------|
| CSE | SIMD / NPU scoring | Parallel salience computation |
| Audit hashing | Crypto engine | SHA256 hash chain |
| Policy Gate | DPU policy tables | Deterministic rule evaluation |
| PCSS access | CXL / NVMe state memory | Low-latency state persistence |
| Semantic Retrieval | Vector accelerator | Embedding similarity search |
| MPI routing | Programmable NIC | Intent routing offload |

### Control-Plane Workloads

**These primitives represent control-plane operations, not data-plane.**

This means:
- **Not GPU-bound** (unlike model inference)
- **Suitable for DPU/IPU offload**
- **Latency-sensitive** (not throughput-sensitive)
- **Deterministic** (not probabilistic)

### Example Deployment Architecture

```
CPU:           Orchestrator, Policy Gate
DPU:           MPI routing, Policy enforcement
CXL Memory:    PCSS state
Crypto Engine: Audit hashing
NPU:           CSE salience scoring
Vector Accel:  Semantic retrieval
```

This architecture enables:
- **Offload control-plane to DPU** (frees CPU for application logic)
- **Low-latency state access** (CXL memory for PCSS)
- **Hardware-accelerated governance** (DPU policy tables)
- **Deterministic execution** (no GPU variability)

---

## 19. Minimal Runtime Footprint

The reference implementation of the primitive layer is intentionally small.

### Reference Implementation Size

| Component | Lines | Purpose |
|-----------|-------|---------|
| `runtime.js` | ~420 | Core orchestrator |
| `cse-minimal.js` | ~206 | Salience engine |
| `meta-programming-interface.js` | ~221 | Capability routing |
| `vision-anchor.js` | ~180 | Goal persistence |
| `audit-log.js` | ~150 | State transitions |
| `local-embeddings.js` | ~120 | Air-gapped retrieval |
| **Total Tier-1 + Tier-2** | **~1,297** | **Minimal substrate** |

**This minimal footprint demonstrates that the architecture is a runtime design pattern rather than a heavy framework.**

### What This Size Proves

- ✅ **Not a framework** — Minimal code surface
- ✅ **Architectural pattern** — Composable primitives
- ✅ **Portable** — Small enough to reimplement
- ✅ **Auditable** — ~1,300 lines is reviewable

---

## 20. What This Primitive Layer is Designed to Enable

### For Silicon Vendors

- **Hardware acceleration targets** (CSE, audit hashing, policy tables)
- **Control-plane workloads** (not GPU-bound)
- **CXL/NVMe integration points** (PCSS)
- **DPU/IPU offload opportunities** (MPI routing, policy enforcement)
- **Deterministic execution** (no GPU variability)

### For Infrastructure Teams

- **Minimal runtime footprint** (~1,300 lines)
- **Clear primitive boundaries** (Tier-1 vs Tier-2)
- **Deterministic behavior** (no emergent properties)
- **Stable contracts** (frozen at v1.0.0)
- **Reproducible execution** (`./run_all.sh --mode audit`)

### For AI Platform Engineers

- **Model-agnostic substrate** (works with any LLM provider)
- **Cross-model continuity** (Claude → Llama → Groq)
- **Audit-grade traceability** (append-only hash chain)
- **Reproducible execution** (deterministic replay)
- **Governance enforcement** (runtime-controlled, not model-controlled)

### For Research Labs

- **Falsifiable claims** (see `VERIFICATION_SUITE.md`)
- **Minimal reference implementation** (~1,300 lines)
- **Open verification harness** (25 tests, 312 assertions)
- **Reproducible results** (`./run_all.sh --mode audit`)
- **Clear scope boundaries** (see `CLAIMS_BOUNDARY.md`)

---

## 21. Architectural Significance

The primitive layer introduces a new architecture boundary.

### Without This Boundary

**Model must manage system state.**

### With Persistra

**Runtime governs system cognition.**  
**Model performs reasoning.**

This mirrors the historical shift introduced by operating system kernels.

### Historical Analogy

| Era | Without OS Kernel | With OS Kernel |
|-----|-------------------|----------------|
| **1960s Computing** | Applications manage memory, I/O, scheduling | Kernel manages system resources |
| **2020s AI Systems** | Models manage state, governance, continuity | Runtime manages cognitive substrate |

**Persistra introduces the cognitive substrate layer that AI systems currently lack.**

---

## 22. Tier-3 Primitives (Future Work)

### Emergent Behavior Coordination

Tier-3 primitives extend the substrate with emergent behavior capabilities that build on the proven Tier-1 and Tier-2 infrastructure.

**Status:** Future work - architecture documented, validation pending

### Tier-3 Primitive List

| Primitive | Purpose | Status |
|-----------|---------|--------|
| EmergentBehaviorCoordinator | Coordinate emergent capabilities from memory graph | Reference impl (582 lines) |
| EmergentSkillSystem | Dynamic skill discovery from memory patterns | Reference impl (710 lines) |
| EmergentCSE | Emergent context generation from memory | Reference impl |

### Why Tier-3

Tier-3 primitives represent advanced cognitive capabilities that:
- Build on Tier-1 (state) and Tier-2 (extensions) infrastructure
- Enable emergent behavior from memory graph data
- Support meta-cognitive coordination beyond explicit programming
- Are candidates for hardware acceleration (pattern matching, graph traversal)

**Contract Version:** Not yet frozen (future work)

**Validation Status:** Architecture documented, reference implementation exists, PCS integration pending

### EmergentBehaviorCoordinator

**Purpose:** Coordinate emergent behavior patterns from memory graph data.

**Key Capabilities:**
- **Emergent context generation** - Synthesize relevant context from memory patterns
- **Dynamic identity extraction** - Derive system identity from historical behavior
- **Skill discovery** - Identify capabilities from memory graph patterns
- **Behavior coordination** - Coordinate emergent behaviors across sessions

**Reference Implementation:** Architecture documented, implementation pending validation

**Hardware Acceleration Potential:** High
- Pattern matching across memory graphs
- Graph traversal and salience ranking
- Cross-domain synthesis operations
- Temporal decay calculations

**Documentation:**
- Architecture documented in this specification
- Validation methodology to be developed

**Future Integration Path:**
1. PCS runtime integration (pending validation)
2. Validation suite development (future test expansion)
3. Hardware acceleration roadmap (Tenstorrent)
4. Multi-agent coordination extension

**Differentiation:**
- AI infrastructure layer treats emergent behavior coordination as a runtime primitive
- Enables AI systems to discover new capabilities from memory patterns
- Supports long-horizon cognitive evolution without retraining

---

## 23. Conclusion

The Persistra primitive layer defines a minimal runtime substrate for governed cognitive systems.

**The primitives collectively enforce the architecture invariants verified by the Persistra test harness.**

These primitives demonstrate that key AI system behaviors can be implemented as deterministic runtime functions rather than emergent model behavior.

**Contract Version: 1.0.0 (FROZEN)**

**Verification Command:** `./run_all.sh --mode audit`

---

**End of Primitive Layer Specification**
