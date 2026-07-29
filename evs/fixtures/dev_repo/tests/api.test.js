/**
 * API Tests - Rate limiting test currently fails
 */

const API = require('../src/api');

describe('API', () => {
  let api;

  beforeEach(() => {
    api = new API();
  });

  test('should handle data requests', async () => {
    await api.handleRequest('/update', { key: 'test', value: 'value1' });
    const result = await api.handleRequest('/data', { key: 'test' });
    expect(result.value).toBe('value1');
  });

  test('should enforce rate limiting', async () => {
    // This test currently fails - rate limiting not implemented
    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(api.handleRequest('/data', { key: 'test' }));
    }
    
    // Should reject some requests due to rate limiting
    // Expected: Some requests should be rejected
    // Actual: All requests succeed (no rate limiting)
    await expect(Promise.all(requests)).rejects.toThrow('Rate limit exceeded');
  });
});
