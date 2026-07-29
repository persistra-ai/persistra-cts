/**
 * Simple in-memory store
 * Used for EVS-6 fixture testing
 */

class Store {
  constructor() {
    this.data = new Map();
  }

  set(key, value) {
    this.data.set(key, value);
    return value;
  }

  get(key) {
    return this.data.get(key);
  }

  has(key) {
    return this.data.has(key);
  }

  delete(key) {
    return this.data.delete(key);
  }

  clear() {
    this.data.clear();
  }
}

module.exports = Store;
