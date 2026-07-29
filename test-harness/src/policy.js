/**
 * Policy Enforcement
 * 
 * Simple constraint matcher with deterministic ALLOW/DENY decisions
 * No LLM calls - just keyword matching and rule evaluation
 */

class Policy {
  constructor(stateStore) {
    this.stateStore = stateStore;
  }

  /**
   * Enforce policies against a prompt
   * Returns deterministic ALLOW/DENY with trace evidence
   */
  enforce(prompt, namespace = 'default') {
    const policies = this.stateStore.getPolicies(namespace);
    
    if (policies.length === 0) {
      // No policies to enforce
      return {
        text: 'No policies are currently active.',
        trace: {
          enforcementDecision: {
            emitted: true,
            decision: 'ALLOW'
          },
          enforcementTrace: [{
            decision: 'ALLOW',
            reason: 'no-policies-defined',
            policyReferenced: false
          }]
        }
      };
    }

    // Check each policy for violations
    for (const policy of policies) {
      const violation = this.checkViolation(prompt, policy);
      if (violation) {
        return {
          text: `Request denied. ${violation.reason}`,
          trace: {
            enforcementDecision: {
              emitted: true,
              decision: 'DENY',
              policyId: policy.id,
              violatedTerms: violation.violatedTerms || []
            },
            enforcementTrace: [{
              decision: 'DENY',
              reason: 'policy-constraint-enforced',
              policyId: policy.id,
              policyReferenced: true,
              violationDetail: violation.detail
            }]
          }
        };
      }
    }

    // No violations found
    return {
      text: 'Request approved.',
      trace: {
        enforcementDecision: {
          emitted: true,
          decision: 'ALLOW'
        },
        enforcementTrace: [{
          decision: 'ALLOW',
          reason: 'no-policy-violations',
          policyReferenced: true
        }]
      }
    };
  }

  /**
   * Check if prompt violates a policy
   * Simple keyword matching - no embeddings needed
   */
  checkViolation(prompt, policy) {
    const lower = prompt.toLowerCase();
    const constraint = policy.constraint.toLowerCase();

    // Extract forbidden terms from constraint
    // Look for patterns like "AWS and all cloud services are forbidden"
    // Extract all words before "forbidden" or "is/are forbidden"
    const forbiddenTerms = [];
    
    // Split constraint into words and look for forbidden terms
    const words = constraint.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      if (words[i] === 'forbidden' || 
          (words[i] === 'are' && words[i+1] === 'forbidden') ||
          (words[i] === 'is' && words[i+1] === 'forbidden')) {
        // Look backwards to find the forbidden terms
        // Example: "AWS and all cloud services are forbidden"
        // We want to extract "AWS" and "cloud services"
        let j = i - 1;
        if (words[j] === 'are' || words[j] === 'is') j--;
        
        // Collect terms before "are/is forbidden"
        const terms = [];
        while (j >= 0 && !['and', 'all', 'the'].includes(words[j])) {
          terms.unshift(words[j]);
          j--;
          if (terms.length >= 2) break; // Limit to 2-word terms
        }
        
        if (terms.length > 0) {
          forbiddenTerms.push(terms.join(' '));
        }
        
        // Also check for terms at the beginning of the constraint
        // Example: "AWS and all cloud services are forbidden" -> extract "AWS"
        if (i > 2) {
          for (let k = 0; k < Math.min(3, i - 1); k++) {
            if (words[k] && words[k].length > 2 && !['and', 'all', 'the', 'due', 'to'].includes(words[k])) {
              forbiddenTerms.push(words[k]);
            }
          }
        }
      }
    }

    // Check if prompt contains any forbidden terms
    const violatedTermsSet = new Set();
    for (const term of forbiddenTerms) {
      if (lower.includes(term)) {
        violatedTermsSet.add(term);
      }
    }
    
    const violatedTerms = Array.from(violatedTermsSet);
    if (violatedTerms.length > 0) {
      return {
        reason: `Policy ${policy.id} prohibits ${violatedTerms.join(', ')}.`,
        detail: `Constraint: ${policy.constraint}`,
        violatedTerms: violatedTerms
      };
    }

    // No violation detected
    return null;
  }
}

module.exports = Policy;
