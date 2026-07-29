/**
 * Minimal Contextual Salience Engine
 * 
 * Deterministic salience-based prioritization under constraint.
 * No embeddings, no identity, no dynamic gating - pure priority enforcement.
 * 
 * EVS-10: Proves that context selection under pressure is substrate-governed
 * and salience-prioritized, not arbitrary.
 * 
 * @created 2026-03-03
 * @module pcs-runtime/cse-minimal
 */

/**
 * Minimal CSE Configuration
 * @typedef {Object} CSEConfig
 * @property {number} recencyWeight - Weight for recency decay (default: 0.4)
 * @property {number} importanceWeight - Weight for importance score (default: 0.6)
 * @property {number} recencyDecayHours - Hours for 50% recency decay (default: 168 = 7 days)
 */

/**
 * Memory Item for CSE
 * @typedef {Object} MemoryItem
 * @property {string} id - Unique identifier
 * @property {string} content - Memory content
 * @property {number} timestamp - Creation timestamp (ms)
 * @property {number} importance - Importance score [0-1] (default: 0.5)
 * @property {Object} metadata - Optional metadata
 */

const CONTRACT_VERSION = '1.0.0';
const STRATEGY = 'salience-priority-v1';

/**
 * CSE Evidence for Trace Contract
 * @typedef {Object} CSEEvidence
 * @property {number} totalCandidates - Total items evaluated
 * @property {number} maxItems - Maximum items allowed
 * @property {number} selectedCount - Actual items selected
 * @property {string[]} selectedIds - IDs of selected items
 * @property {boolean} highestSalienceRetained - True if top-N by salience
 * @property {boolean} deterministic - True (always deterministic)
 * @property {string} strategy - 'salience-priority'
 * @property {number} highestSalience - Highest salience score
 * @property {number} lowestSalience - Lowest salience score (of selected)
 * @property {number} avgSalience - Average salience of selected items
 */

/**
 * Minimal Contextual Salience Engine
 * 
 * Deterministic priority enforcement under constraint.
 */
class MinimalCSE {
  /**
   * Constructor
   * @param {CSEConfig} config - Configuration
   */
  constructor(config = {}) {
    this.contractVersion = CONTRACT_VERSION;
    this.strategy = STRATEGY;
    this.config = {
      recencyWeight: config.recencyWeight ?? 0.4,
      importanceWeight: config.importanceWeight ?? 0.6,
      recencyDecayHours: config.recencyDecayHours ?? 168 // 7 days
    };
    
    // Validate weights sum to 1.0
    const weightSum = this.config.recencyWeight + this.config.importanceWeight;
    if (Math.abs(weightSum - 1.0) > 0.001) {
      throw new Error(`CSE_CONFIG_ERROR: Weights must sum to 1.0 (got ${weightSum})`);
    }
  }
  
  /**
   * Calculate recency score with exponential decay
   * @param {number} timestamp - Item timestamp (ms)
   * @param {number} now - Current timestamp (ms, optional)
   * @returns {number} Recency score [0-1]
   */
  calculateRecencyScore(timestamp, now = Date.now()) {
    const ageMs = now - timestamp;
    const ageHours = ageMs / (1000 * 60 * 60);
    
    // Exponential decay: score = e^(-ageHours / decayHours)
    // At decayHours, score = e^(-1) ≈ 0.368 (37% of original)
    const decayRate = this.config.recencyDecayHours;
    const recencyScore = Math.exp(-ageHours / decayRate);
    
    return Math.max(0, Math.min(1, recencyScore));
  }
  
  /**
   * Calculate salience score for a memory item
   * @param {MemoryItem} item - Memory item
   * @param {number} now - Current timestamp (ms, optional)
   * @returns {number} Salience score [0-1]
   */
  calculateSalience(item, now = Date.now()) {
    const recencyScore = this.calculateRecencyScore(item.timestamp, now);
    const importanceScore = item.importance ?? 0.5;
    
    // Weighted sum
    const salience = 
      (this.config.recencyWeight * recencyScore) +
      (this.config.importanceWeight * importanceScore);
    
    return salience;
  }
  
  /**
   * Compute salience for all items (deterministic)
   * @param {MemoryItem[]} items - Memory items
   * @param {number} now - Current timestamp (ms, optional)
   * @returns {Array<{item: MemoryItem, salience: number}>} Items with salience
   */
  computeSalience(items, now = Date.now()) {
    return items.map(item => ({
      item,
      salience: this.calculateSalience(item, now)
    }));
  }
  
  /**
   * Select top-N items by salience (deterministic sort)
   * @param {MemoryItem[]} items - Memory items
   * @param {number} maxItems - Maximum items to select
   * @param {number} now - Current timestamp (ms, optional)
   * @returns {Object} Selection result with evidence
   */
  selectBySalience(items, maxItems, now = Date.now()) {
    // Compute salience for all items
    const scored = this.computeSalience(items, now);
    
    // Deterministic sort: highest salience first
    // Secondary sort by ID for determinism when salience is equal
    scored.sort((a, b) => {
      if (Math.abs(a.salience - b.salience) < 1e-10) {
        // Tie-breaker: lexicographic ID sort
        return a.item.id.localeCompare(b.item.id);
      }
      return b.salience - a.salience; // Descending
    });
    
    // Select top-N
    const selected = scored.slice(0, maxItems);
    
    // Build evidence (normalized schema)
    const evidence = {
      // Standard fields (all primitives)
      enabled: true,
      contract_version: this.contractVersion,
      deterministic: true,
      error_code: null,
      
      // CSE-specific fields
      strategy: this.strategy,
      totalCandidates: items.length,
      maxItems: maxItems,
      selectedCount: selected.length,
      selectedIds: selected.map(s => s.item.id),
      highestSalienceRetained: true, // Always true by construction
      highestSalience: selected.length > 0 ? selected[0].salience : 0,
      lowestSalience: selected.length > 0 ? selected[selected.length - 1].salience : 0,
      avgSalience: selected.length > 0 
        ? selected.reduce((sum, s) => sum + s.salience, 0) / selected.length 
        : 0
    };
    
    return {
      selected: selected.map(s => s.item),
      scored: scored, // All items with scores (for audit)
      evidence
    };
  }
  
  /**
   * Get configuration (for trace/audit)
   * @returns {CSEConfig} Current configuration
   */
  getConfig() {
    return { ...this.config };
  }
  
  /**
   * Validate configuration
   * @returns {boolean} True if valid
   */
  validateConfig() {
    const weightSum = this.config.recencyWeight + this.config.importanceWeight;
    return Math.abs(weightSum - 1.0) < 0.001;
  }
}

module.exports = MinimalCSE;
