/**
 * Test: EpistemicGate Inline Integration
 * 
 * Purpose: Validate that EpistemicGate runs inline in PCSRuntime.execute()
 * 
 * Gap #2: EpistemicGate exists as a primitive, but it's not proven to run inline
 * in PCSRuntime.execute(). This is the most quotable limitation in the attestation.
 * 
 * What This Tests:
 * - EpistemicGate is invoked before model execution
 * - Gate can block invocation when required state is missing
 * - Gate evidence appears in runtime trace
 * - Model is never called when gate blocks
 * - Gate integrates with DecisionStore for state checking
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const PCSRuntime = require('../runtime/runtime');

const TEST_STORE_PATH = path.join(__dirname, '../test-data/epistemic-gate-inline-test.json');

// Clean up before test
function cleanup() {
  if (fs.existsSync(TEST_STORE_PATH)) {
    fs.unlinkSync(TEST_STORE_PATH);
  }
}

async function runTests() {
  console.log('\n=== EpistemicGate Inline Integration Tests ===\n');
  
  let passCount = 0;
  let failCount = 0;
  
  // Test 1: EpistemicGate is initialized when enabled
  try {
    cleanup();
    const runtime = new PCSRuntime({
      storePath: TEST_STORE_PATH,
      namespace: 'test-namespace',
      epistemicGateEnabled: true
    });
    
    assert(runtime.epistemicGate, 'EpistemicGate should be initialized');
    assert.strictEqual(runtime.epistemicGateEnabled, true, 'EpistemicGate should be enabled');
    assert.strictEqual(runtime.epistemicGate.enabled, true, 'EpistemicGate.enabled should be true');
    
    console.log('✓ Test 1: EpistemicGate is initialized when enabled');
    passCount++;
  } catch (err) {
    console.log(`✗ Test 1 FAILED: ${err.message}`);
    failCount++;
  }
  
  // Test 2: EpistemicGate evidence appears in trace when enabled
  try {
    cleanup();
    const runtime = new PCSRuntime({
      storePath: TEST_STORE_PATH,
      namespace: 'test-namespace',
      epistemicGateEnabled: true,
      pepEnabled: false // Disable PEP to isolate gate behavior
    });
    
    // Create a decision so gate doesn't block
    runtime.createDecision('Test decision');
    
    // Mock model function
    let modelCalled = false;
    const mockModel = async (prompt) => {
      modelCalled = true;
      return 'Model response';
    };
    
    // Execute
    const res = await runtime.execute(mockModel, 'Test prompt');
    
    assert(res.trace.epistemic_gate_evidence, 'Trace should contain epistemic_gate_evidence');
    assert.strictEqual(res.trace.epistemic_gate_evidence.epistemic_gate_evaluated, true, 'Gate should be evaluated');
    assert.strictEqual(modelCalled, true, 'Model should be called when gate passes');
    
    console.log('✓ Test 2: EpistemicGate evidence appears in trace when enabled');
    passCount++;
  } catch (err) {
    console.log(`✗ Test 2 FAILED: ${err.message}`);
    failCount++;
  }
  
  // Test 3: EpistemicGate blocks invocation when required state is missing
  try {
    cleanup();
    const runtime = new PCSRuntime({
      storePath: TEST_STORE_PATH,
      namespace: 'test-namespace',
      epistemicGateEnabled: true,
      pepEnabled: false
    });
    
    // Don't create any decisions - gate should block
    
    // Mock model function that should NOT be called
    let modelCalled = false;
    const mockModel = async (prompt) => {
      modelCalled = true;
      return 'Model response';
    };
    
    // For this test, we need to modify the gate to actually require state
    // Since our current implementation has empty required_state_classes,
    // we'll manually set it for testing purposes
    const originalEvaluate = runtime.epistemicGate.evaluate.bind(runtime.epistemicGate);
    runtime.epistemicGate.evaluate = function(classification, availableStateClasses) {
      // Override classification to require 'decision' state
      const modifiedClassification = {
        query_type: 'classified',
        required_state_classes: ['decision']
      };
      return originalEvaluate(modifiedClassification, availableStateClasses);
    };
    
    // Execute
    const res = await runtime.execute(mockModel, 'Test prompt');
    
    assert.strictEqual(res.allowed, false, 'Invocation should be blocked');
    assert.strictEqual(res.reason, 'epistemic_gate_triggered', 'Reason should be epistemic_gate_triggered');
    assert.strictEqual(modelCalled, false, 'Model should NOT be called when gate blocks');
    assert(res.trace.epistemic_gate_blocked, 'Trace should show gate blocked');
    assert(res.trace.epistemic_gate_evidence, 'Trace should contain gate evidence');
    assert.strictEqual(res.trace.epistemic_gate_evidence.epistemic_gate_triggered, true, 'Gate should be triggered');
    
    console.log('✓ Test 3: EpistemicGate blocks invocation when required state is missing');
    passCount++;
  } catch (err) {
    console.log(`✗ Test 3 FAILED: ${err.message}`);
    failCount++;
  }
  
  // Test 4: EpistemicGate allows invocation when required state is present
  try {
    cleanup();
    const runtime = new PCSRuntime({
      storePath: TEST_STORE_PATH,
      namespace: 'test-namespace',
      epistemicGateEnabled: true,
      pepEnabled: false
    });
    
    // Create required decision
    runtime.createDecision('Required decision');
    
    // Mock model function
    let modelCalled = false;
    const mockModel = async (prompt) => {
      modelCalled = true;
      return 'Model response';
    };
    
    // Execute
    const res = await runtime.execute(mockModel, 'Test prompt');
    
    assert.strictEqual(res.allowed, true, 'Invocation should be allowed');
    assert.strictEqual(modelCalled, true, 'Model should be called when gate passes');
    assert.strictEqual(res.trace.epistemic_gate_evidence.epistemic_gate_triggered, false, 'Gate should not trigger');
    assert.strictEqual(res.trace.epistemic_gate_evidence.invocation_permitted, true, 'Invocation should be permitted');
    
    console.log('✓ Test 4: EpistemicGate allows invocation when required state is present');
    passCount++;
  } catch (err) {
    console.log(`✗ Test 4 FAILED: ${err.message}`);
    failCount++;
  }
  
  // Test 5: EpistemicGate disabled by default (backward compatibility)
  try {
    cleanup();
    const runtime = new PCSRuntime({
      storePath: TEST_STORE_PATH,
      namespace: 'test-namespace'
      // epistemicGateEnabled not specified - should default to false
    });
    
    assert.strictEqual(runtime.epistemicGateEnabled, false, 'EpistemicGate should be disabled by default');
    
    // Mock model function
    const mockModel = async (prompt) => 'Model response';
    
    // Execute
    const res = await runtime.execute(mockModel, 'Test prompt');
    
    assert.strictEqual(res.trace.epistemic_gate_evidence, undefined, 'No gate evidence when disabled');
    
    console.log('✓ Test 5: EpistemicGate disabled by default (backward compatibility)');
    passCount++;
  } catch (err) {
    console.log(`✗ Test 5 FAILED: ${err.message}`);
    failCount++;
  }
  
  // Test 6: EpistemicGate runs before model (proves inline execution)
  try {
    cleanup();
    const runtime = new PCSRuntime({
      storePath: TEST_STORE_PATH,
      namespace: 'test-namespace',
      epistemicGateEnabled: true,
      pepEnabled: false
    });
    
    // Track execution order
    const executionOrder = [];
    
    // Override gate evaluate to track execution
    const originalEvaluate = runtime.epistemicGate.evaluate.bind(runtime.epistemicGate);
    runtime.epistemicGate.evaluate = function(...args) {
      executionOrder.push('gate');
      return originalEvaluate(...args);
    };
    
    // Mock model function
    const mockModel = async (prompt) => {
      executionOrder.push('model');
      return 'Model response';
    };
    
    // Create decision so gate doesn't block
    runtime.createDecision('Test decision');
    
    // Execute
    const res = await runtime.execute(mockModel, 'Test prompt');
    
    assert.strictEqual(executionOrder[0], 'gate', 'Gate should execute first');
    assert.strictEqual(executionOrder[1], 'model', 'Model should execute second');
    assert.strictEqual(executionOrder.length, 2, 'Should have exactly 2 execution steps');
    
    console.log('✓ Test 6: EpistemicGate runs before model (proves inline execution)');
    passCount++;
  } catch (err) {
    console.log(`✗ Test 6 FAILED: ${err.message}`);
    failCount++;
  }
  
  // Final summary
  cleanup();
  
  console.log('\n=== Test Summary ===');
  console.log(`Total: ${passCount + failCount}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  
  if (failCount === 0) {
    console.log('\n✅ All EpistemicGate inline integration tests passed!');
    console.log('\nGap #2 CLOSED: EpistemicGate proven to run inline in PCSRuntime.execute()');
    process.exit(0);
  } else {
    console.log(`\n❌ ${failCount} test(s) failed`);
    process.exit(1);
  }
}

// Run tests
runTests();
