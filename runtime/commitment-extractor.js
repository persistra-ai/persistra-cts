/**
 * Commitment Block Extractor
 * 
 * Purpose: Extract JSON commitment block from model output
 * Pattern: First ```json fenced code block
 * 
 * This provides a stable parsing anchor for structural policy enforcement.
 */

class CommitmentExtractor {
  /**
   * Extract commitment block from model output
   * @param {string} output - Model output text
   * @returns {object} { text: string, commitment: object|null }
   */
  static extract(output) {
    const result = {
      text: output,
      commitment: null
    };
    
    // Extract first ```json block
    const jsonBlockRegex = /```json\s*\n([\s\S]*?)\n```/;
    const match = output.match(jsonBlockRegex);
    
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        result.commitment = parsed;
      } catch (e) {
        // Invalid JSON in commitment block
        // Leave commitment as null
        result.commitmentParseError = e.message;
      }
    }
    
    return result;
  }
  
  /**
   * Get value at JSON pointer
   * @param {object} obj - Object to query
   * @param {string} pointer - JSON pointer (e.g., "/password")
   * @returns {any} Value at pointer, or undefined if not found
   */
  static getByPointer(obj, pointer) {
    if (!obj || typeof obj !== 'object') {
      return undefined;
    }
    
    if (pointer === '') {
      return obj;
    }
    
    if (!pointer.startsWith('/')) {
      throw new Error('JSON pointer must start with /');
    }
    
    const parts = pointer.slice(1).split('/');
    let current = obj;
    
    for (const part of parts) {
      // Unescape JSON pointer special chars
      const key = part.replace(/~1/g, '/').replace(/~0/g, '~');
      
      if (current === null || current === undefined) {
        return undefined;
      }
      
      current = current[key];
    }
    
    return current;
  }
  
  /**
   * Check if JSON pointer exists in object
   * @param {object} obj - Object to query
   * @param {string} pointer - JSON pointer
   * @returns {boolean} True if pointer exists
   */
  static hasPointer(obj, pointer) {
    const value = this.getByPointer(obj, pointer);
    return value !== undefined;
  }
}

module.exports = CommitmentExtractor;
