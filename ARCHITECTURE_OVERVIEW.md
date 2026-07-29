# PCS Architecture Overview

**What PCS Is:** External cognitive infrastructure for AI systems  
**What This Repo Shows:** The validation suite proving the architecture works  
**Status:** 26 tests passing, 312+ assertions, Acts 1-9 complete (2026-03-18)

---

## Before Reading Technical Details

**PCS is an architectural reframe of AI itself.**

It externalizes cognitive state from models into persistent infrastructure (exocortex), making models interchangeable execution engines rather than cognitive owners.

This changes what AI systems can architecturally guarantee:
- Persistent continuity across sessions, models, agents
- Structurally binding governance (not advisory prompts)
- Fail-closed behavior when required state is missing
- Cryptographically verifiable provenance
- Semantic coordination that makes context windows less central
- Model portability without continuity loss
- Reduced dependence on frontier models
- Lower token and orchestration burdens
- Foundation for meta-programming and emergent skills

**The consequence tree is not hypothetical** - it flows from the architectural primitives validated in this test suite.

---

## The Core Problem

Current AI systems treat every interaction as stateless. They have:
- No authoritative project state
- No governed decision history
- No persistent architectural vision
- No continuity across model swaps
- No enforcement of established constraints

This creates the **Context Wall**: as projects grow, AI systems lose coherence because they have no substrate to maintain authoritative state.

---

## What PCS Is (The Full Architecture)

**PCS (Persistent Cognitive Substrate)** is a **runtime and state substrate layer** that sits beneath AI interactions and provides:

### 1. Authoritative State Management
- Project decisions persist in governed substrate
- Architectural constraints stored as enforceable policies
- Vision and goals maintained across sessions
- State survives model swaps and session boundaries

### 2. Runtime Governance
- Decisions retrieved from substrate, not model memory
- Policies enforced before code generation
- Evidence provided for refusals
- Audit trail for all state changes

### 3. Cognitive Continuity
- Sessions continue from authoritative state
- Flow awareness (what type of work, what phase)
- Vision-guided development
- Model-agnostic project memory

### 4. Meta-Cognitive Coordination
- Emergent capabilities discovered from interactions
- Architectural patterns learned from project history
- Self-awareness of project understanding
- Adaptive guidance based on discovered patterns

---

## What PCS Is NOT

**PCS is not:**
- ❌ Just governance (it's a full cognitive substrate)
- ❌ Just memory (it's authoritative state with enforcement)
- ❌ Just for coding (software engineering is the initial application domain, not the only domain)
- ❌ Just for air-gapped/defense (those are deployment modes, not the architecture)
- ❌ Just for hardware acceleration (silicon is an optimization, not the core)
- ❌ Just for standards (it's infrastructure, not a spec)

**PCS is:**
- ✅ A full runtime/state substrate layer
- ✅ Model-agnostic cognitive infrastructure
- ✅ Authoritative project state management
- ✅ Runtime-governed AI interactions
- ✅ Persistent cognitive coordination

---

## Why Software Engineering Is An Initial Application Domain

**Software engineering is an initial application domain because:**

1. **Immediate issue to address:** Context wall hits developers within hours of starting a project
2. **Initiaal Clear value:** Authoritative architectural state prevents drift and rework
3. **Measurable impact:** Constraint violations caught before code generation
4. **Horizontal need:** Every development team faces this problem
5. **Obvious proof:** Refusal with evidence is undeniable

**But PCS is not only for coding.** The same substrate architecture applies to:
- Operational decision-making (Palantir-style)
- Institutional memory infrastructure
- Governed multi-agent systems
- Sovereign/disconnected AI deployments
- Any domain requiring persistent, governed cognitive state

---

## Architecture Layers

### Layer 1: Core Substrate (Proven)
**Status:** ✅ Validated in EVS/AVS/CTS test suite

- **State Layer:** Persistent storage of decisions, policies, vision
- **Governance Layer:** Policy enforcement, audit trail, provenance
- **Retrieval Layer:** Semantic search, salience ranking, evidence generation
- **Runtime Layer:** Model-agnostic execution, trace contracts, deterministic replay

**Tests:** EVS 1-11, AVS 1-4, CTS L1-L5 (21 tests, 123+ assertions)

### Layer 2: Cognitive Coordination (Proven)
**Status:** ✅ Acts 1-9 complete (2026-03-18)

- **Vision Anchor:** Architectural principles as active guidance (EVS-8, Act 6)
- **Flow Awareness:** Track coding phase and infer next actions (Act 7)
- **Continuation:** Substrate-mediated "continue" with context reconstruction (Acts 4-5)
- **Model Swap:** Cross-model continuity with intact state (EVS-3, EVS-4, Act 5)
- **Multi-Agent:** Coordinated collaboration with shared substrate (Act 8)
- **Institutional Memory:** Query authoritative state with provenance (Act 9)

**Demos:** Acts 1-9 (`demo/ACTS_1-9_COMPLETE.md`)

### Layer 3: Meta-Cognitive Intelligence (Documented, Not Fully Proven)
**Status:** 📋 Architecture documented, implementation deferred

- **Emergent Capabilities:** Discover coding patterns from project history
- **Cognitive State:** Persist beliefs, goals, identity across sessions
- **Pattern Learning:** Adapt to team conventions and architectural preferences
- **Meta-Awareness:** AI explains what it has learned about the project
- **Multi-Agent Coordination:** Shared substrate for coordinated agents
- **Emergent Behavior Coordination:** Dynamic capability discovery from memory graph (Tier-3 primitive, reference implementation exists)

**Documentation:** See `PRIMITIVE_LAYER_SPECIFICATION.md` for Tier-3 primitives and `THE_PERSISTRA_ARCHITECTURE.md` for complete architecture

---

## Current Proof Artifacts

### What Is Validated Now (Test Suite)

**EVS (Exocortical Validation Suite) - 11 tests**
- Governance enforcement with dual policies
- Context failure detection
- Engine replacement (Claude → Llama continuity)
- Parameter inversion (frontier → edge model swap)
- Deterministic reproduction (record/replay)
- Development continuity (substrate-mediated "continue")
- Semantic retrieval (runtime-governed embeddings)
- Vision anchor persistence
- Air-gapped operation
- Contextual salience engine
- Meta-programming interface

**AVS (Authoritative Validation Suite) - 4 tests**
- Policy gate enforcement
- Decision retrieval integrity
- Audit layer (append-only hash chain)
- Orchestrator binding (provider provenance)

**CTS (Continuity Test Suite) - 5 tests**
- Session boundary handling
- Trace contract validation
- Runtime binding
- Primitive composition
- Integration testing

### What Is Documented But Not Yet Proven

**Meta-Cognitive Layer (MVS - Meta-Cognitive Validation Suite):**
- Emergent capability discovery from project interactions
- Cognitive state persistence (beliefs, goals, identity)
- Pattern learning and adaptation to team conventions
- Vision evolution based on project experience
- Multi-agent coordination through shared substrate

**See:** `THE_PERSISTRA_ARCHITECTURE.md` for complete technical details and `CLAIMS_BOUNDARY.md` for scope boundaries

---

## Key Architectural Principles

### 1. The Model Is Not The Mind

**Traditional AI:** Model memory = project memory  
**PCS:** Substrate state = project memory, model is stateless executor

**Implication:** Models are swappable without losing project continuity

### 2. Governance Is Runtime, Not Prompt

**Traditional AI:** "Please follow these rules..."  
**PCS:** Substrate enforces policies before code generation

**Implication:** Constraints are mechanically enforced, not requested

### 3. State Is Authoritative, Not Reconstructed

**Traditional AI:** Reconstruct context from chat history  
**PCS:** Retrieve authoritative state from substrate

**Implication:** No context drift, no hallucinated decisions

### 4. Continuity Is Substrate-Mediated, Not Prompt-Mediated

**Traditional AI:** "Here's what we discussed before..."  
**PCS:** Substrate provides salient context for current phase

**Implication:** "Continue" is intelligent, not just context dump

### 5. Vision Is Cognitive Anchor, Not Metadata

**Traditional AI:** Vision as documentation  
**PCS:** Vision as active guidance and drift detection

**Implication:** Architectural principles guide every decision

---

## Deployment Modes

PCS architecture supports multiple deployment modes:

### Cloud-Connected (Default)
- Standard deployment with cloud LLM providers
- Substrate persists locally or in private cloud
- Model calls go to Claude, GPT-4, etc.

### Air-Gapped (EVS-9 Proven)
- Fully disconnected operation
- Local embeddings and semantic retrieval
- No external API calls
- Suitable for: defense, healthcare, financial services

### Hardware-Accelerated (Phase 2 Validation)
- Substrate operations on specialized hardware
- Tenstorrent validation in progress
- Enables: real-time governance, massive scale, sovereign infrastructure

### Multi-Agent (Documented)
- Shared substrate across multiple agents
- Coordinated decision-making
- Conflict detection and resolution

---

## What Makes PCS Different

### vs. RAG (Retrieval-Augmented Generation)
**RAG:** Retrieve documents, inject into prompt  
**PCS:** Retrieve authoritative state, enforce governance, provide evidence

**Key difference:** PCS has runtime enforcement, not just context injection

### vs. Vector Databases
**Vector DB:** Store embeddings, retrieve similar content  
**PCS:** Store governed decisions, enforce policies, track provenance

**Key difference:** PCS has governance layer, not just retrieval

### vs. Agent Frameworks
**Agent Framework:** Orchestrate tool calls and workflows  
**PCS:** Provide authoritative state substrate beneath agents

**Key difference:** PCS is infrastructure, not orchestration

### vs. Fine-Tuning
**Fine-Tuning:** Bake knowledge into model weights  
**PCS:** Maintain knowledge in governed substrate

**Key difference:** PCS state is inspectable, auditable, and swappable across models

---

## Reading This Repo

**For evaluators:** Start with `EVALUATOR_QUICKSTART.md` to run tests  
**For architects:** Start with `READING_GUIDE.md` for full technical depth 
**To understand scope:** Read `THE_PERSISTRA_ARCHITECTURE.md` and `CLAIMS_BOUNDARY.md`

---

## Current Status

**Primitive Layer:** ✅ Validated (26 tests, 312+ assertions)  
**Software Engineering Demo:** ✅ Acts 1-9 complete (2026-03-18)  
**Meta-Cognitive Layer:** ✅ Vision-guided + flow-aware proven (Acts 6-7)  
**Multi-Agent Layer:** ✅ Coordination proven (Act 8)  
**Institutional Memory:** ✅ Authoritative state query proven (Act 9)  
**Hardware Acceleration:** 🔄 Phase 1 validation complete, Phase 2 on hold

---

## Strategic Positioning

**PCS is a full cognitive substrate architecture.**

**This repo shows both:**
1. **Working proofs** of the software engineering implementation (tests, demo, validation artifacts)
2. **Architectural explanations** of the full PCS capability (what it enables now and later)

For questions or evaluation access, see repository maintainers.
