# Security Policy

## Reporting Security Issues

**We take security seriously.** If you discover a security vulnerability in this reference implementation, please report it responsibly.

### How to Report

**Email:** security@persistra.ai

**Please include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**Response time:** We aim to acknowledge reports within 48 hours and provide a detailed response within 7 days.

### Scope

This security policy applies to:
- The PCS reference implementation in this repository
- Test harnesses and validation tools
- Documentation that may contain security-relevant guidance

### Out of Scope

- Third-party dependencies (report to their maintainers)
- Theoretical attacks without proof of concept
- Issues in private/NDA repositories (contact research@persistra.ai)

---

## About the Paste Condition Test (AVS-2P)

### Not a Vulnerability Disclosure

**Important:** The Paste Condition test (AVS-2P) in this repository is a **diagnostic of an architectural property**, not a vulnerability disclosure about any specific model provider.

**What AVS-2P tests:**
- Whether policy enforcement occurs at the substrate boundary (PCS-ON)
- Or whether policy compliance depends on model behavior (PASTE condition)

**What AVS-2P is NOT:**
- ❌ A CVE-style vulnerability claim against Anthropic, Meta, OpenAI, or any provider
- ❌ A responsible disclosure of a model security flaw
- ❌ A prompt injection attack demonstration
- ❌ A claim that prompt-based policy is "insecure"

**The architectural distinction:**

When policy text is placed in a prompt (PASTE condition), the model may comply or not comply with that policy. This is **expected behavior** — prompts are advisory input, not enforcement boundaries. The test measures the difference between:

1. **Advisory governance** (policy in prompt) - Model decides whether to follow
2. **Architectural enforcement** (policy at substrate) - Runtime decides whether to allow

**No vendor is at fault for advisory governance.** The test demonstrates why substrate-level enforcement exists as a distinct architectural layer, not why prompt-based approaches are flawed.

### Why This Matters

Security-minded readers may ask: "Is this a responsible disclosure situation?"

**Answer: No.** This is architectural validation, not vulnerability research. We are not claiming:
- That any model has a security flaw
- That prompt injection is a "bug" to be fixed
- That vendors should change their models
- That CVEs should be filed

We are demonstrating that **enforcement and compliance are different architectural layers**, both of which have legitimate use cases.

### For Security Researchers

If you're evaluating this test suite and wondering about disclosure:

**The models are working as designed.** Prompts are input; they influence behavior but don't enforce boundaries. That's not a vulnerability — it's the nature of prompt-based interaction.

**PCS adds a different layer** (substrate-level enforcement) for use cases that require deterministic policy boundaries. This doesn't make prompt-based approaches "wrong" — it addresses a different set of requirements.

**No CVE, no disclosure, no vendor notification needed.** This is architectural research, not security research.

---

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## Security Best Practices

### For Evaluators

**When running tests:**
1. Use dedicated API keys (not production keys)
2. Review test code before execution
3. Monitor API usage during test runs
4. Rotate keys after evaluation

**Environment security:**
- Never commit `.env` files
- Use `.env.example` as template
- Keep API keys in environment variables only
- Rotate keys if accidentally exposed

### For Integrators

**When integrating PCS:**
1. Review the threat model for your use case
2. Understand the difference between advisory and enforced governance
3. Use substrate-level enforcement for compliance-critical policies
4. Use prompt-based guidance for advisory policies
5. Maintain audit trails for governance decisions

---

## Vulnerability Disclosure Timeline

**If a vulnerability is confirmed:**

1. **Day 0:** Acknowledgment sent to reporter
2. **Day 1-7:** Validation and impact assessment
3. **Day 7-30:** Fix development and testing
4. **Day 30:** Coordinated disclosure (if applicable)
5. **Day 30+:** Public disclosure and patch release

**We follow responsible disclosure practices** and will credit reporters (unless anonymity is requested).

---

## Security Contacts

**Security issues:** security@persistra.ai  
**General research questions:** research@persistra.ai  
**Commercial licensing:** licensing@persistra.ai

---

## Additional Resources

- [VALIDATION_EVIDENCE.md](VALIDATION_EVIDENCE.md) - Test suite validation results
- [TEST_METHODOLOGY.md](TEST_METHODOLOGY.md) - Testing approach and rationale
- [PASTE_CONDITION.md](avs-harness/PASTE_CONDITION.md) - Detailed AVS-2P explanation
- [README.md](README.md) - Repository overview

---

**Last Updated:** July 2026  
**Version:** 1.0.0
