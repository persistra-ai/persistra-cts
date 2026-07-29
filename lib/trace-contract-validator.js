/**
 * Runtime Trace Contract Validator
 * 
 * Validates that runtime traces conform to the trace contract.
 * Tests must fail if expected trace fields are missing.
 * 
 * Usage:
 *   const validator = require('./lib/trace-contract-validator');
 *   validator.validateEnforcementTrace(result.trace);
 */

class TraceContractValidator {
  /**
   * Validate a trace field path exists
   * @param {object} trace - The trace object
   * @param {string} fieldPath - Dot-separated field path (e.g., 'enforcement_decision.decision')
   * @returns {boolean} True if field exists
   */
  static hasField(trace, fieldPath) {
    const parts = fieldPath.split('.');
    let value = trace;
    
    for (const part of parts) {
      if (value === undefined || value === null) {
        return false;
      }
      value = value[part];
    }
    
    return value !== undefined;
  }
  
  /**
   * Get a trace field value
   * @param {object} trace - The trace object
   * @param {string} fieldPath - Dot-separated field path
   * @returns {any} Field value or undefined
   */
  static getField(trace, fieldPath) {
    const parts = fieldPath.split('.');
    let value = trace;
    
    for (const part of parts) {
      if (value === undefined || value === null) {
        return undefined;
      }
      value = value[part];
    }
    
    return value;
  }
  
  /**
   * Validate required fields are present
   * @param {object} trace - The trace object
   * @param {string[]} requiredFields - Array of required field paths
   * @throws {Error} If validation fails
   */
  static validateFields(trace, requiredFields) {
    const errors = [];
    
    for (const field of requiredFields) {
      if (!this.hasField(trace, field)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Trace contract validation failed:\n${errors.join('\n')}`);
    }
  }
  
  /**
   * Validate enforcement decision trace
   * @param {object} trace - The trace object
   * @throws {Error} If validation fails
   */
  static validateEnforcementTrace(trace) {
    const requiredFields = [
      'enforcement_decision',
      'enforcement_decision.decision',
      'enforcement_decision.reason',
      'enforcement_decision.policyViolation',
      'enforcement_decision.decisionContradiction'
    ];
    
    this.validateFields(trace, requiredFields);
    
    // Validate enum values
    const decision = this.getField(trace, 'enforcement_decision.decision');
    if (!['ALLOW', 'DENY'].includes(decision)) {
      throw new Error(`Invalid enforcement_decision.decision: ${decision} (must be ALLOW or DENY)`);
    }
    
    // Validate types
    const policyViolation = this.getField(trace, 'enforcement_decision.policyViolation');
    if (typeof policyViolation !== 'boolean') {
      throw new Error(`Invalid enforcement_decision.policyViolation type: ${typeof policyViolation} (must be boolean)`);
    }
  }
  
  /**
   * Validate retrieval evidence trace
   * @param {object} trace - The trace object
   * @throws {Error} If validation fails
   */
  static validateRetrievalTrace(trace) {
    const requiredFields = [
      'retrieval_evidence',
      'retrieval_evidence.retrieved',
      'retrieval_evidence.method',
      'retrieval_evidence.trigger',
      'retrieval_evidence.backend',
      'retrieval_evidence.dimensions'
    ];
    
    this.validateFields(trace, requiredFields);
    
    // Validate types
    const retrieved = this.getField(trace, 'retrieval_evidence.retrieved');
    if (typeof retrieved !== 'boolean') {
      throw new Error(`Invalid retrieval_evidence.retrieved type: ${typeof retrieved} (must be boolean)`);
    }
    
    const dimensions = this.getField(trace, 'retrieval_evidence.dimensions');
    if (typeof dimensions !== 'number') {
      throw new Error(`Invalid retrieval_evidence.dimensions type: ${typeof dimensions} (must be number)`);
    }
    
    // Validate dimensions are valid
    const validDimensions = [384, 768, 1536];
    if (!validDimensions.includes(dimensions)) {
      throw new Error(`Invalid retrieval_evidence.dimensions: ${dimensions} (must be 384, 768, or 1536)`);
    }
  }
  
  /**
   * Validate boundary trace
   * @param {object} trace - The trace object
   * @throws {Error} If validation fails
   */
  static validateBoundaryTrace(trace) {
    const requiredFields = [
      'sessionId',
      'namespace',
      'boundaryEnforced'
    ];
    
    this.validateFields(trace, requiredFields);
    
    // Validate types
    const boundaryEnforced = this.getField(trace, 'boundaryEnforced');
    if (typeof boundaryEnforced !== 'boolean') {
      throw new Error(`Invalid boundaryEnforced type: ${typeof boundaryEnforced} (must be boolean)`);
    }
  }
  
  /**
   * Validate memory graph trace
   * @param {object} trace - The trace object
   * @throws {Error} If validation fails
   */
  static validateMemoryGraphTrace(trace) {
    const requiredFields = [
      'memoryGraph',
      'memoryGraph.syncOccurred',
      'memoryGraph.namespace',
      'memoryGraph.targetNode',
      'memoryGraph.timestamp',
      'memoryGraph.conflictResolved'
    ];
    
    this.validateFields(trace, requiredFields);
    
    // Validate types
    const syncOccurred = this.getField(trace, 'memoryGraph.syncOccurred');
    if (typeof syncOccurred !== 'boolean') {
      throw new Error(`Invalid memoryGraph.syncOccurred type: ${typeof syncOccurred} (must be boolean)`);
    }
  }
  
  /**
   * Validate continuity event trace
   * @param {object} trace - The trace object
   * @throws {Error} If validation fails
   */
  static validateContinuityTrace(trace) {
    const requiredFields = [
      'continuityEvent',
      'continuityEvent.confirmed',
      'continuityEvent.sourceModel',
      'continuityEvent.targetModel',
      'continuityEvent.reason'
    ];
    
    this.validateFields(trace, requiredFields);
    
    // Validate types
    const confirmed = this.getField(trace, 'continuityEvent.confirmed');
    if (typeof confirmed !== 'boolean') {
      throw new Error(`Invalid continuityEvent.confirmed type: ${typeof confirmed} (must be boolean)`);
    }
  }
  
  /**
   * Validate full trace contract for a given test level
   * @param {object} trace - The trace object
   * @param {string} level - Test level: 'L1', 'L2', 'L3', 'L4', 'AVS-1P', 'AVS-1R'
   * @throws {Error} If validation fails
   */
  static validateLevel(trace, level) {
    switch (level) {
      case 'L1':
        this.validateBoundaryTrace(trace);
        this.validateRetrievalTrace(trace);
        break;
        
      case 'L2':
        this.validateEnforcementTrace(trace);
        this.validateRetrievalTrace(trace);
        this.validateBoundaryTrace(trace);
        break;
        
      case 'L3':
        this.validateContinuityTrace(trace);
        this.validateRetrievalTrace(trace);
        this.validateBoundaryTrace(trace);
        break;
        
      case 'L4':
        this.validateMemoryGraphTrace(trace);
        this.validateBoundaryTrace(trace);
        break;
        
      case 'AVS-1P':
        this.validateEnforcementTrace(trace);
        break;
        
      case 'AVS-1R':
        this.validateRetrievalTrace(trace);
        break;
        
      default:
        throw new Error(`Unknown test level: ${level}`);
    }
  }
}

module.exports = TraceContractValidator;
