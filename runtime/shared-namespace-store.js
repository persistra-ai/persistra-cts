/**
 * Shared Namespace Store - In-Memory Federation Simulation
 * 
 * Purpose: Enable CTS L4 validation of namespace replication
 * Scope: Single-process shared state (NOT distributed)
 * 
 * This is a simple in-memory implementation for CTS validation.
 * Production implementations would use distributed consensus (Raft, Paxos, etc.)
 * 
 * What This Validates:
 * - Namespace visibility across runtime instances
 * - Sync event trace emission
 * - State replication detection
 * 
 * What This Does NOT Validate:
 * - Concurrent writes
 * - Conflict resolution (always returns conflictResolved: false)
 * - Network partitions
 * - Distributed consensus
 * - Eventual consistency
 */

class SharedNamespaceStore {
  constructor() {
    // Shared state across all runtime instances using this graph
    this.namespaces = new Map(); // namespace -> { decisions: [], policies: [] }
    this.syncHistory = []; // Track all sync events
  }
  
  /**
   * Synchronize state for a namespace between nodes
   * @param {string} namespace - The namespace to sync
   * @param {string} sourceNode - Node that has the state
   * @param {string} targetNode - Node requesting the state
   * @returns {object} Sync result with trace information
   */
  sync(namespace, sourceNode, targetNode) {
    const state = this.namespaces.get(namespace);
    
    const syncEvent = {
      syncOccurred: true,
      namespace,
      sourceNode,
      targetNode,
      timestamp: Date.now(),
      decisionsCount: state ? state.decisions.length : 0,
      policiesCount: state ? state.policies.length : 0,
      conflictResolved: false, // No conflict resolution in simple implementation
      conflictDetected: false   // No conflict detection implemented
    };
    
    this.syncHistory.push(syncEvent);
    
    return syncEvent;
  }
  
  /**
   * Get state for a namespace
   * @param {string} namespace - The namespace
   * @returns {object} State object with decisions and policies
   */
  getState(namespace) {
    if (!this.namespaces.has(namespace)) {
      this.namespaces.set(namespace, {
        decisions: [],
        policies: []
      });
    }
    return this.namespaces.get(namespace);
  }
  
  /**
   * Set state for a namespace
   * @param {string} namespace - The namespace
   * @param {object} state - State object with decisions and policies
   */
  setState(namespace, state) {
    this.namespaces.set(namespace, state);
  }
  
  /**
   * Add a decision to a namespace
   * @param {string} namespace - The namespace
   * @param {object} decision - Decision object
   */
  addDecision(namespace, decision) {
    const state = this.getState(namespace);
    state.decisions.push(decision);
    this.setState(namespace, state);
  }
  
  /**
   * Add a policy to a namespace
   * @param {string} namespace - The namespace
   * @param {object} policy - Policy object
   */
  addPolicy(namespace, policy) {
    const state = this.getState(namespace);
    state.policies.push(policy);
    this.setState(namespace, state);
  }
  
  /**
   * Get all decisions for a namespace
   * @param {string} namespace - The namespace
   * @returns {array} Array of decisions
   */
  getDecisions(namespace) {
    const state = this.getState(namespace);
    return state.decisions;
  }
  
  /**
   * Get all policies for a namespace
   * @param {string} namespace - The namespace
   * @returns {array} Array of policies
   */
  getPolicies(namespace) {
    const state = this.getState(namespace);
    return state.policies;
  }
  
  /**
   * Get sync history
   * @returns {array} Array of sync events
   */
  getSyncHistory() {
    return this.syncHistory;
  }
  
  /**
   * Clear all state (for testing)
   */
  clear() {
    this.namespaces.clear();
    this.syncHistory = [];
  }
}

module.exports = SharedNamespaceStore;
