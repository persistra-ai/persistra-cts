/**
 * Evidence Normalizer
 * 
 * Normalizes evidence bundles for stable evidence_hash computation.
 * 
 * See: docs/EVIDENCE_HASH_SPECIFICATION.md
 */

const crypto = require('crypto');

/**
 * Normalize evidence bundle for hash computation
 * 
 * Removes/redacts nondeterministic fields:
 * - timestamps
 * - session IDs
 * - random nonces
 * - random decision/policy IDs
 * 
 * Keeps only stable conformance claims.
 */
function normalizeEvidenceForHash(conformance, trace) {
  // Extract stable fields from conformance
  const normalized = {
    evidence_schema_version: 'evidence-v1',
    pcs_spec_version: conformance.pcs_spec_version,
    pcs_cts_version: conformance.pcs_cts_version,
    conformance_level: conformance.levels_evaluated?.[0] || 'unknown',
    implementation_id: conformance.implementation_id,
    implementation_fingerprint: conformance.target_build?.fingerprint || null,
    adapter_info: null, // TODO: extract from trace if present
    passed: conformance.passed,
    scenario_results: []
  };

  // Normalize scenario results (only ID and pass/fail)
  if (conformance.scenarios && Array.isArray(conformance.scenarios)) {
    normalized.scenario_results = conformance.scenarios.map(s => ({
      id: s.id,
      passed: s.passed,
      categorical_reason: s.categorical_reason || null
    }));
  }

  // Extract stable categorical claims from trace
  // (e.g., invariants that are part of conformance contract)
  if (trace && trace.scenarios && Array.isArray(trace.scenarios)) {
    normalized.scenario_invariants = trace.scenarios.map(scenarioTrace => {
      const invariants = extractStableInvariants(scenarioTrace);
      return {
        scenario: scenarioTrace.scenario,
        invariants: invariants
      };
    }).filter(s => Object.keys(s.invariants).length > 0);
  }

  return normalized;
}

/**
 * Extract stable invariants from scenario trace
 * 
 * Includes only categorical/boolean claims that are part of conformance.
 * Excludes random IDs, nonces, timestamps, session IDs.
 */
function extractStableInvariants(scenarioTrace) {
  const invariants = {};

  if (!scenarioTrace.phases || !Array.isArray(scenarioTrace.phases)) {
    return invariants;
  }

  // Look for invariants-check phase
  const invariantsPhase = scenarioTrace.phases.find(p => p.phase === 'invariants-check');
  if (invariantsPhase && invariantsPhase.invariants) {
    // Include only boolean/categorical invariants
    for (const [key, value] of Object.entries(invariantsPhase.invariants)) {
      if (typeof value === 'boolean') {
        invariants[key] = value;
      }
    }
  }

  // Look for continuity events (categorical claims)
  const continuityPhases = scenarioTrace.phases.filter(p => 
    p.continuityEvent && typeof p.continuityEvent.confirmed === 'boolean'
  );
  
  if (continuityPhases.length > 0) {
    invariants.continuityEventConfirmed = continuityPhases.every(p => 
      p.continuityEvent.confirmed === true
    );
  }

  return invariants;
}

/**
 * Canonical JSON serialization
 * 
 * - Deep key sorting (lexicographic)
 * - No whitespace
 * - Deterministic
 */
function canonicalJSON(obj) {
  if (obj === null) {
    return 'null';
  }
  
  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJSON).join(',') + ']';
  }
  
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(k => `"${k}":${canonicalJSON(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * Compute evidence hash from normalized record
 */
function computeEvidenceHash(conformance, trace) {
  const normalized = normalizeEvidenceForHash(conformance, trace);
  const canonical = canonicalJSON(normalized);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Compute bundle hash from raw artifacts
 */
function computeBundleHash(conformance, trace, attestation) {
  const conformanceStr = JSON.stringify(conformance);
  const traceStr = JSON.stringify(trace);
  const attestationStr = attestation || '';
  
  const combined = conformanceStr + traceStr + attestationStr;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

module.exports = {
  normalizeEvidenceForHash,
  canonicalJSON,
  computeEvidenceHash,
  computeBundleHash
};
