/**
 * Query Classifier
 * 
 * Deterministic query classification for epistemic gate enforcement.
 * Uses simple regex/keyword matching (Phase 1 implementation).
 * 
 * Contract Version: 1.0.0
 * Classification Config Version: 1.0.0
 */

const CONTRACT_VERSION = '1.0.0';
const CLASSIFICATION_CONFIG_VERSION = '1.0.0';

class QueryClassifier {
  constructor() {
    this.contractVersion = CONTRACT_VERSION;
    this.classificationConfigVersion = CLASSIFICATION_CONFIG_VERSION;
    
    // Simple regex-based classification rules
    // Phase 1: High precision, low coverage acceptable
    this.classificationRules = [
      {
        queryType: 'architectural_decision',
        patterns: [
          /why\s+(was|did\s+we|were)\s+.+\s+(selected|chosen|used|picked)/i,
          /what\s+led\s+to\s+.+\s+(decision|choice)/i,
          /rationale\s+(for|behind)\s+.+\s+(decision|choice)/i,
          /why\s+.+\s+(instead\s+of|rather\s+than|over)/i
        ],
        requiredStateClasses: ['decision_record']
      },
      {
        queryType: 'policy_question',
        patterns: [
          /what\s+(is|are)\s+(our|the)\s+policy\s+(on|for|regarding)/i,
          /are\s+we\s+allowed\s+to/i,
          /is\s+it\s+permitted\s+to/i,
          /policy\s+(states|requires|mandates)/i
        ],
        requiredStateClasses: ['policy_constraint']
      },
      {
        queryType: 'threat_assessment',
        patterns: [
          /what\s+(are|is)\s+the\s+(security|threat|risk)/i,
          /threat\s+model/i,
          /security\s+(implications|risks|concerns)/i,
          /attack\s+(surface|vector)/i
        ],
        requiredStateClasses: ['threat_model']
      }
    ];
  }

  /**
   * Classify a query deterministically
   * 
   * @param {string} query - Natural language query
   * @returns {Object} Classification result
   */
  classify(query) {
    if (!query || typeof query !== 'string') {
      return {
        query_type: 'unclassified',
        required_state_classes: [],
        classification_config_version: this.classificationConfigVersion,
        contract_version: this.contractVersion
      };
    }

    // Try each classification rule in order
    for (const rule of this.classificationRules) {
      for (const pattern of rule.patterns) {
        if (pattern.test(query)) {
          return {
            query_type: rule.queryType,
            required_state_classes: [...rule.requiredStateClasses],
            classification_config_version: this.classificationConfigVersion,
            contract_version: this.contractVersion,
            matched_pattern: pattern.source
          };
        }
      }
    }

    // No match found - unclassified
    return {
      query_type: 'unclassified',
      required_state_classes: [],
      classification_config_version: this.classificationConfigVersion,
      contract_version: this.contractVersion
    };
  }

  /**
   * Get classification evidence for audit trail
   * 
   * @returns {Object} Classifier metadata
   */
  getClassifierEvidence() {
    return {
      enabled: true,
      contract_version: this.contractVersion,
      classification_config_version: this.classificationConfigVersion,
      total_rules: this.classificationRules.length,
      supported_query_types: this.classificationRules.map(r => r.queryType)
    };
  }
}

module.exports = QueryClassifier;
