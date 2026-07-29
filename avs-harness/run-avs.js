#!/usr/bin/env node

const path = require('path');
const config = require('./lib/config');
const paths = require('./lib/paths');
const caseLoader = require('./lib/case-loader');
const AnthropicProvider = require('./lib/providers/anthropic');
const OpenAIProvider = require('./lib/providers/openai');
const traceNormalizer = require('./lib/normalize/tool-trace');
const schemaValidator = require('./lib/verify/schema');
const assertionVerifier = require('./lib/verify/assertions');
const artifactWriter = require('./lib/write/artifacts');
const toolExecutor = require('./lib/tool-executor');

class AVSHarness {
  constructor() {
    this.anthropic = new AnthropicProvider();
    this.openai = new OpenAIProvider();
  }
  
  async executeRun(caseId, date, model, condition, runNumber) {
    console.log(`\n[${model}/${condition}/run-${String(runNumber).padStart(4, '0')}] Starting...`);
    
    // Load case
    const caseData = caseLoader.loadCase(caseId);
    const { nonce, contentSubstring } = caseLoader.parseExpectedAssertions(caseData.expectedAssertions);
    
    // Get provider
    const provider = this.getProvider(model);
    const providerName = this.getProviderName(model);
    
    // Set model name on provider (for Groq/Llama compatibility)
    if (provider.setModel) {
      provider.setModel(model);
    }
    
    // Prepare prompt based on condition
    let prompt = caseData.prompt;
    let tools = null;
    let pcsResponse = null;
    
    const pcsConfig = {
      enabled: false,
      stateHash: null
    };
    
    const pasteConfig = {
      enabled: false,
      contentInjected: false
    };
    
    if (condition === 'pcs-on') {
      // PCS-ON: Enable tools, seed PCS, expect retrieval
      tools = provider.getPcsTools();
      pcsConfig.enabled = true;
      pcsConfig.stateHash = 'sha256:1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890';
      
    } else if (condition === 'pcs-off') {
      // PCS-OFF: No tools, no PCS
      tools = null;
      pcsConfig.enabled = false;
      
    } else if (condition === 'paste') {
      // Paste-Context: Inject decision content into prompt, no tools
      tools = null;
      pasteConfig.enabled = true;
      pasteConfig.contentInjected = true;
      
      // Inject decision content per PASTE_CONTEXT_PROTOCOL.md
      const decisionContent = `
Prior Decision Record:
DR-014 (Nonce: ${nonce})
The budget has been approved for Q1 2026 marketing campaign with a focus on Java-based integration layer development.
`;
      prompt = decisionContent + '\n\n' + prompt;
    }
    
    // Execute multi-turn tool loop
    console.log(`  Invoking ${model}...`);
    const { finalOutput, toolTrace } = await this.executeToolLoop(
      provider,
      providerName,
      prompt,
      tools,
      condition,
      { nonce, contentSubstring },
      model
    );
    
    const response = { output: finalOutput };
    
    // Validate schema
    const schemaValidation = schemaValidator.validateToolTrace(toolTrace);
    if (!schemaValidation.valid) {
      console.error(`  ❌ Schema validation failed:`, schemaValidation.errors);
    } else {
      console.log(`  ✅ Schema validation passed`);
    }
    
    // Verify assertions
    const assertions = assertionVerifier.verifyAll(
      response.output,
      toolTrace,
      nonce,
      contentSubstring
    );
    
    console.log(`  Assertions: A1=${assertions.A1} A2=${assertions.A2} A3=${assertions.A3}`);
    
    // Create run.json
    const runJson = artifactWriter.createRunJson(
      caseId,
      date,
      {
        provider: providerName,
        name: model,
        version: this.getModelVersion(model)
      },
      condition,
      {
        temperature: config.temperature,
        topP: config.topP,
        seed: config.seed,
        toolChoice: config.toolChoice
      },
      pcsConfig,
      pasteConfig,
      assertions
    );
    
    // Write artifacts
    const runPath = config.getRunPath(date, model, condition, runNumber);
    artifactWriter.writeRunArtifacts(runPath, {
      modelOutput: response.output,
      toolTrace,
      runJson
    });
    
    console.log(`  ✅ Artifacts written to ${runPath}`);
    
    return {
      model,
      condition,
      runNumber,
      assertions,
      schemaValid: schemaValidation.valid
    };
  }
  
  async executeToolLoop(provider, providerName, prompt, tools, condition, caseData, model) {
    const maxRounds = 3;
    let currentMessages = [{ role: 'user', content: prompt }];
    let allToolCalls = [];
    let pcsResponse = null;
    let policyResponse = null;
    
    // Detect if this is a Llama model (needs special handling)
    const isLlama = model && model.includes('llama');
    
    // Turn 1: Initial invocation
    // For Llama: force tool_choice="required" to ensure tool is called
    let response = await provider.invoke(prompt, tools, {
      temperature: config.temperature,
      topP: config.topP,
      toolChoice: isLlama ? 'required' : config.toolChoice
    });
    
    let roundCount = 0;
    
    // Tool loop: continue while model returns tool calls
    while (response.toolCalls && response.toolCalls.length > 0 && roundCount < maxRounds) {
      roundCount++;
      console.log(`  Tool round ${roundCount}: ${response.toolCalls.length} tool call(s)`);
      
      // Track all tool calls for trace
      allToolCalls.push(...response.toolCalls);
      
      // Execute each tool call
      const toolResults = [];
      for (const toolCall of response.toolCalls) {
        try {
          const result = await toolExecutor.executeToolCall(toolCall, condition, caseData);
          
          // Store PCS response for trace normalization
          if (toolCall.name === 'retrieve_decision' || (toolCall.input && toolCall.input.query)) {
            pcsResponse = {
              present: true,
              query: toolCall.input?.query || toolCall.arguments?.query || 'decision query',
              nonce: result.nonce,
              decision_id: result.decision_id,
              content: result.content
            };
          }
          
          // Store policy check response for trace normalization
          if (toolCall.name === 'check_policy') {
            policyResponse = {
              present: true,
              decision: result.decision,
              matched_policy: result.matched_policy,
              reason: result.reason,
              trace_id: result.trace?.trace_id,
              evidence_hash: result.trace?.evidence_hash
            };
          }
          
          // Format tool result for provider
          // Send the content field as the tool result (not the entire object)
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
        } catch (error) {
          console.error(`  ❌ Tool execution error: ${error.message}`);
          throw error;
        }
      }
      
      // Build messages for turn 2
      if (providerName === 'openai' || providerName === 'groq') {
        const toolMessages = provider.createToolResultMessages(response.message, toolResults);
        currentMessages = [
          ...currentMessages,
          ...toolMessages
        ];
      } else if (providerName === 'anthropic') {
        const toolMessages = provider.createToolResultMessages(response.content, toolResults);
        currentMessages = [
          ...currentMessages,
          ...toolMessages
        ];
      }
      
      // Turn 2+: Invoke with tool results
      // For Llama: remove tools entirely to force completion (Strategy A)
      response = await provider.invoke(prompt, isLlama ? null : tools, {
        temperature: config.temperature,
        topP: config.topP,
        toolChoice: config.toolChoice,
        messages: currentMessages
      });
    }
    
    // Normalize tool trace
    const toolTrace = providerName === 'anthropic' 
      ? traceNormalizer.normalizeAnthropic(allToolCalls, pcsResponse, policyResponse)
      : traceNormalizer.normalizeOpenAI(allToolCalls, pcsResponse, policyResponse);
    
    return {
      finalOutput: response.output,
      toolTrace
    };
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
    if (model.includes('claude')) {
      return 'anthropic';
    } else if (model.includes('gpt') || model.includes('llama')) {
      return 'openai';
    }
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
  
  async runMatrix(date) {
    console.log('\n=== AVS Phase 2A: First 6 Runs ===\n');
    
    const runs = [
      // Claude Sonnet 4.6
      { model: 'claude-sonnet-4-6', condition: 'pcs-on', count: 5 },
      { model: 'claude-sonnet-4-6', condition: 'pcs-off', count: 5 },
      { model: 'claude-sonnet-4-6', condition: 'paste', count: 5 },
      
      // GPT-4
      { model: 'gpt-4', condition: 'pcs-on', count: 5 },
      { model: 'gpt-4', condition: 'pcs-off', count: 5 },
      { model: 'gpt-4', condition: 'paste', count: 5 },
      
      // Llama 3.1 8B
      { model: 'llama-3.1-8b-instant', condition: 'pcs-on', count: 5 },
      { model: 'llama-3.1-8b-instant', condition: 'pcs-off', count: 5 },
      { model: 'llama-3.1-8b-instant', condition: 'paste', count: 5 }
    ];
    
    const results = [];
    for (const run of runs) {
      try {
        for (let i = 1; i <= run.count; i++) {
          const result = await this.executeRun(
            'AVS-1R-DECISION-RETRIEVAL',
            date,
            run.model,
            run.condition,
            i
          );
          results.push(result);
        }
        const result = await this.executeRun(
          'AVS-1R-DECISION-RETRIEVAL',
          date,
          run.model,
          run.condition,
          run.runNumber
        );
        results.push(result);
      } catch (error) {
        console.error(`\n❌ Error executing ${run.model}/${run.condition}:`, error.message);
        results.push({
          model: run.model,
          condition: run.condition,
          runNumber: run.runNumber,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  async runPhase2(date) {
    console.log('\n=== AVS Phase 2: Full 45 Runs ===\n');
    
    const results = [];
    
    // Claude Sonnet 4.6: PCS-ON first (validate roof works under repetition)
    console.log('\n--- Claude Sonnet 4.6: PCS-ON (5 runs) ---\n');
    for (let i = 1; i <= 5; i++) {
      const result = await this.executeRunWithStopCondition(
        'AVS-1R-DECISION-RETRIEVAL', date, 'claude-sonnet-4-6', 'pcs-on', i
      );
      results.push(result);
      if (result.error || result.assertions.A3 === 'FAIL') {
        console.log(`\n⚠️  Stopping PCS-ON runs after failure at run ${i}`);
        break;
      }
    }
    
    console.log('\n--- Claude Sonnet 4.6: PCS-OFF (5 runs) ---\n');
    for (let i = 1; i <= 5; i++) {
      const result = await this.executeRunWithStopCondition(
        'AVS-1R-DECISION-RETRIEVAL', date, 'claude-sonnet-4-6', 'pcs-off', i
      );
      results.push(result);
    }
    
    console.log('\n--- Claude Sonnet 4.6: Paste (5 runs) ---\n');
    for (let i = 1; i <= 5; i++) {
      const result = await this.executeRunWithStopCondition(
        'AVS-1R-DECISION-RETRIEVAL', date, 'claude-sonnet-4-6', 'paste', i
      );
      results.push(result);
    }
    
    // GPT-4: PCS-ON
    console.log('\n--- GPT-4: PCS-ON (5 runs) ---\n');
    for (let i = 1; i <= 5; i++) {
      const result = await this.executeRunWithStopCondition(
        'AVS-1R-DECISION-RETRIEVAL', date, 'gpt-4', 'pcs-on', i
      );
      results.push(result);
      if (result.error || result.assertions.A3 === 'FAIL') {
        console.log(`\n⚠️  Stopping PCS-ON runs after failure at run ${i}`);
        break;
      }
    }
    
    console.log('\n--- GPT-4: PCS-OFF (5 runs) ---\n');
    for (let i = 1; i <= 5; i++) {
      const result = await this.executeRunWithStopCondition(
        'AVS-1R-DECISION-RETRIEVAL', date, 'gpt-4', 'pcs-off', i
      );
      results.push(result);
    }
    
    console.log('\n--- GPT-4: Paste (5 runs) ---\n');
    for (let i = 1; i <= 5; i++) {
      const result = await this.executeRunWithStopCondition(
        'AVS-1R-DECISION-RETRIEVAL', date, 'gpt-4', 'paste', i
      );
      results.push(result);
    }
    
    // Llama 3.1 8B: PCS-ON
    console.log('\n--- Llama 3.1 8B: PCS-ON (5 runs) ---\n');
    for (let i = 1; i <= 5; i++) {
      const result = await this.executeRunWithStopCondition(
        'AVS-1R-DECISION-RETRIEVAL', date, 'llama-3.1-8b-instant', 'pcs-on', i
      );
      results.push(result);
      if (result.error || result.assertions.A3 === 'FAIL') {
        console.log(`\n⚠️  Stopping PCS-ON runs after failure at run ${i}`);
        break;
      }
    }
    
    console.log('\n--- Llama 3.1 8B: PCS-OFF (5 runs) ---\n');
    for (let i = 1; i <= 5; i++) {
      const result = await this.executeRunWithStopCondition(
        'AVS-1R-DECISION-RETRIEVAL', date, 'llama-3.1-8b-instant', 'pcs-off', i
      );
      results.push(result);
    }
    
    console.log('\n--- Llama 3.1 8B: Paste (5 runs) ---\n');
    for (let i = 1; i <= 5; i++) {
      const result = await this.executeRunWithStopCondition(
        'AVS-1R-DECISION-RETRIEVAL', date, 'llama-3.1-8b-instant', 'paste', i
      );
      results.push(result);
    }
    
    return results;
  }
  
  async executeRunWithStopCondition(caseId, date, model, condition, runNumber) {
    try {
      const result = await this.executeRun(caseId, date, model, condition, runNumber);
      return result;
    } catch (error) {
      console.error(`\n❌ Error executing ${model}/${condition}/run-${runNumber}:`, error.message);
      return {
        model,
        condition,
        runNumber,
        error: error.message,
        assertions: { A1: 'ERROR', A2: 'ERROR', A3: 'ERROR' }
      };
    }
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
      'pcs-on': { total: 0, A1_pass: 0, A2_pass: 0, A3_pass: 0 },
      'pcs-off': { total: 0, A1_pass: 0, A2_pass: 0, A3_pass: 0 },
      'paste': { total: 0, A1_pass: 0, A2_pass: 0, A3_pass: 0 }
    };
    
    for (const result of results) {
      if (result.error) {
        summary.errors++;
        continue;
      }
      
      const condition = result.condition;
      byCondition[condition].total++;
      
      if (result.assertions.A1 === 'PASS') byCondition[condition].A1_pass++;
      if (result.assertions.A2 === 'PASS') byCondition[condition].A2_pass++;
      if (result.assertions.A3 === 'PASS') byCondition[condition].A3_pass++;
      
      const allPass = result.assertions.A1 === 'PASS' && 
                     result.assertions.A2 === 'PASS' && 
                     result.assertions.A3 === 'PASS';
      
      if (allPass) {
        summary.passed++;
      } else {
        summary.failed++;
      }
    }
    
    console.log(`Total runs: ${summary.total}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Errors: ${summary.errors}`);
    console.log('');
    
    console.log('By Condition:');
    for (const [condition, stats] of Object.entries(byCondition)) {
      console.log(`  ${condition}:`);
      console.log(`    Total: ${stats.total}`);
      console.log(`    A1 Pass Rate: ${stats.A1_pass}/${stats.total}`);
      console.log(`    A2 Pass Rate: ${stats.A2_pass}/${stats.total}`);
      console.log(`    A3 Pass Rate: ${stats.A3_pass}/${stats.total}`);
    }
    
    console.log('\n✅ Phase complete. Review outputs for manual sanity check.');
    console.log('   Recommended: Open one PCS-ON model_output.txt and confirm nonce citation.\n');
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const phaseArg = args.find(a => a.startsWith('--phase'));
  const dateArg = args.find(a => a.startsWith('--date'));
  
  const phase = phaseArg ? phaseArg.split('=')[1] : '2a';
  const date = dateArg ? dateArg.split('=')[1] : '2026-02-17';
  
  const harness = new AVSHarness();
  
  let results;
  if (phase === '2a') {
    results = await harness.runPhase2A(date);
  } else if (phase === '2') {
    results = await harness.runPhase2(date);
  } else {
    console.error('Unknown phase. Use --phase=2a or --phase=2');
    process.exit(1);
  }
  
  harness.printSummary(results);
  
  // Write summary.json
  const summaryPath = path.join(config.runsDir, date, 'summary.json');
  paths.ensureDir(path.dirname(summaryPath));
  paths.writeJson(summaryPath, {
    phase,
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

module.exports = AVSHarness;
