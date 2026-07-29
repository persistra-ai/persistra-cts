# Evidence Hash Specification v1

## Overview

PCS-CTS uses **two distinct hashes** for different purposes:

1. **`bundle_hash`** - Archive integrity hash
2. **`evidence_hash`** - Conformance repeatability hash

This separation is critical: `bundle_hash` captures literal artifacts (including timestamps, random IDs), while `evidence_hash` captures only stable conformance claims.

---

## 1. Bundle Hash (`bundle_hash`)

**Purpose:** Archive integrity and provenance tracking.

**Input:** Literal evidence bundle files as produced (conformance.json, trace.json, attestation.txt).

**Behavior:** Will change if any field changes, including timestamps, nonces, session IDs.

**Use cases:**
- "Did the archive change?"
- "Is this the exact bundle from run X?"
- Tamper detection
- Provenance chains

**Computation:**
```javascript
bundle_hash = SHA256(conformance.json + trace.json + attestation.txt)
```

---

## 2. Evidence Hash (`evidence_hash`)

**Purpose:** Conformance repeatability verification.

**Input:** Normalized conformance record (see below).

**Behavior:** MUST be stable across runs for the same scenario/inputs/implementation version.

**Use cases:**
- "Did conformance evidence change?"
- "Are these two runs equivalent from a conformance perspective?"
- Regression detection
- Conformance stability verification

**Computation:**
```javascript
normalized = normalizeEvidenceForHash(bundle)
evidence_hash = SHA256(canonical_json(normalized))
```

---

## Normalized Conformance Record

The normalized conformance record is a **stable, deterministic representation** of conformance claims.

### Included Fields (Normative)

**MUST include:**
- `pcs_spec_version` - PCS RFC version
- `pcs_cts_version` - CTS version
- `evidence_schema_version` - Evidence schema version (e.g., "evidence-v1")
- `conformance_level` - Level being tested (e.g., "L3")
- `scenario_id` - Scenario identifier (e.g., "L3.continuity.model-transition-decision-recovery")
- `scenario_version` - Scenario version/hash
- `implementation_id` - Implementation identifier (kernel commit/tag)
- `implementation_fingerprint` - Implementation source hash
- `adapter_info` - Model adapter information (if applicable)
- `passed` - Binary pass/fail
- `scenario_results` - Array of scenario results with:
  - `id` - Scenario ID
  - `passed` - Binary pass/fail
  - `categorical_reason` - Categorical reason code (if failed)

**MAY include:**
- Stable categorical claims (e.g., "invariants.decisionStatePreserved: true")
- Stable IDs that are normative (e.g., policy IDs if they're part of the contract)

### Excluded Fields (Non-Normative)

**MUST exclude or redact:**
- `timestamp` → Remove or set to `"__redacted__"`
- `timestamp_start` → Remove or set to `"__redacted__"`
- `timestamp_end` → Remove or set to `"__redacted__"`
- `sessionId` → Remove or set to `"__session__"`
- Random nonces → Remove (nonces are not conformance)
- Random decision IDs → Remove or replace with deterministic content-based ID
- Random policy IDs → Remove or replace with deterministic content-based ID
- Absolute paths → Should already be excluded (hygiene requirement)
- Hostnames → Should already be excluded (hygiene requirement)
- Runtime-specific details → Remove (e.g., exact execution time)

### Canonical JSON Serialization

After normalization, the object MUST be serialized using canonical JSON:

1. **Sort all keys lexicographically** (recursive, deep sort)
2. **No whitespace** (compact JSON)
3. **Consistent encoding** (UTF-8)
4. **Deterministic array ordering** (if arrays contain objects, sort by a stable key)

**Example:**
```javascript
function canonicalJSON(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJSON).join(',') + ']';
  }
  
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(k => `"${k}":${canonicalJSON(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}
```

---

## Example Normalized Record

**Raw conformance.json:**
```json
{
  "pcs_spec_version": "v0.1-draft",
  "pcs_cts_version": "0.1.0",
  "implementation_id": "persistra-kernel",
  "levels_evaluated": ["L3"],
  "scenarios": [
    {
      "id": "L3.continuity.model-transition-decision-recovery",
      "passed": true
    }
  ],
  "passed": true,
  "timestamp": "2026-02-13T22:24:42.413Z",
  "runtime": {
    "node": "v22.14.0",
    "platform": "darwin",
    "arch": "arm64"
  }
}
```

**Normalized for evidence_hash:**
```json
{
  "adapter_info": null,
  "conformance_level": "L3",
  "evidence_schema_version": "evidence-v1",
  "implementation_fingerprint": "e8b9270a1b2c3d4e...",
  "implementation_id": "persistra-kernel@e8b9270",
  "passed": true,
  "pcs_cts_version": "0.1.0",
  "pcs_spec_version": "v0.1-draft",
  "scenario_results": [
    {
      "id": "L3.continuity.model-transition-decision-recovery",
      "passed": true
    }
  ],
  "scenario_version": "a1b2c3d4..."
}
```

**Note:** Timestamp removed, runtime details removed, keys sorted lexicographically.

---

## Implementation Requirements

### CTS Runner MUST:

1. Compute **both** `bundle_hash` and `evidence_hash` for every run
2. Include both hashes in attestation.txt
3. Use `evidence_hash` for stability verification
4. Use `bundle_hash` for archive integrity

### Evidence Bundle MUST:

1. Include raw artifacts (with timestamps, nonces, etc.) for debugging
2. Include normalized record for conformance verification
3. Document which fields are normative vs. non-normative

### Stability Tests MUST:

1. Verify `evidence_hash` is identical across runs (for same scenario/implementation)
2. Allow `bundle_hash` to vary (timestamps will differ)
3. Report both hashes in stability reports

---

## Versioning

**Current version:** `evidence-v1`

**Version increments when:**
- Normalization rules change
- Included/excluded fields change
- Canonical JSON serialization changes

**Backward compatibility:**
- Old evidence bundles can be re-normalized using new rules
- `evidence_schema_version` field tracks which normalization was used

---

## Rationale

**Why two hashes?**
- Archive integrity and conformance repeatability are different concerns
- Conflating them creates false instability or forces removal of useful debugging data

**Why normalize rather than remove?**
- Keeps raw data for debugging
- Allows post-hoc analysis
- Doesn't contort runtime behavior
- Cleaner separation of concerns

**Why exclude timestamps?**
- Timestamps are not conformance claims
- They vary by definition
- Including them makes `evidence_hash` unstable

**Why exclude random IDs?**
- Random IDs are implementation details, not conformance
- They vary across runs even with identical behavior
- Deterministic content-based IDs can be included if normative

---

## Future Work

- Define categorical reason codes for failures
- Define stable ID derivation for decisions/policies
- Define adapter info schema
- Define scenario versioning scheme
