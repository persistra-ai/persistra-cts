# Runtime Trace Contract

**Version:** 1.0.0  
**Status:** Active  
**Last Updated:** 2026-03-01

---

## Purpose

This document defines the **required trace fields** that PCS Runtime must emit for conformance testing and architectural verification.

**CTS and AVS tests must fail if expected trace fields are missing.**

This contract prevents silent regression and ensures runtime observability.

---

## Core Principle

**Runtime traces are the authoritative source of truth for enforcement, retrieval, and boundary events.**

Tests must **never** infer behavior from text analysis. All assertions must use trace fields.

---

## Required Trace Fields

### 1. `enforcementDecision`

**Purpose:** Proves deterministic policy enforcement occurred

**Required Fields:**
```typescript
enforcementDecision: {
  decision: 'ALLOW' | 'DENY',           // Required
  reason: string,                        // Required
  policyViolation: boolean,              // Required
  decisionContradiction: boolean         // Required
}
```

**Emitted By:** PolicyEnforcementPoint  
**Validated By:** AVS-1P, CTS L2  
**Required In:** All PEP validation traces

**Example:**
```json
{
  "enforcementDecision": {
    "decision": "DENY",
    "reason": "Output violates policy POL-001: Output contains forbidden terms: AWS",
    "policyViolation": true,
    "decisionContradiction": false
  }
}
```

---

### 2. `enforcementTrace`

**Purpose:** Detailed enforcement audit trail

**Required Fields:**
```typescript
enforcementTrace: {
  event: 'policy_enforcement_point.invoked',  // Required
  timestamp: number,                          // Required
  action: 'allowed' | 'blocked',              // Required
  violationDetected: boolean,                 // Required
  decisionStateChecked: string | null,        // Decision ID or null
  policyStateChecked: string[],               // Array of policy IDs
  violatedPolicy: string | null,              // Policy ID or null
  violatedTerms: string[]                     // Array of violated terms
}
```

**Emitted By:** PolicyEnforcementPoint  
**Validated By:** AVS-1P, CTS L2  
**Required In:** All enforcement traces

**Example:**
```json
{
  "enforcementTrace": {
    "event": "policy_enforcement_point.invoked",
    "timestamp": 1772392261963,
    "action": "blocked",
    "violationDetected": true,
    "decisionStateChecked": null,
    "policyStateChecked": ["POL-001"],
    "violatedPolicy": "POL-001",
    "violatedTerms": ["AWS", "Lambda"]
  }
}
```

---

### 3. `retrievalEvidence`

**Purpose:** Proves state retrieval occurred and provides backend introspection

**Required Fields:**
```typescript
retrievalEvidence: {
  retrieved: boolean,                    // Required
  decisionId: string | null,             // Decision ID or null
  policyIds: string[],                   // Array of policy IDs
  method: 'state-layer' | 'semantic',    // Required
  trigger: string,                       // Required
  // Backend introspection (AVS-1R)
  backend: string,                       // Backend type: 'openai', 'local-semantic-embeddings', etc.
  dimensions: number,                    // Embedding dimensions: 384, 768, or 1536
  similarity: number | null              // Cosine similarity score (0.0-1.0) or null
}
```

**Emitted By:** PolicyEnforcementPoint  
**Validated By:** AVS-1R, CTS L1, CTS L2  
**Required In:** All retrieval traces

**Example:**
```json
{
  "retrievalEvidence": {
    "retrieved": true,
    "decisionId": "DR-001",
    "policyIds": ["POL-001"],
    "method": "state-layer",
    "trigger": "enforcement-check",
    "backend": "openai",
    "dimensions": 1536,
    "similarity": 0.95
  }
}
```

---

### 4. `boundaryTrace`

**Purpose:** Proves session boundary enforcement occurred

**Required Fields:**
```typescript
boundaryTrace: {
  sessionId: string,                     // Required
  namespace: string,                     // Required
  boundaryEnforced: boolean,             // Required
  destroyed: boolean,                    // Session destroyed flag
  event: 'session_boundary.enforced' | 'session_boundary.created'  // Required
}
```

**Emitted By:** PCSRuntime  
**Validated By:** CTS L1  
**Required In:** All session boundary traces

**Example:**
```json
{
  "boundaryTrace": {
    "sessionId": "session-alpha",
    "namespace": "cts-l1-boundary",
    "boundaryEnforced": true,
    "destroyed": true,
    "event": "session_boundary.enforced"
  }
}
```

---

### 5. `memoryGraphTrace`

**Purpose:** Proves federated state synchronization occurred

**Required Fields:**
```typescript
memoryGraphTrace: {
  syncOccurred: boolean,                 // Required
  namespace: string,                     // Required
  sourceNode: string,                    // Source node ID
  targetNode: string,                    // Target node ID
  timestamp: number,                     // Required
  decisionsCount: number,                // Number of decisions synced
  policiesCount: number,                 // Number of policies synced
  conflictResolved: boolean              // Required
}
```

**Emitted By:** MemoryGraph  
**Validated By:** CTS L4  
**Required In:** All federation traces

**Example:**
```json
{
  "memoryGraphTrace": {
    "syncOccurred": true,
    "namespace": "cts-l4-federation",
    "sourceNode": "node-a",
    "targetNode": "node-b",
    "timestamp": 1772392117889,
    "decisionsCount": 1,
    "policiesCount": 0,
    "conflictResolved": false
  }
}
```

---

### 6. `continuityEvent`

**Purpose:** Proves cross-model cognitive continuity (CMCC)

**Required Fields:**
```typescript
continuityEvent: {
  confirmed: boolean,                    // Required
  sourceModel: string,                   // Source model label
  targetModel: string,                   // Target model label
  reason: string                         // Reason for transition
}
```

**Emitted By:** PCSRuntime  
**Validated By:** CTS L3  
**Required In:** All model transition traces

**Example:**
```json
{
  "continuityEvent": {
    "confirmed": true,
    "sourceModel": "claude-sonnet-4-6",
    "targetModel": "gpt-4",
    "reason": "model-transition-detected"
  }
}
```

---

### 7. `auditTrace` (Future)

**Purpose:** Comprehensive audit trail for compliance

**Planned Fields:**
```typescript
auditTrace: {
  traceId: string,                       // Unique trace ID
  timestamp: number,                     // Required
  actor: string,                         // Actor/user ID
  action: string,                        // Action performed
  resource: string,                      // Resource affected
  outcome: 'success' | 'failure',        // Required
  metadata: object                       // Additional context
}
```

**Status:** Planned for Phase 3  
**Validated By:** Future audit tests

---

### 8. `cseTrace` (Future - EVS-7)

**Purpose:** Cognitive State Embeddings validation

**Planned Fields:**
```typescript
cseTrace: {
  embeddingGenerated: boolean,           // Required
  backend: string,                       // Backend used
  dimensions: number,                    // Embedding dimensions
  similarity: number,                    // Similarity score
  retrievalMethod: string,               // Retrieval method used
  semanticMatch: boolean                 // Semantic match found
}
```

**Status:** Planned for EVS-7  
**Validated By:** EVS-7 (Semantic Embeddings)

---

### 9. `metaProgrammingTrace` (Future)

**Purpose:** Meta-programming and code generation validation

**Planned Fields:**
```typescript
metaProgrammingTrace: {
  codeGenerated: boolean,                // Required
  language: string,                      // Programming language
  linesOfCode: number,                   // LOC generated
  syntaxValid: boolean,                  // Syntax validation
  securityChecked: boolean               // Security validation
}
```

**Status:** Planned for future phases  
**Validated By:** Future meta-programming tests

---

## Enforcement Rule Formalism

### Decision Contradiction Detection

**Model:** Structural property matching

**Mechanism:**
1. Extract JSON commitment block from model output
2. Parse and validate commitment structure
3. Compare property value against decision metadata
4. Exact equality check: `actualValue === expectedValue`

**Determinism:** 100% for valid commitment blocks

**Evasion Prevention:**
- Invalid commitment block = violation
- Missing commitment block = violation
- Malformed JSON = violation
- Multiple commitment blocks = violation (ambiguous)

**Example:**
```javascript
// Decision metadata
{ property: 'backend_language', value: 'Python' }

// Valid commitment (passes)
```json
{
  "backend_language": "Python"
}
```

// Invalid commitment (fails)
```json
{
  "backend_language": "Java"  // Contradiction detected
}
```
```

### Policy Violation Detection

**Model:** String pattern matching

**Mechanism:**
1. Extract forbidden terms from policy constraint
2. Convert output and terms to lowercase
3. Check substring presence: `output.toLowerCase().includes(term.toLowerCase())`

**Determinism:** 100% for exact term matches

**Limitation:** Case-insensitive substring matching only (no semantic understanding)

**Example:**
```javascript
// Policy constraint
"AWS is forbidden"

// Forbidden terms extracted: ['AWS']

// Violation detected (fails)
"I recommend AWS Lambda"  // Contains 'AWS'

// No violation (passes)
"I recommend Google Cloud"  // Does not contain 'AWS'
```

### Contradiction Definition

**Structural Contradiction:**
```javascript
actualValue !== expectedValue  // For property in commitment block
```

**Policy Violation:**
```javascript
output.toLowerCase().includes(forbiddenTerm.toLowerCase())  // For any forbidden term
```

**Determinism Guarantees:**
- Structural: 100% deterministic (exact property match)
- Policy: 100% deterministic (exact substring match)
- Semantic: NOT deterministic (legacy fallback only)

---

## Implementation Boundaries

### What IS Implemented

1. **Structural Enforcement**
   - JSON commitment block extraction
   - Property-based contradiction detection
   - Evasion prevention (invalid/missing commitment = violation)

2. **Policy Enforcement**
   - String pattern matching for forbidden terms
   - Case-insensitive substring detection
   - Multiple policy support

3. **Namespace Replication**
   - Shared in-memory namespace store
   - Sync event trace emission
   - State visibility across runtime instances

4. **Backend Introspection**
   - Backend type tracking
   - Embedding dimensions tracking
   - Similarity score field (mocked for now)

### What is NOT Implemented

1. **Semantic Retrieval**
   - `method: 'semantic'` not yet implemented
   - `similarity` scores are mocked (1.0 for perfect match)
   - Real semantic embeddings planned for EVS-7

2. **Conflict Resolution**
   - `conflictResolved` always false
   - `conflictDetected` always false
   - No conflict detection or resolution logic

3. **Distributed Consensus**
   - Namespace store is in-memory, single-process
   - No network layer
   - No partition handling
   - Production would require Raft/Paxos/etc.

4. **Concurrent Write Handling**
   - No concurrent write detection
   - No eventual consistency guarantees
   - Single-threaded access assumed

---

## Validation Rules

### Rule 1: Required Fields Must Be Present

**All required fields must be present in traces, even if null/empty.**

```javascript
// ✅ Valid
{
  "enforcementDecision": {
    "decision": "ALLOW",
    "reason": "No violations",
    "policyViolation": false,
    "decisionContradiction": false
  }
}

// ❌ Invalid - missing required fields
{
  "enforcementDecision": {
    "decision": "ALLOW"
  }
}
```

### Rule 2: Field Types Must Match Contract

**Field types must match the contract specification.**

```javascript
// ✅ Valid
{
  "retrievalEvidence": {
    "retrieved": true,
    "similarity": 0.95
  }
}

// ❌ Invalid - wrong type
{
  "retrievalEvidence": {
    "retrieved": "true",  // Should be boolean
    "similarity": "0.95"  // Should be number
  }
}
```

### Rule 3: Enum Values Must Be Valid

**Enum fields must use valid values from the contract.**

```javascript
// ✅ Valid
{
  "enforcementDecision": {
    "decision": "DENY"
  }
}

// ❌ Invalid - invalid enum value
{
  "enforcementDecision": {
    "decision": "REJECT"  // Should be 'ALLOW' or 'DENY'
  }
}
```

### Rule 4: Arrays Must Be Present

**Array fields must be present, even if empty.**

```javascript
// ✅ Valid
{
  "retrievalEvidence": {
    "policyIds": []
  }
}

// ❌ Invalid - missing array
{
  "retrievalEvidence": {
    // policyIds missing
  }
}
```

---

## Test Validation

### CTS Tests Must Validate Trace Contract

**All CTS tests must validate required trace fields are present.**

```javascript
// Example: CTS L2 Policy Enforcement
const result = await runtime.execute(modelFn, prompt);

// ✅ Validate trace contract
assert(result.trace.enforcement_decision !== undefined, 
  'enforcementDecision is required');
assert(result.trace.enforcement_decision.decision !== undefined,
  'enforcementDecision.decision is required');
assert(['ALLOW', 'DENY'].includes(result.trace.enforcement_decision.decision),
  'enforcementDecision.decision must be ALLOW or DENY');
```

### AVS Tests Must Validate Trace Contract

**All AVS tests must validate primitive-specific trace fields.**

```javascript
// Example: AVS-1R Decision Retrieval
const result = await runtime.execute(modelFn, prompt);

// ✅ Validate trace contract
assert(result.trace.retrieval_evidence !== undefined,
  'retrievalEvidence is required');
assert(result.trace.retrieval_evidence.backend !== undefined,
  'retrievalEvidence.backend is required');
assert(result.trace.retrieval_evidence.dimensions !== undefined,
  'retrievalEvidence.dimensions is required');
```

---

## Trace Contract Validator

**Helper function for validating trace contracts:**

```javascript
function validateTraceContract(trace, requiredFields) {
  const errors = [];
  
  for (const field of requiredFields) {
    const parts = field.split('.');
    let value = trace;
    
    for (const part of parts) {
      if (value === undefined || value === null) {
        errors.push(`Missing required field: ${field}`);
        break;
      }
      value = value[part];
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Trace contract validation failed:\n${errors.join('\n')}`);
  }
  
  return true;
}

// Usage
validateTraceContract(result.trace, [
  'enforcement_decision',
  'enforcement_decision.decision',
  'enforcement_decision.reason',
  'retrieval_evidence',
  'retrieval_evidence.backend',
  'retrieval_evidence.dimensions'
]);
```

---

## Migration Path

### Phase 1: Core Traces (Complete)
- ✅ `enforcementDecision`
- ✅ `retrievalEvidence`
- ✅ `boundaryTrace`
- ✅ `memoryGraphTrace`
- ✅ `continuityEvent`

### Phase 2: Enhanced Traces (In Progress)
- ✅ Backend introspection in `retrievalEvidence`
- 🔄 `auditTrace` (planned)

### Phase 3: Advanced Traces (Future)
- ⏳ `cseTrace` (EVS-7)
- ⏳ `metaProgrammingTrace`

---

## Enforcement

**All new runtime features must:**
1. Define required trace fields in this contract
2. Emit traces conforming to the contract
3. Include trace validation in tests
4. Update this document with new fields

**All tests must:**
1. Validate required trace fields are present
2. Fail if expected fields are missing
3. Use trace fields exclusively (no text analysis)
4. Document which contract fields they validate

---

## Version History

**v1.0.0 (2026-03-01):**
- Initial contract definition
- Core trace fields: enforcement, retrieval, boundary, memoryGraph, continuity
- Backend introspection in retrievalEvidence
- Validation rules and examples

---

## References

- **CTS Tests:** `/persistra-cts/tests/L{1,2,3,4}/`
- **AVS Tests:** `/persistra-cts/avs-harness/avs-{1p,1r}-*.js`
- **Runtime Implementation:** `/pcs-runtime/`
- **Trace Emitter:** `/pcs-runtime/trace-emitter.js`

---

**This contract is binding. Tests must fail if trace fields are missing.**
