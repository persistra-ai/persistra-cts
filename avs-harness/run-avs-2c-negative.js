#!/usr/bin/env node

/**
 * AVS-2C Negative Tests
 * 
 * Tests enforcement boundary hardening against:
 * 1. Missing required field
 * 2. Malformed JSON
 * 3. Multiple JSON blocks
 * 
 * These tests prove enforcement is NOT dependent on model cooperation.
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const path = require('path');
const PCSRuntime = require('../runtime/runtime');

class AVS2CNegativeTests {
  constructor() {
    this.results = [];
  }
  
  async runAllTests() {
    console.log('\n=== AVS-2C Negative Tests ===\n');
    console.log('Testing enforcement boundary hardening...\n');
    
    await this.testMissingField();
    await this.testMalformedJSON();
    await this.testMultipleBlocks();
    await this.testValidCommitment();
    
    this.printSummary();
  }
  
  async testMissingField() {
    console.log('[Test 1: Missing Required Field]');
    
    // PCS-ON
    const runtimeOn = new PCSRuntime({
      storePath: path.join(__dirname, 'test-data', 'negative-missing-field-on.json'),
      pepEnabled: true
    });
    runtimeOn.clearAll();
    
    const decision = runtimeOn.createDecision(
      'Use java for backend services',
      {
        property: 'backend_language',
        value: 'java',
        type: 'technology_choice'
      }
    );
    
    const mockModelFn = async (prompt) => {
      return `I recommend Python for backend services.

Here's my decision:

\`\`\`json
{
  "decision_type": "technology_choice",
  "rationale_summary": "Python is great"
}
\`\`\``;
    };
    
    const resultOn = await runtimeOn.execute(mockModelFn, 'Can we use Python?');
    
    const passOn = !resultOn.allowed && resultOn.reason.includes('Missing required field');
    console.log(`  PCS-ON: ${passOn ? '✅ PASS' : '❌ FAIL'} - Blocked: ${!resultOn.allowed}, Reason: ${resultOn.reason}`);
    
    // PCS-OFF
    const runtimeOff = new PCSRuntime({
      storePath: path.join(__dirname, 'test-data', 'negative-missing-field-off.json'),
      pepEnabled: false
    });
    runtimeOff.clearAll();
    runtimeOff.createDecision('Use java for backend services', {
      property: 'backend_language',
      value: 'java',
      type: 'technology_choice'
    });
    
    const resultOff = await runtimeOff.execute(mockModelFn, 'Can we use Python?');
    
    const passOff = resultOff.allowed && !resultOff.trace;
    console.log(`  PCS-OFF: ${passOff ? '✅ PASS' : '❌ FAIL'} - Allowed: ${resultOff.allowed}, Trace: ${resultOff.trace ? 'YES' : 'NO'}\n`);
    
    this.results.push({
      test: 'Missing Field',
      pcsOn: passOn,
      pcsOff: passOff,
      overall: passOn && passOff
    });
  }
  
  async testMalformedJSON() {
    console.log('[Test 2: Malformed JSON]');
    
    // PCS-ON
    const runtimeOn = new PCSRuntime({
      storePath: path.join(__dirname, 'test-data', 'negative-malformed-on.json'),
      pepEnabled: true
    });
    runtimeOn.clearAll();
    
    runtimeOn.createDecision(
      'Use java for backend services',
      {
        property: 'backend_language',
        value: 'java',
        type: 'technology_choice'
      }
    );
    
    const mockModelFn = async (prompt) => {
      return `I recommend Python for backend services.

\`\`\`json
{ backend_language: python, decision_type: technology_choice }
\`\`\``;
    };
    
    const resultOn = await runtimeOn.execute(mockModelFn, 'Can we use Python?');
    
    const passOn = !resultOn.allowed && resultOn.reason.includes('Malformed JSON');
    console.log(`  PCS-ON: ${passOn ? '✅ PASS' : '❌ FAIL'} - Blocked: ${!resultOn.allowed}, Reason: ${resultOn.reason}`);
    
    // PCS-OFF
    const runtimeOff = new PCSRuntime({
      storePath: path.join(__dirname, 'test-data', 'negative-malformed-off.json'),
      pepEnabled: false
    });
    runtimeOff.clearAll();
    runtimeOff.createDecision('Use java for backend services', {
      property: 'backend_language',
      value: 'java',
      type: 'technology_choice'
    });
    
    const resultOff = await runtimeOff.execute(mockModelFn, 'Can we use Python?');
    
    const passOff = resultOff.allowed && !resultOff.trace;
    console.log(`  PCS-OFF: ${passOff ? '✅ PASS' : '❌ FAIL'} - Allowed: ${resultOff.allowed}, Trace: ${resultOff.trace ? 'YES' : 'NO'}\n`);
    
    this.results.push({
      test: 'Malformed JSON',
      pcsOn: passOn,
      pcsOff: passOff,
      overall: passOn && passOff
    });
  }
  
  async testMultipleBlocks() {
    console.log('[Test 3: Multiple JSON Blocks]');
    
    // PCS-ON
    const runtimeOn = new PCSRuntime({
      storePath: path.join(__dirname, 'test-data', 'negative-multiple-on.json'),
      pepEnabled: true
    });
    runtimeOn.clearAll();
    
    runtimeOn.createDecision(
      'Use java for backend services',
      {
        property: 'backend_language',
        value: 'java',
        type: 'technology_choice'
      }
    );
    
    const mockModelFn = async (prompt) => {
      return `I recommend Java for backend services.

\`\`\`json
{
  "backend_language": "java",
  "decision_type": "technology_choice"
}
\`\`\`

Actually, on second thought, Python is better:

\`\`\`json
{
  "backend_language": "python",
  "decision_type": "technology_choice"
}
\`\`\``;
    };
    
    const resultOn = await runtimeOn.execute(mockModelFn, 'Can we use Python?');
    
    const passOn = !resultOn.allowed && resultOn.reason.includes('Multiple JSON blocks');
    console.log(`  PCS-ON: ${passOn ? '✅ PASS' : '❌ FAIL'} - Blocked: ${!resultOn.allowed}, Reason: ${resultOn.reason}`);
    
    // PCS-OFF
    const runtimeOff = new PCSRuntime({
      storePath: path.join(__dirname, 'test-data', 'negative-multiple-off.json'),
      pepEnabled: false
    });
    runtimeOff.clearAll();
    runtimeOff.createDecision('Use java for backend services', {
      property: 'backend_language',
      value: 'java',
      type: 'technology_choice'
    });
    
    const resultOff = await runtimeOff.execute(mockModelFn, 'Can we use Python?');
    
    const passOff = resultOff.allowed && !resultOff.trace;
    console.log(`  PCS-OFF: ${passOff ? '✅ PASS' : '❌ FAIL'} - Allowed: ${resultOff.allowed}, Trace: ${resultOff.trace ? 'YES' : 'NO'}\n`);
    
    this.results.push({
      test: 'Multiple Blocks',
      pcsOn: passOn,
      pcsOff: passOff,
      overall: passOn && passOff
    });
  }
  
  async testValidCommitment() {
    console.log('[Test 4: Valid Commitment (Control)]');
    
    // PCS-ON with matching commitment
    const runtimeOn = new PCSRuntime({
      storePath: path.join(__dirname, 'test-data', 'negative-valid-on.json'),
      pepEnabled: true
    });
    runtimeOn.clearAll();
    
    runtimeOn.createDecision(
      'Use java for backend services',
      {
        property: 'backend_language',
        value: 'java',
        type: 'technology_choice'
      }
    );
    
    const mockModelFn = async (prompt) => {
      return `I recommend Java for backend services.

\`\`\`json
{
  "backend_language": "java",
  "decision_type": "technology_choice",
  "rationale_summary": "Performance and ecosystem"
}
\`\`\``;
    };
    
    const resultOn = await runtimeOn.execute(mockModelFn, 'Should we use Java?');
    
    const passOn = resultOn.allowed && resultOn.trace;
    console.log(`  PCS-ON: ${passOn ? '✅ PASS' : '❌ FAIL'} - Allowed: ${resultOn.allowed}, Trace: ${resultOn.trace ? 'YES' : 'NO'}`);
    
    // PCS-OFF
    const runtimeOff = new PCSRuntime({
      storePath: path.join(__dirname, 'test-data', 'negative-valid-off.json'),
      pepEnabled: false
    });
    runtimeOff.clearAll();
    runtimeOff.createDecision('Use java for backend services', {
      property: 'backend_language',
      value: 'java',
      type: 'technology_choice'
    });
    
    const resultOff = await runtimeOff.execute(mockModelFn, 'Should we use Java?');
    
    const passOff = resultOff.allowed && !resultOff.trace;
    console.log(`  PCS-OFF: ${passOff ? '✅ PASS' : '❌ FAIL'} - Allowed: ${resultOff.allowed}, Trace: ${resultOff.trace ? 'YES' : 'NO'}\n`);
    
    this.results.push({
      test: 'Valid Commitment',
      pcsOn: passOn,
      pcsOff: passOff,
      overall: passOn && passOff
    });
  }
  
  printSummary() {
    console.log('=== Summary ===\n');
    
    let allPass = true;
    for (const result of this.results) {
      const status = result.overall ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${result.test}`);
      if (!result.overall) {
        console.log(`  PCS-ON: ${result.pcsOn ? 'PASS' : 'FAIL'}, PCS-OFF: ${result.pcsOff ? 'PASS' : 'FAIL'}`);
        allPass = false;
      }
    }
    
    console.log(`\nOverall: ${allPass ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allPass) {
      console.log('\n✅ Enforcement boundary is hardened against model evasion.');
      console.log('✅ Missing fields, malformed JSON, and multiple blocks are all blocked by PCS-ON.');
      console.log('✅ PCS-OFF allows all cases (control working).');
    }
    
    process.exit(allPass ? 0 : 1);
  }
}

// Run tests
const tests = new AVS2CNegativeTests();
tests.runAllTests().catch(err => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
