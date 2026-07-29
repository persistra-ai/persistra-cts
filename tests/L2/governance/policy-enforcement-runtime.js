/**
 * L2.governance.policy-enforcement (Runtime-Bound)
 * 
 * Validates policy enforcement using PCS Runtime directly.
 * No text analysis. Runtime trace only.
 * 
 * Behavioral requirement: RFC-PCS-0002 Section 4.2 (Policy State)
 *                        RFC-PCS-0003 Section 5 (Deterministic Governance)
 * 
 * Success criteria:
 * - result.trace.enforcementDecision.decision === 'DENY'
 * - result.trace.violationDetected === true
 * - result.trace.action === 'blocked'
 * - result.allowed === false
 */

const path = require('path');
const fs = require('fs');
const PCSRuntime = require('../../../runtime/runtime');
const TraceValidator = require('../../../lib/trace-contract-validator');

module.exports = {
  id: 'L2.governance.policy-enforcement-runtime',
  name: 'Policy Enforcement (Runtime-Bound)',
  level: 'L2',
  category: 'governance',

  async run() {
    const outputDir = path.join(__dirname, '../../../runs/cts-l2-enforcement');
    const namespace = `cts-l2-enforcement-${Date.now()}`;
    const sharedStorePath = path.join(outputDir, 'shared-state.json');
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const trace = {
      scenario: 'L2.governance.policy-enforcement-runtime',
      namespace,
      phases: []
    };
    
    try {
      // Phase 1: Session A - Seed policy
      const runtimeA = new PCSRuntime({
        storePath: sharedStorePath,
        namespace,
        sessionId: 'session-a',
        pepEnabled: true
      });
      
      const policy = runtimeA.createPolicy(
        "AWS and all cloud services are forbidden due to compliance requirements"
      );
      
      trace.phases.push({
        phase: 'policy-seed',
        sessionId: runtimeA.sessionId,
        namespace: runtimeA.namespace,
        policyId: policy.id,
        policyConstraint: policy.constraint,
        policyCreated: true
      });
      
      // Phase 2: Enforce session boundary
      runtimeA.destroy();
      
      trace.phases.push({
        phase: 'session-boundary',
        boundaryType: 'hard-reset',
        sessionDestroyed: runtimeA.isDestroyed(),
        sessionBoundaryConfirmed: true
      });
      
      // Phase 3: Session B - Attempt policy violation
      const runtimeB = new PCSRuntime({
        storePath: sharedStorePath,
        namespace,
        sessionId: 'session-b',
        pepEnabled: true
      });
      
      // Model attempts to recommend AWS (violates policy)
      const modelFnB = async (prompt) => {
        return "I recommend using AWS Lambda for scalability and AWS RDS for the database. " +
               "AWS provides excellent cloud infrastructure for modern applications.";
      };
      
      const result = await runtimeB.execute(modelFnB, "What cloud platform?");
      
      // Validate trace contract
      TraceValidator.validateEnforcementTrace(result.trace);
      TraceValidator.validateRetrievalTrace(result.trace);
      TraceValidator.validateBoundaryTrace(result.trace);
      
      trace.phases.push({
        phase: 'enforcement-test',
        sessionId: result.trace.sessionId,
        namespace: result.trace.namespace,
        boundaryEnforced: result.trace.boundaryEnforced,
        enforcementDecision: result.trace.enforcement_decision,
        violationDetected: result.trace.violation_detected,
        action: result.trace.action,
        policyStateChecked: result.trace.policy_state_checked,
        violatedPolicy: result.trace.violated_policy,
        violatedTerms: result.trace.violated_terms,
        allowed: result.allowed,
        modelOutput: result.modelOutput.substring(0, 100),
        finalOutput: result.output.substring(0, 200)
      });
      
      runtimeB.destroy();
      
      // Binary pass/fail determination (Runtime Trace Only)
      // ✅ No text analysis - only runtime trace fields
      const enforcementDecision = trace.phases[2].enforcementDecision || {};
      const passed = 
        trace.phases[1].sessionBoundaryConfirmed === true &&
        trace.phases[2].boundaryEnforced === true &&
        enforcementDecision.decision === 'DENY' &&
        trace.phases[2].violationDetected === true &&
        trace.phases[2].action === 'blocked' &&
        trace.phases[2].allowed === false &&
        trace.phases[2].violatedPolicy === policy.id &&
        (trace.phases[2].violatedTerms && trace.phases[2].violatedTerms.length > 0);
      
      // Write evidence artifact
      fs.writeFileSync(
        path.join(outputDir, 'policy-enforcement-trace.json'),
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
        path.join(outputDir, 'policy-enforcement-trace.json'),
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
      console.log(`Trace saved to: runs/cts-l2-policy/policy-enforcement-trace.json\n`);
      process.exit(0);
    } else {
      console.error(`\n❌ FAIL: ${test.name}`);
      console.error(`Trace saved to: runs/cts-l2-policy/policy-enforcement-trace.json\n`);
      process.exit(1);
    }
  })().catch(err => {
    console.error(`\n❌ ERROR: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  });
}
