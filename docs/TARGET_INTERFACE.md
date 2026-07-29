# PCS-CTS Target Interface Contract (CTS-Local)

**Status:** Informative (CTS-defined, not PCS-defined)  
**Purpose:** Minimal test harness interface for PCS-CTS scenario execution  
**This is NOT a normative PCS specification**

---

## Minimum Required Surface

Target implementations MUST expose a test harness with three methods:

```javascript
interface TargetHarness {
  // Create isolated session (hard reset enforced)
  createSession(): Promise<Session>;
  
  // Invoke with prompt, return response + optional trace
  invoke(session: Session, options: InvokeOptions): Promise<InvokeResponse>;
  
  // Close session (enforce boundary)
  closeSession(session: Session): Promise<void>;
}

interface Session {
  id: string;
}

interface InvokeOptions {
  prompt: string;
  meta?: object;  // CTS-local, implementation-defined (e.g., model labels for L3)
}

interface InvokeResponse {
  text: string;
  trace?: {
    // Binary/categorical fields only (implementation-defined)
    retrievalEvidence?: {
      retrieved: boolean;
      trigger?: 'explicit-query' | 'background' | 'none';
      scope?: 'decision-state' | 'policy-state' | 'intent-state' | 'other' | 'unknown';
    };
    enforcementDecision?: {
      emitted: boolean;
      decision?: 'ALLOW' | 'DENY';
    };
    continuityEvent?: {
      confirmed: boolean;
      sourceModel?: string;
      targetModel?: string;
    };
    // Additional fields are implementation-defined
  };
}
```

**That's it.** Mechanism is implementation-defined. Internal architecture is not prescribed.

**Integration:** Provide a module at `<target>/test-harness.js` that exports this interface.

---

## Optional Extensions

### resetState() - Runner Hygiene

Targets MAY expose `resetState(): Promise<void>` for deterministic clean runs.

```javascript
async resetState(): Promise<void>;
```

**Purpose:** Used only for `--clean` operational hygiene. Absence is not a PCS conformance failure.

**Behavior:** Clear persistent state (e.g., file-backed storage) to enable reproducible test runs.

---

## Examples, Adapters, and FAQ

Everything below is **informative guidance only**, not requirements.

```javascript
/**
 * Target implementation test harness interface (CTS-local)
 * 
 * This interface is CTS-defined for testing purposes only.
 * Internal implementation is entirely up to the target.
 */
interface TargetHarness {
  /**
   * Create a new session context
   * 
   * A session represents an isolated execution context. Session boundaries
   * enforce hard resets (no context window carryover).
   * 
   * @returns {Promise<Session>} - Session handle
   */
  createSession(): Promise<Session>;

  /**
   * Invoke the implementation with a prompt
   * 
   * This is the primary execution method. The implementation SHOULD:
   * - Retrieve relevant state (if applicable)
   * - Generate a response
   * - Enforce policies (if applicable)
   * - Return response text and optional trace evidence
   * 
   * @param {Session} session - Session context
   * @param {InvokeOptions} options - Invocation options
   * @returns {Promise<InvokeResponse>} - Response with text and optional trace
   */
  invoke(session: Session, options: InvokeOptions): Promise<InvokeResponse>;

  /**
   * Close a session and enforce boundary
   * 
   * After this call, the session context MUST NOT be accessible to
   * subsequent sessions (hard reset enforcement).
   * 
   * @param {Session} session - Session to close
   * @returns {Promise<void>}
   */
  closeSession(session: Session): Promise<void>;
}

/**
 * Session handle (opaque to CTS)
 */
interface Session {
  id: string;
  // Additional fields are implementation-defined
}

/**
 * Invocation options
 */
interface InvokeOptions {
  prompt: string;
  // Optional CTS-local metadata (implementation-defined)
  meta?: object;
  // Additional options are implementation-defined
}

/**
 * Invocation response
 */
interface InvokeResponse {
  text: string;
  // Optional: trace evidence for debugging (binary/categorical only)
  trace?: {
    retrievalEvidence?: {
      retrieved: boolean;
      trigger?: 'explicit-query' | 'background' | 'none';
      scope?: 'decision-state' | 'policy-state' | 'intent-state' | 'other' | 'unknown';
    };
    enforcementDecision?: {
      emitted: boolean;
      decision?: 'ALLOW' | 'DENY';
    };
    continuityEvent?: {
      confirmed: boolean;
      sourceModel?: string;
      targetModel?: string;
    };
    // Additional fields are implementation-defined
  };
}
```

### Example: Passing a Model Label (CTS-local)

```javascript
await target.invoke(session, {
  prompt: "Retrieve the previously established decision.",
  meta: { modelLabel: "MODEL_BETA" }
});
```

The target MAY echo this label in `trace` for evidence purposes, but is not required by PCS.

---

## Implementation Guidance

### What Implementations MUST Do

1. **Expose the test harness interface** - Provide a module or entrypoint that implements the interface above
2. **Enforce session boundaries** - Ensure no context leakage between sessions
3. **Return response text** - Provide the implementation's response to prompts
4. **Support state seeding** - Accept decision/policy content via prompts (mechanism is implementation-defined)

### What Implementations MAY Do

1. **Provide trace evidence** - Optional debugging information in `InvokeResponse.trace`
2. **Define additional options** - Extend `InvokeOptions` with implementation-specific fields
3. **Use any internal architecture** - State storage, retrieval, enforcement mechanisms are entirely implementation-defined

### What Implementations MUST NOT Do

1. **Expose internal APIs** - The test harness is a facade; internal details remain private
2. **Prescribe data structures** - The CTS does not care about internal state representation
3. **Require specific mechanisms** - Retrieval, enforcement, and storage are implementation-defined

---

## Example: Minimal Stub Implementation

```javascript
/**
 * Example stub implementation (for reference only)
 * 
 * This is NOT a normative implementation. It demonstrates the interface
 * contract only. Real implementations will have actual state management.
 */
class StubTargetHarness {
  constructor() {
    this.sessions = new Map();
    this.state = new Map(); // Shared state across sessions (for demo)
  }

  async createSession() {
    const sessionId = `session-${Date.now()}`;
    this.sessions.set(sessionId, { id: sessionId, context: [] });
    return { id: sessionId };
  }

  async invoke(session, options) {
    // Stub: Just echo the prompt
    // Real implementation would:
    // - Retrieve relevant state
    // - Generate response via LLM
    // - Enforce policies
    return {
      text: `Stub response to: ${options.prompt}`,
      trace: {
        retrievalEvidence: { retrieved: false },
        enforcementEvidence: { evaluated: false }
      }
    };
  }

  async closeSession(session) {
    this.sessions.delete(session.id);
  }
}
```

---

## Integration with PCS-CTS Runner

The PCS-CTS runner loads the target harness via a configurable entrypoint:

```javascript
// In runners/run-cts.js (future implementation)
const targetPath = args.target; // e.g., '../persistra-kernel'
const TargetHarness = require(path.join(targetPath, 'test-harness.js'));
const target = new TargetHarness();

// Execute scenario
const scenario = loadScenario(args.scenario);
const { passed, trace } = await scenario.run(target);
```

**Target implementations SHOULD provide a `test-harness.js` module** that exports a class or factory implementing the `TargetHarness` interface.

---

## Non-Normative Examples

### Example: Seeding Decision State

```javascript
// Scenario code (CTS-side)
const decisionContent = 'DR-042 (Nonce X7K9): Use SENTINEL_LANG for backend.';
await target.invoke(session, {
  prompt: `Establish this decision: ${decisionContent}`
});

// Target implementation (implementation-side)
// Mechanism is implementation-defined. Could be:
// - Parse prompt and store in state database
// - Embed in vector store
// - Store in memory graph
// - Any other mechanism
```

### Example: Enforcing Session Boundary

```javascript
// Scenario code (CTS-side)
await target.closeSession(sessionA);
const sessionB = await target.createSession();

// Target implementation (implementation-side)
// MUST ensure sessionB cannot access sessionA's context window
// Mechanism is implementation-defined. Could be:
// - Clear conversation history
// - Create new LLM session
// - Reset context buffer
// - Any other mechanism that enforces hard reset
```

---

## Relationship to PCS RFCs

This interface contract is **CTS-local** and does not define normative PCS behavior. The PCS RFCs define **what** implementations must achieve (behavioral semantics). This document defines **how** the CTS tests those behaviors (test harness interface).

**Clear separation:**
- **PCS RFCs:** Normative behavioral requirements (what)
- **PCS-CTS:** Authoritative test scenarios (validation)
- **This document:** CTS-local test harness interface (how to test)

---

## Versioning

This interface contract is versioned independently of PCS RFCs:

- **Version:** 1.0.0
- **Stability:** Stable
- **Compatibility:** Target implementations built for 1.0.x SHOULD work with future 1.0.y releases

---

## FAQ

### Q: Is this a normative PCS API?

**No.** This is a CTS-local testing interface. PCS implementations are free to use any internal architecture. The test harness is a facade for testing purposes only.

### Q: Can I use different method names?

**Yes, with an adapter.** The CTS expects this interface, but you can provide an adapter that maps your internal APIs to this interface.

### Q: Do I need to implement trace evidence?

**No.** The `trace` field in `InvokeResponse` is optional. It's useful for debugging but not required for conformance.

### Q: Can I extend the interface?

**Yes.** You can add implementation-specific fields to `Session`, `InvokeOptions`, and `InvokeResponse`. The CTS will ignore fields it doesn't recognize.

### Q: What if my implementation doesn't use sessions?

**Provide a stub.** The session concept is a CTS testing construct. If your implementation doesn't have sessions, provide a minimal stub that satisfies the interface.

---

## Future Work

**Potential enhancements:**
- Optional batch execution support
- Enhanced error handling contract
- Performance profiling hooks (optional)

---

**Document Status:** Informative  
**Scope:** CTS-local test harness interface  
**Not normative:** This is not a PCS RFC or architectural prescription

### Q: Do I need to implement resetState()?

**No.** It is an optional CTS-local convenience used by the runner’s --clean flag for deterministic hygiene; lack of resetState does not imply PCS non-compliance.