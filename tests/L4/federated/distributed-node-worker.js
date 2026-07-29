/**
 * Distributed Node Worker - Runs as separate process
 * 
 * This script runs as Node A or Node B in separate processes.
 * It uses a shared JSON file as a simple distributed state store.
 */

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

// Parse command line arguments
const [,, nodeId, namespace, sharedDbPath, outputDir] = process.argv;

if (!nodeId || !namespace || !sharedDbPath) {
  console.error('Usage: node distributed-node-worker.js <nodeId> <namespace> <sharedDbPath> <outputDir>');
  process.exit(1);
}

async function runNode() {
  const isNodeA = nodeId === 'node-a';
  
  if (isNodeA) {
    // ========================================
    // NODE A: Create Decisions
    // ========================================
    
    // Read current shared state
    const sharedState = JSON.parse(fs.readFileSync(sharedDbPath, 'utf8'));
    
    // Initialize namespace if not exists
    if (!sharedState.namespaces[namespace]) {
      sharedState.namespaces[namespace] = {
        decisions: [],
        policies: [],
        createdBy: nodeId,
        createdAt: Date.now()
      };
    }
    
    // Create decisions
    const decisions = [
      {
        id: `DR-${Date.now()}-001`,
        namespace,
        statement: 'Use PostgreSQL for all transactional workloads',
        createdBy: nodeId,
        timestamp: new Date().toISOString()
      },
      {
        id: `DR-${Date.now()}-002`,
        namespace,
        statement: 'Use Redis for caching layer',
        createdBy: nodeId,
        timestamp: new Date().toISOString()
      },
      {
        id: `DR-${Date.now()}-003`,
        namespace,
        statement: 'API prefix: /api/v1',
        createdBy: nodeId,
        timestamp: new Date().toISOString()
      }
    ];
    
    // Add decisions to namespace
    sharedState.namespaces[namespace].decisions.push(...decisions);
    
    // Record sync event
    sharedState.syncEvents.push({
      type: 'write',
      nodeId,
      namespace,
      decisionsWritten: decisions.length,
      timestamp: Date.now()
    });
    
    // Write back to shared state
    fs.writeFileSync(sharedDbPath, JSON.stringify(sharedState, null, 2));
    
    // Calculate state hash
    const stateHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(sharedState.namespaces[namespace].decisions.sort((a, b) => a.id.localeCompare(b.id))))
      .digest('hex');
    
    // Write node-specific output
    fs.writeFileSync(
      path.join(outputDir, 'node-a-output.json'),
      JSON.stringify({
        nodeId,
        namespace,
        decisionsCreated: decisions.length,
        decisionIds: decisions.map(d => d.id),
        stateHash,
        timestamp: Date.now()
      }, null, 2)
    );
    
    // Output result to stdout (for parent process)
    console.log(JSON.stringify({
      nodeId,
      decisionsCreated: decisions.length,
      decisionIds: decisions.map(d => d.id),
      stateHash
    }));
    
  } else {
    // ========================================
    // NODE B: Retrieve Decisions
    // ========================================
    
    // Small delay to ensure Node A has written
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Read current shared state
    const sharedState = JSON.parse(fs.readFileSync(sharedDbPath, 'utf8'));
    
    // Retrieve decisions from namespace
    const namespaceState = sharedState.namespaces[namespace];
    
    if (!namespaceState) {
      throw new Error(`Namespace ${namespace} not found in shared state`);
    }
    
    const decisions = namespaceState.decisions || [];
    
    // Record sync event
    sharedState.syncEvents.push({
      type: 'read',
      nodeId,
      namespace,
      decisionsRead: decisions.length,
      sourceNode: namespaceState.createdBy,
      timestamp: Date.now()
    });
    
    // Write back sync event
    fs.writeFileSync(sharedDbPath, JSON.stringify(sharedState, null, 2));
    
    // Calculate state hash (should match Node A)
    const stateHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(decisions.sort((a, b) => a.id.localeCompare(b.id))))
      .digest('hex');
    
    // Write node-specific output
    fs.writeFileSync(
      path.join(outputDir, 'node-b-output.json'),
      JSON.stringify({
        nodeId,
        namespace,
        decisionsRetrieved: decisions.length,
        decisionIds: decisions.map(d => d.id),
        stateHash,
        sourceNode: namespaceState.createdBy,
        timestamp: Date.now()
      }, null, 2)
    );
    
    // Output result to stdout (for parent process)
    console.log(JSON.stringify({
      nodeId,
      decisionsRetrieved: decisions.length,
      decisionIds: decisions.map(d => d.id),
      stateHash
    }));
  }
}

// Run node and exit
runNode()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  });
