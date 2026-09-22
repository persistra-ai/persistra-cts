/**
 * Test: Nonce-Based Replay Attack Prevention
 * 
 * Purpose: Validate that used-nonce tracking prevents replay attacks
 * 
 * What This Tests:
 * - Nonces are validated and recorded
 * - Same nonce cannot be used twice (replay attack prevention)
 * - Nonces persist across DecisionStore restarts
 * - Expired nonces are pruned automatically
 * 
 * Dr. Amin Gap #1: Used-nonce tracking is absent, so replay prevention is unproven
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const EpistemicGate = require('../runtime/epistemic-gate');
const DecisionStore = require('../runtime/decision-store');

const TEST_STORE_PATH = path.join(__dirname, '../test-data/nonce-replay-test.json');

// Clean up before test
function cleanup() {
  if (fs.existsSync(TEST_STORE_PATH)) {
    fs.unlinkSync(TEST_STORE_PATH);
  }
}

function runTests() {
  console.log('\n=== Nonce-Based Replay Attack Prevention Tests ===\n');
  
  let passCount = 0;
  let failCount = 0;
  
  // Test 1: Valid token works first time
  try {
    cleanup();
    const gate = new EpistemicGate({ cryptographicGating: true });
    const store = new DecisionStore(TEST_STORE_PATH, 'test-namespace');
    
    // Generate a gate decision
    const evaluation = gate.evaluate(
      { query_type: 'classified', required_state_classes: ['decision'] },
      ['decision']
    );
    
    const token = evaluation.gate_token;
    assert(token, 'Token should be generated');
    
    // First verification should succeed
    const firstVerification = EpistemicGate.verifyGateToken(token, store);
    assert.strictEqual(firstVerification, true, 'First token verification should succeed');
    
    console.log('✓ Test 1: Valid token works first time');
    passCount++;
  } catch (err) {
    console.log(`✗ Test 1 FAILED: ${err.message}`);
    failCount++;
  }
  
  // Test 2: Same token fails second time (replay detected)
  try {
    const gate = new EpistemicGate({ cryptographicGating: true });
    const store = new DecisionStore(TEST_STORE_PATH, 'test-namespace');
    
    // Generate a gate decision
    const evaluation = gate.evaluate(
      { query_type: 'classified', required_state_classes: ['decision'] },
      ['decision']
    );
    
    const token = evaluation.gate_token;
    
    // First verification should succeed
    const firstVerification = EpistemicGate.verifyGateToken(token, store);
    assert.strictEqual(firstVerification, true, 'First verification should succeed');
    
    // Second verification with same token should fail (replay attack)
    const secondVerification = EpistemicGate.verifyGateToken(token, store);
    assert.strictEqual(secondVerification, false, 'Second verification should fail (replay attack)');
    
    console.log('✓ Test 2: Same token fails second time (replay detected)');
    passCount++;
  } catch (err) {
    console.log(`✗ Test 2 FAILED: ${err.message}`);
    failCount++;
  }
  
  // Test 3: Nonces persist across DecisionStore restart
  try {
    cleanup();
    const gate = new EpistemicGate({ cryptographicGating: true });
    const store1 = new DecisionStore(TEST_STORE_PATH, 'test-namespace');
    
    // Generate and verify token with first store instance
    const evaluation = gate.evaluate(
      { query_type: 'classified', required_state_classes: ['decision'] },
      ['decision']
    );
    
    const token = evaluation.gate_token;
    const firstVerification = EpistemicGate.verifyGateToken(token, store1);
    assert.strictEqual(firstVerification, true, 'First verification should succeed');
    
    // Create new store instance (simulates process restart)
    const store2 = new DecisionStore(TEST_STORE_PATH, 'test-namespace');
    
    // Try to replay token with new store instance
    const replayVerification = EpistemicGate.verifyGateToken(token, store2);
    assert.strictEqual(replayVerification, false, 'Replay should fail after store restart');
    
    console.log('✓ Test 3: Nonces persist across DecisionStore restart');
    passCount++;
  } catch (err) {
    console.log(`✗ Test 3 FAILED: ${err.message}`);
    failCount++;
  }
  
  // Test 4: Expired nonces are pruned
  try {
    cleanup();
    const gate = new EpistemicGate({ cryptographicGating: true });
    const store = new DecisionStore(TEST_STORE_PATH, 'test-namespace');
    
    // Manually create an old nonce (older than 60 seconds)
    const oldTimestamp = Date.now() - 70000; // 70 seconds ago
    const oldNonce = 'old-nonce-should-be-pruned';
    store.saveUsedNonces([{ nonce: oldNonce, timestamp: oldTimestamp }]);
    
    // Verify old nonce exists
    let nonces = store.loadUsedNonces();
    assert.strictEqual(nonces.length, 1, 'Old nonce should exist before pruning');
    
    // Generate and verify a new token (this should trigger pruning)
    const evaluation = gate.evaluate(
      { query_type: 'classified', required_state_classes: ['decision'] },
      ['decision']
    );
    
    const token = evaluation.gate_token;
    EpistemicGate.verifyGateToken(token, store);
    
    // Check that old nonce was pruned
    nonces = store.loadUsedNonces();
    const oldNonceStillExists = nonces.find(n => n.nonce === oldNonce);
    assert.strictEqual(oldNonceStillExists, undefined, 'Old nonce should be pruned');
    assert.strictEqual(nonces.length, 1, 'Only new nonce should remain');
    
    console.log('✓ Test 4: Expired nonces are pruned');
    passCount++;
  } catch (err) {
    console.log(`✗ Test 4 FAILED: ${err.message}`);
    failCount++;
  }
  
  // Test 5: Token without DecisionStore still works (backward compatibility)
  try {
    const gate = new EpistemicGate({ cryptographicGating: true });
    
    // Generate a gate decision
    const evaluation = gate.evaluate(
      { query_type: 'classified', required_state_classes: ['decision'] },
      ['decision']
    );
    
    const token = evaluation.gate_token;
    
    // Verify without DecisionStore (no nonce validation)
    const verification = EpistemicGate.verifyGateToken(token);
    assert.strictEqual(verification, true, 'Verification without DecisionStore should succeed');
    
    console.log('✓ Test 5: Token without DecisionStore still works (backward compatibility)');
    passCount++;
  } catch (err) {
    console.log(`✗ Test 5 FAILED: ${err.message}`);
    failCount++;
  }
  
  // Test 6: Future timestamp rejected (clock skew attack)
  try {
    cleanup();
    const store = new DecisionStore(TEST_STORE_PATH, 'test-namespace');
    
    // Try to validate a nonce with future timestamp
    const futureTimestamp = Date.now() + 10000; // 10 seconds in future
    const futureNonce = 'future-nonce';
    
    const validation = store.validateNonce(futureNonce, futureTimestamp);
    assert.strictEqual(validation.valid, false, 'Future timestamp should be rejected');
    assert(validation.reason.includes('INVALID_TIMESTAMP'), 'Should indicate invalid timestamp');
    
    console.log('✓ Test 6: Future timestamp rejected (clock skew attack)');
    passCount++;
  } catch (err) {
    console.log(`✗ Test 6 FAILED: ${err.message}`);
    failCount++;
  }
  
  // Test 7: Expired token rejected
  try {
    cleanup();
    const store = new DecisionStore(TEST_STORE_PATH, 'test-namespace');
    
    // Try to validate a nonce with old timestamp
    const oldTimestamp = Date.now() - 70000; // 70 seconds ago
    const oldNonce = 'expired-nonce';
    
    const validation = store.validateNonce(oldNonce, oldTimestamp);
    assert.strictEqual(validation.valid, false, 'Expired token should be rejected');
    assert(validation.reason.includes('TOKEN_EXPIRED'), 'Should indicate token expired');
    
    console.log('✓ Test 7: Expired token rejected');
    passCount++;
  } catch (err) {
    console.log(`✗ Test 7 FAILED: ${err.message}`);
    failCount++;
  }
  
  // Test 8: Multiple different tokens work
  try {
    cleanup();
    const gate = new EpistemicGate({ cryptographicGating: true });
    const store = new DecisionStore(TEST_STORE_PATH, 'test-namespace');
    
    // Generate and verify first token
    const eval1 = gate.evaluate(
      { query_type: 'classified', required_state_classes: ['decision'] },
      ['decision']
    );
    const token1 = eval1.gate_token;
    const verify1 = EpistemicGate.verifyGateToken(token1, store);
    assert.strictEqual(verify1, true, 'First token should verify');
    
    // Generate and verify second token (different nonce)
    const eval2 = gate.evaluate(
      { query_type: 'classified', required_state_classes: ['decision'] },
      ['decision']
    );
    const token2 = eval2.gate_token;
    const verify2 = EpistemicGate.verifyGateToken(token2, store);
    assert.strictEqual(verify2, true, 'Second token should verify');
    
    // Verify both nonces are recorded
    const nonces = store.loadUsedNonces();
    assert.strictEqual(nonces.length, 2, 'Both nonces should be recorded');
    
    console.log('✓ Test 8: Multiple different tokens work');
    passCount++;
  } catch (err) {
    console.log(`✗ Test 8 FAILED: ${err.message}`);
    failCount++;
  }
  
  // Cleanup
  cleanup();
  
  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Total: ${passCount + failCount}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  
  if (failCount === 0) {
    console.log('\n✅ All nonce replay prevention tests passed!');
    console.log('\nDr. Amin Gap #1 CLOSED: Used-nonce tracking implemented and validated');
    process.exit(0);
  } else {
    console.log(`\n❌ ${failCount} test(s) failed`);
    process.exit(1);
  }
}

// Run tests
runTests();
