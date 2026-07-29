/**
 * Policy Schema v0.1 - Deterministic Gate
 * 
 * Purpose: Minimal, deterministic policy enforcement
 * Scope: Lexical + Structural (NO semantic inference)
 * 
 * Supported Operations:
 * 1. regex_absent - Pattern must NOT match in target
 * 2. json_pointer_absent - JSON pointer must NOT exist in target
 */

const crypto = require('crypto');

class PolicySchema {
  /**
   * Create a deterministic policy
   * @param {object} policyDef - Policy definition
   * @returns {object} Validated policy with hash
   */
  static create(policyDef) {
    // Validate required fields
    if (!policyDef.policyId) {
      throw new Error('Policy must have policyId');
    }
    
    if (!policyDef.rules || !Array.isArray(policyDef.rules)) {
      throw new Error('Policy must have rules array');
    }
    
    // Set defaults
    const policy = {
      policyId: policyDef.policyId,
      version: policyDef.version || '0.1',
      policyType: policyDef.policyType || 'deterministic_gate',
      matchType: policyDef.matchType || 'lexical+structural',
      scope: policyDef.scope || ['output'],
      rules: policyDef.rules,
      metadata: policyDef.metadata || {}
    };
    
    // Validate rules
    for (const rule of policy.rules) {
      this.validateRule(rule);
    }
    
    // Generate policy hash for audit trail
    policy.policyHashSha256 = this.generateHash(policy);
    
    return policy;
  }
  
  /**
   * Validate a single rule
   * @param {object} rule - Rule to validate
   */
  static validateRule(rule) {
    if (!rule.ruleId) {
      throw new Error('Rule must have ruleId');
    }
    
    if (!rule.op) {
      throw new Error('Rule must have op (operation)');
    }
    
    // Validate supported ops
    const supportedOps = ['regex_absent', 'json_pointer_absent'];
    if (!supportedOps.includes(rule.op)) {
      throw new Error(`Unsupported op: ${rule.op}. Supported: ${supportedOps.join(', ')}`);
    }
    
    // Validate op-specific fields
    if (rule.op === 'regex_absent') {
      if (!rule.pattern) {
        throw new Error('regex_absent requires pattern field');
      }
      
      // Validate regex is valid
      try {
        new RegExp(rule.pattern);
      } catch (e) {
        throw new Error(`Invalid regex pattern: ${rule.pattern}`);
      }
    }
    
    if (rule.op === 'json_pointer_absent') {
      if (!rule.pointer) {
        throw new Error('json_pointer_absent requires pointer field');
      }
      
      // Validate pointer format (must start with /)
      if (!rule.pointer.startsWith('/')) {
        throw new Error(`Invalid JSON pointer: ${rule.pointer} (must start with /)`);
      }
    }
    
    if (!rule.target) {
      throw new Error('Rule must have target field');
    }
    
    if (!rule.severity) {
      throw new Error('Rule must have severity field');
    }
    
    if (!rule.reason) {
      throw new Error('Rule must have reason field');
    }
  }
  
  /**
   * Generate SHA-256 hash of policy for audit trail
   * @param {object} policy - Policy object
   * @returns {string} SHA-256 hash
   */
  static generateHash(policy) {
    // Create canonical JSON (sorted keys, no hash field)
    const canonical = {
      policyId: policy.policyId,
      version: policy.version,
      policyType: policy.policyType,
      matchType: policy.matchType,
      scope: policy.scope,
      rules: policy.rules
    };
    
    const json = JSON.stringify(canonical, Object.keys(canonical).sort());
    return crypto.createHash('sha256').update(json).digest('hex');
  }
  
  /**
   * Create a simple policy from constraint string (legacy support)
   * 
   * @deprecated This method is transitional for backward compatibility.
   * New policies should use PolicySchema.create() with structured rules.
   * Legacy string constraints are converted to regex_absent rules but lack
   * the precision and auditability of explicit deterministic operations.
   * 
   * @param {string} constraint - Constraint string (e.g., "AWS is forbidden")
   * @param {string} policyId - Optional policy ID
   * @returns {object} Policy object
   */
  static fromConstraint(constraint, policyId = null) {
    const id = policyId || `POL-${Date.now()}`;
    
    // Extract forbidden terms
    const forbiddenTerms = this.extractForbiddenTerms(constraint);
    
    // Create rules for each term
    const rules = forbiddenTerms.map((term, index) => ({
      ruleId: `forbidden_term_${index + 1}`,
      op: 'regex_absent',
      target: 'output.text',
      pattern: `\\b${this.escapeRegex(term)}\\b`,
      severity: 'deny',
      reason: `forbidden_term_detected: ${term}`
    }));
    
    return this.create({
      policyId: id,
      version: '0.1',
      policyType: 'deterministic_gate',
      matchType: 'lexical',
      scope: ['output'],
      rules: rules,
      metadata: {
        originalConstraint: constraint
      }
    });
  }
  
  /**
   * Extract forbidden terms from constraint string
   * @param {string} constraint - Constraint string
   * @returns {array} List of forbidden terms
   */
  static extractForbiddenTerms(constraint) {
    const terms = [];
    const words = constraint.split(/\s+/);
    
    for (let i = 0; i < words.length; i++) {
      if (words[i].toLowerCase() === 'forbidden') {
        let j = i - 1;
        
        // Skip "are" or "is"
        if (j >= 0 && (words[j].toLowerCase() === 'are' || words[j].toLowerCase() === 'is')) {
          j--;
        }
        
        // Collect terms before "are/is forbidden"
        while (j >= 0) {
          const word = words[j].replace(/[^a-zA-Z0-9-]/g, '');
          if (word.length > 2 && !['and', 'all', 'the', 'due', 'to'].includes(word.toLowerCase())) {
            terms.unshift(word);
          }
          j--;
          if (terms.length >= 5) break;
        }
        break;
      }
    }
    
    return terms;
  }
  
  /**
   * Escape special regex characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  static escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

module.exports = PolicySchema;
