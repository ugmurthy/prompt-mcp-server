#!/bin/bash

# PromptDB MCP Server Test Runner
echo "🧪 PromptDB MCP Server Test Runner"
echo "=================================="

# Check if server is running
echo "🔍 Checking if server is running on port 3000..."
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "❌ Server not running on port 3000"
    echo "💡 Start the server first with: npm run start:sse"
    exit 1
fi

echo "✅ Server is running"
echo ""

# Run the comprehensive test suite
echo "🚀 Running comprehensive tool tests..."
node test-promptdb-tools.js

# Capture exit code
TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "🎉 All tests passed!"
else
    echo "💥 Some tests failed (exit code: $TEST_EXIT_CODE)"
fi

exit $TEST_EXIT_CODE