# Persistra Runtime — Evaluator Quickstart

**Version:** 1.0.0  
**Status:** FROZEN  
**Date:** 2026-03-03

---

## 🎯 Reference Demonstration (March 2026)

**Demonstration Domain:** Software engineering environments provide clear visibility into PCS architectural properties

**See:** `SOFTWARE_ENGINEERING_DEMO_SPEC.md` for demonstration specification

**All tests below remain valid and frozen at v1.0.0**

---

## One-Command Reproducibility

```bash
cd persistra-cts
./run_all.sh --mode audit
```

**That's it.** The script runs all 25 tests and produces a complete evaluation report.

---

## What It Does

### Phase 1: Run EVS Tests (13 tests)
- EVS-1: Governance Failure
- EVS-2: Context Failure
- EVS-3: Engine Replacement (FLAGSHIP)
- EVS-4: Parameter Inversion
- EVS-5: Deterministic Reproduction
- EVS-6: Development Continuity
- EVS-7: Semantic Retrieval
- EVS-8: Vision Anchor Persistence
- EVS-9: Air-Gapped Operation
- EVS-10: Contextual Salience Engine
- EVS-11: Meta-Programming Interface

### Phase 2: Run AVS Tests (6 tests)
- AVS-1P: Policy Gate
- AVS-1R: Decision Retrieval
- AVS-2A: Audit Layer
- AVS-2E: Orchestrator Binding

### Phase 3: Run CTS Tests (6 tests)
- CTS-L1: Session Boundary
- CTS-L1: Decision Recovery
- CTS-L2: Policy Enforcement
- CTS-L3: CMCC (Cross-Model Cognitive Continuity)
- CTS-L4: Federation

### Phase 4: Generate Combined Manifest
- PASS/FAIL summary
- Test results by suite
- Architecture invariants validated
- Primitives validated (15 total)
- Threat mitigations validated
- Falsifiability status

### Phase 5: Generate Cryptographic Manifest (Audit Mode)
- SHA256 hashes of all test logs
- SHA256 hash of combined manifest
- Verifiable with `shasum -c`

---

## Output

### Standard Mode

```bash
./run_all.sh
```

**Produces:**
- `audit-artifacts/combined-run-YYYYMMDD-HHMMSS/`
  - `COMBINED_MANIFEST.txt` - Complete evaluation report
  - `*.log` - Individual test logs (20 files)

**Time:** ~2-3 minutes

---

### Audit Mode

```bash
./run_all.sh --mode audit
```

**Produces:**
- `audit-artifacts/combined-run-YYYYMMDD-HHMMSS/`
  - `COMBINED_MANIFEST.txt` - Complete evaluation report
  - `MANIFEST.sha256` - Cryptographic manifest
  - `*.log` - Individual test logs (20 files)

**Time:** ~2-3 minutes

---

## Options

```bash
./run_all.sh [OPTIONS]

Options:
  --mode audit      Generate cryptographic manifest with SHA256 hashes
  --verbose         Show detailed error output for failed tests
  --output DIR      Specify custom output directory
```

---

## Example Output

```
╔════════════════════════════════════════════════════════════════╗
║  Persistra Runtime — Evaluator Flow v1.0.0                    ║
║  Contract Version: 1.0.0 (FROZEN)                              ║
╚════════════════════════════════════════════════════════════════╝

Mode: AUDIT (full artifacts + manifest)
Output: ./audit-artifacts/combined-run-20260303-151800

═══════════════════════════════════════════════════════════════
Phase 1: EVS (Exocortical Validation Suite) — 13 tests
═══════════════════════════════════════════════════════════════

Running: EVS-1-Governance-Failure
✅ PASS: EVS-1-Governance-Failure

Running: EVS-2-Context-Failure
✅ PASS: EVS-2-Context-Failure

[... 18 more tests ...]

═══════════════════════════════════════════════════════════════
Phase 4: Generate Combined Manifest
═══════════════════════════════════════════════════════════════

✅ Combined manifest generated: ./audit-artifacts/combined-run-20260303-151800/COMBINED_MANIFEST.txt

╔════════════════════════════════════════════════════════════════╗
║  Test Execution Complete                                      ║
╚════════════════════════════════════════════════════════════════╝

✅ ALL TESTS PASSED
   Total: 25/25
   Assertions: 252

Output Directory: ./audit-artifacts/combined-run-20260303-151800
Combined Manifest: ./audit-artifacts/combined-run-20260303-151800/COMBINED_MANIFEST.txt

**Note:** The test suite contains 312 assertions across 25 tests. Additional validation includes hardware compatibility testing and demonstration suite. See [OPTIONAL_TESTS.md](OPTIONAL_TESTS.md) for details.
Cryptographic Manifest: ./audit-artifacts/combined-run-20260303-151800/MANIFEST.sha256

Next Steps:
  1. Review combined manifest: cat ./audit-artifacts/combined-run-20260303-151800/COMBINED_MANIFEST.txt
  2. Review architecture invariants (section 3 of manifest)
  3. Check individual test logs in: ./audit-artifacts/combined-run-20260303-151800/
  4. Verify hashes: shasum -c ./audit-artifacts/combined-run-20260303-151800/MANIFEST.sha256
```

---

## Combined Manifest Structure

The `COMBINED_MANIFEST.txt` includes:

### 1. Test Execution Summary
- Total tests: 25
- Passed/Failed counts
- Success rate
- Total assertions

### 2. Test Results by Suite
- EVS results (13 tests)
- AVS results (6 tests)
- CTS results (6 tests)

### 3. Architecture Invariants Validated
- Invariant 1: Governance Relocation ✅
- Invariant 2: State Persistence ✅
- Invariant 3: Deterministic Reproduction ✅
- Invariant 4: Salience-Based Selection ✅
- Invariant 5: Runtime-Governed Capabilities ✅

### 4. Architectural Membranes Validated
- Engine Membrane (Model ≠ Identity) ✅
- Memory Membrane (Model ≠ Continuity) ✅
- Tool Membrane (Model ≠ Capability Execution) ✅

### 5. Primitives Validated (15 total)
- 6 Tier-1 primitives
- 9 Tier-2 primitives

### 6. Threat Mitigations Validated
- Model Fabrication Risk ✅
- Insertion-Order Bias ✅
- Semantic Dependency Risk ✅
- Tool Hijack Risk ✅
- Audit Tampering ✅

### 7. Falsifiability Criteria
- All 13 EVS tests include falsification criteria
- None were falsified

### 8. Artifact Locations
- Test logs
- Combined manifest
- Individual artifacts

---

## Verification

### Verify Cryptographic Manifest

```bash
cd audit-artifacts/combined-run-YYYYMMDD-HHMMSS
shasum -c MANIFEST.sha256
```

**Expected output:**
```
EVS-1-Governance-Failure.log: OK
EVS-2-Context-Failure.log: OK
[... 18 more ...]
COMBINED_MANIFEST.txt: OK
```

---

## Prerequisites

**Required:**
- Node.js 18+ (for test execution)
- Bash shell (macOS, Linux, WSL)

**Optional (for real model tests):**
- Anthropic API key (for Claude tests)
- Groq API key (for Llama tests)
- OpenAI API key (for semantic retrieval tests)

**Note:** Most tests use mock providers and work without API keys.

---

## Troubleshooting

### Test Failures

```bash
./run_all.sh --verbose
```

Shows detailed error output for failed tests.

### Missing Dependencies

```bash
cd persistra-cts
npm install
```

### Permission Denied

```bash
chmod +x run_all.sh
```

---

## What This Proves

**Running `./run_all.sh --mode audit` proves:**

1. ✅ **All 25 tests pass** (100% runtime-bound, 252 assertions in run_all.sh)
2. ✅ **All 6 invariants validated** (frozen at v1.0.0)
3. ✅ **All 3 membranes validated** (Engine, Memory, Tool)
4. ✅ **All 15 primitives validated** (6 Tier-1, 9 Tier-2)

**Additional validation:** Hardware compatibility testing and demonstration suite. See [OPTIONAL_TESTS.md](OPTIONAL_TESTS.md).
5. ✅ **All 5 threat mitigations validated** (fail-closed)
6. ✅ **Falsification criteria defined** (none falsified)
7. ✅ **Cryptographic manifest** (SHA256 hashes)

**Time to reproduce:** ~2-3 minutes

**Evaluators love one-command reproducibility.**

---

## Next Steps

After running `./run_all.sh --mode audit`:

1. **Review the combined manifest**
   ```bash
   cat audit-artifacts/combined-run-*/COMBINED_MANIFEST.txt
   ```

2. **Read the core documents**
   - `ARCHITECTURE_INVARIANTS.md` - Core thesis
   - `VERIFICATION_SUITE.md` - Falsifiability criteria
   - `THREAT_MODEL.md` - Adversarial thinking
   - `VALIDATION_EVIDENCE.md` - Test results
   - `CLAIMS_BOUNDARY.md` - Honest scope

3. **Verify cryptographic integrity**
   ```bash
   cd audit-artifacts/combined-run-*/
   shasum -c MANIFEST.sha256
   ```

4. **Review individual test logs** (if needed)
   ```bash
   ls audit-artifacts/combined-run-*/
   ```

---

**End of Evaluator Quickstart**
