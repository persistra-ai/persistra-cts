const crypto = require('crypto');

/**
 * Meta-Programming Interface (Minimal)
 * Contract Version: 1.0.0 (FROZEN)
 * Routing Strategy: keyword-regex-v1
 */

const CONTRACT_VERSION = '1.0.0';
const ROUTING_STRATEGY = 'keyword-regex-v1';

class MetaProgrammingInterface {
  constructor(config = {}) {
    this.contractVersion = CONTRACT_VERSION;
    this.routingStrategy = ROUTING_STRATEGY;
    
    this.config = {
      confidenceThreshold: config.confidenceThreshold || 0.6,
      maxCapabilities: config.maxCapabilities || 100,
      maxAlternatives: config.maxAlternatives || 3
    };
    
    this.capabilities = new Map();
    this.executionHistory = [];
    this.lastRouting = null;
    this.lastExecution = null;
  }

  registerCapability(id, fn, metadata = {}) {
    if (this.capabilities.has(id)) {
      throw new Error(`CAPABILITY_ALREADY_REGISTERED: ${id}`);
    }
    
    if (this.capabilities.size >= this.config.maxCapabilities) {
      throw new Error(`MAX_CAPABILITIES_EXCEEDED: ${this.config.maxCapabilities}`);
    }
    
    if (typeof fn !== 'function') {
      throw new Error(`INVALID_CAPABILITY_FUNCTION: ${id}`);
    }
    
    const capability = {
      id,
      fn,
      matchers: metadata.matchers || [],
      description: metadata.description || '',
      category: metadata.category || 'general'
    };
    
    this.capabilities.set(id, capability);
    return { success: true, id };
  }

  getCapabilities() {
    return Array.from(this.capabilities.values()).map(cap => ({
      id: cap.id,
      description: cap.description,
      category: cap.category,
      matchers: cap.matchers
    }));
  }

  routeIntent(intent) {
    const intentLower = intent.toLowerCase();
    const scores = [];
    
    for (const [id, capability] of this.capabilities) {
      let score = 0;
      let maxPossibleScore = 0;
      
      for (const matcher of capability.matchers) {
        maxPossibleScore += matcher.weight;
        
        if (matcher.type === 'keyword') {
          if (intentLower.includes(matcher.value.toLowerCase())) {
            score += matcher.weight;
          }
        } else if (matcher.type === 'regex') {
          if (matcher.value.test(intent)) {
            score += matcher.weight;
          }
        }
      }
      
      const confidence = maxPossibleScore > 0 ? score / maxPossibleScore : 0;
      
      if (score > 0) {
        scores.push({ id, score, confidence, maxPossibleScore });
      }
    }
    
    scores.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.id.localeCompare(b.id);
    });
    
    const matched = scores.length > 0 ? scores[0] : null;
    const alternatives = scores.slice(1, this.config.maxAlternatives + 1);
    
    this.lastRouting = {
      intent_hash: this._hash(intent).slice(0, 16),
      matched_capability: matched ? matched.id : null,
      confidence: matched ? matched.confidence : 0,
      strategy: this.routingStrategy,
      alternatives: alternatives.map(alt => ({
        id: alt.id,
        score: alt.score,
        confidence: alt.confidence
      })),
      threshold: this.config.confidenceThreshold,
      deterministic: true
    };
    
    return {
      matchedId: matched ? matched.id : null,
      confidence: matched ? matched.confidence : 0,
      alternatives: alternatives.map(alt => ({
        id: alt.id,
        confidence: alt.confidence
      }))
    };
  }

  executeByIntent(intent, args = {}) {
    const routing = this.routeIntent(intent);
    
    if (!routing.matchedId) {
      this.lastExecution = {
        attempted: true,
        capability: null,
        args_hash: this._hash(JSON.stringify(args)).slice(0, 16),
        success: false,
        result_hash: null,
        error_code: 'CAPABILITY_NOT_FOUND'
      };
      
      throw new Error('CAPABILITY_NOT_FOUND');
    }
    
    if (routing.confidence < this.config.confidenceThreshold) {
      this.lastExecution = {
        attempted: true,
        capability: routing.matchedId,
        args_hash: this._hash(JSON.stringify(args)).slice(0, 16),
        success: false,
        result_hash: null,
        error_code: 'CONFIDENCE_BELOW_THRESHOLD'
      };
      
      throw new Error('CONFIDENCE_BELOW_THRESHOLD');
    }
    
    return this.executeCapability(routing.matchedId, args);
  }

  executeCapability(id, args = {}) {
    const capability = this.capabilities.get(id);
    
    if (!capability) {
      this.lastExecution = {
        attempted: true,
        capability: id,
        args_hash: this._hash(JSON.stringify(args)).slice(0, 16),
        success: false,
        result_hash: null,
        error_code: 'CAPABILITY_NOT_FOUND'
      };
      
      throw new Error('CAPABILITY_NOT_FOUND');
    }
    
    try {
      const result = capability.fn(args);
      
      this.lastExecution = {
        attempted: true,
        capability: id,
        args_hash: this._hash(JSON.stringify(args)).slice(0, 16),
        success: true,
        result_hash: this._hash(JSON.stringify(result)).slice(0, 16),
        error_code: null
      };
      
      this.executionHistory.push({
        timestamp: new Date().toISOString(),
        capability: id,
        success: true
      });
      
      return result;
    } catch (error) {
      this.lastExecution = {
        attempted: true,
        capability: id,
        args_hash: this._hash(JSON.stringify(args)).slice(0, 16),
        success: false,
        result_hash: null,
        error_code: 'EXECUTION_ERROR'
      };
      
      this.executionHistory.push({
        timestamp: new Date().toISOString(),
        capability: id,
        success: false,
        error: error.message
      });
      
      throw error;
    }
  }

  getExecutionTrace() {
    const sortedIds = Array.from(this.capabilities.keys()).sort();
    const idsHash = this._hash(sortedIds.join(',')).slice(0, 16);
    
    return {
      // Standard fields (all primitives)
      enabled: true,
      contract_version: this.contractVersion,
      deterministic: true,
      error_code: this.lastExecution?.error_code || null,
      
      // Meta-programming specific fields
      routing_strategy: this.routingStrategy,
      registry: {
        total: this.capabilities.size,
        ids_hash: idsHash
      },
      routing: this.lastRouting || null,
      execution: this.lastExecution || null
    };
  }

  _hash(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
  }
}

module.exports = MetaProgrammingInterface;
