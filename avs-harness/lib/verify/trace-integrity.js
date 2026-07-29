const crypto = require('crypto');

/**
 * Trace Integrity Verifier
 * 
 * Provides cryptographic verification of test execution integrity.
 * Prevents tampering with model outputs and tool traces.
 */
class TraceIntegrityVerifier {
  /**
   * Generate cryptographic hash of raw test execution
   * @param {Object} execution - Raw execution data
   * @returns {Object} Integrity package with hash and metadata
   */
  generateIntegrityHash(execution) {
    const {
      modelOutput,
      toolTrace,
      timestamp,
      model,
      condition,
      runNumber
    } = execution;
    
    // Generate random nonce for this execution
    const nonce = crypto.randomBytes(16).toString('hex');
    
    // Create canonical representation
    const canonical = JSON.stringify({
      modelOutput,
      toolTrace,
      timestamp,
      model,
      condition,
      runNumber,
      nonce
    }, null, 0); // No whitespace for deterministic hashing
    
    // Generate SHA-256 hash
    const hash = crypto.createHash('sha256')
      .update(canonical)
      .digest('hex');
    
    return {
      hash,
      nonce,
      timestamp,
      algorithm: 'sha256',
      canonical_size: canonical.length
    };
  }
  
  /**
   * Sign integrity hash with private key (if available)
   * @param {string} hash - Hash to sign
   * @returns {string|null} Signature or null if no key available
   */
  signHash(hash) {
    // In production, use actual private key
    // For now, return deterministic signature based on hash
    const signature = crypto.createHash('sha256')
      .update(`SIGNATURE:${hash}:${process.env.HARNESS_KEY || 'dev-key'}`)
      .digest('hex');
    
    return signature;
  }
  
  /**
   * Verify integrity hash matches execution data
   * @param {Object} execution - Execution data to verify
   * @param {Object} integrity - Integrity package to verify against
   * @returns {boolean} True if integrity verified
   */
  verifyIntegrity(execution, integrity) {
    const computed = this.generateIntegrityHash(execution);
    
    // Hash must match
    if (computed.hash !== integrity.hash) {
      return false;
    }
    
    // Nonce must match
    if (computed.nonce !== integrity.nonce) {
      return false;
    }
    
    // Timestamp must match
    if (computed.timestamp !== integrity.timestamp) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Create complete integrity package for test run
   * @param {Object} execution - Raw execution data
   * @returns {Object} Complete integrity package
   */
  createIntegrityPackage(execution) {
    const integrity = this.generateIntegrityHash(execution);
    const signature = this.signHash(integrity.hash);
    
    return {
      ...integrity,
      signature,
      harness_version: require('../../package.json').version || '1.0.0',
      node_version: process.version,
      platform: process.platform
    };
  }
  
  /**
   * Detect if model output shows signs of tampering
   * @param {string} modelOutput - Model output to check
   * @param {Object} toolTrace - Tool trace to check
   * @returns {Object} Tampering detection results
   */
  detectTampering(modelOutput, toolTrace) {
    const warnings = [];
    
    // Check for suspicious patterns
    if (modelOutput.includes('TAMPERED') || modelOutput.includes('MODIFIED')) {
      warnings.push('Output contains tampering keywords');
    }
    
    // Check trace structure
    if (toolTrace.events && !Array.isArray(toolTrace.events)) {
      warnings.push('Tool trace events is not an array');
    }
    
    // Check for metadata consistency
    if (toolTrace.metadata) {
      if (!toolTrace.metadata.timestamp) {
        warnings.push('Missing timestamp in trace metadata');
      }
      if (!toolTrace.metadata.harness_version) {
        warnings.push('Missing harness version in trace metadata');
      }
    }
    
    return {
      tampered: warnings.length > 0,
      warnings,
      confidence: warnings.length === 0 ? 'high' : 'low'
    };
  }
}

module.exports = new TraceIntegrityVerifier();
