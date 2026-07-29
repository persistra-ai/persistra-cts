const path = require('path');
const paths = require('../paths');
const config = require('../config');

class ArtifactWriter {
  writeRunArtifacts(runPath, artifacts) {
    // Ensure run directory exists
    paths.ensureRunDir(runPath);
    
    // Write model output
    const outputPath = path.join(runPath, 'outputs', 'model_output.txt');
    paths.writeFile(outputPath, artifacts.modelOutput);
    
    // Write tool trace
    const tracePath = path.join(runPath, 'outputs', 'tool_trace.json');
    paths.writeJson(tracePath, artifacts.toolTrace);
    
    // Write or update run.json
    const runJsonPath = path.join(runPath, 'run.json');
    paths.writeJson(runJsonPath, artifacts.runJson);
    
    // Write VERIFICATION.md (if provided)
    if (artifacts.verification) {
      const verificationPath = path.join(runPath, 'VERIFICATION.md');
      paths.writeFile(verificationPath, artifacts.verification);
    }
  }
  
  createRunJson(caseId, date, model, condition, parameters, pcs, paste, assertions) {
    const runJson = {
      case_id: caseId,
      date_utc: new Date().toISOString(),
      model: {
        provider: model.provider,
        name: model.name,
        version: model.version
      },
      condition,
      parameters: {
        temperature: parameters.temperature,
        top_p: parameters.topP,
        seed: parameters.seed,
        tool_choice: parameters.toolChoice
      },
      inputs: {
        prompt_file: '../../../../cases/AVS-1R-DECISION-RETRIEVAL/inputs/invocation_prompt.txt',
        seed_file: '../../../../cases/AVS-1R-DECISION-RETRIEVAL/inputs/state_seed.json'
      },
      pcs: {
        enabled: pcs.enabled,
        kernel_endpoint: pcs.enabled ? config.pcsKernelEndpoint : null,
        state_hash: pcs.stateHash || null
      },
      paste: {
        enabled: paste.enabled,
        content_injected: paste.contentInjected
      },
      outputs: {
        model_output_file: 'outputs/model_output.txt',
        tool_trace_file: 'outputs/tool_trace.json'
      },
      harness: {
        commit_sha: '7ced10e922fdfa92ed0a7ffce56efca32593492f',
        version: '1.0.0'
      },
      assertions
    };
    
    return runJson;
  }
}

module.exports = new ArtifactWriter();
