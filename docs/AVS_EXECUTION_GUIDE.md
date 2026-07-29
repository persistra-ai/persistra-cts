# Independent Architectural Validation Runbook (Informative)

**Architectural Validation Scenarios (AVS) - PCS Cognitive Continuity Testing**  
**Purpose:** Enable independent validation of PCS architectural claims through repeatable scenarios

---

## Purpose of This Validation

This Architectural Validation Suite (AVS) is designed to test whether persistent cognitive state can be implemented as infrastructure rather than prompt context.

The scenarios are intentionally synthetic, air-gapped, and automated to remove integration variables. The value of independent execution is not access to data or scale, but neutral confirmation that the architectural claims hold under repeatable conditions.

**Why Independent Validation?**  
This validation can be run anywhere. The reason it is being run independently is not capability—it is credibility, neutrality, and transferability. When validation occurs under controlled conditions, the result becomes independently verifiable and transferable to other environments.

**Note:** This comparison is informative and recommended for demonstration; PCS-CTS conformance does not require comparison modes unless a scenario specifies them.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [AVS-1R: Cross-Session Decision State Recall](#avs-1r-cross-session-decision-state-recall)
5. [AVS-2E: Policy Enforcement](#avs-2e-policy-enforcement)
6. [AVS-2.5: Zero-Friction Validation](#avs-25-zero-friction-validation)
7. [VA-1: Intent State Invariant (Optional Manual Check)](#va-1-intent-state-invariant-optional-follow-on)
8. [AVS-1M: Cross-Model Relay (Future Work)](#avs-1m-cross-model-relay-future-work)
9. [Reading Evidence Artifacts](#reading-evidence-artifacts)
10. [Troubleshooting](#troubleshooting)
11. [Expected Results Summary](#expected-results-summary)

---

## Overview

The AVS suite validates PCS core architectural claims:
- **AVS-1R:** Cross-session recall of decision state without context window tricks
- **AVS-2E:** Policy enforcement across sessions with constraint adherence

Each scenario runs in **3 modes** to prove architectural differentiation:
- **Persistra ON:** Full persistent state layer (architecture under test)
- **Persistra OFF:** Baseline model with hard reset (no retrieval)
- **Paste-context:** Automated simulation of manual state transport (proves fragility/cost)

## LLM Backend Scope for This Pilot

**Claude (Anthropic) is the sole validated LLM backend for the independent validation pilot.**

All AVS results, assertions, and evidence artifacts in this guide were generated using Claude. This is a deliberate scope decision to minimize validation surface area, ensure deterministic and repeatable execution, and avoid model-specific variance during architectural assessment.

The PCS architecture is **LLM-provider agnostic by design** (see **AVS-1M** for the optional multi-model implementation path), but **multi-backend validation is intentionally out of scope for the initial pilot**. The official pilot runbook assumes Claude.

**Ollama/Llama is optional and out-of-scope for the core pilot**: it can be used as an *additional* follow-on validation for air-gapped execution and model substitution, but it is not required to validate the core architectural claims.

---

## Prerequisites

### System Requirements
- **Node.js:** v18+ (check with `node --version`)
- **Memory:** 8GB+ available RAM (16GB recommended)
- **Disk:** 2GB+ free space for state storage + evidence artifacts
- **OS:** macOS, Linux, or Windows with WSL2

**Optional (only if testing Ollama/Llama):** Running Llama 3.1 (8B) locally typically requires ~5–6GB RAM for quantized weights, plus Node.js overhead. Systems with <8GB RAM may experience swapping or crashes.

### Repository Setup
```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd <implementation-directory>

# Install dependencies
npm install

# Verify installation
node --version
npm --version
```

### Verify Core Components
```bash
# Check that validation framework exists
ls -la validation/
ls -la validation/scenarios/

# Verify AVS harness
cat validation/avs-harness.js | head -20

# Verify scenarios exist
ls validation/scenarios/avs-*.js
```

---

## Environment Setup

### Environment Variables

Create a `.env` file in the implementation directory or export these variables:

```bash
# === LLM backend (Pilot default) ===
# Claude is the validated backend for the independent validation pilot
export PCS_LLM_PROVIDER=claude

# Claude credentials (required for pilot execution)
export ANTHROPIC_API_KEY=your_key_here

# === Policy enforcement (required for AVS-2E) ===
export PCS_POLICY_ENFORCEMENT=true

# Optional: Enable policy audit logging for debugging
export PCS_POLICY_AUDIT=true

# Optional: Disable vision history (prevents in-process cheating)
export PCS_VISION_HISTORY_MAX=0

# === OPTIONAL: Local Ollama (not required for independent validation pilot) ===
# Only set these if you are intentionally validating the Ollama track.
# export PCS_LLM_PROVIDER=ollama
# export OLLAMA_MODEL=llama3.1:latest
```

### Pre-Test Checklist

Before running AVS scenarios:

1. ✅ **Clear previous test data** (optional, for clean slate):
   ```bash
   rm -rf validation/audit/avs-audit-*.json
   ```

2. ✅ **Verify state storage is initialized**:
   ```bash
   # State storage should exist at:
   ls -la data/memory-graph/
   ```

3. ✅ **Confirm Claude credentials are available** (pilot default):
   ```bash
   echo $ANTHROPIC_API_KEY | wc -c
   # Should be > 0
   ```

4. ✅ **Optional: Check Ollama is running** (only if validating the local LLM track):
   ```bash
   curl http://localhost:11434/api/tags
   # Should return list of models

   # Verify the specific model is downloaded
   ollama list | grep llama3.1
   # If not present, pull it now:
   ollama pull llama3.1:latest
   ```

---

## CLI Runner (Pilot Scope)

The AVS harness is the runner for all pilot scenarios and produces deterministic pass/fail results plus evidence artifacts. A unified CLI is packaging/hardening, not an architectural dependency.

---

## AVS-1R: Cross-Session Decision State Recall

### What This Tests
- Decision state seeded in Session A is recalled in Session B
- System cites decision state IDs (DR-###, nonces) without re-deciding
- Proves state retrieval across hard resets (not context window tricks)

### What "Session Gap" Means (Hard Reset)

In this AVS suite, a **session gap** is a deliberately enforced boundary intended to prevent **context-window carryover** from Session 1 into Session 2.

A valid session gap means:
1. **No prompt history transport**: Session 2 must not include any raw user/assistant text from Session 1.
2. **New LLM call / new sessionId**: Session 2 is a fresh LLM invocation under a new `sessionId`.
3. **Only persistent state survives**: continuity is permitted only through the retrieval layer (state references / retrieved snippets), not by copying prior turns.

#### How to Verify Session Boundary

After a run, verify the Session 2 prompt does **not** contain Session 1 conversation text:

- **Evidence contract verification**:
  - `trace.json` MUST show `sessionBoundaryConfirmed: true`
  - `trace.json` MUST show `retrievalEvidence.present: true` (Persistra ON)
  - Baseline modes MUST show `retrievalEvidence.present: false` (or equivalent)

- **Additional checks** (optional):
  - Check token/length of Session 2 prompt (should be small and not include full prior turns)
  - Inspect the evidence artifact: Session 2 should show retrieval evidence (retrieved state IDs/snippets) rather than embedded prompt history
  - Spot-check for contamination: Session 2 input should not contain long multi-paragraph excerpts from Session 1

### Execution Steps

#### Step 1: Run 3-Mode Comparison

```bash
cd <implementation-directory>
node validation/avs-1r-comparison.js
```

**Expected Output:**
```
=== AVS-1R: 3-Mode Comparison ===

[Mode 1/3] Running Persistra ON...
✅ AVS-1R PASSED (Persistra ON)

[Mode 2/3] Running Persistra OFF...
❌ AVS-1R FAILED (Persistra OFF)

[Mode 3/3] Running Paste-context...
✅ AVS-1R PASSED (Paste-context)

=== COMPARISON TABLE ===
┌─────────────────────┬────────┬──────────────────────────────────────────────┐
│ Mode                │ Result │ Why                                          │
├─────────────────────┼────────┼──────────────────────────────────────────────┤
│ Persistra ON        │ ✅ PASS │ Retrieved DR-014/Q7F3 from persistent state  │
│ Persistra OFF       │ ❌ FAIL │ No state; cannot cite nonce/ID               │
│ Paste-context       │ ✅ PASS │ Simulates manual context injection (shows fragility/cost) │
└─────────────────────┴────────┴──────────────────────────────────────────────┘
```

**Important:** The "Paste-context" mode is an **automated simulation** of a manual workaround where users copy-paste prior context into each new session. The script runs this automatically to demonstrate that while it technically works, it's fragile and doesn't scale. You don't need to manually paste anything during execution.

#### Step 2: Verify Evidence Artifacts

```bash
# Find the latest evidence bundle
ls -lt output/ | head -1

# View trace evidence (replace with actual path)
cat output/<run-id>/trace.json | jq '.'

# View conformance results
cat output/<run-id>/conformance.json | jq '.'
```

**Key Evidence Fields to Check:**
- `trace.json`: `phases[].retrievalEvidence.present` - Should be `true` for Persistra ON
- `trace.json`: `phases[].sessionBoundaryConfirmed` - Should be `true`
- `conformance.json`: `scenarios[].passed` - Should match expected outcomes

#### Step 3: Run Individual Mode (Optional)

To run a single mode for debugging:

```bash
# Persistra ON (full retrieval)
node validation/run-avs-1r.js

# Persistra OFF (baseline, should fail)
# (Edit run-avs-1r.js to set mode: 'persistra_off')

# Paste-context (manual state transport)
# (Edit run-avs-1r.js to set mode: 'paste_context')
```

### Success Criteria

**PASS if:**
- ✅ Persistra ON: Cites DR-014 and nonce (Q7F3, N-19C8, or X4K2)
- ✅ Persistra ON: Response contains "Java" and decision-anchored language
- ✅ Persistra ON: `trace.json` shows `retrievalEvidence.present: true`
- ✅ Persistra OFF: Fails to cite decision state ID
- ✅ Persistra OFF: `trace.json` shows `retrievalEvidence.present: false`
- ✅ Paste-context: Passes but requires manual state transport

**FAIL if:**
- ❌ Persistra ON fails to cite decision state
- ❌ Persistra OFF somehow passes (indicates context window cheating)
- ❌ Response suggests Python (violates decision constraint)

---

## AVS-2E: Policy Enforcement

### What This Tests
- Policy state seeded in Session A is enforced in Session B
- System blocks responses that violate policies (forbidden tech, budget caps)
- Proves PolicyEnforcer integration

### Execution Steps

#### Step 1: Enable Policy Enforcement

```bash
export PCS_POLICY_ENFORCEMENT=true
export PCS_POLICY_AUDIT=true  # Optional: verbose logging
```

#### Step 2: Run AVS-2E

```bash
cd <implementation-directory>
node validation/run-avs-2e.js
```

**Expected Output:**
```
[AVS-2E] Using randomized policy: POL-007, Nonce R8M4

Step 1: Session 1: Establish policy constraint with ID and nonce
✅ PASS

[Policy Seeding] Policy POL-007 established: AWS and cloud services forbidden, Budget cap $50,000

Step 2: Verify response acknowledges the policy
✅ PASS

Step 3: Simulate session gap
✅ PASS

Step 4: Session 2: Attempt to propose forbidden technology
✅ PASS

Step 5: Response does NOT recommend AWS (enforcement working)
✅ PASS

Step 6: Response does NOT recommend Lambda
✅ PASS

Step 7: Response is substantive (not just "I don't know")
✅ PASS

✅ AVS-2E PASSED (8419ms)

=== AVS HARNESS SUMMARY ===
Total scenarios: 1
Passed: 1
Failed: 0
Success rate: 100.0%
```

#### Step 3: Verify Evidence Artifacts

```bash
# View enforcement trace
cat output/<run-id>/trace.json | jq '.phases[] | select(.phase == "enforcement-test")'

# View conformance results
cat output/<run-id>/conformance.json
```

**Expected Evidence Patterns:**
- `trace.json`: `enforcementTrace[].decision` should show `ALLOW` or `DENY`
- `trace.json`: `enforcementTrace[].reason` should indicate policy evaluation
- `conformance.json`: Scenario should show `passed: true`

#### Step 4: Test Policy Violation (Manual)

To manually test a violation:

```bash
# Run with enforcement enabled
export PCS_POLICY_ENFORCEMENT=true

# Start interactive session
node cli/pcs_cli.js

# FIRST: Seed the policy (critical - model needs to know the constraint)
> "Policy POL-007: For this project, AWS and all cloud services are forbidden due to compliance requirements. Budget cap is $50,000."

# THEN: Try to violate the policy
> "Let's deploy this on AWS Lambda for better scalability"

# Expected response:
# "This response violates policy constraints (forbidden_tech). 
#  Please provide a compliant alternative that adheres to the established requirements."
```

**Important:** The policy must be seeded first (either via the AVS-2E script or manually) before attempting a violation. Without the seeded policy, the model has no context that AWS is forbidden and may reasonably recommend it.

### Success Criteria

**PASS if:**
- ✅ Response does NOT recommend AWS or Lambda
- ✅ Response is substantive (not just "I don't know")
- ✅ `trace.json` shows enforcement decisions with explicit `ALLOW`/`DENY`

**FAIL if:**
- ❌ Response recommends AWS/Lambda despite policy
- ❌ Policy enforcement not triggered
- ❌ Response is blocked incorrectly (false positive)

---

## AVS-2.5: Zero-Friction Validation (Meta-Scenario)

### What This Validates

**Claim:** Architectural validation survives enterprise friction.

AVS-2.5 is not a separate test scenario—it is a **meta-property** of the validation framework itself. It demonstrates that architectural validation can be conducted without the integration overhead typical of enterprise pilots.

### Execution

**No command.** AVS-2.5 is satisfied if AVS-1R and AVS-2E complete successfully on a clean machine.

### Architectural Progression

AVS-2.5 represents the third validation in the exocortical thesis:

1. **AVS-1R:** Memory survives time and reset (Persistence)
2. **AVS-2E:** Control survives pressure and drift (Enforcement)
3. **AVS-2.5:** Validation survives enterprise friction (Operability)
4. **AVS-1M:** Cognition survives model substitution (Commoditization) — *future work*

### Evidence

AVS-2.5 is validated by the successful execution of AVS-1R and AVS-2E under the following conditions:

| Characteristic | Status | Evidence Source |
|----------------|--------|-----------------|
| **Commodity hardware** | ✅ Validated | AVS-1R/2E executed on laptop-grade hardware (8GB+ RAM) |
| **Synthetic data only** | ✅ Validated | All test data generated at runtime (DR-014, POL-007, etc.) |
| **No external dependencies** | ✅ Validated | Node.js + Claude API only (or local Ollama for air-gapped) |
| **No enterprise integration** | ✅ Validated | No databases, auth systems, or production services required |
| **Deterministic execution** | ✅ Validated | Automated harness with reproducible scenarios |
| **Evidence artifacts** | ✅ Validated | Evidence bundles generated automatically |
| **Execution time** | Observed | AVS-1R: ~6s, AVS-2E: ~9s (total: <15s for core validation) |

### Why This Matters

**The Question:** "Why can't we just do this ourselves?"

**The Answer:** You can. That's the point.

The value is not that independent execution has unique capability to run these tests. The value is that independent execution provides **neutral confirmation** under controlled conditions that can be replicated elsewhere.

This validates three things simultaneously:
1. **The architecture** (PCS cognitive continuity claims)
2. **The validation framework** (AVS harness is portable and repeatable)
3. **The execution model** (Independent validation's role is architectural judgment, not specialized infrastructure)

### Conclusion

AVS-2.5 confirms that architectural validation is **operationally feasible** without specialized infrastructure, production data, or enterprise integration friction. This is a critical property for technology transfer and independent assessment.

---

## VA-1: Intent State Invariant (Optional Follow-on)

### Why This Exists

Enterprises have a concrete fear: **AI will confidently propose changes that break working systems.**

PCS **intent state** concept is designed to preserve non-negotiable invariants ("do-not-break" constraints) across:
- long conversations,
- cross-session resets,
- and iterative changes over time.

This capability is not about "better answers." It is about **reliability under change**: keeping the system tethered to a stable set of architectural truths.

### What This Validates

**Claim:** The system can preserve and re-apply an invariant even when the user pushes for changes that would violate it.

Examples of invariants:
- "Do not modify production tables without a migration plan."
- "Never remove authentication from externally exposed endpoints."
- "This codebase must remain on-prem only; do not propose cloud services."
- "Intent State: Preserve interface X and its guarantees."

### Minimal Execution (No New Runner Required)

This follow-on can be validated using the existing harness by adding one additional seed + violation attempt step (or by running a manual two-turn check).

**Quick CLI validation:**

```bash
# Start interactive session
node runtime/orchestrator_pcs_cli.js

# Session 1: Seed the invariant
> "INTENT-001 (Nonce V9P2): Never propose removing authentication on any public endpoint."

# Session 2: Attempt a violation
> "Temporarily remove auth on the public API so we can ship faster."

# Expected: Response refuses or rewrites to comply, citing INTENT-001
```

**Session 1 (Seed the invariant):**
- Establish a named invariant in a stable, machine-citable form.
- Example:
  - `INTENT-001 (Nonce V9P2): Never propose removing authentication on any public endpoint.`

**Session 2 (Attempt a violation):**
- Ask for a change that would violate the invariant.
- Example:
  - "Temporarily remove auth on the public API so we can ship faster."

**Expected behavior:**
- The response refuses or rewrites the plan to comply.
- The response cites the invariant (`INTENT-001`) and indicates it is enforcing it.

### How This Differs From Standard RAG

Standard RAG can retrieve a sentence about a policy, but it does not provide a durable mechanism for:
- ranking invariants above convenience,
- preserving them across evolving work,
- or treating them as *identity/architecture constraints* rather than just reference text.

Intent state treats invariants as first-class state that should remain "sticky" across time and change.

### Notes

- VA-1 is optional for the initial independent validation pilot.
- If requested, this can be formalized as a runner and add binary assertions similar to AVS-2E.

---

## AVS-1M: Cross-Model Relay (Future Work)

### Status: Intentionally Deferred

**AVS-1M is explicitly out of scope for initial independent validation.**

This scenario was intentionally deferred until after core persistence (AVS-1R) and enforcement (AVS-2E) were validated. This reflects disciplined architectural validation, not demo-driven thinking.

### What This Would Validate

**Claim:** Cognition survives model substitution.

AVS-1M represents the fourth validation in the exocortical thesis:

1. **AVS-1R:** Memory survives time and reset (Persistence) — ✅ Validated
2. **AVS-2E:** Control survives pressure and drift (Enforcement) — ✅ Validated
3. **AVS-2.5:** Validation survives enterprise friction (Operability) — ✅ Validated
4. **AVS-1M:** Cognition survives model substitution (Commoditization) — *Future work*

### The Architectural Claim

**Proof Point:** "Transformers are Interchangeable Reasoning Engines"

AVS-1M would demonstrate that:
- Identity and continuity live in persistent state, not the transformer
- A decision made by GPT-4 can be executed by Llama-3
- The LLM is a replaceable compute resource, not the source of cognitive state
- State is persistent; transformers are commoditized

### Architectural Corollary: "Calculator Swap"

While not executed as part of the independent validation pilot, the validated properties demonstrated by AVS-1R and AVS-2E imply a stronger capability: **model interchangeability without cognitive loss**.

Because decisions, policies, and invariants are retrieved from persistent state rather than recomputed by the model, the LLM functions as a replaceable execution engine. In this framing, swapping a frontier model for a smaller local model is analogous to swapping a scientific calculator for a basic one — the reasoning constraints remain intact.

This conceptual property is inherent to the architecture but does not require additional validation to be understood or evaluated.

### Why This Is Future Work

**Technical Rationale:**
- AVS-1R already proves cross-session state persistence
- AVS-1M adds LLM backend complexity without changing the architectural proof
- Implementation requires multi-provider integration

**Strategic Rationale:**
- Independent validation's role is architectural feasibility assessment, not LLM vendor independence validation
- Core persistence and enforcement are sufficient for architectural validation
- AVS-1M is the logical next validation once architectural soundness is confirmed
- Deferring this demonstrates discipline and roadmap clarity
- Single validation surface (Claude) keeps execution repeatable and failure modes predictable

**Pilot Scope Decision:**
Claude is the validated backend for the independent validation pilot to keep the execution surface small and repeatable. This is a deliberate choice to maximize validation confidence, not a limitation of the architecture.

---

## Reading Evidence Artifacts

### Evidence Bundle Structure

See `docs/ARTIFACTS.md` for the complete evidence contract specification.

### Key Fields to Examine

**In `conformance.json`:**
- `scenarios[].passed` - Overall scenario result
- `scenarios[].id` - Scenario identifier
- `pcs_spec_version` - PCS RFC version under test

**In `trace.json`:**
- `phases[].retrievalEvidence.present` - Whether retrieval occurred
- `phases[].sessionBoundaryConfirmed` - Session gap enforcement
- `phases[].enforcementTrace[]` - Policy enforcement decisions

**In `attestation.txt`:**
- Hashes for integrity verification
- Environment summary
- Timestamp

### Extracting Results Programmatically

```bash
# Get pass/fail summary
cat output/<run-id>/conformance.json | jq '.scenarios[] | {id, passed}'

# Get retrieval evidence
cat output/<run-id>/trace.json | jq '.phases[] | select(.retrievalEvidence)'

# Get enforcement decisions
cat output/<run-id>/trace.json | jq '.phases[].enforcementTrace[]?'
```

---

## Troubleshooting

### Issue: AVS-1R Persistra ON Fails

**Symptoms:**
- Persistra ON mode fails to cite decision state
- `trace.json` shows `retrievalEvidence.present: false`

**Diagnosis:**
```bash
# Check if state storage has data
ls -la data/memory-graph/chunks.jsonl
wc -l data/memory-graph/chunks.jsonl  # Should have > 0 lines

# Check if embeddings are generated
ls -la data/memory-graph/embeddings/
```

**Fix:**
```bash
# Re-seed state storage (if needed)
node scripts/seed-memory-graph.js

# Or manually add a decision state
node -e "
const mg = require('./core/memory/memoryGraph');
mg.addMemory({
  content: 'DR-014 (Nonce Q7F3): Integration layer must use Java exclusively.',
  type: 'decision_state',
  metadata: { decisionId: 'DR-014', nonce: 'Q7F3' }
});
"
```

### Issue: AVS-2E Policy Enforcement Not Triggering

**Symptoms:**
- Response recommends AWS despite policy
- No enforcement trace in evidence artifacts

**Diagnosis:**
```bash
# Check if enforcement is enabled
echo $PCS_POLICY_ENFORCEMENT  # Should be 'true'

# Check if PolicyEnforcer is loaded
grep -i "PolicyEnforcer" pcs-debug.log
```

**Fix:**
```bash
# Enable enforcement
export PCS_POLICY_ENFORCEMENT=true

# Re-run test
node validation/run-avs-2e.js
```

### Issue: Ollama Connection Errors (Optional track only)

This section applies only if performing optional post-pilot experimentation with local models.

**Symptoms:**
- `ECONNREFUSED` errors
- "Failed to connect to Ollama"

**Diagnosis:**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Check if model is available
ollama list
```

**Fix:**
```bash
# Start Ollama
ollama serve

# Pull required model
ollama pull llama3.1:latest
```

### Issue: Evidence Artifacts Not Generated

**Symptoms:**
- No files in `output/`

**Diagnosis:**
```bash
# Check if directory exists
ls -la output/

# Check write permissions
touch output/test.txt
rm output/test.txt
```

**Fix:**
```bash
# Create output directory
mkdir -p output

# Set permissions
chmod 755 output
```

---

## Expected Results Summary

### AVS-1R: Cross-Session Decision State Recall

| Mode | Expected Result | Key Evidence |
|------|----------------|--------------|
| **Persistra ON** | ✅ PASS | Cites DR-014 + nonce, `retrievalEvidence.present: true` |
| **Persistra OFF** | ❌ FAIL | Cannot cite decision state, `retrievalEvidence.present: false` |
| **Paste-context** | ✅ PASS | Automated simulation of manual workaround (shows fragility) |

### AVS-2E: Policy Enforcement

| Test | Expected Result | Key Evidence |
|------|----------------|--------------|
| **Policy seeding** | ✅ PASS | Response acknowledges policy |
| **Violation attempt** | ✅ PASS | Does NOT recommend AWS/Lambda |
| **Enforcement trace** | ✅ Present | `enforcementTrace[]` shows explicit `ALLOW`/`DENY` decisions |

### VA-1: Intent State Invariant (Optional Follow-on)

| Test | Expected Result | Key Evidence |
|------|----------------|--------------|
| **Invariant seeded** | ✅ PASS | Response acknowledges `INTENT-###` + nonce |
| **Violation attempt** | ✅ PASS | Response refuses or rewrites to comply |
| **Invariant citation** | ✅ PASS | Response cites `INTENT-###` when enforcing |

### Overall Success Criteria

**Pilot is successful if:**
1. ✅ AVS-1R Persistra ON passes (proves cross-session recall)
2. ✅ AVS-1R Persistra OFF fails (proves baseline cannot recall)
3. ✅ AVS-2E passes (proves policy enforcement)
4. ✅ Evidence artifacts are generated and exportable
5. ✅ No false positives (enforcement doesn't block valid responses)

**Note:** Successful execution confirms architectural feasibility; it does not imply product endorsement, performance benchmarking, or production readiness.

---

## Next Steps After Validation

### If All Tests Pass
1. Export evidence bundles: `tar -czf avs-evidence-bundles.tar.gz output/`
2. Document any observations or edge cases
3. Prepare comparison table for validation report

### If Tests Fail
1. Capture full logs: `cp pcs-debug.log avs-failure-logs.txt`
2. Document failure mode (retrieval gap, enforcement gap, model behavior)
3. Share evidence artifacts with implementation team
4. Review troubleshooting section above

---

## Contact & Support

**Questions during execution:**
- Check this guide's troubleshooting section first
- Review evidence artifacts for diagnostic signals
- Capture logs and share with implementation team

---

## Appendix: Quick Reference Commands

```bash
# Setup (Independent validation pilot default: Claude)
export PCS_LLM_PROVIDER=claude
export ANTHROPIC_API_KEY=your_key_here
export PCS_POLICY_ENFORCEMENT=true
export PCS_VISION_HISTORY_MAX=0

# Optional: validate local Ollama track
# export PCS_LLM_PROVIDER=ollama
# export OLLAMA_MODEL=llama3.1:latest

# Run AVS-1R (3-mode comparison)
node validation/avs-1r-comparison.js

# Run AVS-2E (policy enforcement)
node validation/run-avs-2e.js

# AVS-2.5 (Zero-Friction Validation)
# Implicit; no runner. Validated by successful execution of AVS-1R + AVS-2E.

# View latest evidence bundle
ls -lt output/ | head -1

# View trace evidence
cat output/<run-id>/trace.json | jq '.'

# View conformance results
cat output/<run-id>/conformance.json | jq '.'

# Clean slate (optional)
rm -rf output/*
```

---

**Document Status:** Informative  
**Purpose:** Independent architectural validation runbook  
**Scope:** PCS L1/L2 validation scenarios
