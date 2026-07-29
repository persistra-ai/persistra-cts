#!/usr/bin/env node

/**
 * PCS-CTS Runner (Stub)
 * 
 * Minimal CLI plumbing for executing PCS-CTS scenarios and emitting evidence artifacts.
 * 
 * Usage:
 *   node runners/run-cts.js --target <path-to-implementation> [--scenario <scenario-id>] [--clean] [--allow-dirty]
 * 
 * Output:
 *   output/<run-id>/conformance.json
 *   output/<run-id>/trace.json
 *   output/<run-id>/attestation.txt
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    target: null,
    scenario: null,
    clean: false,
    allowDirty: false
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target' && args[i + 1]) {
      parsed.target = args[i + 1];
      i++;
    } else if (args[i] === '--scenario' && args[i + 1]) {
      parsed.scenario = args[i + 1];
      i++;
    } else if (args[i] === '--clean') {
      parsed.clean = true;
    } else if (args[i] === '--allow-dirty') {
      parsed.allowDirty = true;
    }
  }

  return parsed;
}

// Generate run ID
function generateRunId() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const nonce = crypto.randomBytes(4).toString('hex');
  return `run-${timestamp}-${nonce}`;
}

// Ensure output directory exists
function ensureOutputDir(runId) {
  const outputDir = path.join(__dirname, '..', 'output', runId);
  fs.mkdirSync(outputDir, { recursive: true });
  return outputDir;
}

// Load a scenario module
function loadScenario(scenarioId) {
  if (!scenarioId) {
    throw new Error('Scenario ID is required');
  }

  // Map scenario ID to file path
  // Format: L1.persistence.decision-state-recovery -> tests/L1/persistence/decision-state-recovery.js
  const parts = scenarioId.split('.');
  if (parts.length < 3) {
    throw new Error(`Invalid scenario ID format: ${scenarioId}`);
  }

  const level = parts[0]; // L1, L2, etc.
  const category = parts[1]; // persistence, governance, etc.
  const name = parts.slice(2).join('-'); // decision-state-recovery

  const scenarioPath = path.join(__dirname, '..', 'tests', level, category, `${name}.js`);
  
  if (!fs.existsSync(scenarioPath)) {
    throw new Error(`Scenario not found: ${scenarioPath}`);
  }

  return require(scenarioPath);
}

// Run a scenario
async function runScenario(targetPath, scenarioId, cleanRequested = false) {
  console.log(`[PCS-CTS] Target: ${targetPath}`);
  console.log(`[PCS-CTS] Scenario: ${scenarioId || 'none specified'}`);

  const timestampStart = new Date().toISOString();

  // Load scenario module
  const scenario = loadScenario(scenarioId);
  console.log(`[PCS-CTS] Loaded: ${scenario.name}`);

  // Load target implementation
  const targetHarnessPath = path.resolve(targetPath, 'test-harness.js');
  
  if (!fs.existsSync(targetHarnessPath)) {
    throw new Error(`Target harness not found: ${targetHarnessPath}\nExpected: <target>/test-harness.js`);
  }

  const TargetHarness = require(targetHarnessPath);
  const target = new TargetHarness();

  // Handle --clean flag
  let cleanPerformed = false;
  if (cleanRequested) {
    if (typeof target.resetState === 'function') {
      console.log(`[PCS-CTS] Resetting state (--clean)...`);
      await target.resetState();
      cleanPerformed = true;
    } else {
      console.log(`[PCS-CTS] Warning: Target does not expose resetState(), continuing without clean`);
    }
  }

  console.log(`[PCS-CTS] Status: Running scenario...`);

  // Execute scenario
  const { passed, trace } = await scenario.run(target);

  const timestampEnd = new Date().toISOString();

  // Build conformance result
  const conformance = {
    pcs_spec_version: 'v0.1-draft',
    pcs_cts_version: '0.1.0',
    implementation_id: path.basename(targetPath),
    levels_evaluated: [scenario.level],
    scenarios: [
      {
        id: scenario.id,
        name: scenario.name,
        passed: passed
      }
    ],
    passed: passed,
    timestamp_start: timestampStart,
    timestamp_end: timestampEnd,
    clean_state: {
      requested: cleanRequested,
      performed: cleanPerformed
    },
    cts_build: {
      commit: null,  // Will be populated in main()
      tag: null,
      dirty: null
    },
    target_build: {
      commit: null,  // Will be populated in main()
      tag: null,
      dirty: null
    }
  };

  return { conformance, trace, targetPath };
}

// Compute CTS fingerprint (same method as target)
function computeCTSFingerprint(allowDirty = false) {
  const ctsDir = path.join(__dirname, '..');
  const absolutePath = path.resolve(ctsDir);
  const filesToHash = [];

  // Collect files to hash
  const collectFiles = (dir, baseDir) => {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      
      // Skip node_modules, .git, output directories
      if (entry.name === 'node_modules' || entry.name === '.git' || 
          entry.name === 'output' || entry.name === '.github') {
        continue;
      }
      
      if (entry.isDirectory()) {
        collectFiles(fullPath, baseDir);
      } else if (entry.isFile()) {
        filesToHash.push(relativePath);
      }
    }
  };

  // Collect runners/**
  const runnersPath = path.join(absolutePath, 'runners');
  if (fs.existsSync(runnersPath)) {
    collectFiles(runnersPath, absolutePath);
  }

  // Collect tests/**
  const testsPath = path.join(absolutePath, 'tests');
  if (fs.existsSync(testsPath)) {
    collectFiles(testsPath, absolutePath);
  }

  // Collect docs/**
  const docsPath = path.join(absolutePath, 'docs');
  if (fs.existsSync(docsPath)) {
    collectFiles(docsPath, absolutePath);
  }

  // Collect package.json and lockfiles
  const ctsPackagePath = path.join(absolutePath, 'package.json');
  if (fs.existsSync(ctsPackagePath)) {
    filesToHash.push('package.json');
  }
  const ctsLockPath = path.join(absolutePath, 'package-lock.json');
  if (fs.existsSync(ctsLockPath)) {
    filesToHash.push('package-lock.json');
  }

  // Sort files lexicographically
  filesToHash.sort();

  // Compute individual file hashes and build manifest
  const fileHashes = [];
  for (const relPath of filesToHash) {
    const fullPath = path.join(absolutePath, relPath);
    const fileContent = fs.readFileSync(fullPath);
    const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');
    fileHashes.push({ path: relPath, hash: fileHash });
  }

  // Compute overall fingerprint: SHA256(concat(filePath + '\n' + fileHash + '\n'))
  const manifestContent = fileHashes.map(f => `${f.path}\n${f.hash}\n`).join('');
  const fingerprint = crypto.createHash('sha256').update(manifestContent).digest('hex');

  // Get git metadata if available
  let gitCommit = null;
  let gitTag = null;
  let gitDirty = null;
  try {
    const gitDir = path.join(absolutePath, '.git');
    if (fs.existsSync(gitDir)) {
      gitCommit = execSync('git rev-parse HEAD', { cwd: absolutePath, encoding: 'utf8' }).trim();
      try {
        gitTag = execSync('git describe --exact-match --tags HEAD', { cwd: absolutePath, encoding: 'utf8' }).trim();
      } catch (e) {
        gitTag = null;
      }
      const gitStatus = execSync('git status --porcelain', { cwd: absolutePath, encoding: 'utf8' });
      gitDirty = gitStatus.length > 0;
      
      // FAIL if dirty build unless explicitly allowed
      if (gitDirty && !allowDirty) {
        throw new Error(
          `CTS runner build is DIRTY (uncommitted changes detected).\n` +
          `This prevents independent verification of evidence bundles.\n` +
          `\n` +
          `Options:\n` +
          `  1. Commit your changes and re-run\n` +
          `  2. Use --allow-dirty to generate UNVERIFIED evidence\n` +
          `\n` +
          `Dirty files:\n${gitStatus}`
        );
      }
    }
  } catch (error) {
    if (error.message.includes('DIRTY')) {
      throw error; // Re-throw dirty build errors
    }
    // Git not available or not a git repo
  }
  
  // Get package.json dependencies if available
  let dependencies = null;
  if (fs.existsSync(ctsPackagePath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(ctsPackagePath, 'utf8'));
      dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
    } catch (e) {
      // Package.json parse error
    }
  }

  return {
    path: absolutePath,
    fingerprint: fingerprint,
    fileset: fileHashes,
    git: {
      commit: gitCommit,
      tag: gitTag,
      dirty: gitDirty
    },
    dependencies: dependencies,
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };
}

// Compute target fingerprint
function computeTargetFingerprint(targetPath, allowDirty = false) {
  const absolutePath = path.resolve(targetPath);
  const filesToHash = [];

  // Collect files to hash
  const collectFiles = (dir, baseDir) => {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      
      // Skip node_modules, .git, .state, output directories
      if (entry.name === 'node_modules' || entry.name === '.git' || 
          entry.name === '.state' || entry.name === 'output') {
        continue;
      }
      
      if (entry.isDirectory()) {
        collectFiles(fullPath, baseDir);
      } else if (entry.isFile()) {
        filesToHash.push(relativePath);
      }
    }
  };

  // Collect test-harness.js
  const harnessPath = path.join(absolutePath, 'test-harness.js');
  if (fs.existsSync(harnessPath)) {
    filesToHash.push('test-harness.js');
  }

  // Collect src/**
  const srcPath = path.join(absolutePath, 'src');
  if (fs.existsSync(srcPath)) {
    collectFiles(srcPath, absolutePath);
  }

  // Collect package.json and lockfiles
  const packagePath = path.join(absolutePath, 'package.json');
  if (fs.existsSync(packagePath)) {
    filesToHash.push('package.json');
  }
  const lockPath = path.join(absolutePath, 'package-lock.json');
  if (fs.existsSync(lockPath)) {
    filesToHash.push('package-lock.json');
  }

  // Sort files lexicographically
  filesToHash.sort();

  // Compute individual file hashes and build manifest
  const fileHashes = [];
  for (const relPath of filesToHash) {
    const fullPath = path.join(absolutePath, relPath);
    const fileContent = fs.readFileSync(fullPath);
    const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');
    fileHashes.push({ path: relPath, hash: fileHash });
  }

  // Compute overall fingerprint: SHA256(concat(filePath + '\n' + fileHash + '\n'))
  const manifestContent = fileHashes.map(f => `${f.path}\n${f.hash}\n`).join('');
  const fingerprint = crypto.createHash('sha256').update(manifestContent).digest('hex');

  // Get git metadata if available
  let gitCommit = null;
  let gitTag = null;
  let gitDirty = null;
  try {
    const gitDir = path.join(absolutePath, '.git');
    if (fs.existsSync(gitDir)) {
      gitCommit = execSync('git rev-parse HEAD', { cwd: absolutePath, encoding: 'utf8' }).trim();
      try {
        gitTag = execSync('git describe --exact-match --tags HEAD', { cwd: absolutePath, encoding: 'utf8' }).trim();
      } catch (e) {
        gitTag = null;
      }
      const gitStatus = execSync('git status --porcelain', { cwd: absolutePath, encoding: 'utf8' });
      gitDirty = gitStatus.length > 0;
      
      // FAIL if dirty build unless explicitly allowed
      if (gitDirty && !allowDirty) {
        throw new Error(
          `Target build is DIRTY (uncommitted changes detected).\n` +
          `This prevents independent verification of evidence bundles.\n` +
          `\n` +
          `Options:\n` +
          `  1. Commit your changes and re-run\n` +
          `  2. Use --allow-dirty to generate UNVERIFIED evidence\n` +
          `\n` +
          `Dirty files:\n${gitStatus}`
        );
      }
    }
  } catch (error) {
    if (error.message.includes('DIRTY')) {
      throw error; // Re-throw dirty build errors
    }
    // Git not available or not a git repo
  }
  
  // Get package.json dependencies if available
  let dependencies = null;
  const targetPackagePath = path.join(absolutePath, 'package.json');
  if (fs.existsSync(targetPackagePath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(targetPackagePath, 'utf8'));
      dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
    } catch (e) {
      // Package.json parse error
    }
  }

  return {
    path: absolutePath,
    fingerprint: fingerprint,
    fileset: fileHashes,
    git: {
      commit: gitCommit,
      tag: gitTag,
      dirty: gitDirty
    },
    dependencies: dependencies,
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };
}

// Generate attestation
function generateAttestation(conformancePath, tracePath, conformance, ctsFingerprint, targetFingerprint) {
  const conformanceHash = crypto.createHash('sha256')
    .update(fs.readFileSync(conformancePath))
    .digest('hex');
  
  const traceHash = crypto.createHash('sha256')
    .update(fs.readFileSync(tracePath))
    .digest('hex');

  let attestation = `PCS-CTS Attestation
timestamp: ${new Date().toISOString()}
pcs_spec_version: ${conformance.pcs_spec_version}
pcs_cts_version: ${conformance.pcs_cts_version}
hash(conformance.json): sha256:${conformanceHash}
hash(trace.json): sha256:${traceHash}
runtime: node ${process.version}
os: ${process.platform} ${process.arch}
\n`;

  // Add CTS fingerprint
  attestation += `CTS Runner Build Fingerprint\n`;
  
  if (ctsFingerprint) {
    attestation += `cts.path: ${ctsFingerprint.path}\n`;
    attestation += `cts.fingerprint.sha256: ${ctsFingerprint.fingerprint}\n`;
    attestation += `cts.fileset.count: ${ctsFingerprint.fileset.length}\n`;
    attestation += `cts.runtime.node: ${ctsFingerprint.runtime.node}\n`;
    attestation += `cts.runtime.platform: ${ctsFingerprint.runtime.platform}\n`;
    attestation += `cts.runtime.arch: ${ctsFingerprint.runtime.arch}\n`;
    
    if (ctsFingerprint.git.commit) {
      attestation += `cts.git.commit: ${ctsFingerprint.git.commit}\n`;
      if (ctsFingerprint.git.tag) {
        attestation += `cts.git.tag: ${ctsFingerprint.git.tag}\n`;
      }
      if (ctsFingerprint.git.dirty === true) {
        attestation += `cts.git.dirty: true (UNVERIFIED BUILD - INDEPENDENT VALIDATION NOT POSSIBLE)\n`;
      } else {
        attestation += `cts.git.dirty: false\n`;
      }
    }
    
    if (ctsFingerprint.dependencies) {
      attestation += `cts.dependencies.count: ${Object.keys(ctsFingerprint.dependencies).length}\n`;
    }
  }
  
  attestation += `\n`;

  // Add target fingerprint
  if (targetFingerprint) {
    attestation += `Target Build Fingerprint\n`;
    attestation += `target.path: ${targetFingerprint.path}\n`;
    attestation += `target.fingerprint.sha256: ${targetFingerprint.fingerprint}\n`;
    attestation += `target.fileset.count: ${targetFingerprint.fileset.length}\n`;
    attestation += `target.runtime.node: ${targetFingerprint.runtime.node}\n`;
    attestation += `target.runtime.platform: ${targetFingerprint.runtime.platform}\n`;
    attestation += `target.runtime.arch: ${targetFingerprint.runtime.arch}\n`;
    
    if (targetFingerprint.git.commit) {
      attestation += `target.git.commit: ${targetFingerprint.git.commit}\n`;
      if (targetFingerprint.git.tag) {
        attestation += `target.git.tag: ${targetFingerprint.git.tag}\n`;
      }
      if (targetFingerprint.git.dirty === true) {
        attestation += `target.git.dirty: true (UNVERIFIED BUILD - INDEPENDENT VALIDATION NOT POSSIBLE)\n`;
      } else {
        attestation += `target.git.dirty: false\n`;
      }
    }
    
    if (targetFingerprint.dependencies) {
      attestation += `target.dependencies.count: ${Object.keys(targetFingerprint.dependencies).length}\n`;
    }
    
    attestation += `\nTarget Fileset\n`;
    for (const file of targetFingerprint.fileset) {
      attestation += `  ${file.path}: sha256:${file.hash}\n`;
    }
  }

  return attestation;
}

// Main execution
async function main() {
  const args = parseArgs();

  if (!args.target) {
    console.error('Error: --target <path-to-implementation> is required');
    console.error('Usage: node runners/run-cts.js --target <path> [--scenario <id>] [--clean] [--allow-dirty]');
    process.exit(1);
  }

  console.log('=== PCS-CTS Runner (Stub) ===\n');

  const runId = generateRunId();
  const outputDir = ensureOutputDir(runId);

  console.log(`[PCS-CTS] Run ID: ${runId}`);
  console.log(`[PCS-CTS] Output: ${outputDir}\n`);

  // Compute CTS fingerprint (with dirty build check)
  console.log(`[PCS-CTS] Computing CTS fingerprint...`);
  const ctsFingerprint = computeCTSFingerprint(args.allowDirty);
  
  // Run scenario
  const { conformance, trace, targetPath } = await runScenario(args.target, args.scenario, args.clean);

  // Compute target fingerprint (with dirty build check)
  console.log(`[PCS-CTS] Computing target fingerprint...`);
  const targetFingerprint = computeTargetFingerprint(targetPath, args.allowDirty);
  
  // Populate build metadata in conformance
  conformance.cts_build = {
    commit: ctsFingerprint.git.commit,
    tag: ctsFingerprint.git.tag,
    dirty: ctsFingerprint.git.dirty,
    fingerprint: ctsFingerprint.fingerprint
  };
  conformance.target_build = {
    commit: targetFingerprint.git.commit,
    tag: targetFingerprint.git.tag,
    dirty: targetFingerprint.git.dirty,
    fingerprint: targetFingerprint.fingerprint
  };

  // Write conformance.json
  const conformancePath = path.join(outputDir, 'conformance.json');
  fs.writeFileSync(conformancePath, JSON.stringify(conformance, null, 2));
  console.log(`[PCS-CTS] Written: conformance.json`);

  // Write trace.json
  const tracePath = path.join(outputDir, 'trace.json');
  fs.writeFileSync(tracePath, JSON.stringify(trace, null, 2));
  console.log(`[PCS-CTS] Written: trace.json`);

  // Write attestation.txt
  const attestation = generateAttestation(conformancePath, tracePath, conformance, ctsFingerprint, targetFingerprint);
  const attestationPath = path.join(outputDir, 'attestation.txt');
  fs.writeFileSync(attestationPath, attestation);
  console.log(`[PCS-CTS] Written: attestation.txt`);
  console.log(`[PCS-CTS] CTS fingerprint: ${ctsFingerprint.fingerprint.substring(0, 16)}...`);
  console.log(`[PCS-CTS] Target fingerprint: ${targetFingerprint.fingerprint.substring(0, 16)}...`);

  console.log(`\n[PCS-CTS] Evidence bundle: ${outputDir}`);
  console.log(`[PCS-CTS] Result: ${conformance.passed ? 'PASS' : 'FAIL'}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
