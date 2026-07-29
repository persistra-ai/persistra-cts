# Reference Implementation

**Last Updated:** 2026-07-12  
**Status:** Research validation release

---

## Overview

The public kernel in this repository (625 lines) is extracted from a larger reference implementation developed over multiple years. The reference implementation demonstrates substrate-centric architecture at production scale.

**Public kernel:**  
625 lines exposing minimal primitives for architectural evaluation

**Full reference implementation:**  
Available under NDA for research collaboration and licensed deployment

---

## Validation Status

This repository contains 25 core tests with 252 machine-verified assertions validating the core architectural primitives:

- **EVS (Exocortical Validation Suite):** 13 tests, 163 assertions
- **AVS (Architectural Validation Suite):** 6 tests, 89 assertions  
- **CTS (Conformance Test Suite):** 6 conformance tests
- **AVS-2P (Paste Condition):** 1 test, 60 assertions (optional, separate due to runtime)
- **Total:** 26 tests, 312 assertions (252 core + 60 optional)

See [TEST_METHODOLOGY.md](../TEST_METHODOLOGY.md) for complete test methodology and [VERIFICATION_SUITE.md](../VERIFICATION_SUITE.md) for falsification criteria.

---

## Access

**For research collaboration and evaluation:**  
Contact: research@persistra.ai

**For licensed deployment:**  
Contact: licensing@persistra.ai

---

## Related Documentation

- [THE_PERSISTRA_ARCHITECTURE.md](../THE_PERSISTRA_ARCHITECTURE.md) - Complete architectural overview
- [TEST_METHODOLOGY.md](../TEST_METHODOLOGY.md) - Detailed test methodology for all 25 tests
- [VERIFICATION_SUITE.md](../VERIFICATION_SUITE.md) - Falsification-based test descriptions
- [README.md](../README.md) - Quick start and evaluation guide
