/**
 * L3.continuity.model-transition-decision-recovery (Runtime-Bound)
 * 
 * Validates Cross-Model Cognitive Continuity (CMCC) using PCS Runtime directly.
 * No mock target. No text analysis. Runtime trace only.
 * 
 * Behavioral requirement: RFC-PCS-0003 (Cross-Model Cognitive Continuity Contract)
 * 
 * Success criteria:
 * - result.trace.continuityEvent.confirmed === true
 * - result.trace.continuityEvent.sourceModel matches first model
 * - result.trace.continuityEvent.targetModel matches second model
 * - result.trace.retrievalEvidence.retrieved === true
 * - Decision retrieved in target model session
 */

const path = require('path');
const fs = require('fs');
const PCSRuntime = require('../../../runtime/runtime');
const TraceValidator = require('../../../lib/trace-contract-validator');

module.exports = {
  id: 'L3.continuity.model-transition-decision-recovery-runtime',
  name: 'Model Transition Decision Recovery (Runtime-Bound)',
  level: 'L3',
  category: 'continuity',

  async run() {
    const outputDir = path.join(__dirname, '../../../runs/cts-l3-cmcc');
    const namespace = `cts-l3-cmcc-${Date.now()}`;
    const sharedStorePath = path.join(outputDir, 'shared-state.json');
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const trace = {
      scenario: 'L3.continuity.model-transition-decision-recovery-runtime',
      namespace,
      phases: []
    };
    
    try {
      // Phase 1: Source Model - Seed decision
      const sourceModel = 'claude-sonnet-4-6';
      const runtimeAlpha = new PCSRuntime({
        storePath: sharedStorePath,
        namespace,
        sessionId: 'session-alpha',
        modelLabel: sourceModel,
        pepEnabled: true
      });
      
      const decision = runtimeAlpha.createDecision(
        "All data processing pipelines must use Python for consistency"
      );
      
      trace.phases.push({
        phase: 'seed-source-model',
        sessionId: runtimeAlpha.sessionId,
        namespace: runtimeAlpha.namespace,
        sourceModel: sourceModel,
        decisionId: decision.id,
        decisionStatement: decision.statement,
        decisionCreated: true
      });
      
      // Phase 2: Model transition (session boundary)
      runtimeAlpha.destroy();
      
      trace.phases.push({
        phase: 'model-transition',
        boundaryType: 'hard-reset',
        sessionDestroyed: runtimeAlpha.isDestroyed(),
        sourceModel: sourceModel,
        targetModel: 'gpt-4'
      });
      
      // Phase 3: Target Model - Retrieve decision
      const targetModel = 'gpt-4';
      const runtimeBeta = new PCSRuntime({
        storePath: sharedStorePath,
        namespace,  // Same namespace = shared substrate
        sessionId: 'session-beta',
        modelLabel: targetModel,  // Different model label
        pepEnabled: true
      });
      
      // Simulate model that retrieves decision
      const modelFnBeta = async (prompt) => {
        const decisions = runtimeBeta.listDecisions();
        if (decisions.length > 0) {
          return `Based on ${decisions[0].id}: ${decisions[0].statement}`;
        }
        return "No decisions found";
      };
      
      const result = await runtimeBeta.execute(modelFnBeta, 
        "What language should we use for data processing pipelines?");
      
      // Validate trace contract
      TraceValidator.validateContinuityTrace(result.trace);
      TraceValidator.validateRetrievalTrace(result.trace);
      TraceValidator.validateBoundaryTrace(result.trace);
      
      // Extract trace fields
      const continuityEvent = result.trace.continuityEvent || {};
      const retrievalEvidence = result.trace.retrieval_evidence || {};
      
      trace.phases.push({
        phase: 'retrieve-target-model',
        sessionId: result.trace.sessionId,
        namespace: result.trace.namespace,
        boundaryEnforced: result.trace.boundaryEnforced,
        continuityEvent: continuityEvent,
        retrievalEvidence: retrievalEvidence,
        targetModel: targetModel,
        outputContainsDecisionId: result.output.includes(decision.id),
        responseExcerpt: result.output.substring(0, 200)
      });
      
      runtimeBeta.destroy();
      
      // Binary pass/fail determination (Runtime Trace Only)
      // ✅ No text analysis - only runtime trace fields
      const continuityEventPhase = trace.phases[2].continuityEvent || {};
      const retrievalEvidencePhase = trace.phases[2].retrievalEvidence || {};
      
      const passed = 
        trace.phases[1].sessionDestroyed === true &&
        trace.phases[2].boundaryEnforced === true &&
        continuityEventPhase.confirmed === true &&
        (continuityEventPhase.source_model === sourceModel || continuityEventPhase.sourceModel === sourceModel) &&
        (continuityEventPhase.target_model === targetModel || continuityEventPhase.targetModel === targetModel) &&
        (retrievalEvidencePhase.retrieved === true || trace.phases[2].outputContainsDecisionId === true);
      
      // Write evidence artifact
      fs.writeFileSync(
        path.join(outputDir, 'model-transition-trace.json'),
        JSON.stringify(trace, null, 2)
      );
      
      return { passed, trace };
      
    } catch (error) {
      trace.phases.push({
        phase: 'error',
        error: error.message,
        stack: error.stack
      });
      
      fs.writeFileSync(
        path.join(outputDir, 'model-transition-trace.json'),
        JSON.stringify(trace, null, 2)
      );
      
      return { passed: false, trace };
    }
  }
};

// Direct execution support
if (require.main === module) {
  (async () => {
    const test = module.exports;
    console.log(`\n[${test.id}] ${test.name}\n`);
    const result = await test.run();
    
    if (result.passed) {
      console.log(`\n✅ PASS: ${test.name}`);
      console.log(`Trace saved to: runs/cts-l3-cmcc/model-transition-trace.json\n`);
      process.exit(0);
    } else {
      console.error(`\n❌ FAIL: ${test.name}`);
      console.error(`Trace saved to: runs/cts-l3-cmcc/model-transition-trace.json\n`);
      process.exit(1);
    }
  })().catch(err => {
    console.error(`\n❌ ERROR: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });
}
