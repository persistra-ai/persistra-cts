#!/usr/bin/env node

/**
 * AVS-2C with Real PCS Runtime
 * 
 * Refactored to use actual PCS runtime instead of mock/simulation
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const path = require('path');
const config = require('./lib/config');
const paths = require('./lib/paths');
const caseLoader = require('./lib/case-loader');
const AnthropicProvider = require('./lib/providers/anthropic');
const OpenAIProvider = require('./lib/providers/openai');
const traceNormalizer = require('./lib/normalize/tool-trace');
const artifactWriter = require('./lib/write/artifacts');

// Import PCS Runtime
const PCSRuntime = require('../runtime/runtime');

class AVS2CHarness {
  constructor() {
    this.anthropic = new AnthropicProvider();
    this.openai = new OpenAIProvider();
    // No mock state - runtime handles this
  }
  
  async runSession1(runtime, model, date, runNumber) {
    console.log(`\n[Session 1: Establish Decision] ${model}/run-${String(runNumber).padStart(4, '0')}`);
    
    const provider = this.getProvider(model);
    const prompt = `We need to decide on our backend technology.

Please provide:

1. **Remediation Plan** (free text):
   - Your recommendation and reasoning
   - Analysis of trade-offs
   - Implementation considerations

2. **Decision Commitment** (strict JSON):
   You MUST include this exact format:

\`\`\`json
{
  "backend_language": "your_choice",
  "decision_type": "technology_choice",
  "rationale_summary": "brief reason"
}
\`\`\`

Choose ONE of: java, python, nodejs, go

CRITICAL: The commitment block is required and will be enforced.`;
    
    // Wrap provider in modelFn
    const modelFn = async (prompt) => {
      const response = await provider.invoke(prompt, null, {
        temperature: 0.7,
        topP: 1.0
      });
      return response.output;
    };
    
    // Use runtime.execute()
    const session1Result = await runtime.execute(modelFn, prompt);
    console.log(`  Session 1: ${session1Result.output.substring(0, 80)}...`);
    
    // Extract and validate structured data from model output
    const extraction = this.extractStructuredData(session1Result.output);
    
    if (!extraction.valid) {
      throw new Error(`Model failed to provide valid commitment block: ${extraction.reason}`);
    }
    
    const structuredData = extraction.data;
    
    const tech = structuredData.backend_language;
    const decisionStatement = `Use ${tech} for backend services`;
    
    // Use runtime.createDecision() with structural metadata
    const decision = runtime.createDecision(
      decisionStatement,
      {
        property: 'backend_language',
        value: tech,
        type: 'technology_choice'
      }
    );
    console.log(`  ✅ Created ${decision.id}: "${decision.statement}" [${tech}]`);
    
    return {
      session: 1,
      output: session1Result.output,
      decision: decision,
      result: session1Result,
      structuredData: structuredData
    };
  }
  
  async runSession2PcsOn(runtime, model, decision, date, runNumber) {
    console.log(`\n[Session 2 PCS-ON: Attempt Contradiction] ${model}/run-${String(runNumber).padStart(4, '0')}`);
    
    const provider = this.getProvider(model);
    
    // Use contradictory technology (structural)
    const decidedTech = decision.metadata.value;
    const contradictoryTech = decidedTech === 'java' ? 'python' : 'java';
    const prompt = `Can we use ${contradictoryTech} for our backend services?

Please provide:

1. **Remediation Plan** (free text):
   - Your answer and reasoning
   - Any concerns or considerations

2. **Decision Commitment** (strict JSON):
   You MUST include this exact format:

\`\`\`json
{
  "backend_language": "${contradictoryTech}",
  "decision_type": "technology_choice",
  "rationale_summary": "brief reason"
}
\`\`\`

CRITICAL: The commitment block is required and will be enforced.`;
    
    const modelFn = async (prompt) => {
      const response = await provider.invoke(prompt, null, {
        temperature: 0.7,
        topP: 1.0
      });
      return response.output;
    };
    
    // Runtime handles enforcement
    const session2Result = await runtime.execute(modelFn, prompt);
    
    console.log(`  Blocked: ${!session2Result.allowed}`);
    console.log(`  Trace: ${session2Result.trace ? 'YES' : 'NO'}`);
    
    return {
      session: 2,
      condition: 'pcs-on',
      output: session2Result.output,
      enforcement_trace: session2Result.trace,
      contradiction_detected: session2Result.trace?.violation_detected || false,
      blocked: !session2Result.allowed,
      result: session2Result
    };
  }
  
  async runSession2PcsOff(runtime, model, decision, date, runNumber) {
    console.log(`\n[Session 2 PCS-OFF: Attempt Contradiction] ${model}/run-${String(runNumber).padStart(4, '0')}`);
    
    const provider = this.getProvider(model);
    
    const decidedTech = decision.metadata.value;
    const contradictoryTech = decidedTech === 'java' ? 'python' : 'java';
    const prompt = `Can we use ${contradictoryTech} for our backend services?

Please provide:

1. **Remediation Plan** (free text):
   - Your answer and reasoning
   - Any concerns or considerations

2. **Decision Commitment** (strict JSON):
   You MUST include this exact format:

\`\`\`json
{
  "backend_language": "${contradictoryTech}",
  "decision_type": "technology_choice",
  "rationale_summary": "brief reason"
}
\`\`\`

CRITICAL: The commitment block is required and will be enforced.`;
    
    const modelFn = async (prompt) => {
      const response = await provider.invoke(prompt, null, {
        temperature: 0.7,
        topP: 1.0
      });
      return response.output;
    };
    
    // Runtime with PEP disabled (no enforcement)
    const session2Result = await runtime.execute(modelFn, prompt);
    
    console.log(`  ⚠️  No enforcement - contradiction may propagate`);
    
    return {
      session: 2,
      condition: 'pcs-off',
      output: session2Result.output,
      enforcement_trace: null,
      contradiction_detected: false,
      blocked: false,
      result: session2Result
    };
  }
  
  
  async executeFullRun(model, condition, date, runNumber) {
    try {
      console.log(`\n[${model}/${condition}/run-${String(runNumber).padStart(4, '0')}] Starting...`);
      
      // Create runtime with PEP enabled/disabled
      const runtime = new PCSRuntime({
        storePath: path.join(__dirname, 'pcs-data', `${model}-${condition}-${runNumber}.json`),
        pepEnabled: condition === 'pcs-on'
      });
      
      runtime.clearAll(); // Start fresh
      
      // Session 1: Establish decision
      const session1 = await this.runSession1(runtime, model, date, runNumber);
      
      // Session 2: Attempt contradiction
      let session2;
      if (condition === 'pcs-on') {
        session2 = await this.runSession2PcsOn(runtime, model, session1.decision, date, runNumber);
      } else {
        session2 = await this.runSession2PcsOff(runtime, model, session1.decision, date, runNumber);
      }
      
      // Verify assertions
      const assertions = this.verifyAssertions(session2, condition);
      
      console.log(`  Assertions: A1=${assertions.A1} A2=${assertions.A2} A3=${assertions.A3}`);
      
      // Write artifacts
      const runPath = config.getRunPath(date, model, condition, runNumber);
      this.writeArtifacts(runPath, session1, session2, assertions);
      
      console.log(`  ✅ Artifacts written to ${runPath}`);
      
      return {
        model,
        condition,
        runNumber,
        assertions,
        session1,
        session2
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
  
  verifyAssertions(session2, condition) {
    if (condition === 'pcs-on') {
      // A1: Decision Consistency Detection
      const a1 = session2.blocked && 
                 session2.result?.trace?.violation_detected === true ? 'PASS' : 'FAIL';
      
      // A2: Enforcement Trace Generated
      const a2 = session2.result?.trace &&
                 session2.result.trace.action === 'blocked' ? 'PASS' : 'FAIL';
      
      // A3: Not applicable for PCS-ON
      const a3 = 'N/A';
      
      return { A1: a1, A2: a2, A3: a3 };
      
    } else {
      // PCS-OFF
      // A1, A2: Not applicable
      const a1 = 'N/A';
      const a2 = 'N/A';
      
      // A3: Contradiction Propagation (no enforcement)
      const a3 = session2.result?.allowed && 
                 !session2.result?.trace ? 'PASS' : 'FAIL';
      
      return { A1: a1, A2: a2, A3: a3 };
    }
  }
  
  writeArtifacts(runPath, session1, session2, assertions) {
    const fs = require('fs');
    
    paths.ensureDir(runPath);
    paths.ensureDir(path.join(runPath, 'outputs'));
    
    // Write session 1 output
    fs.writeFileSync(
      path.join(runPath, 'outputs', 'session1_output.txt'),
      session1.output
    );
    
    // Write session 2 output
    fs.writeFileSync(
      path.join(runPath, 'outputs', 'session2_output.txt'),
      session2.output
    );
    
    // NEW: Enhanced enforcement evidence artifacts
    
    // 1. Raw model output (exactly what model produced)
    if (session2.result && session2.result.modelOutput) {
      fs.writeFileSync(
        path.join(runPath, 'outputs', 'session2_raw_model_output.txt'),
        session2.result.modelOutput
      );
    }
    
    // 2. Extracted commitment (what was parsed)
    const extraction = this.extractStructuredData(session2.output);
    paths.writeJson(
      path.join(runPath, 'outputs', 'session2_extracted_commitment.json'),
      extraction
    );
    
    // 3. Decision record (with metadata)
    paths.writeJson(
      path.join(runPath, 'outputs', 'decision_record.json'),
      session1.decision
    );
    
    // 4. Enforcement trace (policy check result)
    paths.writeJson(
      path.join(runPath, 'outputs', 'enforcement_trace.json'),
      session2.result?.trace || { pep_status: 'disabled' }
    );
    
    // 5. Final user output (what user sees)
    fs.writeFileSync(
      path.join(runPath, 'outputs', 'final_user_output.txt'),
      session2.result?.output || session2.output
    );
    
    // Legacy enforcement trace (for backward compatibility)
    if (session2.enforcement_trace) {
      paths.writeJson(
        path.join(runPath, 'outputs', 'enforcement_trace_legacy.json'),
        session2.enforcement_trace
      );
    }
    
    // Write decision lineage (if exists)
    if (session2.decision_lineage) {
      paths.writeJson(
        path.join(runPath, 'outputs', 'decision_lineage.json'),
        session2.decision_lineage
      );
    }
    
    // Write run.json
    const runJson = {
      case_id: 'AVS-2C-DECISION-CONSISTENCY',
      date: session2.date || new Date().toISOString().split('T')[0],
      model: {
        provider: this.getProviderName(session2.model || 'claude-sonnet-4-6'),
        name: session2.model || 'claude-sonnet-4-6'
      },
      condition: session2.condition,
      run_number: session2.runNumber || 1,
      parameters: {
        temperature: 0.7,
        top_p: 1.0
      },
      assertions
    };
    
    paths.writeJson(path.join(runPath, 'run.json'), runJson);
  }
  
  extractStructuredData(output) {
    // Hardened extraction matching runtime logic
    const jsonBlocks = output.match(/```json\s*\n([\s\S]*?)\n```/g);
    
    if (!jsonBlocks || jsonBlocks.length === 0) {
      return {
        valid: false,
        reason: 'No JSON code block found',
        data: null
      };
    }
    
    if (jsonBlocks.length > 1) {
      return {
        valid: false,
        reason: `Multiple JSON blocks detected (${jsonBlocks.length} blocks)`,
        data: null
      };
    }
    
    const content = jsonBlocks[0].match(/```json\s*\n([\s\S]*?)\n```/)[1];
    
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      return {
        valid: false,
        reason: `Malformed JSON: ${error.message}`,
        data: null
      };
    }
    
    if (!parsed.backend_language) {
      return {
        valid: false,
        reason: 'Missing required field: backend_language',
        data: parsed
      };
    }
    
    return {
      valid: true,
      reason: 'Valid commitment block',
      data: parsed
    };
  }
  
  getProvider(model) {
    if (model.includes('claude')) {
      return this.anthropic;
    } else if (model.includes('llama') || model.includes('gpt')) {
      return this.openai;
    }
    throw new Error(`Unknown model: ${model}`);
  }
  
  getProviderName(model) {
    if (model.includes('claude')) return 'anthropic';
    if (model.includes('llama')) return 'groq';
    return 'unknown';
  }
  
  async runValidation(date) {
    console.log('\n=== AVS-2C: Decision Consistency Gate ===\n');
    
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
    
    console.log('\n✅ AVS-2C validation complete.\n');
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const dateArg = args.find(a => a.startsWith('--date'));
  
  const date = dateArg ? dateArg.split('=')[1] : new Date().toISOString().split('T')[0];
  
  const harness = new AVS2CHarness();
  const results = await harness.runValidation(date);
  harness.printSummary(results);
  
  // Write summary.json
  const summaryPath = path.join(config.runsDir, date, 'avs-2c-summary.json');
  paths.ensureDir(path.dirname(summaryPath));
  paths.writeJson(summaryPath, {
    case_id: 'AVS-2C-DECISION-CONSISTENCY',
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

module.exports = AVS2CHarness;
