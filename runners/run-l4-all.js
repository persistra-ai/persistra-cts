#!/usr/bin/env node

/**
 * L4 All Scenarios Runner
 * 
 * Runs all 3 L4 scenarios in order:
 * 1. decision-replication (proves replication plumbing)
 * 2. governance-replication (proves policy persistence + enforcement after kill)
 * 3. nonquorum-node-loss (proves pre-death survives + post-death writes replicate)
 */

const path = require('path');
const fs = require('fs');
const FederatedOrchestrator = require('../src/federated-orchestrator');

const SCENARIOS = [
  'decision-replication',
  'governance-replication',
  'nonquorum-node-loss-survivability'
];

class L4AllRunner {
  constructor() {
    this.results = [];
  }

  createContext(orchestrator) {
    const evidence = {
      phases: [],
      errors: []
    };

    return {
      orchestrator,
      assert: (condition, message) => {
        if (!condition) {
          const error = new Error(`Assertion failed: ${message}`);
          evidence.errors.push(error.message);
          throw error;
        }
      },
      record: {
        phase: (name, meta = {}) => {
          evidence.phases.push({ phase: name, ...meta });
        },
        evidence: (obj) => {
          evidence.evidence = obj;
        },
        trace: (obj) => {
          evidence.trace = obj;
        }
      },
      evidence
    };
  }

  async runScenario(scenarioName) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${scenarioName}`);
    console.log('='.repeat(60));

    const scenarioPath = path.join(__dirname, `../tests/L4/federated/${scenarioName}.js`);
    const scenario = require(scenarioPath);

    console.log(`Description: ${scenario.description}\n`);

    const kernelPath = path.join(__dirname, '../../persistra-kernel');
    const orchestrator = new FederatedOrchestrator({
      kernelPath,
      basePort: 4000
    });

    const ctx = this.createContext(orchestrator);
    const result = {
      scenario: scenario.id,
      passed: false,
      error: null
    };

    try {
      await scenario.run(ctx);
      result.passed = true;
      result.evidence = ctx.evidence;
      console.log('\n✅ PASSED\n');
    } catch (error) {
      result.passed = false;
      result.error = error.message;
      result.evidence = ctx.evidence;
      console.error('\n❌ FAILED');
      console.error(`Error: ${error.message}\n`);
    } finally {
      try {
        await orchestrator.shutdown();
      } catch (error) {
        console.error('Error during shutdown:', error.message);
      }
    }

    return result;
  }

  async run() {
    console.log('=== L4 All Scenarios Runner ===\n');

    for (const scenarioName of SCENARIOS) {
      const result = await this.runScenario(scenarioName);
      this.results.push(result);

      // Stop on first failure
      if (!result.passed) {
        console.error(`\n❌ Stopping due to failure in ${scenarioName}`);
        break;
      }
    }

    this.printSummary();
    this.writeResults();

    const allPassed = this.results.every(r => r.passed);
    process.exit(allPassed ? 0 : 1);
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));

    for (const result of this.results) {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${result.scenario}`);
      if (result.error) {
        console.log(`       Error: ${result.error}`);
      }
    }

    const passCount = this.results.filter(r => r.passed).length;
    const totalCount = this.results.length;
    console.log(`\nTotal: ${passCount}/${totalCount} passed`);
  }

  writeResults() {
    const outputDir = path.join(__dirname, '../output/l4-all');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(outputDir, `all-${timestamp}.json`);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(this.results, null, 2));
    console.log(`\nResults written to: ${outputPath}`);
  }
}

const runner = new L4AllRunner();
runner.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
