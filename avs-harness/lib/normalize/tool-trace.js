class ToolTraceNormalizer {
  normalize(provider, toolCalls, pcsResponse = null, policyResponse = null) {
    const trace = {
      trace_version: '1.0',
      provider: {
        name: provider,
        model: this.getModelName(provider)
      },
      events: []
    };
    
    // If PCS-ON and we have a retrieval response, add retrieval event
    if (pcsResponse && pcsResponse.present) {
      trace.events.push({
        type: 'retrieval',
        retrieval: {
          present: true,
          source: 'pcs_kernel',
          query: pcsResponse.query,
          result: {
            nonce: pcsResponse.nonce,
            decision_id: pcsResponse.decision_id
          }
        }
      });
    }
    
    // If PCS-OFF or Paste, add retrieval event with present=false
    if (!pcsResponse || !pcsResponse.present) {
      const query = toolCalls.length > 0 
        ? (toolCalls[0].arguments?.query || toolCalls[0].input?.query || 'integration layer decision')
        : 'integration layer decision';
      
      trace.events.push({
        type: 'retrieval',
        retrieval: {
          present: false,
          source: 'pcs_kernel',
          query: query
        }
      });
    }
    
    // If PCS-ON and we have a policy check response, add policy_check event
    if (policyResponse && policyResponse.present) {
      const event = {
        type: 'policy_check',
        policy_check: {
          present: true,
          decision: policyResponse.decision,
          reason: policyResponse.reason,
          trace_id: policyResponse.trace_id
        }
      };
      
      // Add matched_policy if present (DENY case)
      if (policyResponse.matched_policy) {
        event.policy_check.matched_policy = {
          policy_id: policyResponse.matched_policy.policy_id,
          policy_version: policyResponse.matched_policy.policy_version
        };
      }
      
      // Add evidence_hash if present
      if (policyResponse.evidence_hash) {
        event.policy_check.evidence_hash = policyResponse.evidence_hash;
      }
      
      trace.events.push(event);
    }
    
    return trace;
  }
  
  getModelName(provider) {
    const models = {
      'anthropic': 'claude-sonnet-3.5',
      'openai': 'gpt-4o'
    };
    return models[provider] || 'unknown';
  }
  
  // Normalize from Anthropic tool use format
  normalizeAnthropic(toolUses, pcsResponse = null, policyResponse = null) {
    return this.normalize('anthropic', toolUses, pcsResponse, policyResponse);
  }
  
  // Normalize from OpenAI tool call format
  normalizeOpenAI(toolCalls, pcsResponse = null, policyResponse = null) {
    return this.normalize('openai', toolCalls, pcsResponse, policyResponse);
  }
}

module.exports = new ToolTraceNormalizer();
