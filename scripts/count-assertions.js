#!/usr/bin/env node
/**
 * Assertion Counter - Audits all test files for actual assertion counts
 * Compares against paper claims to find discrepancies
 */

const fs = require('fs');
const path = require('path');

// Test files to audit
const tests = [
  // EVS Tests
  { id: 'EVS-1', file: 'evs/evs1-dual-policy.js', paperClaim: '5/5 or 6/6' },
  { id: 'EVS-2', file: 'evs/evs2-context-failure.js', paperClaim: '8/8' },
  { id: 'EVS-3', file: 'evs/evs3-engine-replacement.js', paperClaim: '6/6' },
  { id: 'EVS-4', file: 'evs/evs4-runtime-pure.js', paperClaim: '16/16' },
  { id: 'EVS-5', file: 'evs/evs5-deterministic-reproduction.js', paperClaim: '5/5' },
  { id: 'EVS-6', file: 'evs/evs6-runtime-pure.js', paperClaim: '9/9' },
  { id: 'EVS-7', file: 'evs/evs7-semantic-retrieval.js', paperClaim: '16/16' },
  { id: 'EVS-7-BACKEND', file: 'evs/evs7-backend-switch.js', paperClaim: '15/15' },
  { id: 'EVS-8', file: 'evs/evs8-vision-anchor-persistence.js', paperClaim: '12/12' },
  { id: 'EVS-9', file: 'evs/evs9-airgapped-operation.js', paperClaim: '18/18' },
  { id: 'EVS-10', file: 'evs/evs10-contextual-salience.js', paperClaim: '22/22' },
  { id: 'EVS-10-PERSISTENT', file: 'evs/evs10-persistent-salience.js', paperClaim: '11/11' },
  { id: 'EVS-11', file: 'evs/evs11-meta-programming-interface.js', paperClaim: '19/19' },
  
  // AVS Tests
  { id: 'AVS-1P', file: 'avs-harness/avs-1p-policy-gate.js', paperClaim: '4/4' },
  { id: 'AVS-1R', file: 'avs-harness/avs-1r-decision-retrieval.js', paperClaim: '4/4' },
  { id: 'AVS-2A', file: 'avs-harness/avs2a-audit-layer.js', paperClaim: '17/17' },
  { id: 'AVS-2E', file: 'avs-harness/avs2e-orchestrator-binding.js', paperClaim: '15/15' },
  { id: 'AVS-3A', file: 'avs-harness/avs-3a-epistemic-retrieval.js', paperClaim: '17/17' },
  { id: 'AVS-4', file: 'avs-harness/avs-4-end-to-end-latency.js', paperClaim: 'unknown' },
  
  // CTS Tests
  { id: 'CTS-L1-Session', file: 'tests/L1/persistence/session-boundary-integrity-runtime.js', paperClaim: '2/2' },
  { id: 'CTS-L1-Decision', file: 'tests/L1/persistence/decision-state-recovery-runtime.js', paperClaim: 'unknown' },
  { id: 'CTS-L2', file: 'tests/L2/governance/policy-enforcement-runtime.js', paperClaim: '1/1' },
  { id: 'CTS-L3', file: 'tests/L3/continuity/model-transition-decision-recovery-runtime.js', paperClaim: '1/1' },
  { id: 'CTS-L4', file: 'tests/L4/federated/decision-replication-runtime.js', paperClaim: '1/1' },
  { id: 'CTS-L4-DISTRIBUTED', file: 'tests/L4/federated/cts-l4-distributed.js', paperClaim: '3/3' },
];

function countAssertions(filePath) {
  if (!fs.existsSync(filePath)) {
    return { count: 0, error: 'FILE_NOT_FOUND', assertions: [] };
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Method 1: Look for assertion objects
  const assertionObjectRegex = /const\s+assertions\d*\s*=\s*\{([^}]+)\}/g;
  const matches = [...content.matchAll(assertionObjectRegex)];
  
  let allAssertions = [];
  
  for (const match of matches) {
    const assertionBlock = match[1];
    // Count lines that look like assertions: "TEST.A1.something": ...
    const assertionLines = assertionBlock.split('\n').filter(line => {
      return line.trim().match(/^["'][A-Z0-9-]+\.[A-Z][0-9]+[a-z]?\.[\w-]+["']:/);
    });
    allAssertions.push(...assertionLines);
  }
  
  // Method 2: Look for individual assertion IDs (e.g., EVS-1.A1, EVS-1.V1, etc.)
  const testId = path.basename(filePath, '.js').toUpperCase();
  const assertionIdRegex = new RegExp(`["']${testId.replace(/[0-9]+/, '[0-9]+')}\\.[A-Z][0-9]+[a-z]?\\.`, 'g');
  const idMatches = [...content.matchAll(assertionIdRegex)];
  
  // Get unique assertion IDs
  const uniqueIds = new Set();
  for (const match of idMatches) {
    const id = match[0].replace(/["']/g, '').split('.').slice(0, 2).join('.');
    uniqueIds.add(id);
  }
  
  return {
    count: Math.max(allAssertions.length, uniqueIds.size),
    method: allAssertions.length > 0 ? 'assertion-object' : 'id-pattern',
    assertions: allAssertions.length > 0 ? allAssertions : Array.from(uniqueIds),
    error: null
  };
}

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║  Assertion Count Audit - All 25 Tests                         ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('');

const results = [];
let totalDiscrepancies = 0;

for (const test of tests) {
  const filePath = path.resolve(__dirname, '..', test.file);
  const result = countAssertions(filePath);
  
  const paperCount = test.paperClaim.match(/(\d+)\/\1/)?.[1] || '?';
  const actualCount = result.count;
  const match = paperCount === actualCount.toString();
  
  if (!match && paperCount !== '?' && result.error !== 'FILE_NOT_FOUND') {
    totalDiscrepancies++;
  }
  
  results.push({
    id: test.id,
    paperClaim: test.paperClaim,
    paperCount,
    actualCount,
    match,
    error: result.error,
    method: result.method
  });
  
  const status = result.error ? '❌ ERROR' : (match ? '✅' : '⚠️  MISMATCH');
  const countDisplay = result.error ? result.error : `${actualCount} (paper: ${paperCount})`;
  
  console.log(`${status} ${test.id.padEnd(20)} ${countDisplay}`);
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('Summary');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Total tests audited: ${tests.length}`);
console.log(`Discrepancies found: ${totalDiscrepancies}`);
console.log('');

if (totalDiscrepancies > 0) {
  console.log('DISCREPANCIES DETAIL:');
  console.log('');
  for (const r of results) {
    if (!r.match && r.paperCount !== '?' && !r.error) {
      console.log(`${r.id}:`);
      console.log(`  Paper claims: ${r.paperClaim}`);
      console.log(`  Actual count: ${r.actualCount}`);
      console.log(`  Difference: ${r.actualCount - parseInt(r.paperCount)}`);
      console.log('');
    }
  }
}

// Write detailed report
const reportPath = path.resolve(__dirname, '..', 'ASSERTION_COUNT_AUDIT.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`Detailed report written to: ASSERTION_COUNT_AUDIT.json`);
