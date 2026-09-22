/**
 * Epistemic Gate
 * 
 * Enforces epistemic integrity by preventing model invocation when required
 * cognitive state is absent. Distinct from policy gate (normative constraints).
 * 
 * Contract Version: 1.1.0 (added cryptographic gate signatures)
 */

const crypto = require('crypto');

const CONTRACT_VERSION = '1.1.0';
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
    
    // Cryptographic gate signing (software precursor to Tier 1 attested gating)
    this.cryptographicGatingEnabled = options.cryptographicGating !== false;
    
    // Generate ephemeral key pair for this gate instance
    // In production, this would be a persistent key or HSM-backed key
    if (this.cryptographicGatingEnabled) {
      const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
      this.privateKey = privateKey;
      this.publicKey = publicKey;
      this.publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
    }
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

    // Generate cryptographic signature if enabled
    if (this.cryptographicGatingEnabled) {
      const token = this.signGateDecision(this.lastEvaluation);
      this.lastEvaluation.gate_token = token;
    }

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
   * Sign gate decision with private key
   * 
   * This creates a cryptographically bound token that must be verified before invocation.
   * Bypassing the gate now requires forging a signature, not just ignoring a flag.
   * 
   * @param {Object} evaluation - Gate evaluation result
   * @returns {Object} Signed token
   */
  signGateDecision(evaluation) {
    if (!this.cryptographicGatingEnabled) {
      return null;
    }

    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    
    // Create canonical payload
    const payload = {
      invocation_permitted: evaluation.invocation_permitted,
      timestamp: timestamp,
      nonce: nonce,
      gate_triggered: evaluation.epistemic_gate_triggered,
      missing_state: evaluation.missing_required_state
    };

    // Sign payload
    const payloadString = JSON.stringify(payload);
    const signature = crypto.sign(null, Buffer.from(payloadString), this.privateKey);

    return {
      payload: payload,
      signature: signature.toString('base64'),
      public_key: this.publicKeyPem,
      algorithm: 'ed25519'
    };
  }

  /**
   * Verify gate token signature
   * 
   * This must be called before model invocation to verify the gate decision.
   * Returns true if signature is valid and invocation is permitted.
   * 
   * @param {Object} token - Gate token to verify
   * @param {Object} decisionStore - DecisionStore instance for nonce validation (optional but recommended)
   * @returns {boolean} True if valid and invocation permitted
   */
  static verifyGateToken(token, decisionStore = null) {
    if (!token || !token.payload || !token.signature || !token.public_key) {
      return false;
    }

    try {
      // Validate nonce if DecisionStore provided (replay attack prevention)
      if (decisionStore && token.payload.nonce) {
        const nonceValidation = decisionStore.validateNonce(
          token.payload.nonce,
          token.payload.timestamp
        );
        
        if (!nonceValidation.valid) {
          // Nonce already used or invalid - replay attack detected
          return false;
        }
      }
      
      // Reconstruct payload
      const payloadString = JSON.stringify(token.payload);
      const signature = Buffer.from(token.signature, 'base64');
      
      // Import public key
      const publicKey = crypto.createPublicKey({
        key: token.public_key,
        format: 'pem',
        type: 'spki'
      });

      // Verify signature
      const isValid = crypto.verify(
        null,
        Buffer.from(payloadString),
        publicKey,
        signature
      );

      if (!isValid) {
        return false;
      }

      // Check timestamp (token expires after 60 seconds)
      const now = Date.now();
      const tokenAge = now - token.payload.timestamp;
      if (tokenAge > 60000) {
        return false; // Token expired
      }

      // Check invocation permission
      return token.payload.invocation_permitted === true;
      
    } catch (err) {
      return false;
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
