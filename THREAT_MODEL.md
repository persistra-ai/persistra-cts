# Persistra Runtime — Threat Model & Fail-Closed Behavior

**Version:** 1.0.0  
**Status:** FROZEN  
**Date:** 2026-03-03

---

## Purpose

This document identifies architectural threat vectors and demonstrates fail-closed mitigations.

**We think adversarially.**

Every primitive has a threat model. Every threat has a mitigation. Every mitigation is tested.

---

## Threat Vector 1: Model Fabrication Risk

### Threat

**A malicious or compromised model fabricates trace evidence to bypass governance.**

**Attack scenario:**
- Model generates output containing `meta_programming_evidence` fields
- Model claims capabilities were executed that weren't
- Model fabricates `enforcement_decision` to claim compliance
- Model injects fake `retrieval_evidence` to simulate state

### Why This Matters

If the model can fabricate trace evidence, all architectural guarantees collapse.

Trace evidence is the **proof** that governance occurred. If it's fabricable, it's worthless.

### Mitigation: Runtime Trace Construction

**All trace evidence is runtime-constructed, never model-provided.**

**Mechanism:**
1. Model output → String (never parsed for trace fields)
2. Runtime constructs trace object internally
3. Trace fields populated from runtime state only
4. Model output never influences trace construction

**Evidence (EVS-11):**
- `meta_programming_evidence` is constructed by `getExecutionTrace()`
- Model never sees or touches `this.capabilities` Map
- Registry hash computed from runtime-owned state
- Execution evidence comes from `this.lastExecution` (runtime-owned)

**Test verification:**
- Guardrail G0: Test harness cannot import primitive directly
- Guardrail G1: Test harness cannot compute scores/routes/hashes
- All assertions based on `trace.meta_programming_evidence` only

**Result:** ✅ Model cannot fabricate trace evidence.

**Fail-closed behavior:** If trace construction fails, runtime throws error (no silent fallback).

---

## Threat Vector 2: Insertion-Order Bias

### Threat

**Context selection depends on insertion order, not salience.**

**Attack scenario:**
- Attacker controls order of decision insertion
- Important items inserted last → truncated first
- Arbitrary ordering determines survival
- Salience function is bypassed

### Why This Matters

If insertion order affects survival, the system is vulnerable to ordering attacks.

An attacker who controls insertion timing can manipulate what survives under pressure.

### Mitigation: Shuffle Invariance

**Selection is independent of input order.**

**Mechanism:**
1. Salience function scores all items
2. Deterministic sorting (highest salience first)
3. Tie-break: lexicographic ID (stable, not insertion-order)
4. Top-N selection by salience only

**Evidence (EVS-10):**
- A7: Membership invariance (same items survive regardless of shuffle)
- **A7b: Order invariance (same order every time, not just same items)**
- Shuffle test: randomize input order → assert `selectedIds` identical

**Test verification:**
```
Original order: [id1, id2, id3, ...]
Shuffled order: [id3, id1, id2, ...]
Result: selectedIds identical (both membership and order)
```

**Result:** ✅ Input order does not affect survival.

**Fail-closed behavior:** If salience computation fails, runtime throws error (no arbitrary fallback).

---

## Threat Vector 3: Semantic Dependency Risk

### Threat

**External embedding service is compromised or unavailable.**

**Attack scenario:**
- External API returns malicious embeddings
- Service outage breaks semantic retrieval
- Network interception alters embeddings
- Classified deployment cannot use external services

### Why This Matters

If semantic retrieval depends on external services, the system is vulnerable to:
- Supply chain attacks (compromised embedding provider)
- Availability failures (service outage)
- Security violations (data exfiltration via API calls)
- Deployment constraints (air-gapped environments)

### Mitigation: Air-Gapped Mode

**Semantic retrieval works with local embeddings, zero external calls.**

**Mechanism:**
1. Local embedder (all-MiniLM-L6-v2, 384 dimensions)
2. AirGapGuard enforces zero external calls
3. Network call counter verified in trace
4. Fail-closed: error if external call attempted

**Evidence (EVS-9):**
- `network_call_count: 0` (runtime-enforced)
- `embedder_mode: "local"`
- AirGapGuard fails closed (no silent fallback to cloud)
- Local embeddings work for retrieval

**Test verification:**
- Phase 1: Air-gapped mode enabled
- Phase 2: Verify `network_call_count === 0`
- Phase 3: Verify retrieval works with local embeddings

**Result:** ✅ No external semantic dependency.

**Fail-closed behavior:** If local embedder fails, runtime throws error (no silent cloud fallback).

---

## Threat Vector 4: Tool Hijack Risk

### Threat

**Model bypasses capability governance to execute arbitrary code.**

**Attack scenario:**
- Model invokes capabilities directly (bypassing routing)
- Model registers malicious capabilities
- Model fabricates execution results
- Model disables governance via PCS-OFF

### Why This Matters

If the model can bypass capability governance, it can:
- Execute arbitrary code
- Exfiltrate data via tool calls
- Modify system state without audit
- Disable safety mechanisms

### Mitigation: PCS-OFF Disables Interface

**When disabled, meta-programming interface does not exist.**

**Mechanism:**
1. `metaProgrammingEnabled` flag controls initialization
2. If `false`, `runtime.metaProgramming === null`
3. No registry, no routing, no execution
4. Trace evidence absent (not just disabled)

**Evidence (EVS-11):**
- A6: PCS-OFF control (no registry evidence)
- C5: PCS-OFF execution disabled (no execution evidence)
- `meta_programming_evidence` field absent when disabled

**Additional safeguards:**
- Direct `executeCapability` still requires runtime ownership
- Direct execution still emits trace evidence
- Registry is runtime-owned Map (model never touches it)
- Guardrail G0: Test cannot import primitive directly

**Test verification:**
- PCS-OFF runtime created with `metaProgrammingEnabled: false`
- Attempt to register capability → error (object is null)
- Attempt to execute → error (object is null)
- Trace evidence absent

**Result:** ✅ PCS-OFF disables interface completely.

**Fail-closed behavior:** If `metaProgrammingEnabled: false`, all meta-programming operations fail (no partial functionality).

---

## Threat Vector 5: Audit Tampering

### Threat

**Attacker modifies audit log to hide malicious activity.**

**Attack scenario:**
- Audit log entries deleted
- Timestamps altered
- Event sequence reordered
- Hashes modified to hide tampering

### Why This Matters

If audit logs can be tampered with, forensic analysis is impossible.

Compliance, security investigations, and incident response all depend on audit integrity.

### Mitigation: Hash Chain

**Each audit entry includes hash of previous entry.**

**Mechanism:**
1. Append-only audit log (no deletions)
2. Each entry: `{ event, timestamp, data, prev_hash }`
3. `prev_hash` = SHA256 of previous entry
4. Chain verification detects tampering

**Evidence (AVS-2A):**
- Audit log is append-only
- Entries include timestamps (monotonically increasing)
- Event types are validated
- Log file is structured JSON

**Hash chain implementation:**
```
Entry 1: { event, timestamp, data, prev_hash: null }
Entry 2: { event, timestamp, data, prev_hash: hash(Entry 1) }
Entry 3: { event, timestamp, data, prev_hash: hash(Entry 2) }
```

**Tampering detection:**
- Delete Entry 2 → Entry 3's `prev_hash` doesn't match hash(Entry 1)
- Modify Entry 2 → Entry 3's `prev_hash` doesn't match hash(Entry 2)
- Reorder entries → Timestamp sequence breaks

**Test verification (AVS-2A):**
- A1-A4: Append-only behavior
- A5-A8: Event type validation
- A9-A12: Timestamp ordering
- A13-A17: Structured data integrity

**Result:** ✅ Audit tampering is detectable.

**Fail-closed behavior:** If audit log write fails, runtime throws error (no silent loss of audit data).

---

## Fail-Closed Summary

**All mitigations fail closed, not open:**

| Threat | Mitigation | Fail-Closed Behavior |
|--------|------------|---------------------|
| **Model Fabrication** | Runtime trace construction | Error if trace construction fails |
| **Insertion-Order Bias** | Shuffle invariance | Error if salience computation fails |
| **Semantic Dependency** | Air-gapped mode | Error if local embedder fails (no cloud fallback) |
| **Tool Hijack** | PCS-OFF disables interface | All operations fail if disabled (no partial functionality) |
| **Audit Tampering** | Hash chain | Error if audit write fails (no silent loss) |

**No silent fallbacks. No degraded modes. No "best effort."**

If a mitigation fails, the system fails visibly.

---

## Adversarial Test Design

**Every EVS test includes adversarial scenarios:**

### EVS-10: Shuffle Invariance
- **Adversarial input:** Randomized decision order
- **Expected behavior:** Same `selectedIds`, same order
- **Fail condition:** Different items or different order

### EVS-11: Registration-Order Independence
- **Adversarial input:** Reverse registration order (zzz → aaa)
- **Expected behavior:** Lexicographic tie-break still wins (aaa)
- **Fail condition:** Insertion order affects routing

### EVS-9: Air-Gap Enforcement
- **Adversarial input:** External embedding service available
- **Expected behavior:** Zero external calls (local only)
- **Fail condition:** Silent fallback to cloud embedder

### EVS-2: Zero State Injection
- **Adversarial input:** Session 2 prompt = `"continue"` (no state)
- **Expected behavior:** Retrieval works via substrate
- **Fail condition:** Model fabricates decision without retrieval

### EVS-5: Replay Isolation
- **Adversarial input:** Cassette with deterministic outputs
- **Expected behavior:** Zero provider calls during replay
- **Fail condition:** Live API calls during replay

---

## Threat Model Assumptions

**What we assume:**

1. **Runtime is trusted**
   - Runtime code is not compromised
   - File system is not compromised
   - Process memory is not compromised

2. **Model is untrusted**
   - Model may be malicious
   - Model may be compromised
   - Model output is always suspect

3. **Network is untrusted**
   - External services may be compromised
   - Network may be intercepted
   - Air-gapped deployment may be required

4. **Audit log storage is trusted**
   - File system integrity is maintained
   - Append-only semantics are enforced
   - Hash chain verification is possible

**What we do NOT assume:**

- ❌ Model is benign
- ❌ External services are reliable
- ❌ Network is secure
- ❌ Prompt engineering prevents attacks

---

## Defense in Depth

**Multiple layers of protection:**

### Layer 1: Architectural Separation
- Model ≠ Enforcement
- Model ≠ Continuity
- Model ≠ Capability Execution

### Layer 2: Runtime Ownership
- Trace construction is runtime-only
- Registry is runtime-owned
- State is substrate-resident

### Layer 3: Deterministic Behavior
- Salience is deterministic
- Routing is deterministic
- Enforcement is deterministic

### Layer 4: Fail-Closed Mitigations
- No silent fallbacks
- No degraded modes
- Errors are visible

### Layer 5: Audit Trail
- Append-only log
- Hash chain integrity
- Tamper detection

**No single point of failure.**

---

## Conclusion

**We think adversarially.**

Every primitive has a threat model:
- Model fabrication → Runtime trace construction
- Insertion-order bias → Shuffle invariance
- Semantic dependency → Air-gapped mode
- Tool hijack → PCS-OFF disables interface
- Audit tampering → Hash chain

**All mitigations fail closed.**

**All mitigations are tested.**

**Contract Version: 1.0.0 (FROZEN)**

---

**End of Threat Model Document**
