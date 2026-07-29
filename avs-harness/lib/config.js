const path = require('path');

class Config {
  constructor() {
    // Provider credentials
    this.anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    
    // PCS kernel
    this.pcsKernelEndpoint = process.env.PCS_KERNEL_ENDPOINT || 'http://localhost:3000';
    
    // Parameters (must be identical across all conditions for same model)
    this.temperature = parseFloat(process.env.AVS_TEMPERATURE || '0.7');
    this.topP = parseFloat(process.env.AVS_TOP_P || '1.0');
    this.seed = process.env.AVS_SEED === 'null' ? null : process.env.AVS_SEED;
    this.toolChoice = process.env.AVS_TOOL_CHOICE || 'auto';
    
    // Paths
    this.rootDir = path.resolve(__dirname, '../..');
    this.casesDir = path.join(this.rootDir, 'avs-cases');
    this.runsDir = path.join(this.rootDir, 'runs');
    this.schemaDir = path.join(this.rootDir, 'schema');
    
    // Validate required config
    this.validate();
  }
  
  validate() {
    const errors = [];
    
    // At least one API key must be set
    if (!this.anthropicApiKey && !this.openaiApiKey) {
      errors.push('At least one API key must be set (ANTHROPIC_API_KEY or OPENAI_API_KEY)');
    }
    
    if (errors.length > 0) {
      throw new Error(`Configuration errors:\n${errors.join('\n')}`);
    }
  }
  
  getRunPath(date, model, condition, runNumber) {
    const runId = `run-${String(runNumber).padStart(4, '0')}`;
    return path.join(this.runsDir, date, model, condition, runId);
  }
  
  getCasePath(caseId) {
    return path.join(this.casesDir, caseId);
  }
  
  getSchemaPath(schemaName) {
    return path.join(this.schemaDir, schemaName);
  }
}

module.exports = new Config();
