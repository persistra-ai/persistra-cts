/**
 * Session Manager
 * 
 * Manages isolated session contexts with hard boundary enforcement
 * Each session has its own conversation history that is destroyed on close
 */

const Policy = require('./policy');

class Session {
  constructor(stateStore) {
    this.id = `session-${Date.now()}`;
    this.stateStore = stateStore;
    this.conversationHistory = [];  // Destroyed on session close
    this.policy = new Policy(stateStore);
    this.currentModel = null;  // Track current model label (L3 CMCC)
    this.currentNamespace = null;  // Track current namespace (L2 isolation)
  }

  /**
   * Process a prompt through the kernel
   * 
   * Deterministic logic - no LLM calls needed for L1/L2/L3
   * 
   * @param {string} prompt - User prompt
   * @param {Object} options - Optional parameters (e.g., model label for L3)
   */
  async process(prompt, options = {}) {
    // Track model label for L3 CMCC scenarios (CTS-local)
    const previousModel = this.currentModel;
    if (options.model) {
      this.currentModel = options.model;
    }
    
    // Track namespace for L2 isolation scenarios (CTS-local)
    if (options.meta && options.meta.namespace) {
      this.currentNamespace = options.meta.namespace;
    }
    // Add to conversation history (session-local)
    this.conversationHistory.push({
      role: 'user',
      content: prompt,
      timestamp: Date.now()
    });

    // Detect intent from prompt
    const intent = this.detectIntent(prompt);

    let responseText = '';
    let trace = {
      retrievalEvidence: {
        retrieved: false,
        trigger: 'none',
        scope: 'unknown'
      }
    };

    // Add continuity event if model transition detected (L3 CMCC)
    if (previousModel && this.currentModel && previousModel !== this.currentModel) {
      trace.continuityEvent = {
        confirmed: true,
        sourceModel: previousModel,
        targetModel: this.currentModel,
        reason: 'model-transition-detected'
      };
    } else if (this.currentModel) {
      trace.continuityEvent = {
        confirmed: true,
        sourceModel: this.currentModel,
        targetModel: this.currentModel,
        reason: 'same-model'
      };
    }

    // Handle different intents
    switch (intent.type) {
      case 'seed-decision':
        responseText = this.handleSeedDecision(prompt, intent);
        break;

      case 'seed-policy':
        responseText = this.handleSeedPolicy(prompt, intent);
        break;

      case 'query-decision':
        const queryResult = this.handleQueryDecision(prompt, intent);
        responseText = queryResult.text;
        trace.retrievalEvidence = queryResult.trace;
        break;

      case 'policy-violation-attempt':
        const enforcementResult = this.handlePolicyEnforcement(prompt, intent);
        responseText = enforcementResult.text;
        trace = enforcementResult.trace;
        break;

      case 'neutral':
        responseText = this.handleNeutralPrompt(prompt);
        trace.retrievalEvidence.trigger = 'none';
        trace.retrievalEvidence.scope = 'none';
        break;

      default:
        responseText = 'I understand your request.';
    }

    // Add response to conversation history
    this.conversationHistory.push({
      role: 'assistant',
      content: responseText,
      timestamp: Date.now()
    });

    return { text: responseText, trace };
  }

  /**
   * Detect intent from prompt (simple keyword matching)
   */
  detectIntent(prompt) {
    const lower = prompt.toLowerCase();

    // Seed decision state
    if (lower.includes('establish this decision') || 
        lower.includes('record this decision') ||
        (lower.includes('dr-') && lower.includes('nonce'))) {
      return { type: 'seed-decision' };
    }

    // Seed policy state
    if (lower.includes('establish this policy') || 
        lower.includes('record this policy') ||
        lower.includes('pol-')) {
      return { type: 'seed-policy' };
    }

    // Query decision state
    if ((lower.includes('what') || lower.includes('recall') || lower.includes('retrieve')) &&
        (lower.includes('decision') || lower.includes('dr-'))) {
      return { type: 'query-decision' };
    }

    // Policy violation attempt
    if (lower.includes('recommend') || lower.includes('suggest') || lower.includes('use') ||
        lower.includes('need') || lower.includes('want') || lower.includes('should') ||
        lower.includes('set up') || lower.includes('setup') || lower.includes('implement')) {
      return { type: 'policy-violation-attempt' };
    }

    // Neutral prompt (e.g., "What is the current time?")
    if (lower.includes('time') || lower.includes('date') || lower.includes('hello')) {
      return { type: 'neutral' };
    }

    return { type: 'unknown' };
  }

  /**
   * Handle seeding decision state
   */
  handleSeedDecision(prompt, intent) {
    // Extract nonce and content from prompt
    // Format: "... (Nonce XXX): content text"
    // Decision ID will be auto-generated (content-addressed)
    const match = prompt.match(/\(Nonce\s+([A-Z0-9]+)\):\s*(.+)/i);
    if (match) {
      const nonce = match[1];
      const content = match[2];

      // Pass null for ID - stateStore will auto-generate content-addressed ID
      const decisionId = this.stateStore.storeDecision(null, content, { 
        nonce,
        namespace: this.currentNamespace 
      });
      return `Decision ${decisionId} has been recorded.`;
    }

    return 'Decision recorded.';
  }

  /**
   * Handle seeding policy state
   */
  handleSeedPolicy(prompt, intent) {
    // Extract nonce and constraint from prompt
    // Format: "... (Nonce XXX): constraint text"
    // Policy ID will be auto-generated (content-addressed)
    const match = prompt.match(/\(Nonce\s+([A-Z0-9]+)\):\s*(.+)/i);
    if (match) {
      const nonce = match[1];
      const constraint = match[2];

      // Pass null for ID - stateStore will auto-generate content-addressed ID
      const policyId = this.stateStore.storePolicy(null, constraint, { 
        nonce,
        namespace: this.currentNamespace 
      });
      return `Policy ${policyId} has been established.`;
    }

    return 'Policy recorded.';
  }

  /**
   * Handle querying decision state
   */
  handleQueryDecision(prompt, intent) {
    // Retrieve all decisions from state store (namespace-scoped)
    const namespace = this.currentNamespace || 'default';
    const decisions = this.stateStore.getDecisions(namespace);
    
    if (decisions.length === 0) {
      return {
        text: 'No decisions found.',
        trace: {
          retrieved: false,
          trigger: 'explicit-query',
          scope: 'decision-state'
        }
      };
    }

    // Return the most recent decision with full details
    const decision = decisions[decisions.length - 1];
    const nonce = decision.metadata?.nonce || 'unknown';
    
    return {
      text: `Based on ${decision.id} (Nonce ${nonce}): ${decision.content}`,
      trace: {
        retrieved: true,
        trigger: 'explicit-query',
        scope: 'decision-state'
      }
    };
  }

  /**
   * Handle policy enforcement
   */
  handlePolicyEnforcement(prompt, intent) {
    const namespace = this.currentNamespace || 'default';
    return this.policy.enforce(prompt, namespace);
  }

  /**
   * Handle neutral prompt
   */
  handleNeutralPrompt(prompt) {
    if (prompt.toLowerCase().includes('time')) {
      return `The current time is ${new Date().toISOString()}.`;
    }
    return 'Hello! How can I assist you?';
  }

  /**
   * Destroy session (hard boundary enforcement)
   */
  destroy() {
    // Clear conversation history (this is the key to hard boundary)
    this.conversationHistory = [];
  }
}

module.exports = Session;
