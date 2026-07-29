/**
 * Content-Addressed ID Generation
 * 
 * Generates deterministic IDs based on content hashing.
 * 
 * Policy IDs: POL-{base32(sha256(canonical(policy_payload)))[:8]}
 * Decision IDs: DR-{base32(sha256(canonical(decision_payload)))[:8]}
 * 
 * This ensures:
 * - Same content → same ID
 * - Policy identity survives model transitions
 * - No random ID collisions
 * - Deterministic for testing
 */

const crypto = require('crypto');

/**
 * Base32 encoding (RFC 4648) - uppercase, no padding
 * Using base32 instead of hex for shorter IDs with good readability
 */
function base32Encode(buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Canonicalize object for hashing
 * - Sort keys lexicographically (deep)
 * - Deterministic serialization
 */
function canonicalizeObject(obj) {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(canonicalizeObject);
  }
  
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = canonicalizeObject(obj[key]);
  }
  return sorted;
}

/**
 * Generate content-addressed policy ID
 * 
 * @param {string} constraint - Policy constraint text
 * @param {object} metadata - Policy metadata (optional)
 * @returns {string} - Policy ID (e.g., "POL-A1B2C3D4")
 */
function generatePolicyId(constraint, metadata = {}) {
  // Create canonical payload
  const payload = {
    constraint: constraint,
    // Include stable metadata fields only (exclude namespace, timestamps)
    metadata: canonicalizeObject({
      nonce: metadata.nonce || null,
      // Add other stable metadata fields here
    })
  };
  
  // Serialize canonically
  const canonical = JSON.stringify(canonicalizeObject(payload));
  
  // Hash and encode
  const hash = crypto.createHash('sha256').update(canonical).digest();
  const encoded = base32Encode(hash);
  
  // Take first 8 characters for readability
  return `POL-${encoded.substring(0, 8)}`;
}

/**
 * Generate content-addressed decision ID
 * 
 * @param {object} content - Decision content
 * @param {object} metadata - Decision metadata (optional)
 * @returns {string} - Decision ID (e.g., "DR-X1Y2Z3W4")
 */
function generateDecisionId(content, metadata = {}) {
  // Create canonical payload
  const payload = {
    content: canonicalizeObject(content),
    // Include stable metadata fields only
    metadata: canonicalizeObject({
      nonce: metadata.nonce || null,
      // Add other stable metadata fields here
    })
  };
  
  // Serialize canonically
  const canonical = JSON.stringify(canonicalizeObject(payload));
  
  // Hash and encode
  const hash = crypto.createHash('sha256').update(canonical).digest();
  const encoded = base32Encode(hash);
  
  // Take first 8 characters for readability
  return `DR-${encoded.substring(0, 8)}`;
}

module.exports = {
  generatePolicyId,
  generateDecisionId,
  base32Encode,
  canonicalizeObject
};
