#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# L4 Platform Invariance Test
###############################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CTS_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

FROZEN_EVIDENCE_HASH="9df56b940ded1689af9903bdfe7dbe3bee5efa3f3b68d757bcf89467d3285c6f"
ITERATIONS=5

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "═══════════════════════════════════════════════════════════════════════════"
echo "L4 Platform Invariance Test"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
echo "Testing Node.js versions: 18, 20, 22"
echo "Iterations per version: $ITERATIONS"
echo "Frozen Evidence Hash: $FROZEN_EVIDENCE_HASH"
echo ""

RESULTS_DIR=$(mktemp -d)
trap "rm -rf $RESULTS_DIR" EXIT

###############################################################################
# Test Function
###############################################################################

test_node_version() {
    local NODE_VERSION=$1
    
    echo "───────────────────────────────────────────────────────────────────────────"
    echo "Testing Node.js v${NODE_VERSION}"
    echo "───────────────────────────────────────────────────────────────────────────"
    echo ""
    
    nvm use "$NODE_VERSION" > /dev/null 2>&1 || {
        echo "❌ Failed to switch to Node.js v${NODE_VERSION}"
        return 1
    }
    
    echo "Node version: $(node --version)"
    echo ""
    
    cd "$CTS_ROOT"
    
    # Modify determinism gate to use fewer iterations
    local TEMP_GATE="$CTS_ROOT/runners/.temp-l4-gate-${NODE_VERSION}.js"
    sed "s/const ITERATIONS = 10;/const ITERATIONS = ${ITERATIONS};/" \
        "$CTS_ROOT/runners/run-l4-determinism-gate.js" > "$TEMP_GATE"
    
    GATE_OUTPUT=$(mktemp)
    if ! node "$TEMP_GATE" > "$GATE_OUTPUT" 2>&1; then
        echo ""
        echo "❌ Node.js v${NODE_VERSION} failed"
        tail -20 "$GATE_OUTPUT"
        rm -f "$GATE_OUTPUT" "$TEMP_GATE"
        return 1
    fi
    
    local EVIDENCE_HASH=$(grep "Evidence Hash:" "$GATE_OUTPUT" | awk '{print $3}')
    echo "$EVIDENCE_HASH" > "$RESULTS_DIR/node${NODE_VERSION}.hash"
    
    echo ""
    tail -15 "$GATE_OUTPUT"
    echo ""
    echo "✅ Node.js v${NODE_VERSION} passed"
    echo ""
    
    rm -f "$GATE_OUTPUT" "$TEMP_GATE"
    return 0
}

###############################################################################
# Run Tests
###############################################################################

FAILED=0

for VERSION in 18 20 22; do
    if ! test_node_version "$VERSION"; then
        FAILED=1
        break
    fi
done

nvm use 22 > /dev/null 2>&1

###############################################################################
# Verify Platform Invariance
###############################################################################

if [ $FAILED -eq 1 ]; then
    echo "═══════════════════════════════════════════════════════════════════════════"
    echo "❌ PLATFORM INVARIANCE TEST FAILED"
    echo "═══════════════════════════════════════════════════════════════════════════"
    exit 1
fi

echo "═══════════════════════════════════════════════════════════════════════════"
echo "Platform Invariance Summary"
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""

ALL_MATCH=1
for VERSION in 18 20 22; do
    HASH=$(cat "$RESULTS_DIR/node${VERSION}.hash")
    echo "Node.js v${VERSION}: ${HASH}"
    
    if [ "$HASH" != "$FROZEN_EVIDENCE_HASH" ]; then
        ALL_MATCH=0
    fi
done

echo ""
echo "Frozen Baseline: $FROZEN_EVIDENCE_HASH"
echo ""

if [ $ALL_MATCH -eq 1 ]; then
    echo "✅ PLATFORM INVARIANCE CONFIRMED"
    echo ""
    echo "All Node.js versions produce identical evidence hash."
    echo "L4 is platform-invariant across Node 18/20/22."
    exit 0
else
    echo "❌ PLATFORM VARIANCE DETECTED"
    echo ""
    echo "Evidence hashes differ across Node.js versions."
    echo "This indicates a platform-specific behavior."
    exit 1
fi
