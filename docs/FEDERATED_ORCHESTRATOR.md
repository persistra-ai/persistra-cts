# Federated Orchestrator API

This document defines the `FederatedOrchestrator` API for L4 conformance testing.

---

## **Overview**

The `FederatedOrchestrator` enables CTS to test federated state survivability by:
- Spawning multiple kernel processes
- Managing process lifecycle (kill/restart)
- Mediating state replication between nodes
- Verifying state convergence via hash equality

**Key Principle:** CTS orchestrates test topologies; kernel exposes minimal surfaces.

---

## **Architecture**

```
CTS Runner
    ↓
FederatedOrchestrator
    ↓
    ├─ Node A (child process: bin/kernel-server.js --port 3000 --nodeId A)
    ├─ Node B (child process: bin/kernel-server.js --port 3001 --nodeId B)
    └─ Node C (child process: bin/kernel-server.js --port 3002 --nodeId C)
    ↓
HTTP communication (localhost only)
    ↓
State export/import/hash
```

**Important:** The kernel server mode is **test-only infrastructure**.
- Server entrypoint lives in `bin/kernel-server.js` (or `tools/server.js`), NOT in core module
- In-process harness remains canonical for L1-L3 testing
- L4 uses kernel-server as an integration harness only
- Server mode does NOT contaminate the kernel library

---

## **API Reference**

### **Constructor**

```javascript
const orchestrator = new FederatedOrchestrator({
  targetPath: '../persistra-kernel',  // Path to kernel implementation
  nodeCount: 3,                        // Number of nodes to spawn
  nodeIds: ['A', 'B', 'C'],           // Optional: explicit node IDs
  port: 3000                           // Optional: base port (3000, 3001, 3002, ...)
});
```

---

### **Lifecycle Management**

#### **launch(options)**

Spawn N kernel processes.

```javascript
await orchestrator.launch({
  nodeCount: 3,
  nodeIds: ['A', 'B', 'C']
});
```

**Implementation:**
```javascript
// Spawns:
// node server.js --port 3000 --nodeId A
// node server.js --port 3001 --nodeId B
// node server.js --port 3002 --nodeId C
```

**Returns:** `Promise<void>`

---

#### **kill(nodeId)**

Terminate a specific node process.

```javascript
await orchestrator.kill('A');
```

**Implementation:**
- Send `SIGTERM` to process
- Wait for graceful shutdown (timeout: 5s)
- Send `SIGKILL` if not terminated

**Returns:** `Promise<void>`

---

#### **restart(nodeId)**

Restart a terminated node (optional, not required for L4).

```javascript
await orchestrator.restart('A');
```

**Returns:** `Promise<void>`

---

#### **shutdown()**

Terminate all nodes and clean up resources.

```javascript
await orchestrator.shutdown();
```

**Returns:** `Promise<void>`

---

### **Invocation**

#### **invoke(nodeId, options)**

Invoke a specific node with a prompt.

```javascript
const result = await orchestrator.invoke('B', {
  prompt: 'What was decided about project-alpha?',
  meta: { intent: 'query-decision' }
});
```

**Implementation:**
```javascript
// HTTP POST to http://localhost:3001/invoke
// Body: { prompt, meta }
// Returns: { text, trace }
```

**Returns:** `Promise<{ text: string, trace: object }>`

---

### **State Management**

#### **exportState(nodeId)**

Export deterministic canonical state from a node.

```javascript
const state = await orchestrator.exportState('A');
```

**Implementation:**
```javascript
// HTTP GET to http://localhost:3000/state/export
// Returns: { state: {...}, version: 1 }
```

**Returns:** `Promise<object>` - Canonical state blob

---

#### **importState(nodeId, state)**

Import state into a node.

```javascript
await orchestrator.importState('B', state);
```

**Implementation:**
```javascript
// HTTP POST to http://localhost:3001/state/import
// Body: { state: {...}, version: 1 }
```

**Returns:** `Promise<void>`

---

#### **getStateHash(nodeId)**

Get SHA256 hash of canonicalized state.

```javascript
const hash = await orchestrator.getStateHash('A');
// Returns: "a3f5b2c1..."
```

**Implementation:**
```javascript
// HTTP GET to http://localhost:3000/state/hash
// Returns: { hash: "sha256:..." }
```

**Returns:** `Promise<string>` - SHA256 hash

---

### **Convergence Verification**

#### **verifyHashEquality(nodeIds)**

Verify state hash equality across nodes (synchronous check, no polling).

```javascript
const converged = await orchestrator.verifyHashEquality(['A', 'B', 'C']);
```

**Implementation:**
```javascript
// Fetch hash from each node
const hashes = await Promise.all(
  nodeIds.map(id => orchestrator.getStateHash(id))
);

// Check all hashes are identical
const allEqual = hashes.every(h => h === hashes[0]);
return allEqual;
```

**Returns:** `Promise<boolean>` - `true` if all hashes match, `false` otherwise

**CRITICAL: No Polling, No Timeouts**

**L4 convergence is IMMEDIATE after explicit replication. No eventual consistency.**

- ✅ **Correct pattern:** Explicit replication + immediate verification
  ```javascript
  // 1. Replicate explicitly
  const stateA = await orchestrator.exportState('A');
  await orchestrator.importState('B', stateA);
  await orchestrator.importState('C', stateA);
  
  // 2. Verify immediately (no polling)
  const converged = await orchestrator.verifyHashEquality(['A', 'B', 'C']);
  // Should be true immediately (< 100ms)
  ```

- ❌ **Incorrect pattern:** Poll for eventual convergence
  ```javascript
  await orchestrator.invoke('A', { prompt: 'seed decision' });
  
  // DON'T DO THIS: wait for background replication
  // This is eventual consistency (L5+ territory)
  let converged = false;
  for (let i = 0; i < 30; i++) {
    converged = await orchestrator.verifyHashEquality(['A', 'B', 'C']);
    if (converged) break;
    await sleep(1000); // ❌ Time-based wait = scope creep
  }
  ```

**Why this matters:**
- L4 uses **CTS-mediated replication** (explicit export/import)
- Convergence is **synchronous** (hash equality check)
- No background replication daemons
- No eventual consistency semantics
- No time-based waits

**If convergence is not immediate after replication, the test is broken.**

---

## **Evidence Hygiene Safeguards**

### **Prevent Metadata Leakage**

L4 introduces more places that can leak metadata (ports, temp paths, process args, stdout). Apply these safeguards:

#### **1. No Absolute Paths in Logs**
```javascript
// ❌ Bad
console.log(`Spawning node at ${absolutePath}/bin/kernel-server.js`);

// ✅ Good
console.log(`Spawning node ${nodeId}`);
```

#### **2. Log Node IDs Only**
```javascript
// ❌ Bad
console.log(`Node A running on port 3000 at /Users/alice/persistra-kernel`);

// ✅ Good
console.log(`Node A ready`);
```

#### **3. No Filesystem Paths in Exported State**
```javascript
// ❌ Bad
exportState() {
  return {
    decisions: [...],
    _metadata: { workingDir: process.cwd() }
  };
}

// ✅ Good
exportState() {
  return {
    decisions: [...],
    policies: [...]
  };
}
```

#### **4. No Environment Metadata in Evidence**
```javascript
// ❌ Bad
trace.environment = {
  hostname: os.hostname(),
  platform: os.platform(),
  cwd: process.cwd()
};

// ✅ Good
trace.topology = {
  nodeCount: 3,
  nodes: ['A', 'B', 'C']
};
```

#### **5. Minimal stdout/stderr**
```javascript
// ❌ Bad
console.log(`Full command: node ${fullPath} --port ${port} --nodeId ${nodeId}`);

// ✅ Good
console.log(`Node ${nodeId} ready`);
```

### **GitHub Actions Safeguards**

In CI workflows, avoid printing:
- ❌ Full `uname -a` (already fixed)
- ❌ Full directory listings with timestamps
- ❌ Full command lines with absolute paths
- ❌ Process IDs or runner hostnames

---

## **Kernel HTTP Server Requirements**

**Location:** `bin/kernel-server.js` (test-only infrastructure, not core module)

To support L4, the kernel must expose an HTTP server with these endpoints:

### **POST /invoke**

Execute a prompt and return trace.

**Request:**
```json
{
  "prompt": "What was decided about project-alpha?",
  "meta": { "intent": "query-decision" }
}
```

**Response:**
```json
{
  "text": "Project-alpha was approved.",
  "trace": {
    "retrievalEvidence": {
      "present": true,
      "matchedId": "project-alpha",
      "value": "approved"
    }
  }
}
```

---

### **GET /state/export**

Export deterministic canonical state.

**Response:**
```json
{
  "state": {
    "decisions": [
      { "id": "project-alpha", "value": "approved", "nonce": "abc123" }
    ],
    "policies": [
      { "id": "no-recommendations", "constraint": "no recommendation" }
    ]
  },
  "version": 1
}
```

**Requirements:**
- Deterministic key ordering
- Stable serialization
- No timestamps or non-deterministic data

---

### **POST /state/import**

Import state blob.

**Request:**
```json
{
  "state": {
    "decisions": [...],
    "policies": [...]
  },
  "version": 1
}
```

**Response:**
```json
{
  "success": true
}
```

---

### **GET /state/hash**

Get SHA256 hash of canonicalized state.

**Response:**
```json
{
  "hash": "sha256:a3f5b2c1d4e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2"
}
```

**Requirements:**
- Hash computed over canonical state representation
- Same state → same hash (deterministic)
- Different state → different hash (collision-resistant)

---

### **GET /health**

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "nodeId": "A"
}
```

### **Minimal Endpoints Only**

**Do NOT add:**
- ❌ Debug endpoints (`/debug/state`, `/debug/logs`)
- ❌ List endpoints (`/decisions`, `/policies`)
- ❌ Count endpoints (`/stats/decision-count`)
- ❌ Metrics endpoints (`/metrics`)

**Only the 5 endpoints above.** Nothing else.

---

## **Replication Model (L4)**

**CTS-Mediated Replication:**

1. CTS exports state from source node
2. CTS imports state into target nodes
3. CTS verifies hash convergence

**Why this model:**
- No background network daemons
- No timing nondeterminism
- No pubsub dependencies
- Deterministic test execution

**Future (L5+):**
- Kernel may implement auto-replication
- CTS can test that as an implementation feature
- But L4 conformance doesn't require it

---

## **State Canonicalization Requirements**

For deterministic hash convergence, kernel MUST ensure:

### **1. Stable Key Ordering**
```javascript
// ✅ Good (sorted keys)
{ "decisions": [...], "policies": [...] }

// ❌ Bad (random order)
{ "policies": [...], "decisions": [...] }
```

### **2. Stable Array Ordering**
```javascript
// ✅ Good (sorted by ID)
[
  { "id": "d1", "value": "approved" },
  { "id": "d2", "value": "rejected" }
]

// ❌ Bad (insertion order)
[
  { "id": "d2", "value": "rejected" },
  { "id": "d1", "value": "approved" }
]
```

### **3. Stable Line Endings**
```javascript
// ✅ Good (consistent LF)
"line1\nline2\n"

// ❌ Bad (mixed CRLF/LF)
"line1\r\nline2\n"
```

### **4. No Timestamps or Non-Deterministic Data**
```javascript
// ✅ Good
{ "id": "d1", "value": "approved", "nonce": "abc123" }

// ❌ Bad
{ "id": "d1", "value": "approved", "timestamp": "2026-02-13T12:00:00Z" }
```

---

## **Example Usage**

```javascript
const { FederatedOrchestrator } = require('./lib/federated-orchestrator');

async function runL4Scenario() {
  const orchestrator = new FederatedOrchestrator({
    targetPath: '../persistra-kernel',
    nodeCount: 3,
    nodeIds: ['A', 'B', 'C']
  });
  
  try {
    // Launch nodes
    await orchestrator.launch();
    
    // Seed decision on node A
    await orchestrator.invoke('A', {
      prompt: 'Record decision: project-alpha is approved',
      meta: { intent: 'seed-decision' }
    });
    
    // Replicate state (explicit, CTS-mediated)
    const stateA = await orchestrator.exportState('A');
    await orchestrator.importState('B', stateA);
    await orchestrator.importState('C', stateA);
    
    // Verify convergence (immediate, no polling)
    const converged = await orchestrator.verifyHashEquality(['A', 'B', 'C']);
    console.log('Converged:', converged);
    
    // Kill node A
    await orchestrator.kill('A');
    
    // Query node B
    const result = await orchestrator.invoke('B', {
      prompt: 'What was decided about project-alpha?',
      meta: { intent: 'query-decision' }
    });
    
    console.log('Result:', result.text);
    console.log('Passed:', result.trace?.retrievalEvidence?.present === true);
    
  } finally {
    await orchestrator.shutdown();
  }
}
```

---

## **Implementation Notes**

### **Process Management**
- Use `child_process.spawn()` for node processes
- Capture stdout/stderr for debugging
- Handle process crashes gracefully
- Clean up resources on shutdown

### **HTTP Communication**
- Use `fetch()` or `axios` for HTTP requests
- Retry on connection errors (node may be starting)
- Timeout on hung requests (5s default)
- Handle node death gracefully (connection refused)

### **State Hashing**
- Kernel computes hash, CTS just compares
- CTS doesn't need to understand state structure
- Hash is opaque identifier for convergence proof

### **Error Handling**
- Node spawn failures → throw error
- Node crash during test → mark test failed
- HTTP timeout → retry or fail
- State import failure → throw error

---

## **Testing Strategy**

### **Unit Tests**
- Test process spawn/kill
- Test HTTP communication
- Test state export/import
- Test hash comparison

### **Integration Tests**
- Run L4 scenarios against mock kernel
- Verify convergence detection
- Verify node failure handling

### **End-to-End Tests**
- Run L4 scenarios against real kernel
- Verify evidence generation
- Verify pass/fail criteria

---

## **Future Extensions (L5+)**

Not required for L4, but possible future additions:

- **Auto-replication:** Kernel handles replication internally
- **Quorum semantics:** Majority-based commit protocols
- **Partition tolerance:** Network split handling
- **Leader election:** Raft/Paxos-style consensus
- **Byzantine resilience:** Malicious node tolerance

These are explicitly out of scope for L4.
