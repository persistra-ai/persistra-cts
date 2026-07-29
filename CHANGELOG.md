# CHANGELOG

## [1.0.0] - 2026-07-26

### Initial Public Release

**Test Suite:**
- 6 Extended Validation Suite (EVS) tests
- 6 Architectural Validation Suite (AVS) tests
- 13 Conformance Test Suite (CTS) tests
- AVS-2P policy enforcement (paste condition) test
- Total: 25 core tests + AVS-2P

**Validation Results:**
- 24/25 tests passing (96%)
- 243/243 assertions passing
- 5/6 architectural invariants verified

**Dependencies:**
- @anthropic-ai/sdk v0.32.1
- axios v1.13.5
- openai v4.20.1
- Zero test framework dependencies (plain Node.js)

**Documentation:**
- TEST_METHODOLOGY.md
- VERIFICATION_SUITE.md
- THE_PERSISTRA_ARCHITECTURE.md
- VALIDATION_EVIDENCE.md
- RUNTIME_TRACE_CONTRACT_V1.md
