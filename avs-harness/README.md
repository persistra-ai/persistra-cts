# AVS Harness

Minimal harness for automated AVS validation runs.

## Purpose

Automate generation + verification of AVS artifacts:
1. Load canonical case inputs (prompt + seed)
2. Execute runs (model + condition)
3. Normalize traces to `tool_trace.schema.json`
4. Write artifacts into exact run directory format
5. Run verification (A1/A2/A3 + schema validation)
6. Write PASS/FAIL back into `run.json`
7. Emit simple summary to stdout + `summary.json`

## Installation

```bash
cd evidence/avs-validation/harness
npm install
```

## Configuration

Set environment variables:

```bash
# Required: Provider credentials
export ANTHROPIC_API_KEY=your_key_here
export OPENAI_API_KEY=your_key_here

# Optional: PCS kernel endpoint (for PCS-ON condition)
export PCS_KERNEL_ENDPOINT=http://localhost:3000

# Optional: Override default parameters
export AVS_TEMPERATURE=0.7
export AVS_TOP_P=1.0
export AVS_SEED=null
export AVS_TOOL_CHOICE=auto
```

## Usage

### Phase 2A (First 6 Runs)

```bash
npm run phase-2a
```

Or:

```bash
node run-avs.js --phase=2a --date=2026-02-17
```

**Executes:**
- claude-sonnet-3.5: pcs-on, pcs-off, paste (run-0001 each)
- gpt-4o: pcs-on, pcs-off, paste (run-0001 each)

### Phase 2 (Full 45 Runs)

```bash
npm run phase-2
```

Or:

```bash
node run-avs.js --phase=2 --date=2026-02-17
```

**Executes:**
- claude-sonnet-3.5: 10 runs each condition (30 runs)
- gpt-4o: 5 runs each condition (15 runs)

## Output

Artifacts written to:

```
runs/2026-02-17/{model}/{condition}/run-{NNNN}/
├── run.json                      # Metadata + assertions
├── outputs/
│   ├── model_output.txt          # Raw model response
│   └── tool_trace.json           # Normalized tool trace
└── VERIFICATION.md               # Verification commands (if generated)
```

Summary written to:

```
runs/2026-02-17/summary.json
```

## Conditions

### PCS-ON
- PCS kernel enabled
- Tools provided to model
- Expect: A1=PASS, A2=PASS, A3=PASS

### PCS-OFF
- No PCS kernel
- No tools
- Expect: A1=FAIL, A2=FAIL, A3=FAIL

### Paste-Context
- No PCS kernel
- No tools
- Decision content injected into prompt
- Expect: A3=FAIL (required), A1/A2 variable

## Manual Sanity Check

After Phase 2A completes, perform manual sanity check:

1. Open one PCS-ON `model_output.txt`
2. Confirm it cites the nonce (not just paraphrases)
3. Confirm it includes decision content substring

If sanity check passes, proceed to Phase 2 (full 45 runs).

## Troubleshooting

### Missing API Keys

```
Configuration errors:
ANTHROPIC_API_KEY not set
```

**Fix:** Export API keys before running.

### Schema Validation Fails

```
❌ Schema validation failed: [...]
```

**Fix:** Review `lib/normalize/tool-trace.js` and ensure normalization follows `TOOL_TRACE_GUIDE.md`.

### Provider API Errors

```
❌ Error executing claude-sonnet-3.5/pcs-on: 401 Unauthorized
```

**Fix:** Verify API key is correct and not expired.

## Architecture

```
harness/
├── run-avs.js              # Main entry point + CLI
├── lib/
│   ├── config.js           # Environment variables + paths
│   ├── paths.js            # File I/O utilities
│   ├── case-loader.js      # Load case inputs
│   ├── providers/
│   │   ├── anthropic.js    # Anthropic API client
│   │   └── openai.js       # OpenAI API client
│   ├── normalize/
│   │   └── tool-trace.js   # Trace normalization
│   ├── verify/
│   │   ├── assertions.js   # A1/A2/A3 verification
│   │   └── schema.js       # JSON schema validation
│   └── write/
│       └── artifacts.js    # Write run artifacts
└── package.json
```

## Notes

- This is a test harness, not a product
- Minimal dependencies (Anthropic SDK, OpenAI SDK, AJV)
- Clinical execution: no showmanship, just artifacts
- Parameters must be identical across all conditions for same model
- PCS kernel integration is simulated (replace with real kernel calls)

## Next Steps

1. Run Phase 2A
2. Perform manual sanity check
3. If clean, run Phase 2 (full 45 runs)
4. Generate matrix summary
5. Generate diff files
6. Archive results
