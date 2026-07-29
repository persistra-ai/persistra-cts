#!/bin/bash

# Multi-Version L3 Validation Script
# Tests L3 freeze gate across multiple Node versions to ensure platform invariance

set -e

echo "=== L3 Multi-Version Validation ==="
echo ""

# Detect available Node versions
NODE_VERSIONS=()

# Check for nvm
if command -v nvm &> /dev/null; then
    echo "Using nvm for version management"
    NODE_VERSIONS=(18 20 22)
elif [ -d "$HOME/.nvm" ]; then
    echo "Using nvm (sourced)"
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    NODE_VERSIONS=(18 20 22)
else
    echo "No version manager found, using current Node version only"
    CURRENT_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    NODE_VERSIONS=($CURRENT_VERSION)
fi

echo "Testing Node versions: ${NODE_VERSIONS[@]}"
echo ""

# Results tracking
RESULTS_FILE="/tmp/l3-multiversion-results.json"
echo "{\"versions\": []}" > "$RESULTS_FILE"

# Run tests for each version
for VERSION in "${NODE_VERSIONS[@]}"; do
    echo "=== Testing Node v$VERSION ==="
    
    # Switch version if using nvm
    if command -v nvm &> /dev/null || [ -d "$HOME/.nvm" ]; then
        nvm use $VERSION || {
            echo "  ⚠️  Node $VERSION not installed, skipping"
            continue
        }
    fi
    
    CURRENT_NODE=$(node --version)
    echo "  Active Node: $CURRENT_NODE"
    
    # Run 5 iterations
    OUTPUT_DIR="output/l3-multiversion-node${VERSION}-$(date +%s)"
    mkdir -p "$OUTPUT_DIR"
    
    echo "  Running 5 iterations..."
    node runners/run-l3-freeze-gate.js \
        --target ../persistra-kernel \
        --iterations 5 \
        > "$OUTPUT_DIR/run.log" 2>&1
    
    # Extract evidence hash from report
    REPORT_FILE=$(find output -name "freeze-gate-report.json" -type f | tail -1)
    
    if [ -f "$REPORT_FILE" ]; then
        EVIDENCE_HASH=$(jq -r '.iterations[0].evidenceHash' "$REPORT_FILE" 2>/dev/null || echo "unknown")
        PASS_RATE=$(jq -r '.freeze_gate.pass_rate.count' "$REPORT_FILE" 2>/dev/null || echo "0")
        
        echo "  Evidence hash: ${EVIDENCE_HASH:0:16}..."
        echo "  Pass rate: $PASS_RATE/5"
        
        # Store result
        jq --arg ver "$VERSION" \
           --arg node "$CURRENT_NODE" \
           --arg hash "$EVIDENCE_HASH" \
           --arg pass "$PASS_RATE" \
           '.versions += [{"version": $ver, "node": $node, "evidence_hash": $hash, "pass_rate": $pass}]' \
           "$RESULTS_FILE" > "$RESULTS_FILE.tmp" && mv "$RESULTS_FILE.tmp" "$RESULTS_FILE"
    else
        echo "  ✗ FAILED - No report generated"
    fi
    
    echo ""
done

# Analyze results
echo "=== Multi-Version Analysis ==="
echo ""

UNIQUE_HASHES=$(jq -r '.versions[].evidence_hash' "$RESULTS_FILE" | sort -u | wc -l | tr -d ' ')
TOTAL_VERSIONS=$(jq '.versions | length' "$RESULTS_FILE")

echo "Versions tested: $TOTAL_VERSIONS"
echo "Unique evidence hashes: $UNIQUE_HASHES"
echo ""

if [ "$UNIQUE_HASHES" -eq 1 ]; then
    echo "✅ PLATFORM INVARIANCE CONFIRMED"
    echo "   All Node versions produce identical evidence_hash"
    STABLE_HASH=$(jq -r '.versions[0].evidence_hash' "$RESULTS_FILE")
    echo "   Stable hash: ${STABLE_HASH:0:32}..."
else
    echo "✗ PLATFORM VARIANCE DETECTED"
    echo "  Different Node versions produce different evidence_hash"
    echo "  This indicates platform-specific behavior"
    echo ""
    echo "  Hash distribution:"
    jq -r '.versions[] | "    Node \(.node): \(.evidence_hash[0:16])..."' "$RESULTS_FILE"
fi

echo ""
echo "Full results: $RESULTS_FILE"

# Exit code
if [ "$UNIQUE_HASHES" -eq 1 ]; then
    exit 0
else
    exit 1
fi
