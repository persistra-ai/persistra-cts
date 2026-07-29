# PCS-CTS Evidence Artifacts

This document defines the PCS-CTS evidence artifacts emitted by a PCS-CTS run.

These artifacts are intended to provide:
- **Reproducibility** (a run can be repeated)
- **Transferability** (a third party can inspect evidence)
- **Neutrality** (validation is not dependent on a UI or vendor tooling)

This document is **informative** with respect to the PCS RFC suite. It defines PCS-CTS outputs for v1.0.0 execution and independent validation.

## Artifact Set

A PCS-CTS run MUST emit an evidence bundle consisting of:

1. `conformance.json` — structured conformance outcomes and metadata  
2. `trace.json` — structured glass-box evidence for the scenario execution  
3. `attestation.txt` — hashes and environment summary sufficient for integrity checks

The exact on-disk layout is implementation-defined, but the semantics below MUST be satisfied.

## Core Principles

### Semantics Over Schema
PCS-CTS MUST capture required evidence semantics without requiring a specific storage format, directory structure, or serialization schema beyond the minimum needed for machine-readable inspection.

### No Numeric Thresholds
PCS-CTS MUST NOT require specific numeric thresholds (percentages, scores, or accuracy rates) as a prerequisite for conformance unless such thresholds are explicitly defined in a future PCS RFC.

### Trace Evidence, Not UI
PCS-CTS MUST provide trace evidence that can be inspected without a UI. Any visualization tooling is optional and out of scope for the evidence contract.

## `conformance.json` Semantics

`conformance.json` MUST provide, at minimum:

- The PCS RFC version or tag under test (e.g., `v0.1-draft`)
- The PCS-CTS version under which the run occurred
- The declared conformance level(s) being evaluated (e.g., `L1`, `L2`)
- The scenario identifiers executed
- A pass/fail outcome per scenario
- A summary outcome for the run

`conformance.json` SHOULD include:
- Start/end timestamps
- Duration per scenario
- A stable implementation identifier (implementation-defined)
- A pointer or reference to the associated trace artifact(s)

### Informative Example (non-normative)

```json
{
  "pcs_spec_version": "v0.1-draft",
  "pcs_cts_version": "0.1.0",
  "implementation_id": "example-impl",
  "levels_evaluated": ["L1"],
  "scenarios": [
    { "id": "L1.persistence.decision-state-recovery", "passed": true }
  ],
  "passed": true,
  "timestamp_start": "2026-02-12T16:00:00Z",
  "timestamp_end": "2026-02-12T16:01:30Z"
}
```

## `trace.json` Semantics

`trace.json` MUST capture enough evidence for an independent reviewer to verify that:
- A session boundary was enforced (or simulated) as required by the scenario
- The implementation's output indicates state retrieval (where required)
- The implementation's output indicates policy enforcement decisions (where required)
- Provenance evidence exists for relevant state creation and use (where required)

`trace.json` MUST include:
- The scenario identifier
- A sequence of phases or steps
- For each phase, evidence that is externally inspectable

`trace.json` SHOULD include:
- Redacted or truncated excerpts rather than full prompts/transcripts
- Stable references to state identifiers (implementation-defined)
- A minimal provenance chain sufficient to support auditability

PCS-CTS MUST treat the internal mechanism for producing these traces as implementation-defined.

### Informative Example (non-normative)

```json
{
  "scenario": "L1.persistence.decision-state-recovery",
  "phases": [
    {
      "phase": "seed",
      "state_ref": "DEC-001",
      "content_excerpt": "User decided to prioritize feature X..."
    },
    {
      "phase": "session-boundary",
      "boundary_confirmed": true
    },
    {
      "phase": "retrieve",
      "retrieval_evidence": {
        "present": true,
        "matched_ref": "DEC-001"
      }
    }
  ]
}
```

## `attestation.txt` Semantics

`attestation.txt` MUST provide integrity and environment context sufficient to:
- Detect tampering with `conformance.json` and `trace.json`
- Identify the execution environment at a coarse level

It MUST include:
- Cryptographic hashes (or equivalent integrity checks) for `conformance.json` and `trace.json`
- A timestamp for the run
- Basic environment summary (OS, runtime version, CTS version)

It SHOULD include:
- Target implementation revision (commit hash) if available
- Invocation command line (redacted as needed)

### Informative Example (non-normative)

```
PCS-CTS Attestation
timestamp: 2026-02-12T16:20:00Z
pcs_spec_version: v0.1-draft
pcs_cts_version: 0.1.0
hash(conformance.json): sha256:a1b2c3d4...
hash(trace.json): sha256:e5f6g7h8...
runtime: node v20.11.0
os: darwin arm64
target_implementation: persistra-kernel@abc123
```

## Evidence Bundle Naming and Storage

- PCS-CTS MAY store evidence bundles under an `output/` directory.
- PCS-CTS MAY create per-run subdirectories.
- The naming convention is implementation-defined.

The PCS-CTS implementation MUST ensure evidence bundles are discoverable and do not overwrite prior runs unless explicitly requested.

## Redaction and Safety

PCS-CTS MUST avoid leaking secrets (API keys, credentials, private data).

PCS-CTS SHOULD minimize transcript capture. Where text evidence is required, PCS-CTS SHOULD store short excerpts and stable references rather than full content.
