
# PromptDB MCP Server


<p align="center">
  <img src="_assets/banner.gif" alt="banner" width="900" height="350">
</p>

A Model Context Protocol (MCP) server that provides prompt storage and retrieval functionality. Store, version, and manage your prompts with rich metadata and caching for optimal performance.

## Features

- **Prompt Storage**: Store prompts as individual JSON files with rich metadata
- **Version Management**: Automatic versioning with history preservation
- **Caching**: In-memory LRU cache for performance optimization
- **Rich Metadata**: Tags, descriptions, timestamps, and version tracking
- **MCP Integration**: Full compatibility with MCP-enabled applications
- **Dual Transport Support**: Both stdio and SSE (Server-Sent Events) transports
- **Cloud Deployment**: Ready for deployment to Vercel, Netlify, and other cloud platforms

## Pre-populated Prompts

The server comes with a set of pre-populated prompts ready for immediate use. You can retrieve them using the `getPrompt` tool with the following task names:

- `assistant`
- `code-review`
- `documentation`
- `summarise-paper`
- `to-flash-cards`
## Installation

### Global Installation
```bash
# Using pnpm (recommended)
pnpm add -g promptdb-mcp-server

# Using npm
npm install -g promptdb-mcp-server
```

### Local Development
```bash
# Clone and install dependencies
git clone <repository-url>
cd promptdb-mcp-server
pnpm install

# Build the project
pnpm build

# Start the server
pnpm start
```

## Transport Options

The PromptDB MCP Server supports two transport methods:

### 1. Stdio Transport (Default)
For local development and MCP clients that support process communication:

```bash
# Default stdio transport
promptdb-mcp-server
# or explicitly
promptdb-mcp-server --transport stdio
```

### 2. SSE Transport (Server-Sent Events)
For web applications and cloud deployment:

```bash
# SSE transport on port 3000
promptdb-mcp-server --transport sse --port 3000

# Using environment variables
export TRANSPORT_TYPE=sse
export PORT=3000
promptdb-mcp-server
```

## MCP Configuration

### Stdio Transport Configuration
Add to your MCP client configuration:

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

### SSE Transport Configuration
For MCP clients that support HTTP/SSE transport:

```json
{
  "mcpServers": {
    "promptdb": {
      "transport": "sse",
      "url": "http://localhost:3000/sse"
    }
  }
}
```

## Cloud Deployment

### Vercel Deployment
```bash
# Build and deploy
pnpm build
vercel deploy

# Set environment variables in Vercel dashboard:
# TRANSPORT_TYPE=sse
# PORT=3000
```

### Netlify Deployment
```bash
# Build and deploy
pnpm build
netlify deploy --prod --dir=dist

# Set TRANSPORT_TYPE=sse in Netlify dashboard
```

### SSE Endpoints
When running in SSE mode, the server provides:
- **SSE Endpoint**: `http://localhost:3000/sse` - MCP communication
- **Health Check**: `http://localhost:3000/health` - Server status
- **Server Info**: `http://localhost:3000/` - Server metadata

## Tools

### listPrompts
List all available prompts with their content and versions.

**Parameters**: None

**Returns**: Array of prompts with taskname, content, and version

### getPrompt
Retrieve a specific prompt by task name.

**Parameters**:
- `taskname` (required): The task name identifier
- `version` (optional): Specific version (defaults to latest)

**Returns**: Full prompt metadata including content, timestamps, tags, and description

### setPrompt
Create or update a prompt for a task.

**Parameters**:
- `taskname` (required): The task name identifier
- `content` (required): The prompt content
- `description` (optional): Human-readable description
- `tags` (optional): Array of searchable tags

**Returns**: Confirmation with version information

## Data Model

### Prompt Structure
```typescript
interface PromptMetadata {
  content: string;      // The prompt content
  created: string;      // ISO timestamp of creation
  updated: string;      // ISO timestamp of last update
  version: string;      // Semantic version (1.0, 1.1, etc.)
  tags: string[];       // Searchable tags
  description: string;  // Human-readable description
}
```

### File Organization
- Latest version: `prompts/{taskname}.json`
- Historical versions: `prompts/{taskname}_v{version}.json`
- Automatic archiving of previous versions

### Version Management
- New prompts start at version `1.0`
- Content updates increment minor version (`1.0` → `1.1` → `1.2`)
- Previous versions are automatically archived
- Latest version is always accessible without specifying version

## Usage Examples

### Storing a Prompt
```json
{
  "tool": "setPrompt",
  "arguments": {
    "taskname": "code-review",
    "content": "Review this code for best practices, security issues, and performance optimizations...",
    "description": "Comprehensive code review prompt",
    "tags": ["code", "review", "security", "performance"]
  }
}
```

### Retrieving a Prompt
```json
{
  "tool": "getPrompt",
  "arguments": {
    "taskname": "code-review"
  }
}
```

### Listing All Prompts
```json
{
  "tool": "listPrompts",
  "arguments": {}
}
```

## Development

### Project Structure
```
promptdb-mcp-server/
├── src/
│   ├── index.ts              # Main entry point
│   ├── server.ts             # MCP server setup
│   ├── tools/                # Tool implementations
│   ├── storage/              # File system operations
│   ├── cache/                # In-memory caching
│   └── utils/                # Validation helpers
├── prompts/                  # Prompt storage directory
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Development Commands
```bash
# Install dependencies
pnpm install

# Build project
pnpm build

# Development with watch mode
pnpm dev

# Start server (stdio transport)
pnpm start

# Start with SSE transport
pnpm start:sse

# Development with SSE transport
pnpm dev:sse

# Clean build artifacts
pnpm clean
```

### Testing
Use the MCP Inspector or any MCP-compatible client to test the server:

1. Start the server: `pnpm start`
2. Connect via MCP Inspector
3. Test the available tools

## Performance

### Caching Strategy
- **Cache Hit**: Immediate return from memory
- **Cache Miss**: Load from file system, cache result
- **Cache Invalidation**: Automatic on prompt updates
- **Memory Management**: LRU eviction at 100 items

### File System Optimization
- Asynchronous file operations throughout
- On-demand directory creation
- Robust error handling
- Concurrent access safety

## Error Handling

The server handles various error conditions gracefully:
- File system permission errors
- Invalid JSON parsing
- Concurrent access conflicts
- Cache consistency issues
- Input validation errors

## Troubleshooting

### Common Issues

1. **Server not starting**: Check Node.js version (18+) and dependencies
2. **Tool not found**: Verify server is properly connected to MCP client
3. **Directory creation errors**:
   - Error: `ENOENT: no such file or directory, mkdir '/prompts'`
   - **Solution**: The server creates a `prompts` directory in the current working directory. Ensure the MCP client has write permissions to the directory where it's running.
   - **Alternative**: The server will automatically create the directory with proper permissions
4. **File permissions**: Ensure write access to prompts directory
5. **JSON parsing errors**: Validate prompt file format

### SSE Transport Issues

1. **Port already in use**:
   ```bash
   # Find process using port
   lsof -i :3000
   # Kill process
   kill -9 <PID>
   ```

2. **CORS errors**: The server includes CORS headers by default for cross-origin requests

3. **Connection timeout**: Check firewall settings and ensure the port is accessible

4. **Build errors**: Ensure all dependencies are installed with `pnpm install`

5. **Cloud deployment issues**:
   - Verify environment variables are set correctly
   - Check build logs for errors
   - Ensure `dist/` directory is included in deployment

### Testing SSE Transport

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test server info
curl http://localhost:3000/

# Test SSE connection
curl -N http://localhost:3000/sse
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

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation
- Review the implementation plan