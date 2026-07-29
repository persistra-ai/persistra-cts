# PCS Conformance Levels

This document defines the conformance levels for Persistent Cognitive State (PCS) implementations.

---

## **Overview**

PCS conformance is organized into progressive levels, each expanding the **survivability boundary** of cognitive state:

| Level | Survivability Boundary | Core Principle |
|-------|------------------------|----------------|
| **L1** | Session boundary | State persists within session |
| **L2** | Governance layer | Governance persists |
| **L3** | Inference engine | State survives model swap |
| **L4** | Compute node | State survives process death |

Each level builds on the previous, creating a clean progression from single-session persistence to federated survivability.

---

## **L1: Persistence**

**Core Principle:** State persists within session boundaries.

**Requirements:**
- Decision state recovery across invocations
- Session boundary integrity (state isolation between sessions)
- Deterministic state serialization

**Scenarios:**
- `L1.persistence.decision-state-recovery`
- `L1.persistence.session-boundary-integrity`

---

## **L2: Governance**

**Core Principle:** Governance constraints persist and enforce deterministically.

**Requirements:**
- Policy enforcement (deterministic ALLOW/DENY decisions)
- Policy determinism (same input → same outcome)
- Namespace isolation (policies scoped to namespaces)
- Policy continuity across session boundaries

**Scenarios:**
- `L2.governance.policy-enforcement`
- `L2.governance.policy-determinism-repeatability`
- `L2.governance.namespace-isolation`
- `L2.governance.policy-continuity-across-boundary`

---

## **L3: Cross-Model Cognitive Continuity (CMCC)**

**Core Principle:** State survives inference engine swap.

**Requirements:**
- Decision state recovery across model transitions
- Policy enforcement survives model transitions
- Conflict resolution is stable and deterministic
- Multi-hop state continuity (A→B→C)

**Scenarios:**
- `L3.continuity.model-transition-decision-recovery`
- `L3.continuity.multi-hop-transition`
- `L3.continuity.policy-survives-transition`
- `L3.continuity.conflict-resolution-stable`

---

## **L4: Federated State Survivability**

**Core Principle:** State survives process death.

### **Mandatory Capabilities**

An implementation conforming to L4 MUST demonstrate:

1. **Durable cognitive state replication** across ≥2 independent processes
2. **Deterministic convergence** of state across nodes
3. **Preservation of governance constraints** across node loss
4. **Continued query correctness** after loss of any single node (in N=3 topology)
5. **Verifiable convergence evidence** (state hash equivalence)

### **Explicit Non-Requirements**

L4 does NOT require:
- ❌ Leader election
- ❌ Partition tolerance
- ❌ Byzantine resilience
- ❌ Multi-region latency tolerance
- ❌ Quorum-based consensus protocols
- ❌ Majority node loss survivability

These are reserved for future levels (L5+).

### **Scope**

#### **Availability Scope**

**L4 survives loss of any single node in a 3-node topology. No quorum semantics.**

This means:
- ✅ Kill node A → nodes B and C continue serving correct answers
- ✅ State hash converges across surviving nodes
- ✅ New writes accepted and replicated among survivors
- ❌ Does NOT handle 2/3 node loss (majority failure)
- ❌ Does NOT define commit rules or quorum requirements

#### **L4 Scope Boundaries**

**IN SCOPE:**
- ✅ Single-node process death (kill 1 of 3 nodes)
- ✅ CTS-mediated replication (explicit export/import)
- ✅ Immediate hash convergence verification (synchronous check)
- ✅ Binary pass/fail assertions (categorical evidence only)
- ✅ State survivability after node loss
- ✅ Governance enforcement after node loss

**OUT OF SCOPE (Reserved for L5+):**
- ❌ Partition tolerance (network splits)
- ❌ Recovery after partition
- ❌ Eventual consistency semantics
- ❌ Time-based convergence waits
- ❌ Background replication daemons
- ❌ Quorum semantics
- ❌ Majority node loss (2/3 failure)
- ❌ Node rejoin or state merge after recovery
- ❌ Leader election or failover protocols
- ❌ Commit rules or write acknowledgment semantics

#### **Technical Scope**

- **Deterministic replication:** State converges via export/import
- **Hash-based verification:** Convergence proven via state hash equality
- **Binary outcomes:** Pass/fail based on categorical evidence

### **Scenarios**

- `L4.federated.decision-replication`
- `L4.federated.governance-replication`
- `L4.federated.nonquorum-node-loss-survivability`

### **Kernel Requirements**

To support L4, a kernel MUST provide:

1. **State Export:** `GET /state/export` → deterministic canonical state blob
2. **State Import:** `POST /state/import` → apply received state blob
3. **State Hash:** `GET /state/hash` → SHA256 of canonicalized state

**Critical:** State canonicalization must be deterministic:
- Stable key ordering
- Stable log ordering
- Stable representation for sets/maps
- Stable line endings (if using JSONL)

### **CTS Requirements**

To test L4, CTS MUST provide:

1. **Federated Orchestrator:** Spawn/kill/invoke multiple kernel processes
2. **Replication Driver:** Export/import state between nodes
3. **Convergence Verification:** Wait for hash equality across nodes
4. **Process Management:** Kill/restart nodes via signals

**Replication Model (L4):** CTS-mediated replication

**Rule:** Replication is a test harness action, not a background behavior.

- CTS decides when replication occurs (at explicit phase boundaries)
- CTS exports state from source node
- CTS imports state into target nodes
- CTS verifies hash convergence
- Kernel is NOT required to run any replication daemon, pubsub, or gossip protocol

This keeps L4 deterministic, reproducible, and boring. No sleep timers, no "wait for eventual consistency," no timing nondeterminism.

---

## **Why L4 Is Designed to be Enough**

L4 establishes the highest level of deterministic guarantee required for PCS core compliance: cognitive state survives process death across a minimal federated topology without introducing timing semantics, quorum rules, or probabilistic convergence. At this level, state replication is explicit, convergence is verifiable via canonical hash equality, governance constraints remain intact after node loss, and all assertions remain binary and reproducible. Beyond L4, additional properties such as leader election, partition tolerance, quorum-based consensus, multi-region deployment, or Byzantine fault resistance introduce distributed systems semantics that are probabilistic, timing-dependent, and outside the scope of deterministic cognitive state continuity. PCS defines cognitive durability—not distributed consensus. L4 therefore represents the boundary at which survivability is proven without compromising architectural determinism.

**L4 marks the boundary between deterministic cognitive survivability and distributed systems coordination semantics.**

---

## **Future Extensions (Non-Core PCS)**

Levels beyond L4 may define optional distributed coordination capabilities such as leader election, quorum-based consensus, partition tolerance, multi-region deployment, or Byzantine fault resistance. These properties address availability, coordination, and fault domains at the infrastructure layer and are not required to establish deterministic cognitive state continuity. Any future level introducing such semantics will be explicitly marked as an extension beyond core PCS and will not alter or weaken the guarantees established at L1–L4.

### **Future Extension Classes (Non-Core PCS)**

These represent optional distributed guarantees beyond deterministic single-node survivability:

- **L5-A: Partition Detection and Deterministic Rejoin Semantics**
  - Detect network partitions
  - Define deterministic state merge on rejoin
  - No probabilistic convergence

- **L5-B: Quorum-Based Write Acknowledgment**
  - Define write commit rules (e.g., 2/3 ack)
  - Explicit quorum semantics
  - No eventual consistency

- **L5-C: Leader Election**
  - Deterministic leader selection
  - Failover semantics
  - No timing-based election

- **L5-D: Byzantine Fault Tolerance**
  - Malicious node detection
  - State integrity under adversarial conditions
  - Cryptographic verification

- **L5-E: Multi-Region Deployment Semantics**
  - Cross-region replication
  - Latency-aware topology
  - Geographic fault domains

**These are extension domains and not required for PCS compliance.**

---

## **Philosophy**

### **Binary/Categorical Only**

All conformance scenarios use **binary or categorical outcomes**, never numeric metrics:
- ✅ `retrievalEvidence.present: true`
- ✅ `replication.converged: true`
- ✅ `governance.enforced: true`
- ❌ `decisionCount: 42` (numeric)
- ❌ `latencyMs: 123` (metric)

### **Minimal Surface Area**

Each level defines the **minimum** capabilities needed to prove the survivability boundary:
- No "nice to have" features
- No implementation details
- No performance requirements
- Just: "Does state survive this boundary?"

### **Standards Posture**

- CTS defines **what must be observable**
- Kernel defines **how to implement**
- CTS orchestrates test topologies
- Kernel exposes minimal surfaces

---

## **Conformance Evidence**

Each scenario produces:
- `conformance.json` - Pass/fail with categorical evidence
- `trace.json` - Execution trace with deterministic events
- `attestation.txt` - Cryptographic fingerprints

Evidence is:
- **Minimal:** Only what's needed to verify conformance
- **Deterministic:** Same input → same evidence
- **Reproducible:** Independent validators get same results
- **Verifiable:** Cryptographic hashes prevent tampering
