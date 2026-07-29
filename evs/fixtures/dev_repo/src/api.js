/**
 * API Layer - Missing rate limiting feature
 * This is the development task for EVS-6
 */

const Store = require('./store');

class API {
  constructor() {
    this.store = new Store();
  }

  async handleRequest(endpoint, data) {
    // TODO: Add rate limiting here
    // Constraint: No external dependencies
    // Constraint: Must be deterministic
    
    switch (endpoint) {
      case '/data':
        return this.getData(data);
      case '/update':
        return this.updateData(data);
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  }

  getData(params) {
    const key = params.key;
    if (!key) {
      throw new Error('Missing key parameter');
    }
    return { key, value: this.store.get(key) };
  }

  updateData(params) {
    const { key, value } = params;
    if (!key) {
      throw new Error('Missing key parameter');
    }
    this.store.set(key, value);
    return { key, value };
  }
}

module.exports = API;
