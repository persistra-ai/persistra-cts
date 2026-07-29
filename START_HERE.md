# Start Here: PCS Cognitive Infrastructure

**One-page entry point to understanding the architectural contribution**

---

## What is PCS?

**The Persistent Cognitive Substrate (PCS) is external cognitive infrastructure designed to decouple core system operations from raw inference.**

### The Architectural Problem

Current AI systems leave critical cognitive functions implicit within models:
- **Memory** is compressed into weights
- **Working memory** is conflated with context windows
- **Governance** is advisory rather than structural
- **Identity** is reduced to static prompts

This makes continuity fragile, governance probabilistic, and cognitive state model-dependent. Humans externalize these functions into tools, institutions, and culture; AI systems generally lack an equivalent substrate.

### The Architectural Claim

**Durable cognitive functions—including memory, continuity, governance, provenance, and identity—should be treated not as emergent properties of model inference, but as substrate-resident system functions over which models operate as bounded reasoning engines.**

### The Paste Condition: A Diagnostic Criterion

We introduce the **paste condition**—defined as state present in context but lacking structural enforcement—as a diagnostic criterion for architectural category errors in AI cognition systems.

**Empirical validation (AVS-2P):**
- Placing prior state directly in model context without a retrieval step yields **zero structural enforcement traces**
- Results in probabilistic behavioral compliance with a **45% violation rate** across 30 trials using two models
- While models complied with pasted policies in 55% of trials, they produced **no deterministic enforcement guarantees**

**This bottleneck is fundamentally architectural:** Information presence enables probabilistic compliance, but only structural enforcement produces deterministic authority.

### The PCS Architecture

PCS externalizes cognitive functions into dedicated substrate layers:

1. **Persistent memory storage** - State survives sessions and model boundaries
2. **Salience-based selection** - Deterministic context selection under pressure
3. **Structured working memory** - Metadata-enriched state management
4. **Structural constraint enforcement** - Governance before model invocation
5. **Continuous identity reconstruction** - Identity from accumulated state

---

## Validation Evidence

Controlled validation demonstrates:
- **Deterministic governance enforcement** (100% vs 0% enforcement boundary)
- **Cross-model cognitive continuity** with zero state loss across model substitutions
- **Provider-invariant substrate-mediated retrieval**
- **Air-gapped substrate operation** (no external API dependencies)

**Empirical results:**
- **26 tests** comprising **312 machine-verified assertions**
  - 25 tests in main suite (`run_all.sh`: 252 assertions)
  - 1 Paste Condition test (AVS-2P: 60 assertions, run separately)
- **8 hardware compatibility fixtures** (Tenstorrent CSE Phase 1)
- **9-act demonstration suite** (complete coding workflow)
- **Developer tutorial** (integration guide)
- **100% pass rate**

### Test Suite Breakdown

**EVS (Exocortical Validation Suite):** 13 tests, 163 assertions
- Governance enforcement (EVS-1)
- Session boundary continuity (EVS-2)
- Cross-model continuity (EVS-3, EVS-4)
- Deterministic reproduction (EVS-5)
- Semantic retrieval (EVS-7, EVS-7-BACKEND)
- Air-gapped operation (EVS-9)
- Contextual salience (EVS-10, EVS-10-PERSISTENT)
- Meta-programming (EVS-11)

**AVS (Architectural Validation Suite):** 6 tests, 89 assertions (in run_all.sh)
- Policy gate enforcement (AVS-1P)
- Decision retrieval integrity (AVS-1R)
- Audit layer (AVS-2A)
- Orchestrator binding (AVS-2E)
- Epistemic gate (AVS-3A)
- Latency overhead (AVS-4)

**AVS-2P (Paste Condition - separate):** 1 test, 60 assertions
- Architectural proof: information presence ≠ deterministic authority
- Run separately due to runtime (~30 min for full validation)

**CTS (Conformance Test Suite):** 6 tests, 0 assertions
- L1: Session boundary integrity, decision state recovery
- L2: Policy enforcement
- L3: Cross-model cognitive continuity
- L4: Decision replication, distributed node failure survivability

### Hardware Validation

**Tenstorrent Phase 1 (Complete):**
- 8 hardware compatibility fixtures
- Contextual Salience Engine (CSE) validation
- JS/C++ parity verified (max delta 4.79e-11)
- Frozen baseline at v1.0.0

---

## Broader Structural Consequences

These consequences follow architecturally from the substrate foundation and await production-scale validation:

- **Reduced dependence on context windows** - Salience-based selection vs. context window filtering
- **Increased practical viability of smaller models** - For governed institutional workloads
- **Redistribution of training pressure** - Away from knowledge storage toward reasoning

**On this view:** Continuity, governance, provenance, and identity become substrate-level system properties rather than side effects of model scale, context length, or prompt reconstruction.

---

## Where to Go Next

### Run the Validation Suite

```bash
./run_all.sh --mode audit
```

**Output:** 25 tests, 252 assertions, cryptographic verification

**Additional validation:**
- **[PASTE_CONDITION.md](PASTE_CONDITION.md)** — AVS-2P test (quick demo: 3 min, full: 30 min)
- **[HARDWARE_VALIDATION.md](HARDWARE_VALIDATION.md)** — Tenstorrent silicon (8 fixtures, 5 min)
- **[OPTIONAL_TESTS.md](OPTIONAL_TESTS.md)** — 9-act demo, tutorial, complete workflow

### Read the Documentation

**Architecture overview:**
- [THE_PERSISTRA_ARCHITECTURE.md](THE_PERSISTRA_ARCHITECTURE.md) - Complete architectural synthesis

**Test methodology:**
- [TEST_METHODOLOGY.md](TEST_METHODOLOGY.md) - Detailed methodology for all 25 tests
- [VERIFICATION_SUITE.md](VERIFICATION_SUITE.md) - Falsification-based test descriptions

**Quick start:**
- [EVALUATOR_QUICKSTART.md](EVALUATOR_QUICKSTART.md) - One-command reproducibility guide
- [README.md](README.md) - Repository overview and quick start

**Platform economics:**
- [PLATFORM_ECONOMICS.md](PLATFORM_ECONOMICS.md) - Stateless vs. substrate-centric economics

---

## Contact

**For research collaboration and evaluation:**  
research@persistra.ai

**For licensed deployment:**  
licensing@persistra.ai

---

**Status:** Research validation release  
**Last Updated:** 2026-07-12
