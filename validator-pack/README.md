# PCS-CTS Validator Pack

**One-command independent validation of PCS conformance claims.**

This package contains everything needed to independently verify that the reference kernel implementation conforms to the Persistent Cognitive State (PCS) specification at levels L1, L2, and L3.

---

## What's Included

- **persistra-cts** - PCS Conformance Test Suite at tag `cts-v0.1.0-evidence`
- **persistra-kernel** - Reference kernel implementation at tag `kernel-v0.1.0-min`
- **run.sh** - One-command validation script (Unix/Linux/macOS)
- **run.ps1** - One-command validation script (Windows PowerShell)

---

## Quick Start

### Prerequisites

- **Node.js v18+** (tested with v22.14.0)
- **Git** (for tag verification)

### Unix/Linux/macOS

```bash
chmod +x run.sh
./run.sh
```

### Windows PowerShell

```powershell
.\run.ps1
```

---

## What the Script Does

1. **Runs all 10 conformance scenarios:**
   - L1: Persistence (2 scenarios)
   - L2: Governance (4 scenarios)
   - L3: Continuity (4 scenarios)

2. **Generates evidence bundles** for each scenario containing:
   - `conformance.json` - Test results and metadata
   - `trace.json` - Execution trace with observable evidence
   - `attestation.txt` - Cryptographic attestation

3. **Verifies evidence bundles** by:
   - Recomputing CTS and target fingerprints
   - Verifying conformance.json and trace.json hashes
   - Checking for dirty builds
   - Validating git tags

4. **Reports results:**
   - ✅ All scenarios passed
   - ✅ All evidence verified
   - Evidence bundles location

---

## Expected Output

```
=== PCS-CTS Validator Pack ===

Running 10 scenarios...

Running: L1.persistence.decision-state-recovery
  ✅ PASS
Running: L1.persistence.session-boundary-integrity
  ✅ PASS
...

=== Results ===
Passed: 10 / 10
Failed: 0 / 10

=== Verifying Evidence Bundles ===

Verifying: run-2026-02-13T...
  ✅ VERIFIED
...

✅ SUCCESS: All scenarios passed and all evidence verified!
```

---

## What This Proves

✅ **Conformance:** The reference kernel conforms to PCS L1/L2/L3 requirements

✅ **Reproducibility:** Evidence bundles are cryptographically verifiable

✅ **Independence:** You can reproduce these results without trusting the original authors

✅ **Transparency:** All source code, tests, and evidence are inspectable

---

## Evidence Bundles

After running the script, evidence bundles are located in:
- Unix/Linux/macOS: `persistra-cts/output/`
- Windows: `persistra-cts\output\`

Each bundle contains:

### conformance.json
```json
{
  "pcs_spec_version": "v0.1-draft",
  "pcs_cts_version": "0.1.0",
  "scenarios": [
    {
      "id": "L1.persistence.decision-state-recovery",
      "passed": true
    }
  ],
  "passed": true,
  "cts_build": {
    "commit": "...",
    "tag": "cts-v0.1.0-evidence",
    "dirty": false,
    "fingerprint": "..."
  },
  "target_build": {
    "commit": "...",
    "tag": "kernel-v0.1.0-min",
    "dirty": false,
    "fingerprint": "..."
  }
}
```

### trace.json
Observable evidence fields for each scenario phase (binary/categorical only).

### attestation.txt
Cryptographic attestation with:
- Timestamp
- Hashes of conformance.json and trace.json
- CTS runner fingerprint (SHA256)
- Target kernel fingerprint (SHA256)
- Git metadata (commit, tag, dirty status)
- Runtime metadata (Node version, OS, architecture)

---

## Manual Verification

If you want to run scenarios individually:

```bash
cd persistra-cts

# Run a single scenario
node runners/run-cts.js \
  --target ../persistra-kernel \
  --scenario L1.persistence.decision-state-recovery \
  --clean

# Verify the evidence bundle
node runners/verify-evidence.js output/<run-id>
```

---

## Expected Fingerprints

**CTS Runner (cts-v0.1.0-evidence):**
- Fingerprint will vary based on your environment

**Reference Kernel (kernel-v0.1.0-min):**
- Expected: `eea78ab0052a32e911f4b966e8b320123325503f2b2b40e053d8119207302a14`
- If your fingerprint matches, you've successfully reproduced the evidence

---

## Troubleshooting

### "Node.js is required but not installed"
Install Node.js v18+ from https://nodejs.org

### "Dirty build detected"
The repositories have uncommitted changes. This validator pack should contain clean tagged releases. If you see this error, the package may be corrupted.

### "Fingerprint mismatch"
- Verify you're using the correct Node.js version (v22.14.0 recommended)
- Verify you're on the correct OS/architecture (darwin arm64 tested)
- Check that git tags are correct

### "Permission denied" (Unix/Linux/macOS)
```bash
chmod +x run.sh
```

---

## Documentation

- **INDEPENDENT_VERIFICATION.md** - Step-by-step verification guide
- **TRACEABILITY.md** - RFC requirements → CTS scenarios → Evidence fields
- **EVIDENCE_CONTRACT_v0.1.0.md** - Complete evidence contract specification
- **TARGET_INTERFACE.md** - Test harness interface contract

All documentation is in `persistra-cts/docs/`

---

## Support

- **Issues:** https://github.com/persistra-ai/persistra-cts/issues
- **Discussions:** https://github.com/persistra-ai/persistra-cts/discussions

---

## License

See LICENSE files in each repository.

---

## Version

**Validator Pack Version:** v0.1.0  
**CTS Version:** cts-v0.1.0-evidence  
**Kernel Version:** kernel-v0.1.0-min  
**Release Date:** February 13, 2026
