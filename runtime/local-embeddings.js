/**
 * Local Embeddings Primitive
 * 
 * Minimal, deterministic, air-gapped embedding backend for Persistra.
 * 
 * Design principles:
 * - Zero external network calls
 * - Deterministic output (same input → same vector)
 * - No external API keys
 * - No HTTP client usage
 * - Optional local cache file only
 * 
 * This is NOT about embedding quality.
 * This IS about air-gapped semantic capability with trace-verifiable evidence.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const EMBEDDER_ID = 'local-hash-embedder-v1';
const EMBEDDER_MODE = 'air-gapped';
const DIMENSIONS = 384;
const VERSION = '1.0.0';

class LocalEmbeddings {
  constructor(options = {}) {
    this.id = EMBEDDER_ID;
    this.mode = EMBEDDER_MODE;
    this.dimensions = DIMENSIONS;
    this.version = VERSION;
    this.cachePath = options.cachePath || null;
    this.cache = new Map();
    this._initialized = false;
  }

  /**
   * Initialize the embedder (load cache if available)
   */
  async initialize() {
    if (this._initialized) {
      return { success: true };
    }

    // Load cache from disk if path provided
    if (this.cachePath) {
      try {
        if (fs.existsSync(this.cachePath)) {
          const cacheData = JSON.parse(fs.readFileSync(this.cachePath, 'utf8'));
          this.cache = new Map(Object.entries(cacheData));
        }
      } catch (err) {
        // Cache load failed, continue with empty cache
      }
    }

    this._initialized = true;
    return { success: true };
  }

  /**
   * Generate deterministic embedding for text
   * 
   * Uses hash-based approach:
   * 1. Tokenize text
   * 2. Hash each token to multiple positions in vector
   * 3. Normalize vector
   * 
   * @param {string} text - Input text
   * @returns {number[]} - 384-dimensional vector
   */
  async embed(text) {
    if (!text || typeof text !== 'string') {
      return new Array(this.dimensions).fill(0);
    }

    // Check cache
    const cacheKey = this._getCacheKey(text);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Generate embedding
    const embedding = this._generateEmbedding(text);

    // Cache result
    this.cache.set(cacheKey, embedding);

    // Persist cache if path provided
    if (this.cachePath) {
      this._saveCache();
    }

    return embedding;
  }

  /**
   * Compute cosine similarity between two vectors
   * 
   * @param {number[]} vecA - First vector
   * @param {number[]} vecB - Second vector
   * @returns {number} - Similarity score (0-1)
   */
  cosineSimilarity(vecA, vecB) {
    if (!Array.isArray(vecA) || !Array.isArray(vecB)) {
      return 0;
    }

    const length = Math.min(vecA.length, vecB.length);
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get embedder info (for trace evidence)
   * 
   * @returns {Object} - Frozen embedder metadata (immutable)
   */
  getInfo() {
    return Object.freeze({
      id: this.id,
      type: this.id,
      mode: this.mode,
      dimensions: this.dimensions,
      version: this.version
    });
  }

  /**
   * Check if initialized
   */
  isInitialized() {
    return this._initialized;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Generate deterministic embedding using hash-based approach
   */
  _generateEmbedding(text) {
    const embedding = new Array(this.dimensions).fill(0);

    // Tokenize
    const tokens = this._tokenize(text);

    // Hash each token to multiple positions
    for (const token of tokens) {
      const hash = this._hashToken(token);
      const positions = this._getEmbeddingPositions(hash, 3);

      positions.forEach(pos => {
        embedding[pos] += Math.sin(hash * 0.1) * 0.1;
      });
    }

    // Normalize
    this._normalizeVector(embedding);

    return embedding;
  }

  /**
   * Tokenize text (simple whitespace + lowercase)
   */
  _tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2);
  }

  /**
   * Hash token to integer
   */
  _hashToken(token) {
    return crypto
      .createHash('md5')
      .update(token)
      .digest('hex')
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  }

  /**
   * Get embedding positions from hash
   */
  _getEmbeddingPositions(hash, count = 3) {
    const positions = [];
    let currentHash = hash;

    for (let i = 0; i < count; i++) {
      positions.push(Math.abs(currentHash) % this.dimensions);
      currentHash = Math.floor(currentHash / this.dimensions) + hash * (i + 1);
    }

    return positions;
  }

  /**
   * Normalize vector (L2 normalization)
   */
  _normalizeVector(vector) {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }
  }

  /**
   * Get cache key for text
   */
  _getCacheKey(text) {
    return crypto
      .createHash('sha256')
      .update(text)
      .digest('hex');
  }

  /**
   * Save cache to disk
   */
  _saveCache() {
    if (!this.cachePath) {
      return;
    }

    try {
      const cacheData = Object.fromEntries(this.cache);
      fs.writeFileSync(this.cachePath, JSON.stringify(cacheData, null, 2));
    } catch (err) {
      // Cache save failed, continue
    }
  }
}

// Export singleton instance and class
const localEmbeddings = new LocalEmbeddings();

module.exports = {
  LocalEmbeddings,
  localEmbeddings,
  EMBEDDER_ID,
  EMBEDDER_MODE,
  DIMENSIONS
};
