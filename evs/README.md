# Exocortical Validation Suite (EVS)

## Purpose

EVS demonstrates that PCS architecture creates paradigm-shifting properties that cannot be pattern-matched to "improved RAG" or "governance layer."

The test suite is designed to validate:
- **Development continuity is a substrate property** (not a model property)
- **Institutional cognition survives session death** (not just runtime continuity)
- **Intentional state restoration** (not prompt reconstruction)
- **Governed code generation** (preventative, not corrective)

## EVS-6: Development Continuity

**Assumption Invalidated:** "Development continuity is a model property"

**Claim:** "Development continuity is a substrate property"

### Test Flow

1. **Session 1:** Create Vision Anchor, Decision Records, Policy Constraints, Next Steps
2. **Session Termination:** Hard kill (new process, no context carryover)
3. **Session 2:** User says "continue"
4. **PCS-ON:** Restores all state from substrate
5. **PCS-OFF:** Fails structural restoration

### Quick Start

```bash
# Run EVS-6 test
cd evs
node evs6-test.js
```

### Output Structure

```
evs/results/evs6-{timestamp}/
├── pcs-on/
│   ├── session1_output.json
│   ├── session1_state_commit_traces.json
│   ├── session2_prompt_dump.json
│   ├── pcs_on_restored_state_dump.json
│   ├── pcs_on_session2_output.json
│   ├── continuity_diff.json
│   └── assertions.json
└── pcs-off/
    ├── session1_output.json
    ├── session2_prompt_dump.json
    ├── pcs_off_session2_output.json
    ├── continuity_diff.json
    └── assertions.json
```

### Key Artifacts

**`session2_prompt_dump.json`** - Proves no prior state in prompt
- Most psychologically important artifact
- Shows prompt is just "continue" (no context carryover)

**`pcs_on_restored_state_dump.json`** - Proves substrate authority
- Shows Vision Anchor ID, Decision IDs, Policy IDs restored from substrate
- Not reconstructed from code or prompt

**`continuity_diff.json`** - Machine-verifiable structural comparison
- Compares expected vs actual restoration
- Binary pass/fail for each marker

**`assertions.json`** - Audit-grade validation
- EVS-6.A1: Vision Anchor restored
- EVS-6.A2: Decision IDs restored
- EVS-6.A3: Policy IDs restored
- EVS-6.A4: Session2 prompt lacks prior state
- EVS-6.A5: Structural restoration successful

### Why This Matters

After EVS-6, evaluators cannot say:
- "This is just RAG" (RAG doesn't restore intentional state)
- "This is just persistence" (persistence doesn't survive session death with structural fidelity)
- "This is just orchestration" (orchestration doesn't enable governed code generation)
- "This only matters in regulated sectors" (it affects daily development)

EVS-6 proves:
- Development continuity is substrate-bound
- Institutional memory is queryable and auditable
- AI-assisted development can be governed (preventative, not corrective)
- Meta-programming is viable (PCS developing PCS)

## Fixture Repository

The test uses a minimal development scenario:

**Task:** Add rate limiting to API layer

**Constraints:**
- No external dependencies
- Deterministic behavior
- Minimal implementation

This generates:
- Vision Anchor (architectural vision)
- Decision Records (key choices)
- Policy Constraints (enforcement rules)
- Next Steps (ordered plan)

## Integration with Existing Tests

EVS complements CTS/AVS:

| Test | Proves |
|------|--------|
| CTS L1-L4 | Persistence, determinism, portability |
| AVS-1R | Decision retrieval works |
| AVS-2C | Policy enforcement works |
| **EVS-6** | **Development continuity is substrate property** |

EVS-6 is the paradigm-shift test that invalidates RAG pattern-matching.

## Test Coverage Status

**Current:** Proof-of-concept validation (v2.0)
- **Provider:** Anthropic Claude 3 Haiku
- **Runs:** 5 consecutive (100% pass rate)
- **Temperature:** Default
- **Prompt:** "continue" only
- **Scenario:** Single development task (rate limiting)

**Production-grade validation requires:**
- ≥10 runs per provider
- Multiple providers (Anthropic, OpenAI)
- Temperature variance (0.0, 0.7)
- Prompt variation testing
- Adversarial continuation phrases
- Complex scenarios (conflicting decisions, multi-file refactors)

**Current results demonstrate:**
- ✅ Architectural feasibility
- ✅ Substrate-mediated retrieval works
- ✅ Gold standard artifact generation
- ✅ "Just RAG" pattern-matching invalidated

**Current results do NOT demonstrate:**
- ❌ Multi-provider robustness
- ❌ Temperature-invariant behavior
- ❌ Adversarial resilience
- ❌ Complex state management
- ❌ Production deployment readiness

## Scenario Boundaries

### What EVS-6 v2.0 Demonstrates

**Architectural claim:**
- Development continuity is a substrate property
- Intentional state survives session death
- Restoration is substrate-mediated, not prompt-reconstructed

**Test scenario:**
- Single development task (add rate limiting)
- Linear decision sequence (no conflicts)
- Single policy constraint (no contradictions)
- Ordered next steps (no ambiguity)
- Clean state restoration (no drift)

### What EVS-6 v2.0 Does NOT Demonstrate

**Out of scope for v2.0:**
- Conflicting decision resolution
- Ambiguous step index handling
- Multi-file refactor coordination
- Incremental vision anchor evolution
- Policy conflict arbitration
- Decision rollback mechanisms
- Concurrent session management

**Why this is acceptable:**

EVS-6 v2.0 is a **minimal proof** that substrate-mediated retrieval works.

It is not a **comprehensive proof** of production-ready development continuity.

## References

- `EVS_Proposal.md` - Full specification
- `ARCHITECTURAL_IMPLICATIONS.md` Section 9 - Development implications
- `TEST_REPRODUCTION_GUIDE.md` - Test execution guide
