#!/bin/bash

# Persistra CTS — Quick Validation (5-Minute Smoke Test)
# Runs a subset of critical tests to verify environment and core functionality

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Persistra CTS — Quick Validation (5-Minute Smoke Test)       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create output directory
OUTPUT_DIR="./audit-artifacts/quick-validation-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR"

# Initialize counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test
run_test() {
  local test_file=$1
  local test_name=$2
  
  echo -e "${BLUE}Running: ${test_name}${NC}"
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  # Run test and capture output
  if node "$test_file" > "${OUTPUT_DIR}/${test_name}.log" 2>&1; then
    echo -e "${GREEN}✅ PASS: ${test_name}${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "${RED}❌ FAIL: ${test_name}${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
    
    # Show error
    echo -e "${RED}Error output:${NC}"
    tail -10 "${OUTPUT_DIR}/${test_name}.log"
  fi
  echo ""
}

# ============================================================================
# Quick Test Suite (5 critical tests)
# ============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Running Quick Validation Suite (5 tests)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Test 1: EVS-1 (Governance Failure - foundational)
if [ -f "./evs/evs1-dual-policy.js" ]; then
    run_test "./evs/evs1-dual-policy.js" "EVS-1-Governance-Failure"
else
    echo -e "${YELLOW}⚠️  Skipping EVS-1 (file not found)${NC}"
    echo ""
fi

# Test 2: EVS-6 (Development Continuity - critical for substrate)
if [ -f "./evs/evs6-runtime-pure.js" ]; then
    run_test "./evs/evs6-runtime-pure.js" "EVS-6-Development-Continuity"
else
    echo -e "${YELLOW}⚠️  Skipping EVS-6 (file not found)${NC}"
    echo ""
fi

# Test 3: AVS-1P (Policy Gate - architectural enforcement)
if [ -f "./avs-harness/avs-1p-policy-gate.js" ]; then
    run_test "./avs-harness/avs-1p-policy-gate.js" "AVS-1P-Policy-Gate"
else
    echo -e "${YELLOW}⚠️  Skipping AVS-1P (file not found)${NC}"
    echo ""
fi

# Test 4: CTS-L1 (Session Boundary - conformance baseline)
if [ -f "./tests/L1/persistence/session-boundary-integrity-runtime.js" ]; then
    run_test "./tests/L1/persistence/session-boundary-integrity-runtime.js" "CTS-L1-Session-Boundary"
else
    echo -e "${YELLOW}⚠️  Skipping CTS-L1 (file not found)${NC}"
    echo ""
fi

# Test 5: EVS-3 (Engine Replacement - cross-model continuity)
if [ -f "./evs/evs3-engine-replacement.js" ]; then
    run_test "./evs/evs3-engine-replacement.js" "EVS-3-Engine-Replacement"
else
    echo -e "${YELLOW}⚠️  Skipping EVS-3 (file not found)${NC}"
    echo ""
fi

# ============================================================================
# Summary
# ============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Quick Validation Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

SUCCESS_RATE=$(awk "BEGIN {if ($TOTAL_TESTS > 0) printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100; else print \"0.0\"}")

echo -e "Total Tests:   $TOTAL_TESTS"
echo -e "Passed:        ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed:        ${RED}$FAILED_TESTS${NC}"
echo -e "Success Rate:  ${SUCCESS_RATE}%"
echo ""

if [ $FAILED_TESTS -eq 0 ] && [ $TOTAL_TESTS -gt 0 ]; then
    echo -e "${GREEN}✅ Quick validation passed!${NC}"
    echo -e "${GREEN}   Core functionality verified${NC}"
    echo ""
    echo -e "Next steps:"
    echo -e "  ${BLUE}npm run test:all${NC}        # Run full test suite (~30 min)"
    echo -e "  ${BLUE}npm run test:all:audit${NC}  # Full suite with artifacts"
    echo ""
    exit 0
elif [ $TOTAL_TESTS -eq 0 ]; then
    echo -e "${RED}❌ No tests were run${NC}"
    echo -e "${RED}   Check that test files exist${NC}"
    echo ""
    exit 1
else
    echo -e "${RED}❌ Quick validation failed${NC}"
    echo -e "${RED}   $FAILED_TESTS test(s) failed${NC}"
    echo ""
    echo -e "Check logs in: $OUTPUT_DIR"
    echo ""
    echo -e "Troubleshooting:"
    echo -e "  1. Check API keys are set (ANTHROPIC_API_KEY, GROQ_API_KEY)"
    echo -e "  2. Verify dependencies: npm install"
    echo -e "  3. Check test logs for specific errors"
    echo -e "  4. Run: ${BLUE}npm run preflight${NC} for environment check"
    echo ""
    exit 1
fi
