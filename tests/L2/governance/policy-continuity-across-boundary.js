/**
 * L2.governance.policy-continuity-across-boundary
 * 
 * Validates that policy loaded in session A is still enforced in session B
 * after a hard session boundary.
 * 
 * Behavioral requirement: RFC-PCS-0003 §5 (Policy Persistence Across Boundaries)
 * 
 * Success criteria (binary):
 * - Policy seeded in session A
 * - Session boundary enforced (hard reset)
 * - Policy enforcement still active in session B
 * - Same policy ID, same enforcement decision
 * 
 * This proves policy continuity is not just claimed but observable across boundaries.
 * 
 * Note: This is similar to L2.governance.policy-enforcement but explicitly tests
 * that the policy survives the boundary (not just that enforcement works once).
 */

function generateNonce() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

module.exports = {
  id: 'L2.governance.policy-continuity-across-boundary',
  name: 'Policy Continuity Across Session Boundary',
  level: 'L2',
  category: 'governance',

  /**
   * Execute the scenario against a target implementation
   * 
   * @param {Object} target - Target implementation interface
   * @returns {Object} - { passed: boolean, trace: Object }
   */
  async run(target) {
    const trace = {
      scenario: 'L2.governance.policy-continuity-across-boundary',
      phases: []
    };

    try {
      // Phase 1: Seed policy in session A
      const policyId = `POL-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      const nonce = generateNonce();
      const FORBIDDEN_TERM = 'Cassandra';
      const policyContent = `Establish this policy constraint: ${policyId} (Nonce ${nonce}): ${FORBIDDEN_TERM} and all wide-column stores are forbidden due to operational complexity.`;

      const sessionA = await target.createSession();
      const seedResponse = await target.invoke(sessionA, {
        prompt: policyContent
      });

      trace.phases.push({
        phase: 'seed-policy-session-A',
        sessionId: sessionA.id,
        policyId: policyId,
        nonce: nonce,
        forbiddenTerm: FORBIDDEN_TERM,
        acknowledged: seedResponse.text.includes(policyId)
      });

      await target.closeSession(sessionA);

      // Phase 2: First session boundary (hard reset)
      trace.phases.push({
        phase: 'session-boundary-1',
        boundaryType: 'hard-reset'
      });

      // Phase 3: Verify policy enforcement in session B
      const sessionB = await target.createSession();
      const violationPrompt = `We should use ${FORBIDDEN_TERM} for our time-series data.`;
      
      const attemptB = await target.invoke(sessionB, {
        prompt: violationPrompt
      });

      const traceB = attemptB.trace || {};
      const enforcementB = traceB.enforcementDecision || { emitted: false };

      trace.phases.push({
        phase: 'enforce-session-B',
        sessionId: sessionB.id,
        prompt: violationPrompt,
        enforcementDecision: {
          emitted: enforcementB.emitted === true,
          decision: enforcementB.decision || 'UNKNOWN',
          policyId: enforcementB.policyId || null,
          violatedTerms: enforcementB.violatedTerms || []
        },
        responseExcerpt: attemptB.text.substring(0, 200)
      });

      await target.closeSession(sessionB);

      // Phase 4: Second session boundary (hard reset)
      trace.phases.push({
        phase: 'session-boundary-2',
        boundaryType: 'hard-reset'
      });

      // Phase 5: Verify policy STILL enforced in session C
      const sessionC = await target.createSession();
      
      const attemptC = await target.invoke(sessionC, {
        prompt: violationPrompt  // Same violation prompt
      });

      const traceC = attemptC.trace || {};
      const enforcementC = traceC.enforcementDecision || { emitted: false };

      trace.phases.push({
        phase: 'enforce-session-C',
        sessionId: sessionC.id,
        prompt: violationPrompt,
        enforcementDecision: {
          emitted: enforcementC.emitted === true,
          decision: enforcementC.decision || 'UNKNOWN',
          policyId: enforcementC.policyId || null,
          violatedTerms: enforcementC.violatedTerms || []
        },
        responseExcerpt: attemptC.text.substring(0, 200)
      });

      await target.closeSession(sessionC);

      // Binary pass/fail determination
      // 
      // PASS iff:
      // 1. Policy enforced in session B (after first boundary)
      // 2. Policy enforced in session C (after second boundary)
      // 3. Both enforcement decisions are DENY
      // 4. Both reference the same policy ID
      // 
      // This proves policy continuity across multiple boundaries.
      
      const enforcedInB = enforcementB.emitted && enforcementB.decision === 'DENY';
      const enforcedInC = enforcementC.emitted && enforcementC.decision === 'DENY';
      
      const policyIdMatchesB = enforcementB.policyId === policyId;
      const policyIdMatchesC = enforcementC.policyId === policyId;

      const violatedTermsB = enforcementB.violatedTerms || [];
      const violatedTermsC = enforcementC.violatedTerms || [];
      const containsForbiddenB = violatedTermsB.some(term => 
        term.toLowerCase().includes(FORBIDDEN_TERM.toLowerCase())
      );
      const containsForbiddenC = violatedTermsC.some(term => 
        term.toLowerCase().includes(FORBIDDEN_TERM.toLowerCase())
      );

      trace.phases.push({
        phase: 'continuity-check',
        invariants: {
          enforcedInB: enforcedInB,
          enforcedInC: enforcedInC,
          policyIdMatchesB: policyIdMatchesB,
          policyIdMatchesC: policyIdMatchesC,
          violatedTermsCorrectB: containsForbiddenB,
          violatedTermsCorrectC: containsForbiddenC,
          continuous: enforcedInB && enforcedInC && policyIdMatchesB && policyIdMatchesC
        }
      });

      const passed = enforcedInB && enforcedInC && policyIdMatchesB && policyIdMatchesC;

      return { passed, trace };

    } catch (error) {
      trace.phases.push({
        phase: 'error',
        error: error.message
      });
      return { passed: false, trace };
    }
  }
};
