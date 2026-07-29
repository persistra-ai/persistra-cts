# Groq Llama 3.1 8B Setup Guide

## Overview

Groq Llama 3.1 8B support added via OpenAI-compatible API routing.

**Total changes:** 14 lines  
**Zero changes to:** Tool executor, trace normalizer, run executor, assertion verifier, schema validation

---

## Architecture

Groq API is fully OpenAI Chat Completions compatible:
- Same tool schema
- Same `tool_calls` format
- Same JSON response structure

**Implementation:** Reuse existing `OpenAIProvider` with `baseURL` override.

---

## Environment Setup

```bash
# Set Groq API key (reuses OPENAI_API_KEY env var)
export GROQ_API_KEY=your_groq_api_key_here

# For manual runs, also set:
export OPENAI_API_KEY="$GROQ_API_KEY"
export OPENAI_BASE_URL="https://api.groq.com/openai/v1"
```

---

## Test Single Run

```bash
cd evidence/avs-validation/harness

# Quick test with provided script
export GROQ_API_KEY=your_key
./test-groq-llama.sh

# Or run manually
export OPENAI_API_KEY="$GROQ_API_KEY"
export OPENAI_BASE_URL="https://api.groq.com/openai/v1"

node run-avs.js \
  --case AVS-1R-DECISION-RETRIEVAL \
  --date 2026-02-17 \
  --model llama-3.1-8b-instant \
  --condition pcs-on \
  --run 1
```

---

## Expected Output

### run.json Format
```json
{
  "model": {
    "provider": "groq",
    "name": "llama-3.1-8b-instant",
    "version": "meta-llama-3.1-8b"
  },
  "parameters": {
    "temperature": 0.7,
    "top_p": 1.0,
    "seed": null,
    "tool_choice": "auto"
  }
}
```

### Directory Structure
```
runs/2026-02-17/llama-3.1-8b-instant/
├── pcs-on/run-0001/
├── pcs-off/run-0001/
└── paste/run-0001/
```

**Note:** Llama gets its own top-level directory (not buried under "openai").

---

## Parameters

**Critical:** Parameters must match GPT-4o exactly:
- `temperature: 0.7`
- `top_p: 1.0`
- `seed: null`
- `tool_choice: auto`

This ensures any performance differences are due to model capability, not parameter drift.

---

## Expected Results

### Optimistic Case (5/5 PCS-ON)
If Llama achieves 100% pass rate on PCS-ON:
- **This becomes the most important row in the matrix**
- Proves PCS works with open-source, air-gapped models
- Validates "Transformers are Replaceable" thesis

### Realistic Case (3-4/5 PCS-ON)
If Llama achieves 60-80% pass rate:
- Architecture works
- Tool reliability imperfect (model scale issue)
- PCS preserves invariant despite model limitations

### Control Conditions
- **PCS-OFF:** Should be 0/5 (no tools, no retrieval)
- **Paste:** A3 should be 0/5 (no structured trace), A1/A2 informational

---

## Troubleshooting

### Error: "OPENAI_API_KEY not set"
```bash
export OPENAI_API_KEY="$GROQ_API_KEY"
```

### Error: "Unknown model: llama-3.1-8b-instant"
Check model name is exact: `llama-3.1-8b-instant` (Groq's production string)

### Tool calls not working
- Verify `OPENAI_BASE_URL=https://api.groq.com/openai/v1`
- Check Groq API key is valid
- Confirm Groq account has API access enabled

### Rate limits
Groq has generous rate limits, but if hit:
- Wait 60 seconds between runs
- Or use `--delay 60000` flag (if implemented)

---

## Matrix Interpretation

When results come in, the matrix will show:

| Model | PCS-ON | PCS-OFF | Paste |
|-------|--------|---------|-------|
| Claude Sonnet 3.5 | 10/10 | 0/10 | A3: 0/10 |
| GPT-4o | 5/5 | 0/5 | A3: 0/5 |
| **Llama 3.1 8B** | **?/5** | **0/5** | **A3: 0/5** |

**Key insight:** If Llama passes PCS-ON, it proves:
- PCS works beyond cloud providers
- Cognitive continuity is infrastructure, not model magic
- Open-source models + PCS > closed models alone

---

## Implementation Details

### Changes Made (14 lines total)

**1. OpenAI Provider Constructor (4 lines)**
```javascript
const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

this.client = new OpenAI({
  apiKey: config.openaiApiKey,
  baseURL
});
```

**2. Model Routing (10 lines)**
```javascript
getProvider(model) {
  if (model.includes('claude')) {
    return this.anthropic;
  } else if (model.includes('gpt')) {
    process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1';
    return this.openai;
  } else if (model.includes('llama')) {
    process.env.OPENAI_BASE_URL = 'https://api.groq.com/openai/v1';
    return this.openai;
  }
  throw new Error(`Unknown model: ${model}`);
}

getProviderName(model) {
  if (model.includes('llama')) {
    return 'groq';  // For run.json clarity
  }
  // ... other providers
}
```

---

## Why This Matters

Adding Llama 3.1 8B via Groq proves:
1. **PCS is provider-agnostic** (works with Anthropic, OpenAI, Groq)
2. **Open-source models are viable** (not just cloud giants)
3. **Air-gapped deployment possible** (Groq can run on-prem)
4. **Cost efficiency** (Llama inference is cheaper than GPT-4o)

If Llama achieves comparable results to GPT-4o, it validates the core PCS thesis: **cognitive continuity is infrastructure, not model intelligence**.
