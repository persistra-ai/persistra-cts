/**
 * Deterministic Policy Evaluator
 * 
 * Purpose: Evaluate policies using deterministic operations
 * Scope: NO semantic inference, only structural + lexical
 * 
 * Supported Operations:
 * 1. regex_absent - Pattern must NOT match in target
 * 2. json_pointer_absent - JSON pointer must NOT exist in target
 */

const CommitmentExtractor = require('./commitment-extractor');

class DeterministicPolicyEvaluator {
  /**
   * Evaluate output against policy
   * @param {string} candidateOutput - Model output to evaluate
   * @param {object} policy - Policy object (from PolicySchema)
   * @returns {object} Evaluation result
   */
  static evaluate(candidateOutput, policy) {
    // Extract commitment block
    const extracted = CommitmentExtractor.extract(candidateOutput);
    
    const violations = [];
    
    // Evaluate each rule
    for (const rule of policy.rules) {
      const violation = this.evaluateRule(extracted, rule);
      if (violation) {
        violations.push(violation);
      }
    }
    
    return {
      policyId: policy.policyId,
      policyVersion: policy.version,
      matchType: policy.matchType,
      policyHashSha256: policy.policyHashSha256,
      violated: violations.length > 0,
      violations: violations
    };
  }
  
  /**
   * Evaluate a single rule
   * @param {object} extracted - Extracted output { text, commitment }
   * @param {object} rule - Rule to evaluate
   * @returns {object|null} Violation object or null if no violation
   */
  static evaluateRule(extracted, rule) {
    if (rule.op === 'regex_absent') {
      return this.evaluateRegexAbsent(extracted, rule);
    }
    
    if (rule.op === 'json_pointer_absent') {
      return this.evaluateJsonPointerAbsent(extracted, rule);
    }
    
    throw new Error(`Unsupported operation: ${rule.op}`);
  }
  
  /**
   * Evaluate regex_absent rule
   * @param {object} extracted - Extracted output
   * @param {object} rule - Rule to evaluate
   * @returns {object|null} Violation or null
   */
  static evaluateRegexAbsent(extracted, rule) {
    // Get target value
    const targetValue = this.getTarget(extracted, rule.target);
    
    if (targetValue === null || targetValue === undefined) {
      // Target doesn't exist, rule passes
      return null;
    }
    
    if (typeof targetValue !== 'string') {
      // Target is not a string, cannot apply regex
      return null;
    }
    
    // Test regex
    const regex = new RegExp(rule.pattern, 'i'); // Case-insensitive by default
    const match = targetValue.match(regex);
    
    if (match) {
      // Violation: pattern found
      return {
        ruleId: rule.ruleId,
        reason: rule.reason,
        evidence: {
          target: rule.target,
          match: this.redactSecret(match[0]) // Redact for security
        }
      };
    }
    
    return null;
  }
  
  /**
   * Evaluate json_pointer_absent rule
   * @param {object} extracted - Extracted output
   * @param {object} rule - Rule to evaluate
   * @returns {object|null} Violation or null
   */
  static evaluateJsonPointerAbsent(extracted, rule) {
    // Get target object
    const targetValue = this.getTarget(extracted, rule.target);
    
    if (targetValue === null || targetValue === undefined) {
      // Target doesn't exist, rule passes
      return null;
    }
    
    if (typeof targetValue !== 'object') {
      // Target is not an object, cannot apply JSON pointer
      return null;
    }
    
    // Check if pointer exists
    const exists = CommitmentExtractor.hasPointer(targetValue, rule.pointer);
    
    if (exists) {
      // Violation: pointer found
      const value = CommitmentExtractor.getByPointer(targetValue, rule.pointer);
      
      return {
        ruleId: rule.ruleId,
        reason: rule.reason,
        evidence: {
          target: rule.target,
          pointer: rule.pointer,
          value: this.redactSecret(value) // Redact for security
        }
      };
    }
    
    return null;
  }
  
  /**
   * Get target value from extracted output
   * @param {object} extracted - Extracted output { text, commitment }
   * @param {string} target - Target path (e.g., "output.text", "output.commitment")
   * @returns {any} Target value
   */
  static getTarget(extracted, target) {
    if (target === 'output.text') {
      return extracted.text;
    }
    
    if (target === 'output.commitment') {
      return extracted.commitment;
    }
    
    // Support nested paths like "output.commitment.backend_language"
    if (target.startsWith('output.commitment.')) {
      const pointer = '/' + target.slice('output.commitment.'.length).replace(/\./g, '/');
      return CommitmentExtractor.getByPointer(extracted.commitment, pointer);
    }
    
    throw new Error(`Unsupported target: ${target}`);
  }
  
  /**
   * Redact secrets in evidence for security
   * @param {any} value - Value to redact
   * @returns {string} Redacted value
   */
  static redactSecret(value) {
    if (typeof value !== 'string') {
      return '[REDACTED]';
    }
    
    // Redact API keys (sk-...)
    if (value.match(/^sk-[A-Za-z0-9]+$/)) {
      return value.slice(0, 6) + '-REDACTED';
    }
    
    // Redact other secrets (show first 6 chars)
    if (value.length > 10) {
      return value.slice(0, 6) + '-REDACTED';
    }
    
    return '[REDACTED]';
  }
}

module.exports = DeterministicPolicyEvaluator;
