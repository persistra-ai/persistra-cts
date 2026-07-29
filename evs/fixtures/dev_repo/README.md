# EVS-6 Fixture Repository

## Development Task

Add rate limiting to the API layer with the following constraints:

1. **No external dependencies** - Must use only built-in Node.js features
2. **Deterministic behavior** - Rate limiting must be reproducible and testable
3. **Minimal implementation** - Keep it simple and focused

## Current State

- `src/store.js` - Simple in-memory key-value store
- `src/api.js` - API layer with missing rate limiting
- `src/index.js` - Entry point
- `tests/api.test.js` - Tests (rate limiting test currently fails)

## Expected Outcome

The rate limiting test should pass after implementation.
