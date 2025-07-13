# PromptDB MCP Server Test Suite

This comprehensive test suite validates all tools implemented by the PromptDB MCP server.

## Overview

The test suite covers the following test cases:

### Test Case 1: Tool Discovery Tests
- ✅ Verifies all 3 tools are available via `listTools()`
- ✅ Validates tool schemas and metadata
- ✅ Checks required/optional parameters for each tool

### Test Case 2: setPrompt Tool Tests
- ✅ Creates basic prompts with required fields (`taskname`, `content`)
- ✅ Creates comprehensive prompts with all optional fields (`description`, `tags`)
- ✅ Updates existing prompts and verifies version management
- ✅ Handles special characters, Unicode, and edge cases
- ✅ Validates input parameters and error handling

### Test Case 3: getPrompt Tool Tests
- ✅ Retrieves prompts by `taskname`
- ✅ Verifies all metadata fields are present
- ✅ Tests cache behavior and performance
- ✅ Handles non-existent prompts gracefully
- ✅ Validates required parameters

### Test Case 4: listPrompts Tool Tests
- ✅ Lists all available prompts
- ✅ Verifies `PromptSummary` structure (`taskname`, `content`, `version`)
- ✅ Confirms alphabetical sorting by taskname
- ✅ Validates content accuracy against stored prompts

## Tools Tested

The PromptDB MCP server implements these 3 tools:

1. **`listPrompts`** - Lists all available prompts with their content and versions
2. **`getPrompt`** - Retrieves a specific prompt by task name (with optional version)
3. **`setPrompt`** - Creates or updates a prompt for a task

## Running the Tests

### Prerequisites

1. **Start the PromptDB MCP Server** in SSE mode:
   ```bash
   npm run build
   npm run start:sse
   ```
   
   The server should be running on `http://localhost:3000`

2. **Verify server is running**:
   ```bash
   curl http://localhost:3000/health
   ```

### Run Tests

#### Option 1: Use the test runner script (recommended)
```bash
./run-tests.sh
```

#### Option 2: Run tests directly
```bash
node test-promptdb-tools.js
```

### Expected Output

```
🧪 PromptDB MCP Server Tool Tests
==================================

🔌 Connecting to PromptDB MCP Server...
✅ Connected successfully

📋 TEST CASE 1: Tool Discovery Tests
=====================================
✅ List available tools
✅ Verify tool schemas

💾 TEST CASE 2: setPrompt Tool Tests
===================================
✅ Create basic prompt
✅ Create prompt with all fields
✅ Update existing prompt
✅ Handle special characters
✅ Validate required fields

📖 TEST CASE 3: getPrompt Tool Tests
===================================
✅ Retrieve basic prompt
✅ Retrieve prompt with all fields
✅ Handle non-existent prompt
✅ Test cache behavior
    Cache performance: First call 45ms, Second call 12ms
✅ Validate required parameters

📋 TEST CASE 4: listPrompts Tool Tests
=====================================
✅ List all prompts
✅ Verify prompt summary structure
✅ Verify alphabetical sorting
✅ Verify content accuracy

🔌 Connection closed

📊 Test Results Summary
=======================
✅ Passed: 16
❌ Failed: 0
📈 Success Rate: 100.0%

🏁 Test suite completed
```

## Test Data

The test suite uses these test prompts:

- **Basic Prompt**: Minimal required fields only
- **Full Prompt**: All fields including description and tags
- **Update Prompt**: Used for testing version management
- **Special Characters**: Unicode, emojis, quotes, newlines

## Error Handling

The test suite validates:
- Missing required parameters
- Invalid input types
- Non-existent prompts
- Network/connection issues
- Server error responses

## Performance Testing

- **Cache Effectiveness**: Measures response time improvement for cached `getPrompt` calls
- **Response Times**: Monitors tool execution performance
- **Memory Usage**: Observes cache behavior

## Troubleshooting

### Common Issues

1. **Connection timeout**:
   - Ensure server is running: `npm run start:sse`
   - Check port 3000 is available
   - Verify no firewall blocking

2. **Tool not found errors**:
   - Rebuild server: `npm run build`
   - Restart server
   - Check server logs for errors

3. **Permission errors**:
   - Ensure prompts directory is writable
   - Check file system permissions

### Debug Mode

Add debug logging by modifying the test file:
```javascript
// Add at top of test-promptdb-tools.js
const DEBUG = true;
```

## Extending Tests

To add new test cases:

1. Add test data to `testPrompts` object
2. Create new test method in `PromptDBTester` class
3. Call from `runAllTests()` method
4. Update this documentation

## Integration with CI/CD

The test suite returns appropriate exit codes:
- `0` - All tests passed
- `1` - One or more tests failed

Example GitHub Actions workflow:
```yaml
name: Test PromptDB MCP Server
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm run start:sse &
      - run: sleep 5  # Wait for server to start
      - run: ./run-tests.sh
```

## Test Coverage

The test suite provides comprehensive coverage of:

- **Tool Discovery**: 100% of MCP tool listing functionality
- **setPrompt Tool**: 100% of create/update operations
- **getPrompt Tool**: 100% of retrieval operations
- **listPrompts Tool**: 100% of listing functionality
- **Error Handling**: All major error conditions
- **Edge Cases**: Special characters, Unicode, validation
- **Performance**: Cache behavior and response times

## Contributing

When adding new features to the PromptDB MCP server:

1. Add corresponding test cases to [`test-promptdb-tools.js`](test-promptdb-tools.js)
2. Update this guide with new test descriptions
3. Ensure all tests pass before submitting changes
4. Consider adding performance benchmarks for new operations

## Files

- [`test-promptdb-tools.js`](test-promptdb-tools.js) - Main test suite
- [`run-tests.sh`](run-tests.sh) - Test runner script
- [`TEST_GUIDE.md`](TEST_GUIDE.md) - This documentation