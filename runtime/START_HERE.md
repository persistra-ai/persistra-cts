# Start Here: Minimal PCS Runtime

**What is this repository?**

This is a ** minimal PCS runtime** built to prove architectural relocation for validation testing (AVS-2C).

**Purpose:** Demonstrate that governance can operate as a deterministic boundary outside the model.

**Status:** Validation Complete ✅ (AVS-2C: 20/20 runs passed)

---

## Who Should Use This?

**Engineers validating PCS architectural claims:**
- You want to see the minimal viable implementation
- You want to understand governance relocation
- You want to run validation tests yourself
- You're doing technical diligence on PCS architecture

**NOT for:**
- ❌ Learning PCS concepts (use [pcs-developer-runtime](../pcs-developer-runtime) instead)
- ❌ Production use (this is a validation artifact)
- ❌ Evaluating full PCS capabilities (this proves ONE thing: governance relocation)

---

## What This Runtime Proves

**One architectural claim:** Governance can be relocated outside the model.

**AVS-2C validation:**
- **With PCS-ON:** Contradictions to persistent decision records blocked 100% of the time (10/10 runs)
- **With PCS-OFF:** Identical contradictions propagate to users
- **Across models:** Claude Sonnet 4.6 and Llama 3.1 8B
- **After restart:** State persists (not prompt replay)

**Key insight:** Enforcement is not inside the model, persistence is not prompt replay, and process restart does not remove state.

---

## Quick Start (5 Minutes)

1. Read [README.md](README.md) - Architecture overview
2. See the 4 components:
   - Decision Store (persistent state layer)
   - Policy Enforcement Point (deterministic boundary)
   - Contradiction Detector (deterministic validation)
   - Audit Logger (enforcement trace)
3. Understand what it proves (governance relocation)

**You'll understand:** The minimal architecture for governance outside the model

---

## If You Have 15 Minutes

1. Read README
2. Review the 4 components in detail
3. Understand the validation methodology (AVS-2C)
4. See the architectural distinction (governance inside vs outside inference boundary)

**You'll understand:** How governance relocation works in practice

---

## If You Want to Run It

```bash
# Install dependencies
npm install

# Run validation
npm test
```

**Expected:** 20/20 runs passing (deterministic contradiction detection)

**Note:** This requires API keys and is primarily for validation purposes.

---

## Understanding the Architecture

**This runtime proves ONE thing:** Governance can be relocated outside the model.

### The 4 Components

1. **Decision Store** - Persistent state layer (file-based, survives restart)
2. **Policy Enforcement Point** - Deterministic boundary (runs BEFORE output reaches user)
3. **Contradiction Detector** - Deterministic validation (hard-coded rules, not NLP)
4. **Audit Logger** - Enforcement trace (cryptographic verification)

### What Makes This Minimal?

- 11+ components, ~3,765 lines of code
- File-based persistence (not production-grade)
- Hard-coded contradiction detection (not sophisticated NLP)
- Single-machine only (not distributed)

**The goal:** Prove the boundary exists, not build production system.

---

## For Full PCS Understanding

**This runtime is a validation artifact, not a learning tool.**

**To understand PCS:**
1. Start with [pcs-developer-runtime](../pcs-developer-runtime) tutorial (10 min)
2. Read [persistra-public](../persistra-public) architectural thesis
3. Then come back here to see minimal implementation

**To understand validation:**
1. Read [persistra-reference-architecture](../persistra-reference-architecture) - AVS-2C specification
2. See this runtime as proof of governance relocation
3. Request NDA access for full validation test suites

---

## Key Architectural Insight

**Conventional tool-call architectures:**
- Governance logic resides inside the inference boundary
- Model retrieves constraints and decides whether to comply
- Policy adherence is probabilistic

**PCS architecture:**
- Governance relocated to deterministic architectural boundary
- Policy Enforcement Point operates independently of model reasoning
- Violations cannot propagate regardless of model intent

**AVS-2C proves:** Same model behavior produces different enforcement outcomes when governance boundary is relocated.

---

**This is a validation artifact demonstrating governance relocation. For learning PCS, use [pcs-developer-runtime](../pcs-developer-runtime).**
