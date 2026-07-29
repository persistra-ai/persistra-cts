#!/bin/bash

# Persistra CTS — Pre-Flight Environment Check
# Validates environment before running validation tests

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Persistra CTS — Pre-Flight Environment Check                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

ERRORS=0
WARNINGS=0

# ============================================================================
# Check 1: Node.js Version
# ============================================================================

echo -e "${BLUE}[1/7] Checking Node.js version...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    echo -e "   Install Node.js 18+ from: https://nodejs.org"
    ERRORS=$((ERRORS + 1))
else
    NODE_VERSION=$(node --version)
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'v' -f2 | cut -d'.' -f1)
    
    if [ "$NODE_MAJOR" -lt 18 ]; then
        echo -e "${RED}❌ Node.js version must be 18 or higher${NC}"
        echo -e "   Found: $NODE_VERSION"
        echo -e "   Required: v18.0.0+"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ Node.js version: $NODE_VERSION${NC}"
    fi
fi

echo ""

# ============================================================================
# Check 2: npm
# ============================================================================

echo -e "${BLUE}[2/7] Checking npm...${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    ERRORS=$((ERRORS + 1))
else
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm version: $NPM_VERSION${NC}"
fi

echo ""

# ============================================================================
# Check 3: Dependencies
# ============================================================================

echo -e "${BLUE}[3/7] Checking dependencies...${NC}"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Dependencies not installed${NC}"
    echo -e "   Run: npm install"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ Dependencies installed${NC}"
fi

echo ""

# ============================================================================
# Check 4: API Keys
# ============================================================================

echo -e "${BLUE}[4/7] Checking API keys...${NC}"

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  ANTHROPIC_API_KEY not set${NC}"
    echo -e "   Some tests require Claude API access"
    echo -e "   Set with: export ANTHROPIC_API_KEY=your_key_here"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ ANTHROPIC_API_KEY is set${NC}"
fi

if [ -z "$GROQ_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  GROQ_API_KEY not set${NC}"
    echo -e "   Some tests require Groq API access (Llama models)"
    echo -e "   Set with: export GROQ_API_KEY=your_key_here"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✅ GROQ_API_KEY is set${NC}"
fi

echo ""

# ============================================================================
# Check 5: Disk Space
# ============================================================================

echo -e "${BLUE}[5/7] Checking disk space...${NC}"

if command -v df &> /dev/null; then
    AVAILABLE=$(df -h . | tail -1 | awk '{print $4}')
    echo -e "${GREEN}✅ Available disk space: $AVAILABLE${NC}"
else
    echo -e "${YELLOW}⚠️  Could not check disk space${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""

# ============================================================================
# Check 6: Git Repository
# ============================================================================

echo -e "${BLUE}[6/7] Checking git repository...${NC}"

if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Not a git repository${NC}"
    echo -e "   Some metadata will be unavailable"
    WARNINGS=$((WARNINGS + 1))
else
    GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')
    GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')
    echo -e "${GREEN}✅ Git repository${NC}"
    echo -e "   Branch: $GIT_BRANCH"
    echo -e "   Commit: $GIT_COMMIT"
fi

echo ""

# ============================================================================
# Check 7: Test Files
# ============================================================================

echo -e "${BLUE}[7/7] Checking test files...${NC}"

MISSING_FILES=0

# Check for critical test directories
if [ ! -d "evs" ]; then
    echo -e "${RED}❌ EVS test directory not found${NC}"
    MISSING_FILES=$((MISSING_FILES + 1))
fi

if [ ! -d "avs-harness" ]; then
    echo -e "${RED}❌ AVS test directory not found${NC}"
    MISSING_FILES=$((MISSING_FILES + 1))
fi

if [ ! -d "runtime" ]; then
    echo -e "${RED}❌ Runtime directory not found${NC}"
    echo -e "${RED}   The bundled PCS runtime is required for validation${NC}"
    MISSING_FILES=$((MISSING_FILES + 1))
else
    # Check for key runtime files
    if [ ! -f "runtime/runtime.js" ]; then
        echo -e "${RED}❌ runtime/runtime.js not found${NC}"
        MISSING_FILES=$((MISSING_FILES + 1))
    fi
fi

if [ ! -f "run_all.sh" ]; then
    echo -e "${RED}❌ run_all.sh not found${NC}"
    MISSING_FILES=$((MISSING_FILES + 1))
fi

if [ $MISSING_FILES -eq 0 ]; then
    echo -e "${GREEN}✅ All test files present${NC}"
else
    echo -e "${RED}❌ Missing $MISSING_FILES critical test file(s)${NC}"
    ERRORS=$((ERRORS + 1))
fi

echo ""

# ============================================================================
# Summary
# ============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Pre-Flight Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo -e "${GREEN}   Ready to run validation tests${NC}"
    echo ""
    echo -e "Next steps:"
    echo -e "  ${BLUE}npm run test:quick${NC}      # 5-minute smoke test"
    echo -e "  ${BLUE}npm run test:all${NC}        # Full test suite (~30 min)"
    echo -e "  ${BLUE}npm run test:all:audit${NC}  # Full suite with artifacts"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Pre-flight completed with $WARNINGS warning(s)${NC}"
    echo -e "${YELLOW}   Tests may run but some features might be limited${NC}"
    echo ""
    echo -e "You can proceed with:"
    echo -e "  ${BLUE}npm run test:quick${NC}      # 5-minute smoke test"
    echo -e "  ${BLUE}npm run test:all${NC}        # Full test suite (~30 min)"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Pre-flight failed with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo -e "${RED}   Please fix errors before running tests${NC}"
    echo ""
    exit 1
fi
