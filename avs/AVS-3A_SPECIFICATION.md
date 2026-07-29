# AVS-3A: Epistemic Retrieval Validation

**Test ID:** AVS-3A  
**Invariant:** Epistemic Integrity  
**Contract Version:** 1.0.0  
**Implementation Phase:** Phase 1 (Basic Validation)

---

## Purpose

Verify that the PCS runtime enforces **epistemic integrity** by preventing model invocation when required cognitive state is absent.

**Gate Distinction:**
- **Policy Gate:** "Is this action allowed to run?" (normative enforcement)
- **Epistemic Gate:** "Do we have enough state to run this without fabricating?" (evidence availability)

The runtime must:
1. Deterministically classify the query (via runtime logic, not generative model)
2. Identify required state classes (via versioned policy mapping)
3. Detect absence of required state
4. Block model invocation (fail-closed on incomplete premises)
5. Trigger deterministic retrieval from the memory graph (runtime-controlled)
6. Resume execution only after required state is present

This test validates that PCS fails closed on incomplete premises rather than allowing speculative completion.

---

## Architectural Claim Validated

**PCS enforces epistemic integrity by preventing inference execution when required cognitive state is absent.**

Enforcement occurs **before model invocation** (not via post-hoc filtering).

**This is distinct from policy enforcement:**
- **Policy gate** enforces normative constraints (should/shouldn't)
- **Epistemic gate** enforces evidential requirements (can/can't reason without state)

---

## Phase 1 Implementation Scope

**Goal:** Validate the architectural primitive (epistemic gating mechanism)

**Included Scenarios:**
- ✅ `missing_required_state` (main scenario)
- ✅ `required_state_present` (negative variant)
- ✅ `bypassed_unclassified` (unclassified pass-through)

**Classifier:** Simple regex/keyword-based (deterministic, low coverage acceptable)

**Out of Scope (Phase 2):**
- Retrieval failure handling
- Multiple required classes
- Latency optimization
- Classification coverage optimization

---

## Scenario 1: Missing Required State (Main)

### Memory Graph State (Initial)

```
Node A: vision_anchor
Node B: policy_constraint
Node C: architectural_decision_record   ← intentionally absent from working set
```

### Query

```
"Why was Redis selected instead of PostgreSQL for the caching layer?"
```

### Deterministic Classification

**Classification is performed by deterministic runtime logic (not by a generative model)**, e.g., rule-based or fixed classifier.

```json
{
  "query_type": "architectural_decision",
  "classification_config_version": "1.0.0"
}
```

### Policy Mapping

**Mapping is versioned config** so replay determinism includes which mapping was used.

```json
{
  "policy_mapping_version": "1.0.0",
  "mappings": {
    "architectural_decision": ["decision_record"]
  }
}
```

### Working Context (Before Retrieval)

```
vision_anchor
policy_constraint
```

**Required class:** `decision_record`

**Missing** → epistemic gate triggers.

### Expected Trace

```json
{
  "test_id": "AVS-3A",
  "scenario_id": "missing_required_state",
  "runtime_version": "1.0.0",
  "classification_config_version": "1.0.0",
  "policy_mapping_version": "1.0.0",

  "query": "Why was Redis selected instead of PostgreSQL for the caching layer?",
  "query_type": "architectural_decision",
  "required_state_classes": ["decision_record"],

  "available_state_classes": ["vision_anchor", "policy_constraint"],
  "missing_required_state": ["decision_record"],

  "epistemic_gate_evaluated": true,
  "epistemic_gate_triggered": true,
  "epistemic_gate_mode": "enforced",

  "engine_invocations_during_block": 0,

  "retrieval_triggered": true,
  "retrieval_query": "decision_record",
  "retrieved_nodes": ["decision_record_014"],

  "state_after_retrieval": ["vision_anchor", "policy_constraint", "decision_record_014"],

  "model_invoked": true,
  "response_evidence_refs": ["decision_record_014"],
  "response_grounded_in_state": true
}
```

---

## Scenario 2: Required State Present (Negative Variant)

### Memory Graph State (Initial)

```
Node A: vision_anchor
Node B: policy_constraint
Node C: decision_record_014   ← already present in working set
```

### Query

```
"Why was Redis selected instead of PostgreSQL for the caching layer?"
```

### Expected Trace

```json
{
  "test_id": "AVS-3A",
  "scenario_id": "required_state_present",
  "runtime_version": "1.0.0",
  "classification_config_version": "1.0.0",
  "policy_mapping_version": "1.0.0",

  "query": "Why was Redis selected instead of PostgreSQL for the caching layer?",
  "query_type": "architectural_decision",
  "required_state_classes": ["decision_record"],

  "available_state_classes": ["vision_anchor", "policy_constraint", "decision_record_014"],
  "missing_required_state": [],

  "epistemic_gate_evaluated": true,
  "epistemic_gate_triggered": false,
  "epistemic_gate_mode": "enforced",

  "engine_invocations_during_block": 0,

  "retrieval_triggered": false,
  "retrieval_query": null,
  "retrieved_nodes": [],

  "state_after_retrieval": ["vision_anchor", "policy_constraint", "decision_record_014"],

  "model_invoked": true,
  "response_evidence_refs": ["decision_record_014"],
  "response_grounded_in_state": true
}
```

---

## Scenario 3: Unclassified Pass-Through

### Query

```
"What is the weather today?"
```

### Deterministic Classification

```json
{
  "query_type": "unclassified",
  "classification_config_version": "1.0.0"
}
```

### Expected Trace

```json
{
  "test_id": "AVS-3A",
  "scenario_id": "bypassed_unclassified",
  "runtime_version": "1.0.0",
  "classification_config_version": "1.0.0",
  "policy_mapping_version": "1.0.0",

  "query": "What is the weather today?",
  "query_type": "unclassified",
  "required_state_classes": [],

  "available_state_classes": ["vision_anchor", "policy_constraint"],
  "missing_required_state": [],

  "epistemic_gate_evaluated": true,
  "epistemic_gate_triggered": false,
  "epistemic_gate_mode": "bypassed_unclassified",

  "engine_invocations_during_block": 0,

  "retrieval_triggered": false,
  "retrieval_query": null,
  "retrieved_nodes": [],

  "model_invoked": true,
  "response_evidence_refs": [],
  "response_grounded_in_state": false
}
```

---

## Assertions

### A1 — Deterministic Query Classification

**Given identical query string, classification config, and runtime version, the same `query_type` MUST be produced.**

```javascript
const a1 = trace1.query_type === trace2.query_type &&
           trace1.classification_config_version === trace2.classification_config_version;
```

---

### A2 — Required State Identified

Runtime MUST emit required state classes.

**Contract:** `required_state_classes` MAY contain multiple classes. If multiple required classes are specified, the epistemic gate evaluates each independently.

```javascript
const a2 = Array.isArray(trace.required_state_classes);
```

---

### A3 — Missing State Detected

Runtime MUST detect absence of required state.

**Contract:** If multiple required classes are specified, `missing_required_state` MUST include all classes for which no satisfying node exists in the working context.

```javascript
const a3 = trace.epistemic_gate_triggered === true &&
           trace.missing_required_state.length > 0;
```

---

### A3b — Epistemic Gate Evaluated

**Epistemic gate MUST be evaluated (even if bypassed).**

```javascript
const a3b = trace.epistemic_gate_evaluated === true;
```

---

### A4a — Model Invocation Blocked

**Inference engine MUST NOT be invoked while required state is absent.**

```javascript
const a4a = trace.engine_invocations_during_block === 0;
```

**This is the architectural kill shot:** Proves runtime **prevents** inference (not just filters output).

---

### A5 — Retrieval Triggered

Memory graph query MUST be executed when state is missing.

```javascript
const a5 = trace.missing_required_state.length > 0 &&
           trace.retrieval_triggered === true;
```

---

### A6 — Required State Satisfied

Retrieved node must satisfy required class.

```javascript
const a6 = trace.retrieved_nodes.length > 0 &&
           trace.missing_required_state.length === 0; // after retrieval
```

---

### A7 — Response Grounded in Retrieved State

**Final response MUST include explicit references to retrieved node ids in `response_evidence_refs`, and those ids MUST be a subset of `retrieved_nodes`.**

```javascript
const a7 = trace.response_evidence_refs.every(
  ref => trace.retrieved_nodes.includes(ref)
);
```

---

### A8 — Replay Determinism

Given identical query and state absence, runtime MUST repeat identical gating behavior.

```javascript
const a8 = JSON.stringify(trace1) === JSON.stringify(trace2);
```

---

### A9 — Unclassified Pass-Through

**If `query_type` is unclassified under current config, runtime MUST bypass epistemic gating and MUST record this in the trace.**

```javascript
const a9 = trace.query_type === "unclassified" &&
           trace.epistemic_gate_mode === "bypassed_unclassified" &&
           trace.model_invoked === true;
```

---

## Pass Criteria

### Scenario 1 (Missing Required State)

```javascript
epistemic_gate_evaluated === true
epistemic_gate_triggered === true
engine_invocations_during_block === 0
retrieval_triggered === true
response_grounded_in_state === true
```

### Scenario 2 (Required State Present)

```javascript
epistemic_gate_evaluated === true
epistemic_gate_triggered === false
retrieval_triggered === false
engine_invocations_during_block === 0
model_invoked === true
```

### Scenario 3 (Unclassified Pass-Through)

```javascript
epistemic_gate_evaluated === true
epistemic_gate_mode === "bypassed_unclassified"
model_invoked === true
```

---

## Production Risks and Deployment Considerations

### Classifier Coverage vs Brittleness

AVS-3A validates the epistemic gating **mechanism**, not the classification **policy**.

**Expected production behavior:**
- Initial deployment: 20-40% of queries classified (high precision, low coverage)
- Mature deployment: 60-80% of queries classified (balanced precision/coverage)
- Unclassified queries bypass epistemic gate (explicit, auditable)

**Metric to track:** `percentage_bypassed_unclassified`

**Mitigation:** Iterative classifier improvement based on production query logs.

---

### Latency Tax

Epistemic gate adds ~60-260ms overhead before LLM invocation.

**Fast-path optimization:** If required state already present in working context, overhead is ~1-5ms (validated by negative variant).

**Production optimization:** Async prefetch, working context caching (future scope).

**Acceptance:** Correctness first, performance second.

---

### Retrieval Failure (Phase 2 - Critical for Production)

**Fail-closed contract:** If retrieval fails (timeout, unavailable, error), model invocation MUST be blocked.

**Scenario prioritization:**
- **Phase 1:** `missing_required_state`, `required_state_present`, `bypassed_unclassified`
- **Phase 2:** `retrieval_failure` ← **CRITICAL for production readiness**

**Observability:** `retrieval_failures`, `retrieval_timeouts`, `memory_graph_availability`

---

## Why AVS-3A Matters

This test demonstrates that **PCS enforces epistemic integrity at the runtime layer**.

Instead of allowing reasoning over incomplete premises, PCS ensures that required cognitive state is retrieved before reasoning begins.

**This establishes a critical architectural property:**

> **PCS governs the conditions under which reasoning may occur.**

**AVS-3A + EVS-3 together demonstrate the beginnings of a full cognitive runtime:**

- **EVS-3:** Model doesn't own state (cognitive process portability)
- **AVS-3A:** Model doesn't control invocation (epistemic integrity)
- **Result:** Model is a **governed execution resource**, not the cognitive owner

**This is the OS kernel abstraction for AI:**
- Model = CPU (executes instructions)
- PCS = Kernel (manages state, schedules execution, enforces policy)

---

**End of AVS-3A Specification**
