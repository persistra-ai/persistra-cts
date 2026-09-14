# API Keys Setup Guide

**Purpose:** Configure API keys required for PCS validation tests and demos

**Time Required:** ~10 minutes

---

## Overview

PCS validation tests and demos require API keys for multiple services:

1. **ANTHROPIC_API_KEY** - Claude API (Anthropic) - **REQUIRED**
2. **GROQ_API_KEY** - Groq API (for local models) - **REQUIRED for EVS-3**
3. **OPENAI_API_KEY** - OpenAI API (for embeddings) - **REQUIRED for EVS-7**

**Why multiple providers?** PCS is model-agnostic. Tests validate that the substrate works with multiple model providers, demonstrating that state, constraints, and governance are external to the model.

### Which Keys Do I Need?

**For Paste Condition demo and EVS-3:**
- ✅ ANTHROPIC_API_KEY (workspace-scoped)
- ✅ GROQ_API_KEY

**For EVS-7 (Semantic Retrieval):**
- ✅ ANTHROPIC_API_KEY
- ✅ OPENAI_API_KEY (for embeddings)

**For most other tests:**
- ✅ ANTHROPIC_API_KEY only

---

## Quick Start

### Option 1: Temporary Setup (For Quick Validation)

```bash
# Required for most tests
export ANTHROPIC_API_KEY=your_anthropic_key_here

# Required for EVS-7 (Semantic Retrieval)
export OPENAI_API_KEY=your_openai_key_here

# Required for EVS-3 (Engine Replacement)
export GROQ_API_KEY=your_groq_key_here

# Verify
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY
echo $GROQ_API_KEY
```

**Note:** Keys are lost when terminal closes. Good for quick testing.

**⚠️ Important:** Make sure OPENAI_API_KEY is a real OpenAI key (starts with `sk-proj-...` or `sk-...`), not a Groq key (which starts with `gsk_...`).

---

### Option 2: Persistent Setup (Recommended)

#### macOS / Linux

Add to your shell profile (`~/.bashrc`, `~/.zshrc`, or `~/.profile`):

```bash
# Add these lines
export ANTHROPIC_API_KEY=your_anthropic_key_here
export OPENAI_API_KEY=your_openai_key_here
export GROQ_API_KEY=your_groq_key_here  # Required for EVS-3
```

Then reload:
```bash
source ~/.bashrc  # or ~/.zshrc
```

#### Windows (PowerShell)

```powershell
# Set environment variables
[System.Environment]::SetEnvironmentVariable('ANTHROPIC_API_KEY', 'your_anthropic_key_here', 'User')
[System.Environment]::SetEnvironmentVariable('OPENAI_API_KEY', 'your_openai_key_here', 'User')
[System.Environment]::SetEnvironmentVariable('GROQ_API_KEY', 'your_groq_key_here', 'User')
```

Restart terminal to apply.

---

### Option 3: GitHub Codespaces

**Temporary (current session):**
```bash
export ANTHROPIC_API_KEY=your_anthropic_key_here
export OPENAI_API_KEY=your_openai_key_here
export GROQ_API_KEY=your_groq_key_here  # Optional
```

**Persistent (across Codespace restarts):**

1. Add to `~/.bashrc` in Codespace:
   ```bash
   echo 'export ANTHROPIC_API_KEY=your_anthropic_key_here' >> ~/.bashrc
   echo 'export OPENAI_API_KEY=your_openai_key_here' >> ~/.bashrc
   echo 'export GROQ_API_KEY=your_groq_key_here' >> ~/.bashrc
   source ~/.bashrc
   ```

2. Or use Codespaces Secrets (organization-level):
   - Go to GitHub Settings → Codespaces → Secrets
   - Add `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, and `GROQ_API_KEY`
   - Secrets are automatically available in all your Codespaces

**Security Note:** Codespaces secrets are encrypted and only accessible to your Codespaces.

---

## Getting API Keys

### 1. Anthropic API Key (Claude)

**Where to get:**
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to "API Keys"
4. Click "Create Key"
5. **IMPORTANT:** Under "Scope", select **"Default Workspace"** (NOT "Organization")
   - Organization-scoped keys require additional workspace ID headers
   - Workspace-scoped keys work directly with the demos
6. Copy the key (starts with `sk-ant-...`)

**Models used:**
- `claude-sonnet-4-6` (current working model for EVS-3 and Paste Condition demo)

**Pricing:**
- Free tier: $5 credit for new accounts
- Pay-as-you-go: ~$0.01-0.03 per test
- Full validation suite: ~$0.50-1.00 total

**Documentation:** https://docs.anthropic.com/

---

### 2. OpenAI API Key (Embeddings)

**Where to get:**
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to "API Keys"
4. Click "Create new secret key"
5. Copy the key (starts with `sk-proj-...` or `sk-...`)

**Pricing:**
- Free tier: $5 credit for new accounts (expires after 3 months)
- Pay-as-you-go: ~$0.0001 per embedding
- EVS-7 test: ~$0.01-0.02 total

**Used for:**
- EVS-7 (Semantic Retrieval) - embedding generation for semantic search

**Documentation:** https://platform.openai.com/docs/

**⚠️ Important:** Do NOT use a Groq key here. OpenAI keys start with `sk-proj-` or `sk-`, NOT `gsk_`.

---

### 3. Groq API Key (Local Models)

**Where to get:**
1. Go to https://console.groq.com/
2. Sign up or log in
3. Navigate to "API Keys"
4. Click "Create API Key"
5. Copy the key (starts with `gsk_...`)

**Models used:**
- `groq/compound-mini` (EVS-3 Phase 2 - local model)
- Demonstrates frontier (Claude) → local (Groq) model transition

**Pricing:**
- Free tier: Generous rate limits
- Pay-as-you-go: Very low cost
- EVS-3 test: ~$0.05-0.10 total

**Documentation:** https://console.groq.com/docs

---

## Verification

### Check if Keys are Set

```bash
# Check if keys are set (shows first few characters)
echo ${ANTHROPIC_API_KEY:0:10}...
echo ${OPENAI_API_KEY:0:10}...
echo ${GROQ_API_KEY:0:10}...
```

**Expected output:**
```
sk-ant-api...
sk-proj-xx...  (or sk-xxxxxx...)
gsk_xxxxxx...
```

**⚠️ Common Mistake:** If OPENAI_API_KEY shows `gsk_...`, you've set a Groq key instead of an OpenAI key!

### Test Keys Work

```bash
# Run preflight check
npm run preflight
```

**Expected output:**
```
[4/7] Checking API keys...
✅ ANTHROPIC_API_KEY is set
✅ GROQ_API_KEY is set (required for EVS-3)
⚠️  OPENAI_API_KEY not set (optional, needed for EVS-7)
```

**Note:** GROQ_API_KEY is required for EVS-3 (Engine Replacement demo). OPENAI_API_KEY is optional, only needed for EVS-7.

---

## Security Best Practices

### ✅ DO:
- Store keys in environment variables (not in code)
- Use `.gitignore` to exclude any files with keys
- Rotate keys periodically
- Use separate keys for development and production
- Revoke keys if compromised

### ❌ DON'T:
- Commit keys to Git repositories
- Share keys in public channels
- Hardcode keys in source files
- Use production keys for testing
- Share keys across team members (each person should have their own)

---

## Troubleshooting

### Issue: "API key not set"

**Symptom:**
```
⚠️ ANTHROPIC_API_KEY not set
⚠️ GROQ_API_KEY not set
```

**Solution:**
1. Set keys using one of the methods above
2. Verify with `echo $ANTHROPIC_API_KEY`
3. Restart terminal if using persistent setup
4. Run `npm run preflight` to verify

---

### Issue: "Invalid API key"

**Symptom:**
```
Error: Invalid API key
```

**Solution:**
1. Check key is copied correctly (no extra spaces)
2. Verify key is active in provider console
3. Check key hasn't been revoked
4. Generate new key if needed

---

### Issue: "Rate limit exceeded"

**Symptom:**
```
Error: Rate limit exceeded
```

**Solution:**
1. Wait a few minutes and retry
2. Use `npm run test:quick` instead of `npm run test:all`
3. Check your API usage in provider console
4. Upgrade to paid tier if needed

---

### Issue: Keys work in terminal but not in tests

**Symptom:**
- `echo $ANTHROPIC_API_KEY` shows key
- Tests fail with "API key not set"

**Solution:**
1. Restart terminal after setting keys
2. Check keys are exported (not just set)
3. Verify keys are in shell profile for persistent setup
4. Run `npm run preflight` to diagnose

---

## Cost Estimates

### Quick Validation (~5 minutes)
- **Anthropic:** ~$0.10-0.20
- **Groq:** ~$0.02-0.05
- **Total:** ~$0.15-0.25

### Full Validation Suite (~30 minutes)
- **Anthropic:** ~$0.50-0.75
- **Groq:** ~$0.10-0.25
- **Total:** ~$0.60-1.00

### Demo (Acts 1-9)
- **Anthropic:** ~$0.20-0.40
- **Groq:** ~$0.05-0.10
- **Total:** ~$0.25-0.50

**Note:** Costs are estimates and may vary based on:
- API pricing changes
- Model selection
- Request complexity
- Rate limits and retries

---

## Running Without API Keys

### What Works:
- ✅ Code review and exploration
- ✅ Documentation reading
- ✅ Architecture analysis
- ✅ Test code inspection

### What Doesn't Work:
- ❌ Running validation tests (requires API calls)
- ❌ Running demos (requires model interaction)
- ❌ Tutorial completion (requires CLI with API)

**Recommendation:** Get API keys for full validation. Both providers offer free tiers sufficient for evaluation.

---

## Alternative: Mock Mode (Future)

**Status:** Not currently implemented

**Planned:** Mock mode that simulates API responses for testing without API keys.

**Use case:** CI/CD, offline development, cost-free validation

**Timeline:** Future enhancement

---

## FAQ

### Q: Do I need all three keys?
**A:** For the main demos (EVS-3 and Paste Condition), you need ANTHROPIC_API_KEY and GROQ_API_KEY. For EVS-7 (Semantic Retrieval), you also need OPENAI_API_KEY.

### Q: What's the minimum to get started?
**A:** ANTHROPIC_API_KEY (workspace-scoped) and GROQ_API_KEY. This runs the main demos including EVS-3 and Paste Condition. Add OPENAI_API_KEY later if you want to run EVS-7.

### Q: I set OPENAI_API_KEY but EVS-7 fails with "Invalid API key"
**A:** Check that you're using a real OpenAI key (starts with `sk-proj-` or `sk-`), not a Groq key (starts with `gsk_`). This is a common mistake.

### Q: Can I use different providers?
**A:** Currently, tests are configured for Anthropic (Claude), OpenAI (embeddings), and Groq (Llama). Other providers require code changes.

### Q: Are keys stored anywhere?
**A:** No. Keys are only in your environment variables. Never committed to Git.

### Q: What if I don't want to pay?
**A:** Both providers offer free tiers sufficient for evaluation. Total cost for full validation is ~$1.

### Q: Can I share keys with my team?
**A:** Not recommended. Each team member should have their own keys for security and usage tracking.

### Q: How do I revoke a key?
**A:** Go to the provider console (Anthropic or Groq) and delete/revoke the key.

---

## Next Steps

1. **Get API keys** from Anthropic (workspace-scoped) and Groq
2. **Set keys** using one of the methods above
3. **Verify** with `npm run preflight`
4. **Run demos:**
   - EVS-3: `./run-with-env.sh node evs/evs3-engine-replacement.js --mode live`
   - Paste Condition: `./run-with-env.sh node avs-harness/demo-paste-condition.js`

**For full validation checklist:** See [ENGINEERING_VALIDATION_CHECKLIST.md](ENGINEERING_VALIDATION_CHECKLIST.md)

---

## Support

**Issues with API keys:**
- Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Review [FAQ.md](FAQ.md)
- Create issue: https://github.com/persistra-ai/persistra-cts/issues

**Provider-specific issues:**
- Anthropic: https://support.anthropic.com/
- Groq: https://console.groq.com/docs/support

---

**Security reminder:** Never commit API keys to Git. Always use environment variables.
