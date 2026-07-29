# Independent Verification Procedure

**Purpose:** Reproduce evidence bundles from tagged releases.

---

## Prerequisites

- Node.js v18+ (tested with v22.14.0)
- Git
- macOS/Linux (Windows untested)

---

## Procedure

### 1. Clone repositories at tagged commits

```bash
# Clone CTS runner
git clone https://github.com/persistra-ai/persistra-cts.git
cd persistra-cts
git checkout cts-v0.1.0-evidence

# Clone reference kernel
cd ..
git clone https://github.com/persistra-ai/persistra-kernel.git
cd persistra-kernel
git checkout kernel-v0.1.0-min
```

### 2. Run scenario

```bash
cd ../persistra-cts
node runners/run-cts.js \
  --target ../persistra-kernel \
  --scenario L1.persistence.decision-state-recovery \
  --clean
```

**Expected output:**
```
[PCS-CTS] Result: PASS
[PCS-CTS] Target fingerprint: eea78ab0052a32e9...
```

### 3. Verify evidence bundle

```bash
node runners/verify-evidence.js output/<run-id>
```

**Expected output:**
```
=== PCS-CTS Evidence Verification ===

Bundle: output/<run-id>

Verifying conformance.json...
  ✅ conformance.json hash matches
Verifying trace.json...
  ✅ trace.json hash matches
Verifying target fingerprint...
  ✅ Target fingerprint matches

==================================================
✅ VERIFIED: All evidence checks passed
```

### 4. Compare fingerprints

**Expected target fingerprint (kernel-v0.1.0-min):**
```
eea78ab0052a32e911f4b966e8b320123325503f2b2b40e053d8119207302a14
```

If your fingerprint matches, you have successfully reproduced the evidence bundle.

---

## All Scenarios

Run each scenario individually:

```bash
# L1 scenarios
node runners/run-cts.js --target ../persistra-kernel \
  --scenario L1.persistence.decision-state-recovery --clean

node runners/run-cts.js --target ../persistra-kernel \
  --scenario L1.persistence.session-boundary-integrity --clean

# L2 scenario
node runners/run-cts.js --target ../persistra-kernel \
  --scenario L2.governance.policy-enforcement --clean

# L3 scenario
node runners/run-cts.js --target ../persistra-kernel \
  --scenario L3.continuity.model-transition-decision-recovery --clean
```

All scenarios should report `PASS`.

---

## Troubleshooting

**Dirty build error:**
```
Error: Target build is DIRTY (uncommitted changes detected).
```
- Ensure you checked out the exact tagged commit
- Check `git status` in both repositories
- No uncommitted changes should exist

**Fingerprint mismatch:**
- Verify Node.js version matches (v22.14.0 recommended)
- Verify OS/architecture (darwin arm64 tested)
- Check git tags are correct
- Ensure no local modifications

**Verification failed:**
- Re-clone repositories at tagged commits
- Delete `output/` directory and re-run
- Check for file system corruption

---

## Notes

- Evidence bundles are written to `output/<run-id>/`
- Each run generates a unique run ID (timestamp + nonce)
- Verification script recomputes fingerprints from source
- Clean builds only (dirty builds fail by default)
