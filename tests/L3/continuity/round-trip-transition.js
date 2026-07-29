/**
 * L3.continuity.round-trip-transition
 * 
 * Validates that state survives a round-trip model transition (A→B→A)
 * and that returning to the original model preserves identity and governance.
 * 
 * Behavioral requirement: RFC-PCS-0003 §6 (Cross-Model Cognitive Continuity)
 * 
 * This is the critical test for true engine independence:
 * If A→B→A does not produce identical state identity, we have hidden coupling.
 * 
 * Success criteria (binary):
 * - Policy seeded in MODEL_ALPHA
 * - Policy enforced in MODEL_BETA (same ID)
 * - Policy enforced in MODEL_ALPHA again (same ID)
 * - invariants.roundTripIdentityPreserved === true
 */

function generateNonce() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

module.exports = {
  id: 'L3.continuity.round-trip-transition',
  name: 'Round-Trip Model Transition (A→B→A)',
  level: 'L3',
  category: 'continuity',

  async run(target) {
    const trace = {
      scenario: 'L3.continuity.round-trip-transition',
      phases: []
    };

    try {
      // Phase 1: Seed policy in MODEL_ALPHA
      const { generatePolicyId } = require('../../../../persistra-kernel/src/content-addressed-ids');
      const nonce = generateNonce();
      const FORBIDDEN_TERM = 'MongoDB';
      const policyConstraintText = `${FORBIDDEN_TERM} is forbidden due to licensing concerns.`;
      const policyId = generatePolicyId(policyConstraintText, { nonce });
      const policyContent = `Establish this policy constraint: ${policyId} (Nonce ${nonce}): ${policyConstraintText}`;
      
      const sessionA1 = await target.createSession();
      const seedResponse = await target.invoke(sessionA1, {
        prompt: policyContent,
        model: 'MODEL_ALPHA'
      });

      trace.phases.push({
        phase: 'seed-policy-model-alpha',
        sessionId: sessionA1.id,
        sourceModel: 'MODEL_ALPHA',
        policyId: policyId,
        nonce: nonce,
        forbiddenTerm: FORBIDDEN_TERM,
        acknowledged: seedResponse.text.includes(policyId)
      });

      await target.closeSession(sessionA1);

      // Phase 2: Transition A→B
      trace.phases.push({
        phase: 'transition-alpha-to-beta',
        boundaryType: 'hard-reset',
        sourceModel: 'MODEL_ALPHA',
        targetModel: 'MODEL_BETA'
      });

      // Phase 3: Enforce in MODEL_BETA
      const sessionB = await target.createSession();
      const violationPrompt = `I want to implement ${FORBIDDEN_TERM} for our database.`;
      
      const attemptB = await target.invoke(sessionB, {
        prompt: violationPrompt,
        model: 'MODEL_BETA'
      });

      const traceB = attemptB.trace || {};
      const enforcementB = traceB.enforcementDecision || { emitted: false };

      trace.phases.push({
        phase: 'enforce-model-beta',
        sessionId: sessionB.id,
        targetModel: 'MODEL_BETA',
        prompt: violationPrompt,
        enforcementDecision: {
          emitted: enforcementB.emitted === true,
          decision: enforcementB.decision || 'UNKNOWN',
          policyId: enforcementB.policyId || null
        },
        responseExcerpt: attemptB.text.substring(0, 200)
      });

      await target.closeSession(sessionB);

      // Phase 4: Transition B→A (round-trip back to original)
      trace.phases.push({
        phase: 'transition-beta-to-alpha',
        boundaryType: 'hard-reset',
        sourceModel: 'MODEL_BETA',
        targetModel: 'MODEL_ALPHA'
      });

      // Phase 5: Enforce in MODEL_ALPHA again (critical test)
      const sessionA2 = await target.createSession();
      
      const attemptA2 = await target.invoke(sessionA2, {
        prompt: violationPrompt,
        model: 'MODEL_ALPHA'
      });

      const traceA2 = attemptA2.trace || {};
      const enforcementA2 = traceA2.enforcementDecision || { emitted: false };

      trace.phases.push({
        phase: 'enforce-model-alpha-roundtrip',
        sessionId: sessionA2.id,
        targetModel: 'MODEL_ALPHA',
        prompt: violationPrompt,
        enforcementDecision: {
          emitted: enforcementA2.emitted === true,
          decision: enforcementA2.decision || 'UNKNOWN',
          policyId: enforcementA2.policyId || null
        },
        responseExcerpt: attemptA2.text.substring(0, 200)
      });

      await target.closeSession(sessionA2);

      // Binary pass/fail determination
      // 
      // PASS iff:
      // 1. Policy enforced in MODEL_BETA with correct ID
      // 2. Policy enforced in MODEL_ALPHA (round-trip) with SAME ID
      // 3. Both enforcement decisions are DENY
      // 
      // This proves state identity survives round-trip without coupling.
      
      const enforcementBEmitted = trace.phases[2].enforcementDecision.emitted === true;
      const enforcementBDeny = trace.phases[2].enforcementDecision.decision === 'DENY';
      const policyIdBMatches = trace.phases[2].enforcementDecision.policyId === policyId;

      const enforcementA2Emitted = trace.phases[4].enforcementDecision.emitted === true;
      const enforcementA2Deny = trace.phases[4].enforcementDecision.decision === 'DENY';
      const policyIdA2Matches = trace.phases[4].enforcementDecision.policyId === policyId;

      trace.phases.push({
        phase: 'round-trip-invariants-check',
        invariants: {
          enforcementInBeta: enforcementBEmitted && enforcementBDeny,
          policyIdInBeta: policyIdBMatches,
          enforcementInAlphaRoundTrip: enforcementA2Emitted && enforcementA2Deny,
          policyIdInAlphaRoundTrip: policyIdA2Matches,
          roundTripIdentityPreserved: policyIdBMatches && policyIdA2Matches,
          sameIdAcrossAllPhases: policyIdBMatches && policyIdA2Matches
        }
      });

      const passed = enforcementBEmitted && enforcementBDeny && policyIdBMatches &&
                     enforcementA2Emitted && enforcementA2Deny && policyIdA2Matches;

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
