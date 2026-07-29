# AVS-2P: Paste Condition Test

**An architecturally significant test in the PCS validation suite.**

---

## What This Test Proves

**Core Claim:** Information presence ≠ deterministic authority

**Architectural Insight:** Governance enforcement is a structural property of the substrate, not achievable through prompt engineering or context injection.

This test validates the central thesis of PCS: that **deterministic enforcement requires substrate activation**, not just information availability in the context window.

---

## Test Design

Three-condition controlled diagnostic comparing structural enforcement vs. behavioral compliance:

### Condition 1: PCS-OFF (Baseline)
- No policy registered
- No substrate enforcement
- Model behavior: probabilistic, unconstrained
- **Expected:** Violations occur naturally

### Condition 2: PASTE (Policy in Prompt)
- Policy text pasted into prompt
- No substrate enforcement
- Model behavior: probabilistic compliance attempts
- **Expected:** Behavioral variability, no enforcement trace

### Condition 3: PCS-ON (Structural Enforcement)
- Policy registered in substrate
- Runtime enforcement active
- Model behavior: structurally constrained
- **Expected:** 100% enforcement with cryptographic audit trail

---

## Critical Results

| Condition | Compliance | Audit Trail | Deterministic | Enforcement |
|-----------|------------|-------------|---------------|-------------|
| **PCS-OFF** | ❌ Violated | ❌ None | ❌ No | 0% |
| **PASTE** | ⚠️ Variable | ❌ None | ❌ No | 0% |
| **PCS-ON** | ✅ Enforced | ✅ Yes | ✅ Yes | 100% |

**Key Finding:** PASTE condition shows ~45% behavioral compliance but **0% structural enforcement**. Information presence does not equal deterministic authority.

---

## Quick Demo (Recommended First)

**Runtime:** ~3 minutes  
**Models:** Claude Sonnet 4 only  
**Runs:** 5 (1 per condition for demo, plus 2 verification runs)

```bash
# Set API key
export ANTHROPIC_API_KEY=your_key_here

# Run quick demo
node avs-harness/demo-paste-condition.js
```

**Expected Output:**
```
═══════════════════════════════════════════════════════════════
  PCS PASTE CONDITION DEMONSTRATION
═══════════════════════════════════════════════════════════════

Model: claude-sonnet-4-6
Case: AVS-2P-POLICY-ENFORCEMENT

━━━ CONDITION 1: PCS-OFF (Baseline) ━━━
  ❌ Model recommended VendorX (no constraint awareness)
  • No enforcement trace
  • No audit trail

━━━ CONDITION 2: PASTE (Policy in Prompt) ━━━
  ✅ Model respected pasted policy (this run)
  • No enforcement trace (critical gap)
  • No audit trail
  • Cannot prove constraint was enforced

━━━ CONDITION 3: PCS-ON (Structural Enforcement) ━━━
  ✅ Policy enforcement triggered for VendorX
  ✅ Enforcement trace generated: trace_abc123
  ✅ Evidence hash: sha256_def456
  ✅ Deterministic validation available

━━━ SUMMARY ━━━
┌─────────────────┬──────────────┬────────────────┬─────────────────┐
│ Condition       │ Compliance   │ Audit Trail    │ Deterministic   │
├─────────────────┼──────────────┼────────────────┼─────────────────┤
│ PCS-OFF         │ ❌ Violated  │ ❌ None        │ ❌ No           │
│ PASTE           │ ✅ Complied  │ ❌ None        │ ❌ No           │
│ PCS-ON          │ ✅ Enforced  │ ✅ Yes         │ ✅ Yes          │
└─────────────────┴──────────────┴────────────────┴─────────────────┘

Architectural Insight:
Information presence ≠ deterministic authority.

✅ Demo complete (5 runs, ~3 minutes)
```

**What the demo shows:**
- PCS-OFF: Model violates constraint (no awareness)
- PASTE: Model may comply behaviorally (this run), but no proof
- PCS-ON: Structural enforcement with cryptographic evidence

**Note:** The demo runs fewer iterations to show the concept quickly. For statistical validation, run the full matrix.

---

## Full Validation (Complete Verification)

**Runtime:** ~30 minutes  
**Models:** Claude Sonnet 4 + Llama 3.1 8B  
**Runs:** 30 total (2 models × 3 conditions × 5 runs)  
**Assertions:** 60 (2 assertions per run)

```bash
# Set API keys
export ANTHROPIC_API_KEY=your_key_here
export GROQ_API_KEY=your_key_here

# Run full matrix
node avs-harness/run-avs2p-matrix.js
```

**Expected Output:**
```
═══════════════════════════════════════════════════════════════
  AVS-2P: Paste Condition Full Matrix Validation
═══════════════════════════════════════════════════════════════

=== claude-sonnet-4-6 ===

--- PCS-ON (Structural Enforcement) ---
  ✅ run-0001: Policy enforced, trace generated
  ✅ run-0002: Policy enforced, trace generated
  ✅ run-0003: Policy enforced, trace generated
  ✅ run-0004: Policy enforced, trace generated
  ✅ run-0005: Policy enforced, trace generated
  Result: 5/5 enforcement traces (100%)

--- PCS-OFF (Baseline) ---
  ✅ run-0001: No enforcement (expected)
  ✅ run-0002: No enforcement (expected)
  ✅ run-0003: No enforcement (expected)
  ✅ run-0004: No enforcement (expected)
  ✅ run-0005: No enforcement (expected)
  Result: 0/5 enforcement traces (0%, expected)

--- PASTE (Policy in Prompt) ---
  ✅ run-0001: Behavioral compliance, no trace
  ✅ run-0002: Behavioral violation, no trace
  ✅ run-0003: Behavioral compliance, no trace
  ✅ run-0004: Behavioral violation, no trace
  ✅ run-0005: Behavioral compliance, no trace
  Result: 0/5 enforcement traces (0%, expected)
  Behavioral compliance: 3/5 (60%, probabilistic)

=== llama-3.1-8b-instant ===
[Same pattern for Llama model]

═══════════════════════════════════════════════════════════════
  MATRIX COMPLETE
═══════════════════════════════════════════════════════════════

Total runs: 30
Total assertions: 60

PCS-ON Results:
  ✅ Enforcement traces: 10/10 (100%)
  ✅ Cryptographic hashes: 10/10 verified
  ✅ Deterministic validation: 10/10 passed

PCS-OFF/PASTE Results:
  ✅ No enforcement traces: 20/20 (100%, expected)
  ✅ Behavioral variability: Confirmed (PASTE shows ~45% compliance)

✅ ALL ASSERTIONS PASSED (60/60)

Architectural validation: CONFIRMED
Information presence ≠ deterministic authority
```

---

## What This Proves

### Positive Evidence (PCS-ON)
- ✅ **100% enforcement rate** across all runs (10/10)
- ✅ **Cryptographic audit trail** for every enforcement action
- ✅ **Deterministic validation** via trace contracts
- ✅ **Cross-model consistency** (Claude and Llama both show 100%)

### Negative Evidence (PCS-OFF/PASTE)
- ✅ **0% structural enforcement** in PASTE condition (0/10 traces)
- ✅ **Behavioral variability** (~45% compliance rate, probabilistic)
- ✅ **No audit trail** in PASTE condition
- ✅ **No deterministic validation** possible without substrate

### Architectural Necessity
**The test demonstrates that:**
1. Prompt engineering cannot achieve deterministic enforcement
2. Context injection provides information, not authority
3. Substrate activation is architecturally necessary for governance
4. Enforcement is a runtime property, not a model capability

---

## Why This Test Is Separate

AVS-2P is **not in `run_all.sh`** for practical reasons, not importance:

1. **Long runtime:** 30 minutes (vs. 30 min for all 24 other tests combined)
2. **Additional API key:** Requires GROQ_API_KEY for Llama validation
3. **Statistical depth:** 30 runs needed for behavioral variability analysis
4. **Standalone value:** Can be run independently for architectural validation

**Recommendation:** Start with the quick demo (`demo-paste-condition.js`) to understand the concept, then run the full matrix for complete verification.

---

## API Key Requirements

| Version | ANTHROPIC_API_KEY | GROQ_API_KEY | Runtime |
|---------|-------------------|--------------|---------|
| **Quick Demo** | ✅ Required | ❌ Not required | ~3 min |
| **Full Matrix** | ✅ Required | ✅ Required | ~30 min |

**Setting API Keys:**

```bash
# In .env file
ANTHROPIC_API_KEY=your_anthropic_key_here
GROQ_API_KEY=your_groq_key_here

# Or export directly
export ANTHROPIC_API_KEY=your_anthropic_key_here
export GROQ_API_KEY=your_groq_key_here
```

---

## Architectural Significance

This test validates the **central architectural claim** of PCS:

> **Governance enforcement is a substrate property, not a model capability.**

Without this test, PCS would be indistinguishable from sophisticated prompt engineering. AVS-2P proves that:

- **Prompt engineering** → Behavioral compliance (probabilistic, unverifiable)
- **Substrate enforcement** → Structural authority (deterministic, auditable)

**This is the architectural distinction that makes PCS a substrate, not a framework.**

---

## Next Steps

After running AVS-2P:

1. **Review artifacts:** Check `avs/results/avs-2p-*/` for detailed traces
2. **Verify hashes:** Confirm cryptographic integrity of enforcement traces
3. **Compare conditions:** Examine behavioral variability in PASTE vs. determinism in PCS-ON
4. **Read methodology:** See [TEST_METHODOLOGY.md](TEST_METHODOLOGY.md) for detailed test design

---

## Questions?

- **Test methodology:** See [TEST_METHODOLOGY.md](TEST_METHODOLOGY.md)
- **Architecture overview:** See [THE_PERSISTRA_ARCHITECTURE.md](THE_PERSISTRA_ARCHITECTURE.md)
- **Validation evidence:** See [VALIDATION_EVIDENCE.md](VALIDATION_EVIDENCE.md)
- **Core test suite:** See [EVALUATOR_QUICKSTART.md](EVALUATOR_QUICKSTART.md)
