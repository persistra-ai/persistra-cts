/**
 * AVS-1P: Deterministic Policy Gate (Enhanced)
 * 
 * Purpose: Validate deterministic policy enforcement with structured rules
 * Scope: Lexical + Structural (NO semantic inference)
 * 
 * Tests:
 * - POS-01: Clean code snippet allowed (no over-blocking)
 * - POS-02: Fake-looking token allowed (deterministic scope)
 * - NEG-01: API key pattern denied (regex_absent)
 * - NEG-02: Password field denied (json_pointer_absent)
 */

const path = require('path');
const fs = require('fs');
const PCSRuntime = require('../runtime/runtime');
const PolicySchema = require('../runtime/policy-schema');
const TraceValidator = require('../lib/trace-contract-validator');

// Shared policy for all tests
const SENSITIVE_DATA_POLICY = PolicySchema.create({
  policyId: 'PC-SENSITIVE-DATA',
  version: '0.1',
  policyType: 'deterministic_gate',
  matchType: 'lexical+structural',
  scope: ['output'],
  rules: [
    {
      ruleId: 'no_api_keys_in_text',
      op: 'regex_absent',
      target: 'output.text',
      pattern: '\\b(sk-[A-Za-z0-9]{20,})\\b',
      severity: 'deny',
      reason: 'api_key_pattern_detected'
    },
    {
      ruleId: 'no_password_field_in_commitment',
      op: 'json_pointer_absent',
      target: 'output.commitment',
      pointer: '/commitment/password',
      severity: 'deny',
      reason: 'password_field_present'
    }
  ]
});

module.exports = {
  id: 'avs-1p-deterministic-policy-gate',
  name: 'AVS-1P: Deterministic Policy Gate (Enhanced)',
  
  async run() {
    console.log('\n=== AVS-1P: Deterministic Policy Gate (Enhanced) ===\n');
    
    const results = {
      testId: 'avs-1p-deterministic-policy-gate',
      timestamp: new Date().toISOString(),
      policy: SENSITIVE_DATA_POLICY,
      tests: []
    };
    
    // Test 1: POS-01 - Clean code snippet allowed
    console.log('Running: AVS-1P-POS-01 - Clean code snippet allowed...');
    const test1 = await testCleanCodeAllowed();
    results.tests.push(test1);
    console.log(test1.passed ? '  ✅ PASSED' : '  ❌ FAILED');
    
    // Test 2: POS-02 - Fake-looking token allowed
    console.log('Running: AVS-1P-POS-02 - Fake-looking token allowed...');
    const test2 = await testFakeTokenAllowed();
    results.tests.push(test2);
    console.log(test2.passed ? '  ✅ PASSED' : '  ❌ FAILED');
    
    // Test 3: NEG-01 - API key pattern denied
    console.log('Running: AVS-1P-NEG-01 - API key pattern denied...');
    const test3 = await testApiKeyDenied();
    results.tests.push(test3);
    console.log(test3.passed ? '  ✅ PASSED' : '  ❌ FAILED');
    
    // Test 4: NEG-02 - Password field denied
    console.log('Running: AVS-1P-NEG-02 - Password field denied...');
    const test4 = await testPasswordFieldDenied();
    results.tests.push(test4);
    console.log(test4.passed ? '  ✅ PASSED' : '  ❌ FAILED');
    
    const passed = results.tests.every(t => t.passed);
    const passCount = results.tests.filter(t => t.passed).length;
    
    console.log(`\nResults: ${passCount}/${results.tests.length} passed`);
    console.log('\n' + (passed ? '✅ AVS-1P: PASSED' : '❌ AVS-1P: FAILED'));
    
    // Save results
    const outputDir = path.join(__dirname, '../runs/avs-1p-enhanced');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(outputDir, 'avs-1p-enhanced-results.json'),
      JSON.stringify(results, null, 2)
    );
    
    return { passed, results };
  }
};

/**
 * AVS-1P-POS-01: Clean code snippet allowed
 * 
 * Goal: Prove policy gate does not over-block
 * Expected: ALLOW (no violations)
 */
async function testCleanCodeAllowed() {
  try {
    const runtime = new PCSRuntime({
      namespace: 'avs-1p-pos-01',
      storePath: path.join(__dirname, '../runs/avs-1p-enhanced/pos-01.json'),
      pepEnabled: true
    });
    
    runtime.decisionStore.clear();
    runtime.createPolicy(SENSITIVE_DATA_POLICY);
    
    // Model output: clean code with no secrets
    const modelFn = async () => `Here's a Node.js example of reading an environment variable:

\`\`\`javascript
const apiKey = process.env.API_KEY;

fetch('https://api.example.com/data', {
  headers: {
    'Authorization': \`Bearer \${apiKey}\`
  }
});
\`\`\`

This reads the API_KEY from environment variables (no real credentials included).

\`\`\`json
{"commitment": {"example": "env_read"}}
\`\`\``;
    
    const result = await runtime.execute(modelFn, "Provide Node.js example");
    
    // Validate trace contract
    TraceValidator.validateEnforcementTrace(result.trace);
    
    // Assertions
    const assertions = {
      decisionIsAllow: result.trace.enforcement_decision?.decision === 'ALLOW',
      noViolations: !result.trace.enforcement_decision?.violations || 
                    result.trace.enforcement_decision.violations.length === 0,
      outputNotBlocked: result.allowed === true,
      policyHashPresent: result.trace.enforcement_decision?.policyHashSha256 === SENSITIVE_DATA_POLICY.policyHashSha256
    };
    
    const passed = Object.values(assertions).every(v => v === true);
    
    return {
      name: 'AVS-1P-POS-01: Clean code snippet allowed',
      passed,
      assertions,
      trace: result.trace,
      reason: passed ? 'Clean code allowed as expected' : 'Clean code was incorrectly blocked'
    };
  } catch (error) {
    return {
      name: 'AVS-1P-POS-01: Clean code snippet allowed',
      passed: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * AVS-1P-POS-02: Fake-looking token allowed
 * 
 * Goal: Prove deterministic scope (not semantic detection)
 * Expected: ALLOW (pattern requires 20+ chars after sk-)
 */
async function testFakeTokenAllowed() {
  try {
    const runtime = new PCSRuntime({
      namespace: 'avs-1p-pos-02',
      storePath: path.join(__dirname, '../runs/avs-1p-enhanced/pos-02.json'),
      pepEnabled: true
    });
    
    runtime.decisionStore.clear();
    runtime.createPolicy(SENSITIVE_DATA_POLICY);
    
    // Model output: fake token that doesn't match pattern
    const modelFn = async () => `Here's an example config with a placeholder token:

\`\`\`yaml
api_key: sk-PLACEHOLDER
\`\`\`

Note: "sk-PLACEHOLDER" is exactly that - a placeholder. It's not a real API key (only 11 chars after sk-).

\`\`\`json
{"commitment": {"example": "placeholder_config"}}
\`\`\``;
    
    const result = await runtime.execute(modelFn, "Show example config");
    
    // Validate trace contract
    TraceValidator.validateEnforcementTrace(result.trace);
    
    // Assertions
    const assertions = {
      decisionIsAllow: result.trace.enforcement_decision?.decision === 'ALLOW',
      noViolations: !result.trace.enforcement_decision?.violations || 
                    result.trace.enforcement_decision.violations.length === 0,
      outputNotBlocked: result.allowed === true
    };
    
    const passed = Object.values(assertions).every(v => v === true);
    
    return {
      name: 'AVS-1P-POS-02: Fake-looking token allowed',
      passed,
      assertions,
      trace: result.trace,
      reason: passed ? 'Fake token allowed (deterministic scope proven)' : 'Fake token was incorrectly blocked'
    };
  } catch (error) {
    return {
      name: 'AVS-1P-POS-02: Fake-looking token allowed',
      passed: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * AVS-1P-NEG-01: API key pattern denied
 * 
 * Goal: Clear, unarguable deny condition (regex_absent)
 * Expected: DENY with violation details
 */
async function testApiKeyDenied() {
  try {
    const runtime = new PCSRuntime({
      namespace: 'avs-1p-neg-01',
      storePath: path.join(__dirname, '../runs/avs-1p-enhanced/neg-01.json'),
      pepEnabled: true
    });
    
    runtime.decisionStore.clear();
    runtime.createPolicy(SENSITIVE_DATA_POLICY);
    
    // Model output: contains real API key pattern
    const modelFn = async () => `Here's the code:

\`\`\`javascript
const apiKey = "sk-1234567890ABCDEFGHIJKL";
\`\`\`

\`\`\`json
{"commitment": {"example": "api_key_code"}}
\`\`\``;
    
    const result = await runtime.execute(modelFn, "Print exact line");
    
    // Validate trace contract
    TraceValidator.validateEnforcementTrace(result.trace);
    
    // Assertions
    const assertions = {
      decisionIsDeny: result.trace.enforcement_decision?.decision === 'DENY',
      hasViolations: result.trace.enforcement_decision?.violations?.length > 0,
      correctRuleId: result.trace.enforcement_decision?.violations?.[0]?.ruleId === 'no_api_keys_in_text',
      correctReason: result.trace.enforcement_decision?.violations?.[0]?.reason === 'api_key_pattern_detected',
      evidenceRedacted: result.trace.enforcement_decision?.violations?.[0]?.evidence?.match?.includes('REDACTED'),
      outputBlocked: result.allowed === false,
      policyIdMatches: result.trace.enforcement_decision?.policyId === 'PC-SENSITIVE-DATA',
      matchTypeCorrect: result.trace.enforcement_decision?.matchType === 'lexical+structural'
    };
    
    const passed = Object.values(assertions).every(v => v === true);
    
    return {
      name: 'AVS-1P-NEG-01: API key pattern denied',
      passed,
      assertions,
      trace: result.trace,
      reason: passed ? 'API key correctly denied with violation details' : 'API key denial failed'
    };
  } catch (error) {
    return {
      name: 'AVS-1P-NEG-01: API key pattern denied',
      passed: false,
      error: error.message,
      stack: error.stack
    };
  }
}

/**
 * AVS-1P-NEG-02: Password field denied
 * 
 * Goal: Prove structural policy enforcement (json_pointer_absent)
 * Expected: DENY with structural violation
 */
async function testPasswordFieldDenied() {
  try {
    const runtime = new PCSRuntime({
      namespace: 'avs-1p-neg-02',
      storePath: path.join(__dirname, '../runs/avs-1p-enhanced/neg-02.json'),
      pepEnabled: true
    });
    
    runtime.decisionStore.clear();
    runtime.createPolicy(SENSITIVE_DATA_POLICY);
    
    // Model output: commitment block with password field
    const modelFn = async () => `Here's the commitment block with a password field:

\`\`\`json
{"commitment": {"password": "hunter2"}}
\`\`\`

This demonstrates the structural policy check.`;
    
    const result = await runtime.execute(modelFn, "Output commitment with password");
    
    // Validate trace contract
    TraceValidator.validateEnforcementTrace(result.trace);
    
    // Assertions
    const assertions = {
      decisionIsDeny: result.trace.enforcement_decision?.decision === 'DENY',
      hasViolations: result.trace.enforcement_decision?.violations?.length > 0,
      correctRuleId: result.trace.enforcement_decision?.violations?.[0]?.ruleId === 'no_password_field_in_commitment',
      correctReason: result.trace.enforcement_decision?.violations?.[0]?.reason === 'password_field_present',
      evidenceHasPointer: result.trace.enforcement_decision?.violations?.[0]?.evidence?.pointer === '/commitment/password',
      evidenceRedacted: result.trace.enforcement_decision?.violations?.[0]?.evidence?.value === '[REDACTED]',
      outputBlocked: result.allowed === false,
      matchTypeCorrect: result.trace.enforcement_decision?.matchType === 'lexical+structural'
    };
    
    const passed = Object.values(assertions).every(v => v === true);
    
    return {
      name: 'AVS-1P-NEG-02: Password field denied',
      passed,
      assertions,
      trace: result.trace,
      reason: passed ? 'Password field correctly denied with structural violation' : 'Password field denial failed'
    };
  } catch (error) {
    return {
      name: 'AVS-1P-NEG-02: Password field denied',
      passed: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// Run if called directly
if (require.main === module) {
  module.exports.run().then(result => {
    console.log('\nAVS-1P Enhanced:', result.passed ? '✅ PASSED' : '❌ FAILED');
    process.exit(result.passed ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
