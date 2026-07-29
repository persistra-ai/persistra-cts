/**
 * AVS-2A: Audit Layer Validation
 * 
 * Purpose: Validate that runtime maintains tamper-evident audit trail
 * 
 * Claims to validate:
 * 1. Append-only behavior (monotonic sequence)
 * 2. Tamper evidence (hash chain integrity)
 * 3. Deterministic under normalization (identical operation sequences produce equivalent normalized hashes)
 * 4. Namespace isolation (no cross-contamination)
 * 
 * NOT testing:
 * - Query engine (not in v1)
 * - SIEM integration (not in v1)
 * - Distributed audit (not in v1)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PCSRuntime = require('../runtime/runtime');
// Optional: load repo-level .env for smoke runs (no-op if dotenv not installed)
try {
  // eslint-disable-next-line import/no-extraneous-dependencies
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
} catch (_) {
  // ignore
}

const resultsDir = path.join(__dirname, '../avs/results/avs2a-audit-layer');
const auditDir = path.join(__dirname, '../avs/audit-logs');

(async () => {

// Clean up
if (fs.existsSync(resultsDir)) {
  fs.rmSync(resultsDir, { recursive: true });
}
if (fs.existsSync(auditDir)) {
  fs.rmSync(auditDir, { recursive: true });
}
fs.mkdirSync(resultsDir, { recursive: true });
fs.mkdirSync(auditDir, { recursive: true });

console.log('=== AVS-2A: Audit Layer Validation ===\n');

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

// Mock model function
// Returns string primitive with metadata properties (runtime expects string for contradiction detection)
async function mockModel(prompt) {
  const output = new String(`Mock response to: ${prompt}`);
  output.provider = 'mock';
  output.model = 'mock-v1';
  return output.valueOf(); // Return primitive string with properties
}

// ============================================================================
// Test 1: Append-Only Behavior (Positive)
// ============================================================================

console.log('\n--- Test 1: Append-Only Behavior ---\n');

const auditPath1 = path.join(auditDir, 'test1-audit.jsonl');
const runtime1 = new PCSRuntime({
  namespace: 'avs2a-test1',
  storePath: path.join(auditDir, 'test1-store.json'),
  auditLogPath: auditPath1,
  runId: 'AVS2A-TEST1'
});

// Create decision
const decision1 = runtime1.createDecision('Use PostgreSQL for persistence');

// Create policy
const policy1 = runtime1.createPolicy('No hardcoded credentials');

// Execute
await runtime1.execute(mockModel, 'Implement database connection');

// Read audit log
const auditContent1 = fs.readFileSync(auditPath1, 'utf8');
const auditLines1 = auditContent1.trim().split('\n').filter(line => line.trim());
const auditRecords1 = auditLines1.map(line => JSON.parse(line));

// A1.1: Line count increased monotonically
assert('A1.1', auditRecords1.length >= 3,
  `Audit log has >=3 records (at minimum: DECISION_CREATED, POLICY_CREATED, RUNTIME_EXECUTE): ${auditRecords1.length}`);

// A1.2: Sequence numbers are monotonic
const sequences = auditRecords1.map(r => r.seq);
const isMonotonic = sequences.every((seq, i) => seq === i + 1);
assert('A1.2', isMonotonic, 
  `Sequence numbers are monotonic: [${sequences.join(', ')}]`);

// A1.3: Hash chain is valid (each prev equals prior hash)
let hashChainValid = true;
let previousHash = null;
for (let i = 0; i < auditRecords1.length; i++) {
  const record = auditRecords1[i];
  if (record.prev !== previousHash) {
    hashChainValid = false;
    console.error(`  Hash chain broken at seq=${record.seq}: expected prev=${previousHash}, got prev=${record.prev}`);
    break;
  }
  previousHash = record.hash;
}
assert('A1.3', hashChainValid, 'Hash chain is valid (each prev equals prior hash)');

// A1.4: All records have required fields
const requiredFields = ['v', 'seq', 'ts', 'namespace', 'sessionId', 'runId', 'event', 'eventId', 'prev', 'hash', 'payload'];
const allHaveRequiredFields = auditRecords1.every(record => 
  requiredFields.every(field => field in record)
);
assert('A1.4', allHaveRequiredFields, 'All records have required fields (v, seq, ts, namespace, sessionId, runId, event, eventId, prev, hash, payload)');

// A1.5: Namespace is correct
const allCorrectNamespace = auditRecords1.every(record => record.namespace === 'avs2a-test1');
assert('A1.5', allCorrectNamespace, 'All records have correct namespace (avs2a-test1)');

// A1.6: RunId is correct
const allCorrectRunId = auditRecords1.every(record => record.runId === 'AVS2A-TEST1');
assert('A1.6', allCorrectRunId, 'All records have correct runId (AVS2A-TEST1)');

// A1.7: Event types are correct
const eventTypes = auditRecords1.map(r => r.event);
const expectedEvents = ['DECISION_CREATED', 'POLICY_CREATED', 'RUNTIME_EXECUTE'];
const eventsMatch = JSON.stringify(eventTypes.slice(0, expectedEvents.length)) === JSON.stringify(expectedEvents);
assert('A1.7', eventsMatch,
  `Event types start with expected minimal prefix: expected [${expectedEvents.join(', ')}], got [${eventTypes.join(', ')}]`);

// ============================================================================
// Test 2: Tamper Evidence (Negative)
// ============================================================================

console.log('\n--- Test 2: Tamper Evidence ---\n');

const auditPath2 = path.join(auditDir, 'test2-audit.jsonl');
const runtime2 = new PCSRuntime({
  namespace: 'avs2a-test2',
  storePath: path.join(auditDir, 'test2-store.json'),
  auditLogPath: auditPath2,
  runId: 'AVS2A-TEST2'
});

// Create some records
runtime2.createDecision('Use Redis for caching');
runtime2.createPolicy('No secrets in logs');
await runtime2.execute(mockModel, 'Implement caching layer');

// Read audit log
const auditContent2 = fs.readFileSync(auditPath2, 'utf8');
const auditLines2 = auditContent2.trim().split('\n').filter(line => line.trim());

// Tamper with middle record (seq=2)
const record2 = JSON.parse(auditLines2[1]);
record2.payload.policyId = 'POL-TAMPERED';
auditLines2[1] = JSON.stringify(record2);

// Write tampered file
fs.writeFileSync(auditPath2, auditLines2.join('\n') + '\n');

// Verify integrity using AuditLog class
const AuditLog = require('../runtime/audit-log');
const auditLog2 = new AuditLog(auditPath2, 'avs2a-test2');
const integrity2 = auditLog2.verifyIntegrity();

// A2.1: Tamper detected
assert('A2.1', !integrity2.ok, 'Tamper detected (verifyIntegrity returns ok=false)');

// A2.2: Correct sequence identified
assert('A2.2', integrity2.firstBadSeq === 2, 
  `Tampered sequence identified correctly: seq=${integrity2.firstBadSeq}`);

// A2.3: Reason provided
assert('A2.3', integrity2.reason && integrity2.reason.includes('hash mismatch'), 
  `Tamper reason includes "hash mismatch": ${integrity2.reason}`);

// ============================================================================
// Test 3: Deterministic Under Normalization (Positive)
// ============================================================================

console.log('\n--- Test 3: Deterministic Under Normalization ---\n');

const auditPath3a = path.join(auditDir, 'test3a-audit.jsonl');
const auditPath3b = path.join(auditDir, 'test3b-audit.jsonl');

// Run A: First execution with same operation sequence
const runtime3a = new PCSRuntime({
  namespace: 'avs2a-test3',
  storePath: path.join(auditDir, 'test3a-store.json'),
  auditLogPath: auditPath3a,
  runId: 'AVS2A-TEST3-DETERMINISTIC',  // Same runId for comparison
  sessionId: 'S-DETERMINISTIC-001'      // Same sessionId for comparison
});

runtime3a.createDecision('Use MongoDB for document storage');
await runtime3a.execute(mockModel, 'Implement document store');

// Run B: Second execution with identical operation sequence
// (same operations, same runId, same sessionId)
const runtime3b = new PCSRuntime({
  namespace: 'avs2a-test3',
  storePath: path.join(auditDir, 'test3b-store.json'),
  auditLogPath: auditPath3b,
  runId: 'AVS2A-TEST3-DETERMINISTIC',  // Same runId
  sessionId: 'S-DETERMINISTIC-001'      // Same sessionId
});

runtime3b.createDecision('Use MongoDB for document storage');
await runtime3b.execute(mockModel, 'Implement document store');

// Read both audit logs
const auditRecords3a = fs.readFileSync(auditPath3a, 'utf8')
  .trim().split('\n').map(line => JSON.parse(line));
const auditRecords3b = fs.readFileSync(auditPath3b, 'utf8')
  .trim().split('\n').map(line => JSON.parse(line));

// Normalize volatile fields (ts, eventId, prompt_hash) and recompute hash chain
// Uses AuditLog static helpers to avoid reimplementing canonicalization/hashing
function normalizeRecords(records) {
  const normalized = [];
  let previousHash = null;
  
  for (const record of records) {
    const norm = { ...record };
    norm.ts = 0; // Normalize timestamp
    norm.eventId = 'E-normalized'; // Normalize eventId
    if (norm.payload && norm.payload.prompt_hash) {
      norm.payload.prompt_hash = '0000000000000000'; // Normalize prompt_hash
    }
    
    // Update prev to normalized previous hash
    norm.prev = previousHash;
    
    // Recompute hash after normalization using AuditLog helpers
    const recordWithoutHash = { ...norm };
    delete recordWithoutHash.hash;
    const canonical = AuditLog.canonicalize(recordWithoutHash);
    norm.hash = AuditLog.hashString(canonical);
    
    previousHash = norm.hash;
    normalized.push(norm);
  }
  
  return normalized;
}

const normalized3a = normalizeRecords(auditRecords3a);
const normalized3b = normalizeRecords(auditRecords3b);

// A3.1: Same number of records for identical operation sequence
assert('A3.1', normalized3a.length === normalized3b.length, 
  `Same number of records for identical operation sequence: ${normalized3a.length} vs ${normalized3b.length}`);

// A3.2: Normalized hashes match (deterministic under normalization)
const hashes3a = normalized3a.map(r => r.hash);
const hashes3b = normalized3b.map(r => r.hash);
const hashesMatch = JSON.stringify(hashes3a) === JSON.stringify(hashes3b);
assert('A3.2', hashesMatch, 
  `Normalized audit hashes match for identical operation sequence (deterministic): ${hashesMatch ? 'YES' : 'NO'}`);

// A3.3: Event types match for identical operation sequence
const events3a = auditRecords3a.map(r => r.event);
const events3b = auditRecords3b.map(r => r.event);
const eventsMatchReplay = JSON.stringify(events3a) === JSON.stringify(events3b);
assert('A3.3', eventsMatchReplay, 
  `Event types match for identical operation sequence: [${events3a.join(', ')}] vs [${events3b.join(', ')}]`);

// ============================================================================
// Test 4: Namespace Isolation (Negative)
// ============================================================================

console.log('\n--- Test 4: Namespace Isolation ---\n');

const auditPath4a = path.join(auditDir, 'test4a-audit.jsonl');
const auditPath4b = path.join(auditDir, 'test4b-audit.jsonl');

// Runtime A: namespace-alpha
const runtime4a = new PCSRuntime({
  namespace: 'namespace-alpha',
  storePath: path.join(auditDir, 'test4a-store.json'),
  auditLogPath: auditPath4a,
  runId: 'AVS2A-TEST4A'
});

runtime4a.createDecision('Alpha decision');
await runtime4a.execute(mockModel, 'Alpha execution');

// Runtime B: namespace-beta
const runtime4b = new PCSRuntime({
  namespace: 'namespace-beta',
  storePath: path.join(auditDir, 'test4b-store.json'),
  auditLogPath: auditPath4b,
  runId: 'AVS2A-TEST4B'
});

runtime4b.createDecision('Beta decision');
await runtime4b.execute(mockModel, 'Beta execution');

// Read both audit logs
const auditRecords4a = fs.readFileSync(auditPath4a, 'utf8')
  .trim().split('\n').map(line => JSON.parse(line));
const auditRecords4b = fs.readFileSync(auditPath4b, 'utf8')
  .trim().split('\n').map(line => JSON.parse(line));

// A4.1: No cross-namespace contamination in audit-alpha
const allAlpha = auditRecords4a.every(record => record.namespace === 'namespace-alpha');
assert('A4.1', allAlpha, 
  'Audit log A contains only namespace-alpha records');

// A4.2: No cross-namespace contamination in audit-beta
const allBeta = auditRecords4b.every(record => record.namespace === 'namespace-beta');
assert('A4.2', allBeta, 
  'Audit log B contains only namespace-beta records');

// A4.3: Different runIds
const runIds4a = [...new Set(auditRecords4a.map(r => r.runId))];
const runIds4b = [...new Set(auditRecords4b.map(r => r.runId))];
const noRunIdOverlap = runIds4a.every(id => !runIds4b.includes(id));
assert('A4.3', noRunIdOverlap, 
  `Different runIds: [${runIds4a.join(', ')}] vs [${runIds4b.join(', ')}]`);

// A4.4: Different sessionIds
const sessionIds4a = [...new Set(auditRecords4a.map(r => r.sessionId))];
const sessionIds4b = [...new Set(auditRecords4b.map(r => r.sessionId))];
const noSessionIdOverlap = sessionIds4a.every(id => !sessionIds4b.includes(id));
assert('A4.4', noSessionIdOverlap, 
  `Different sessionIds: no overlap between namespaces`);

// ============================================================================
// Test 5: Real-Model Audit Emission (Optional Smoke)
// 
// Purpose: Minimal integration smoke proving that when PCSRuntime.execute() is
// invoked with a real provider, audit records are appended and verifyIntegrity()
// passes. This does NOT validate model behavior.
// 
// Guardrail: OFF by default. Enable with:
//   AVS2A_REAL_SMOKE=1 AVS2A_REAL_PROVIDER=anthropic node avs-harness/avs2a-audit-layer.js
// 
// Supported providers (minimal):
//   - anthropic (requires ANTHROPIC_API_KEY)
// 
// NOTE: This test is intentionally lightweight to avoid contaminating determinism.
// ============================================================================

const realSmokeEnabled = (process.env.AVS2A_REAL_SMOKE || '').toString() === '1';
const realProvider = (process.env.AVS2A_REAL_PROVIDER || 'anthropic').toLowerCase();

async function anthropicModel(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');

  // Minimal Anthropic Messages API call. Node 18+ has global fetch.
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: process.env.AVS2A_ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
      max_tokens: 200,
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

  // Return primitive string (runtime expects string for downstream detectors)
  const out = new String(text || '');
  out.provider = 'anthropic';
  out.model = process.env.AVS2A_ANTHROPIC_MODEL || 'claude-3-haiku-20240307';
  return out.valueOf();
}

if (realSmokeEnabled) {
  console.log('\n--- Test 5: Real-Model Audit Emission (Optional Smoke) ---\n');

  let realModelFn;
  if (realProvider === 'anthropic') {
    realModelFn = anthropicModel;
  } else {
    console.log(`Skipping real-model smoke: unsupported provider "${realProvider}"`);
    realModelFn = null;
  }

  if (realModelFn) {
    const auditPath5 = path.join(auditDir, `test5-real-${realProvider}.jsonl`);
    const runtime5 = new PCSRuntime({
      namespace: 'avs2a-real-smoke',
      storePath: path.join(auditDir, `test5-real-${realProvider}-store.json`),
      auditLogPath: auditPath5,
      runId: 'AVS2A-REAL-SMOKE'
    });

    // Minimal runtime activity (no model-behavior assertions)
    runtime5.createDecision('Audit smoke decision');
    runtime5.createPolicy('No hardcoded credentials');

    // Keep prompt innocuous to avoid triggering policy logic or refusal behavior.
    await runtime5.execute(realModelFn, 'Reply with a short greeting.');

    const auditContent5 = fs.readFileSync(auditPath5, 'utf8');
    const lines5 = auditContent5.trim().split('\n').filter(l => l.trim());
    const records5 = lines5.map(l => JSON.parse(l));

    // A5.1: At least one RUNTIME_EXECUTE record emitted
    const hasRuntimeExecute = records5.some(r => r.event === 'RUNTIME_EXECUTE');
    assert('A5.1', hasRuntimeExecute, 'Real-model smoke: audit contains RUNTIME_EXECUTE record');

    // A5.2: Audit log integrity verifies (tamper-evident chain is intact)
    const AuditLog5 = require('../runtime/audit-log');
    const auditLog5 = new AuditLog5(auditPath5, 'avs2a-real-smoke');
    const integrity5 = auditLog5.verifyIntegrity();
    assert('A5.2', integrity5.ok === true, 'Real-model smoke: verifyIntegrity() returns ok=true');

    // A5.3: Record includes basic chain-of-custody fields
    const required5 = ['v', 'seq', 'ts', 'namespace', 'sessionId', 'runId', 'event', 'eventId', 'prev', 'hash', 'payload'];
    const allFields5 = records5.every(r => required5.every(f => f in r));
    assert('A5.3', allFields5, 'Real-model smoke: all records include required audit fields');
  }
} else {
  console.log('\n--- Test 5: Real-Model Audit Emission (Optional Smoke) ---');
  console.log('Skipped (set AVS2A_REAL_SMOKE=1 to enable).');
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
  test: 'AVS-2A: Audit Layer Validation',
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
  path.join(resultsDir, 'avs2a-results.json'),
  JSON.stringify(results, null, 2)
);

console.log(`\nResults saved to: ${resultsDir}/avs2a-results.json`);

if (allPassed) {
  console.log('\n✓ AVS-2A: All assertions passed');
  process.exit(0);
} else {
  console.log('\n✗ AVS-2A: Some assertions failed');
  process.exit(1);
}

})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
