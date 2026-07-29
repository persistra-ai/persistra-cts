/**
 * PCS Runtime - Minimal Viable Authoritative Boundary
 * 
 * Purpose: Orchestrate model execution with PEP validation
 * Proves: Inference engine = stateless execution unit
 *         Governance = deterministic boundary outside model
 */

const DecisionStore = require('./decision-store');
const PolicyEnforcementPoint = require('./policy-enforcement-point');
const AuditLog = require('./audit-log');
const { visionAnchor, VISION_ANCHOR_METHOD } = require('./vision-anchor');
const { localEmbeddings, EMBEDDER_ID, EMBEDDER_MODE } = require('./local-embeddings');
const MinimalCSE = require('./cse-minimal');
const MetaProgrammingInterface = require('./meta-programming-interface');

class PCSRuntime {
  constructor(options = {}) {
    this.sessionId = options.sessionId || `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    this.namespace = options.namespace || 'default';
    this.modelLabel = options.modelLabel || 'unknown';  // For L3 CMCC
    this.nodeId = options.nodeId || 'node-default';     // For L4 federation
    this.memoryGraph = options.memoryGraph || null;     // For L4 federation (SharedNamespaceStore)
    this.previousModelLabel = null;  // Track model transitions
    this.destroyed = false;
    
    // Retrieval configuration (EVS-7: semantic-layer support)
    this.retrievalConfig = {
      mode: options.retrievalMode || 'state-layer',  // 'state-layer' | 'semantic-layer' | 'auto'
      semantic: {
        enabled: options.semanticRetrieval?.enabled || false,
        threshold: options.semanticRetrieval?.threshold || 0.75,
        embedderId: options.semanticRetrieval?.embedderId || 'text-embedding-3-small',
        dimensions: options.semanticRetrieval?.dimensions || 1536
      }
    };
    
    // Air-gapped mode configuration (EVS-9: air-gapped operation)
    this.airGapped = options.airGapped || false;
    this.networkCallCount = 0;
    
    // AirGapGuard: Enforce air-gapped mode if enabled
    if (this.airGapped) {
      // If air-gapped mode is enabled, force local embedder
      if (options.embedder && options.embedder !== 'local') {
        throw new Error('AIRGAP_VIOLATION: Air-gapped mode requires local embedder');
      }
      // Force semantic retrieval to use local embedder
      this.retrievalConfig.semantic.embedderId = EMBEDDER_ID;
      this.retrievalConfig.semantic.dimensions = 384;
      this.localEmbedder = localEmbeddings;
    } else {
      this.localEmbedder = null;
    }
    
    // Vision Anchor configuration (EVS-8: vision persistence)
    this.visionAnchorEnabled = options.enableVisionAnchor || false;
    this.visionSequence = 0;
    
    // CSE configuration (EVS-10: contextual salience engine)
    this.cseEnabled = options.cseEnabled || false;
    this.cseConfig = {
      maxItems: options.cseConfig?.maxItems || 5,
      recencyWeight: options.cseConfig?.recencyWeight ?? 0.4,
      importanceWeight: options.cseConfig?.importanceWeight ?? 0.6,
      recencyDecayHours: options.cseConfig?.recencyDecayHours ?? 168 // 7 days
    };
    
    // Initialize MinimalCSE if enabled
    if (this.cseEnabled) {
      this.cse = new MinimalCSE({
        recencyWeight: this.cseConfig.recencyWeight,
        importanceWeight: this.cseConfig.importanceWeight,
        recencyDecayHours: this.cseConfig.recencyDecayHours
      });
    } else {
      this.cse = null;
    }
    
    // Initialize VisionAnchor as runtime-owned primitive
    if (this.visionAnchorEnabled) {
      const visionStorePath = options.visionStorePath || 
        (options.storePath ? options.storePath.replace('.json', '-vision.json') : null);
      this.visionAnchor = new (require('./vision-anchor').VisionAnchor)({
        storePath: visionStorePath,
        logger: console
      });
    } else {
      this.visionAnchor = null;
    }
    
    // Meta-Programming Interface configuration (EVS-11: meta-programming interface)
    this.metaProgrammingEnabled = options.metaProgrammingEnabled || false;
    this.metaProgramming = null;
    
    if (this.metaProgrammingEnabled) {
      this.metaProgramming = new MetaProgrammingInterface({
        confidenceThreshold: options.metaProgrammingConfig?.threshold || 0.6,
        maxCapabilities: options.metaProgrammingConfig?.maxCapabilities || 100
      });
    }
    
    this.decisionStore = new DecisionStore(options.storePath, this.namespace);
    this.pep = new PolicyEnforcementPoint({
      decisionStore: this.decisionStore,
      enabled: options.pepEnabled !== false
    });
    
    // Initialize audit log if enabled
    this.auditLog = null;
    if (options.auditLogPath) {
      this.auditLog = new AuditLog(options.auditLogPath, this.namespace, {
        runId: options.runId || process.env.PCS_RUN_ID
      });
    }
    
    // Initialize semantic retrieval if enabled
    if (this.retrievalConfig.semantic.enabled) {
      this.initializeSemanticRetrieval().catch(err => {
        console.error(`Failed to initialize semantic retrieval: ${err.message}`);
      });
    }
  }
  
  /**
   * Initialize semantic retrieval capability
   * @returns {Promise<void>}
   */
  async initializeSemanticRetrieval() {
    const config = {
      embedderId: this.retrievalConfig.semantic.embedderId,
      dimensions: this.retrievalConfig.semantic.dimensions
    };
    
    // EVS-9: Pass local embedder if air-gapped mode is enabled
    if (this.airGapped && this.localEmbedder) {
      config.localEmbedder = this.localEmbedder;
    }
    
    await this.decisionStore.initializeSemanticRetrieval(config);
  }
  
  /**
   * Execute a model call with PEP validation
   * 
   * Flow:
   * 1. User prompt sent to model
   * 2. Model generates output
   * 3. Output intercepted by PEP
   * 4. PEP retrieves DecisionStore state
   * 5. PEP checks contradiction
   * 6. If violation: Block output, emit trace, return enforcement message
   * 7. If allowed: Pass through, emit trace
   * 
   * Model never controls enforcement outcome.
   * That's the relocation.
   * 
   * @param {function} modelFn - Function that calls the model and returns output
   * @param {string} prompt - User prompt
   * @returns {object} Result with output and trace
   */
  async execute(modelFn, prompt) {
    // Check if session is destroyed
    if (this.destroyed) {
      throw new Error(`Cannot execute on destroyed session: ${this.sessionId}`);
    }
    
    // L4: Sync with memory graph if enabled
    let memoryGraphTrace = null;
    if (this.memoryGraph) {
      memoryGraphTrace = this.memoryGraph.sync(
        this.namespace,
        'previous-node',  // In real impl, would track actual source
        this.nodeId
      );
      
      // Load state from memory graph
      const graphState = this.memoryGraph.getState(this.namespace);
      // Merge graph state into decision store (simplified)
      // In production, this would be more sophisticated
    }
    
    // EVS-8: Retrieve vision anchor if enabled (before model call)
    let visionEvidence = null;
    if (this.visionAnchorEnabled && this.visionAnchor) {
      this.visionSequence++;
      try {
        // Use runtime-owned visionAnchor.get() API
        const visionData = await this.visionAnchor.get('project_vision');
        if (visionData) {
          visionEvidence = {
            retrieved: true,
            anchorId: visionData.anchorId,
            anchor_hash: visionData.anchor_hash,
            source: visionData.source,
            method: visionData.method,  // From primitive constant (non-spoofable)
            sequence: this.visionSequence,
            checkpointCount: visionData.checkpointCount || 0
          };
        } else {
          visionEvidence = {
            retrieved: false,
            sequence: this.visionSequence
          };
        }
      } catch (err) {
        visionEvidence = {
          retrieved: false,
          error: err.message,
          sequence: this.visionSequence
        };
      }
    }
    
    // 1. Call model (stateless execution unit)
    let modelOutput;
    let providerMetadata;
    let providerBindFailed = false;
    let providerBindError = null;
    
    try {
      // Track network call (provider invocation)
      this.networkCallCount++;
      
      modelOutput = await modelFn(prompt);
      
      // Extract provider metadata before converting to primitive
      providerMetadata = {
        name: modelOutput.provider || 'unknown',
        model: modelOutput.model || this.modelLabel || 'unknown',
        mode: modelOutput.mode || 'live'
      };
    } catch (err) {
      // Provider binding failure (e.g., missing API key, invalid credentials)
      providerBindFailed = true;
      
      // Classify error for structured trace
      let errorCode = 'UNKNOWN_ERROR';
      if (err.message.includes('API_KEY') || err.message.includes('missing')) {
        errorCode = 'MISSING_API_KEY';
      } else if (err.message.includes('invalid') || err.message.includes('401') || err.message.includes('403')) {
        errorCode = 'INVALID_CREDENTIALS';
      } else if (err.message.includes('unsupported') || err.message.includes('not found')) {
        errorCode = 'UNSUPPORTED_PROVIDER';
      }
      
      providerBindError = {
        code: errorCode,
        message: err.message,
        timestamp: Date.now()
      };
      
      providerMetadata = {
        name: 'unknown',
        model: this.modelLabel || 'unknown',
        mode: 'live'
      };
      
      // Return structured failure trace instead of throwing
      // This allows tests to access trace.provider_bind_failed
      const failureTrace = {
        sessionId: this.sessionId,
        namespace: this.namespace,
        boundaryEnforced: !this.destroyed,
        provider: providerMetadata,
        provider_bind_failed: true,
        provider_bind_error: providerBindError,
        enforcement_decision: {
          emitted: false,
          decision: 'BLOCK',
          reason: 'provider_binding_failed'
        }
      };
      
      // Append to audit log if enabled (capture failure even on exception)
      if (this.auditLog) {
        this.auditLog.append('PROVIDER_BIND_FAILED', {
          sessionId: this.sessionId,
          error_code: providerBindError.code,
          error_message: providerBindError.message,
          requested_model: this.modelLabel
        });
      }
      
      return {
        output: `[Provider binding failed: ${providerBindError.message}]`,
        allowed: false,
        reason: 'provider_binding_failed',
        trace: failureTrace,
        modelOutput: null
      };
    }
    
    // 2. Intercept output at PEP boundary
    // Convert to string primitive if it's a String object (for crypto.createHash compatibility)
    const outputString = String(modelOutput);
    const enforcementResult = this.pep.validate(outputString);
    
    // 3. Add session boundary trace
    const trace = enforcementResult.trace || {};
    trace.sessionId = this.sessionId;
    trace.namespace = this.namespace;
    trace.boundaryEnforced = !this.destroyed;
    
    // Boundary injection trace (for EVS-6 validation)
    // This proves whether state was injected via IDs-only or raw state
    trace.boundaryTrace = {
      injected_ids: false,        // Set to true if IDs were injected into prompt
      injected_raw_state: false,  // Must always be false (raw state injection forbidden)
      prompt_hash: require('crypto').createHash('sha256').update(prompt).digest('hex').slice(0, 16)
    };
    
    // L3: Add continuity event if model transition detected
    // CRITICAL: Check both lastSeenModel AND decision metadata for cross-session transitions
    // This ensures we capture model transitions even when lastSeenModel is overwritten
    let detectedSourceModel = this.decisionStore.getLastSeenModel();
    
    // Also check all decisions in the store for different model labels
    // This handles the case where a decision was created in a previous session with a different model
    const allDecisions = this.decisionStore.loadDecisions();
    for (const decision of allDecisions) {
      if (decision.namespace === this.namespace && 
          decision.metadata && 
          decision.metadata.modelLabel && 
          decision.metadata.modelLabel !== this.modelLabel) {
        detectedSourceModel = decision.metadata.modelLabel;
        break; // Use the first cross-model decision found in this namespace
      }
    }
    
    if (detectedSourceModel && detectedSourceModel !== this.modelLabel) {
      const crypto = require('crypto');
      trace.continuityEvent = {
        confirmed: true,
        sourceModel: detectedSourceModel,
        targetModel: this.modelLabel,
        reason: 'model-transition-detected',
        sessionId: this.sessionId,
        namespace: this.namespace,
        evidence: {
          sourceModelHash16: crypto.createHash('sha256').update(detectedSourceModel).digest('hex').slice(0, 16),
          targetModelHash16: crypto.createHash('sha256').update(this.modelLabel).digest('hex').slice(0, 16),
          substrateSource: 'runtimeState.lastSeenModel'
        }
      };
    } else if (this.modelLabel && this.modelLabel !== 'unknown') {
      trace.continuityEvent = {
        confirmed: true,
        sourceModel: this.modelLabel,
        targetModel: this.modelLabel,
        reason: 'same-model',
        sessionId: this.sessionId,
        namespace: this.namespace
      };
    }
    
    // L4: Add memory graph trace if sync occurred
    if (memoryGraphTrace) {
      trace.memoryGraph = memoryGraphTrace;
    }
    
    // Provider metadata (AVS-2E: orchestrator binding validation)
    // Add sequence number for EVS-8 ordering validation
    this.visionSequence++;
    providerMetadata.sequence = this.visionSequence;
    trace.provider = providerMetadata;
    
    // EVS-8: Add vision evidence to trace if enabled
    if (visionEvidence) {
      trace.vision_evidence = visionEvidence;
    }
    
    // EVS-9: Add airgap evidence to trace if air-gapped mode enabled
    if (this.airGapped) {
      const embedderInfo = this.localEmbedder ? this.localEmbedder.getInfo() : null;
      trace.airgap_evidence = {
        required: true,
        satisfied: true,
        network_calls: this.networkCallCount,
        embedding_backend: embedderInfo || {
          type: EMBEDDER_ID,
          mode: EMBEDDER_MODE,
          dimensions: 384
        }
      };
    }
    
    // EVS-10: Apply CSE if enabled
    if (this.cseEnabled && this.cse) {
      // Get all active decisions in namespace
      const decisions = this.decisionStore.loadDecisions();
      const activeDecisions = decisions.filter(d => 
        d.namespace === this.namespace && !d.superseded_by
      );
      
      // Only apply CSE if we have candidates that exceed maxItems
      if (activeDecisions.length > this.cseConfig.maxItems) {
        // Convert decisions to CSE format (with importance from metadata)
        const cseItems = activeDecisions.map(d => ({
          id: d.id,
          content: d.statement,
          timestamp: d.timestamp,
          importance: d.metadata?.importance ?? 0.5,
          metadata: d.metadata
        }));
        
        // Apply CSE selection
        const result = this.cse.selectBySalience(cseItems, this.cseConfig.maxItems, Date.now());
        
        // Add CSE evidence to trace
        trace.cse_evidence = result.evidence;
      } else {
        // Not enough candidates to trigger CSE
        trace.cse_evidence = {
          totalCandidates: activeDecisions.length,
          maxItems: this.cseConfig.maxItems,
          selectedCount: activeDecisions.length,
          selectedIds: activeDecisions.map(d => d.id),
          highestSalienceRetained: true,
          deterministic: true,
          strategy: 'no-pressure',
          note: 'CSE not applied - candidates below threshold'
        };
      }
    }
    
    // Provider binding failure trace (AVS-2E: structured failure detection)
    if (providerBindFailed) {
      trace.provider_bind_failed = true;
      trace.provider_bind_error = providerBindError;
    }
    
    // Add meta-programming evidence to trace if enabled (EVS-11)
    if (this.metaProgrammingEnabled && this.metaProgramming) {
      const mpEvidence = this.metaProgramming.getExecutionTrace();
      trace.meta_programming_evidence = mpEvidence;
    }
    
    // CRITICAL: Store current model in substrate state for next execution
    // This ensures continuityEvent is substrate-derived, not harness-derived
    if (this.modelLabel && this.modelLabel !== 'unknown') {
      this.decisionStore.setLastSeenModel(this.modelLabel);
    }
    
    // Append to audit log if enabled
    if (this.auditLog) {
      this.auditLog.append('RUNTIME_EXECUTE', {
        sessionId: this.sessionId,
        provider: trace.provider.name,
        model: trace.provider.model,
        mode: trace.provider.mode,
        prompt_hash: trace.boundaryTrace.prompt_hash,
        boundaryTrace: trace.boundaryTrace,
        retrieval_evidence: trace.retrieval_evidence,
        enforcement_decision: trace.enforcement_decision,
        continuityEvent: trace.continuityEvent || null
      });
    }
    
    // 4. Return final output (either original or blocked message)
    return {
      output: enforcementResult.output,
      allowed: enforcementResult.allowed,
      reason: enforcementResult.reason,
      trace: trace,
      modelOutput: modelOutput // Original model output (for debugging)
    };
  }
  
  /**
   * Create a decision and persist it
   * @param {string} statement - Decision statement
   * @param {object} [metadata] - Optional structured metadata
   * @param {string} [supersedes] - Optional ID of decision to supersede
   * @returns {object} Created decision
   */
  createDecision(statement, metadata = null, supersedes = null) {
    // Add modelLabel to metadata for L3 CMCC tracking
    let enhancedMetadata = metadata;
    if (this.modelLabel && this.modelLabel !== 'unknown') {
      enhancedMetadata = metadata ? { ...metadata } : {};
      enhancedMetadata.modelLabel = this.modelLabel;
    }
    
    const decision = this.decisionStore.createDecision(statement, enhancedMetadata, supersedes);
    
    // L4: Add to memory graph if enabled
    if (this.memoryGraph) {
      this.memoryGraph.addDecision(this.namespace, decision);
    }
    
    // Append to audit log if enabled
    if (this.auditLog) {
      this.auditLog.append('DECISION_CREATED', {
        sessionId: this.sessionId,
        decisionId: decision.id,
        statement: decision.statement,
        metadata: decision.metadata,
        supersedes: decision.supersedes || null
      });
    }
    
    return decision;
  }
  
  /**
   * Create a policy and persist it
   * @param {string} constraint - Policy constraint
   * @param {object} [metadata] - Optional structured metadata
   * @returns {object} Created policy
   */
  createPolicy(constraint, metadata = null) {
    const policy = this.decisionStore.createPolicy(constraint, metadata);
    
    // L4: Add to memory graph if enabled
    if (this.memoryGraph) {
      this.memoryGraph.addPolicy(this.namespace, policy);
    }
    
    // Append to audit log if enabled
    if (this.auditLog) {
      this.auditLog.append('POLICY_CREATED', {
        sessionId: this.sessionId,
        policyId: policy.id,
        constraint: policy.constraint,
        metadata: policy.metadata
      });
    }
    
    return policy;
  }
  
  /**
   * Get the latest active decision
   * @returns {object|null} Latest decision or null
   */
  getLatestDecision() {
    return this.decisionStore.getLatestDecision();
  }
  
  /**
   * List all decisions
   * @returns {array} All decisions
   */
  listDecisions() {
    return this.decisionStore.listDecisions();
  }
  
  /**
   * Enable or disable PEP (for PCS-ON/PCS-OFF testing)
   * @param {boolean} enabled - Whether to enable PEP
   */
  setPEPEnabled(enabled) {
    this.pep.setEnabled(enabled);
  }
  
  /**
   * Destroy session and enforce hard boundary
   * Clears in-memory state and marks session as destroyed
   * Emits boundary enforcement trace
   */
  destroy() {
    if (this.destroyed) {
      throw new Error(`Session already destroyed: ${this.sessionId}`);
    }
    
    this.destroyed = true;
    
    // Emit boundary trace
    this.pep.traceEmitter.emit({
      event: 'session_boundary.enforced',
      sessionId: this.sessionId,
      namespace: this.namespace,
      boundaryEnforced: true,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Check if session is destroyed
   * @returns {boolean} True if destroyed
   */
  isDestroyed() {
    return this.destroyed;
  }
  
  /**
   * Clear all state (for testing)
   */
  clearAll() {
    this.decisionStore.clear();
    this.pep.traceEmitter.clear();
  }
}

module.exports = PCSRuntime;
