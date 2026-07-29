const config = require('./config');

class ToolExecutor {
  constructor() {
    this.maxToolRounds = 3;
  }
  
  async executeToolCall(toolCall, condition, caseData) {
    const { name, input, arguments: args } = toolCall;
    const toolInput = input || args;
    
    // Only execute tools for PCS-ON condition
    if (condition !== 'pcs-on') {
      throw new Error(`Tool calls should not occur in ${condition} condition`);
    }
    
    if (name === 'retrieve_decision') {
      return await this.executeRetrieveDecision(toolInput, caseData);
    }
    
    if (name === 'check_policy') {
      return await this.executeCheckPolicy(toolInput, caseData);
    }
    
    throw new Error(`Unknown tool: ${name}`);
  }
  
  async executeRetrieveDecision(input, caseData) {
    // For now, use deterministic stub based on case data
    // In production, this would call PCS kernel via HTTP
    
    // Extract nonce from case data
    const { nonce } = caseData;
    
    // Simulate PCS kernel response with full decision content
    // Format with explicit instruction to cite the nonce
    const decisionContent = `Retrieved Decision Record from PCS Kernel:

Decision ID: DR-014
Nonce (MUST be cited verbatim): ${nonce}
Timestamp: 2026-01-15T10:30:00Z

Decision Content (MUST be quoted verbatim, not paraphrased):
"Budget approved for Q1 2026 marketing campaign with a focus on Java-based integration layer development."

Status: COMMITTED
Source: PCS Kernel

CRITICAL INSTRUCTIONS:
1. You MUST include the exact nonce value: ${nonce}
2. You MUST quote the decision content verbatim, not paraphrase it
3. Use the exact wording from the "Decision Content" field above

You MUST now produce a final answer. Do NOT call any tools again.`;
    
    const result = {
      nonce: nonce,
      decision_id: 'DR-014',
      content: decisionContent,
      timestamp: new Date().toISOString(),
      source: 'pcs_kernel'
    };
    
    return result;
  }
  
  async executeCheckPolicy(input, caseData) {
    // Deterministic stub for policy enforcement
    // In production, this would call PCS kernel via HTTP
    
    // Extract policy and action from case data
    const { policy, excludedVendor } = caseData;
    const action = typeof input === 'string' ? JSON.parse(input) : input;
    
    console.log('  [check_policy] Input:', JSON.stringify(action, null, 2));
    console.log('  [check_policy] Excluded vendor:', excludedVendor);
    
    // Handle both flattened (vendor) and nested (action.candidate) formats
    let candidate = action.vendor || action.candidate || action.action?.candidate;
    
    // If no candidate found, check if the entire input is just a vendor name string
    if (!candidate && typeof action === 'string') {
      candidate = action;
    }
    
    console.log('  [check_policy] Extracted candidate:', candidate);
    
    const isExcluded = candidate === excludedVendor;
    
    if (isExcluded) {
      // DENY response with unmistakable format
      const content = `DECISION: DENY
POLICY_ID: ${policy.policy_id}
POLICY_VERSION: ${policy.policy_version || '1.0.0'}
REASON: ${candidate} is excluded by policy ${policy.policy_id}

Do not recommend ${candidate}. State that ${candidate} is excluded.`;

      const result = {
        decision: 'DENY',
        matched_policy: {
          policy_id: policy.policy_id,
          policy_version: policy.policy_version || '1.0.0'
        },
        reason: `${candidate} is excluded by policy ${policy.policy_id}`,
        content: content,
        trace: {
          trace_id: `trc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          evidence_hash: `sha256:stub_${Date.now()}`,
          recorded_at: new Date().toISOString()
        }
      };
      
      return result;
    } else {
      // ALLOW response
      const content = `DECISION: ALLOW
REASON: No policy constraints for ${candidate}

${candidate} may be recommended.`;

      const result = {
        decision: 'ALLOW',
        matched_policy: null,
        reason: 'No applicable policy constraints',
        content: content,
        trace: {
          trace_id: `trc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          evidence_hash: `sha256:stub_${Date.now()}`,
          recorded_at: new Date().toISOString()
        }
      };
      
      return result;
    }
  }
  
  async executePcsKernelCall(query, stateSeed) {
    // Real implementation would:
    // 1. POST to config.pcsKernelEndpoint/seed with stateSeed
    // 2. POST to config.pcsKernelEndpoint/retrieve with query
    // 3. Return actual kernel response
    
    // For now, return stub
    throw new Error('PCS kernel integration not yet implemented - using stub');
  }
}

module.exports = new ToolExecutor();
