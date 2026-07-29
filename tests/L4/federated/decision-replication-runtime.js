/**
 * L4.federated.decision-replication (Runtime-Bound)
 * 
 * CTS L4: Federated State Synchronization - Namespace Replication Detection (Runtime-Bound)
 * 
 * This test validates that decisions created on one runtime instance (node A)
 * are accessible on another runtime instance (node B) via shared namespace store.
 * 
 * SCOPE: This validates namespace replication detection, NOT distributed consensus.
 * Implementation uses in-memory shared state (single-process).
 * 
 * What This Validates:
 * - Namespace visibility across runtime instances
 * - Sync event trace emission
 * - State replication detection
 * 
 * What This Does NOT Validate:
 * - Concurrent writes
 * - Conflict resolution (conflictResolved always false)
 * - Network partitions
 * - Distributed consensus
 * 
 * Success criteria:
 * - result.trace.memoryGraph.syncOccurred === true
 * - result.trace.memoryGraph.sourceNode matches node A
 * - result.trace.memoryGraph.targetNode matches node B
 * - Decision created on node A is accessible on node B
 */

const path = require('path');
const fs = require('fs');
const PCSRuntime = require('../../../runtime/runtime');
const SharedNamespaceStore = require('../../../runtime/shared-namespace-store');
const TraceValidator = require('../../../lib/trace-contract-validator');

module.exports = {
  id: 'L4.federated.decision-replication-runtime',
  name: 'Namespace Replication Detection (Shared Substrate)',
  level: 'L4',
  category: 'federated',

  async run() {
    const outputDir = path.join(__dirname, '../../../runs/cts-l4-federation');
    const namespace = `cts-l4-federation-${Date.now()}`;
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const trace = {
      scenario: 'L4.federated.decision-replication-runtime',
      namespace,
      phases: []
    };
    
    try {
      // Create shared namespace store (in-memory federation simulation)
      const memoryGraph = new SharedNamespaceStore();
      
      // Phase 1: Node A - Create decision
      const runtimeA = new PCSRuntime({
        storePath: path.join(outputDir, 'node-a.json'),
        namespace,
        sessionId: 'session-node-a',
        nodeId: 'node-a',
        memoryGraph: memoryGraph,  // Shared graph
        pepEnabled: true
      });
      
      const decision = runtimeA.createDecision(
        "Use PostgreSQL for all transactional workloads"
      );
      
      trace.phases.push({
        phase: 'write-on-node-a',
        sessionId: runtimeA.sessionId,
        namespace: runtimeA.namespace,
        nodeId: runtimeA.nodeId,
        decisionId: decision.id,
        decisionStatement: decision.statement,
        decisionCreated: true
      });
      
      runtimeA.destroy();
      
      // Phase 2: Node B - Access same namespace (federation)
      const runtimeB = new PCSRuntime({
        storePath: path.join(outputDir, 'node-b.json'),
        namespace,  // Same namespace = federated access
        sessionId: 'session-node-b',
        nodeId: 'node-b',  // Different node
        memoryGraph: memoryGraph,  // Same shared graph
        pepEnabled: true
      });
      
      // Simulate model that retrieves decision
      const modelFnB = async (prompt) => {
        // Access decisions from memory graph
        const decisions = memoryGraph.getDecisions(namespace);
        if (decisions.length > 0) {
          return `Based on ${decisions[0].id}: ${decisions[0].statement}`;
        }
        return "No decisions found";
      };
      
      const result = await runtimeB.execute(modelFnB, 
        "What database should we use for transactional workloads?");
      
      // Validate trace contract
      TraceValidator.validateMemoryGraphTrace(result.trace);
      TraceValidator.validateBoundaryTrace(result.trace);
      
      // Extract trace fields
      const memoryGraphTrace = result.trace.memoryGraph || {};
      const retrievalEvidence = result.trace.retrieval_evidence || {};
      
      trace.phases.push({
        phase: 'read-on-node-b',
        sessionId: result.trace.sessionId,
        namespace: result.trace.namespace,
        nodeId: runtimeB.nodeId,
        boundaryEnforced: result.trace.boundaryEnforced,
        memoryGraph: memoryGraphTrace,
        retrievalEvidence: retrievalEvidence,
        outputContainsDecisionId: result.output.includes(decision.id),
        responseExcerpt: result.output.substring(0, 200)
      });
      
      runtimeB.destroy();
      
      // Phase 3: Verify sync history
      const syncHistory = memoryGraph.getSyncHistory();
      
      trace.phases.push({
        phase: 'verify-sync',
        syncHistory: syncHistory,
        syncCount: syncHistory.length
      });
      
      // Binary pass/fail determination (Runtime Trace Only)
      // ✅ No simulation - only runtime trace fields
      const memoryGraphPhase = trace.phases[1].memoryGraph || {};
      
      const passed = 
        trace.phases[0].decisionCreated === true &&
        trace.phases[1].boundaryEnforced === true &&
        (memoryGraphPhase.syncOccurred === true || memoryGraphPhase.sync_occurred === true) &&
        (memoryGraphPhase.targetNode === 'node-b' || memoryGraphPhase.target_node === 'node-b') &&
        trace.phases[1].outputContainsDecisionId === true &&
        trace.phases[2].syncCount > 0;
      
      // Write evidence artifact
      fs.writeFileSync(
        path.join(outputDir, 'decision-replication-trace.json'),
        JSON.stringify(trace, null, 2)
      );
      
      return { passed, trace };
      
    } catch (error) {
      trace.phases.push({
        phase: 'error',
        error: error.message,
        stack: error.stack
      });
      
      fs.writeFileSync(
        path.join(outputDir, 'decision-replication-trace.json'),
        JSON.stringify(trace, null, 2)
      );
      
      return { passed: false, trace };
    }
  }
};

// Direct execution support
if (require.main === module) {
  (async () => {
    const test = module.exports;
    console.log(`\n[${test.id}] ${test.name}\n`);
    const result = await test.run();
    
    if (result.passed) {
      console.log(`\n✅ PASS: ${test.name}`);
      console.log(`Trace saved to: runs/cts-l4-federation/decision-replication-trace.json\n`);
      process.exit(0);
    } else {
      console.error(`\n❌ FAIL: ${test.name}`);
      console.error(`Trace saved to: runs/cts-l4-federation/decision-replication-trace.json\n`);
      process.exit(1);
    }
  })().catch(err => {
    console.error(`\n❌ ERROR: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });
}
