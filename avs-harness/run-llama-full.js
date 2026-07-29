#!/usr/bin/env node

// Full 5×3 Llama 8B matrix run
const AVSHarness = require('./run-avs');

async function runLlamaMatrix() {
  console.log('=== Llama 3.1 8B Full Matrix (5×3 = 15 runs) ===\n');
  
  // Verify environment
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not set (should be Groq key)');
    process.exit(1);
  }
  
  if (!process.env.OPENAI_BASE_URL) {
    console.error('❌ OPENAI_BASE_URL not set');
    console.error('   Set it with: export OPENAI_BASE_URL="https://api.groq.com/openai/v1"');
    process.exit(1);
  }
  
  console.log('✅ Environment configured:');
  console.log(`   OPENAI_BASE_URL=${process.env.OPENAI_BASE_URL}`);
  console.log('   Model: llama-3.1-8b-instant\n');
  
  const harness = new AVSHarness();
  const date = '2026-02-17';
  const model = 'llama-3.1-8b-instant';
  const caseId = 'AVS-1R-DECISION-RETRIEVAL';
  
  const runs = [
    // PCS-ON (5 runs)
    { condition: 'pcs-on', runNumber: 1 },
    { condition: 'pcs-on', runNumber: 2 },
    { condition: 'pcs-on', runNumber: 3 },
    { condition: 'pcs-on', runNumber: 4 },
    { condition: 'pcs-on', runNumber: 5 },
    
    // PCS-OFF (5 runs)
    { condition: 'pcs-off', runNumber: 1 },
    { condition: 'pcs-off', runNumber: 2 },
    { condition: 'pcs-off', runNumber: 3 },
    { condition: 'pcs-off', runNumber: 4 },
    { condition: 'pcs-off', runNumber: 5 },
    
    // Paste (5 runs)
    { condition: 'paste', runNumber: 1 },
    { condition: 'paste', runNumber: 2 },
    { condition: 'paste', runNumber: 3 },
    { condition: 'paste', runNumber: 4 },
    { condition: 'paste', runNumber: 5 }
  ];
  
  const results = [];
  let successCount = 0;
  let errorCount = 0;
  
  for (const run of runs) {
    try {
      const result = await harness.executeRun(
        caseId,
        date,
        model,
        run.condition,
        run.runNumber
      );
      
      results.push(result);
      successCount++;
      
    } catch (error) {
      console.error(`\n❌ Error on ${run.condition}/run-${run.runNumber}:`, error.message);
      errorCount++;
    }
  }
  
  // Summary
  console.log('\n=== Llama 3.1 8B Matrix Complete ===\n');
  console.log(`Total runs: ${runs.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}\n`);
  
  // Breakdown by condition
  const byCondition = {
    'pcs-on': { total: 0, A1: 0, A2: 0, A3: 0 },
    'pcs-off': { total: 0, A1: 0, A2: 0, A3: 0 },
    'paste': { total: 0, A1: 0, A2: 0, A3: 0 }
  };
  
  for (const result of results) {
    const cond = result.condition;
    byCondition[cond].total++;
    if (result.assertions.A1 === 'PASS') byCondition[cond].A1++;
    if (result.assertions.A2 === 'PASS') byCondition[cond].A2++;
    if (result.assertions.A3 === 'PASS') byCondition[cond].A3++;
  }
  
  console.log('Results by Condition:\n');
  
  console.log('PCS-ON:');
  console.log(`  A1 (Nonce Citation): ${byCondition['pcs-on'].A1}/${byCondition['pcs-on'].total}`);
  console.log(`  A2 (Content Fidelity): ${byCondition['pcs-on'].A2}/${byCondition['pcs-on'].total}`);
  console.log(`  A3 (Retrieval Trace): ${byCondition['pcs-on'].A3}/${byCondition['pcs-on'].total}`);
  console.log('');
  
  console.log('PCS-OFF:');
  console.log(`  A1 (Nonce Citation): ${byCondition['pcs-off'].A1}/${byCondition['pcs-off'].total}`);
  console.log(`  A2 (Content Fidelity): ${byCondition['pcs-off'].A2}/${byCondition['pcs-off'].total}`);
  console.log(`  A3 (Retrieval Trace): ${byCondition['pcs-off'].A3}/${byCondition['pcs-off'].total}`);
  console.log('');
  
  console.log('Paste:');
  console.log(`  A1 (Nonce Citation): ${byCondition['paste'].A1}/${byCondition['paste'].total}`);
  console.log(`  A2 (Content Fidelity): ${byCondition['paste'].A2}/${byCondition['paste'].total}`);
  console.log(`  A3 (Retrieval Trace): ${byCondition['paste'].A3}/${byCondition['paste'].total}`);
  console.log('');
  
  // Final verdict
  const pcsOnPerfect = byCondition['pcs-on'].A1 === 5 && 
                       byCondition['pcs-on'].A2 === 5 && 
                       byCondition['pcs-on'].A3 === 5;
  const pcsOffZero = byCondition['pcs-off'].A3 === 0;
  const pasteA3Zero = byCondition['paste'].A3 === 0;
  
  if (pcsOnPerfect && pcsOffZero && pasteA3Zero) {
    console.log('✅ PERFECT MATRIX');
    console.log('   PCS-ON: 5/5 (all assertions pass)');
    console.log('   PCS-OFF: 0/5 (A3 correctly fails)');
    console.log('   Paste: A3 0/5 (correctly fails)\n');
    console.log('🎯 Llama 3.1 8B validates PCS architecture with open-source model.');
  } else {
    console.log('⚠️  Matrix incomplete or has unexpected results');
    console.log('   Review individual run outputs for details');
  }
  
  console.log('\nCheck results at:');
  console.log('  runs/2026-02-17/llama-3.1-8b-instant/\n');
  
  process.exit(0);
}

runLlamaMatrix().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
