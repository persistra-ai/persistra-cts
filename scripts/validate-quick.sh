#!/bin/bash

# PCS Quick Validation — First-Run Smoke Test
# Validates environment and runs minimal tests to verify everything works

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  PCS Quick Validation — First-Run Smoke Test                   ║${NC}"
echo -e "${BLUE}║  Verifies environment and runs minimal validation              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

ERRORS=0

# ============================================================================
# Step 1: Preflight Check
# ============================================================================

echo -e "${CYAN}[1/3] Running preflight check...${NC}"
echo ""

if [ -f "./scripts/preflight.sh" ]; then
    ./scripts/preflight.sh
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Preflight check failed${NC}"
        echo -e "${RED}   Please fix errors before continuing${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Preflight script not found, skipping...${NC}"
fi

echo ""

# ============================================================================
# Step 2: Quick Validation Tests
# ============================================================================

echo -e "${CYAN}[2/3] Running quick validation tests (~5 minutes)...${NC}"
echo ""

if [ -f "./scripts/quick-validation.sh" ]; then
    ./scripts/quick-validation.sh
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Quick validation tests failed${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ Quick validation tests passed${NC}"
    fi
else
    echo -e "${RED}❌ Quick validation script not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# ============================================================================
# Step 3: Demo Validation
# ============================================================================

echo -e "${CYAN}[3/3] Validating demo environment...${NC}"
echo ""

if [ -d "./demo" ]; then
    cd demo
    
    if [ -f "package.json" ]; then
        # Check if demo dependencies are installed
        if [ ! -d "node_modules" ]; then
            echo -e "${BLUE}Installing demo dependencies...${NC}"
            npm install --silent
        fi
        
        # Run demo validation if script exists
        if command -v npm &> /dev/null && npm run | grep -q "demo:validate"; then
            npm run demo:validate --silent
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ Demo environment validated${NC}"
            else
                echo -e "${YELLOW}⚠️  Demo validation had warnings${NC}"
            fi
        else
            echo -e "${YELLOW}⚠️  Demo validation script not found${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Demo package.json not found${NC}"
    fi
    
    cd ..
else
    echo -e "${YELLOW}⚠️  Demo directory not found${NC}"
fi

echo ""

# ============================================================================
# Summary
# ============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Quick Validation Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Quick validation passed!${NC}"
    echo -e "${GREEN}   Environment is working correctly${NC}"
    echo ""
    echo -e "Next steps:"
    echo -e "  ${BLUE}npm run test:all${NC}        # Run full validation suite (~30 min)"
    echo -e "  ${BLUE}cd demo && npm run demo:all${NC}  # Run complete demo (Acts 1-9)"
    echo -e "  ${BLUE}Read START_HERE.md${NC}      # Explore architecture"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Quick validation failed with $ERRORS error(s)${NC}"
    echo -e "${RED}   Please fix errors before proceeding${NC}"
    echo ""
    echo -e "Troubleshooting:"
    echo -e "  ${BLUE}Check TROUBLESHOOTING.md${NC}"
    echo -e "  ${BLUE}Check API_KEYS_SETUP.md${NC}"
    echo -e "  ${BLUE}Run: npm run preflight${NC}"
    echo ""
    exit 1
fi
