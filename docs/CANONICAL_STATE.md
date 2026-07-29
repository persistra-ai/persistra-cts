# Canonical State Encoding

This document defines the canonical state encoding requirements for L4 federated state survivability.

---

## **Why This Matters**

L4's core verification mechanism is **hash-based convergence**: two nodes with the same logical state must produce the same hash.

**The biggest L4 risk isn't federation—it's hash mismatch due to serialization drift.**

If canonicalization is not deterministic, you'll get false negatives:
- Same logical state → different hashes → test fails
- Debugging becomes a tar pit
- Temptation to weaken `hashMatch` criteria (standards posture regression)

---

## **Canonical State Encoding Requirements**

### **0. Schema Version (Frozen Schema)**

**Every exported state MUST include a schema version string.**

```json
{
  "decisions": [...],
  "policies": [...],
  "schema_version": "pcs-state-v0.1"
}
```

**Why this matters:**
- Hash is only meaningful if the canonical state schema is frozen
- Future "harmless" changes to export shape will silently break cross-version convergence
- Without schema versioning, you get "L4 but not really" confusion

**Rules:**
- All keys sorted lexicographically ("decisions" < "policies" < "schema_version")
- `schema_version` MUST be included in the canonical blob
- `schema_version` MUST be included in the hash input
- Version string format: `pcs-state-v{major}.{minor}` (e.g., `pcs-state-v0.1`)
- Version MUST be incremented when state schema changes

**Version History:**
- `pcs-state-v0.1`: Initial L4 schema (decisions + policies)

**Future versions:**
- If state schema changes (e.g., add "sessions" array), increment version
- Nodes with different schema versions MUST NOT attempt convergence
- Import MUST reject state with mismatched schema version

---

### **1. Stable Key Ordering (Deep Sort)**

All object keys MUST be sorted alphabetically at every level of nesting.

**✅ Correct:**
```json
{
  "decisions": [...],
  "policies": [...]
}
```

**❌ Incorrect:**
```json
{
  "policies": [...],
  "decisions": [...]
}
```

**Implementation:**
```javascript
// Deep sort all object keys
function canonicalizeObject(obj) {
  if (Array.isArray(obj)) {
    return obj.map(canonicalizeObject);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = canonicalizeObject(obj[key]);
        return sorted;
      }, {});
  }
  return obj;
}
```

---

### **2. Stable Array/Collection Ordering**

Arrays MUST be sorted by a stable identifier (e.g., `id` field).

**✅ Correct:**
```json
{
  "decisions": [
    { "id": "d1", "value": "approved" },
    { "id": "d2", "value": "rejected" }
  ]
}
```

**❌ Incorrect (insertion order):**
```json
{
  "decisions": [
    { "id": "d2", "value": "rejected" },
    { "id": "d1", "value": "approved" }
  ]
}
```

**Implementation:**
```javascript
// Sort arrays by stable ID
function sortById(array) {
  return array.slice().sort((a, b) => {
    if (a.id && b.id) {
      return a.id.localeCompare(b.id);
    }
    return 0;
  });
}
```

---

### **3. No Timestamps or Non-Deterministic Data**

State MUST NOT include:
- ❌ Timestamps (`createdAt`, `updatedAt`, `timestamp`)
- ❌ Random IDs generated at runtime
- ❌ Insertion order metadata
- ❌ Process IDs or node-specific identifiers
- ❌ Filesystem paths or environment variables

**✅ Correct:**
```json
{
  "id": "d1",
  "value": "approved",
  "nonce": "abc123"
}
```

**❌ Incorrect:**
```json
{
  "id": "d1",
  "value": "approved",
  "nonce": "abc123",
  "createdAt": "2026-02-13T12:00:00Z",
  "nodeId": "A"
}
```

**Why nonces are OK:** Nonces are deterministic identifiers generated at decision time, not runtime. They're part of the logical state, not metadata.

---

### **4. Explicit UTF-8 and LF Line Endings**

If state includes text normalization:
- Use UTF-8 encoding
- Use LF (`\n`) line endings, never CRLF (`\r\n`)
- Normalize Unicode (NFC normalization)

**✅ Correct:**
```javascript
const canonical = JSON.stringify(state, null, 0); // No whitespace
const normalized = canonical.replace(/\r\n/g, '\n'); // LF only
```

**❌ Incorrect:**
```javascript
const canonical = JSON.stringify(state, null, 2); // Whitespace varies
```

---

### **5. No Whitespace in Canonical Representation**

Canonical JSON MUST NOT include whitespace (spaces, tabs, newlines).

**✅ Correct:**
```json
{"decisions":[{"id":"d1","value":"approved"}],"policies":[]}
```

**❌ Incorrect:**
```json
{
  "decisions": [
    {
      "id": "d1",
      "value": "approved"
    }
  ],
  "policies": []
}
```

**Implementation:**
```javascript
// No whitespace
const canonical = JSON.stringify(state, null, 0);
```

---

## **Reference Implementation**

### **Export State (Canonical)**

```javascript
class StateStore {
  exportState() {
    const state = {
      schema_version: 'pcs-state-v0.1',  // REQUIRED: frozen schema version
      decisions: this.getDecisions()
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(d => ({
          id: d.id,
          content: d.content,
          metadata: this.canonicalizeObject(d.metadata)
        })),
      policies: this.getPolicies()
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(p => ({
          id: p.id,
          constraint: p.constraint,
          metadata: this.canonicalizeObject(p.metadata)
        }))
    };
    
    return this.canonicalizeObject(state);
  }
  
  canonicalizeObject(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this.canonicalizeObject(item));
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj)
        .sort()
        .reduce((sorted, key) => {
          sorted[key] = this.canonicalizeObject(obj[key]);
          return sorted;
        }, {});
    }
    return obj;
  }
}
```

---

### **Compute Hash**

```javascript
const crypto = require('crypto');

class StateStore {
  getStateHash() {
    const canonical = this.exportState();
    const json = JSON.stringify(canonical, null, 0); // No whitespace
    const hash = crypto.createHash('sha256').update(json, 'utf8').digest('hex');
    return `sha256:${hash}`;
  }
}
```

---

### **Import State (REPLACE Semantics)**

**L4 Import Semantics: REPLACE, not merge.**

```javascript
class StateStore {
  importState(state) {
    // CRITICAL: Verify schema version match
    const CURRENT_SCHEMA_VERSION = 'pcs-state-v0.1';
    if (state.schema_version !== CURRENT_SCHEMA_VERSION) {
      throw new Error(
        `Schema version mismatch: expected ${CURRENT_SCHEMA_VERSION}, got ${state.schema_version}`
      );
    }
    
    // REPLACE semantics: clear existing state completely
    this.clear();
    
    // Import decisions (full replacement)
    state.decisions.forEach(d => {
      this.storeDecision(d.id, d.content, d.metadata);
    });
    
    // Import policies (full replacement)
    state.policies.forEach(p => {
      this.storePolicy(p.id, p.constraint, p.metadata);
    });
  }
}
```

**Why REPLACE semantics:**
- Deterministic: same import → same final state
- No merge conflicts or resolution logic
- No nondeterminism from merge strategies
- Simple, boring, provable

**Explicitly out of scope for L4:**
- ❌ Merge semantics (combine old + new state)
- ❌ Rejoin semantics (reconcile diverged state)
- ❌ Conflict resolution strategies
- ❌ Partial updates or delta imports

These are reserved for future levels (L5+).

**If an engineer implements merge "to be helpful," you inherit nondeterminism.**

---

## **Round-Trip Determinism Test**

Before implementing federation, verify canonicalization with this unit test:

```javascript
describe('Canonical State Encoding', () => {
  it('should produce identical hash after export/import round trip', () => {
    const store = new StateStore();
    
    // Seed state
    store.storeDecision('d1', { text: 'approved' }, { nonce: 'abc123' });
    store.storePolicy('p1', 'no recommendations', { nonce: 'def456' });
    
    // Export and compute hash
    const state1 = store.exportState();
    const hash1 = store.getStateHash();
    
    // Import into new store
    const store2 = new StateStore();
    store2.importState(state1);
    
    // Export and compute hash again
    const state2 = store2.exportState();
    const hash2 = store2.getStateHash();
    
    // Hashes MUST match exactly
    expect(hash1).toBe(hash2);
    expect(JSON.stringify(state1)).toBe(JSON.stringify(state2));
  });
  
  it('should produce identical hash regardless of insertion order', () => {
    const store1 = new StateStore();
    store1.storeDecision('d2', { text: 'rejected' }, { nonce: 'xyz789' });
    store1.storeDecision('d1', { text: 'approved' }, { nonce: 'abc123' });
    
    const store2 = new StateStore();
    store2.storeDecision('d1', { text: 'approved' }, { nonce: 'abc123' });
    store2.storeDecision('d2', { text: 'rejected' }, { nonce: 'xyz789' });
    
    // Hashes MUST match despite different insertion order
    expect(store1.getStateHash()).toBe(store2.getStateHash());
  });
});
```

**If this test fails, fix canonicalization before touching federation.**

---

## **Common Pitfalls**

### **1. JavaScript Object Key Ordering**

JavaScript objects don't guarantee key order in older engines. Always sort explicitly.

### **2. JSON.stringify() Whitespace**

`JSON.stringify(obj, null, 2)` produces different output than `JSON.stringify(obj, null, 0)`. Always use `null, 0`.

### **3. Array Mutation**

`array.sort()` mutates the array. Use `array.slice().sort()` to avoid side effects.

### **4. Deep Nesting**

Canonicalization must be recursive. Don't forget nested objects.

### **5. Floating Point Precision**

If state includes numbers, ensure consistent precision (e.g., `toFixed(6)`).

---

## **Verification Checklist**

Before claiming L4 conformance, verify:

- ✅ Round-trip test passes (export → import → hash match)
- ✅ Insertion order test passes (different order → same hash)
- ✅ No timestamps in exported state
- ✅ No filesystem paths in exported state
- ✅ No process IDs or node IDs in exported state
- ✅ All object keys sorted alphabetically
- ✅ All arrays sorted by stable ID
- ✅ No whitespace in canonical JSON
- ✅ UTF-8 encoding, LF line endings

---

## **Summary**

**Canonical state encoding is the foundation of L4 hash-based convergence.**

If all correctt:
- Federation is possible
- Tests are deterministic
- Evidence is reproducible

If incorrect:
- Hash mismatches everywhere
- Debugging tar pit
- Standards posture regression

**The goal is: round-trip determinism.**
