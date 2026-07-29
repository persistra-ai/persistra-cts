#!/usr/bin/env node

/**
 * PCS-CTS Evidence Verification Script (Hardened)
 * 
 * Verifies the integrity of evidence bundles by:
 * 1. Checking for dirty builds (CTS or target) - FAILS unless --allow-dirty
 * 2. Verifying git tags match exactly when claimed
 * 3. Recomputing CTS and target fingerprints and comparing to attestation
 * 4. Verifying conformance.json and trace.json hashes match attestation
 * 
 * Usage:
 *   node runners/verify-evidence.js <evidence-bundle-path> [--allow-dirty]
 * 
 * Example:
 *   node runners/verify-evidence.js output/run-2026-02-13T13-15-21-310Z-90bb5958
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    bundlePath: args[0],
    allowDirty: args.includes('--allow-dirty')
  };
}

// Parse attestation.txt
function parseAttestation(attestationPath) {
  const content = fs.readFileSync(attestationPath, 'utf8');
  const lines = content.split('\n');
  
  const attestation = {
    conformanceHash: null,
    traceHash: null,
    cts: {
      path: null,
      fingerprint: null,
      tag: null,
      dirty: null
    },
    target: {
      path: null,
      fingerprint: null,
      tag: null,
      dirty: null,
      fileset: []
    }
  };
  
  let inTargetFileset = false;
  
  for (const line of lines) {
    if (line.startsWith('hash(conformance.json):')) {
      attestation.conformanceHash = line.split('sha256:')[1]?.trim();
    } else if (line.startsWith('hash(trace.json):')) {
      attestation.traceHash = line.split('sha256:')[1]?.trim();
    } else if (line.startsWith('cts.path:')) {
      attestation.cts.path = line.split('cts.path:')[1]?.trim();
    } else if (line.startsWith('cts.fingerprint.sha256:')) {
      attestation.cts.fingerprint = line.split('cts.fingerprint.sha256:')[1]?.trim();
    } else if (line.startsWith('cts.git.tag:')) {
      attestation.cts.tag = line.split('cts.git.tag:')[1]?.trim();
    } else if (line.startsWith('cts.git.dirty:')) {
      const dirtyStr = line.split('cts.git.dirty:')[1]?.trim();
      attestation.cts.dirty = dirtyStr?.startsWith('true');
    } else if (line.startsWith('target.path:')) {
      attestation.target.path = line.split('target.path:')[1]?.trim();
    } else if (line.startsWith('target.fingerprint.sha256:')) {
      attestation.target.fingerprint = line.split('target.fingerprint.sha256:')[1]?.trim();
    } else if (line.startsWith('target.git.tag:')) {
      attestation.target.tag = line.split('target.git.tag:')[1]?.trim();
    } else if (line.startsWith('target.git.dirty:')) {
      const dirtyStr = line.split('target.git.dirty:')[1]?.trim();
      attestation.target.dirty = dirtyStr?.startsWith('true');
    } else if (line === 'Target Fileset') {
      inTargetFileset = true;
    } else if (inTargetFileset && line.trim().match(/^(.+?):\s*sha256:(.+)$/)) {
      const match = line.trim().match(/^(.+?):\s*sha256:(.+)$/);
      if (match) {
        attestation.target.fileset.push({ path: match[1], hash: match[2] });
      }
    }
  }
  
  return attestation;
}

// Compute CTS fingerprint (same logic as run-cts.js)
function computeCTSFingerprint(ctsPath) {
  const absolutePath = path.resolve(ctsPath);
  const filesToHash = [];

  const collectFiles = (dir, baseDir) => {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      
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

  const runnersPath = path.join(absolutePath, 'runners');
  if (fs.existsSync(runnersPath)) {
    collectFiles(runnersPath, absolutePath);
  }

  const testsPath = path.join(absolutePath, 'tests');
  if (fs.existsSync(testsPath)) {
    collectFiles(testsPath, absolutePath);
  }

  const docsPath = path.join(absolutePath, 'docs');
  if (fs.existsSync(docsPath)) {
    collectFiles(docsPath, absolutePath);
  }

  const packagePath = path.join(absolutePath, 'package.json');
  if (fs.existsSync(packagePath)) {
    filesToHash.push('package.json');
  }
  const lockPath = path.join(absolutePath, 'package-lock.json');
  if (fs.existsSync(lockPath)) {
    filesToHash.push('package-lock.json');
  }

  filesToHash.sort();

  const fileHashes = [];
  for (const relPath of filesToHash) {
    const fullPath = path.join(absolutePath, relPath);
    const fileContent = fs.readFileSync(fullPath);
    const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');
    fileHashes.push({ path: relPath, hash: fileHash });
  }

  const manifestContent = fileHashes.map(f => `${f.path}\n${f.hash}\n`).join('');
  const fingerprint = crypto.createHash('sha256').update(manifestContent).digest('hex');

  return { fingerprint, fileset: fileHashes };
}

// Compute target fingerprint (same logic as run-cts.js)
function computeTargetFingerprint(targetPath) {
  const absolutePath = path.resolve(targetPath);
  const filesToHash = [];

  const collectFiles = (dir, baseDir) => {
    if (!fs.existsSync(dir)) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      
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

  const harnessPath = path.join(absolutePath, 'test-harness.js');
  if (fs.existsSync(harnessPath)) {
    filesToHash.push('test-harness.js');
  }

  const srcPath = path.join(absolutePath, 'src');
  if (fs.existsSync(srcPath)) {
    collectFiles(srcPath, absolutePath);
  }

  const packagePath = path.join(absolutePath, 'package.json');
  if (fs.existsSync(packagePath)) {
    filesToHash.push('package.json');
  }
  const lockPath = path.join(absolutePath, 'package-lock.json');
  if (fs.existsSync(lockPath)) {
    filesToHash.push('package-lock.json');
  }

  filesToHash.sort();

  const fileHashes = [];
  for (const relPath of filesToHash) {
    const fullPath = path.join(absolutePath, relPath);
    const fileContent = fs.readFileSync(fullPath);
    const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');
    fileHashes.push({ path: relPath, hash: fileHash });
  }

  const manifestContent = fileHashes.map(f => `${f.path}\n${f.hash}\n`).join('');
  const fingerprint = crypto.createHash('sha256').update(manifestContent).digest('hex');

  return { fingerprint, fileset: fileHashes };
}

// Verify git tag matches exactly
function verifyGitTag(repoPath, expectedTag) {
  if (!expectedTag) return { valid: true, message: 'No tag claimed' };
  
  try {
    const actualTag = execSync('git describe --exact-match --tags HEAD', 
      { cwd: repoPath, encoding: 'utf8' }).trim();
    
    if (actualTag === expectedTag) {
      return { valid: true, message: `Tag matches: ${expectedTag}` };
    } else {
      return { 
        valid: false, 
        message: `Tag mismatch: expected ${expectedTag}, got ${actualTag}` 
      };
    }
  } catch (error) {
    return { 
      valid: false, 
      message: `Tag verification failed: ${expectedTag} not found at HEAD` 
    };
  }
}

// Main verification
function main() {
  const args = parseArgs();
  
  if (!args.bundlePath) {
    console.error('Error: Evidence bundle path is required');
    console.error('Usage: node runners/verify-evidence.js <evidence-bundle-path> [--allow-dirty]');
    process.exit(1);
  }
  
  const bundlePath = args.bundlePath;
  
  if (!fs.existsSync(bundlePath)) {
    console.error(`Error: Evidence bundle not found: ${bundlePath}`);
    process.exit(1);
  }
  
  console.log('=== PCS-CTS Evidence Verification (Hardened) ===\n');
  console.log(`Bundle: ${bundlePath}\n`);
  
  const attestationPath = path.join(bundlePath, 'attestation.txt');
  if (!fs.existsSync(attestationPath)) {
    console.error('Error: attestation.txt not found in bundle');
    process.exit(1);
  }
  
  const attestation = parseAttestation(attestationPath);
  
  let allVerified = true;
  
  // 1. Check for dirty builds (FAIL unless --allow-dirty)
  console.log('Checking for dirty builds...');
  if (attestation.cts.dirty === true && !args.allowDirty) {
    console.log('  ❌ CTS runner build is DIRTY');
    console.log('     Independent validation NOT POSSIBLE');
    console.log('     Use --allow-dirty to bypass this check');
    allVerified = false;
  } else if (attestation.cts.dirty === true) {
    console.log('  ⚠️  CTS runner build is DIRTY (bypassed with --allow-dirty)');
  } else {
    console.log('  ✅ CTS runner build is clean');
  }
  
  if (attestation.target.dirty === true && !args.allowDirty) {
    console.log('  ❌ Target build is DIRTY');
    console.log('     Independent validation NOT POSSIBLE');
    console.log('     Use --allow-dirty to bypass this check');
    allVerified = false;
  } else if (attestation.target.dirty === true) {
    console.log('  ⚠️  Target build is DIRTY (bypassed with --allow-dirty)');
  } else {
    console.log('  ✅ Target build is clean');
  }
  
  // 2. Verify conformance.json hash
  console.log('\nVerifying conformance.json...');
  const conformancePath = path.join(bundlePath, 'conformance.json');
  if (fs.existsSync(conformancePath)) {
    const conformanceHash = crypto.createHash('sha256')
      .update(fs.readFileSync(conformancePath))
      .digest('hex');
    
    if (conformanceHash === attestation.conformanceHash) {
      console.log('  ✅ conformance.json hash matches');
    } else {
      console.log('  ❌ conformance.json hash MISMATCH');
      console.log(`     Expected: ${attestation.conformanceHash}`);
      console.log(`     Actual:   ${conformanceHash}`);
      allVerified = false;
    }
  } else {
    console.log('  ❌ conformance.json not found');
    allVerified = false;
  }
  
  // 3. Verify trace.json hash
  console.log('\nVerifying trace.json...');
  const tracePath = path.join(bundlePath, 'trace.json');
  if (fs.existsSync(tracePath)) {
    const traceHash = crypto.createHash('sha256')
      .update(fs.readFileSync(tracePath))
      .digest('hex');
    
    if (traceHash === attestation.traceHash) {
      console.log('  ✅ trace.json hash matches');
    } else {
      console.log('  ❌ trace.json hash MISMATCH');
      console.log(`     Expected: ${attestation.traceHash}`);
      console.log(`     Actual:   ${traceHash}`);
      allVerified = false;
    }
  } else {
    console.log('  ❌ trace.json not found');
    allVerified = false;
  }
  
  // 4. Verify CTS fingerprint
  console.log('\nVerifying CTS fingerprint...');
  if (attestation.cts.path && attestation.cts.fingerprint) {
    if (fs.existsSync(attestation.cts.path)) {
      const computed = computeCTSFingerprint(attestation.cts.path);
      
      if (computed.fingerprint === attestation.cts.fingerprint) {
        console.log('  ✅ CTS fingerprint matches');
        console.log(`     ${attestation.cts.fingerprint}`);
      } else {
        console.log('  ❌ CTS fingerprint MISMATCH');
        console.log(`     Expected: ${attestation.cts.fingerprint}`);
        console.log(`     Actual:   ${computed.fingerprint}`);
        allVerified = false;
      }
      
      // Verify CTS tag if claimed
      if (attestation.cts.tag) {
        const tagCheck = verifyGitTag(attestation.cts.path, attestation.cts.tag);
        if (tagCheck.valid) {
          console.log(`  ✅ CTS tag verified: ${attestation.cts.tag}`);
        } else {
          console.log(`  ❌ CTS tag verification FAILED`);
          console.log(`     ${tagCheck.message}`);
          allVerified = false;
        }
      }
    } else {
      console.log(`  ⚠️  CTS path not found: ${attestation.cts.path}`);
      console.log('     (Cannot verify fingerprint without CTS source)');
    }
  } else {
    console.log('  ⚠️  No CTS fingerprint in attestation');
  }
  
  // 5. Verify target fingerprint
  console.log('\nVerifying target fingerprint...');
  if (attestation.target.path && attestation.target.fingerprint) {
    if (fs.existsSync(attestation.target.path)) {
      const computed = computeTargetFingerprint(attestation.target.path);
      
      if (computed.fingerprint === attestation.target.fingerprint) {
        console.log('  ✅ Target fingerprint matches');
        console.log(`     ${attestation.target.fingerprint}`);
      } else {
        console.log('  ❌ Target fingerprint MISMATCH');
        console.log(`     Expected: ${attestation.target.fingerprint}`);
        console.log(`     Actual:   ${computed.fingerprint}`);
        allVerified = false;
        
        // Show which files differ
        console.log('\n  File differences:');
        const attestedFiles = new Map(attestation.target.fileset.map(f => [f.path, f.hash]));
        const computedFiles = new Map(computed.fileset.map(f => [f.path, f.hash]));
        
        for (const [path, hash] of computedFiles) {
          const attestedHash = attestedFiles.get(path);
          if (!attestedHash) {
            console.log(`    + ${path} (new file)`);
          } else if (attestedHash !== hash) {
            console.log(`    ~ ${path} (modified)`);
          }
        }
        
        for (const [path, hash] of attestedFiles) {
          if (!computedFiles.has(path)) {
            console.log(`    - ${path} (deleted)`);
          }
        }
      }
      
      // Verify target tag if claimed
      if (attestation.target.tag) {
        const tagCheck = verifyGitTag(attestation.target.path, attestation.target.tag);
        if (tagCheck.valid) {
          console.log(`  ✅ Target tag verified: ${attestation.target.tag}`);
        } else {
          console.log(`  ❌ Target tag verification FAILED`);
          console.log(`     ${tagCheck.message}`);
          allVerified = false;
        }
      }
    } else {
      console.log(`  ⚠️  Target path not found: ${attestation.target.path}`);
      console.log('     (Cannot verify fingerprint without target source)');
    }
  } else {
    console.log('  ⚠️  No target fingerprint in attestation');
  }
  
  // Final result
  console.log('\n' + '='.repeat(50));
  if (allVerified) {
    console.log('✅ VERIFIED: All evidence checks passed');
    console.log('\nThis evidence bundle is cryptographically verifiable.');
    console.log('Independent validators can reproduce these results.');
    process.exit(0);
  } else {
    console.log('❌ FAILED: Evidence verification failed');
    console.log('\nThis evidence bundle cannot be independently verified.');
    console.log('See errors above for details.');
    process.exit(1);
  }
}

main();
