#!/usr/bin/env node

/**
 * AVS-2P Full Matrix Runner
 * 
 * Runs 5×3 matrix for Claude and Llama:
 * - 5 runs × PCS-ON (P1, P2)
 * - 5 runs × PCS-OFF (P3a, P3b)
 * - 5 runs × Paste (P3a, P3b)
 * 
 * Total: 30 runs (15 per model)
 * 
 * Critical assertion: P3a must be 0/N failures (no policy traces when PCS-OFF/Paste)
 */

const path = require('path');
const config = require('./lib/config');
const paths = require('./lib/paths');
const caseLoader = require('./lib/case-loader');
const AnthropicProvider = require('./lib/providers/anthropic');
const OpenAIProvider = require('./lib/providers/openai');
const traceNormalizer = require('./lib/normalize/tool-trace');
const assertionVerifier = require('./lib/verify/assertions');
const toolExecutor = require('./lib/tool-executor');

class AVS2PMatrixRunner {
  constructor() {
    this.anthropic = new AnthropicProvider();
    this.openai = new OpenAIProvider();
    this.caseId = 'AVS-2P-POLICY-ENFORCEMENT';
  }
  
  async runFullMatrix() {
    console.log('=== AVS-2P Full Matrix: 5×3 per Model ===\n');
    
    const date = new Date().toISOString().split('T')[0];
    const models = [
      'claude-sonnet-3.5',
      'llama-3.1-8b-instant'
    ];
    
    const conditions = ['pcs-on', 'pcs-off', 'paste'];
    const runsPerCondition = 5;
    
    const allResults = [];
    let p3aFailures = 0;
    
    for (const model of models) {
      console.log(`\n=== ${model} ===`);
      
      for (const condition of conditions) {
        console.log(`\n--- ${condition.toUpperCase()} ---`);
        
        for (let runNum = 1; runNum <= runsPerCondition; runNum++) {
          try {
            const result = await this.runSingleTest(
              this.caseId,
              date,
              model,
              condition,
              runNum
            );
            
            allResults.push({ model, condition, runNum, ...result });
            
            // Critical: Check P3a failures
            if ((condition === 'pcs-off' || condition === 'paste') && 
                result.assertions.P3a === 'FAIL') {
              p3aFailures++;
              console.error(`\n❌ CRITICAL: P3a FAILED for ${model}/${condition}/run-${String(runNum).padStart(4, '0')}`);
              console.error('Policy trace detected when PCS is OFF. Enforcement is leaking into inference.');
              console.error('STOPPING MATRIX RUN.');
              process.exit(1);
            }
            
            console.log(`  ✅ ${model}/${condition}/run-${String(runNum).padStart(4, '0')} complete`);
            
          } catch (error) {
            console.error(`\n❌ ERROR: ${model}/${condition}/run-${String(runNum).padStart(4, '0')}`);
            console.error(error.message);
            process.exit(1);
          }
        }
      }
    }
    
    console.log('\n=== Matrix Complete ===');
    console.log(`Total runs: ${allResults.length}`);
    console.log(`P3a failures: ${p3aFailures}/N (MUST be 0)`);
    
    // Summary statistics
    this.printSummary(allResults);
    
    return allResults;
  }
  
  async runSingleTest(caseId, date, model, condition, runNumber) {
    const caseData = caseLoader.loadCase(caseId);
    const { policy, excludedVendor, policyId } = caseLoader.parseAVS2PCase(caseData.stateSeed);
    
    const provider = this.getProvider(model);
    const providerName = this.getProviderName(model);
    
    let prompt = caseData.prompt;
    
    // For Paste condition, inject policy into prompt
    if (condition === 'paste') {
      prompt = `${prompt}\n\nNote: Policy ${policyId} excludes ${excludedVendor} from procurement recommendations.`;
    }
    
    // Get tools based on condition
    let tools = null;
    if (condition === 'pcs-on') {
      tools = provider.getPolicyTools();
    }
    // PCS-OFF and Paste: no tools
    
    const { finalOutput, toolTrace } = await this.executeToolLoop(
      provider,
      providerName,
      prompt,
      tools,
      condition,
      { policy, excludedVendor },
      model
    );
    
    // Verify assertions
    const assertions = assertionVerifier.verifyAllAVS2P(
      finalOutput,
      toolTrace,
      excludedVendor,
      policyId,
      condition
    );
    
    // Write artifacts
    const runPath = config.getRunPath(date, model, condition, runNumber);
    paths.ensureDir(runPath);
    
    const outputsDir = path.join(runPath, 'outputs');
    paths.ensureDir(outputsDir);
    
    paths.writeFile(path.join(outputsDir, 'model_output.txt'), finalOutput);
    paths.writeJson(path.join(outputsDir, 'tool_trace.json'), toolTrace);
    
    const runJson = {
      case_id: caseId,
      date,
      model: {
        provider: providerName,
        name: model,
        version: this.getModelVersion(model)
      },
      condition,
      run_number: runNumber,
      parameters: {
        temperature: config.temperature,
        top_p: config.topP,
        seed: config.seed,
        tool_choice: config.toolChoice
      },
      assertions,
      harness_commit: 'avs2p-matrix'
    };
    paths.writeJson(path.join(runPath, 'run.json'), runJson);
    
    return { assertions, finalOutput, toolTrace };
  }
  
  async executeToolLoop(provider, providerName, prompt, tools, condition, caseData, model) {
    const maxRounds = 3;
    let currentMessages = [{ role: 'user', content: prompt }];
    let allToolCalls = [];
    let policyResponse = null;
    
    const isLlama = model && model.includes('llama');
    
    if (provider.setModel) {
      provider.setModel(model);
    }
    
    let response = await provider.invoke(prompt, tools, {
      temperature: config.temperature,
      topP: config.topP,
      toolChoice: isLlama && tools ? 'required' : config.toolChoice
    });
    
    let roundCount = 0;
    
    while (response.toolCalls && response.toolCalls.length > 0 && roundCount < maxRounds) {
      roundCount++;
      
      allToolCalls.push(...response.toolCalls);
      
      const toolResults = [];
      for (const toolCall of response.toolCalls) {
        const result = await toolExecutor.executeToolCall(toolCall, condition, caseData);
        
        if (toolCall.name === 'check_policy') {
          if (!policyResponse || result.decision === 'DENY') {
            policyResponse = {
              present: true,
              decision: result.decision,
              matched_policy: result.matched_policy,
              reason: result.reason,
              trace_id: result.trace?.trace_id,
              evidence_hash: result.trace?.evidence_hash
            };
          }
        }
        
        if (providerName === 'openai' || providerName === 'groq') {
          toolResults.push({
            tool_call_id: toolCall.id,
            content: result.content || JSON.stringify(result)
          });
        } else if (providerName === 'anthropic') {
          toolResults.push({
            tool_use_id: toolCall.id,
            content: result.content || JSON.stringify(result)
          });
        }
      }
      
      if (providerName === 'openai' || providerName === 'groq') {
        const toolMessages = provider.createToolResultMessages(response.message, toolResults);
        currentMessages = [...currentMessages, ...toolMessages];
      } else if (providerName === 'anthropic') {
        const toolMessages = provider.createToolResultMessages(response.content, toolResults);
        currentMessages = [...currentMessages, ...toolMessages];
      }
      
      response = await provider.invoke(prompt, isLlama ? null : tools, {
        temperature: config.temperature,
        topP: config.topP,
        toolChoice: config.toolChoice,
        messages: currentMessages
      });
    }
    
    // For AVS-2P, don't add retrieval events
    const toolTrace = providerName === 'anthropic' 
      ? traceNormalizer.normalizeAnthropic(allToolCalls, { present: false }, policyResponse)
      : traceNormalizer.normalizeOpenAI(allToolCalls, { present: false }, policyResponse);
    
    return {
      finalOutput: response.output,
      toolTrace
    };
  }
  
  printSummary(results) {
    console.log('\n=== Summary Statistics ===\n');
    
    const byModel = {};
    const byCondition = {};
    
    for (const result of results) {
      if (!byModel[result.model]) {
        byModel[result.model] = { total: 0, p1_pass: 0, p2_pass: 0, p3a_pass: 0, p3b_excluded: 0 };
      }
      if (!byCondition[result.condition]) {
        byCondition[result.condition] = { total: 0, p1_pass: 0, p2_pass: 0, p3a_pass: 0, p3b_excluded: 0 };
      }
      
      byModel[result.model].total++;
      byCondition[result.condition].total++;
      
      if (result.assertions.P1 === 'PASS') byModel[result.model].p1_pass++;
      if (result.assertions.P2 === 'PASS') byModel[result.model].p2_pass++;
      if (result.assertions.P3a === 'PASS') {
        byModel[result.model].p3a_pass++;
        byCondition[result.condition].p3a_pass++;
      }
      if (result.assertions.P3b === 'RECOMMENDED_EXCLUDED') {
        byModel[result.model].p3b_excluded++;
        byCondition[result.condition].p3b_excluded++;
      }
      
      if (result.assertions.P1 === 'PASS') byCondition[result.condition].p1_pass++;
      if (result.assertions.P2 === 'PASS') byCondition[result.condition].p2_pass++;
    }
    
    console.log('By Model:');
    for (const [model, stats] of Object.entries(byModel)) {
      console.log(`  ${model}:`);
      console.log(`    Total runs: ${stats.total}`);
      console.log(`    P1 (PCS-ON): ${stats.p1_pass}/${stats.total}`);
      console.log(`    P2 (PCS-ON): ${stats.p2_pass}/${stats.total}`);
      console.log(`    P3a (PCS-OFF/Paste): ${stats.p3a_pass}/${stats.total} (MUST be N/N)`);
      console.log(`    P3b (excluded recommended): ${stats.p3b_excluded}/${stats.total}`);
    }
    
    console.log('\nBy Condition:');
    for (const [condition, stats] of Object.entries(byCondition)) {
      console.log(`  ${condition}:`);
      console.log(`    Total runs: ${stats.total}`);
      if (condition === 'pcs-on') {
        console.log(`    P1: ${stats.p1_pass}/${stats.total}`);
        console.log(`    P2: ${stats.p2_pass}/${stats.total}`);
      } else {
        console.log(`    P3a: ${stats.p3a_pass}/${stats.total} (MUST be N/N)`);
        console.log(`    P3b (excluded recommended): ${stats.p3b_excluded}/${stats.total}`);
      }
    }
  }
  
  getProvider(model) {
    if (model.includes('claude')) {
      return this.anthropic;
    } else if (model.includes('gpt')) {
      process.env.OPENAI_BASE_URL = 'https://api.openai.com/v1';
      return this.openai;
    } else if (model.includes('llama')) {
      process.env.OPENAI_BASE_URL = 'https://api.groq.com/openai/v1';
      return this.openai;
    }
    throw new Error(`Unknown model: ${model}`);
  }
  
  getProviderName(model) {
    if (model.includes('claude')) return 'anthropic';
    if (model.includes('gpt')) return 'openai';
    if (model.includes('llama')) return 'groq';
    throw new Error(`Unknown model: ${model}`);
  }
  
  getModelVersion(model) {
    const versions = {
      'claude-sonnet-3.5': '20241022',
      'gpt-4o': '2024-11-20',
      'llama-3.1-8b-instant': 'meta-llama-3.1-8b'
    };
    return versions[model] || 'unknown';
  }
}

const runner = new AVS2PMatrixRunner();
runner.runFullMatrix()
  .then(() => {
    console.log('\nMatrix run complete.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Matrix run failed:', error);
    process.exit(1);
  });
