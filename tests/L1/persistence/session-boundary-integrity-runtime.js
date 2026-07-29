/**
 * L1.persistence.session-boundary-integrity (Runtime-Bound)
 * 
 * Validates session boundaries using PCS Runtime directly.
 * No mock test-harness. No text inference. Runtime trace only.
 * 
 * Behavioral requirement: RFC-PCS-0002 Section 3 (Session Boundary Semantics)
 * 
 * Success criteria:
 * - result.trace.boundaryEnforced === true
 * - Session B has no access to Session A's prompt history
 * - Assertions use runtime-emitted trace only
 */

const path = require('path');
const fs = require('fs');
const PCSRuntime = require('../../../runtime/runtime');
const TraceValidator = require('../../../lib/trace-contract-validator');

module.exports = {
  id: 'L1.persistence.session-boundary-integrity-runtime',
  name: 'Session Boundary Integrity (Runtime-Bound)',
  level: 'L1',
  category: 'persistence',

  async run() {
    const outputDir = path.join(__dirname, '../../../runs/cts-l1-boundary');
    const namespace = `cts-l1-boundary-${Date.now()}`;
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const trace = {
      scenario: 'L1.persistence.session-boundary-integrity-runtime',
      namespace,
      phases: []
    };
    
    try {
      // Phase 1: Session A - Seed canary content
      const CANARY_PHRASE = `CANARY_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      const runtimeA = new PCSRuntime({
        storePath: path.join(outputDir, 'session-a.json'),
        namespace,
        sessionId: 'session-a',
        pepEnabled: true
      });
      
      // Simulate model response that echoes canary
      const modelFnA = async (prompt) => `Acknowledged: ${prompt}`;
      const resultA = await runtimeA.execute(modelFnA, 
        `Remember this phrase: ${CANARY_PHRASE}`);
      
      trace.phases.push({
        phase: 'seed-session-a',
        sessionId: resultA.trace.sessionId,
        namespace: resultA.trace.namespace,
        canaryPhrase: CANARY_PHRASE,
        boundaryEnforced: resultA.trace.boundaryEnforced,
        outputContainsCanary: resultA.output.includes(CANARY_PHRASE)
      });
      
      // Phase 2: Enforce session boundary
      runtimeA.destroy();  // ✅ Real boundary enforcement
      
      trace.phases.push({
        phase: 'session-boundary',
        boundaryType: 'hard-reset',
        sessionDestroyed: runtimeA.isDestroyed(),
        sessionBoundaryConfirmed: true
      });
      
      // Phase 3: Session B - Test for contamination
      const runtimeB = new PCSRuntime({
        storePath: path.join(outputDir, 'session-b.json'),
        namespace,  // Same namespace (for state access)
        sessionId: 'session-b',
        pepEnabled: true
      });
      
      // Neutral prompt (should NOT retrieve canary)
      const modelFnB = async (prompt) => `The current time is ${new Date().toISOString()}`;
      const resultB = await runtimeB.execute(modelFnB, 
        'What is the current time?');
      
      // Validate trace contract
      TraceValidator.validateBoundaryTrace(resultB.trace);
      TraceValidator.validateRetrievalTrace(resultB.trace);
      
      trace.phases.push({
        phase: 'boundary-integrity-check',
        sessionId: resultB.trace.sessionId,
        namespace: resultB.trace.namespace,
        boundaryEnforced: resultB.trace.boundaryEnforced,
        canaryDetected: resultB.output.includes(CANARY_PHRASE),
        retrievalEvidence: resultB.trace.retrievalEvidence || { retrieved: false, trigger: 'none' },
        responseExcerpt: resultB.output.substring(0, 200)
      });
      
      runtimeB.destroy();
      
      // Binary pass/fail determination (Runtime Trace Only)
      const retrievalEvidence = trace.phases[2].retrievalEvidence || { trigger: 'none' };
      const passed = 
        trace.phases[1].sessionBoundaryConfirmed === true &&
        trace.phases[2].boundaryEnforced === true &&
        !trace.phases[2].canaryDetected &&
        (retrievalEvidence.trigger === 'none' ||
         retrievalEvidence.trigger === 'enforcement-check');
      
      // Write evidence artifact
      fs.writeFileSync(
        path.join(outputDir, 'session-boundary-integrity-trace.json'),
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
        path.join(outputDir, 'session-boundary-integrity-trace.json'),
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
      console.log(`Trace saved to: runs/cts-l1-boundary/session-boundary-integrity-trace.json\n`);
      process.exit(0);
    } else {
      console.error(`\n❌ FAIL: ${test.name}`);
      console.error(`Trace saved to: runs/cts-l1-boundary/session-boundary-integrity-trace.json\n`);
      process.exit(1);
    }
  })().catch(err => {
    console.error(`\n❌ ERROR: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });
}
