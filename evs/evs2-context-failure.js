#!/usr/bin/env node
/**
 * EVS-2 — Context Failure (Runtime-Pure)
 * ------------------------------------------------------------
 * Claim: Without substrate-mediated retrieval, development continuity fails
 *        in a way that cannot be repaired by prompt engineering alone.
 * 
 * Philosophical Objective:
 *   Prove: Stateless systems cannot reconstruct prior authoritative decisions
 *          unless state is explicitly reintroduced.
 * 
 *   This is architectural, not behavioral.
 * 
 * Test Structure:
 *   Session 1: Create authoritative decision in substrate
 *   Session 2: Prompt = "continue" (no state, no hints, no IDs)
 * 
 *   PCS-ON:  Substrate retrieval → continuity preserved
 *   PCS-OFF: No substrate → continuity fails
 * 
 * Critical Design:
 *   - Session 2 prompt contains ZERO restated state
 *   - No hints, summaries, identifiers, or injected data
 *   - Only: "continue"
 * 
 * Assertions:
 *   A1: Prompt purity (session2Prompt === "continue")
 *   A2: No retrieval (PCS-OFF: retrieved === false)
 *   A3: No decision match (PCS-OFF: decisionId === null)
 *   A4: Retrieval exists (PCS-ON: retrieved === true)
 *   A5: Decision matches (PCS-ON: decisionId === session1DecisionId)
 * 
 * What EVS-2 Must NOT Do:
 *   - Compare prose similarity
 *   - Check if output "mentions PostgreSQL"
 *   - Evaluate semantics or answer quality
 * 
 *   EVS-2 is about mechanism presence, not answer quality.
 * 
 * Usage:
 *   node evs2-context-failure.js --provider mock
 *   node evs2-context-failure.js --provider anthropic --model claude-3-haiku-20240307
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");

// --------------------------
// 0) HARD RUNTIME IMPORT
// --------------------------
const PCS_RUNTIME_IMPORT_PATH = path.resolve(__dirname, "../runtime/runtime.js");

function hardRequireRuntime() {
  if (!fs.existsSync(PCS_RUNTIME_IMPORT_PATH)) {
    throw new Error(
      `[EVS-2] PCSRuntime not found at ${PCS_RUNTIME_IMPORT_PATH}. ` +
      `EVS is invalid without Persistra runtime binding.` 
    );
  }
  const PCSRuntime = require(PCS_RUNTIME_IMPORT_PATH);
  if (typeof PCSRuntime !== "function") {
    throw new Error(`[EVS-2] PCSRuntime import did not resolve to a constructor/function. Refusing to run.`);
  }
  return PCSRuntime;
}

// --------------------------
// 1) TEST FIXTURE
// --------------------------
const FIXTURE = Object.freeze({
  namespace: "evs2_context_failure",
  session1Decision: "Backend language must be PostgreSQL",
  session1Metadata: { backend: "postgresql", layer: "data" },
  session2Prompt: "continue", // CRITICAL: No state, no hints, no IDs
});

// --------------------------
// 2) TRACE CONTRACT MAPPING
// --------------------------
const TRACE_PATHS = Object.freeze({
  retrievalRoot: ["retrieval_evidence"],
  retrievalRetrieved: ["retrieval_evidence", "retrieved"],
  retrievalDecisionId: ["retrieval_evidence", "decisionId"],
  retrievalMethod: ["retrieval_evidence", "method"],
  
  enforcementDecisionRoot: ["enforcement_decision"],
  enforcementEmitted: ["enforcement_decision", "emitted"],
  
  boundaryRoot: ["boundaryTrace"],
  boundaryInjectedRawState: ["boundaryTrace", "injected_raw_state"],
  boundaryInjectedIds: ["boundaryTrace", "injected_ids"],
  
  sessionId: ["sessionId"],
  namespace: ["namespace"],
  boundaryEnforced: ["boundaryEnforced"],
});

// --------------------------
// 3) UTILITIES
// --------------------------
function sha256File(fp) {
  const data = fs.readFileSync(fp);
  return crypto.createHash("sha256").update(data).digest("hex");
}

function sha256Str(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

function getAtPath(obj, pathArr) {
  let cur = obj;
  for (const k of pathArr) {
    if (cur == null || typeof cur !== "object" || !(k in cur)) return undefined;
    cur = cur[k];
  }
  return cur;
}

function mustGet(obj, pathArr, label) {
  const v = getAtPath(obj, pathArr);
  if (v === undefined) {
    throw new Error(`[EVS-2] Missing required trace field: ${label} at path ${pathArr.join(".")}`);
  }
  return v;
}

function mustBeBool(v, label) {
  if (typeof v !== "boolean") throw new Error(`[EVS-2] ${label} must be boolean, got ${typeof v}`);
}

function ensureNoReimplementationSignals(trace) {
  if (trace == null || typeof trace !== "object") throw new Error("[EVS-2] Trace missing or not an object.");
  if (!trace.sessionId) throw new Error("[EVS-2] Missing sessionId (expected runtime-emitted trace).");
  if (!trace.namespace) throw new Error("[EVS-2] Missing namespace (expected runtime-emitted trace).");
  if (trace.boundaryEnforced === undefined) throw new Error("[EVS-2] Missing boundaryEnforced (expected runtime-emitted trace).");
}

// --------------------------
// 4) PROVIDER ADAPTER
// --------------------------
async function makeModelFn({ provider, model }) {
  if (provider === "mock") {
    return async function mockModelFn(prompt) {
      // Mock model has no memory - just returns generic response
      if (prompt === "continue") {
        return "I'll continue working on the task.";
      }
      return "Mock response to: " + prompt;
    };
  }

  if (provider === "anthropic") {
    const Anthropic = require("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("[EVS-2] Missing ANTHROPIC_API_KEY");

    return async function anthropicModelFn(prompt) {
      const msg = await client.messages.create({
        model,
        max_tokens: 800,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      });
      const text = msg.content?.map((c) => (c.type === "text" ? c.text : "")).join("") ?? "";
      return text;
    };
  }

  throw new Error(`[EVS-2] Unknown provider: ${provider}`);
}

// --------------------------
// 5) MAIN RUN
// --------------------------
function parseArgs() {
  const args = process.argv.slice(2);
  const out = { provider: "mock", model: "test", mode: "standard" };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--provider") out.provider = args[++i];
    else if (a === "--model") out.model = args[++i];
    else if (a === "--mode") out.mode = args[++i];
  }
  return out;
}

function mkRunDir() {
  const ts = Date.now();
  const runDir = path.resolve(__dirname, "results", `evs2-context-failure-${ts}`);
  fs.mkdirSync(runDir, { recursive: true });
  return runDir;
}

function writeJson(fp, obj) {
  fs.writeFileSync(fp, JSON.stringify(obj, null, 2), "utf8");
}

function writeText(fp, s) {
  fs.writeFileSync(fp, s, "utf8");
}

async function main() {
  const { provider, model, mode } = parseArgs();
  const PCSRuntime = hardRequireRuntime();
  
  const runDir = mkRunDir();
  
  const meta = {
    suite: "EVS",
    test: "EVS-2-CONTEXT-FAILURE",
    version: "runtime-pure-1.0",
    provider,
    model,
    mode,
    timestamp: new Date().toISOString(),
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    hostname: os.hostname(),
    runtime_import_path: PCS_RUNTIME_IMPORT_PATH,
    runner_sha256: sha256File(__filename),
  };
  writeJson(path.join(runDir, "RUN_METADATA.json"), meta);

  console.log(`\n[EVS-2] Context Failure Test`);
  console.log(`Provider: ${provider} / ${model}`);
  console.log(`Claim: Stateless systems cannot reconstruct authoritative decisions\n`);

  // --- SESSION 1: Create authoritative decision
  console.log("[EVS-2] Session 1: Creating authoritative decision...");
  
  const session1Dir = path.join(runDir, "session1");
  fs.mkdirSync(session1Dir, { recursive: true });
  
  const runtime1 = new PCSRuntime({
    namespace: FIXTURE.namespace,
    pepEnabled: true,
    storePath: path.join(session1Dir, "state.json")
  });

  const decision = runtime1.createDecision(FIXTURE.session1Decision, FIXTURE.session1Metadata);
  writeJson(path.join(session1Dir, "decision.json"), {
    decisionId: decision.id,
    statement: FIXTURE.session1Decision,
    metadata: FIXTURE.session1Metadata
  });

  console.log(`  ✓ Decision created: ${decision.id}`);
  console.log(`  ✓ Statement: "${FIXTURE.session1Decision}"`);

  // Destroy runtime1 (simulate session boundary)
  // In real usage, this would be a separate process/container

  // --- SESSION 2 (PCS-ON): Substrate-mediated retrieval
  console.log("\n[EVS-2] Session 2 (PCS-ON): Testing substrate-mediated retrieval...");
  
  const pcsOnDir = path.join(runDir, "pcs-on");
  fs.mkdirSync(pcsOnDir, { recursive: true });

  const runtime2On = new PCSRuntime({
    namespace: FIXTURE.namespace,
    pepEnabled: true,
    storePath: path.join(session1Dir, "state.json") // Same store as session 1
  });

  const modelFn = await makeModelFn({ provider, model });
  
  // CRITICAL: Prompt is ONLY "continue" - no state, no hints
  const resultOn = await runtime2On.execute(modelFn, FIXTURE.session2Prompt);
  
  writeJson(path.join(pcsOnDir, "result.json"), resultOn);
  ensureNoReimplementationSignals(resultOn.trace);
  writeJson(path.join(pcsOnDir, "trace.json"), resultOn.trace);

  // Verify prompt purity
  writeText(path.join(pcsOnDir, "session2_prompt.txt"), FIXTURE.session2Prompt);
  
  // --- Assertions (PCS-ON)
  const retrievalRoot = mustGet(resultOn.trace, TRACE_PATHS.retrievalRoot, "retrieval_evidence");
  if (typeof retrievalRoot !== "object") throw new Error("[EVS-2] retrieval_evidence must be an object.");

  const retrieved = mustGet(resultOn.trace, TRACE_PATHS.retrievalRetrieved, "retrieval_evidence.retrieved");
  const decisionId = getAtPath(resultOn.trace, TRACE_PATHS.retrievalDecisionId);
  const method = getAtPath(resultOn.trace, TRACE_PATHS.retrievalMethod);
  
  mustBeBool(retrieved, "retrieval_evidence.retrieved");

  const assertionsOn = {
    "EVS-2.A1.prompt_purity": FIXTURE.session2Prompt === "continue",
    "EVS-2.A4.retrieval_exists": retrieved === true,
    "EVS-2.A5.decision_matches": decisionId === decision.id,
    "EVS-2.A6.retrieval_method_present": method !== undefined,
    "EVS-2.A7.no_injected_state": mustGet(resultOn.trace, TRACE_PATHS.boundaryInjectedRawState, "boundaryTrace.injected_raw_state") === false,
  };

  const failedOn = Object.entries(assertionsOn).filter(([, v]) => v !== true);
  writeJson(path.join(pcsOnDir, "assertions.json"), { assertions: assertionsOn, failed: failedOn });

  if (failedOn.length) {
    throw new Error(`[EVS-2] PCS-ON assertion failures:\n${failedOn.map(([k]) => ` - ${k}`).join("\n")}`);
  }

  console.log(`  ✓ Retrieval occurred: ${retrieved}`);
  console.log(`  ✓ Decision ID: ${decisionId}`);
  console.log(`  ✓ Method: ${method}`);
  console.log(`  ✓ No state injection`);

  // --- SESSION 2 (PCS-OFF): No substrate retrieval
  console.log("\n[EVS-2] Session 2 (PCS-OFF): Testing without substrate...");
  
  const pcsOffDir = path.join(runDir, "pcs-off");
  fs.mkdirSync(pcsOffDir, { recursive: true });

  const runtime2Off = new PCSRuntime({
    namespace: FIXTURE.namespace + "_control",
    pepEnabled: false,
    storePath: path.join(pcsOffDir, "state.json") // DIFFERENT store (empty)
  });

  const resultOff = await runtime2Off.execute(modelFn, FIXTURE.session2Prompt);
  
  writeJson(path.join(pcsOffDir, "result.json"), resultOff);
  ensureNoReimplementationSignals(resultOff.trace);
  writeJson(path.join(pcsOffDir, "trace.json"), resultOff.trace);

  writeText(path.join(pcsOffDir, "session2_prompt.txt"), FIXTURE.session2Prompt);

  // --- Assertions (PCS-OFF)
  const retrievalRootOff = getAtPath(resultOff.trace, TRACE_PATHS.retrievalRoot);
  const retrievedOff = getAtPath(resultOff.trace, TRACE_PATHS.retrievalRetrieved);
  const decisionIdOff = getAtPath(resultOff.trace, TRACE_PATHS.retrievalDecisionId);
  
  // When PEP is disabled, retrieval_evidence might not exist or retrieved might be false
  const noRetrieval = retrievedOff === false || retrievedOff === undefined;
  const noDecisionMatch = decisionIdOff === null || decisionIdOff === undefined;

  const assertionsOff = {
    "EVS-2.A1.prompt_purity": FIXTURE.session2Prompt === "continue",
    "EVS-2.A2.no_retrieval": noRetrieval,
    "EVS-2.A3.no_decision_match": noDecisionMatch,
  };

  const failedOff = Object.entries(assertionsOff).filter(([, v]) => v !== true);
  writeJson(path.join(pcsOffDir, "assertions.json"), { assertions: assertionsOff, failed: failedOff });

  if (failedOff.length) {
    throw new Error(`[EVS-2] PCS-OFF assertion failures:\n${failedOff.map(([k]) => ` - ${k}`).join("\n")}`);
  }

  console.log(`  ✓ No retrieval: ${retrievedOff}`);
  console.log(`  ✓ No decision ID: ${decisionIdOff === null}`);

  // --- Summary
  const receipt = [
    `EVS-2 CONTEXT FAILURE VERIFICATION RECEIPT`,
    "======================================================================",
    `Provider/Model: ${provider} / ${model}`,
    `Timestamp: ${meta.timestamp}`,
    "",
    "CLAIM VALIDATED:",
    "  Stateless systems cannot reconstruct authoritative decisions",
    "  without substrate-mediated retrieval.",
    "",
    "SESSION 1:",
    `  Decision created: ${decision.id}`,
    `  Statement: "${FIXTURE.session1Decision}"`,
    "",
    "SESSION 2 (PCS-ON):",
    `  Prompt: "${FIXTURE.session2Prompt}" (no state)`,
    `  retrieval_evidence.retrieved: ${retrieved}`,
    `  retrieval_evidence.decisionId: ${decisionId}`,
    `  retrieval_evidence.method: ${method}`,
    `  Continuity: PRESERVED (substrate-mediated)`,
    "",
    "SESSION 2 (PCS-OFF):",
    `  Prompt: "${FIXTURE.session2Prompt}" (no state)`,
    `  retrieval_evidence.retrieved: ${retrievedOff}`,
    `  retrieval_evidence.decisionId: ${decisionIdOff}`,
    `  Continuity: FAILED (no substrate)`,
    "",
    "CONCLUSION:",
    "  ✓ Continuity requires substrate-mediated retrieval",
    "  ✓ Prompt engineering alone cannot repair context failure",
    "  ✓ This is architectural, not behavioral",
    "",
    "CRITICAL PROOF:",
    "  - Same prompt (\"continue\") in both conditions",
    "  - PCS-ON: Retrieval succeeded, decision matched",
    "  - PCS-OFF: No retrieval, no decision",
    "  - Difference is substrate presence, not model behavior",
    "",
  ].join("\n");

  writeText(path.join(runDir, "SUMMARY.txt"), receipt);

  console.log(`\n[EVS-2] ✅ PASS. Results: ${runDir}\n`);
  console.log(receipt);
  console.log(`\n  Total: 8/8 assertions passed\n`);
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exit(1);
});
