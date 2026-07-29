/**
 * PCS-CTS Test Harness Adapter
 * 
 * Implements the TargetHarness interface defined in persistra-cts/docs/TARGET_INTERFACE.md
 * This is a CTS-local adapter, not a normative PCS API.
 */

const Session = require('./src/session');
const StateStore = require('./src/state-store');
const Policy = require('./src/policy');

class PersistentKernelHarness {
  constructor() {
    this.stateStore = new StateStore();
    this.sessionManager = new Map();
  }

  /**
   * Create a new isolated session
   * Hard reset enforced - no context carryover
   */
  async createSession() {
    const session = new Session(this.stateStore);
    this.sessionManager.set(session.id, session);
    return { id: session.id };
  }

  /**
   * Invoke the kernel with a prompt
   * Returns response text + optional trace evidence
   */
  async invoke(sessionHandle, options) {
    const session = this.sessionManager.get(sessionHandle.id);
    if (!session) {
      throw new Error(`Session ${sessionHandle.id} not found`);
    }

    const { prompt, ...otherOptions } = options;
    
    // Process the prompt through the kernel
    // Pass full options for L3 CMCC support (e.g., model label)
    const result = await session.process(prompt, otherOptions);
    
    return {
      text: result.text,
      trace: result.trace
    };
  }

  /**
   * Close session and enforce boundary
   * Destroys in-memory conversation state
   */
  async closeSession(sessionHandle) {
    const session = this.sessionManager.get(sessionHandle.id);
    if (session) {
      session.destroy();
      this.sessionManager.delete(sessionHandle.id);
    }
  }

  /**
   * Reset persistent state to known baseline (CTS-local convenience)
   * 
   * Behavioral requirements:
   * - Idempotent: Can be called multiple times safely
   * - Atomic: No partial file writes
   * - PCS-only: Resets only PCS state, not developer machine state
   * 
   * This is a CTS-local convenience method, not a normative PCS requirement.
   */
  async resetState() {
    // Clear all sessions
    for (const [id, session] of this.sessionManager.entries()) {
      session.destroy();
    }
    this.sessionManager.clear();

    // Reset persistent state store
    this.stateStore.clear();
  }
}

module.exports = PersistentKernelHarness;
