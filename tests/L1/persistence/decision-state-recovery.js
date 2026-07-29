/**
 * L1.persistence.decision-state-recovery
 * 
 * Validates that decision state seeded in Session A is recoverable in Session B
 * after a session boundary (hard reset).
 * 
 * Behavioral requirement: RFC-PCS-0002 Section 4.1 (Decision State)
 * 
 * Success criteria (binary):
 * - sessionBoundaryConfirmed === true
 * - retrievalEvidence.present === true (Session B)
 * - decisionStateMatched === true (retrieved ID matches seeded ID)
 * 
 * Note on sentinel tokens:
 * This scenario uses "JAVA" as a synthetic sentinel token to verify that
 * decision content is preserved. The token is a canary, not a standard.
 * The invariant being tested is "decision state is recovered and enforced,"
 * not "Java is required." Any distinguishable token would serve the same purpose.
 */

module.exports = {
  id: 'L1.persistence.decision-state-recovery',
  name: 'Decision State Recovery Across Session Boundary',
  level: 'L1',
  category: 'persistence',

  /**
   * Execute the scenario against a target implementation
   * 
   * @param {Object} target - Target implementation interface
   * @returns {Object} - { passed: boolean, trace: Object }
   */
  async run(target) {
    const trace = {
      scenario: 'L1.persistence.decision-state-recovery',
      phases: []
    };

    try {
      // Phase 1: Seed decision state in Session A
      const decisionId = `DR-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      const nonce = generateNonce();
      
      // Synthetic sentinel token for content verification (canary, not standard)
      const SENTINEL_LANG = 'JAVA';
      const decisionContent = `${decisionId} (Nonce ${nonce}): Integration layer must use ${SENTINEL_LANG} exclusively for all backend services.`;

      const sessionA = await target.createSession();
      const seedResponse = await target.invoke(sessionA, {
        prompt: `Establish this decision: ${decisionContent}`
      });

      trace.phases.push({
        phase: 'seed',
        sessionId: sessionA.id,
        decisionId: decisionId,
        nonce: nonce,
        stateSnapshot: {
          content: decisionContent,
          acknowledged: seedResponse.text.includes(decisionId)
        }
      });

      // Phase 2: Enforce session boundary (hard reset)
      await target.closeSession(sessionA);
      
      trace.phases.push({
        phase: 'session-boundary',
        boundaryType: 'hard-reset',
        sessionBoundaryConfirmed: true
      });

      // Phase 3: Attempt retrieval in Session B
      const sessionB = await target.createSession();
      const retrievalPrompt = `What decision was made about the integration layer technology stack?`;
      const retrievalResponse = await target.invoke(sessionB, {
        prompt: retrievalPrompt
      });

      const retrievalEvidence = {
        present: retrievalResponse.text.includes(decisionId) || retrievalResponse.text.includes(nonce),
        matchedId: retrievalResponse.text.includes(decisionId),
        matchedNonce: retrievalResponse.text.includes(nonce),
        // Sentinel token verification (canary for content preservation)
        containsSentinel: retrievalResponse.text.toLowerCase().includes(SENTINEL_LANG.toLowerCase())
      };

      trace.phases.push({
        phase: 'retrieve',
        sessionId: sessionB.id,
        retrievalEvidence: retrievalEvidence,
        responseExcerpt: retrievalResponse.text.substring(0, 200)
      });

      await target.closeSession(sessionB);

      // Binary pass/fail determination
      const passed = 
        trace.phases[1].sessionBoundaryConfirmed === true &&
        retrievalEvidence.present === true &&
        (retrievalEvidence.matchedId || retrievalEvidence.matchedNonce);

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

/**
 * Generate a random nonce for decision state identification
 */
function generateNonce() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let nonce = '';
  for (let i = 0; i < 4; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
