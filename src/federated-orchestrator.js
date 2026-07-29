const { spawn } = require('child_process');
const axios = require('axios');

class FederatedOrchestrator {
  constructor(options = {}) {
    this.kernelPath = options.kernelPath || '../persistra-kernel';
    this.basePort = options.basePort || 4000;
    this.nodes = new Map(); // nodeId -> { port, process, baseUrl }
  }

  async launch({ nodes }) {
    for (const nodeId of nodes) {
      await this._launchNode(nodeId);
    }
    
    // Wait for all nodes to be healthy
    await this._waitForHealth(nodes);
  }

  async _launchNode(nodeId) {
    const port = this.basePort + this._nodeIdToOffset(nodeId);
    const baseUrl = `http://localhost:${port}`;
    
    const nodeProcess = spawn('node', [
      '-e',
      `
      const KernelServer = require('${this.kernelPath}/kernel/server.js');
      const server = new KernelServer({ port: ${port}, nodeId: '${nodeId}' });
      server.start().catch(err => {
        console.error('Failed to start kernel server:', err);
        process.exit(1);
      });
      `
    ], {
      stdio: 'inherit',
      detached: false
    });

    this.nodes.set(nodeId, { port, process: nodeProcess, baseUrl });
  }

  _nodeIdToOffset(nodeId) {
    // A=0, B=1, C=2, etc.
    return nodeId.charCodeAt(0) - 'A'.charCodeAt(0);
  }

  async _waitForHealth(nodeIds, maxAttempts = 30, delayMs = 100) {
    for (const nodeId of nodeIds) {
      const node = this.nodes.get(nodeId);
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        try {
          const response = await axios.get(`${node.baseUrl}/health`, { timeout: 1000 });
          if (response.data.status === 'ok') {
            break;
          }
        } catch (error) {
          // Node not ready yet
        }
        
        attempts++;
        if (attempts >= maxAttempts) {
          throw new Error(`Node ${nodeId} failed to become healthy after ${maxAttempts} attempts`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  async invoke(nodeId, payload) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const response = await axios.post(`${node.baseUrl}/invoke`, payload);
    return response.data;
  }

  async exportState(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const response = await axios.get(`${node.baseUrl}/state/export`);
    return response.data;
  }

  async importState(nodeId, state) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const response = await axios.post(`${node.baseUrl}/state/import`, state);
    return response.data;
  }

  async getStateHash(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const response = await axios.get(`${node.baseUrl}/state/hash`);
    return response.data.hash;
  }

  async verifyHashEquality(nodeIds) {
    const hashes = await Promise.all(
      nodeIds.map(nodeId => this.getStateHash(nodeId))
    );

    // All hashes must be identical
    const firstHash = hashes[0];
    return hashes.every(hash => hash === firstHash);
  }

  async kill(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // SIGTERM first, then SIGKILL if needed
    node.process.kill('SIGTERM');
    
    // Wait a bit for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Force kill if still alive
    try {
      node.process.kill('SIGKILL');
    } catch (error) {
      // Already dead, that's fine
    }

    this.nodes.delete(nodeId);
  }

  async shutdown() {
    const nodeIds = Array.from(this.nodes.keys());
    
    for (const nodeId of nodeIds) {
      const node = this.nodes.get(nodeId);
      if (node && node.process) {
        try {
          node.process.kill('SIGTERM');
          await new Promise(resolve => setTimeout(resolve, 50));
          node.process.kill('SIGKILL');
        } catch (error) {
          // Already dead
        }
      }
    }
    
    this.nodes.clear();
  }
}

module.exports = FederatedOrchestrator;
