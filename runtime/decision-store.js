/**
 * Decision Store - Persistent State Layer
 * 
 * Purpose: Authoritative cognitive state artifacts
 * Proves: State ≠ prompt text
 */

const fs = require('fs');
const path = require('path');

class DecisionStore {
  constructor(storePath = path.join(__dirname, 'data', 'decisions.json'), namespace = 'default') {
    this.storePath = storePath;
    this.namespace = namespace;
    this.backendInfo = {
      type: 'local',  // Backend type: 'openai', 'local-semantic-embeddings', 'local', 'hash'
      dimensions: 1536,  // Embedding dimensions: 384, 768, or 1536
      enabled: false
    };
    this.embeddingAdapter = null;  // Lazy-loaded for semantic retrieval
    this.decisionEmbeddings = new Map();  // Cache: decisionId -> embedding vector
    this.ensureStoreExists();
  }
  
  ensureStoreExists() {
    const dir = path.dirname(this.storePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.storePath)) {
      fs.writeFileSync(this.storePath, JSON.stringify({ 
        decisions: [], 
        policies: [],
        runtimeState: { lastSeenModel: null }
      }, null, 2));
    }
  }
  
  loadDecisions() {
    const data = fs.readFileSync(this.storePath, 'utf8');
    const parsed = JSON.parse(data);
    return parsed.decisions || [];
  }
  
  loadPolicies() {
    const data = fs.readFileSync(this.storePath, 'utf8');
    const parsed = JSON.parse(data);
    return parsed.policies || [];
  }
  
  saveDecisions(decisions) {
    const data = JSON.parse(fs.readFileSync(this.storePath, 'utf8'));
    const policies = data.policies || [];
    const runtimeState = data.runtimeState || { lastSeenModel: null };
    fs.writeFileSync(this.storePath, JSON.stringify({ decisions, policies, runtimeState }, null, 2));
  }
  
  savePolicies(policies) {
    const data = JSON.parse(fs.readFileSync(this.storePath, 'utf8'));
    const decisions = data.decisions || [];
    const runtimeState = data.runtimeState || { lastSeenModel: null };
    fs.writeFileSync(this.storePath, JSON.stringify({ decisions, policies, runtimeState }, null, 2));
  }
  
  /**
   * Create a new decision record
   * @param {string} statement - The decision statement
   * @param {object} [metadata] - Optional structured metadata for machine-checkable invariants
   * @param {string} [supersedes] - Optional ID of decision this supersedes
   * @returns {object} The created decision record
   */
  createDecision(statement, metadata = null, supersedes = null) {
    const decisions = this.loadDecisions();
    
    const decision = {
      id: `DR-${String(decisions.length + 1).padStart(3, '0')}`,
      namespace: this.namespace,
      statement,
      metadata: metadata, // Structural properties for deterministic checking
      timestamp: new Date().toISOString(),
      supersedes: supersedes || undefined
    };
    
    // If this supersedes another decision, mark the old one
    if (supersedes) {
      const oldDecision = decisions.find(d => d.id === supersedes);
      if (oldDecision) {
        oldDecision.superseded_by = decision.id;
      }
    }
    
    decisions.push(decision);
    this.saveDecisions(decisions);
    
    return decision;
  }
  
  /**
   * Get the latest active decision (not superseded) in this namespace
   * @returns {object|null} The latest active decision or null
   */
  getLatestDecision() {
    const decisions = this.loadDecisions();
    
    // Find decisions in this namespace that are not superseded
    const activeDecisions = decisions.filter(d => 
      d.namespace === this.namespace && !d.superseded_by
    );
    
    if (activeDecisions.length === 0) {
      return null;
    }
    
    // Return the most recent one
    return activeDecisions[activeDecisions.length - 1];
  }
  
  /**
   * Get a specific decision by ID
   * @param {string} id - Decision ID
   * @returns {object|null} The decision or null
   */
  getDecision(id) {
    const decisions = this.loadDecisions();
    return decisions.find(d => d.id === id) || null;
  }
  
  /**
   * List all decisions in this namespace
   * @returns {array} All decisions in namespace
   */
  listDecisions() {
    const allDecisions = this.loadDecisions();
    return allDecisions.filter(d => d.namespace === this.namespace);
  }
  
  /**
   * Create a new policy
   * @param {string|object} constraintOrPolicy - Policy constraint string OR policy object
   * @param {object} [metadata] - Optional metadata (only used if constraint is string)
   * @returns {object} Created policy
   */
  createPolicy(constraintOrPolicy, metadata = null) {
    let policy;
    
    if (typeof constraintOrPolicy === 'string') {
      // Legacy: simple constraint string (DEPRECATED - transitional only)
      // New policies should use PolicySchema.create() with structured rules
      policy = {
        id: `POL-${this.loadPolicies().length + 1}`,
        constraint: constraintOrPolicy,
        metadata: metadata,
        namespace: this.namespace,
        createdAt: Date.now(),
        _legacy: true  // Mark as legacy for audit trail
      };
    } else if (typeof constraintOrPolicy === 'object') {
      // New: structured policy object (from PolicySchema)
      policy = {
        ...constraintOrPolicy,
        id: constraintOrPolicy.policyId || `POL-${this.loadPolicies().length + 1}`,
        namespace: this.namespace,
        createdAt: Date.now()
      };
    } else {
      throw new Error('Policy must be string constraint or policy object');
    }
    
    const policies = this.loadPolicies();
    policies.push(policy);
    this.savePolicies(policies);
    
    return policy;
  }
  
  /**
   * Get a specific policy by ID
   * @param {string} id - Policy ID
   * @returns {object|null} The policy or null
   */
  getPolicy(id) {
    const policies = this.loadPolicies();
    return policies.find(p => p.id === id) || null;
  }
  
  /**
   * List all policies in this namespace
   * @returns {array} All policies in namespace
   */
  getPolicies() {
    const allPolicies = this.loadPolicies();
    return allPolicies.filter(p => p.namespace === this.namespace);
  }
  
  /**
   * Set backend information for retrieval introspection
   * @param {string} backendType - Backend type ('openai', 'local-semantic-embeddings', etc.)
   * @param {number} dimensions - Embedding dimensions (384, 768, or 1536)
   */
  setBackendInfo(backendType, dimensions) {
    this.backendInfo = {
      type: backendType,
      dimensions: dimensions,
      enabled: true
    };
  }
  
  /**
   * Get backend information for trace emission
   * @returns {object} Backend info with type, dimensions, enabled
   */
  getBackendInfo() {
    return this.backendInfo;
  }
  
  /**
   * Get the last seen model from substrate state
   * @returns {string|null} Last seen model label or null
   */
  getLastSeenModel() {
    const data = JSON.parse(fs.readFileSync(this.storePath, 'utf8'));
    return data.runtimeState?.lastSeenModel || null;
  }
  
  /**
   * Set the last seen model in substrate state
   * @param {string} modelLabel - Model label to store
   */
  setLastSeenModel(modelLabel) {
    const data = JSON.parse(fs.readFileSync(this.storePath, 'utf8'));
    if (!data.runtimeState) {
      data.runtimeState = {};
    }
    data.runtimeState.lastSeenModel = modelLabel;
    fs.writeFileSync(this.storePath, JSON.stringify(data, null, 2));
  }
  
  /**
   * Initialize embedding adapter for semantic retrieval
   * @param {Object} config - Semantic retrieval configuration
   */
  async initializeSemanticRetrieval(config = {}) {
    if (this.embeddingAdapter) {
      return; // Already initialized
    }
    
    try {
      // EVS-9: Support local embedder directly (air-gapped mode)
      if (config.localEmbedder) {
        this.embeddingAdapter = config.localEmbedder;
        await this.embeddingAdapter.initialize();
        
        const embedderInfo = this.embeddingAdapter.getInfo();
        this.backendInfo.enabled = true;
        this.backendInfo.type = embedderInfo.id || embedderInfo.type;
        this.backendInfo.dimensions = embedderInfo.dimensions;
        this.backendInfo.mode = embedderInfo.mode;
        
        console.log(`[DecisionStore] Semantic retrieval initialized with local embedder (${embedderInfo.mode})`);
        return;
      }
      
      const embeddingAdapterPath = config.adapterPath || '../lib/core/true-semantic-embeddings-adapter';
      this.embeddingAdapter = require(embeddingAdapterPath);
      
      // Initialize with OpenAI if API key is available
      const useOpenAI = process.env.OPENAI_API_KEY ? true : false;
      
      await this.embeddingAdapter.initialize({
        useOpenAI,
        config: {
          EMBEDDING_DIMENSIONS: config.dimensions || 1536,
          CACHE_DIR: './.leo_cache',
          CACHE_FILE: 'embeddings-cache.json',
          BACKEND_TYPE: useOpenAI ? 'openai' : 'local'
        }
      });
      
      this.backendInfo.enabled = true;
      this.backendInfo.type = config.embedderId || 'text-embedding-3-small';
      this.backendInfo.dimensions = config.dimensions || 1536;
      
      console.log(`[DecisionStore] Semantic retrieval initialized with ${useOpenAI ? 'OpenAI' : 'local'} backend`);
      
    } catch (error) {
      console.error(`Failed to initialize semantic retrieval: ${error.message}`);
      this.embeddingAdapter = null;
      this.backendInfo.enabled = false;
    }
  }
  
  /**
   * Retrieve context (decisions/policies) based on prompt
   * Supports both state-layer and semantic-layer retrieval
   * 
   * @param {string} prompt - User prompt for context retrieval
   * @param {Object} options - Retrieval options
   * @param {string} options.mode - 'state-layer' | 'semantic-layer' | 'auto'
   * @param {number} options.threshold - Similarity threshold for semantic retrieval (0-1)
   * @param {number} options.limit - Maximum number of results
   * @returns {Object} Retrieval result with evidence
   */
  async retrieveContext(prompt, options = {}) {
    const mode = options.mode || 'state-layer';
    const threshold = options.threshold || 0.75;
    const limit = options.limit || 5;
    
    const evidence = {
      retrieved: false,
      method: mode,
      decisionIds: [],
      policyIds: [],
      fallback: null
    };
    
    // State-layer retrieval (default/fallback)
    if (mode === 'state-layer') {
      const decisions = this.loadDecisions();
      const activeDecisions = decisions.filter(d => 
        d.namespace === this.namespace && !d.superseded_by
      );
      
      evidence.retrieved = activeDecisions.length > 0;
      evidence.decisionIds = activeDecisions.map(d => d.id);
      evidence.method = 'state-layer';
      
      return { decisions: activeDecisions, evidence };
    }
    
    // Semantic-layer retrieval
    if (mode === 'semantic-layer' || mode === 'auto') {
      if (!this.embeddingAdapter || !this.backendInfo.enabled) {
        if (mode === 'auto') {
          // Auto mode falls back to state-layer
          evidence.fallback = 'state-layer';
          const decisions = this.loadDecisions();
          const activeDecisions = decisions.filter(d => 
            d.namespace === this.namespace && !d.superseded_by
          );
          
          evidence.retrieved = activeDecisions.length > 0;
          evidence.decisionIds = activeDecisions.map(d => d.id);
          evidence.method = 'state-layer';
          
          return { decisions: activeDecisions, evidence };
        } else {
          throw new Error('Semantic retrieval not initialized');
        }
      }
      
      try {
        // Generate embedding for prompt
        const promptEmbedding = this.embeddingAdapter.embed ? await this.embeddingAdapter.embed(prompt) : await this.embeddingAdapter.generateEmbedding(prompt);
        
        if (!promptEmbedding) {
          throw new Error('Failed to generate prompt embedding');
        }
        
        // Get all active decisions
        const decisions = this.loadDecisions();
        const activeDecisions = decisions.filter(d => 
          d.namespace === this.namespace && !d.superseded_by
        );
        
        // Ensure all decisions have embeddings
        for (const decision of activeDecisions) {
          if (!this.decisionEmbeddings.has(decision.id)) {
            const embedding = this.embeddingAdapter.embed ? await this.embeddingAdapter.embed(decision.statement) : await this.embeddingAdapter.generateEmbedding(decision.statement);
            if (embedding) {
              this.decisionEmbeddings.set(decision.id, embedding);
            }
          }
        }
        
        // Calculate similarities
        const scored = [];
        for (const decision of activeDecisions) {
          const decisionEmbedding = this.decisionEmbeddings.get(decision.id);
          if (decisionEmbedding) {
            const similarity = this.embeddingAdapter.cosineSimilarity ? this.embeddingAdapter.cosineSimilarity(promptEmbedding, decisionEmbedding) : this.embeddingAdapter.compareEmbeddings(promptEmbedding, decisionEmbedding);
            scored.push({ decision, similarity });
          }
        }
        
        // Filter by threshold and sort
        const filtered = scored
          .filter(item => item.similarity >= threshold)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, limit);
        
        if (filtered.length > 0) {
          evidence.retrieved = true;
          evidence.method = 'semantic-layer';
          evidence.decisionIds = filtered.map(item => item.decision.id);
          evidence.similarity = filtered[0].similarity;  // Top match similarity
          evidence.threshold = threshold;
          evidence.embedding_model = this.backendInfo.type;
          evidence.dimensions = this.backendInfo.dimensions;
          
          return { 
            decisions: filtered.map(item => item.decision),
            similarities: filtered.map(item => item.similarity),
            evidence 
          };
        } else {
          // No matches above threshold
          if (mode === 'auto') {
            // Fall back to state-layer
            evidence.fallback = 'state-layer';
            evidence.method = 'state-layer';
            evidence.retrieved = activeDecisions.length > 0;
            evidence.decisionIds = activeDecisions.map(d => d.id);
            
            return { decisions: activeDecisions, evidence };
          } else {
            // Semantic mode with no matches
            evidence.retrieved = false;
            evidence.method = 'semantic-layer';
            evidence.threshold = threshold;
            evidence.embedding_model = this.backendInfo.type;
            evidence.dimensions = this.backendInfo.dimensions;
            
            return { decisions: [], evidence };
          }
        }
        
      } catch (error) {
        if (mode === 'auto') {
          // Auto mode falls back on error
          evidence.fallback = 'state-layer';
          const decisions = this.loadDecisions();
          const activeDecisions = decisions.filter(d => 
            d.namespace === this.namespace && !d.superseded_by
          );
          
          evidence.retrieved = activeDecisions.length > 0;
          evidence.decisionIds = activeDecisions.map(d => d.id);
          evidence.method = 'state-layer';
          
          return { decisions: activeDecisions, evidence };
        } else {
          throw error;
        }
      }
    }
    
    return { decisions: [], evidence };
  }
  
  /**
   * Clear all decisions and policies (for testing)
   */
  clear() {
    fs.writeFileSync(this.storePath, JSON.stringify({ 
      decisions: [], 
      policies: [],
      runtimeState: { lastSeenModel: null }
    }, null, 2));
    this.decisionEmbeddings.clear();
  }
}

module.exports = DecisionStore;
