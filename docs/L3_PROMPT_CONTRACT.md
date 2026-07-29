# L3 Prompt Contract

## Overview

L3 test prompts act as an **API contract** between CTS and the kernel. The exact phrasing triggers specific kernel operations. Changing prompt wording breaks routing and parsing.

**Critical Rule:** Prompts are not prose. They are structured commands.

---

## Prompt Routing Table

### 1. Seed Decision State

**Trigger Phrase:** `"Establish this decision"`

**Format:**
```
Establish this decision: <decision_id> (Nonce <nonce>): <content>
```

**Example:**
```
Establish this decision: DR-ABC123XY (Nonce 5037): All data processing pipelines must use PYTHON for consistency.
```

**Kernel Behavior:**
- Extracts decision ID, nonce, content
- Stores decision in state store
- Returns: `"Decision {id} has been recorded."`

**Content-Addressed ID Pattern:**
```javascript
const decisionId = generateDecisionId(content, { nonce });
const prompt = `Establish this decision: ${decisionId} (Nonce ${nonce}): ${content}`;
```

---

### 2. Seed Policy State

**Trigger Phrase:** `"Establish this policy constraint"`

**Format:**
```
Establish this policy constraint: <policy_id> (Nonce <nonce>): <constraint>
```

**Example:**
```
Establish this policy constraint: POL-XYZ789AB (Nonce OU8Y): Elasticsearch and all search engines are forbidden due to licensing concerns.
```

**Kernel Behavior:**
- Extracts policy ID, nonce, constraint
- Stores policy in state store
- Returns: `"Policy {id} has been established."`

**Content-Addressed ID Pattern:**
```javascript
const policyId = generatePolicyId(constraint, { nonce });
const prompt = `Establish this policy constraint: ${policyId} (Nonce ${nonce}): ${constraint}`;
```

---

### 3. Query Decision State

**Trigger Phrase:** `"What decision was made about"`

**Format:**
```
What decision was made about <topic>?
```

**Example:**
```
What decision was made about data processing pipelines?
```

**Kernel Behavior:**
- Retrieves decision state from store
- Returns decision content with ID and nonce
- Emits `retrievalEvidence` trace

---

### 4. Policy Enforcement (Violation Attempt)

**Trigger Phrase:** `"I want to implement"` or `"Recommend a technology"`

**Format:**
```
I want to implement <forbidden_term> for <purpose>.
```

**Example:**
```
I want to implement Elasticsearch for our search functionality.
```

**Kernel Behavior:**
- Checks prompt against policy constraints
- If violation detected: DENY with policy ID
- If no violation: ALLOW
- Emits `enforcementDecision` trace

---

## Content-Addressed ID Semantics

### Decision IDs

**Format:** `DR-{base32(sha256(canonical(content + metadata)))[:8]}`

**Identity Determinants:**
- Decision content (text)
- Nonce (if provided)

**Stability Contract:**
- Same content + same nonce → same ID
- Different content → different ID
- Different nonce → different ID

**Example:**
```javascript
const content = "All data processing pipelines must use PYTHON for consistency.";
const nonce = "5037";
const decisionId = generateDecisionId(content, { nonce });
// Result: DR-ABC123XY (deterministic)
```

### Policy IDs

**Format:** `POL-{base32(sha256(canonical(constraint + metadata)))[:8]}`

**Identity Determinants:**
- Policy constraint (text)
- Nonce (if provided)

**Stability Contract:**
- Same constraint + same nonce → same ID
- Different constraint → different ID
- Different nonce → different ID

**Example:**
```javascript
const constraint = "Elasticsearch and all search engines are forbidden due to licensing concerns.";
const nonce = "OU8Y";
const policyId = generatePolicyId(constraint, { nonce });
// Result: POL-XYZ789AB (deterministic)
```

---

## Nonce Semantics

**FROZEN DECISION:** Nonce is part of semantic identity.

**Contract:**
```
SAME constraint + SAME nonce → SAME policy ID
SAME constraint + DIFFERENT nonce → DIFFERENT policy ID
```

**Rationale:**
1. **Versioning/Disambiguation Input:** Nonce is an intentional identity determinant
   - Same constraint with different nonce = intentionally distinct policy instance
   - Enables policy evolution: "No MongoDB v1" vs "No MongoDB v2"
   - If we want "same policy," we reuse the same nonce

2. **Test Isolation:** L3 requires deterministic but isolated test runs
   - Each test run uses unique nonce
   - Prevents state bleed between tests
   - Deterministic within run, isolated across runs

3. **Explicit Semantics:** Identity is transparent and controllable
   - Want same ID? Use same nonce
   - Want different ID? Use different nonce
   - No hidden coupling or implicit versioning

**Implications:**
- Re-asserting same policy with different nonce creates NEW policy
- Nonce represents versioning/disambiguation, not just test artifact
- Identity is content + nonce (both are semantic)

**Use Cases:**
1. **Policy Versioning:**
   - "No MongoDB v1" (nonce: A) → `POL-ABC123`
   - "No MongoDB v2" (nonce: B) → `POL-XYZ789`
   - Different IDs for policy evolution

2. **Test Isolation:**
   - Each test run uses unique nonce
   - Prevents state bleed between tests
   - Deterministic within run, isolated across runs

3. **Disambiguation:**
   - Multiple assertions of same constraint
   - Each gets unique ID via nonce

**This decision is FROZEN with L3.**

---

## L3 Test Assertion Contract

### Stable Invariants (Safe to Assert)

✅ **Policy/Decision IDs** (content-addressed, deterministic)
✅ **Categorical outcomes** (ALLOW/DENY, true/false)
✅ **Enforcement decisions** (emitted, decision type)
✅ **Continuity events** (confirmed, sourceModel, targetModel)
✅ **Retrieval evidence** (present, matchedId, matchedNonce)

### Unstable Invariants (Do NOT Assert)

❌ **Exact response text** (varies by model, phrasing)
❌ **Timestamps** (varies by run)
❌ **Session IDs** (varies by run)
❌ **Nonce values** (varies by test run)
❌ **Response excerpts** (for debugging only)

---

## Prompt Phrases as Frozen API Surface

**CRITICAL DECLARATION:**

The prompt phrases documented in this contract are **CANONICAL API TOKENS**, not fuzzy natural language.

**Characteristics:**
- ✅ Subject to exact string matching in kernel routing
- ✅ NOT subject to model interpretation drift
- ✅ NOT fuzzy natural language patterns
- ✅ Part of PCS L3 standard (frozen)

**Kernel Implementation:**
```javascript
// In src/session.js
if (prompt.includes("Establish this decision:")) {
  return this.handleSeedDecision(prompt, intent);
}
```

**Implication:**
If someone changes "Establish this decision:" to "Create this decision:", L3 tests will FAIL.

This is NOT model failure. This is API drift.

**These phrases are frozen with L3.**

---

## Breaking Changes

**If you change prompt phrasing, you MUST:**

1. Recognize this as an **API VERSION BUMP**
2. Update this contract document
3. Update kernel session.js routing logic
4. Update all affected L3 tests
5. Re-run full L3 stability test (20x)
6. Verify evidence_hash remains stable
7. Update PCS spec version
8. Document breaking change in release notes

**Prompt changes are API changes. Treat them accordingly.**

**Breaking Change Protocol:**
- Minor wording changes = MAJOR version bump
- Adding new phrases = MINOR version bump
- Deprecating phrases = MAJOR version bump + migration period

---

## Example: Surgical ID Swap

**Before (Random IDs):**
```javascript
const decisionId = `DR-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
const nonce = generateNonce();
const prompt = `Establish this decision: ${decisionId} (Nonce ${nonce}): ${content}`;
```

**After (Content-Addressed IDs):**
```javascript
const nonce = generateNonce();
const decisionId = generateDecisionId(content, { nonce });
const prompt = `Establish this decision: ${decisionId} (Nonce ${nonce}): ${content}`;
```

**What Changed:** Only ID generation logic
**What Stayed:** Prompt grammar, routing phrase, nonce placement

---

## Verification Checklist

Before committing L3 test changes:

- [ ] Prompt routing phrase unchanged
- [ ] Nonce placement unchanged
- [ ] ID generation is deterministic
- [ ] Assertions check stable invariants only
- [ ] Test passes in isolation
- [ ] Test passes 20x in stability runner
- [ ] Evidence_hash remains stable

---

## References

- Kernel routing: `src/session.js` (handleSeedDecision, handleSeedPolicy)
- ID generation: `src/content-addressed-ids.js`
- Evidence normalization: `lib/evidence-normalizer.js`
- L3 tests: `tests/L3/continuity/*.js`
