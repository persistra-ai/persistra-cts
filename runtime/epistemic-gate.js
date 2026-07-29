/**
 * Epistemic Gate
 * 
 * Enforces epistemic integrity by preventing model invocation when required
 * cognitive state is absent. Distinct from policy gate (normative constraints).
 * 
 * Contract Version: 1.0.0
 */

const CONTRACT_VERSION = '1.0.0';
const POLICY_MAPPING_VERSION = '1.0.0';

class EpistemicGate {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.contractVersion = CONTRACT_VERSION;
    this.policyMappingVersion = POLICY_MAPPING_VERSION;
    
    // Track invocation attempts during block
    this.engineInvocationsDuringBlock = 0;
    
    // Last evaluation state
    this.lastEvaluation = null;
  }

  /**
   * Evaluate epistemic gate for a query
   * 
   * @param {Object} classification - Query classification result
   * @param {Array} availableStateClasses - State classes in working context
   * @returns {Object} Gate evaluation result
   */
  evaluate(classification, availableStateClasses = []) {
    const startTime = process.hrtime.bigint();

    if (!this.enabled) {
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      return {
        epistemic_gate_evaluated: false,
        epistemic_gate_triggered: false,
        epistemic_gate_mode: 'disabled',
        missing_required_state: [],
        invocation_permitted: true,
        gate_evaluation_time_ms: durationMs
      };
    }

    const requiredClasses = classification.required_state_classes || [];
    
    // Unclassified queries bypass epistemic gate
    if (classification.query_type === 'unclassified') {
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;
      this.lastEvaluation = {
        epistemic_gate_evaluated: true,
        epistemic_gate_triggered: false,
        epistemic_gate_mode: 'bypassed_unclassified',
        required_state_classes: [],
        available_state_classes: [...availableStateClasses],
        missing_required_state: [],
        invocation_permitted: true,
        gate_evaluation_time_ms: durationMs
      };
      return this.lastEvaluation;
    }

    // Check for missing required state
    const missingClasses = requiredClasses.filter(
      cls => !availableStateClasses.includes(cls)
    );

    const gateTriggered = missingClasses.length > 0;

    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;

    this.lastEvaluation = {
      epistemic_gate_evaluated: true,
      epistemic_gate_triggered: gateTriggered,
      epistemic_gate_mode: 'enforced',
      required_state_classes: [...requiredClasses],
      available_state_classes: [...availableStateClasses],
      missing_required_state: [...missingClasses],
      invocation_permitted: !gateTriggered,
      gate_evaluation_time_ms: durationMs
    };

    // Reset invocation counter if gate triggers
    if (gateTriggered) {
      this.engineInvocationsDuringBlock = 0;
    }

    return this.lastEvaluation;
  }

  /**
   * Record an engine invocation attempt during block
   * (Should never happen if gate is working correctly)
   */
  recordInvocationAttempt() {
    if (this.lastEvaluation && this.lastEvaluation.epistemic_gate_triggered) {
      this.engineInvocationsDuringBlock++;
    }
  }

  /**
   * Get epistemic gate evidence for audit trail
   * 
   * @returns {Object} Gate evidence
   */
  getEvidence() {
    if (!this.enabled) {
      return {
        enabled: false,
        contract_version: this.contractVersion
      };
    }

    return {
      enabled: true,
      contract_version: this.contractVersion,
      policy_mapping_version: this.policyMappingVersion,
      ...(this.lastEvaluation || {}),
      engine_invocations_during_block: this.engineInvocationsDuringBlock
    };
  }

  /**
   * Reset gate state (for new query)
   */
  reset() {
    this.engineInvocationsDuringBlock = 0;
    this.lastEvaluation = null;
  }
}

module.exports = EpistemicGate;
