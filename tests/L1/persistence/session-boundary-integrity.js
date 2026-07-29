/**
 * L1.persistence.session-boundary-integrity
 * 
 * Validates that session boundaries are enforced correctly and that Session B
 * does not have access to Session A's prompt history via context window carryover.
 * 
 * This is the "anti-RAG / anti-paste-context" guardrail. It proves that continuity
 * is achieved through persistent state retrieval, not context window tricks.
 * 
 * Behavioral requirement: RFC-PCS-0002 Section 3 (Session Boundary Semantics)
 * 
 * Success criteria (binary):
 * - sessionBoundaryConfirmed === true
 * - promptHistoryTransported === false (Session B has no Session A transcript)
 * - OR target explicitly asserts promptHistoryTransported: false in trace
 * 
 * Detection methods:
 * 1. Target self-reports via trace.promptHistoryTransported field
 * 2. CTS inspects Session B prompt for Session A content (if target provides prompt text)
 * 3. CTS verifies Session B response does NOT contain verbatim Session A excerpts
 *    (unless retrieved via state layer, which would be marked in trace)
 */

module.exports = {
  id: 'L1.persistence.session-boundary-integrity',
  name: 'Session Boundary Integrity (Anti-Cheating)',
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
      scenario: 'L1.persistence.session-boundary-integrity',
      phases: []
    };

    try {
      // Phase 1: Seed distinctive content in Session A
      // Use a unique synthetic phrase that would be unlikely to appear naturally
      const CANARY_PHRASE = `SYNTHETIC_CANARY_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const sessionAContent = `This is a test message containing the unique identifier: ${CANARY_PHRASE}. This phrase should not appear in Session B unless it was transported via context window.`;

      const sessionA = await target.createSession();
      const seedResponse = await target.invoke(sessionA, {
        prompt: sessionAContent
      });

      trace.phases.push({
        phase: 'seed-session-a',
        sessionId: sessionA.id,
        canaryPhrase: CANARY_PHRASE,
        contentLength: sessionAContent.length,
        responseAcknowledged: seedResponse.text.length > 0
      });

      // Phase 2: Close Session A (enforce boundary)
      await target.closeSession(sessionA);

      trace.phases.push({
        phase: 'session-boundary',
        boundaryType: 'hard-reset',
        sessionBoundaryConfirmed: true
      });

      // Phase 3: Create Session B and test for contamination
      const sessionB = await target.createSession();
      
      // Use a neutral prompt that should NOT trigger retrieval of Session A content
      const neutralPrompt = `What is the current time?`;
      const sessionBResponse = await target.invoke(sessionB, {
        prompt: neutralPrompt
      });

      // Check for contamination: Session B should NOT contain the canary phrase
      // unless it was explicitly retrieved via state layer (which would be marked in trace)
      const canaryDetected = sessionBResponse.text.includes(CANARY_PHRASE);
      const retrievalClaimed = sessionBResponse.trace?.retrievalEvidence?.retrieved === true;
      
      // Check retrieval trigger and scope: neutral prompt should NOT retrieve decision state
      // Valid triggers: "explicit-query" | "background" | "none"
      // Valid scopes: "decision-state" | "policy-state" | "intent-state" | "other" | "unknown"
      // 
      // For neutral prompt ("What is the current time?"):
      // - Allow trigger === "none" (no retrieval)
      // - Allow trigger === "background" IF scope !== "decision-state" (e.g., policy checks)
      // - Block trigger === "explicit-query" (neutral prompt doesn't warrant explicit retrieval)
      // - Block scope === "decision-state" (neutral prompt shouldn't retrieve Session A decisions)
      const retrievalTrigger = sessionBResponse.trace?.retrievalEvidence?.trigger || 'unknown';
      const retrievalScope = sessionBResponse.trace?.retrievalEvidence?.scope || 'unknown';
      
      // Determine if retrieval is appropriate for this neutral prompt
      const inappropriateRetrieval = retrievalClaimed && (
        retrievalTrigger === 'explicit-query' ||  // Explicit retrieval on neutral prompt
        retrievalScope === 'decision-state'       // Decision state retrieval on neutral prompt
      );

      // Target can self-report prompt history transport status
      const targetAssertsNoTransport = sessionBResponse.trace?.promptHistoryTransported === false;

      // Binary integrity checks
      const integrityChecks = {
        // Primary check: Target explicitly asserts no prompt history transport
        targetAssertsNoTransport: targetAssertsNoTransport === true,
        
        // Secondary check: Canary phrase not detected in Session B
        // (or if detected, it was via legitimate retrieval, not context carryover)
        canaryNotDetected: !canaryDetected,
        canaryDetectedViaRetrieval: canaryDetected && retrievalClaimed,
        
        // Retrieval trigger and scope check: neutral prompt should NOT retrieve decision state
        // Allow background retrieval for governance (policy/intent checks)
        // Block explicit retrieval or decision-state retrieval on neutral prompt
        retrievalTrigger: retrievalTrigger,
        retrievalScope: retrievalScope,
        appropriateRetrievalBehavior: !retrievalClaimed || (
          retrievalTrigger !== 'explicit-query' &&
          retrievalScope !== 'decision-state'
        ),
        
        // Tertiary check: Session B prompt length is reasonable
        // (if target provides prompt text, verify it's not bloated with Session A history)
        sessionBPromptReasonable: true // Default true; target can override in trace
      };

      // If target provides Session B prompt text in trace, verify it doesn't contain Session A content
      if (sessionBResponse.trace?.promptText) {
        const promptContainsCanary = sessionBResponse.trace.promptText.includes(CANARY_PHRASE);
        integrityChecks.sessionBPromptContainsCanary = promptContainsCanary;
        integrityChecks.sessionBPromptReasonable = !promptContainsCanary;
      }

      trace.phases.push({
        phase: 'boundary-integrity-check',
        sessionId: sessionB.id,
        neutralPrompt: neutralPrompt,
        integrityChecks: integrityChecks,
        responseExcerpt: sessionBResponse.text.substring(0, 200)
      });

      await target.closeSession(sessionB);

      // Binary pass/fail determination (tightened to prevent self-report bypass)
      // 
      // PASS iff:
      // 1. sessionBoundaryConfirmed === true (hard reset enforced)
      // 2. sessionBPromptReasonable === true (prompt not bloated with Session A history)
      // 3. appropriateRetrievalBehavior === true (refined to allow background governance checks):
      //    - No retrieval (trigger === "none"), OR
      //    - Background retrieval for non-decision state (e.g., policy/intent checks), OR
      //    - Explicit retrieval NOT on neutral prompt
      // 4. Contamination is not present OR is explicitly attributable to retrieval:
      //    - canaryNotDetected === true, OR
      //    - canaryDetectedViaRetrieval === true (target proves it retrieved from state)
      //
      // FAIL if:
      // - canaryDetected === true AND canaryDetectedViaRetrieval === false
      //   (contamination without retrieval evidence = cheating, regardless of self-report)
      // - sessionBPromptReasonable === false
      //   (prompt bloat is itself a transport indicator, regardless of canary outcome)
      // - retrievalClaimed === true AND retrievalTrigger === "explicit-query"
      //   (explicit retrieval on neutral prompt = inappropriate)
      // - retrievalClaimed === true AND retrievalScope === "decision-state"
      //   (decision state retrieval on neutral prompt = "retrieve everything always" cheating)
      //
      // Note: targetAssertsNoTransport is supporting evidence only, not a bypass.
      // Note: Background retrieval for policy/intent checks is allowed (legitimate governance).
      const passed = 
        trace.phases[1].sessionBoundaryConfirmed === true &&
        integrityChecks.sessionBPromptReasonable === true &&
        integrityChecks.appropriateRetrievalBehavior === true &&
        (
          integrityChecks.canaryNotDetected === true ||
          integrityChecks.canaryDetectedViaRetrieval === true
        );

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
