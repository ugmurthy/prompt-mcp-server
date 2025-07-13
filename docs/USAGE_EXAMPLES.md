# PromptDB MCP Server Usage Examples

This document provides practical examples of how to use the PromptDB MCP Server with MCP-compatible clients.

## Server Configuration

Add to your MCP client configuration (e.g., Claude Desktop, MCP Inspector):

```json
{
  "mcpServers": {
    "promptdb": {
      "command": "promptdb-mcp-server",
      "args": []
    }
  }
}
```

Or for local development:

```json
{
  "mcpServers": {
    "promptdb": {
      "command": "node",
      "args": ["/path/to/promptdb-mcp-server/dist/index.js"]
    }
  }
}
```

## Tool Usage Examples

### 1. List All Prompts

**Tool Call:**
```json
{
  "tool": "listPrompts"
}
```

**Expected Response:**
```json
[
  {
    "taskname": "code-review",
    "content": "You are an expert code reviewer. Please analyze the provided code for...",
    "version": "1.0"
  },
  {
    "taskname": "documentation",
    "content": "You are a technical documentation specialist. Help create clear...",
    "version": "1.0"
  }
]
```

### 2. Get a Specific Prompt

**Tool Call:**
```json
{
  "tool": "getPrompt",
  "arguments": {
    "taskname": "code-review"
  }
}
```

**Expected Response:**
```json
{
  "content": "You are an expert code reviewer. Please analyze the provided code for:\n\n1. **Best Practices**: Check for adherence to coding standards...",
  "created": "2025-01-07T22:13:00.000Z",
  "updated": "2025-01-07T22:13:00.000Z",
  "version": "1.0",
  "tags": ["code-review", "security", "performance", "best-practices", "debugging"],
  "description": "Comprehensive code review assistant that analyzes code for best practices, security, performance, and maintainability"
}
```

### 3. Get a Specific Version

**Tool Call:**
```json
{
  "tool": "getPrompt",
  "arguments": {
    "taskname": "code-review",
    "version": "1.0"
  }
}
```

### 4. Create a New Prompt

**Tool Call:**
```json
{
  "tool": "setPrompt",
  "arguments": {
    "taskname": "bug-analysis",
    "content": "You are a debugging expert. When analyzing code issues:\n\n1. Identify the root cause of the problem\n2. Explain why the bug occurs\n3. Provide step-by-step debugging approach\n4. Suggest multiple solution options\n5. Recommend prevention strategies\n\nFocus on systematic problem-solving and clear explanations.",
    "description": "Expert debugging assistant for systematic bug analysis and resolution",
    "tags": ["debugging", "troubleshooting", "problem-solving", "analysis"]
  }
}
```

**Expected Response:**
```json
{
  "message": "Prompt 'bug-analysis' saved successfully",
  "version": "1.0",
  "created": "2025-01-07T22:15:00.000Z",
  "updated": "2025-01-07T22:15:00.000Z"
}
```

### 5. Update an Existing Prompt

**Tool Call:**
```json
{
  "tool": "setPrompt",
  "arguments": {
    "taskname": "code-review",
    "content": "You are an expert code reviewer with focus on modern best practices. Please analyze the provided code for:\n\n1. **Best Practices**: Check for adherence to current coding standards\n2. **Security Issues**: Identify potential security vulnerabilities using OWASP guidelines\n3. **Performance**: Look for performance bottlenecks and optimization opportunities\n4. **Maintainability**: Assess code readability, structure, and documentation\n5. **Bug Detection**: Find potential bugs or logical errors\n6. **Accessibility**: Check for accessibility compliance where applicable\n\nProvide specific, actionable feedback with examples. Prioritize issues by severity (Critical, High, Medium, Low).",
    "description": "Enhanced comprehensive code review assistant with modern best practices focus",
    "tags": ["code-review", "security", "performance", "best-practices", "debugging", "accessibility", "owasp"]
  }
}
```

**Expected Response:**
```json
{
  "message": "Prompt 'code-review' saved successfully",
  "version": "1.1",
  "created": "2025-01-07T22:13:00.000Z",
  "updated": "2025-01-07T22:16:00.000Z"
}
```

## File System Behavior

### Version Management
- **New prompt**: Creates `prompts/taskname.json` with version `1.0`
- **Update prompt**: 
  - Archives current version as `prompts/taskname_v1.0.json`
  - Updates `prompts/taskname.json` to version `1.1`
  - Subsequent updates create `1.2`, `1.3`, etc.

### Example File Structure After Updates
```
prompts/
├── code-review.json          # Latest version (1.1)
├── code-review_v1.0.json     # Archived version 1.0
├── documentation.json        # Version 1.0 (unchanged)
└── bug-analysis.json         # Version 1.0 (new)
```

## Integration Examples

### With Claude Desktop
1. Add server configuration to `claude_desktop_config.json`
2. Restart Claude Desktop
3. Use tools in conversation:
   - "List all available prompts"
   - "Get the code-review prompt"
   - "Create a new prompt for API testing"

### With MCP Inspector
1. Start PromptDB server: `pnpm start`
2. Connect MCP Inspector to the server
3. Test tools interactively
4. View tool schemas and responses

### Programmatic Usage
```javascript
// Example MCP client usage
const client = new MCPClient();
await client.connect('promptdb-mcp-server');

// List prompts
const prompts = await client.callTool('listPrompts');

// Get specific prompt
const prompt = await client.callTool('getPrompt', { 
  taskname: 'code-review' 
});

// Create new prompt
await client.callTool('setPrompt', {
  taskname: 'testing',
  content: 'You are a testing expert...',
  tags: ['testing', 'qa']
});
```

## Best Practices

### Prompt Naming
- Use descriptive, kebab-case names: `code-review`, `api-testing`, `bug-analysis`
- Avoid spaces and special characters
- Keep names concise but meaningful

### Content Organization
- Structure prompts with clear sections
- Use markdown formatting for readability
- Include specific instructions and examples
- Define expected output format

### Tagging Strategy
- Use consistent, lowercase tags
- Include functional tags: `code-review`, `debugging`, `documentation`
- Add domain tags: `security`, `performance`, `testing`
- Consider audience tags: `beginner`, `expert`, `general`

### Version Management
- Minor updates for content improvements
- Major updates for significant changes in approach
- Keep descriptions updated to reflect changes
- Archive important versions before major rewrites

## Troubleshooting

### Common Issues
1. **Server not starting**: Check Node.js version (18+) and dependencies
2. **Tool not found**: Verify server is properly connected to MCP client
3. **Directory creation errors**:
   - Error: `ENOENT: no such file or directory, mkdir '/prompts'`
   - **Solution**: The server creates a `prompts` directory in the current working directory. This has been fixed in the latest version to handle path resolution correctly.
4. **File permissions**: Ensure write access to prompts directory
5. **JSON parsing errors**: Validate prompt file format

### Debug Mode
```bash
# Start server with debug output
DEBUG=* pnpm start

# Check server logs (if available)
tail -f ~/.mcp/logs/promptdb.log
```

### Directory Configuration
The server creates prompts in the current working directory by default:
- When run locally: `./prompts/` in the project directory
- When installed globally: `./prompts/` in the directory where the MCP client runs
- The server automatically creates the directory if it doesn't exist

### Validation Errors
- Task names must be alphanumeric with hyphens/underscores only
- Content cannot be empty
- Version format must be X.Y (e.g., 1.0, 2.1)