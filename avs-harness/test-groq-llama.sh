#!/bin/bash

# Test script for Groq Llama 3.1 8B integration
# This runs a single PCS-ON test to verify OpenAI-compatible routing works

set -e

echo "=== Groq Llama 3.1 8B Test ==="
echo ""

# Check for Groq API key
if [ -z "$GROQ_API_KEY" ]; then
  echo "❌ GROQ_API_KEY not set"
  echo "   Set it with: export GROQ_API_KEY=your_groq_api_key"
  exit 1
fi

# Set environment for Groq routing
export OPENAI_API_KEY="$GROQ_API_KEY"
export OPENAI_BASE_URL="https://api.groq.com/openai/v1"

echo "✅ Environment configured:"
echo "   OPENAI_BASE_URL=$OPENAI_BASE_URL"
echo "   Model: llama-3.1-8b-instant"
echo ""

# Run single PCS-ON test
echo "Running PCS-ON test..."
node run-avs.js \
  --case AVS-1R-DECISION-RETRIEVAL \
  --date 2026-02-17 \
  --model llama-3.1-8b-instant \
  --condition pcs-on \
  --run 1

echo ""
echo "=== Test Complete ==="
echo ""
echo "Check results at:"
echo "  runs/2026-02-17/llama-3.1-8b-instant/pcs-on/run-0001/"
echo ""
echo "Expected:"
echo "  - run.json with provider: 'groq'"
echo "  - A1/A2/A3 assertions (may vary based on model capability)"
echo "  - Tool trace with retrieval event"
