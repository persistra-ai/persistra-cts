/**
 * Federated Orchestrator
 * 
 * Orchestrates multi-instance kernel testing for L4 conformance.
 * 
 * Responsibilities:
 * - Spawn N kernel processes
 * - Manage process lifecycle (kill/restart)
 * - Mediate state replication between nodes
 * - Verify state convergence via hash equality
 * 
 * Key Principle: CTS orchestrates test topologies; kernel exposes minimal surfaces.
 */

const { spawn } = require('child_process');
const path = require('path');

// Node 18+ has native fetch - no external dependency needed

class FederatedOrchestrator {
  constructor(options = {}) {
    this.targetPath = options.targetPath || '../persistra-kernel';
    this.nodeCount = options.nodeCount || 3;
    this.nodeIds = options.nodeIds || ['A', 'B', 'C'];
    this.basePort = options.port || 3000;
    this.nodes = new Map();
  }

  /**
   * Launch N kernel processes
   */
  async launch(options = {}) {
    const nodeCount = options.nodeCount || this.nodeCount;
    const nodeIds = options.nodeIds || this.nodeIds.slice(0, nodeCount);

    for (let i = 0; i < nodeCount; i++) {
      const nodeId = nodeIds[i];
      const port = this.basePort + i;

      // Evidence hygiene: no absolute paths in logs
      console.log(`Spawning node ${nodeId}`);

      const serverPath = path.join(this.targetPath, 'bin/kernel-server.js');
      const process = spawn('node', [
        serverPath,
        `--port=${port}`,
        `--nodeId=${nodeId}`
      ], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      // Capture stdout/stderr for debugging (minimal logging)
      process.stdout.on('data', (data) => {
        // Evidence hygiene: only log node ID, not full output
        const output = data.toString().trim();
        if (output) {
          console.log(`[${nodeId}] ${output}`);
        }
      });

      process.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          console.error(`[${nodeId}] ${output}`);
        }
      });

      process.on('exit', (code) => {
        console.log(`Node ${nodeId} exited with code ${code}`);
      });

      this.nodes.set(nodeId, {
        id: nodeId,
        port: port,
        process: process,
        url: `http://localhost:${port}`
      });
    }

    // Wait for all nodes to be healthy
    await this._waitForHealth(nodeIds);
  }

  /**
   * Wait for nodes to be healthy
   */
  async _waitForHealth(nodeIds, timeout = 5000) {
    const startTime = Date.now();

    for (const nodeId of nodeIds) {
      const node = this.nodes.get(nodeId);
      if (!node) {
        throw new Error(`Node ${nodeId} not found`);
      }

      let healthy = false;
      while (!healthy && (Date.now() - startTime) < timeout) {
        try {
          const response = await fetch(`${node.url}/health`);
          if (response.ok) {
            const data = await response.json();
            if (data.status === 'ok') {
              healthy = true;
              console.log(`Node ${nodeId} healthy`);
            }
          }
        } catch (error) {
          // Node not ready yet, wait and retry
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (!healthy) {
        throw new Error(`Node ${nodeId} failed to become healthy within ${timeout}ms`);
      }
    }
  }

  /**
   * Kill a specific node process
   */
  async kill(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    console.log(`Killing node ${nodeId}`);

    // Send SIGTERM for graceful shutdown
    node.process.kill('SIGTERM');

    // Wait for process to exit (max 5 seconds)
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        // Force kill if not exited
        node.process.kill('SIGKILL');
        resolve();
      }, 5000);

      node.process.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    this.nodes.delete(nodeId);
  }

  /**
   * Invoke a specific node with a prompt
   */
  async invoke(nodeId, options) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const response = await fetch(`${node.url}/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Invoke failed on node ${nodeId}: ${error.error}`);
    }

    return await response.json();
  }

  /**
   * Export state from a node
   */
  async exportState(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const response = await fetch(`${node.url}/state/export`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Export failed on node ${nodeId}: ${error.error}`);
    }

    return await response.json();
  }

  /**
   * Import state into a node
   */
  async importState(nodeId, state) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const response = await fetch(`${node.url}/state/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Import failed on node ${nodeId}: ${error.error}`);
    }

    return await response.json();
  }

  /**
   * Get state hash from a node
   */
  async getStateHash(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const response = await fetch(`${node.url}/state/hash`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Hash failed on node ${nodeId}: ${error.error}`);
    }

    const data = await response.json();
    return data.hash;
  }

  /**
   * Wait for state hash convergence across nodes
   * 
   * CRITICAL: This is for VERIFICATION only, not a substitute for replication.
   * Convergence must be achieved by explicit replication steps, not timing.
   * Short timeout (1 second) - convergence should be immediate.
   */
  async waitForConvergence(nodeIds, options = {}) {
    const timeout = options.timeout || 1000; // 1 second default
    const pollInterval = options.pollInterval || 50; // 50ms default
    const startTime = Date.now();

    while ((Date.now() - startTime) < timeout) {
      // Get hashes from all nodes
      const hashes = await Promise.all(
        nodeIds.map(async (nodeId) => {
          try {
            return await this.getStateHash(nodeId);
          } catch (error) {
            return null; // Node might be dead
          }
        })
      );

      // Check if all hashes match
      const validHashes = hashes.filter(h => h !== null);
      if (validHashes.length === nodeIds.length) {
        const firstHash = validHashes[0];
        if (validHashes.every(h => h === firstHash)) {
          return true; // Converged
        }
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    return false; // Timeout
  }

  /**
   * Shutdown all nodes
   */
  async shutdown() {
    console.log('Shutting down all nodes');

    const nodeIds = Array.from(this.nodes.keys());
    for (const nodeId of nodeIds) {
      try {
        await this.kill(nodeId);
      } catch (error) {
        console.error(`Failed to kill node ${nodeId}:`, error.message);
      }
    }

    this.nodes.clear();
  }
}

module.exports = FederatedOrchestrator;
