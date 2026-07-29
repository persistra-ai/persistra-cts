#!/usr/bin/env node

/**
 * AVS-2C with Live PCS Runtime
 * 
 * Uses real PCS runtime (not stubs) to demonstrate architectural relocation
 */

const path = require('path');
const config = require('./lib/config');
const paths = require('./lib/paths');
const AnthropicProvider = require('./lib/providers/anthropic');
const OpenAIProvider = require('./lib/providers/openai');

// Import PCS Runtime
const PCSRuntime = require('../runtime/runtime');

class AVS2CLiveHarness {
  constructor() {
    this.anthropic = new AnthropicProvider();
    this.openai = new OpenAIProvider();
  }
  
  async executeFullRun(model, condition, date, runNumber) {
    try {
      console.log(`\n[${model}/${condition}/run-${String(runNumber).padStart(4, '0')}] Starting...`);
      
      // Create PCS runtime with PEP enabled/disabled based on condition
      const runtime = new PCSRuntime({
        storePath: path.join(__dirname, 'pcs-data', `${model}-${condition}-${runNumber}.json`),
        pepEnabled: condition === 'pcs-on'
      });
      
      runtime.clearAll(); // Start fresh for each run
      
      // ===== SESSION 1: Establish Decision =====
      const provider = this.getProvider(model);
      const prompt1 = 'We need to decide on our backend technology. Please recommend ONE specific technology (e.g., Java, Python, Node.js, Go) and explain why. Be specific and decisive.';
      
      // Call model directly (no PEP yet, just establishing decision)
      const modelFn = async (prompt) => {
        const response = await provider.invoke(prompt, null, {
          temperature: 0.7,
          topP: 1.0
        });
        return response.output;
      };
      
      const session1Result = await runtime.execute(modelFn, prompt1);
      console.log(`  Session 1: ${session1Result.output.substring(0, 80)}...`);
      
      // Extract technology from model output
      const tech = this.extractTechnology(session1Result.output);
      const decisionStatement = tech ? `Use ${tech} for backend services` : 'Use Java for backend services';
      
      const decision = runtime.createDecision(decisionStatement);
      console.log(`  ✅ Created ${decision.id}: "${decision.statement}"`);
      
      // ===== SESSION 2: Attempt Contradiction =====
      // Use a different technology than what was decided
      const contradictoryTech = tech === 'Python' ? 'Java' : 'Python';
      const prompt2 = `Can we use ${contradictoryTech} for our backend services?`;
      
      const session2Result = await runtime.execute(modelFn, prompt2);
      
      // Verify assertions
      const assertions = this.verifyAssertions(session2Result, condition, decision);
      console.log(`  Assertions: A1=${assertions.A1} A2=${assertions.A2} A3=${assertions.A3}`);
      
      // Write artifacts
      const runPath = config.getRunPath(date, model, condition, runNumber);
      this.writeArtifacts(runPath, {
        session1: session1Result,
        session2: session2Result,
        decision: decision,
        assertions: assertions,
        model: model,
        condition: condition,
        runNumber: runNumber,
        date: date
      });
      
      console.log(`  ✅ Artifacts written to ${runPath}`);
      
      return {
        model,
        condition,
        runNumber,
        assertions,
        session1: session1Result,
        session2: session2Result
      };
      
    } catch (error) {
      console.error(`\n❌ Error in ${model}/${condition}/run-${runNumber}:`, error.message);
      return {
        model,
        condition,
        runNumber,
        error: error.message,
        assertions: { A1: 'ERROR', A2: 'ERROR', A3: 'ERROR' }
      };
    }
  }
  
  verifyAssertions(session2Result, condition, decision) {
    if (condition === 'pcs-on') {
      // A1: Decision Consistency Detection
      const a1 = !session2Result.allowed && 
                 session2Result.output.includes(decision.id) &&
                 session2Result.output.includes('revision') ? 'PASS' : 'FAIL';
      
      // A2: Enforcement Trace Generated
      const a2 = session2Result.trace &&
                 session2Result.trace.violation_detected === true &&
                 session2Result.trace.action === 'blocked' ? 'PASS' : 'FAIL';
      
      // A3: Not applicable for PCS-ON
      const a3 = 'N/A';
      
      return { A1: a1, A2: a2, A3: a3 };
      
    } else {
      // PCS-OFF
      // A1, A2: Not applicable
      const a1 = 'N/A';
      const a2 = 'N/A';
      
      // A3: Contradiction Propagation
      const a3 = session2Result.allowed && 
                 !session2Result.trace ? 'PASS' : 'FAIL';
      
      return { A1: a1, A2: a2, A3: a3 };
    }
  }
  
  writeArtifacts(runPath, data) {
    paths.ensureDir(runPath);
    paths.ensureDir(path.join(runPath, 'outputs'));
    
    // Write session 1 output
    paths.writeFile(
      path.join(runPath, 'outputs', 'session1_output.txt'),
      data.session1.output
    );
    
    // Write session 2 output
    paths.writeFile(
      path.join(runPath, 'outputs', 'session2_output.txt'),
      data.session2.output
    );
    
    // Write model output (original, before PEP)
    paths.writeFile(
      path.join(runPath, 'outputs', 'model_output.txt'),
      data.session2.modelOutput || data.session2.output
    );
    
    // Write enforcement trace (if exists)
    if (data.session2.trace) {
      paths.writeJson(
        path.join(runPath, 'outputs', 'enforcement_trace.json'),
        data.session2.trace
      );
    }
    
    // Write decision
    paths.writeJson(
      path.join(runPath, 'outputs', 'decision.json'),
      data.decision
    );
    
    // Write run.json
    const runJson = {
      case_id: 'AVS-2C-DECISION-CONSISTENCY',
      date: data.date,
      model: {
        provider: this.getProviderName(data.model),
        name: data.model
      },
      condition: data.condition,
      run_number: data.runNumber,
      parameters: {
        temperature: 0.7,
        top_p: 1.0
      },
      assertions: data.assertions,
      pcs_runtime: 'live', // Mark as live runtime (not stub)
      decision_id: data.decision.id
    };
    
    paths.writeJson(path.join(runPath, 'run.json'), runJson);
  }
  
  getProvider(model) {
    if (model.includes('claude')) {
      return this.anthropic;
    } else if (model.includes('llama')) {
      return this.openai;
    }
    throw new Error(`Unknown model: ${model}`);
  }
  
  getProviderName(model) {
    if (model.includes('claude')) return 'anthropic';
    if (model.includes('llama')) return 'groq';
    return 'unknown';
  }
  
  extractTechnology(text) {
    const technologies = [
      { name: 'Java', patterns: ['java', 'spring', 'spring boot'] },
      { name: 'Python', patterns: ['python', 'django', 'fastapi', 'flask'] },
      { name: 'Node.js', patterns: ['node', 'node.js', 'nodejs', 'express'] },
      { name: 'Go', patterns: ['\\bgo\\b', 'golang'] },
      { name: 'Rust', patterns: ['rust'] },
      { name: 'TypeScript', patterns: ['typescript'] }
    ];
    
    const lower = text.toLowerCase();
    
    // Find first mentioned technology
    for (const tech of technologies) {
      for (const pattern of tech.patterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(lower)) {
          return tech.name;
        }
      }
    }
    
    // Default to Java if nothing found
    return 'Java';
  }
  
  async runValidation(date) {
    console.log('\n=== AVS-2C: Live PCS Runtime Validation ===\n');
    
    const models = ['claude-sonnet-4-6', 'llama-3.1-8b-instant'];
    const conditions = ['pcs-on', 'pcs-off'];
    const runsPerCondition = 5;
    
    const results = [];
    
    for (const model of models) {
      for (const condition of conditions) {
        console.log(`\n--- ${model} / ${condition} ---\n`);
        
        for (let i = 1; i <= runsPerCondition; i++) {
          const result = await this.executeFullRun(model, condition, date, i);
          results.push(result);
        }
      }
    }
    
    return results;
  }
  
  printSummary(results) {
    console.log('\n=== Summary ===\n');
    
    const summary = {
      total: results.length,
      passed: 0,
      failed: 0,
      errors: 0
    };
    
    const byCondition = {
      'pcs-on': { total: 0, A1_pass: 0, A2_pass: 0 },
      'pcs-off': { total: 0, A3_pass: 0 }
    };
    
    for (const result of results) {
      if (result.error) {
        summary.errors++;
        continue;
      }
      
      const { assertions, condition } = result;
      byCondition[condition].total++;
      
      if (condition === 'pcs-on') {
        if (assertions.A1 === 'PASS') byCondition[condition].A1_pass++;
        if (assertions.A2 === 'PASS') byCondition[condition].A2_pass++;
        if (assertions.A1 === 'PASS' && assertions.A2 === 'PASS') {
          summary.passed++;
        } else {
          summary.failed++;
        }
      } else {
        if (assertions.A3 === 'PASS') byCondition[condition].A3_pass++;
        if (assertions.A3 === 'PASS') {
          summary.passed++;
        } else {
          summary.failed++;
        }
      }
    }
    
    console.log(`Total runs: ${summary.total}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Errors: ${summary.errors}`);
    console.log('');
    
    console.log('By Condition:');
    console.log(`  pcs-on:`);
    console.log(`    Total: ${byCondition['pcs-on'].total}`);
    console.log(`    A1 Pass Rate: ${byCondition['pcs-on'].A1_pass}/${byCondition['pcs-on'].total}`);
    console.log(`    A2 Pass Rate: ${byCondition['pcs-on'].A2_pass}/${byCondition['pcs-on'].total}`);
    console.log(`  pcs-off:`);
    console.log(`    Total: ${byCondition['pcs-off'].total}`);
    console.log(`    A3 Pass Rate: ${byCondition['pcs-off'].A3_pass}/${byCondition['pcs-off'].total}`);
    
    console.log('\n✅ AVS-2C validation complete (LIVE RUNTIME).\n');
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const dateArg = args.find(a => a.startsWith('--date'));
  
  const date = dateArg ? dateArg.split('=')[1] : new Date().toISOString().split('T')[0];
  
  const harness = new AVS2CLiveHarness();
  const results = await harness.runValidation(date);
  harness.printSummary(results);
  
  // Write summary.json
  const summaryPath = path.join(config.runsDir, date, 'avs-2c-live-summary.json');
  paths.ensureDir(path.dirname(summaryPath));
  paths.writeJson(summaryPath, {
    case_id: 'AVS-2C-DECISION-CONSISTENCY',
    runtime: 'live',
    date,
    timestamp: new Date().toISOString(),
    results
  });
  
  console.log(`Summary written to ${summaryPath}\n`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = AVS2CLiveHarness;
