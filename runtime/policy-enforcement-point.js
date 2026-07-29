/**
 * Policy Enforcement Point (PEP)
 * 
 * This is the critical piece.
 * 
 * Purpose: Deterministic boundary outside model
 * Proves: Governance relocation
 */

const DecisionStore = require('./decision-store');
const ContradictionDetector = require('./contradiction-detector');
const TraceEmitter = require('./trace-emitter');
const DeterministicPolicyEvaluator = require('./deterministic-policy-evaluator');

class PolicyEnforcementPoint {
  constructor(options = {}) {
    this.decisionStore = options.decisionStore || new DecisionStore();
    this.contradictionDetector = options.contradictionDetector || new ContradictionDetector();
    this.traceEmitter = options.traceEmitter || new TraceEmitter();
    this.enabled = options.enabled !== false; // Default to enabled
  }
  
  /**
   * Validate candidate output against decision state
   * This runs BEFORE output is returned to user
   * This is the architectural boundary
   * 
   * @param {string} candidateOutput - The output to validate
   * @returns {object} EnforcementResult
   */
  validate(candidateOutput) {
    // If PEP is disabled (PCS-OFF condition), pass through
    if (!this.enabled) {
      return {
        allowed: true,
        reason: 'PEP disabled (PCS-OFF)',
        trace: null,
        output: candidateOutput
      };
    }
    
    // Retrieve authoritative decision state
    const existingDecision = this.decisionStore.getLatestDecision();
    
    // Retrieve authoritative policy state
    const policies = this.decisionStore.getPolicies();
    
    // Check decision contradiction first
    const contradictionResult = this.contradictionDetector.detect(
      candidateOutput,
      existingDecision
    );
    
    // Check policy violations
    // Support both legacy (string constraint) and new (structured) policies
    let policyViolationResult = { contradicts: false, violations: [] };
    let evaluationResults = [];
    
    for (const policy of policies) {
      if (policy.rules && Array.isArray(policy.rules)) {
        // New: structured policy with deterministic ops
        const evalResult = DeterministicPolicyEvaluator.evaluate(candidateOutput, policy);
        evaluationResults.push(evalResult);
        
        if (evalResult.violated) {
          policyViolationResult.contradicts = true;
          policyViolationResult.violatedPolicy = policy.id;
          policyViolationResult.violations = evalResult.violations;
          policyViolationResult.policyVersion = evalResult.policyVersion;
          policyViolationResult.matchType = evalResult.matchType;
          policyViolationResult.policyHashSha256 = evalResult.policyHashSha256;
          policyViolationResult.reason = `Policy violation: ${evalResult.violations.map(v => v.reason).join(', ')}`;
          break; // Stop at first violation
        }
      } else {
        // Legacy: simple constraint string
        const legacyResult = this.contradictionDetector.detectPolicyViolation(
          candidateOutput,
          [policy]
        );
        
        if (legacyResult.contradicts) {
          policyViolationResult = legacyResult;
          break;
        }
      }
    }
    
    // Determine enforcement action (either contradiction OR policy violation)
    const allowed = !contradictionResult.contradicts && !policyViolationResult.contradicts;
    const action = allowed ? 'allowed' : 'blocked';
    
    // Determine reason (prioritize policy violation if both exist)
    let reason = contradictionResult.reason;
    let violatedPolicy = null;
    let violatedTerms = [];
    
    if (policyViolationResult.contradicts) {
      reason = policyViolationResult.reason;
      violatedPolicy = policyViolationResult.violatedPolicy;
      violatedTerms = policyViolationResult.violatedTerms || [];
    }
    
    // Get backend info for retrieval introspection (AVS-1R)
    const backendInfo = this.decisionStore.getBackendInfo();
    
    // Emit trace (proves boundary acted)
    const trace = this.traceEmitter.emit({
      event: 'policy_enforcement_point.invoked',
      decisionStateChecked: existingDecision ? existingDecision.id : null,
      policyStateChecked: policies.map(p => p.id),
      violationDetected: contradictionResult.contradicts || policyViolationResult.contradicts,
      action: action,
      reason: reason,
      candidateOutput: candidateOutput,
      existingDecision: existingDecision,
      violatedPolicy: violatedPolicy,
      violatedTerms: violatedTerms,
      enforcementDecision: {
        emitted: true,
        decision: allowed ? 'ALLOW' : 'DENY',
        reason: reason,
        policyViolation: policyViolationResult.contradicts,
        decisionContradiction: contradictionResult.contradicts,
        // Enhanced fields for structured policies
        ...(policyViolationResult.policyVersion && {
          policyId: violatedPolicy,
          policyVersion: policyViolationResult.policyVersion,
          matchType: policyViolationResult.matchType,
          policyHashSha256: policyViolationResult.policyHashSha256,
          violations: policyViolationResult.violations
        }),
        // Include policy hash even for ALLOW if structured policy was evaluated
        ...(evaluationResults.length > 0 && !policyViolationResult.policyVersion && {
          policyHashSha256: evaluationResults[0].policyHashSha256
        })
      },
      retrievalEvidence: {
        retrieved: existingDecision !== null || policies.length > 0,
        decisionId: existingDecision ? existingDecision.id : null,
        policyIds: policies.map(p => p.id),
        method: 'state-layer',
        trigger: (existingDecision || policies.length > 0) ? 'enforcement-check' : 'none',
        // Backend introspection (AVS-1R)
        backend: backendInfo.type,
        dimensions: backendInfo.dimensions,
        similarity: existingDecision ? 1.0 : null  // Mock perfect match for now, real similarity in EVS-7
      }
    });
    
    // Generate enforcement result
    const result = {
      allowed: allowed,
      reason: contradictionResult.reason,
      trace: trace,
      output: allowed ? candidateOutput : this.generateBlockedMessage(existingDecision)
    };
    
    return result;
  }
  
  /**
   * Generate blocked message when contradiction detected
   * @param {object} existingDecision - The decision that was contradicted
   * @returns {string} Blocked message
   */
  generateBlockedMessage(existingDecision) {
    if (!existingDecision) {
      return 'Output blocked by policy enforcement.';
    }
    
    return `I cannot provide that recommendation because we have an existing decision (${existingDecision.id}) that states: "${existingDecision.statement}"

If you want to change this decision, we need to explicitly revise ${existingDecision.id} through a decision revision workflow. Would you like to:
1. Keep the existing decision
2. Create a new decision record revising ${existingDecision.id}`;
  }
  
  /**
   * Enable or disable the PEP
   * @param {boolean} enabled - Whether to enable PEP
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

module.exports = PolicyEnforcementPoint;
