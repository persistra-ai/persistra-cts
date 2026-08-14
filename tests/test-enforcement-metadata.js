/**
 * Test: Enforcement Metadata Tracking
 * 
 * Validates that PEP tracks enforcement_count and violation_attempts
 * when blocking violations, and that CSE can use this for authority weighting.
 * 
 * @created 2026-08-09
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const PCSRuntime = require('../runtime/runtime');

const TEST_STORE_PATH = path.join(__dirname, 'data', 'test-enforcement-metadata.json');

// Mock model that generates violations
function mockViolatingModel(output) {
  return async () => output;
}

// Cleanup before test
function cleanup() {
  if (fs.existsSync(TEST_STORE_PATH)) {
    fs.unlinkSync(TEST_STORE_PATH);
  }
}

async function runTest() {
  console.log('\n🧪 TEST: Enforcement Metadata Tracking\n');
  
  cleanup();
  
  const results = {
    passed: 0,
    failed: 0,
    assertions: []
  };
  
  // ============================================================================
  // PHASE 1: Enforcement Count Tracking
  // ============================================================================
  
  console.log('📍 PHASE 1: Enforcement Count Tracking\n');
  
  const runtime = new PCSRuntime({
    storePath: TEST_STORE_PATH,
    namespace: 'test-enforcement',
    pepEnabled: true
  });
  
  // Create a decision
  const decision = runtime.createDecision('Use PostgreSQL for database', {
    importance: 0.8
  });
  
  console.log(`Created decision: ${decision.id}`);
  
  // A1: Initial enforcement_count should be 0 or undefined
  const initialMetadata = runtime.decisionStore.getEnforcementMetadata(decision.id);
  const a1 = initialMetadata.enforcement_count === 0;
  results.assertions.push({ id: 'A1', desc: 'Initial enforcement_count is 0', pass: a1 });
  if (a1) results.passed++; else results.failed++;
  console.log(`${a1 ? '✅' : '❌'} A1: Initial enforcement_count === 0 (got ${initialMetadata.enforcement_count})`);
  
  // Generate violations (model recommends MongoDB, contradicts PostgreSQL decision)
  console.log('\nGenerating violations...');
  
  const violations = [
    'I recommend using MongoDB for this feature.',
    'MongoDB would be a better choice here.',
    'Let\'s switch to MongoDB for better performance.'
  ];
  
  for (let i = 0; i < violations.length; i++) {
    const result = await runtime.execute(
      mockViolatingModel(violations[i]),
      'What database should we use?'
    );
    
    console.log(`  Violation ${i + 1}: ${result.allowed ? 'ALLOWED' : 'BLOCKED'}`);
  }
  
  // A2: enforcement_count should be 3 (one per blocked violation)
  const afterMetadata = runtime.decisionStore.getEnforcementMetadata(decision.id);
  const a2 = afterMetadata.enforcement_count === 3;
  results.assertions.push({ id: 'A2', desc: 'enforcement_count incremented to 3', pass: a2 });
  if (a2) results.passed++; else results.failed++;
  console.log(`\n${a2 ? '✅' : '❌'} A2: enforcement_count === 3 (got ${afterMetadata.enforcement_count})`);
  
  // A3: last_enforced timestamp should be set
  const a3 = afterMetadata.last_enforced !== null;
  results.assertions.push({ id: 'A3', desc: 'last_enforced timestamp set', pass: a3 });
  if (a3) results.passed++; else results.failed++;
  console.log(`${a3 ? '✅' : '❌'} A3: last_enforced timestamp set (${afterMetadata.last_enforced})`);
  
  // A4: Metadata should persist across runtime instances
  const runtime2 = new PCSRuntime({
    storePath: TEST_STORE_PATH,
    namespace: 'test-enforcement',
    pepEnabled: true
  });
  
  const persistedMetadata = runtime2.decisionStore.getEnforcementMetadata(decision.id);
  const a4 = persistedMetadata.enforcement_count === 3;
  results.assertions.push({ id: 'A4', desc: 'Metadata persists across sessions', pass: a4 });
  if (a4) results.passed++; else results.failed++;
  console.log(`${a4 ? '✅' : '❌'} A4: Metadata persists (enforcement_count === ${persistedMetadata.enforcement_count})`);
  
  // ============================================================================
  // PHASE 2: Policy Enforcement Tracking
  // ============================================================================
  
  console.log('\n📍 PHASE 2: Policy Enforcement Tracking\n');
  
  // Create new runtime for policy testing (separate namespace to avoid decision conflicts)
  const policyRuntime = new PCSRuntime({
    storePath: TEST_STORE_PATH,
    namespace: 'test-policy-enforcement',
    pepEnabled: true
  });
  
  // Create a policy (using "forbidden" keyword for detection)
  const policy = policyRuntime.createPolicy('copy-paste is forbidden', {
    importance: 0.9
  });
  
  console.log(`Created policy: ${policy.id}`);
  
  // Generate policy violations
  const policyViolations = [
    'Just copy-paste this code snippet.',
    'You can copy-paste the configuration from the old project.'
  ];
  
  for (let i = 0; i < policyViolations.length; i++) {
    const result = await policyRuntime.execute(
      mockViolatingModel(policyViolations[i]),
      'How should I implement this?'
    );
    
    console.log(`  Policy violation ${i + 1}: ${result.allowed ? 'ALLOWED' : 'BLOCKED'}`);
  }
  
  // B1: Policy enforcement_count should be tracked
  const policies = policyRuntime.decisionStore.loadPolicies();
  const trackedPolicy = policies.find(p => p.id === policy.id);
  
  const b1 = trackedPolicy && trackedPolicy.metadata && trackedPolicy.metadata.enforcement_count === 2;
  results.assertions.push({ id: 'B1', desc: 'Policy enforcement_count tracked', pass: b1 });
  if (b1) results.passed++; else results.failed++;
  console.log(`\n${b1 ? '✅' : '❌'} B1: Policy enforcement_count === 2 (got ${trackedPolicy?.metadata?.enforcement_count})`);
  
  // ============================================================================
  // PHASE 3: CSE Authority Weighting
  // ============================================================================
  
  console.log('\n📍 PHASE 3: CSE Authority Weighting\n');
  
  // Create runtime with CSE enabled and authority weighting
  const cseRuntime = new PCSRuntime({
    storePath: TEST_STORE_PATH,
    namespace: 'test-cse-authority',
    pepEnabled: true,
    cseEnabled: true,
    cseConfig: {
      maxItems: 3,
      recencyWeight: 0.3,
      importanceWeight: 0.4,
      authorityWeight: 0.3  // Enable authority weighting
    }
  });
  
  // Create multiple decisions with varying enforcement history
  const decisions = [
    { statement: 'Decision A (high enforcement)', importance: 0.5, enforcements: 10 },
    { statement: 'Decision B (medium enforcement)', importance: 0.5, enforcements: 5 },
    { statement: 'Decision C (low enforcement)', importance: 0.5, enforcements: 1 },
    { statement: 'Decision D (no enforcement)', importance: 0.5, enforcements: 0 },
    { statement: 'Decision E (no enforcement)', importance: 0.5, enforcements: 0 }
  ];
  
  const createdDecisions = [];
  for (const d of decisions) {
    const decision = cseRuntime.createDecision(d.statement, { importance: d.importance });
    
    // Simulate enforcement history by directly updating metadata
    if (d.enforcements > 0) {
      const allDecisions = cseRuntime.decisionStore.loadDecisions();
      const targetDecision = allDecisions.find(dec => dec.id === decision.id);
      if (targetDecision) {
        if (!targetDecision.metadata) targetDecision.metadata = {};
        targetDecision.metadata.enforcement_count = d.enforcements;
        cseRuntime.decisionStore.saveDecisions(allDecisions);
      }
    }
    
    createdDecisions.push(decision);
  }
  
  console.log(`Created ${createdDecisions.length} decisions with varying enforcement counts`);
  
  // Execute with CSE to trigger selection
  const cseResult = await cseRuntime.execute(
    mockViolatingModel('Test output'),
    'Retrieve decisions'
  );
  
  const cseEvidence = cseResult.trace.cse_evidence;
  
  // C1: CSE evidence should be present
  const c1 = cseEvidence !== undefined && cseEvidence !== null;
  results.assertions.push({ id: 'C1', desc: 'CSE evidence present', pass: c1 });
  if (c1) results.passed++; else results.failed++;
  console.log(`\n${c1 ? '✅' : '❌'} C1: CSE evidence present`);
  
  if (!c1) {
    console.log('❌ CSE evidence missing, cannot validate authority weighting');
  } else {
    // C2: Selected decisions should include high-enforcement decisions
    // Decision A (10 enforcements) should be selected due to high authority
    const selectedIds = cseEvidence.selectedIds || [];
    const decisionASelected = selectedIds.includes(createdDecisions[0].id);
    const c2 = decisionASelected;
    results.assertions.push({ id: 'C2', desc: 'High-enforcement decision selected', pass: c2 });
    if (c2) results.passed++; else results.failed++;
    console.log(`${c2 ? '✅' : '❌'} C2: Decision A (high enforcement) selected`);
    
    // C3: Authority weighting should affect selection
    // With authority weighting, Decision A should rank higher than decisions with no enforcement
    const c3 = selectedIds.length === 3 && selectedIds.includes(createdDecisions[0].id);
    results.assertions.push({ id: 'C3', desc: 'Authority affects selection priority', pass: c3 });
    if (c3) results.passed++; else results.failed++;
    console.log(`${c3 ? '✅' : '❌'} C3: Authority weighting affects selection`);
    
    console.log(`\nSelected decisions: ${selectedIds.join(', ')}`);
    console.log(`Highest salience: ${cseEvidence.highestSalience?.toFixed(3)}`);
    console.log(`Lowest salience: ${cseEvidence.lowestSalience?.toFixed(3)}`);
  }
  
  // ============================================================================
  // FINAL RESULTS
  // ============================================================================
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 ENFORCEMENT METADATA TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`TOTAL: ${results.passed}/${results.passed + results.failed} assertions passed`);
  console.log('═══════════════════════════════════════════════════════════════');
  
  if (results.failed === 0) {
    console.log('✅ TEST PASSED: Enforcement metadata tracking validated');
    console.log('\nWhat This Proves:');
    console.log('  ✅ PEP tracks enforcement_count when blocking violations');
    console.log('  ✅ Policy enforcement is tracked separately');
    console.log('  ✅ Metadata persists across runtime instances');
    console.log('  ✅ CSE can use enforcement history for authority weighting');
    console.log('  ✅ High-enforcement decisions get priority in selection');
  } else {
    console.log(`❌ TEST FAILED: ${results.failed} assertion(s) failed`);
  }
  
  cleanup();
  
  return results.failed === 0;
}

// Run test
if (require.main === module) {
  runTest()
    .then(passed => process.exit(passed ? 0 : 1))
    .catch(err => {
      console.error('Test error:', err);
      process.exit(1);
    });
}

module.exports = { runTest };
