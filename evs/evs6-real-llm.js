#!/usr/bin/env node
/**
 * EVS-6 Real LLM Integration
 * 
 * Uses actual Anthropic API to test EVS-6 v2.0 gold standard implementation
 */

require('dotenv').config({ path: require('path').join(__dirname, '../leo2/.env') });
const Anthropic = require('@anthropic-ai/sdk');
const EVS6RunnerV2 = require('./evs6-runner-v2');
const fs = require('fs');
const path = require('path');

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Real LLM function using Anthropic API
 */
async function callAnthropicAPI(prompt) {
  console.log('[LLM] Calling Anthropic API...');
  
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });
    
    const output = message.content[0].text;
    console.log('[LLM] Response received');
    
    return output;
  } catch (error) {
    console.error('[LLM] API call failed:', error.message);
    throw error;
  }
}

async function runRealLLMTest(runNumber = 1) {
  console.log('='.repeat(60));
  console.log(`EVS-6 v2.0 Real LLM Test - Run ${runNumber}`);
  console.log('Using: Claude 3.5 Sonnet');
  console.log('='.repeat(60));
  console.log();
  
  const timestamp = Date.now();
  const outputDir = path.join(__dirname, 'results', `evs6-real-run${runNumber}-${timestamp}`);
  
  // Test 1: PCS-ON
  console.log('[TEST 1] PCS-ON Condition (Substrate-Mediated Retrieval)');
  console.log('-'.repeat(60));
  
  const runnerOn = new EVS6RunnerV2({
    mode: 'pcs-on',
    outputDir: path.join(outputDir, 'pcs-on')
  });
  
  runnerOn.clearState();
  
  const session1Parsed = await runnerOn.runSession1(callAnthropicAPI);
  console.log();
  
  console.log('[EVS-6] Simulating session termination...');
  console.log('[EVS-6] New process started (no context carryover)');
  console.log();
  
  const session2ParsedOn = await runnerOn.runSession2(callAnthropicAPI);
  console.log();
  
  const diffOn = runnerOn.generateContinuityDiff(session1Parsed, session2ParsedOn);
  fs.writeFileSync(
    path.join(outputDir, 'pcs-on', 'continuity_diff.json'),
    JSON.stringify(diffOn, null, 2)
  );
  
  const promptDumpOn = JSON.parse(fs.readFileSync(
    path.join(outputDir, 'pcs-on', 'session2_prompt_dump.json'),
    'utf8'
  ));
  const assertionsOn = runnerOn.generateAssertions(session1Parsed, session2ParsedOn, promptDumpOn, diffOn);
  fs.writeFileSync(
    path.join(outputDir, 'pcs-on', 'assertions.json'),
    JSON.stringify(assertionsOn, null, 2)
  );
  
  console.log('[RESULT] PCS-ON: ' + assertionsOn.result);
  console.log();
  console.log();
  
  // Test 2: PCS-OFF
  console.log('[TEST 2] PCS-OFF Condition (Control)');
  console.log('-'.repeat(60));
  
  const runnerOff = new EVS6RunnerV2({
    mode: 'pcs-off',
    outputDir: path.join(outputDir, 'pcs-off')
  });
  
  const session1ParsedOff = await runnerOff.runSession1(callAnthropicAPI);
  console.log();
  
  console.log('[EVS-6] Simulating session termination...');
  console.log('[EVS-6] New process started (no context carryover)');
  console.log();
  
  const session2ParsedOff = await runnerOff.runSession2(callAnthropicAPI);
  console.log();
  
  const diffOff = runnerOff.generateContinuityDiff(session1ParsedOff, session2ParsedOff);
  fs.writeFileSync(
    path.join(outputDir, 'pcs-off', 'continuity_diff.json'),
    JSON.stringify(diffOff, null, 2)
  );
  
  const promptDumpOff = JSON.parse(fs.readFileSync(
    path.join(outputDir, 'pcs-off', 'session2_prompt_dump.json'),
    'utf8'
  ));
  const assertionsOff = runnerOff.generateAssertions(session1ParsedOff, session2ParsedOff, promptDumpOff, diffOff);
  fs.writeFileSync(
    path.join(outputDir, 'pcs-off', 'assertions.json'),
    JSON.stringify(assertionsOff, null, 2)
  );
  
  console.log('[RESULT] PCS-OFF: ' + assertionsOff.result);
  console.log();
  console.log();
  
  // Summary
  console.log('='.repeat(60));
  console.log(`EVS-6 v2.0 Real LLM Test Summary - Run ${runNumber}`);
  console.log('='.repeat(60));
  console.log();
  console.log('PCS-ON (Substrate-Mediated Retrieval):');
  console.log(`  Vision Anchor Restored: ${diffOn.markers.vision_anchor_restored.match ? 'YES' : 'NO'}`);
  console.log(`  Decision IDs Restored: ${diffOn.markers.decision_ids_restored.match ? 'YES' : 'NO'}`);
  console.log(`  Policy IDs Restored: ${diffOn.markers.policy_ids_restored.match ? 'YES' : 'NO'}`);
  console.log(`  Step Index Correct: ${diffOn.markers.next_step_index_correct.match ? 'YES' : 'NO'}`);
  console.log(`  Retrieval Trace Present: ${assertionsOn.assertions.find(a => a.id === 'EVS-6.A5')?.pass ? 'YES' : 'NO'}`);
  console.log(`  Enforcement Record Present: ${assertionsOn.assertions.find(a => a.id === 'EVS-6.A6')?.pass ? 'YES' : 'NO'}`);
  console.log(`  Result: ${assertionsOn.result}`);
  console.log();
  console.log('PCS-OFF (Control):');
  console.log(`  Vision Anchor Restored: ${diffOff.markers.vision_anchor_restored.match ? 'YES' : 'NO'}`);
  console.log(`  Decision IDs Restored: ${diffOff.markers.decision_ids_restored.match ? 'YES' : 'NO'}`);
  console.log(`  Policy IDs Restored: ${diffOff.markers.policy_ids_restored.match ? 'YES' : 'NO'}`);
  console.log(`  Step Index Correct: ${diffOff.markers.next_step_index_correct.match ? 'YES' : 'NO'}`);
  console.log(`  Result: ${assertionsOff.result}`);
  console.log();
  console.log(`Output directory: ${outputDir}`);
  console.log();
  
  // Gold Standard Validation
  console.log('='.repeat(60));
  console.log('GOLD STANDARD VALIDATION');
  console.log('='.repeat(60));
  console.log();
  
  if (assertionsOn.result === 'PASS' && assertionsOff.result === 'FAIL') {
    console.log('✓ GOLD STANDARD CLAIM VALIDATED');
    console.log('  - Model received minimal context (IDs only)');
    console.log('  - Substrate query trace proves mediated retrieval');
    console.log('  - Enforcement record proves policy boundary active');
    console.log('  - State snapshot proves substrate authority');
    console.log('  - Restoration is substrate-mediated, not state reinjection');
  } else {
    console.log('✗ CLAIM NOT VALIDATED');
    console.log('  - Review test outputs for details');
    console.log(`  - PCS-ON: ${assertionsOn.result}, PCS-OFF: ${assertionsOff.result}`);
  }
  console.log();
  
  return {
    pcsOn: assertionsOn.result,
    pcsOff: assertionsOff.result,
    outputDir
  };
}

// Run multiple tests
async function runMultipleTests(count = 3) {
  console.log(`Running ${count} test iterations with real LLM...`);
  console.log();
  
  const results = [];
  
  for (let i = 1; i <= count; i++) {
    const result = await runRealLLMTest(i);
    results.push(result);
    
    if (i < count) {
      console.log('Waiting 5 seconds before next run...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log();
    }
  }
  
  // Final summary
  console.log('='.repeat(60));
  console.log('MULTI-RUN SUMMARY');
  console.log('='.repeat(60));
  console.log();
  
  const passCount = results.filter(r => r.pcsOn === 'PASS' && r.pcsOff === 'FAIL').length;
  console.log(`Successful runs: ${passCount}/${count}`);
  console.log();
  
  results.forEach((r, i) => {
    console.log(`Run ${i + 1}:`);
    console.log(`  PCS-ON: ${r.pcsOn}, PCS-OFF: ${r.pcsOff}`);
    console.log(`  Output: ${r.outputDir}`);
  });
  console.log();
  
  if (passCount === count) {
    console.log('✓ ALL RUNS PASSED - Ready to commit');
  } else {
    console.log(`⚠ ${count - passCount} run(s) failed - Review before committing`);
  }
}

// CLI
const runCount = parseInt(process.argv[2]) || 3;
runMultipleTests(runCount).catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
