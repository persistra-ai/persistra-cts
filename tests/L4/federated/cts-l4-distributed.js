/**
 * CTS-L4-DISTRIBUTED: Actual Distributed Memory Graph with Node Failure
 * 
 * This test validates ACTUAL distributed operation (not in-memory simulation):
 * - Two separate Node.js processes (Node A and Node B)
 * - Shared database for state synchronization
 * - Node A creates decisions
 * - Node A terminates (simulated failure)
 * - Node B retrieves decisions from shared state
 * - Cognitive continuity preserved despite Node A failure
 * 
 * What This Validates:
 * - Distributed memory graph across processes
 * - Node failure resilience
 * - State synchronization via shared substrate
 * - Cognitive continuity under node loss
 * 
 * What This Does NOT Validate:
 * - Network-based consensus protocols
 * - Concurrent write conflict resolution
 * - Byzantine fault tolerance
 * 
 * Success Criteria:
 * - Node A creates decisions and terminates
 * - Node B retrieves decisions created by Node A
 * - Cognitive continuity preserved despite Node A failure
 * - Hash equivalence for replicated state
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const crypto = require('crypto');

module.exports = {
  id: 'CTS-L4-DISTRIBUTED',
  name: 'Distributed Memory Graph with Node Failure Resilience',
  level: 'L4',
  category: 'federated',

  async run() {
    const outputDir = path.join(__dirname, '../../../runs/cts-l4-distributed');
    const namespace = `cts-l4-dist-${Date.now()}`;
    const sharedDbPath = path.join(outputDir, 'shared-state.json');
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Initialize shared state file
    fs.writeFileSync(sharedDbPath, JSON.stringify({
      namespaces: {},
      syncEvents: []
    }, null, 2));
    
    const trace = {
      scenario: 'CTS-L4-DISTRIBUTED',
      namespace,
      sharedDbPath,
      phases: []
    };
    
    try {
      // ========================================
      // PHASE 1: Node A - Create Decisions
      // ========================================
      console.log('Phase 1: Starting Node A...');
      
      const nodeAResult = await runNodeProcess('node-a', namespace, sharedDbPath, outputDir);
      
      trace.phases.push({
        phase: 'node-a-operation',
        nodeId: 'node-a',
        processId: nodeAResult.pid,
        decisionsCreated: nodeAResult.decisionsCreated,
        decisionIds: nodeAResult.decisionIds,
        stateHash: nodeAResult.stateHash,
        exitCode: nodeAResult.exitCode,
        processTerminated: true
      });
      
      console.log(`Node A created ${nodeAResult.decisionsCreated} decisions and terminated`);
      
      // ========================================
      // PHASE 2: Node B - Retrieve from Shared State
      // ========================================
      console.log('Phase 2: Starting Node B (Node A is terminated)...');
      
      const nodeBResult = await runNodeProcess('node-b', namespace, sharedDbPath, outputDir);
      
      trace.phases.push({
        phase: 'node-b-operation',
        nodeId: 'node-b',
        processId: nodeBResult.pid,
        decisionsRetrieved: nodeBResult.decisionsRetrieved,
        decisionIds: nodeBResult.decisionIds,
        stateHash: nodeBResult.stateHash,
        exitCode: nodeBResult.exitCode,
        processTerminated: true
      });
      
      console.log(`Node B retrieved ${nodeBResult.decisionsRetrieved} decisions from shared state`);
      
      // ========================================
      // PHASE 3: Verify Distributed Continuity
      // ========================================
      
      // Hash equivalence check
      const hashEquivalent = nodeAResult.stateHash === nodeBResult.stateHash;
      
      // Decision ID equivalence check
      const decisionsMatch = JSON.stringify(nodeAResult.decisionIds.sort()) === 
                            JSON.stringify(nodeBResult.decisionIds.sort());
      
      // Read final shared state
      const finalState = JSON.parse(fs.readFileSync(sharedDbPath, 'utf8'));
      const syncEvents = finalState.syncEvents || [];
      
      trace.phases.push({
        phase: 'verification',
        hashEquivalent,
        decisionsMatch,
        nodeAHash: nodeAResult.stateHash,
        nodeBHash: nodeBResult.stateHash,
        syncEventsCount: syncEvents.length,
        syncEvents: syncEvents
      });
      
      // ========================================
      // PASS/FAIL DETERMINATION
      // ========================================
      
      const passed = 
        nodeAResult.decisionsCreated > 0 &&
        nodeBResult.decisionsRetrieved > 0 &&
        hashEquivalent &&
        decisionsMatch &&
        nodeAResult.exitCode === 0 &&
        nodeBResult.exitCode === 0;
      
      // Write evidence artifact
      fs.writeFileSync(
        path.join(outputDir, 'distributed-test-trace.json'),
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
        path.join(outputDir, 'distributed-test-trace.json'),
        JSON.stringify(trace, null, 2)
      );
      
      return { passed: false, trace, error: error.message };
    }
  }
};

/**
 * Run a node process (Node A or Node B)
 */
async function runNodeProcess(nodeId, namespace, sharedDbPath, outputDir) {
  return new Promise((resolve, reject) => {
    const workerScript = path.join(__dirname, 'distributed-node-worker.js');
    
    const child = spawn('node', [
      workerScript,
      nodeId,
      namespace,
      sharedDbPath,
      outputDir
    ]);
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Node ${nodeId} exited with code ${code}: ${stderr}`));
        return;
      }
      
      try {
        // Parse result from stdout
        const result = JSON.parse(stdout.trim());
        resolve({
          ...result,
          pid: child.pid,
          exitCode: code
        });
      } catch (error) {
        reject(new Error(`Failed to parse node ${nodeId} output: ${error.message}\nOutput: ${stdout}`));
      }
    });
    
    child.on('error', (error) => {
      reject(new Error(`Failed to start node ${nodeId}: ${error.message}`));
    });
  });
}

// Run if called directly
if (require.main === module) {
  module.exports.run()
    .then(result => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}
