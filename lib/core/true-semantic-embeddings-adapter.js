/**
 * True Semantic Embeddings Adapter
 * 
 * Adapter layer for semantic embeddings that can use either:
 * - Local air-gapped embeddings (for EVS-9 and offline tests)
 * - OpenAI embeddings (for production-quality semantic retrieval)
 * 
 * This adapter provides a consistent interface regardless of backend.
 */

const { LocalEmbeddings } = require('../../runtime/local-embeddings');

class TrueSemanticEmbeddingsAdapter {
  constructor() {
    this.backend = null;
    this.initialized = false;
  }

  async initialize(config = {}) {
    const useOpenAI = config.useOpenAI || false;
    
    // Allow reinitialization if backend type changes
    if (this.initialized && this.backend) {
      const wantsOpenAI = useOpenAI && (process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY);
      const hasOpenAI = this.backend.type === 'openai' || this.backend.type === 'groq';
      if (wantsOpenAI === hasOpenAI) {
        return { success: true, backend: this.backend.type }; // Already initialized with correct backend
      }
    }
    
    if (useOpenAI && (process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY)) {
      // Use OpenAI or Groq embeddings (Groq uses OpenAI-compatible API)
      const { OpenAI } = require('openai');
      
      // Prefer OPENAI_API_KEY, fall back to GROQ_API_KEY
      const apiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;
      const isGroq = !process.env.OPENAI_API_KEY && process.env.GROQ_API_KEY;
      
      const clientConfig = {
        apiKey: apiKey
      };
      
      // If using Groq, set the base URL
      if (isGroq) {
        clientConfig.baseURL = 'https://api.groq.com/openai/v1';
      }
      
      this.backend = {
        type: isGroq ? 'groq' : 'openai',
        client: new OpenAI(clientConfig),
        model: config.config?.EMBEDDING_MODEL || 'text-embedding-3-small',
        dimensions: config.config?.EMBEDDING_DIMENSIONS || 1536
      };
    } else {
      // Use local air-gapped embeddings
      const localEmbedder = new LocalEmbeddings({
        cachePath: config.config?.CACHE_FILE ? 
          `${config.config.CACHE_DIR}/${config.config.CACHE_FILE}` : null
      });
      await localEmbedder.initialize();
      
      this.backend = {
        type: 'local',
        embedder: localEmbedder,
        dimensions: localEmbedder.dimensions
      };
    }
    
    this.initialized = true;
    return { success: true, backend: this.backend.type };
  }

  async embed(text) {
    if (!this.initialized) {
      throw new Error('Adapter not initialized. Call initialize() first.');
    }

    if (this.backend.type === 'openai' || this.backend.type === 'groq') {
      const response = await this.backend.client.embeddings.create({
        model: this.backend.model,
        input: text
      });
      return response.data[0].embedding;
    } else {
      return await this.backend.embedder.embed(text);
    }
  }

  cosineSimilarity(vecA, vecB) {
    if (!this.initialized) {
      throw new Error('Adapter not initialized. Call initialize() first.');
    }

    if (this.backend.type === 'openai' || this.backend.type === 'groq') {
      // Implement cosine similarity for OpenAI/Groq embeddings
      const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
      const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
      const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
      return dotProduct / (magnitudeA * magnitudeB);
    } else {
      return this.backend.embedder.cosineSimilarity(vecA, vecB);
    }
  }

  getDimensions() {
    return this.backend?.dimensions || 384;
  }

  getBackendInfo() {
    return {
      type: this.backend?.type || 'unknown',
      dimensions: this.getDimensions(),
      initialized: this.initialized
    };
  }
}

module.exports = new TrueSemanticEmbeddingsAdapter();
