/**
 * Trace Emitter
 * 
 * Purpose: Generate structural enforcement traces
 * Proves: Boundary acted independently of model
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class TraceEmitter {
  constructor(traceDir = path.join(__dirname, 'traces')) {
    this.traceDir = traceDir;
    this.ensureTraceDirExists();
  }
  
  ensureTraceDirExists() {
    if (!fs.existsSync(this.traceDir)) {
      fs.mkdirSync(this.traceDir, { recursive: true });
    }
  }
  
  /**
   * Emit an enforcement trace
   * @param {object} params - Trace parameters
   * @returns {object} The trace with hash
   */
  emit(params) {
    // Start with all params
    const trace = {
      event: params.event || 'policy_enforcement_point.invoked',
      timestamp: Date.now()
    };
    
    // Add all params with snake_case conversion
    for (const [key, value] of Object.entries(params)) {
      if (key === 'event') continue; // Already added
      
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      
      // Special handling for certain fields
      if (key === 'candidateOutput') {
        trace.candidate_output_hash = value ? this.hashString(value) : null;
      } else if (key === 'existingDecision' && value) {
        trace.existing_decision = {
          id: value.id,
          statement: value.statement,
          timestamp: value.timestamp
        };
      } else {
        trace[snakeKey] = value;
      }
    };
    
    // Generate trace hash
    const traceHash = this.hashObject(trace);
    trace.trace_hash = traceHash;
    
    // Write trace to file
    const filename = `trace-${Date.now()}-${traceHash.substring(0, 8)}.json`;
    const filepath = path.join(this.traceDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(trace, null, 2));
    
    return trace;
  }
  
  /**
   * Hash a string using SHA256
   * @param {string} str - String to hash
   * @returns {string} Hex hash
   */
  hashString(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
  }
  
  /**
   * Hash an object using SHA256
   * @param {object} obj - Object to hash
   * @returns {string} Hex hash
   */
  hashObject(obj) {
    const str = JSON.stringify(obj);
    return this.hashString(str);
  }
  
  /**
   * Get all traces
   * @returns {array} All trace files
   */
  listTraces() {
    const files = fs.readdirSync(this.traceDir);
    return files
      .filter(f => f.startsWith('trace-') && f.endsWith('.json'))
      .map(f => {
        const filepath = path.join(this.traceDir, f);
        const content = fs.readFileSync(filepath, 'utf8');
        return JSON.parse(content);
      });
  }
  
  /**
   * Clear all traces (for testing)
   */
  clear() {
    const files = fs.readdirSync(this.traceDir);
    files.forEach(f => {
      if (f.startsWith('trace-') && f.endsWith('.json')) {
        fs.unlinkSync(path.join(this.traceDir, f));
      }
    });
  }
}

module.exports = TraceEmitter;
