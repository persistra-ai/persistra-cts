#!/usr/bin/env node

/**
 * L4 Smoke Runner
 * 
 * Minimal test runner that:
 * - Launches 3 kernel nodes (A, B, C)
 * - Runs ONLY L4.federated.decision-replication
 * - Shuts everything down
 * - Writes one evidence bundle
 * 
 * This proves the plumbing works before touching other scenarios.
 */

const path = require('path');
const fs = require('fs');
const FederatedOrchestrator = require('../src/federated-orchestrator');

class L4SmokeRunner {
  constructor() {
    this.orchestrator = null;
    this.evidence = {
      scenario: null,
      passed: false,
      phases: [],
      errors: []
    };
  }

  // Context helpers for scenario
  createContext() {
    return {
      orchestrator: this.orchestrator,
      assert: (condition, message) => {
        if (!condition) {
          const error = new Error(`Assertion failed: ${message}`);
          this.evidence.errors.push(error.message);
          throw error;
        }
      },
      record: {
        phase: (name, meta = {}) => {
          this.evidence.phases.push({ phase: name, ...meta });
        },
        evidence: (obj) => {
          this.evidence.evidence = obj;
        },
        trace: (obj) => {
          this.evidence.trace = obj;
        }
      }
    };
  }

  async run() {
    console.log('=== L4 Smoke Test ===\n');
    
    try {
      // Load scenario
      const scenarioPath = path.join(__dirname, '../tests/L4/federated/decision-replication.js');
      const scenario = require(scenarioPath);
      
      this.evidence.scenario = scenario.id;
      console.log(`Running: ${scenario.id}`);
      console.log(`Description: ${scenario.description}\n`);

      // Create orchestrator
      const kernelPath = path.join(__dirname, '../../persistra-kernel');
      this.orchestrator = new FederatedOrchestrator({
        kernelPath,
        basePort: 4000
      });

      // Create context
      const ctx = this.createContext();

      // Run scenario
      await scenario.run(ctx);

      this.evidence.passed = true;
      console.log('\n✅ Scenario PASSED\n');

    } catch (error) {
      this.evidence.passed = false;
      this.evidence.errors.push(error.message);
      console.error('\n❌ Scenario FAILED');
      console.error(`Error: ${error.message}\n`);
      console.error(error.stack);
    } finally {
      // Always shutdown
      if (this.orchestrator) {
        try {
          await this.orchestrator.shutdown();
        } catch (error) {
          console.error('Error during shutdown:', error.message);
        }
      }
    }

    // Write evidence
    this.writeEvidence();

    // Exit with appropriate code
    process.exit(this.evidence.passed ? 0 : 1);
  }

  writeEvidence() {
    const outputDir = path.join(__dirname, '../output/l4-smoke');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(outputDir, `smoke-${timestamp}.json`);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write evidence bundle
    fs.writeFileSync(outputPath, JSON.stringify(this.evidence, null, 2));
    
    console.log(`\nEvidence written to: ${outputPath}`);
    console.log('\nSummary:');
    console.log(`  Scenario: ${this.evidence.scenario}`);
    console.log(`  Passed: ${this.evidence.passed}`);
    console.log(`  Phases: ${this.evidence.phases.length}`);
    console.log(`  Errors: ${this.evidence.errors.length}`);
  }
}

// Run
const runner = new L4SmokeRunner();
runner.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
