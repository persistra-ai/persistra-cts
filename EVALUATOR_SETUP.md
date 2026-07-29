# PCS Evaluator Setup Guide

**Quick start guide for external technical evaluators**

---

## Overview

This guide provides the complete setup path for evaluating the Persistra Cognitive Substrate (PCS). Follow these steps in order for a clean evaluation experience.

---

## Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)
- **Git** (for cloning repositories)
- **API Keys** (see below)

---

## Required Repositories

You need **two repositories** for full evaluation:

1. **persistra-cts** (this repository) - Conformance Test Suite
2. **persistra-kernel** (optional) - Minimal reference implementation

**Note:** The PCS runtime is **bundled** in `persistra-cts/runtime/`. No sibling repositories or additional checkouts are required.

---

## Setup Steps

### Step 1: Clone Repository

```bash
git clone https://github.com/persistra-ai/persistra-cts.git
cd persistra-cts
```

**That's it for repository setup.** Everything needed for validation is self-contained in this repository.

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure API Keys

**Copy the environment template:**
```bash
cp .env.example .env
```

**Edit `.env` and add your API keys:**
```bash
ANTHROPIC_API_KEY=your_anthropic_key_here
GROQ_API_KEY=your_groq_key_here
```

**Where to get API keys:**
- **Anthropic (Claude):** https://console.anthropic.com/
- **Groq (Llama):** https://console.groq.com/

**Cost:** Both providers offer free tiers. Full validation costs ~$1 total.

**See [API_KEYS_SETUP.md](API_KEYS_SETUP.md) for detailed instructions.**

### Step 4: Run Preflight Check

```bash
npm run preflight
```

**Expected output:**
```
✅ All checks passed!
   Ready to run validation tests
```

If preflight fails, it will tell you exactly what's missing.

---

## Validation Path

Once setup is complete, follow this validation sequence:

### Quick Validation (~5 minutes)

```bash
npm run test:quick
```

**Expected:** Quick smoke test of core functionality

### Full Validation Suite (~30 minutes)

```bash
npm run test:all
```

**Expected:** Complete validation across EVS, AVS, and CVS suites

### Nine-Act Demo

```bash
cd demo
npm run demo:validate  # Validate demo is ready
npm run demo:all        # Run all 9 acts
```

**Expected:** Progressive demonstration of PCS capabilities

### Tutorial / Quick-Start (Optional - Separate Repository)

**Note:** The tutorial is in a separate repository (`pcs-developer-runtime`) and is **not required** for CTS validation.

If you have access to `pcs-developer-runtime`:

```bash
cd ../pcs-developer-runtime
npm install
npm run quick-start
```

**Expected:** Project scaffold with 2 sample decisions created and verified

**Note:** The tutorial quick-start has been fixed (commit f92a189 in `pcs-developer-runtime`). If you encounter issues with sample decisions not being created, ensure you have the latest version:

```bash
cd ../pcs-developer-runtime
git pull
npm install
npm run quick-start
```

The tutorial is optional. The nine-act demo in `persistra-cts/demo/` is the primary validation path.

---

## Repository Structure

```
persistra-cts/
├── runtime/              ← Bundled PCS runtime (self-contained)
│   ├── runtime.js
│   ├── decision-store.js
│   ├── policy-enforcement-point.js
│   └── ...
├── evs/                  ← External Validation Suite
├── avs-harness/          ← Architectural Validation Suite
├── demo/                 ← Nine-act demo
├── tests/                ← Additional conformance tests
├── scripts/              ← Utility scripts
└── docs/                 ← Documentation
```

**Key point:** The `runtime/` directory contains the complete PCS runtime needed for all validation and demo paths. No external dependencies required.

---

## Common Commands

| Command | Purpose | Duration |
|---------|---------|----------|
| `npm run preflight` | Verify environment setup | ~10 seconds |
| `npm run test:quick` | Quick validation smoke test | ~5 minutes |
| `npm run test:all` | Full validation suite | ~30 minutes |
| `npm run test:all:audit` | Full suite with artifacts | ~35 minutes |
| `cd demo && npm run demo:validate` | Validate demo readiness | ~5 seconds |
| `cd demo && npm run demo:all` | Run nine-act demo | ~15 minutes |

**Do NOT use `npm test` directly** - it requires additional flags. Use the commands above.

---

## Troubleshooting

### Preflight Fails: "Runtime directory not found"

**Cause:** The bundled runtime is missing from `persistra-cts/runtime/`

**Solution:**
1. Verify you cloned the repository completely
2. Check that `runtime/runtime.js` exists
3. If missing, re-clone the repository

### Quick Validation Fails: "PCSRuntime not found"

**Cause:** Runtime import paths are incorrect

**Solution:**
1. Verify `runtime/` directory exists in repository root
2. Run `npm run preflight` to diagnose
3. Check that you're running from `persistra-cts/` directory

### Demo Fails: "Cannot find module"

**Cause:** Demo validator didn't catch missing dependencies

**Solution:**
1. Run `npm run demo:validate` first
2. Check that `runtime/` directory exists
3. Verify all dependencies installed: `npm install`

### Tutorial Reports Success But No Decisions Created

**Cause:** CLI flag parsing issue in non-interactive mode

**Solution:**
1. Check `decisions.json` manually
2. Report issue if decisions are empty despite success message
3. This is a known issue being addressed

### API Key Errors

**Cause:** API keys not set or invalid

**Solution:**
1. Verify `.env` file exists
2. Check keys are set: `echo $ANTHROPIC_API_KEY`
3. Verify keys are valid in provider console
4. See [API_KEYS_SETUP.md](API_KEYS_SETUP.md) for details

---

## What Success Looks Like

### Preflight Success
```
✅ All checks passed!
   Ready to run validation tests
```

### Quick Validation Success
```
✅ Quick validation passed
   Core functionality verified
```

### Demo Validation Success
```
✅ All checks passed!
   Demo is ready to run
```

### Full Validation Success
```
✅ All validation suites passed
   PCS conformance verified
```

---

## Optional: persistra-kernel

For a minimal reference implementation example:

```bash
cd ..
git clone https://github.com/persistra-ai/persistra-kernel.git
cd persistra-kernel
cp .env.example .env
# Add API keys to .env
npm install
npm test
```

**Expected:** 10/10 tests passing

**Note:** persistra-kernel is **independent** of persistra-cts. It demonstrates conformance to PCS primitives but is not required for CTS validation.

---

## Support

**Technical questions:** research@persistra.ai  
**Setup issues:** Create issue at https://github.com/persistra-ai/persistra-cts/issues  
**Documentation:** See [README.md](README.md) and [docs/](docs/)

---

## Summary

**Required steps:**
1. Clone persistra-cts
2. npm install
3. Configure API keys
4. npm run preflight
5. npm run test:quick

**That's it.** No sibling repositories, no complex directory layouts, no external runtime dependencies.

The bundled runtime in `persistra-cts/runtime/` provides everything needed for validation and demo execution.
