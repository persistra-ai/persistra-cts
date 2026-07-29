# Additional PCS Validation

Beyond the main 25-test suite, PCS provides additional validation materials for comprehensive evaluation.

---

## Main Test Suite

**25 tests, 252 machine-verified assertions**

```bash
npm run test:all
```

**Runtime:** ~30 minutes  
**Pass rate:** 100%

**See:** [EVALUATOR_QUICKSTART.md](EVALUATOR_QUICKSTART.md) for quick start guide

---

## Additional Validation Components

### 1. Paste Condition Test (AVS-2P)

**An architecturally significant test in the validation suite.**

Validates that governance enforcement is a structural property of the substrate, not achievable through prompt engineering.

**Quick demo:** ~3 minutes  
**Full validation:** ~30 minutes

**📄 See:** [PASTE_CONDITION.md](PASTE_CONDITION.md) for complete documentation

---

### 2. Hardware Compatibility Testing

Validates PCS primitives on Tenstorrent CSE (specialized silicon).

**Fixtures:** 8  
**Checks:** 32  
**Runtime:** ~5 minutes

**📄 See:** [HARDWARE_VALIDATION.md](HARDWARE_VALIDATION.md) for complete documentation

---

### 3. 9-Act Demonstration Suite

**Purpose:** End-to-end demonstration of PCS in a real coding workflow

**Status:** Complete (2026-03-18)

**What it demonstrates:**
- Governed code generation with runtime policy enforcement
- Constraint enforcement with cryptographic evidence trails
- Decision provenance across multi-turn interactions
- Authoritative state recording for decisions and constraints

**Acts covered:**
1. Initial code generation request
2. Constraint application (security policy)
3. Code modification with constraint awareness
4. Constraint violation detection
5. Enforcement action (code rejection)
6. Compliant code generation
7. State persistence across sessions
8. Decision retrieval and replay
9. Audit trail verification

**Runtime:** ~15 minutes (interactive)

**Documentation:** See demo documentation in repository

**Key insight:** The demo shows PCS managing real development workflows, not just passing tests.

---

### 4. Developer Tutorial

**Purpose:** Hands-on integration guide for developers

**Repository:** [pcs-developer-runtime](https://github.com/persistra-ai/pcs-developer-runtime)

**What you'll learn:**
- How to integrate PCS into your application
- Core primitive usage patterns
- Policy definition and enforcement
- State management and retrieval
- Audit trail generation
- Error handling and fail-closed behavior

**Prerequisites:**
- Node.js 18+
- Basic understanding of async/await
- Familiarity with LLM APIs

**Time to complete:** ~30 minutes

**Setup:**
```bash
cd ..
git clone https://github.com/persistra-ai/pcs-developer-runtime
cd pcs-developer-runtime
npm install
```

**Follow the tutorial:** See README.md in the tutorial repository

---

## Complete Validation Workflow

For comprehensive validation of all PCS claims:

```bash
# 1. Main test suite (25 tests, 312 assertions, ~30 min)
cd persistra-cts
npm run test:all

# 2. Paste condition quick demo (~3 min)
node avs-harness/demo-paste-condition.js

# 3. Optional: Full paste condition validation (~30 min)
# node avs-harness/run-avs2p-matrix.js

# 4. Hardware validation (~5 min)
cd ../pcs-tt-primitive-validation
./run_validation.sh

# 5. Optional: Review 9-Act demo (see demo docs)

# 6. Optional: Complete developer tutorial (see separate repo)
```

**Total validation time:** ~40 minutes (main suite + quick demo + hardware)  
**With full AVS-2P:** ~70 minutes

---

## API Key Requirements

| Component | ANTHROPIC_API_KEY | GROQ_API_KEY | Notes |
|-----------|-------------------|--------------|-------|
| Main suite (25 tests) | ✅ Required | ❌ Not required | Most tests use Claude |
| Paste Condition (quick demo) | ✅ Required | ❌ Not required | Claude only |
| Paste Condition (full) | ✅ Required | ✅ Required | Claude + Llama 3.1 8B |
| Hardware validation | ❌ Not required | ❌ Not required | No LLM calls |
| 9-Act demo | ✅ Required | ❌ Not required | Claude |
| Developer tutorial | ✅ Required | ❌ Not required | Claude |

**Setting API Keys:**

```bash
# In .env file
ANTHROPIC_API_KEY=your_anthropic_key_here
GROQ_API_KEY=your_groq_key_here  # Only for full AVS-2P validation

# Or export directly
export ANTHROPIC_API_KEY=your_anthropic_key_here
export GROQ_API_KEY=your_groq_key_here
```

---

## Next Steps

After running the validation package:

1. **Review artifacts:** Check `./audit-artifacts/` for detailed test outputs
2. **Verify hashes:** Compare cryptographic hashes in manifests
3. **Read methodology:** See [TEST_METHODOLOGY.md](TEST_METHODOLOGY.md) for detailed test design
4. **Explore architecture:** Read [THE_PERSISTRA_ARCHITECTURE.md](THE_PERSISTRA_ARCHITECTURE.md) for system overview
5. **Try the demo:** Review the 9-Act demonstration suite
6. **Complete tutorial:** Hands-on integration guide in separate repo

---

## Questions?

- **Core suite documentation:** See [EVALUATOR_QUICKSTART.md](EVALUATOR_QUICKSTART.md)
- **Paste condition test:** See [PASTE_CONDITION.md](PASTE_CONDITION.md)
- **Hardware validation:** See [HARDWARE_VALIDATION.md](HARDWARE_VALIDATION.md)
- **Test methodology:** See [TEST_METHODOLOGY.md](TEST_METHODOLOGY.md)
- **Architecture overview:** See [THE_PERSISTRA_ARCHITECTURE.md](THE_PERSISTRA_ARCHITECTURE.md)
- **Validation evidence:** See [VALIDATION_EVIDENCE.md](VALIDATION_EVIDENCE.md)
