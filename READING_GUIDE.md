# Reading Guide

**Recommended reading paths for evaluating PCS architecture and validation**

**Last Updated:** 2026-07-12

---

## For Evaluators

**Goal:** Validate architectural claims through test execution and documentation review

### Quick Start (30 minutes)

1. **[START_HERE.md](START_HERE.md)** (5 min)
   - Architectural overview
   - Validation evidence summary

2. **Run validation suite** (~3 min)
   ```bash
   ./run_all.sh --mode audit
   ```

3. **[EVALUATOR_QUICKSTART.md](EVALUATOR_QUICKSTART.md)** (15 min)
   - Test execution guide
   - Output verification
   - Artifact inspection

### Complete Evaluation (2-4 hours)

4. **[TEST_METHODOLOGY.md](TEST_METHODOLOGY.md)** (1-2 hours)
   - Detailed methodology for all 25 tests
   - Property validated, test design, key evidence
   - Architectural significance, failure modes

5. **[VERIFICATION_SUITE.md](VERIFICATION_SUITE.md)** (1 hour)
   - Falsification criteria for all tests
   - What each test proves/doesn't prove
   - Expected vs. actual results

6. **[THE_PERSISTRA_ARCHITECTURE.md](THE_PERSISTRA_ARCHITECTURE.md)** (1-2 hours)
   - Complete architectural overview
   - Six architectural invariants
   - Validation status

---

## For Architects

**Goal:** Understand complete PCS architecture and validation approach

### Reading Order (4-6 hours)

1. **[START_HERE.md](START_HERE.md)** (10 min)
   - Architectural problem and claim
   - Paste condition diagnostic
   - Validation evidence

2. **[THE_PERSISTRA_ARCHITECTURE.md](THE_PERSISTRA_ARCHITECTURE.md)** (2-3 hours)
   - Complete technical architecture
   - Six architectural invariants
   - Real model validation
   - Hardware acceleration path

3. **[TEST_METHODOLOGY.md](TEST_METHODOLOGY.md)** (1-2 hours)
   - Complete test methodology
   - EVS, AVS, CTS breakdown
   - Architectural validation approach

4. **[VERIFICATION_SUITE.md](VERIFICATION_SUITE.md)** (1 hour)
   - Falsification-based test descriptions
   - Honest scope boundaries

5. **[PLATFORM_ECONOMICS.md](PLATFORM_ECONOMICS.md)** (30 min)
   - Stateless vs. substrate-centric economics
   - Architectural implications

---

## For Research Collaboration

**Goal:** Understand research contribution and validation methodology

### Reading Order (3-5 hours)

1. **[START_HERE.md](START_HERE.md)** (10 min)
   - Research positioning
   - Validation evidence

2. **[THE_PERSISTRA_ARCHITECTURE.md](THE_PERSISTRA_ARCHITECTURE.md)** (2 hours)
   - Central architectural claim
   - Six invariants
   - Validation approach

3. **[TEST_METHODOLOGY.md](TEST_METHODOLOGY.md)** (1-2 hours)
   - Complete methodology
   - Falsification criteria
   - What tests prove/don't prove

4. **[VERIFICATION_SUITE.md](VERIFICATION_SUITE.md)** (1 hour)
   - Honest scope boundaries
   - Test limitations

5. **Run validation suite**
   ```bash
   ./run_all.sh --mode audit
   ```

---

## Validation Status

**Test suite:**
- 25 tests (13 EVS, 7 AVS, 15 CTS)
- 312 machine-verified assertions
- 100% pass rate

**Hardware validation:**
- Tenstorrent CSE Phase 1 complete
- 8 hardware compatibility fixtures
- JS/C++ parity verified

**Models tested:**
- Claude 3 Haiku (Anthropic)
- Llama 3.1 8B (Groq)
- Mock (deterministic test doubles)

---

## Quick Reference

**"Where do I start?"**  
→ [START_HERE.md](START_HERE.md)

**"How do I run the tests?"**  
→ `./run_all.sh --mode audit`

**"What's the complete methodology?"**  
→ [TEST_METHODOLOGY.md](TEST_METHODOLOGY.md)

**"What are the falsification criteria?"**  
→ [VERIFICATION_SUITE.md](VERIFICATION_SUITE.md)

**"What's the complete architecture?"**  
→ [THE_PERSISTRA_ARCHITECTURE.md](THE_PERSISTRA_ARCHITECTURE.md)

**"Where are the test artifacts?"**  
→ `audit-artifacts/` directory

---

## Contact

**For research collaboration and evaluation:**  
research@persistra.ai

**For licensed deployment:**  
licensing@persistra.ai
