// tests/L4/federated/nonquorum-node-loss-survivability.js

module.exports = {
  id: "L4.federated.nonquorum-node-loss-survivability",
  level: "L4",
  kind: "federated",
  description:
    "Replicate pre-death state; kill A; verify pre-death query on B; write new state on B; replicate to C; verify post-death query on C; hashes match B/C.",
  phases: [
    "launch",
    "seed_predeath_on_A",
    "replicate_A_to_BC",
    "kill_A",
    "verify_predeath_on_B",
    "write_postdeath_on_B",
    "replicate_B_to_C",
    "verify_postdeath_on_C",
    "verify_hashes",
    "shutdown",
  ],

  async run(ctx) {
    const { orchestrator, assert, record } = ctx;

    const noncePre = "L4-NONCE-PRE-0001";
    const decisionIdPre = "DR-L4-PRE-0001";
    const contentPre = "task-123 => completed";

    const noncePost = "L4-NONCE-POST-0001";
    const decisionIdPost = "DR-L4-POST-0001";
    const contentPost = "task-456 => pending";

    record.phase("launch", { topology: ["A", "B", "C"] });
    await orchestrator.launch({ nodes: ["A", "B", "C"] });

    record.phase("seed_predeath_on_A", { decisionIdPre });
    const seedPre = await orchestrator.invoke("A", {
      type: "seed-decision",
      decisionId: decisionIdPre,
      nonce: noncePre,
      content: contentPre,
    });
    assert(!!seedPre, "Pre-death seed on A must return a response");

    record.phase("replicate_A_to_BC");
    const stateA = await orchestrator.exportState("A");
    await orchestrator.importState("B", stateA);
    await orchestrator.importState("C", stateA);

    record.phase("kill_A");
    await orchestrator.kill("A");

    record.phase("verify_predeath_on_B", { decisionIdPre });
    const readPreB = await orchestrator.invoke("B", {
      type: "query-decision",
      decisionId: decisionIdPre,
    });
    const prePresent = !!readPreB && (readPreB.present === true || readPreB.found === true || !!readPreB.value || !!readPreB.result);
    assert(prePresent, "Node B must return the pre-death decision after A is killed");

    record.phase("write_postdeath_on_B", { decisionIdPost });
    const seedPost = await orchestrator.invoke("B", {
      type: "seed-decision",
      decisionId: decisionIdPost,
      nonce: noncePost,
      content: contentPost,
    });
    assert(!!seedPost, "Post-death seed on B must return a response");

    record.phase("replicate_B_to_C");
    const stateB = await orchestrator.exportState("B");
    await orchestrator.importState("C", stateB);

    record.phase("verify_postdeath_on_C", { decisionIdPost });
    const readPostC = await orchestrator.invoke("C", {
      type: "query-decision",
      decisionId: decisionIdPost,
    });
    const postPresent = !!readPostC && (readPostC.present === true || readPostC.found === true || !!readPostC.value || !!readPostC.result);
    assert(postPresent, "Node C must return the post-death decision replicated from B");

    record.phase("verify_hashes");
    const hashMatch = await orchestrator.verifyHashEquality(["B", "C"]);
    assert(hashMatch === true, "State hashes must match across survivors B/C after explicit replication");

    record.evidence({
      survivability: {
        preDeath: { present: true },
        postDeath: { present: true },
      },
      replication: { hashMatch: true },
    });

    record.trace({
      topology: ["A", "B", "C"],
      failure: "kill(A)",
      pre: { decisionId: decisionIdPre, nonce: noncePre },
      post: { decisionId: decisionIdPost, nonce: noncePost },
      replicationModel: "CTS-mediated-export-import",
    });

    record.phase("shutdown");
    await orchestrator.shutdown();
  },
};
