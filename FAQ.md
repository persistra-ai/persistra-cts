# Frequently Asked Questions (FAQ)

**Quick answers to common questions about PCS validation, demos, and architecture**

---

## General Questions

### What is PCS?

**PCS (Persistent Cognitive Substrate)** is external cognitive infrastructure for AI systems. It's the runtime layer that owns state, continuity, constraints, and context so any model can work reliably over unlimited horizons without losing the plot.

**Key insight:** PCS reframes AI systems as **model + substrate**, not just model with compensatory layers.

**For more:** Read [START_HERE.md](START_HERE.md)

---

**Status:** Evaluation release for research and validation purposes.

**What's ready:**
- ✅ 26 validation tests passing (312+ assertions)
- ✅ Acts 1-9 demo complete
- ✅ Tenstorrent CSE validation (Phase 1 complete)
- ✅ Tutorial
- ✅ Reference implementation (29 modules, ~104k lines)

**What's not included:**
- Production deployment capabilities
- Team coordination features
- Enterprise features
- Commercial support

### Can I use this commercially?

**Evaluation release:** Available for evaluation and research purposes

**Commercial use:** Requires separate licensing

**Patent notice:** Architectural primitives, methods, and systems are subject to pending patent applications

**Contact:** See [LICENSE](LICENSE) for licensing information

---

## Setup & Installation

### What are the prerequisites?

**Required:**
- Node.js 18+ (`node --version`)
- npm (comes with Node.js)
- ANTHROPIC_API_KEY (see [API_KEYS_SETUP.md](API_KEYS_SETUP.md))
- GROQ_API_KEY (see [API_KEYS_SETUP.md](API_KEYS_SETUP.md))

**Optional:**
- Git (for cloning)
- GitHub account (for Codespaces)

**Time:** ~10 minutes for setup, ~45 minutes for full validation

---

### Do I need API keys?

**Yes, for running tests and demos.**

**Why both Anthropic and Groq?**
- PCS is model-agnostic
- Tests validate substrate works with multiple providers
- Demonstrates state/constraints are external to model

**How to get keys:** See [API_KEYS_SETUP.md](API_KEYS_SETUP.md)

**Cost:** ~$1 total for full validation suite

**Without keys:** You can read code and documentation, but can't run tests/demos

---

### Can I run without API keys?

**What works without keys:**
- ✅ Code review and exploration
- ✅ Documentation reading
- ✅ Architecture analysis
- ✅ Test code inspection

**What doesn't work:**
- ❌ Running validation tests
- ❌ Running demos
- ❌ Tutorial completion

**Recommendation:** Get API keys for full validation. Both providers offer free tiers.

---

### What if I don't have Node 18?

**Solution 1: Install Node 18+**
- Download from https://nodejs.org/
- Choose LTS version (18 or higher)

**Solution 2: Use nvm (Node Version Manager)**
```bash
nvm install 18
nvm use 18
```

**Solution 3: Use GitHub Codespaces**
- Zero setup required
- Node 18 pre-installed
- Click "Open in Codespaces" badge in README

---

## Running Tests & Demos

### How long do tests take?

**Quick validation:** ~5 minutes
- 5 tests
- Validates environment works
- Command: `npm run test:quick`

**Full validation:** ~30 minutes
- 26 tests (312+ assertions)
- Comprehensive validation
- Command: `npm run test:all`

**Why so long?**
- Real API calls to Anthropic/Groq
- Actual semantic embeddings
- Deterministic state validation
- Network latency

---

### Why does test X take so long?

**Common slow tests:**

**EVS-3R (Semantic Continuity):** ~5-8 minutes
- Generates real embeddings (OpenAI)
- Tests backend switching
- Validates continuity preservation

**AVS-1R (Retrieval Governance):** ~3-5 minutes
- Real semantic retrieval
- Multiple backend comparisons
- Threshold governance validation

**CTS-2 (Session Continuity):** ~2-4 minutes
- Multi-session simulation
- State persistence validation
- Continuity verification

**Why not mock?**
- Tests validate real behavior
- Mocks would hide integration issues
- Demonstrates actual capabilities

---

### Can I run tests faster?

**Options:**

**1. Quick validation (5 min):**
```bash
npm run test:quick
```

**2. Specific test:**
```bash
npm test -- --testNamePattern="EVS-3R"
```

**3. Parallel execution:**
- Not currently supported (tests share state)
- Future enhancement

**4. Mock mode:**
- Not currently implemented
- Planned for future

---

### What if a test fails?

**Steps:**

1. **Check environment:**
   ```bash
   npm run preflight
   ```

2. **Check API keys:**
   ```bash
   echo $ANTHROPIC_API_KEY
   echo $GROQ_API_KEY
   ```

3. **Review error message:**
   - What test failed?
   - What was the error?
   - Any network issues?

4. **Check troubleshooting:**
   - See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
   - See [FAQ.md](FAQ.md) (this file)

5. **Report issue:**
   - Create issue with full details
   - Include environment, error, logs
   - Use bug report template

---

### How do I run the demo?

**Quick demo (Acts 1-3):**
```bash
cd demo
npm run demo:1-3
```

**Full demo (Acts 1-9):**
```bash
npm run demo:all
```

**Individual acts:**
```bash
npm run demo:1      # Act 1: Foundation
npm run demo:2      # Act 2: Constraint Enforcement
# ... etc
```

**Expected output:** See [demo/EXPECTED_OUTPUT.md](demo/EXPECTED_OUTPUT.md)

---

### What if the demo fails?

**Common issues:**

**1. State conflicts:**
```bash
npm run demo:clean  # Reset state
```

**2. Missing dependencies:**
```bash
npm install
```

**3. API keys not set:**
- See [API_KEYS_SETUP.md](API_KEYS_SETUP.md)

**4. Wrong directory:**
```bash
cd demo  # Make sure you're in demo directory
```

**For more:** See [demo/TROUBLESHOOTING.md](demo/TROUBLESHOOTING.md)

---

## GitHub Codespaces

### What is GitHub Codespaces?

**GitHub Codespaces** is a cloud-based development environment that runs in your browser.

**Benefits:**
- ✅ Zero local setup
- ✅ Node 18 pre-installed
- ✅ Dependencies auto-installed
- ✅ Same environment as CI/CD
- ✅ No "works on my machine" issues

**How to use:**
1. Click "Open in Codespaces" badge in README
2. Wait for container to build (~30-90 seconds)
3. Set API keys
4. Run tests/demos

---

### How long does Codespaces take to start?

**With prebuild:** ~30-90 seconds
- Container is pre-built
- Dependencies cached
- Ready quickly

**Without prebuild:** ~2-3 minutes
- Pulls base image
- Installs Node.js
- Runs `npm install`
- First-time setup

**Subsequent launches:** ~30 seconds (container cached)

---

### Does Codespaces cost money?

**For users:** Free tier available
- 60 hours/month free (personal accounts)
- 2-core machines
- Sufficient for validation

**For repository owners:** No cost
- Codespaces billed to user, not repo
- Prebuild may require paid plan (minimal cost)

**For more:** https://docs.github.com/en/billing/managing-billing-for-github-codespaces

---

### Can I use Codespaces for validation?

**Yes! Recommended for first-time users.**

**Advantages:**
- Zero setup time
- Consistent environment
- Same as CI/CD
- No local dependencies

**Workflow:**
1. Open in Codespaces
2. Set API keys
3. Run `npm run validate:quick`
4. Explore architecture

---

## Architecture & Design

### Why model + substrate instead of just model?

**Traditional approach:** Model with compensatory layers
- Prompt engineering
- RAG (Retrieval Augmented Generation)
- Fine-tuning
- Chain-of-thought

**Problem:** State, constraints, and context live in the model
- Lost across sessions
- No enforcement
- No provenance
- No continuity

**PCS approach:** Model + substrate
- State lives in substrate (external, persistent)
- Constraints enforced by runtime (not advisory)
- Provenance built-in (full audit trail)
- Continuity automatic (session boundaries irrelevant)

**For more:** 
- Read [THE_PERSISTRA_ARCHITECTURE.md](THE_PERSISTRA_ARCHITECTURE.md) for technical architecture

---

### What's the difference between PCS and RAG?

**RAG (Retrieval Augmented Generation):**
- Retrieves documents/chunks
- Adds to prompt
- Model generates response
- No enforcement, no state

**PCS:**
- Substrate owns state (decisions, constraints, vision)
- Runtime enforces constraints (binding, not advisory)
- Model operates within governed context
- State persists across sessions

**Key difference:** RAG is retrieval. PCS is runtime governance.

**For more:** See [VALIDATION_EVIDENCE.md](VALIDATION_EVIDENCE.md)

---

### What are the core primitives?

**EVS (Evidence Substrate):**
- Semantic continuity
- Backend switching
- Embedding normalization

**AVS (Audit/Verification Substrate):**
- Retrieval governance
- Policy gate
- Constraint enforcement

**CTS (Continuity/Trace Substrate):**
- Distributed state
- Session continuity
- Provenance tracking

**For more:** See [PRIMITIVES_ANALYSIS.md](PRIMITIVES_ANALYSIS.md)

---

### What's validated in the 24 tests?

**EVS (8 tests):**
- Semantic continuity across backend changes
- Embedding normalization
- State-layer fallback

**AVS (8 tests):**
- Retrieval governance
- Policy gate enforcement
- Violation detection with evidence

**CTS (8 tests):**
- Distributed state sharing
- Session continuity
- Multi-agent coordination

**Total:** 202+ assertions across 24 tests

**For details:** See [VALIDATION_EVIDENCE.md](VALIDATION_EVIDENCE.md)

---

## Tenstorrent Hardware Validation

### What is Tenstorrent validation?

**Tenstorrent** is a hardware company building AI accelerators.

**PCS validation:** Tests whether CSE (Contextual Salience Engine) maps efficiently to Tenstorrent hardware.

**Status:**
- Phase 1: ✅ Complete (March 2026)
- 8/8 fixtures passing
- Host reference frozen at v1.0.0
- Validation baseline established

**For more:** See `../pcs-tt-primitive-validation/README.md`

---

### Why hardware acceleration?

**Thesis:** Future AI infrastructure needs hardware acceleration not just for inference, but for control-plane computations (ranking, selection, governance).

**CSE is parallelizable:**
- Independent scoring per item
- Fixed computation graph
- Deterministic tie-breaking

**Goal:** Prove deterministic equivalence between host and TT implementations

---

### What's Phase 2?

**Phase 2:** TT-Metalium kernel implementation

**Status:** Future work (not started)

**Why not started:** No pressing need, additional investment

**Phase 1 sufficient:** Demonstrates hardware acceleration intent and feasibility

---

## Contributing & Support

### How can I contribute?

**See:** [CONTRIBUTING.md](CONTRIBUTING.md) (when available)

**Current status:** Evaluation release, not accepting contributions yet

**Future:** Will open for contributions after public release

---

### Where do I report bugs?

**Create issue:** https://github.com/persistra-ai/persistra-cts/issues/new

**Use template:** Bug Report

**Include:**
- Environment (OS, Node version, setup method)
- Steps to reproduce
- Expected vs actual behavior
- Error message / logs

---

### Where do I ask questions?

**GitHub Discussions:** https://github.com/persistra-ai/persistra-cts/discussions

**Not issues:** Questions should go in Discussions, not Issues

**Topics:**
- Architecture questions
- Usage questions
- Design discussions
- Feature requests

---

### Is there a community?

**GitHub Discussions:** Primary community space

**Future:**
- Discord/Slack (TBD)
- Office hours (TBD)
- Webinars (TBD)

**Stay updated:** Watch the repository for announcements

---

## Licensing & Commercial Use

### What's the license?

**Evaluation release:** Available for evaluation and research purposes

**See:** [LICENSE](LICENSE) for full terms

**Commercial use:** Requires separate licensing

**Patent notice:** Architectural primitives subject to pending patent applications

---

### Can I use this in my company?

**Evaluation:** Yes, for evaluation and research

**Production deployment:** Requires commercial license

**Contact:** See [LICENSE](LICENSE) for licensing information

---

### What if I want to build on PCS?

**Evaluation:** Explore, validate, research

**Commercial use:** Contact us for licensing

**Implementation:** Patent notice applies to architectural primitives

**See:** [PATENT_NOTICE_DIRECT.md](PATENT_NOTICE_DIRECT.md)

---

## Troubleshooting

### Where do I find help?

**Resources:**
1. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues
2. [FAQ.md](FAQ.md) - This file
3. [API_KEYS_SETUP.md](API_KEYS_SETUP.md) - API key setup
4. [GitHub Discussions](https://github.com/persistra-ai/persistra-cts/discussions) - Ask questions
5. [GitHub Issues](https://github.com/persistra-ai/persistra-cts/issues) - Report bugs

---

### What if my question isn't answered?

**Ask in Discussions:** https://github.com/persistra-ai/persistra-cts/discussions

**Before asking:**
- [ ] Check this FAQ
- [ ] Check TROUBLESHOOTING.md
- [ ] Search existing discussions
- [ ] Run `npm run preflight`

---

## Next Steps

### I've validated everything. What's next?

**Explore architecture:**
1. Read [THE_PERSISTRA_ARCHITECTURE.md](THE_PERSISTRA_ARCHITECTURE.md)
2. Review [VALIDATION_EVIDENCE.md](VALIDATION_EVIDENCE.md)
3. Explore [demo/](demo/) for all 9 acts
4. Try [pcs-developer-runtime](https://github.com/persistra-ai/pcs-developer-runtime) tutorial

**Dive deeper:**
- Review test implementations in `test/`
- Explore primitive implementations in `pcs-runtime/`
- Read architectural documentation in `docs/`

**Engage:**
- Join GitHub Discussions
- Share feedback
- Report issues
- Contribute (when open)

---

**Still have questions? Ask in [GitHub Discussions](https://github.com/persistra-ai/persistra-cts/discussions)**
