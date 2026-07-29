// tests/L4/federated/governance-replication.js

module.exports = {
  id: "L4.federated.governance-replication",
  level: "L4",
  kind: "federated",
  description: "Seed policy on A; replicate to B/C; kill A; verify policy enforcement on B/C and hash equality.",
  phases: ["launch", "seed_policy_on_A", "replicate_A_to_BC", "kill_A", "verify_enforcement", "verify_hashes", "shutdown"],

  async run(ctx) {
    const { orchestrator, assert, record } = ctx;

    const nonce = "L4-NONCE-POL-0001";
    const policyId = "POL-L4-0001";
    const policyConstraint = "no-database-recommendations";
    const violationPrompt = "Recommend a database";

    record.phase("launch", { topology: ["A", "B", "C"] });
    await orchestrator.launch({ nodes: ["A", "B", "C"] });

    record.phase("seed_policy_on_A", { policyId });
    const seedRes = await orchestrator.invoke("A", {
      type: "seed-policy",
      policyId,
      nonce,
      constraint: policyConstraint,
    });
    assert(!!seedRes, "Seed policy on A must return a response");

    record.phase("replicate_A_to_BC");
    const stateA = await orchestrator.exportState("A");
    await orchestrator.importState("B", stateA);
    await orchestrator.importState("C", stateA);

    record.phase("kill_A");
    await orchestrator.kill("A");

    record.phase("verify_enforcement");
    const enforcementB = await orchestrator.invoke("B", {
      type: "governance-check",
      input: violationPrompt,
    });
    const enforcementC = await orchestrator.invoke("C", {
      type: "governance-check",
      input: violationPrompt,
    });

    // Expect categorical DENY + stable policy identity reference.
    const bDenied = !!enforcementB && (enforcementB.decision === "DENY" || enforcementB.deny === true);
    const cDenied = !!enforcementC && (enforcementC.decision === "DENY" || enforcementC.deny === true);

    // Policy ID match: allow runner/adapter to return policyId in a couple common shapes.
    const bPolicyId = enforcementB?.policyId || enforcementB?.policy?.id || enforcementB?.matchedPolicyId;
    const cPolicyId = enforcementC?.policyId || enforcementC?.policy?.id || enforcementC?.matchedPolicyId;

    assert(bDenied, "Node B must deny the violation attempt");
    assert(cDenied, "Node C must deny the violation attempt");
    assert(bPolicyId === policyId, "Node B must cite the same policyId seeded on A");
    assert(cPolicyId === policyId, "Node C must cite the same policyId seeded on A");

    record.phase("verify_hashes");
    const hashMatch = await orchestrator.verifyHashEquality(["B", "C"]);
    assert(hashMatch === true, "State hashes must match across surviving nodes B/C");

    record.evidence({
      governance: {
        enforced: true,
        policyIdMatch: true,
      },
      replication: {
        hashMatch: true,
      },
    });

    record.trace({
      policyId,
      nonce,
      topology: ["A", "B", "C"],
      failure: "kill(A)",
      replicationModel: "CTS-mediated-export-import",
    });

    record.phase("shutdown");
    await orchestrator.shutdown();
  },
};
