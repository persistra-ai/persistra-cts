const path = require('path');
const config = require('./config');
const paths = require('./paths');

class CaseLoader {
  loadCase(caseId) {
    const casePath = config.getCasePath(caseId);
    
    // Load prompt
    const promptPath = path.join(casePath, 'inputs', 'invocation_prompt.txt');
    const prompt = paths.readFile(promptPath);
    
    // Load state seed
    const seedPath = path.join(casePath, 'inputs', 'state_seed.json');
    const stateSeed = paths.readJson(seedPath);
    
    // Load expected assertions
    const assertionsPath = path.join(casePath, 'expected_assertions.md');
    const expectedAssertions = paths.readFile(assertionsPath);
    
    return {
      caseId,
      prompt,
      stateSeed,
      expectedAssertions
    };
  }
  
  getModels() {
    return [
      'claude-sonnet-4-6',
      'llama-3.1-8b-instant',
      'gpt-4'
    ];
  }
  
  // Extract nonce and content substring from expected assertions
  parseExpectedAssertions(assertionsMarkdown) {
    // Extract nonce from A1 section
    const nonceMatch = assertionsMarkdown.match(/`([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})`/);
    const nonce = nonceMatch ? nonceMatch[1] : null;
    
    // Extract content substring from A2 section
    // Look for quoted string in code block after "A2 (Decision Content Fidelity)"
    const a2Match = assertionsMarkdown.match(/A2.*?```\s*"([^"]+)"\s*```/s);
    const contentSubstring = a2Match ? a2Match[1] : null;
    
    return { nonce, contentSubstring };
  }
  
  // Extract policy parameters from AVS-2P state seed
  parseAVS2PCase(stateSeed) {
    const policy = stateSeed.policies?.[0];
    const excludedVendor = stateSeed.excludedVendor || 'VendorX';
    const policyId = policy?.policy_id || 'POL-ve2024';
    
    return { 
      policy,
      excludedVendor, 
      policyId 
    };
  }
}

module.exports = new CaseLoader();
