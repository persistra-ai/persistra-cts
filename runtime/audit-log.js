/**
 * AuditLog - Minimal Audit-Grade Append-Only Log
 * 
 * Purpose: Provide tamper-evident chain-of-custody for runtime events
 * Format: Newline-delimited JSON (JSONL)
 * Properties:
 *   - Append-only (no edits/deletes)
 *   - Tamper-evident (hash chain)
 *   - Namespace-scoped
 *   - Deterministic under replay (when volatile fields normalized)
 * 
 * NOT included in v1:
 *   - Query engine
 *   - Database integration
 *   - SIEM integration
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AuditLog {
  /**
   * Create an AuditLog instance
   * @param {string} auditLogPath - Path to audit.jsonl file
   * @param {string} namespace - Namespace for isolation
   * @param {object} options - Optional configuration
   */
  constructor(auditLogPath, namespace, options = {}) {
    if (!auditLogPath) {
      throw new Error('auditLogPath is required');
    }
    if (!namespace) {
      throw new Error('namespace is required');
    }
    
    this.auditLogPath = auditLogPath;
    this.namespace = namespace;
    this.runId = options.runId || process.env.PCS_RUN_ID || `RUN-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Ensure directory exists
    const dir = path.dirname(auditLogPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Load existing log to get sequence number and last hash
    this.sequenceNumber = 0;
    this.previousHash = null;
    
    if (fs.existsSync(auditLogPath)) {
      this._loadLastRecord();
    }
  }
  
  /**
   * Load the last record to initialize sequence number and previous hash
   * @private
   */
  _loadLastRecord() {
    const content = fs.readFileSync(this.auditLogPath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    if (lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      try {
        const lastRecord = JSON.parse(lastLine);
        this.sequenceNumber = lastRecord.seq || 0;
        this.previousHash = lastRecord.hash || null;
      } catch (err) {
        console.error(`Failed to parse last audit record: ${err.message}`);
      }
    }
  }
  
  /**
   * Append an audit record
   * @param {string} event - Event type (e.g., "RUNTIME_EXECUTE", "DECISION_CREATED")
   * @param {object} payload - Event payload
   * @returns {object} The appended record
   */
  append(event, payload = {}) {
    this.sequenceNumber++;
    
    const record = {
      v: 1,
      seq: this.sequenceNumber,
      ts: Date.now(),
      namespace: this.namespace,
      sessionId: payload.sessionId || null,
      runId: this.runId,
      event: event,
      eventId: this._generateEventId(event, this.sequenceNumber),
      prev: this.previousHash,
      payload: payload
    };
    
    // Compute hash (excluding hash field itself)
    const canonical = this._canonicalize(record);
    record.hash = this._hashString(canonical);
    
    // Update previous hash for next record
    this.previousHash = record.hash;
    
    // Append to file
    fs.appendFileSync(this.auditLogPath, JSON.stringify(record) + '\n');
    
    return record;
  }
  
  /**
   * Verify integrity of the audit log
   * @returns {object} { ok: boolean, firstBadSeq?: number, reason?: string }
   */
  verifyIntegrity() {
    if (!fs.existsSync(this.auditLogPath)) {
      return { ok: true }; // Empty log is valid
    }
    
    const content = fs.readFileSync(this.auditLogPath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return { ok: true };
    }
    
    let previousHash = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let record;
      
      try {
        record = JSON.parse(line);
      } catch (err) {
        return {
          ok: false,
          firstBadSeq: i + 1,
          reason: `Invalid JSON at line ${i + 1}: ${err.message}`
        };
      }
      
      // Check sequence number
      if (record.seq !== i + 1) {
        return {
          ok: false,
          firstBadSeq: record.seq,
          reason: `Sequence number mismatch: expected ${i + 1}, got ${record.seq}`
        };
      }
      
      // Check previous hash
      if (record.prev !== previousHash) {
        return {
          ok: false,
          firstBadSeq: record.seq,
          reason: `Hash chain broken: expected prev=${previousHash}, got prev=${record.prev}`
        };
      }
      
      // Verify record hash
      const recordCopy = { ...record };
      delete recordCopy.hash;
      const canonical = this._canonicalize(recordCopy);
      const computedHash = this._hashString(canonical);
      
      if (record.hash !== computedHash) {
        return {
          ok: false,
          firstBadSeq: record.seq,
          reason: `Record hash mismatch: expected ${computedHash}, got ${record.hash}`
        };
      }
      
      previousHash = record.hash;
    }
    
    return { ok: true };
  }
  
  /**
   * Close the audit log (no-op for file-based implementation)
   */
  close() {
    // No-op for file-based implementation
    // Future: could flush buffers, close file handles, etc.
  }
  
  /**
   * Canonicalize a record for hashing
   * @param {object} record - Record to canonicalize
   * @returns {string} Canonical JSON string
   * @private
   */
  _canonicalize(record) {
    return AuditLog.canonicalize(record);
  }
  
  /**
   * Hash a string using SHA-256
   * @param {string} str - String to hash
   * @returns {string} Hex hash
   * @private
   */
  _hashString(str) {
    return AuditLog.hashString(str);
  }
  
  /**
   * Canonicalize a record for hashing (public static helper for test code)
   * Recursively sorts all nested object keys for deterministic JSON
   * @param {object} record - Record to canonicalize
   * @returns {string} Canonical JSON string
   */
  static canonicalize(record) {
    return JSON.stringify(AuditLog._deepSort(record));
  }
  
  /**
   * Recursively sort object keys for deterministic canonicalization
   * @param {any} obj - Object to sort (or primitive)
   * @returns {any} Deep-sorted object (or primitive)
   * @private
   */
  static _deepSort(obj) {
    // Handle primitives and null
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    // Handle arrays (preserve order, but recursively sort elements)
    if (Array.isArray(obj)) {
      return obj.map(item => AuditLog._deepSort(item));
    }
    
    // Handle objects (sort keys, recursively sort values)
    const sortedKeys = Object.keys(obj).sort();
    const sorted = {};
    for (const key of sortedKeys) {
      sorted[key] = AuditLog._deepSort(obj[key]);
    }
    return sorted;
  }
  
  /**
   * Hash a string using SHA-256 (public static helper for test code)
   * @param {string} str - String to hash
   * @returns {string} Hex hash
   */
  static hashString(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
  }
  
  /**
   * Generate event ID
   * @param {string} event - Event type
   * @param {number} seq - Sequence number
   * @returns {string} Event ID
   * @private
   */
  _generateEventId(event, seq) {
    const str = `${event}-${seq}-${Date.now()}`;
    return `E-${this._hashString(str).substring(0, 16)}`;
  }
  
  /**
   * Read all audit records (for testing/verification only)
   * @returns {array} All audit records
   */
  readAll() {
    if (!fs.existsSync(this.auditLogPath)) {
      return [];
    }
    
    const content = fs.readFileSync(this.auditLogPath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    return lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (err) {
        console.error(`Failed to parse audit record: ${err.message}`);
        return null;
      }
    }).filter(record => record !== null);
  }
}

module.exports = AuditLog;
