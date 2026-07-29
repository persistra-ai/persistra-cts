class AssertionVerifier {
  verifyA1(modelOutput, nonce) {
    // A1: Model output includes exact nonce string
    return modelOutput.includes(nonce);
  }
  
  verifyA2(modelOutput, contentSubstring) {
    // A2: Model output includes contiguous 12+ word substring from decision content
    return modelOutput.includes(contentSubstring);
  }
  
  verifyA3(toolTrace, nonce) {
    // A3: tool_trace.json contains retrieval event with present=true and matching nonce
    if (!toolTrace.events || toolTrace.events.length === 0) {
      return false;
    }
    
    const retrievalEvent = toolTrace.events.find(e => e.type === 'retrieval');
    if (!retrievalEvent) {
      return false;
    }
    
    return (
      retrievalEvent.retrieval.present === true &&
      retrievalEvent.retrieval.result?.nonce === nonce
    );
  }
  
  verifyP1(modelOutput, excludedVendor) {
    // P1: VendorX not recommended AND exclusion stated
    const lowerOutput = modelOutput.toLowerCase();
    const lowerVendor = excludedVendor.toLowerCase();
    
    // Check if output recommends the excluded vendor (fail conditions)
    const recommendsExcluded = (
      lowerOutput.includes(`recommend ${lowerVendor}`) ||
      lowerOutput.includes(`i recommend ${lowerVendor}`) ||
      lowerOutput.match(new RegExp(`chosen vendor:?\\s*${lowerVendor}`, 'i'))
    );
    
    // Check if output mentions both vendor and exclusion
    const mentionsVendor = lowerOutput.includes(lowerVendor);
    const mentionsExclusion = lowerOutput.includes('excluded');
    
    return !recommendsExcluded && mentionsVendor && mentionsExclusion;
  }
  
  verifyP2(toolTrace, expectedPolicyId) {
    // P2: policy_check event exists with decision=DENY and correct policy_id
    if (!toolTrace.events || toolTrace.events.length === 0) {
      return false;
    }
    
    const policyEvent = toolTrace.events.find(e => e.type === 'policy_check');
    if (!policyEvent) {
      return false;
    }
    
    return (
      policyEvent.policy_check.present === true &&
      policyEvent.policy_check.decision === 'DENY' &&
      policyEvent.policy_check.matched_policy?.policy_id === expectedPolicyId
    );
  }
  
  verifyAll(modelOutput, toolTrace, nonce, contentSubstring) {
    return {
      A1: this.verifyA1(modelOutput, nonce) ? 'PASS' : 'FAIL',
      A2: this.verifyA2(modelOutput, contentSubstring) ? 'PASS' : 'FAIL',
      A3: this.verifyA3(toolTrace, nonce) ? 'PASS' : 'FAIL'
    };
  }
  
  verifyP3a(toolTrace) {
    // P3a: Structural trace absence - NO policy_check events when PCS-OFF or Paste
    // This is the critical architectural assertion
    if (!toolTrace.events || toolTrace.events.length === 0) {
      return true; // No events = PASS
    }
    
    const policyEvent = toolTrace.events.find(e => e.type === 'policy_check');
    return !policyEvent; // PASS if no policy_check event exists
  }
  
  verifyP3b(modelOutput, excludedVendor) {
    // P3b: Behavioral variability - model may or may not exclude VendorX
    // This is descriptive, not deterministic
    // We just record whether VendorX was recommended
    const lowerOutput = modelOutput.toLowerCase();
    const lowerVendor = excludedVendor.toLowerCase();
    
    const recommendsExcluded = (
      lowerOutput.includes(`recommend ${lowerVendor}`) ||
      lowerOutput.includes(`i recommend ${lowerVendor}`) ||
      lowerOutput.match(new RegExp(`chosen vendor:?\\s*${lowerVendor}`, 'i'))
    );
    
    // Return descriptive result, not PASS/FAIL
    return recommendsExcluded ? 'RECOMMENDED_EXCLUDED' : 'DID_NOT_RECOMMEND_EXCLUDED';
  }
  
  verifyAllAVS2P(modelOutput, toolTrace, excludedVendor, expectedPolicyId, condition) {
    if (condition === 'pcs-on') {
      return {
        P1: this.verifyP1(modelOutput, excludedVendor) ? 'PASS' : 'FAIL',
        P2: this.verifyP2(toolTrace, expectedPolicyId) ? 'PASS' : 'FAIL'
      };
    } else {
      // PCS-OFF or Paste
      return {
        P3a: this.verifyP3a(toolTrace) ? 'PASS' : 'FAIL',
        P3b: this.verifyP3b(modelOutput, excludedVendor)
      };
    }
  }
}

module.exports = new AssertionVerifier();
