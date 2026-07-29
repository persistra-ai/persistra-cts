// tests/L4/federated/decision-replication.js

module.exports = {
  id: "L4.federated.decision-replication",
  level: "L4",
  kind: "federated",
  description: "Write decision on A; replicate via CTS to B/C; verify reads and hash equality.",
  phases: ["launch", "write_on_A", "replicate_A_to_BC", "verify_reads", "verify_hashes", "shutdown"],

  async run(ctx) {
    const { orchestrator, assert, record } = ctx;

    // Deterministic identifiers (no randomness)
    const nonce = "L4-NONCE-DR-0001";
    const decisionId = "DR-L4-DECISION-0001";
    const decisionContent = "project-alpha => approved";

    record.phase("launch", { topology: ["A", "B", "C"] });
    await orchestrator.launch({ nodes: ["A", "B", "C"] });

    record.phase("write_on_A", { decisionId });
    const seedRes = await orchestrator.invoke("A", {
      type: "seed-decision",
      decisionId,
      nonce,
      content: decisionContent,
    });

    // Minimal categorical check: we got *some* retrieval/trace evidence from A
    assert(!!seedRes, "Seed invocation on A must return a response");

    record.phase("replicate_A_to_BC");
    const stateA = await orchestrator.exportState("A");
    await orchestrator.importState("B", stateA);
    await orchestrator.importState("C", stateA);

    record.phase("verify_reads");
    const readB = await orchestrator.invoke("B", {
      type: "query-decision",
      decisionId,
    });
    const readC = await orchestrator.invoke("C", {
      type: "query-decision",
      decisionId,
    });

    const bPresent = !!readB && (readB.present === true || readB.found === true || !!readB.value || !!readB.result);
    const cPresent = !!readC && (readC.present === true || readC.found === true || !!readC.value || !!readC.result);

    assert(bPresent, "Node B must return decision evidence after replication");
    assert(cPresent, "Node C must return decision evidence after replication");

    record.phase("verify_hashes");
    const hashMatch = await orchestrator.verifyHashEquality(["A", "B", "C"]);
    assert(hashMatch === true, "State hashes must match across A/B/C after explicit replication");

    // Evidence bundle (binary/categorical only)
    record.evidence({
      retrievalEvidence: { present: true },
      replication: { hashMatch: true },
    });

    // Optional trace crumbs (keep deterministic / no timestamps)
    record.trace({
      decisionId,
      nonce,
      topology: ["A", "B", "C"],
      replicationModel: "CTS-mediated-export-import",
    });

    record.phase("shutdown");
    await orchestrator.shutdown();
  },
};
