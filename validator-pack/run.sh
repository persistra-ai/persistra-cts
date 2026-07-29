#!/bin/bash
set -e

# PCS-CTS Validator Pack
# One-command independent validation
#
# This script runs all CTS scenarios against the reference kernel,
# generates evidence bundles, and verifies them cryptographically.

echo "=== PCS-CTS Validator Pack ==="
echo ""
echo "This will run all conformance scenarios and verify evidence bundles."
echo "Expected runtime: ~30 seconds"
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required but not installed."
    echo "Please install Node.js v18+ from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node --version)
echo "Node.js version: $NODE_VERSION"
echo ""

# Determine script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CTS_DIR="$SCRIPT_DIR/persistra-cts"
KERNEL_DIR="$SCRIPT_DIR/persistra-kernel"

# Verify directories exist
if [ ! -d "$CTS_DIR" ]; then
    echo "Error: CTS directory not found: $CTS_DIR"
    exit 1
fi

if [ ! -d "$KERNEL_DIR" ]; then
    echo "Error: Kernel directory not found: $KERNEL_DIR"
    exit 1
fi

# List of scenarios to run
SCENARIOS=(
    "L1.persistence.decision-state-recovery"
    "L1.persistence.session-boundary-integrity"
    "L2.governance.policy-enforcement"
    "L2.governance.policy-determinism-repeatability"
    "L2.governance.policy-continuity-across-boundary"
    "L2.governance.namespace-isolation"
    "L3.continuity.model-transition-decision-recovery"
    "L3.continuity.multi-hop-transition"
    "L3.continuity.policy-survives-transition"
    "L3.continuity.conflict-resolution-stable"
)

echo "Running ${#SCENARIOS[@]} scenarios..."
echo ""

# Run each scenario
PASSED=0
FAILED=0
BUNDLES=()

for SCENARIO in "${SCENARIOS[@]}"; do
    echo "Running: $SCENARIO"
    
    if node "$CTS_DIR/runners/run-cts.js" \
        --target "$KERNEL_DIR" \
        --scenario "$SCENARIO" \
        --clean > /dev/null 2>&1; then
        echo "  ✅ PASS"
        PASSED=$((PASSED + 1))
        
        # Find the most recent evidence bundle
        LATEST_BUNDLE=$(ls -t "$CTS_DIR/output" | head -1)
        if [ -n "$LATEST_BUNDLE" ]; then
            BUNDLES+=("$CTS_DIR/output/$LATEST_BUNDLE")
        fi
    else
        echo "  ❌ FAIL"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "=== Results ==="
echo "Passed: $PASSED / ${#SCENARIOS[@]}"
echo "Failed: $FAILED / ${#SCENARIOS[@]}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo "❌ Some scenarios failed. Check output above for details."
    exit 1
fi

echo "=== Verifying Evidence Bundles ==="
echo ""

# Verify each evidence bundle
VERIFIED=0
VERIFICATION_FAILED=0

for BUNDLE in "${BUNDLES[@]}"; do
    BUNDLE_NAME=$(basename "$BUNDLE")
    echo "Verifying: $BUNDLE_NAME"
    
    if node "$CTS_DIR/runners/verify-evidence.js" "$BUNDLE" > /dev/null 2>&1; then
        echo "  ✅ VERIFIED"
        VERIFIED=$((VERIFIED + 1))
    else
        echo "  ❌ VERIFICATION FAILED"
        VERIFICATION_FAILED=$((VERIFICATION_FAILED + 1))
    fi
done

echo ""
echo "=== Verification Results ==="
echo "Verified: $VERIFIED / ${#BUNDLES[@]}"
echo "Failed: $VERIFICATION_FAILED / ${#BUNDLES[@]}"
echo ""

if [ $VERIFICATION_FAILED -gt 0 ]; then
    echo "❌ Some evidence bundles failed verification."
    exit 1
fi

echo "=== Evidence Bundles ==="
echo ""
echo "All evidence bundles are located in:"
echo "$CTS_DIR/output/"
echo ""
echo "You can inspect individual bundles:"
echo "  - conformance.json (test results)"
echo "  - trace.json (execution trace)"
echo "  - attestation.txt (cryptographic attestation)"
echo ""

echo "✅ SUCCESS: All scenarios passed and all evidence verified!"
echo ""
echo "This proves:"
echo "  - The reference kernel conforms to PCS L1/L2/L3 requirements"
echo "  - Evidence bundles are cryptographically verifiable"
echo "  - Independent validators can reproduce these results"
echo ""
