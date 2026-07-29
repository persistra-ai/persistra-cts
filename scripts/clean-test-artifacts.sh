#!/bin/bash

# Persistra CTS — Clean Test Artifacts
# Removes test outputs, logs, and temporary files

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Persistra CTS — Clean Test Artifacts                         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Parse arguments
DRY_RUN=false
FORCE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    *)
      shift
      ;;
  esac
done

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}Running in DRY RUN mode (no files will be deleted)${NC}"
    echo ""
fi

# ============================================================================
# Clean audit artifacts
# ============================================================================

echo -e "${BLUE}[1/6] Checking audit artifacts...${NC}"

if [ -d "audit-artifacts" ]; then
    ARTIFACT_COUNT=$(find audit-artifacts -type f 2>/dev/null | wc -l | tr -d ' ')
    ARTIFACT_SIZE=$(du -sh audit-artifacts 2>/dev/null | cut -f1)
    
    echo -e "   Found: $ARTIFACT_COUNT files ($ARTIFACT_SIZE)"
    
    if [ "$DRY_RUN" = false ]; then
        if [ "$FORCE" = true ]; then
            rm -rf audit-artifacts
            echo -e "${GREEN}   ✅ Removed audit-artifacts/${NC}"
        else
            read -p "   Remove audit-artifacts? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                rm -rf audit-artifacts
                echo -e "${GREEN}   ✅ Removed audit-artifacts/${NC}"
            else
                echo -e "${YELLOW}   ⏭️  Skipped${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}   [DRY RUN] Would remove audit-artifacts/${NC}"
    fi
else
    echo -e "${GREEN}   ✅ No audit artifacts found${NC}"
fi

echo ""

# ============================================================================
# Clean test runs
# ============================================================================

echo -e "${BLUE}[2/6] Checking test runs...${NC}"

if [ -d "runs" ]; then
    RUN_COUNT=$(find runs -type f 2>/dev/null | wc -l | tr -d ' ')
    RUN_SIZE=$(du -sh runs 2>/dev/null | cut -f1)
    
    echo -e "   Found: $RUN_COUNT files ($RUN_SIZE)"
    
    if [ "$DRY_RUN" = false ]; then
        if [ "$FORCE" = true ]; then
            rm -rf runs/*
            echo -e "${GREEN}   ✅ Removed runs/*${NC}"
        else
            read -p "   Remove runs/*? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                rm -rf runs/*
                echo -e "${GREEN}   ✅ Removed runs/*${NC}"
            else
                echo -e "${YELLOW}   ⏭️  Skipped${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}   [DRY RUN] Would remove runs/*${NC}"
    fi
else
    echo -e "${GREEN}   ✅ No test runs found${NC}"
fi

echo ""

# ============================================================================
# Clean output directory
# ============================================================================

echo -e "${BLUE}[3/6] Checking output directory...${NC}"

if [ -d "output" ]; then
    OUTPUT_COUNT=$(find output -type f 2>/dev/null | wc -l | tr -d ' ')
    
    if [ $OUTPUT_COUNT -gt 0 ]; then
        OUTPUT_SIZE=$(du -sh output 2>/dev/null | cut -f1)
        echo -e "   Found: $OUTPUT_COUNT files ($OUTPUT_SIZE)"
        
        if [ "$DRY_RUN" = false ]; then
            if [ "$FORCE" = true ]; then
                rm -rf output/*
                echo -e "${GREEN}   ✅ Removed output/*${NC}"
            else
                read -p "   Remove output/*? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    rm -rf output/*
                    echo -e "${GREEN}   ✅ Removed output/*${NC}"
                else
                    echo -e "${YELLOW}   ⏭️  Skipped${NC}"
                fi
            fi
        else
            echo -e "${YELLOW}   [DRY RUN] Would remove output/*${NC}"
        fi
    else
        echo -e "${GREEN}   ✅ Output directory is empty${NC}"
    fi
else
    echo -e "${GREEN}   ✅ No output directory found${NC}"
fi

echo ""

# ============================================================================
# Clean EVS artifacts
# ============================================================================

echo -e "${BLUE}[4/6] Checking EVS artifacts...${NC}"

if [ -d "evs" ]; then
    EVS_ARTIFACTS=$(find evs -name "*.log" -o -name "*.json" -o -name "*.tmp" 2>/dev/null | wc -l | tr -d ' ')
    
    if [ $EVS_ARTIFACTS -gt 0 ]; then
        echo -e "   Found: $EVS_ARTIFACTS artifact files"
        
        if [ "$DRY_RUN" = false ]; then
            if [ "$FORCE" = true ]; then
                find evs -name "*.log" -delete 2>/dev/null || true
                find evs -name "*.tmp" -delete 2>/dev/null || true
                echo -e "${GREEN}   ✅ Removed EVS artifacts${NC}"
            else
                read -p "   Remove EVS artifacts (*.log, *.tmp)? (y/N): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    find evs -name "*.log" -delete 2>/dev/null || true
                    find evs -name "*.tmp" -delete 2>/dev/null || true
                    echo -e "${GREEN}   ✅ Removed EVS artifacts${NC}"
                else
                    echo -e "${YELLOW}   ⏭️  Skipped${NC}"
                fi
            fi
        else
            echo -e "${YELLOW}   [DRY RUN] Would remove EVS artifacts${NC}"
        fi
    else
        echo -e "${GREEN}   ✅ No EVS artifacts found${NC}"
    fi
else
    echo -e "${GREEN}   ✅ No EVS directory found${NC}"
fi

echo ""

# ============================================================================
# Clean demo state
# ============================================================================

echo -e "${BLUE}[5/6] Checking demo state...${NC}"

if [ -f "demo/data/demo-state.json" ]; then
    echo -e "   Found: demo/data/demo-state.json"
    
    if [ "$DRY_RUN" = false ]; then
        if [ "$FORCE" = true ]; then
            rm -f demo/data/demo-state.json
            echo -e "${GREEN}   ✅ Removed demo state${NC}"
        else
            read -p "   Remove demo state? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                rm -f demo/data/demo-state.json
                echo -e "${GREEN}   ✅ Removed demo state${NC}"
            else
                echo -e "${YELLOW}   ⏭️  Skipped${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}   [DRY RUN] Would remove demo state${NC}"
    fi
else
    echo -e "${GREEN}   ✅ No demo state found${NC}"
fi

echo ""

# ============================================================================
# Clean node_modules cache
# ============================================================================

echo -e "${BLUE}[6/6] Checking node_modules cache...${NC}"

if [ -d "node_modules/.cache" ]; then
    CACHE_SIZE=$(du -sh node_modules/.cache 2>/dev/null | cut -f1)
    echo -e "   Found: node_modules/.cache ($CACHE_SIZE)"
    
    if [ "$DRY_RUN" = false ]; then
        if [ "$FORCE" = true ]; then
            rm -rf node_modules/.cache
            echo -e "${GREEN}   ✅ Removed node_modules cache${NC}"
        else
            read -p "   Remove node_modules cache? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                rm -rf node_modules/.cache
                echo -e "${GREEN}   ✅ Removed node_modules cache${NC}"
            else
                echo -e "${YELLOW}   ⏭️  Skipped${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}   [DRY RUN] Would remove node_modules cache${NC}"
    fi
else
    echo -e "${GREEN}   ✅ No node_modules cache found${NC}"
fi

echo ""

# ============================================================================
# Summary
# ============================================================================

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}Cleanup Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}DRY RUN completed${NC}"
    echo -e "Run without --dry-run to actually remove files"
else
    echo -e "${GREEN}✅ Cleanup complete${NC}"
fi

echo ""
echo -e "Usage:"
echo -e "  ${BLUE}npm run clean${NC}              # Interactive cleanup"
echo -e "  ${BLUE}./scripts/clean-test-artifacts.sh --dry-run${NC}  # Preview what would be removed"
echo -e "  ${BLUE}./scripts/clean-test-artifacts.sh --force${NC}    # Remove all without prompts"
echo ""
