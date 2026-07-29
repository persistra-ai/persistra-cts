#!/bin/bash

# AVS Test Suite Runner
# Runs all AVS validation tests with proper error handling and reporting

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
QUICK_MODE=false
VERBOSE=false
OUTPUT_DIR="./test-results/$(date +%Y%m%d-%H%M%S)"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --quick)
      QUICK_MODE=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --output)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  AVS Test Suite Runner                                         ║${NC}"
echo -e "${BLUE}║  Persistra Cognitive State (PCS) Validation                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check API keys
if [[ -z "$ANTHROPIC_API_KEY" ]]; then
  echo -e "${RED}❌ ERROR: ANTHROPIC_API_KEY not set${NC}"
  echo -e "${YELLOW}   Set it with: export ANTHROPIC_API_KEY='your-key-here'${NC}"
  exit 1
fi

echo -e "${GREEN}✅ API keys configured${NC}"
echo -e "Output directory: ${OUTPUT_DIR}"
echo ""

# Initialize counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test results array
declare -a TEST_RESULTS

# Function to run a test
run_test() {
  local test_name=$1
  local test_command=$2
  local test_description=$3
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Test $TOTAL_TESTS: $test_name${NC}"
  echo -e "${BLUE}$test_description${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  local output_file="$OUTPUT_DIR/${test_name}.log"
  
  if [[ "$VERBOSE" == true ]]; then
    if eval "$test_command" 2>&1 | tee "$output_file"; then
      echo -e "${GREEN}✅ PASS: $test_name${NC}\n"
      PASSED_TESTS=$((PASSED_TESTS + 1))
      TEST_RESULTS+=("PASS|$test_name")
    else
      echo -e "${RED}❌ FAIL: $test_name${NC}\n"
      FAILED_TESTS=$((FAILED_TESTS + 1))
      TEST_RESULTS+=("FAIL|$test_name")
    fi
  else
    if eval "$test_command" > "$output_file" 2>&1; then
      echo -e "${GREEN}✅ PASS: $test_name${NC}\n"
      PASSED_TESTS=$((PASSED_TESTS + 1))
      TEST_RESULTS+=("PASS|$test_name")
    else
      echo -e "${RED}❌ FAIL: $test_name${NC}"
      echo -e "${YELLOW}   See log: $output_file${NC}\n"
      FAILED_TESTS=$((FAILED_TESTS + 1))
      TEST_RESULTS+=("FAIL|$test_name")
    fi
  fi
}

# Run tests based on mode
if [[ "$QUICK_MODE" == true ]]; then
  echo -e "${YELLOW}Running in QUICK mode (integration tests only)${NC}\n"
  
  run_test "AVS-2P-Quick" \
    "npm run test:avs-2p-quick" \
    "Policy Enforcement Matrix (n=1 integration test)"
  
  run_test "AVS-1P" \
    "npm run test:avs-1p" \
    "Policy Gate Validation"
  
  run_test "AVS-1R" \
    "npm run test:avs-1r" \
    "Decision Retrieval Validation"
  
else
  echo -e "${YELLOW}Running FULL test suite (all 25 tests)${NC}\n"
  
  # Layer 1: Foundation Tests
  echo -e "${BLUE}═══ Layer 1: Foundation Tests ═══${NC}\n"
  
  run_test "AVS-1P" \
    "npm run test:avs-1p" \
    "Policy Gate Validation"
  
  run_test "AVS-1P-Deterministic" \
    "npm run test:avs-1p-deterministic" \
    "Deterministic Policy Gate Validation"
  
  run_test "AVS-1R" \
    "npm run test:avs-1r" \
    "Decision Retrieval Validation"
  
  # Layer 2: Architecture Tests
  echo -e "${BLUE}═══ Layer 2: Architecture Tests ═══${NC}\n"
  
  run_test "AVS-2A" \
    "npm run test:avs-2a" \
    "Audit Layer Validation"
  
  run_test "AVS-2C" \
    "npm run test:avs-2c" \
    "Continuity Validation"
  
  run_test "AVS-2C-Live" \
    "npm run test:avs-2c-live" \
    "Continuity Validation (Live)"
  
  run_test "AVS-2C-Mock" \
    "npm run test:avs-2c-mock" \
    "Continuity Validation (Mock)"
  
  run_test "AVS-2C-Negative" \
    "npm run test:avs-2c-negative" \
    "Continuity Validation (Negative Cases)"
  
  run_test "AVS-2E" \
    "npm run test:avs-2e" \
    "Orchestrator Binding Validation"
  
  run_test "AVS-2P" \
    "npm run test:avs-2p" \
    "Policy Enforcement Matrix (HARDENED - n=30)"
  
  run_test "AVS-2P-Shakedown" \
    "npm run test:avs-2p-shakedown" \
    "Policy Enforcement Shakedown"
  
  # Layer 3: Advanced Tests
  echo -e "${BLUE}═══ Layer 3: Advanced Tests ═══${NC}\n"
  
  run_test "AVS-3A" \
    "npm run test:avs-3a" \
    "Epistemic Retrieval Validation"
  
  # Layer 4: Performance Tests
  echo -e "${BLUE}═══ Layer 4: Performance Tests ═══${NC}\n"
  
  run_test "AVS-4" \
    "npm run test:avs-4" \
    "End-to-End Latency Validation"
  
  # Demo & Comparison Tests
  echo -e "${BLUE}═══ Demo & Comparison Tests ═══${NC}\n"
  
  run_test "Demo-Enforcement" \
    "npm run test:demo" \
    "Enforcement Comparison Demo"
  
  run_test "Llama-Full" \
    "npm run test:llama" \
    "Llama Model Full Validation"
fi

# Print summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Test Suite Summary                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Total Tests:  $TOTAL_TESTS"
echo -e "${GREEN}Passed:       $PASSED_TESTS${NC}"
echo -e "${RED}Failed:       $FAILED_TESTS${NC}"
echo ""

# Print detailed results
echo -e "${BLUE}Detailed Results:${NC}"
for result in "${TEST_RESULTS[@]}"; do
  IFS='|' read -r status name <<< "$result"
  if [[ "$status" == "PASS" ]]; then
    echo -e "  ${GREEN}✅ $name${NC}"
  else
    echo -e "  ${RED}❌ $name${NC}"
  fi
done
echo ""

# Save summary
cat > "$OUTPUT_DIR/summary.txt" <<EOF
AVS Test Suite Summary
======================
Date: $(date)
Mode: $(if [[ "$QUICK_MODE" == true ]]; then echo "QUICK"; else echo "FULL"; fi)

Total Tests:  $TOTAL_TESTS
Passed:       $PASSED_TESTS
Failed:       $FAILED_TESTS

Detailed Results:
EOF

for result in "${TEST_RESULTS[@]}"; do
  IFS='|' read -r status name <<< "$result"
  echo "  $status: $name" >> "$OUTPUT_DIR/summary.txt"
done

echo -e "Results saved to: ${OUTPUT_DIR}"
echo ""

# Exit with appropriate code
if [[ $FAILED_TESTS -gt 0 ]]; then
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
else
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
fi
