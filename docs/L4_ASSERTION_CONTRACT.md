# L4 Binary Assertion Contract

**Purpose:** Define the exact shape of L4 conformance evidence

---

## Core Principle

**L4 assertions are PURELY BINARY. No counts, no timing, no percentages, no "eventually".**

---

## L4 Scenario Evidence Shape

Each L4 scenario MUST produce evidence in this exact shape:

```json
{
  "scenario": "L4.federated.decision-replication",
  "passed": true,
  "invariants": {
    "replicationSucceeded": true,
    "hashMatchAfterReplication": true,
    "hashMatchAfterNodeKill": true,
    "queryCorrectnessAfterLoss": true
  }
}
```

**All fields are boolean. No exceptions.**

---

## Scenario-Specific Invariants

### **L4.federated.decision-replication**

**Purpose:** Verify decision state replicates and survives node loss

**Invariants:**
```json
{
  "replicationSucceeded": true,        // State export/import completed
  "hashMatchAfterReplication": true,   // All nodes have same hash
  "hashMatchAfterNodeKill": true,      // Surviving nodes still match
  "queryCorrectnessAfterLoss": true    // Query returns correct decision
}
```

**Forbidden:**
- ❌ `decisionCount: 1` (numeric)
- ❌ `replicationTimeMs: 123` (timing)
- ❌ `convergencePercentage: 100` (percentage)
- ❌ `eventuallyConverged: true` (eventual consistency)

---

### **L4.federated.governance-replication**

**Purpose:** Verify policy enforcement survives node loss

**Invariants:**
```json
{
  "replicationSucceeded": true,        // Policy replicated to all nodes
  "hashMatchAfterReplication": true,   // All nodes have same hash
  "governanceStillEnforced": true,     // Policy enforced after node kill
  "enforcementDecisionCorrect": true   // DENY decision matches policy
}
```

**Forbidden:**
- ❌ `policyCount: 1` (numeric)
- ❌ `enforcementLatencyMs: 50` (timing)
- ❌ `enforcementSuccessRate: 1.0` (percentage)

---

### **L4.federated.nonquorum-node-loss-survivability**

**Purpose:** Verify new writes accepted after single-node loss

**Invariants:**
```json
{
  "preDeathReplicationSucceeded": true,   // Initial state replicated
  "nodeKillSucceeded": true,              // Node A terminated
  "newWriteAccepted": true,               // New write on B succeeded
  "newWriteReplicatedToC": true,          // New write replicated to C
  "hashMatchAfterNewWrite": true          // B and C converged
}
```

**Forbidden:**
- ❌ `writeCount: 2` (numeric)
- ❌ `survivingNodeCount: 2` (numeric)
- ❌ `writeSuccessRate: 100` (percentage)

---

## Evidence Structure (Complete)

```json
{
  "scenario": "L4.federated.decision-replication",
  "passed": true,
  "topology": {
    "nodeCount": 3,
    "nodes": ["A", "B", "C"],
    "killedNode": "A"
  },
  "phases": [
    {
      "phase": "seed-decision-on-A",
      "nodeId": "A",
      "success": true
    },
    {
      "phase": "replicate-to-B-and-C",
      "sourceNode": "A",
      "targetNodes": ["B", "C"],
      "success": true
    },
    {
      "phase": "verify-convergence",
      "hashA": "abc123...",
      "hashB": "abc123...",
      "hashC": "abc123...",
      "allMatch": true
    },
    {
      "phase": "kill-node-A",
      "killedNode": "A",
      "success": true
    },
    {
      "phase": "query-node-B",
      "nodeId": "B",
      "retrievalSuccess": true,
      "decisionPresent": true
    },
    {
      "phase": "verify-surviving-convergence",
      "hashB": "abc123...",
      "hashC": "abc123...",
      "match": true
    }
  ],
  "invariants": {
    "replicationSucceeded": true,
    "hashMatchAfterReplication": true,
    "hashMatchAfterNodeKill": true,
    "queryCorrectnessAfterLoss": true
  }
}
```

---

## Forbidden Patterns

### ❌ **Numeric Counts**

```json
// WRONG
{
  "decisionCount": 1,
  "policyCount": 2,
  "nodeCount": 3
}

// CORRECT
{
  "decisionPresent": true,
  "policyEnforced": true,
  "topologyValid": true
}
```

### ❌ **Timing Metrics**

```json
// WRONG
{
  "replicationTimeMs": 123,
  "convergenceTimeMs": 50,
  "queryLatencyMs": 10
}

// CORRECT
{
  "replicationSucceeded": true,
  "convergenceImmediate": true,
  "querySucceeded": true
}
```

### ❌ **Percentages or Rates**

```json
// WRONG
{
  "convergencePercentage": 100,
  "successRate": 1.0,
  "availabilityPercent": 66.67
}

// CORRECT
{
  "converged": true,
  "succeeded": true,
  "available": true
}
```

### ❌ **Eventual Consistency Language**

```json
// WRONG
{
  "eventuallyConverged": true,
  "finallyConsistent": true,
  "convergedAfterWait": true
}

// CORRECT
{
  "converged": true,
  "consistent": true,
  "hashMatch": true
}
```

---

## Verification Pattern

**Each invariant must be verifiable via:**
1. Direct observation (not inference)
2. Categorical check (not numeric comparison)
3. Immediate verification (not time-based wait)

**Example:**
```javascript
// ✅ CORRECT: Direct boolean check
const hashA = await orchestrator.getStateHash('A');
const hashB = await orchestrator.getStateHash('B');
const hashC = await orchestrator.getStateHash('C');
const hashMatch = (hashA === hashB && hashB === hashC);

invariants.hashMatchAfterReplication = hashMatch;

// ❌ WRONG: Numeric comparison
const matchCount = [hashA, hashB, hashC].filter(h => h === hashA).length;
invariants.convergencePercentage = (matchCount / 3) * 100;
```

---

## L4 Freeze Gate Criteria

**When L4 is ready for freeze, evidence must show:**

1. **100% pass rate** (all scenarios pass, all iterations)
2. **All invariants true** (no false values in any invariant)
3. **Stable evidence_hash** (if normalizing L4 evidence like L3)
4. **Clean hygiene** (no paths, hostnames, or environment metadata)

**Shape of freeze gate report:**
```json
{
  "freeze_gate": {
    "pass_rate": {
      "count": 20,
      "total": 20,
      "percentage": 100.0
    },
    "freeze_ready": true
  },
  "scenarios": [
    {
      "id": "L4.federated.decision-replication",
      "iterations_passed": 20,
      "iterations_total": 20,
      "all_invariants_true": true
    },
    {
      "id": "L4.federated.governance-replication",
      "iterations_passed": 20,
      "iterations_total": 20,
      "all_invariants_true": true
    },
    {
      "id": "L4.federated.nonquorum-node-loss-survivability",
      "iterations_passed": 20,
      "iterations_total": 20,
      "all_invariants_true": true
    }
  ]
}
```

---

## Summary

**L4 assertions are binary. Always.**

- ✅ Boolean invariants only
- ✅ Categorical evidence only
- ✅ Immediate verification only

- ❌ No counts
- ❌ No timing
- ❌ No percentages
- ❌ No "eventually"

**This is the L4 contract.**

---

**END OF ASSERTION CONTRACT**
