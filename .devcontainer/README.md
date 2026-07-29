# Dev Container Configuration

This directory contains the GitHub Codespaces / VS Code Dev Container configuration for PCS Conformance Test Suite.

## What This Provides

- **Pre-configured Node.js 18** environment
- **Automatic dependency installation** (`npm install`)
- **Zero local setup required** - works in browser via GitHub Codespaces
- **Clean, reproducible environment** for running validation tests

## Usage

### GitHub Codespaces (Recommended)

1. Click "Open in GitHub Codespaces" badge in main README
2. Wait for container to build (~1-2 minutes first time)
3. Set API keys in terminal (if running tests that require them):
   ```bash
   export ANTHROPIC_API_KEY=your_key_here
   export GROQ_API_KEY=your_key_here
   ```
4. Run validation tests:
   ```bash
   npm run preflight      # Check environment
   npm run test:quick     # 5-minute smoke test
   npm run test:all       # Full test suite (~30 min)
   ```

### Gitpod

1. Click "Open in Gitpod" badge in main README
2. Container builds automatically
3. Set API keys and run tests

### VS Code Local Dev Containers

1. Install "Dev Containers" extension in VS Code
2. Open repository in VS Code
3. Click "Reopen in Container" when prompted
4. Container builds and configures automatically

## Configuration Details

- **Base Image:** `mcr.microsoft.com/devcontainers/javascript-node:18`
- **Post-Create Command:** `npm install`
- **Extensions:** ESLint, Prettier (optional)
- **User:** `node` (non-root)

## Why This Matters

Eliminates common setup friction:
- ❌ Wrong Node version
- ❌ Missing dependencies
- ❌ Platform-specific issues
- ❌ Environment configuration errors

Engineers can start running validation tests in <2 minutes instead of debugging local environment issues.

## For Engineering Validation Team

This containerized environment ensures:
- ✅ Consistent environment across all validators
- ✅ No "works on my machine" issues
- ✅ Reproducible test results
- ✅ Same environment as CI/CD pipeline

The GitHub Actions CI uses the same Node.js version and runs in a clean Ubuntu container, so Codespaces results match CI results.

## Reproducibility Signal

**For skeptical reviewers:** The combination of:
1. Dev container (this file)
2. GitHub Actions CI (`.github/workflows/cts-ci.yml`)
3. CI badge in README (shows tests passing)

...provides the reproducibility signal that matters for due diligence.

Anyone can:
1. Click "Open in Codespaces"
2. Run `npm run test:all`
3. See the same results as CI

No special access, no local setup, no excuses.
