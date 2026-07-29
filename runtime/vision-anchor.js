/**
 * VisionAnchor: Persistent Goal Structures (Runtime Primitive)
 * 
 * Core persistence primitive for vision anchors. Provides disk-backed storage
 * with stable anchor hashing. No embeddings, no prompt injection, no semantic
 * analysis - those are higher-layer concerns.
 * 
 * Extracted from lib/services/vision-anchor.js persistence core.
 * 
 * @module pcs-runtime/vision-anchor
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Non-spoofable method constant (source of truth for trace.vision_evidence.method)
const VISION_ANCHOR_METHOD = 'vision-anchor-store';

class VisionAnchor {
  constructor(options = {}) {
    this.storePath = options.storePath || path.join(__dirname, '../.vision-anchor-store.json');
    this.logger = options.logger || console;
    this.anchors = new Map();
    this.initialized = false;
  }

  /**
   * Initialize the vision anchor service
   * @param {object} options - Initialization options
   */
  async initialize(options = {}) {
    if (options.logger) {
      this.logger = options.logger;
    }
    if (options.storePath) {
      this.storePath = options.storePath;
    }

    // Load existing anchors from disk
    await this.load();
    this.initialized = true;
  }

  /**
   * Load vision anchors from persistent storage
   * @private
   */
  async load() {
    try {
      if (fs.existsSync(this.storePath)) {
        const data = fs.readFileSync(this.storePath, 'utf8');
        const stored = JSON.parse(data);
        
        // Restore anchors
        for (const [id, anchor] of Object.entries(stored.anchors || {})) {
          this.anchors.set(id, anchor);
        }
      }
    } catch (err) {
      this.logger.warn('VisionAnchor: Failed to load from disk', err.message);
    }
  }

  /**
   * Save vision anchors to persistent storage
   * @private
   */
  async save() {
    try {
      const data = {
        version: '1.0.0',
        anchors: Object.fromEntries(this.anchors),
        lastUpdated: Date.now()
      };

      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.storePath, JSON.stringify(data, null, 2));
    } catch (err) {
      this.logger.error('VisionAnchor: Failed to save to disk', err.message);
    }
  }

  /**
   * Upsert a vision anchor (create or update)
   * @param {string} anchorId - Anchor identifier
   * @param {string} content - Vision content
   * @param {object} metadata - Optional metadata (type, description, etc.)
   * @returns {object} Upsert result with anchor_hash
   */
  async upsert(anchorId, content, metadata = {}) {
    if (!this.initialized) {
      throw new Error('VisionAnchor not initialized');
    }

    // Get or create anchor
    const anchor = this.anchors.get(anchorId) || {
      id: anchorId,
      checkpoints: [],
      createdAt: Date.now()
    };

    // Create checkpoint record
    const checkpoint = {
      content,
      metadata,
      timestamp: Date.now(),
      hash: this._hashContent(content)
    };

    anchor.checkpoints.push(checkpoint);
    anchor.lastUpdated = Date.now();
    
    // Compute stable anchor hash (based on all checkpoints)
    const anchorHash = this._computeAnchorHash(anchor);
    anchor.anchor_hash = anchorHash;
    
    this.anchors.set(anchorId, anchor);
    
    // Persist to disk
    await this.save();

    return {
      anchorId,
      anchor_hash: anchorHash,
      checkpoint,
      checkpointCount: anchor.checkpoints.length
    };
  }

  /**
   * Get a vision anchor by ID
   * @param {string} anchorId - Anchor identifier
   * @returns {object|null} Anchor data or null if not found
   */
  async get(anchorId) {
    if (!this.initialized) {
      return null;
    }

    const anchor = this.anchors.get(anchorId);

    if (!anchor) {
      return null;
    }

    return {
      anchorId: anchor.id,
      anchor_hash: anchor.anchor_hash,
      checkpoints: anchor.checkpoints,
      checkpointCount: anchor.checkpoints.length,
      createdAt: anchor.createdAt,
      lastUpdated: anchor.lastUpdated,
      source: 'substrate',
      method: VISION_ANCHOR_METHOD  // Non-spoofable constant
    };
  }

  /**
   * Hash content for integrity checking
   * @private
   */
  _hashContent(content) {
    return crypto
      .createHash('sha256')
      .update(String(content))
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Compute stable anchor hash from all checkpoints
   * @private
   */
  _computeAnchorHash(anchor) {
    const checkpointHashes = anchor.checkpoints.map(c => c.hash).join('|');
    return crypto
      .createHash('sha256')
      .update(checkpointHashes)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Destroy the vision anchor service
   */
  async destroy() {
    await this.save();
    this.anchors.clear();
    this.initialized = false;
  }
}

// Singleton instance
let instance = null;

function getVisionAnchor(options = {}) {
  if (!instance) {
    instance = new VisionAnchor(options);
  }
  return instance;
}

module.exports = {
  VisionAnchor,
  visionAnchor: getVisionAnchor(),
  VISION_ANCHOR_METHOD  // Export constant for runtime (non-spoofable)
};
