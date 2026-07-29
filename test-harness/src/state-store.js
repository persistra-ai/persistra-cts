/**
 * Persistent State Store
 * 
 * File-backed storage for decision state and policy state
 * Survives session boundaries (unlike conversation history)
 */

const fs = require('fs');
const path = require('path');
const { generatePolicyId, generateDecisionId } = require('./content-addressed-ids');

class StateStore {
  constructor(storePath = null) {
    this.storePath = storePath || path.join(__dirname, '../.state/store.json');
    this.state = new Map();
    this.load();
  }

  /**
   * Load state from disk
   */
  load() {
    try {
      if (fs.existsSync(this.storePath)) {
        const data = fs.readFileSync(this.storePath, 'utf8');
        const parsed = JSON.parse(data);
        this.state = new Map(Object.entries(parsed));
      }
    } catch (error) {
      // If load fails, start with empty state
      this.state = new Map();
    }
  }

  /**
   * Save state to disk
   */
  save() {
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = JSON.stringify(Object.fromEntries(this.state), null, 2);
      fs.writeFileSync(this.storePath, data, 'utf8');
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  /**
   * Store a decision (optionally namespace-scoped)
   * 
   * If no ID provided, generates content-addressed ID: DR-{hash}
   * This ensures same content → same ID (deterministic)
   */
  storeDecision(id, content, metadata = {}) {
    // Auto-generate content-addressed ID if not provided
    if (!id) {
      id = generateDecisionId(content, metadata);
    }
    
    const namespace = metadata.namespace || 'default';
    const key = `${namespace}:decision:${id}`;
    this.state.set(key, {
      type: 'decision',
      id: id,
      content: content,
      metadata: metadata,
      timestamp: Date.now(),
      namespace: namespace
    });
    this.save();
    return id; // Return ID for caller
  }

  /**
   * Store a policy (optionally namespace-scoped)
   * 
   * If no ID provided, generates content-addressed ID: POL-{hash}
   * This ensures same constraint → same ID (deterministic)
   * Policy identity survives model transitions.
   */
  storePolicy(id, constraint, metadata = {}) {
    // Auto-generate content-addressed ID if not provided
    if (!id) {
      id = generatePolicyId(constraint, metadata);
    }
    
    const namespace = metadata.namespace || 'default';
    const key = `${namespace}:policy:${id}`;
    this.state.set(key, {
      type: 'policy',
      id: id,
      constraint: constraint,
      metadata: metadata,
      timestamp: Date.now(),
      namespace: namespace
    });
    this.save();
    return id; // Return ID for caller
  }

  /**
   * Retrieve all decisions (optionally namespace-scoped)
   */
  getDecisions(namespace = 'default') {
    const decisions = [];
    const prefix = `${namespace}:decision:`;
    for (const [key, value] of this.state.entries()) {
      if (value.type === 'decision' && key.startsWith(prefix)) {
        decisions.push(value);
      }
    }
    return decisions;
  }

  /**
   * Retrieve all policies (optionally namespace-scoped)
   */
  getPolicies(namespace = 'default') {
    const policies = [];
    const prefix = `${namespace}:policy:`;
    for (const [key, value] of this.state.entries()) {
      if (value.type === 'policy' && key.startsWith(prefix)) {
        policies.push(value);
      }
    }
    return policies;
  }

  /**
   * Get specific entry by ID
   */
  get(id) {
    return this.state.get(id);
  }

  /**
   * Clear all state (for testing)
   */
  clear() {
    this.state.clear();
    this.save();
  }

  /**
   * L4: Export canonical state (deterministic, schema-versioned)
   * 
   * Returns state in canonical form:
   * - schema_version included
   * - Stable key ordering (alphabetical, deep)
   * - Stable array ordering (sorted by ID)
   * - No timestamps or non-deterministic data
   * - No whitespace in JSON serialization
   */
  exportState() {
    const crypto = require('crypto');
    
    // Get all decisions and policies (all namespaces)
    const allDecisions = [];
    const allPolicies = [];
    
    for (const [key, value] of this.state.entries()) {
      if (value.type === 'decision') {
        allDecisions.push({
          id: value.id,
          content: value.content,
          metadata: this._canonicalizeObject(this._stripTimestamps(value.metadata)),
          namespace: value.namespace
        });
      } else if (value.type === 'policy') {
        allPolicies.push({
          id: value.id,
          constraint: value.constraint,
          metadata: this._canonicalizeObject(this._stripTimestamps(value.metadata)),
          namespace: value.namespace
        });
      }
    }
    
    // Sort by ID for deterministic ordering
    allDecisions.sort((a, b) => a.id.localeCompare(b.id));
    allPolicies.sort((a, b) => a.id.localeCompare(b.id));
    
    // Build canonical state with schema version
    const state = {
      schema_version: 'pcs-state-v0.1',
      decisions: allDecisions,
      policies: allPolicies
    };
    
    return this._canonicalizeObject(state);
  }

  /**
   * L4: Import state (REPLACE semantics)
   * 
   * Replaces all existing state with imported state.
   * Verifies schema version match.
   * No merge semantics - full replacement only.
   */
  importState(state) {
    const CURRENT_SCHEMA_VERSION = 'pcs-state-v0.1';
    
    // Verify schema version
    if (!state.schema_version) {
      throw new Error('Missing schema_version in imported state');
    }
    if (state.schema_version !== CURRENT_SCHEMA_VERSION) {
      throw new Error(
        `Schema version mismatch: expected ${CURRENT_SCHEMA_VERSION}, got ${state.schema_version}`
      );
    }
    
    // REPLACE semantics: clear existing state
    this.state.clear();
    
    // Import decisions
    if (state.decisions) {
      state.decisions.forEach(d => {
        const namespace = d.namespace || 'default';
        const key = `${namespace}:decision:${d.id}`;
        this.state.set(key, {
          type: 'decision',
          id: d.id,
          content: d.content,
          metadata: d.metadata || {},
          timestamp: Date.now(), // Add timestamp for internal use (not exported)
          namespace: namespace
        });
      });
    }
    
    // Import policies
    if (state.policies) {
      state.policies.forEach(p => {
        const namespace = p.namespace || 'default';
        const key = `${namespace}:policy:${p.id}`;
        this.state.set(key, {
          type: 'policy',
          id: p.id,
          constraint: p.constraint,
          metadata: p.metadata || {},
          timestamp: Date.now(), // Add timestamp for internal use (not exported)
          namespace: namespace
        });
      });
    }
    
    // Save to disk
    this.save();
  }

  /**
   * L4: Get state hash (SHA256 of canonical state)
   * 
   * Hash includes schema_version and all state.
   * Deterministic: same state → same hash.
   */
  getStateHash() {
    const crypto = require('crypto');
    const canonical = this.exportState();
    const json = JSON.stringify(canonical, null, 0); // No whitespace
    const hash = crypto.createHash('sha256').update(json, 'utf8').digest('hex');
    return `sha256:${hash}`;
  }

  /**
   * Helper: Canonicalize object (deep sort keys)
   */
  _canonicalizeObject(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => this._canonicalizeObject(item));
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj)
        .sort()
        .reduce((sorted, key) => {
          sorted[key] = this._canonicalizeObject(obj[key]);
          return sorted;
        }, {});
    }
    return obj;
  }

  /**
   * Helper: Strip timestamps and non-deterministic data from metadata
   */
  _stripTimestamps(metadata) {
    if (!metadata || typeof metadata !== 'object') {
      return metadata;
    }
    
    const cleaned = { ...metadata };
    
    // Remove timestamp fields
    delete cleaned.timestamp;
    delete cleaned.createdAt;
    delete cleaned.updatedAt;
    
    // Remove process/environment metadata
    delete cleaned.nodeId;
    delete cleaned.processId;
    delete cleaned.hostname;
    delete cleaned.cwd;
    delete cleaned.workingDir;
    
    return cleaned;
  }
}

module.exports = StateStore;
