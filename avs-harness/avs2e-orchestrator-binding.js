/**
 * AVS-2E: Orchestrator Binding Validation
 * 
 * Purpose: Validate that orchestrator is runtime-bound, provider-pluggable,
 * emits trace-visible provider identity, and fails closed under misbinding.
 * 
 * Claims to validate:
 * 1. Deterministic provider binding (trace.provider.name/model/mode emitted)
 * 2. Provider switch is trace-visible (different providers produce different traces)
 * 3. Misbinding fails closed (missing/invalid credentials fail gracefully)
 * 4. Replay mode provenance (replay mode emits correct provider metadata)
 * 
 * NOT testing:
 * - Multi-step workflow correctness
 * - Agent loop correctness
 * - Semantic retrieval (that's EVS-7)
 * - Incident remediation (that's EVS-3)
 * 
 * This is plumbing integrity + provenance only.
 */

const fs = require('fs');
const path = require('path');
const PCSRuntime = require('../runtime/runtime');

// Optional: load repo-level .env for smoke runs
try {
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
} catch (_) {
  // ignore
}

const resultsDir = path.join(__dirname, '../avs/results/avs2e-orchestrator-binding');
const storeDir = path.join(__dirname, '../avs/orchestrator-stores');

// Clean up
if (fs.existsSync(resultsDir)) {
  fs.rmSync(resultsDir, { recursive: true });
}
if (fs.existsSync(storeDir)) {
  fs.rmSync(storeDir, { recursive: true });
}
fs.mkdirSync(resultsDir, { recursive: true });
fs.mkdirSync(storeDir, { recursive: true });

console.log('=== AVS-2E: Orchestrator Binding Validation ===\n');

const assertions = [];

function assert(id, condition, message) {
  const result = { id, condition, message, passed: condition };
  assertions.push(result);
  console.log(`${condition ? '✓' : '✗'} ${id}: ${message}`);
  if (!condition) {
    console.error(`  FAILED: ${message}`);
  }
  return condition;
}

(async () => {

// ============================================================================
// Test 1: Deterministic Provider Binding (Positive) - Mock
// ============================================================================

console.log('\n--- Test 1: Deterministic Provider Binding (Mock) ---\n');

// Mock model function with provider metadata
async function mockAnthropicModel(prompt) {
  // Use String object wrapper to attach metadata
  const output = new String(`Mock Anthropic response to: ${prompt}`);
  output.provider = 'anthropic';
  output.model = 'claude-3-haiku-20240307';
  output.mode = 'live';
  return output;
}

const runtime1 = new PCSRuntime({
  namespace: 'avs2e-test1',
  storePath: path.join(storeDir, 'test1-store.json'),
  modelLabel: 'claude-3-haiku-20240307'
});

const result1 = await runtime1.execute(mockAnthropicModel, 'Test prompt');

// E1.1: trace.provider exists
assert('E1.1', result1.trace.provider !== undefined,
  'trace.provider field exists');

// E1.2: trace.provider.name is correct
assert('E1.2', result1.trace.provider.name === 'anthropic',
  `trace.provider.name === "anthropic": ${result1.trace.provider.name}`);

// E1.3: trace.provider.model is correct
assert('E1.3', result1.trace.provider.model === 'claude-3-haiku-20240307',
  `trace.provider.model === "claude-3-haiku-20240307": ${result1.trace.provider.model}`);

// E1.4: trace.provider.mode is correct
assert('E1.4', result1.trace.provider.mode === 'live',
  `trace.provider.mode === "live": ${result1.trace.provider.mode}`);

// ============================================================================
// Test 2: Provider Switch is Trace-Visible (Positive) - Mock
// ============================================================================

console.log('\n--- Test 2: Provider Switch is Trace-Visible (Mock) ---\n');

// Mock Groq model function
async function mockGroqModel(prompt) {
  const output = new String(`Mock Groq response to: ${prompt}`);
  output.provider = 'groq';
  output.model = 'llama-3.1-8b-instant';
  output.mode = 'live';
  return output;
}

const runtime2 = new PCSRuntime({
  namespace: 'avs2e-test2',
  storePath: path.join(storeDir, 'test2-store.json'),
  modelLabel: 'llama-3.1-8b-instant'
});

const result2 = await runtime2.execute(mockGroqModel, 'Test prompt');

// E2.1: trace.provider.name switched to groq
assert('E2.1', result2.trace.provider.name === 'groq',
  `trace.provider.name === "groq": ${result2.trace.provider.name}`);

// E2.2: trace.provider.model switched to llama
assert('E2.2', result2.trace.provider.model === 'llama-3.1-8b-instant',
  `trace.provider.model === "llama-3.1-8b-instant": ${result2.trace.provider.model}`);

// E2.3: Prior provider (anthropic) does not appear in this trace
assert('E2.3', result2.trace.provider.name !== 'anthropic',
  'Prior provider (anthropic) does not appear in this trace');

// ============================================================================
// Test 3: Misbinding Fails Closed (Negative)
// ============================================================================

console.log('\n--- Test 3: Misbinding Fails Closed ---\n');

// Mock model function that simulates API key failure
async function failingProviderModel(prompt) {
  throw new Error('GROQ_API_KEY missing or invalid');
}

const runtime3 = new PCSRuntime({
  namespace: 'avs2e-test3',
  storePath: path.join(storeDir, 'test3-store.json'),
  modelLabel: 'llama-3.1-8b-instant'
});

// Execute with failing provider - runtime returns structured failure trace
const result3 = await runtime3.execute(failingProviderModel, 'Test prompt');

// E3.1: Execution returns with allowed=false when provider binding fails
assert('E3.1', result3.allowed === false,
  'Execution returns allowed=false when provider binding fails');

// E3.2: Structured failure trace is present (trace.provider_bind_failed)
assert('E3.2', result3.trace.provider_bind_failed === true,
  `Structured failure trace present: trace.provider_bind_failed === true`);

// E3.3: Error code is classified correctly (MISSING_API_KEY)
assert('E3.3', result3.trace.provider_bind_error.code === 'MISSING_API_KEY',
  `Error code classified: ${result3.trace.provider_bind_error.code}`);

// E3.4: Error message is captured
assert('E3.4', result3.trace.provider_bind_error.message.includes('API_KEY') || result3.trace.provider_bind_error.message.includes('missing'),
  `Error message captured: "${result3.trace.provider_bind_error.message}"`);

// ============================================================================
// Test 4: Replay Mode Provenance (Positive)
// 
// NOTE: This test validates trace.provider.mode === 'replay' for replay scenarios.
// For full replay validation including "zero provider calls", see EVS-5 
// (Deterministic Reproduction) which implements call counting and replay verification.
// AVS-2E focuses on provider binding integrity; EVS-5 focuses on replay correctness.
// ============================================================================

console.log('\n--- Test 4: Replay Mode Provenance ---\n');

// Mock replay model function (simulates EVS-5 replay mode)
// In EVS-5, this would be backed by a recorded response, not a mock string
let replayCallCount = 0;  // Track calls (EVS-5 mechanism reference)

async function replayModel(prompt) {
  replayCallCount++;  // Increment counter (EVS-5 uses this to prove zero external calls)
  const output = new String(`Replayed response to: ${prompt}`);
  output.provider = 'anthropic';
  output.model = 'claude-3-haiku-20240307';
  output.mode = 'replay';  // Key difference: mode is 'replay'
  return output;
}

const runtime4 = new PCSRuntime({
  namespace: 'avs2e-test4',
  storePath: path.join(storeDir, 'test4-store.json'),
  modelLabel: 'claude-3-haiku-20240307'
});

const result4 = await runtime4.execute(replayModel, 'Test prompt');

// E4.1: trace.provider.mode is 'replay'
assert('E4.1', result4.trace.provider.mode === 'replay',
  `trace.provider.mode === "replay": ${result4.trace.provider.mode}`);

// E4.2: trace.provider.name matches recorded run
assert('E4.2', result4.trace.provider.name === 'anthropic',
  `trace.provider.name matches recorded run: ${result4.trace.provider.name}`);

// E4.3: trace.provider.model matches recorded run
assert('E4.3', result4.trace.provider.model === 'claude-3-haiku-20240307',
  `trace.provider.model matches recorded run: ${result4.trace.provider.model}`);

// E4.4: Replay used local model function (not external API)
// This references EVS-5's "zero external calls" mechanism
assert('E4.4', replayCallCount === 1,
  `Replay used local model function (call count: ${replayCallCount}, expected: 1)`);

// ============================================================================
// Test 5: Real-Provider Binding (Optional Smoke)
// 
// Purpose: Minimal integration smoke proving that real provider calls
// emit correct trace.provider metadata.
// 
// Guardrail: OFF by default. Enable with:
//   AVS2E_REAL_SMOKE=1 node avs-harness/avs2e-orchestrator-binding.js
// 
// Supported providers:
//   - anthropic (requires ANTHROPIC_API_KEY)
//   - groq (requires GROQ_API_KEY)
// ============================================================================

const realSmokeEnabled = (process.env.AVS2E_REAL_SMOKE || '').toString() === '1';

async function anthropicModel(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: process.env.AVS2E_ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
      max_tokens: 50,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error: ${res.status} ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = Array.isArray(data.content) ? data.content : [];
  const text = content.map(part => (part && part.type === 'text' ? part.text : '')).join('');

  const out = new String(text || '');
  out.provider = 'anthropic';
  out.model = process.env.AVS2E_ANTHROPIC_MODEL || 'claude-3-haiku-20240307';
  out.mode = 'live';
  return out;
}

async function groqModel(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY missing');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.AVS2E_GROQ_MODEL || 'llama-3.1-8b-instant',
      max_tokens: 50,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq API error: ${res.status} ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';

  const out = new String(text);
  out.provider = 'groq';
  out.model = process.env.AVS2E_GROQ_MODEL || 'llama-3.1-8b-instant';
  out.mode = 'live';
  return out;
}

if (realSmokeEnabled) {
  console.log('\n--- Test 5: Real-Provider Binding (Optional Smoke) ---\n');

  // Test 5a: Real Anthropic binding
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('Test 5a: Real Anthropic binding\n');

    const runtime5a = new PCSRuntime({
      namespace: 'avs2e-real-anthropic',
      storePath: path.join(storeDir, 'test5a-real-anthropic-store.json'),
      modelLabel: process.env.AVS2E_ANTHROPIC_MODEL || 'claude-3-haiku-20240307'
    });

    const result5a = await runtime5a.execute(anthropicModel, 'Reply with a short greeting.');

    // E5a.1: trace.provider.name is anthropic
    assert('E5a.1', result5a.trace.provider.name === 'anthropic',
      `Real Anthropic: trace.provider.name === "anthropic": ${result5a.trace.provider.name}`);

    // E5a.2: trace.provider.model matches expected
    const expectedModel5a = process.env.AVS2E_ANTHROPIC_MODEL || 'claude-3-haiku-20240307';
    assert('E5a.2', result5a.trace.provider.model === expectedModel5a,
      `Real Anthropic: trace.provider.model === "${expectedModel5a}": ${result5a.trace.provider.model}`);

    // E5a.3: trace.provider.mode is live
    assert('E5a.3', result5a.trace.provider.mode === 'live',
      `Real Anthropic: trace.provider.mode === "live": ${result5a.trace.provider.mode}`);
  } else {
    console.log('Test 5a: Skipped (ANTHROPIC_API_KEY not set)\n');
  }

  // Test 5b: Real Groq binding
  if (process.env.GROQ_API_KEY) {
    console.log('Test 5b: Real Groq binding\n');

    const runtime5b = new PCSRuntime({
      namespace: 'avs2e-real-groq',
      storePath: path.join(storeDir, 'test5b-real-groq-store.json'),
      modelLabel: process.env.AVS2E_GROQ_MODEL || 'llama-3.1-8b-instant'
    });

    const result5b = await runtime5b.execute(groqModel, 'Reply with a short greeting.');

    // E5b.1: trace.provider.name is groq
    assert('E5b.1', result5b.trace.provider.name === 'groq',
      `Real Groq: trace.provider.name === "groq": ${result5b.trace.provider.name}`);

    // E5b.2: trace.provider.model matches expected
    const expectedModel5b = process.env.AVS2E_GROQ_MODEL || 'llama-3.1-8b-instant';
    assert('E5b.2', result5b.trace.provider.model === expectedModel5b,
      `Real Groq: trace.provider.model === "${expectedModel5b}": ${result5b.trace.provider.model}`);

    // E5b.3: trace.provider.mode is live
    assert('E5b.3', result5b.trace.provider.mode === 'live',
      `Real Groq: trace.provider.mode === "live": ${result5b.trace.provider.mode}`);
  } else {
    console.log('Test 5b: Skipped (GROQ_API_KEY not set)\n');
  }
} else {
  console.log('\n--- Test 5: Real-Provider Binding (Optional Smoke) ---');
  console.log('Skipped (set AVS2E_REAL_SMOKE=1 to enable).\n');
}

// ============================================================================
// Summary
// ============================================================================

console.log('\n=== Summary ===\n');

const passed = assertions.filter(a => a.passed).length;
const total = assertions.length;
const allPassed = passed === total;

console.log(`Total: ${passed}/${total} assertions passed`);

if (!allPassed) {
  console.log('\nFailed assertions:');
  assertions.filter(a => !a.passed).forEach(a => {
    console.log(`  ${a.id}: ${a.message}`);
  });
}

// Save results
const results = {
  test: 'AVS-2E: Orchestrator Binding Validation',
  timestamp: new Date().toISOString(),
  assertions: assertions,
  summary: {
    total: total,
    passed: passed,
    failed: total - passed,
    success: allPassed
  }
};

fs.writeFileSync(
  path.join(resultsDir, 'avs2e-results.json'),
  JSON.stringify(results, null, 2)
);

// Save summary
const summaryLines = [
  'AVS-2E: Orchestrator Binding Validation',
  '=' .repeat(50),
  '',
  `Total Assertions: ${total}`,
  `Passed: ${passed}`,
  `Failed: ${total - passed}`,
  `Success: ${allPassed ? 'YES' : 'NO'}`,
  '',
  'Test Coverage:',
  '- Test 1: Deterministic Provider Binding (Mock)',
  '- Test 2: Provider Switch is Trace-Visible (Mock)',
  '- Test 3: Misbinding Fails Closed',
  '- Test 4: Replay Mode Provenance',
  '- Test 5: Real-Provider Binding (Optional Smoke)',
  '',
  'Trace Contract Validation:',
  '- trace.provider.name (provider identity)',
  '- trace.provider.model (model identity)',
  '- trace.provider.mode (live | replay)',
  '',
  `Results saved to: ${resultsDir}/avs2e-results.json`,
  ''
];

fs.writeFileSync(
  path.join(resultsDir, 'SUMMARY.txt'),
  summaryLines.join('\n')
);

console.log(`\nResults saved to: ${resultsDir}/avs2e-results.json`);
console.log(`Summary saved to: ${resultsDir}/SUMMARY.txt`);

if (allPassed) {
  console.log('\n✓ AVS-2E: All assertions passed');
  process.exit(0);
} else {
  console.log('\n✗ AVS-2E: Some assertions failed');
  process.exit(1);
}

})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
