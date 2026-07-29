# Persistent Cognitive Substrate (PCS)

**External Cognitive Infrastructure for AI Systems**

[![Paper DOI](https://img.shields.io/badge/DOI-10.5281%2Fzenodo.21071446-blue)](https://doi.org/10.5281/zenodo.21071446)
[![CTS CI](https://github.com/persistra-ai/persistra-cts/actions/workflows/cts-ci.yml/badge.svg)](https://github.com/persistra-ai/persistra-cts/actions/workflows/cts-ci.yml)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/tests-25%20passing-success)](https://github.com/persistra-ai/persistra-cts/actions)
[![License](https://img.shields.io/badge/license-Evaluation-blue)](LICENSE)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/persistra-ai/persistra-cts?quickstart=1)

> ⚠️ **PATENT NOTICE**  
> The architectural primitives, methods, and systems described in this repository are subject to pending patent applications and other intellectual property protection.  
> Implementation or commercialization requires a license. See [PATENT_NOTICE.md](PATENT_NOTICE.md) and [PATENT_NOTICE_DIRECT.md](PATENT_NOTICE_DIRECT.md).  
> Patent framework: RFC-PCS-0007. Licensing inquiries: licensing@persistra.ai.

> ⚠️ **EVALUATION RELEASE**  
> This repository is available for evaluation and research purposes.  
> See [LICENSE](LICENSE) for terms. Commercial use requires separate licensing.

---

## Core Thesis

**Current AI systems place too much cognition inside the model.**

Memory, governance, continuity, provenance, identity, and salience are treated as model responsibilities — compressed into weights, managed through prompts, or left to context windows.

**PCS relocates durable cognitive authority into an external substrate.**

The model becomes a bounded reasoning engine. Memory, governance, continuity, provenance, identity, and salience become substrate-resident system functions that the model operates over, not manages.

**This is not better memory, better governance, or better continuity.**  
This is a different decomposition of where cognition lives in the AI stack.

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

### Validation Evidence

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

**Validation evidence published:**

**Mansfield, S. (2026).** *The Model is Not the Mind: From Stateless Inference to Long-Horizon Cognition* (Version v2.0 — corrected preprint). Zenodo. https://doi.org/10.5281/zenodo.21071446

### Broader Structural Consequences

These consequences follow architecturally from the substrate foundation and await production-scale validation:

- **Reduced dependence on context windows** - Salience-based selection vs. context window filtering
- **Increased practical viability of smaller models** - For governed institutional workloads
- **Redistribution of training pressure** - Away from knowledge storage toward reasoning

**On this view:** Continuity, governance, provenance, and identity become substrate-level system properties rather than side effects of model scale, context length, or prompt reconstruction.

---

## Production Foundation

PCS in this repository is a minimal conformance kernel extracted from a production cognitive infrastructure system developed over multiple years (327K+ LOC, 1,394 files). The public runtime is intentionally bounded: it exposes only the architectural primitives and validation surfaces necessary to evaluate the core substrate claims directly.

**Extraction approach:**
- **Source system:** Multi-year production deployment with extensive operational validation
- **Public runtime:** 625-line minimal kernel representing 0.2% of the source codebase
- **Distillation purpose:** Make core architectural claims testable, auditable, and independently evaluable
- **Disclosure boundary:** Public repositories expose primitives necessary for conformance testing, not the full implementation surface

This repository should be read as a **bounded architectural core**, not the entirety of PCS. The point of the public release is to make the core substrate claims independently evaluable by qualified engineering teams, while the broader reference implementation remains available under NDA.

**Why this matters:** The minimal runtime demonstrates that the architectural claims are not dependent on implementation complexity. The core substrate properties can be validated in 625 lines, but those properties were discovered and refined through production deployment in a substantially larger system over a significant timeframe.

---

### The Architectural Shift

**Current AI systems:**
- Cognitive state lives inside models (weights, context windows)
- Context lives in prompts
- Continuity depends on context windows
- Governance is advisory (prompts)
- Identity is trained into weights

**PCS architecture:**
- Cognitive state lives in external substrate (exocortex)
- Context selected by salience engine
- Continuity survives sessions/models/agents
- Governance is structural (runtime enforcement)
- Identity externalized and reinforced

### What This Enables

These capabilities result from externalizing cognitive state to persistent substrate.

#### 1. Token Efficiency
**Why:** Substrate owns state—model receives only salient context, not full history every turn  
**Impact:** Reduced API costs through elimination of prompt engineering overhead and re-contextualization  
**Mechanism:** Salience-based context selection replaces full history injection  
**Evidence:** Demonstrated in EVS-10 (salience-based selection, 22/22 assertions)

#### 2. Training Cost Reduction
**Why:** Identity as runtime state (not trained weights), skills emerge from memory (not retraining)  
**Impact:** Reduced or eliminated fine-tuning costs for domain-specific applications  
**Mechanism:** Configure substrate with identity nodes and domain corpus—no fine-tuning required  
**Evidence:** Demonstrated in EVS-3, EVS-4 (model swap continuity without retraining)

#### 3. Small Model Viability
**Why:** Substrate handles state/continuity/complexity—model performs micro-tasks only  
**Impact:** Smaller models can perform tasks typically requiring larger models when supported by substrate  
**Mechanism:** External state management + governance + salience reduces model complexity requirements  
**Evidence:** Demonstrated in EVS-3, EVS-4 (Llama 3.1 8B with substrate support)

#### 4. Data Sovereignty: User-Owned Cognitive State
**Why:** All state in user-controlled substrate, not vendor servers  
**Impact:** No vendor lock-in, HIPAA/GDPR compliance by architecture, model portability  
**Mechanism:** Swap AI providers freely without losing continuity—cognitive state stays with you

#### 5. Unlimited Corpus Access: From Context Window to Salience
**Why:** Salience engine selects from unlimited corpus, not context window filtering  
**Impact:** 10M-document knowledge base → no information loss  
**Mechanism:** Not "what fits in context" but "what's salient to task"  
**Validated:** EVS-10 (22/22 assertions)

#### 6. Emergent Skills: Capabilities from Interaction History
**Why:** Skills discovered from memory graph, not hardcoded  
**Impact:** New capabilities emerge automatically from usage  
**Mechanism:** EmergentSkillSystem (710 lines) - salience-based skill discovery

**See [PLATFORM_ECONOMICS.md](PLATFORM_ECONOMICS.md) for analysis of stateless vs. substrate-centric economics and architectural implications for AI platforms.**

---

**Status:** 26 tests passing (312 machine-verified assertions: 25 in main suite + AVS-2P), 9-act demo complete, Tenstorrent hardware validation (Phase 1 complete)

---

> **⚠️ ARCHITECTURAL SCOPE**  
> **This repository exposes a bounded validated kernel for direct evaluation of PCS substrate primitives.**  
> It demonstrates core conformance properties (PCS-L1 through PCS-L3) but does not represent the full reference architecture.  
>  
> **The broader PCS system includes:**  
> - Formal RFC specifications (RFC-PCS-0001 through RFC-PCS-0007)  
> - Extended primitive catalog (37 primitives across 7 architectural layers)  
> - Standards-defined conformance contracts  
> - Implementation layers beyond this public validation surface

---

## 🚀 Quick Start

### Reference Implementation

PCS includes a comprehensive reference implementation demonstrating all validated primitives:

- **Validated Kernel Architecture:** See [THE_PERSISTRA_ARCHITECTURE.md](THE_PERSISTRA_ARCHITECTURE.md) (this repository)
- **Full Source Code:** Available under NDA to qualified engineering teams (29 modules, ~104,000 lines)
- **Full Reference Architecture:** Available under NDA (37 primitives, 7 architectural layers)
- **Module Inventory:** See [REFERENCE_IMPLEMENTATION.md](REFERENCE_IMPLEMENTATION.md)

**Reference implementation:** The complete system (327K+ LOC, 1,394 files) demonstrates substrate-centric architecture at production scale. This public kernel (625 lines) exposes the minimal primitives necessary to evaluate core architectural claims.

---

## Bundled Runtime

**This repository is self-contained.** The PCS runtime is bundled in `runtime/` - no external dependencies or sibling repositories required.

**What's included:**
- Complete PCS runtime implementation (~3,765 lines)
- Decision store with persistent state
- Policy enforcement point
- Contradiction detection
- Audit logging
- All components needed for validation and demos

**For evaluators:** You only need to clone this repository. Everything required for validation is included.

---

### Quick Start with GitHub Codespaces (Zero Setup)

**Option 1: Browser-Based (Recommended for First-Time Users)**

1. Click the "Open in GitHub Codespaces" badge above
2. Wait for container to build (~1-2 minutes first time)
3. Set API keys in terminal:
   ```bash
   export ANTHROPIC_API_KEY=your_key_here
   export GROQ_API_KEY=your_key_here
   ```
4. Run validation:
   ```bash
   npm run preflight      # Check environment
   npm run test:quick     # 5-minute smoke test
   npm run test:all       # Full suite (~30 min)
   ```

**Why Codespaces?**
- ✅ Zero local setup required
- ✅ Same environment as CI/CD
- ✅ Reproducible results
- ✅ No "works on my machine" issues

**Option 2: Local Setup**

```bash
git clone https://github.com/persistra-ai/persistra-cts.git
cd persistra-cts
npm install
npm run preflight      # Validate environment
npm run test:quick     # Run smoke test
```

---

### First Time Here?

**Read:** [START_HERE.md](START_HERE.md) (1 page) - What PCS is, why it matters, what's proven

### See It Work (2 minutes)

**Run the demo:**

```bash
cd demo
node demo-complete.js
```

**Shows:** Acts 1-9 (foundation → continuity → meta-cognitive → multi-agent → institutional memory)

**Complete demo suite:**

```bash
# Acts 1-9 (complete)
node demo-complete-1-8.js  # Acts 1-8
node demo-act-9.js         # Act 9: Institutional memory query

# Individual acts
node demo-acts-1-3.js      # Foundation
node demo-acts-4-5.js      # Continuity
node demo-acts-6-7.js      # Meta-cognitive
node demo-act-8.js         # Multi-agent
```

### Validate It

**Before running tests, check your environment:**

```bash
npm run preflight
```

**Quick validation (5 minutes):**

```bash
npm run test:quick
```

**Runs 5 critical tests** to verify core functionality.

**Full validation suite (~30 minutes):**

```bash
npm run test:all              # Standard mode
npm run test:all:audit        # Full artifacts + manifest
npm run test:all:verbose      # Show errors inline
```

**Output:** 25 tests, 252 assertions, cryptographic verification

**Test suite breakdown:**
- **EVS (Exocortical Validation):** 13 tests, 163 assertions (~15 min)
- **AVS (Architectural Validation):** 6 tests, 89 assertions (~8 min)
- **CTS (Conformance):** 6 tests, 0 assertions (~7 min)
- **Total in run_all.sh:** 25 tests, 252 assertions

**Additional validation:**
- **[PASTE_CONDITION.md](PASTE_CONDITION.md)** — AVS-2P test (architectural proof, quick demo or full validation)
- **[HARDWARE_VALIDATION.md](HARDWARE_VALIDATION.md)** — Tenstorrent silicon compatibility (8 fixtures)
- **[OPTIONAL_TESTS.md](OPTIONAL_TESTS.md)** — Complete validation workflow guide

**Clean up test artifacts:**

```bash
npm run clean                 # Interactive cleanup
./scripts/clean-test-artifacts.sh --dry-run  # Preview
./scripts/clean-test-artifacts.sh --force    # Remove all
```

---

## Hardware Validation (Optional)

**The 25 PCS conformance tests run on standard CPUs and do not require special hardware.**

**Optional:** Hardware acceleration validation for the Contextual Salience Engine (CSE) primitive on Tenstorrent TT-Metalium is available in a separate repository: [`pcs-tt-primitive-validation`](https://github.com/persistra-ai/pcs-tt-primitive-validation)

**This hardware validation is a research exploration and is NOT required for PCS conformance or certification.**

**To run the Tenstorrent CSE validation (if you have Tenstorrent hardware):**

```bash
cd ../pcs-tt-primitive-validation/cse/reference
make oracle  # 8/8 fixtures passing
```

**Output:** Phase 1 complete - Host reference validated, ready for TT implementation

**What it validates:**
- CSE primitive can run on Tenstorrent hardware
- Deterministic equivalence between host and device implementations
- Hardware acceleration feasibility for cognitive control-plane workloads

**See:** [`pcs-tt-primitive-validation/README.md`](https://github.com/persistra-ai/pcs-tt-primitive-validation/blob/main/README.md) for details

---

## Command Reference

### ⚠️ Important: Do NOT use `npm test` directly

The `npm test` command requires additional flags and is not intended for evaluators.

**Use these commands instead:**

| Command | Purpose | Duration |
|---------|---------|----------|
| `npm run preflight` | Verify environment setup | ~10 seconds |
| `npm run test:quick` | Quick validation smoke test | ~5 minutes |
| `npm run test:all` | Full validation suite | ~30 minutes |
| `npm run test:all:audit` | Full suite with artifacts | ~35 minutes |
| `npm run clean` | Clean test artifacts | Interactive |

**For demos:**
```bash
cd demo
npm run demo:validate  # Validate demo is ready
npm run demo:1-3       # Acts 1-3 (Foundation)
npm run demo:all       # All 9 acts
```

**If you accidentally run `npm test`:**
- It will fail with missing flags error
- This is expected behavior
- Use `npm run test:quick` or `npm run test:all` instead

---

### Try the Tutorial (10 minutes)

**Experience PCS interactively:**

See [pcs-developer-runtime/TUTORIAL.md](https://github.com/persistra-ai/pcs-developer-runtime/blob/main/TUTORIAL.md) for a hands-on walkthrough demonstrating:
- State lives outside the model
- Constraints remain binding across sessions
- Model changes don't erase work

### Understand It

**By role:**

- **Evaluators:** [EVALUATOR_QUICKSTART.md](EVALUATOR_QUICKSTART.md) - Test validation
- **Architects:** [THE_PERSISTRA_ARCHITECTURE.md](THE_PERSISTRA_ARCHITECTURE.md) - Full technical depth
- **First-timers:** [START_HERE.md](START_HERE.md) - One-page architectural overview
- **Terminology:** See [persistra-public/GLOSSARY.md](https://github.com/persistra-ai/persistra-public/blob/main/GLOSSARY.md) or [persistra-reference-architecture/GLOSSARY.md](https://github.com/persistra-ai/persistra-reference-architecture/blob/main/GLOSSARY.md) for PCS term definitions

---

## 📚 Complete Documentation Set

### Entry Point (Read First)

1. **[START_HERE.md](START_HERE.md)** — **NEW:** One-page entry point (what PCS is, why it matters, what's proven)

### Architecture Overview

2. **[THE_PERSISTRA_ARCHITECTURE.md](THE_PERSISTRA_ARCHITECTURE.md)** — Executive synthesis (complete technical picture)
3. **[TEST_METHODOLOGY.md](TEST_METHODOLOGY.md)** — Complete test methodology for all 25 tests
4. **[VERIFICATION_SUITE.md](VERIFICATION_SUITE.md)** — Falsification-based test descriptions
5. **[PLATFORM_ECONOMICS.md](PLATFORM_ECONOMICS.md)** — Stateless vs. substrate-centric economics
6. **[READING_GUIDE.md](READING_GUIDE.md)** — Exact reading order for your role

### Core Technical Documents (Frozen at v1.0.0)

9. **[ENGINEERING_ENTRY_POINT.md](ENGINEERING_ENTRY_POINT.md)** — Detailed first-reviewer guide
10. **[EVALUATOR_QUICKSTART.md](EVALUATOR_QUICKSTART.md)** — One-command reproducibility guide
11. **[ARCHITECTURE_INVARIANTS.md](ARCHITECTURE_INVARIANTS.md)** — Core architectural thesis
12. **[PRIMITIVE_LAYER_SPECIFICATION.md](PRIMITIVE_LAYER_SPECIFICATION.md)** — Minimal primitive layer with hardware targets
13. **[VERIFICATION_SUITE.md](VERIFICATION_SUITE.md)** — Falsifiability criteria for all tests
14. **[THREAT_MODEL.md](THREAT_MODEL.md)** — Adversarial thinking and fail-closed behavior
16. **[VALIDATION_EVIDENCE.md](VALIDATION_EVIDENCE.md)** — Complete test results
17. **[CLAIMS_BOUNDARY.md](CLAIMS_BOUNDARY.md)** — Honest scope boundaries

**Total:** ~300 pages of documentation (architecture overview + technical validation)

---

## 🧪 Test Suites

### EVS (Exocortical Validation Suite) — 13 Tests

Validates core architectural invariants:

- **EVS-1:** Governance Failure (8 assertions)
- **EVS-2:** Context Failure (8 assertions)
- **EVS-3:** Engine Replacement — **FLAGSHIP** (9 assertions)
- **EVS-4:** Parameter Inversion (13 assertions)
- **EVS-5:** Deterministic Reproduction (4 assertions)
- **EVS-6:** Development Continuity (9 assertions)
- **EVS-7:** Semantic Retrieval (16 assertions)
- **EVS-8:** Vision Anchor Persistence (12 assertions)
- **EVS-9:** Air-Gapped Operation (18 assertions)
- **EVS-10:** Contextual Salience Engine (22 assertions)
- **EVS-7-BACKEND-SWITCH:** Backend Switching (15 assertions)
- **EVS-10-PERSISTENT:** Salience Persistence (11 assertions)
- **EVS-11:** Meta-Programming Interface (18 assertions)

**Total EVS Assertions:** 163

---

### AVS (Architectural Validation Suite) — 7 Tests

Validates runtime enforcement:

- **AVS-1P:** Policy Gate Enforcement (17 assertions)
- **AVS-1R:** Decision Retrieval Integrity (18 assertions)
- **AVS-2A:** Audit Layer (append-only hash chain) (17 assertions)
- **AVS-2E:** Orchestrator Binding (provider provenance) (15 assertions)
- **AVS-2P:** Paste Condition Diagnostic (60 assertions - negative evidence, 0/60 designed to fail)
- **AVS-3A:** Epistemic Gate Performance (17 assertions)
- **AVS-4:** End-to-End Latency Benchmark (5 assertions)

**Total AVS Assertions:** 149

---

### CTS (Conformance Test Suite) — 15 Conformance Tests

Validates PCS conformance levels (L1-L4):

**CTS-L1 (Persistence):** 2 conformance tests
- Session Boundary Integrity
- Decision State Recovery

**CTS-L2 (Governance):** 4 conformance tests
- Policy Enforcement
- Policy Continuity
- Policy Determinism
- Namespace Isolation

**CTS-L3 (Cross-Model Cognitive Continuity):** 5 conformance tests
- Model Transition Decision Recovery
- Multi-Hop Transition (A→B→C)
- Round-Trip Transition (A→B→A)
- Policy Survives Transition
- Conflict Resolution Stable

**CTS-L4 (Federation):** 4 conformance tests
- Decision Replication
- Governance Replication
- Nonquorum Node Loss Survivability
- CTS-L4-DISTRIBUTED (actual process isolation)

**Total:** 15 conformance tests across 4 levels

---

## ⚡ One-Command Execution

**Run all 25 tests with cryptographic verification:**

```bash
./run_all.sh --mode audit
```

**What this does:**
- Runs 13 EVS tests
- Runs 6 AVS tests
- Runs 6 CTS tests
- Generates combined manifest (PASS/FAIL summary)
- Produces SHA256 hashes for verification
- Captures git metadata, platform info, source file hashes

**Output location:**
```
audit-artifacts/combined-run-YYYYMMDD-HHMMSS/
  ├── COMBINED_MANIFEST.txt    (complete evaluation report)
  ├── MANIFEST.sha256           (cryptographic hashes)
  └── *.log                     (25 individual test logs)
```

**Verify integrity:**
```bash
cd audit-artifacts/combined-run-*/
shasum -c MANIFEST.sha256
```

---

## 🔬 Beyond the Main Suite

**After running the 25-test suite, explore additional validation:**

### Paste Condition Test (AVS-2P)
**The most architecturally significant test** — proves governance enforcement requires substrate activation, not just prompt engineering.

```bash
# Quick demo (~3 min)
node avs-harness/demo-paste-condition.js

# Full validation (~30 min)
node avs-harness/run-avs2p-matrix.js
```

**See:** [PASTE_CONDITION.md](PASTE_CONDITION.md)

### Hardware Validation
Validate PCS primitives on Tenstorrent silicon (8 fixtures, ~5 min).

```bash
cd ../pcs-tt-primitive-validation
./run_validation.sh
```

**See:** [HARDWARE_VALIDATION.md](HARDWARE_VALIDATION.md)

### Complete Workflow
For all validation components including 9-act demo and tutorial:

**See:** [OPTIONAL_TESTS.md](OPTIONAL_TESTS.md)

---

## 🎯 What You're Evaluating

**Persistra is a runtime/state substrate for AI systems.**

PCS provides memory, governance, and state management as integrated infrastructure.

**What's proven now:**

**Test Suite (26 tests, 312 machine-verified assertions):**
- ✅ State persistence across sessions
- ✅ Policy enforcement at runtime
- ✅ Model swap continuity (Claude → Llama)
- ✅ Air-gapped operation
- ✅ Semantic retrieval with trace contracts

**Coding Demo (Acts 1-9 complete - 2026-03-18):**
- ✅ Authoritative state recording (decisions + constraints)
- ✅ Governed code generation (runtime enforcement)
- ✅ Constraint enforcement with evidence (decision provenance)
- ✅ Fresh-session continuity (state loads from substrate, no manual reinjection)
- ✅ Model swap continuity (model-agnostic substrate)
- ✅ Vision-guided code generation (architectural principles guide decisions)
- ✅ Flow-aware continuation (phase detection + next action inference)
- ✅ Multi-agent coordination (shared substrate, governed collaboration)
- ✅ Institutional memory (query authoritative state with full provenance)

**What's documented (Future capabilities):**
- 📋 Broader domains (operational, institutional, sovereign AI)
- 📋 Extended domain coverage and expansion paths

---

## � Competitive Landscape (June 2026)

**The AI industry has addressed the PCS thesis: memory and governance are architectural problems.**

In the past three months, major AI vendors have shipped memory and governance solutions:
- **OpenAI Dreaming V3** (June 4, 2026) - Background synthesis improving recall 41.5% → 82.8%
- **Anthropic Claude Memory** (March 2026) - Persistent memory across all users
- **Microsoft Agent Governance Toolkit** (April 2026) - Runtime governance with sub-0.1ms latency
- **Google/AWS Bedrock** - Managed memory integration

**This illustrates the market problem.** vendors recognizes that AI systems may need persistent memory and governance.

**This also exposes the architectural limitation.** vendor's solution keeps cognitive state inside vendor infrastructure, creating lock-in.

### The Architectural Distinction

**Category 2 (Advisory Systems):** Improve what the model sees, monitor what it produces  
**PCS (Category 3):** Relocate authority outside the model into enterprise-owned substrate

**This is not product competition. This is an architectural distinction.**

### The Vendor Switch Test

**What happens when you switch vendors?**

- **OpenAI/Anthropic/Microsoft:** All memory lost. Start from zero.
- **PCS:** Zero cognitive loss. Substrate persists. Model is replaced. Work continues.

**Industry coverage points to:** "Memory is becoming an architecture problem, not a prompt problem." — June 11, 2026

**See [COMPETITIVE_LANDSCAPE_2026.md](COMPETITIVE_LANDSCAPE_2026.md) for complete analysis.**

---

## �📖 Recommended Reading Order

**See [READING_GUIDE.md](READING_GUIDE.md) for complete reading paths by role.**

### Quick Paths by Audience

**Everyone (start here):**
1. [START_HERE.md](START_HERE.md) - One-page entry point (5 min)

**Decision Makers (15-30 min):**
1. [START_HERE.md](START_HERE.md) - What PCS is, validation evidence
2. [THE_PERSISTRA_ARCHITECTURE.md](THE_PERSISTRA_ARCHITECTURE.md) - Complete architectural overview
3. [PLATFORM_ECONOMICS.md](PLATFORM_ECONOMICS.md) - Stateless vs. substrate-centric economics

**Evaluators (2-4 hours):**
1. [START_HERE.md](START_HERE.md) - What's proven
2. Run tests: `./run_all.sh --mode audit` (~3 min)
3. [EVALUATOR_QUICKSTART.md](EVALUATOR_QUICKSTART.md) - Test validation
4. [VERIFICATION_SUITE.md](VERIFICATION_SUITE.md) - Falsifiability criteria

**Architects (4-6 hours):**
1. [START_HERE.md](START_HERE.md) - Category distinction
2. [THE_PERSISTRA_ARCHITECTURE.md](THE_PERSISTRA_ARCHITECTURE.md) - Technical depth
3. [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md) - Full substrate architecture

**Partners (1-2 hours):**
1. [START_HERE.md](START_HERE.md) - What PCS is
2. [THE_PERSISTRA_ARCHITECTURE.md](THE_PERSISTRA_ARCHITECTURE.md) - Complete technical picture
3. [PLATFORM_ECONOMICS.md](PLATFORM_ECONOMICS.md) - Economic analysis

---

## 🔐 Maturity Indicators

### Documentation Maturity
- ✅ 16 core documents (~300 pages total)
- ✅ Architecture overview (5 new docs: scope, software engineering domain, capability map, proof status, MVS)
- ✅ Technical validation (10 docs frozen at v1.0.0)
- ✅ Falsifiability criteria for all claims
- ✅ Explicit boundaries (what PCS is/isn't, what's proven/specified/deferred)
- ✅ Reproducibility metadata (git, platform, hashes)

### Test Maturity
- ✅ 26 executable tests (13 EVS + 7 AVS + 6 CTS)
  - 25 tests in `run_all.sh` (252 assertions)
  - 1 AVS-2P test separate (60 assertions)
- ✅ 312 machine-verified assertions total
- ✅ One-command execution for main suite (`./run_all.sh`)
- ✅ Cryptographic verification (SHA256 manifests)
- ✅ Real model validation (Claude, Llama, Groq)

### Code Maturity
- ✅ Minimal runtime kernel (~1,300 lines)
- ✅ 15 validated primitives (6 Tier-1, 9 Tier-2)
- ✅ Contract versioning (all primitives at v1.0.0)
- ✅ Deterministic behavior (no emergent properties)
- ✅ Fail-closed mitigations (all tested)

---

## 🔗 Related Repositories

- **[persistra-cts](https://github.com/persistra-ai/persistra-cts)** (this repo) — Conformance test suite
- **[pcs-runtime](https://github.com/persistra-ai/pcs-runtime)** — Reference runtime implementation
- **[persistra-reference-architecture](https://github.com/persistra-ai/persistra-reference-architecture)** — Architecture documentation

---

## ❓ Common Questions

**Q: How long does evaluation take?**  
A: ~2-3 minutes to run tests, ~4-6 hours to review documentation.

**Q: Do I need API keys?**  
A: No. Tests run in replay mode by default (zero external calls).

**Q: What if tests fail?**  
A: All tests should pass. Check Node.js version (v18+ required) and platform (macOS, Linux, WSL supported).

**Q: Where do I start?**  
A: Read [ENGINEERING_ENTRY_POINT.md](ENGINEERING_ENTRY_POINT.md), then run `./run_all.sh --mode audit`.

**Q: What's the flagship test?**  
A: EVS-3 (Engine Replacement) — proves Claude → Llama continuity with prompt="continue" (no context).

**Q: Are claims falsifiable?**  
A: Yes. Every EVS test has explicit falsification criteria in [VERIFICATION_SUITE.md](VERIFICATION_SUITE.md).

**Q: What's NOT proven?**  
A: See [CLAIMS_BOUNDARY.md](CLAIMS_BOUNDARY.md) for 7 explicit exclusions.

---

## Citation

If you reference this work, please cite:

**Mansfield, S. (2026).** *The Model is Not the Mind: From Stateless Inference to Long-Horizon Cognition* (Version v2.0 — corrected preprint). Zenodo. https://doi.org/10.5281/zenodo.21071446

```bibtex
@misc{mansfield2026model,
  author       = {Mansfield, Stephen},
  title        = {The Model is Not the Mind: From Stateless Inference to Long-Horizon Cognition},
  year         = {2026},
  publisher    = {Zenodo},
  version      = {v2.0 — corrected preprint},
  doi          = {10.5281/zenodo.21071446},
  url          = {https://doi.org/10.5281/zenodo.21071446}
}
```

**For the PCS RFC specifications:**

**Mansfield, S. (2026).** *Persistra Cognitive Standard (PCS) RFC Specifications* (Version 1.0). Zenodo. https://doi.org/10.5281/zenodo.21418899

---

## 📋 Licensing Status

**Current Stage:** Evaluation Release (Source-Available)

PCS is available through a staged engagement model designed to support different use cases:

### Lane A: Public Evaluation (Available Now)

**What it is:** The public repository, runtime, and tutorial for understanding PCS architecture directly.

**What it allows:**
- ✅ Local evaluation and testing
- ✅ Internal learning and architectural assessment
- ✅ Non-production experimentation

**What it does NOT allow:**
- ❌ Production deployment
- ❌ Commercial use or resale
- ❌ Claiming PCS compliance or certification
- ❌ Access to full reference implementation

**Purpose:** This lane proves the category and creates interest, but is intentionally bounded.

### Lane B: Commercial Runtime License (In Development)

**What it is:** Paid license for deeper PCS implementation access for organizations wanting to deploy faster than rebuilding from scratch.

**Best fit:**
- AI companies building on top of PCS
- Regulated-domain teams needing on-prem or air-gapped deployment
- Engineering organizations wanting production deployment rights

**Status:** Commercial licensing terms are under development.

**Contact:** licensing@persistra.ai

### Lane C: Standards / Conformance / Certification (In Development)

**What it is:** Separate rights layer for organizations wanting to claim their system is aligned with PCS as a formal architecture.

**Best fit:**
- Companies building their own PCS-like implementation
- Partners integrating PCS principles deeply
- Future ecosystem participants

**Status:** Standards and conformance pathways are under development. Claims of PCS alignment, conformance, or certification require explicit authorization.

### Reference Implementation Access

**Full Reference Implementation:**
The complete reference implementation (327K+ LOC, 1,394 files) is available under NDA for:
- Enterprise evaluation
- Research collaboration
- Licensed deployment

**What's included:**
- Complete source code access
- Technical documentation
- Architecture review sessions
- Implementation guidance

**Contact:** licensing@persistra.ai

---

## � License and Patent Notice

### License

This software is provided under a **source-available license** for evaluation and non-commercial research purposes. See [LICENSE](LICENSE) for complete terms.

**Key Points:**
- ✅ Viewing, evaluation, and non-commercial research permitted
- ❌ Commercial use requires separate licensing
- ❌ No patent rights granted by this license

**For Commercial & Patent Licensing:** licensing@persistra.ai

### Patent Notice

Implementation of the Persistra Cognitive Standard (PCS) may require licenses to patents owned by Exocortical Concepts, Inc. and/or other parties.

**See:** [PATENT_NOTICE.md](PATENT_NOTICE.md) for complete patent disclosure and FRAND licensing framework (RFC-PCS-0007).

**This is a source-available license, not an open-source license.**

---

## 📞 Contact

**For NDA Access & Technical Evaluation:** research@persistra.ai  
**For Commercial & Patent Licensing:** licensing@persistra.ai  
**For General Inquiries:** info@persistra.ai

---

## 📞 Support

**Technical questions:** Answered within 24 hours  
**Additional documentation:** Provided on request  
**Test execution support:** Available if needed

---

**Start your evaluation now:**

```bash
./run_all.sh --mode audit
```

**Then read:** [ENGINEERING_ENTRY_POINT.md](ENGINEERING_ENTRY_POINT.md)
