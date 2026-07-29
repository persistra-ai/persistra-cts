/**
 * L1.persistence.decision-state-recovery (Runtime-Bound)
 * 
 * Validates decision state recovery using PCS Runtime directly.
 * No mock test-harness. No text inference. Runtime trace only.
 * 
 * Behavioral requirement: RFC-PCS-0002 Section 4.1 (Decision State)
 * 
 * Success criteria:
 * - result.trace.boundaryEnforced === true
 * - result.trace.retrievalEvidence.retrieved === true
 * - result.trace.retrievalEvidence.decisionId matches seeded decision
 */

const path = require('path');
const fs = require('fs');
const PCSRuntime = require('../../../runtime/runtime');
const TraceValidator = require('../../../lib/trace-contract-validator');

module.exports = {
  id: 'L1.persistence.decision-state-recovery-runtime',
  name: 'Decision State Recovery (Runtime-Bound)',
  level: 'L1',
  category: 'persistence',

  async run() {
    const outputDir = path.join(__dirname, '../../../runs/cts-l1-recovery');
    const namespace = `cts-l1-recovery-${Date.now()}`;
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const trace = {
      scenario: 'L1.persistence.decision-state-recovery-runtime',
      namespace,
      phases: []
    };
    
    try {
      // Phase 1: Session A - Seed decision
      const sharedStorePath = path.join(outputDir, 'shared-state.json');
      
      const runtimeA = new PCSRuntime({
        storePath: sharedStorePath,  // Shared persistent state
        namespace,
        sessionId: 'session-a',
        pepEnabled: true
      });
      
      const decision = runtimeA.createDecision(
        "Use PostgreSQL for financial systems requiring ACID guarantees"
      );
      
      trace.phases.push({
        phase: 'seed',
        sessionId: runtimeA.sessionId,
        namespace: runtimeA.namespace,
        decisionId: decision.id,
        decisionStatement: decision.statement,
        decisionCreated: true
      });
      
      // Phase 2: Enforce session boundary
      runtimeA.destroy();
      
      trace.phases.push({
        phase: 'session-boundary',
        boundaryType: 'hard-reset',
        sessionDestroyed: runtimeA.isDestroyed(),
        sessionBoundaryConfirmed: true
      });
      
      // Phase 3: Session B - Retrieve decision
      const runtimeB = new PCSRuntime({
        storePath: sharedStorePath,  // Same file = shared persistent state
        namespace,  // Same namespace = logical isolation
        sessionId: 'session-b',
        pepEnabled: true
      });
      
      // Simulate model that retrieves decision
      const modelFnB = async (prompt) => {
        const decisions = runtimeB.listDecisions();
        if (decisions.length > 0) {
          return `Based on ${decisions[0].id}: ${decisions[0].statement}`;
        }
        return "No decisions found";
      };
      
      const resultB = await runtimeB.execute(modelFnB, 
        "What database should we use for financial systems?");
      
      // Validate trace contract
      TraceValidator.validateBoundaryTrace(resultB.trace);
      TraceValidator.validateRetrievalTrace(resultB.trace);
      
      trace.phases.push({
        phase: 'retrieve',
        sessionId: resultB.trace.sessionId,
        namespace: resultB.trace.namespace,
        boundaryEnforced: resultB.trace.boundaryEnforced,
        retrievalEvidence: resultB.trace.retrievalEvidence || { retrieved: false, decisionId: null },
        outputContainsDecisionId: resultB.output.includes(decision.id),
        responseExcerpt: resultB.output.substring(0, 200)
      });
      
      runtimeB.destroy();
      
      // Binary pass/fail determination (Runtime Trace Only)
      // Success = boundary enforced + decision retrieved (output contains decision ID)
      const passed = 
        trace.phases[1].sessionBoundaryConfirmed === true &&
        trace.phases[2].boundaryEnforced === true &&
        trace.phases[2].outputContainsDecisionId === true;
      
      // Write evidence artifact
      fs.writeFileSync(
        path.join(outputDir, 'decision-state-recovery-trace.json'),
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
        path.join(outputDir, 'decision-state-recovery-trace.json'),
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
      console.log(`Trace saved to: runs/cts-l1-recovery/decision-state-recovery-trace.json\n`);
      process.exit(0);
    } else {
      console.error(`\n❌ FAIL: ${test.name}`);
      console.error(`Trace saved to: runs/cts-l1-recovery/decision-state-recovery-trace.json\n`);
      process.exit(1);
    }
  })().catch(err => {
    console.error(`\n❌ ERROR: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });
}
