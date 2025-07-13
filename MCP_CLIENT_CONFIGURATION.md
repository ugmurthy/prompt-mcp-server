# MCP Client Configuration for PromptDB SSE Transport

This guide shows how to configure the PromptDB MCP Server with SSE transport in various MCP clients.

## Prerequisites

1. **Deploy PromptDB Server with SSE Transport**:
   ```bash
   # Local deployment
   pnpm build
   pnpm start:sse
   # Server will run on http://localhost:3000
   ```

2. **Cloud deployment** (recommended for production):
   ```bash
   # Deploy to Vercel
   vercel deploy
   # Your server will be available at https://your-app.vercel.app
   ```

## Configuration Examples

### 1. Claude Desktop (Anthropic)

If Claude Desktop supports MCP servers, add this to your configuration file:

**Location**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "promptdb": {
      "transport": {
        "type": "sse",
        "url": "http://localhost:3000/sse"
      }
    }
  }
}
```

**For cloud deployment**:
```json
{
  "mcpServers": {
    "promptdb": {
      "transport": {
        "type": "sse", 
        "url": "https://your-promptdb-app.vercel.app/sse"
      }
    }
  }
}
```

### 2. Kilo Code (if it supports MCP)

**Configuration file**: Usually in project settings or `mcp.config.json`

```json
{
  "servers": {
    "promptdb": {
      "transport": "sse",
      "endpoint": "http://localhost:3000/sse",
      "name": "PromptDB Server",
      "description": "Prompt storage and retrieval"
    }
  }
}
```

### 3. Generic MCP Client Configuration

For any MCP client that supports HTTP/SSE transport:

```json
{
  "mcpServers": {
    "promptdb": {
      "name": "PromptDB MCP Server",
      "transport": {
        "type": "sse",
        "url": "http://localhost:3000/sse",
        "headers": {
          "Accept": "text/event-stream",
          "Cache-Control": "no-cache"
        }
      },
      "capabilities": {
        "tools": true,
        "resources": false,
        "prompts": false
      }
    }
  }
}
```

### 4. Environment-Based Configuration

If your MCP client supports environment variables:

```bash
# Set environment variables
export MCP_PROMPTDB_TRANSPORT=sse
export MCP_PROMPTDB_URL=http://localhost:3000/sse
export MCP_PROMPTDB_NAME="PromptDB Server"
```

## Step-by-Step Setup

### Option 1: Local Development Setup

1. **Start the PromptDB server**:
   ```bash
   cd promptdb-mcp-server
   pnpm build
   pnpm start:sse
   ```
   
2. **Verify server is running**:
   ```bash
   curl http://localhost:3000/health
   # Should return: {"status":"ok","timestamp":"..."}
   ```

3. **Configure your MCP client** with the local URL:
   - **URL**: `http://localhost:3000/sse`
   - **Transport**: `sse` or `http`

### Option 2: Cloud Deployment Setup

1. **Deploy to Vercel**:
   ```bash
   cd promptdb-mcp-server
   pnpm build
   vercel deploy
   ```

2. **Set environment variables in Vercel**:
   - `TRANSPORT_TYPE=sse`
   - `PORT=3000`

3. **Get your deployment URL** from Vercel dashboard

4. **Configure your MCP client** with the cloud URL:
   - **URL**: `https://your-app.vercel.app/sse`
   - **Transport**: `sse` or `http`

## Testing the Connection

### 1. Test Server Endpoints

```bash
# Health check
curl https://your-app.vercel.app/health

# Server info
curl https://your-app.vercel.app/

# SSE connection test
curl -N https://your-app.vercel.app/sse
```

### 2. Test MCP Tools

Once connected, you should be able to use these tools:

- **listPrompts**: List all available prompts
- **getPrompt**: Retrieve a specific prompt by task name
- **setPrompt**: Create or update a prompt

## Troubleshooting

### Common Issues

1. **Connection Refused**:
   - Ensure the server is running: `curl http://localhost:3000/health`
   - Check firewall settings
   - Verify the port is not blocked

2. **CORS Errors**:
   - The server includes CORS headers by default
   - For custom origins, modify [`src/sse-server.ts`](src/sse-server.ts:16)

3. **MCP Client Not Connecting**:
   - Verify the client supports SSE/HTTP transport
   - Check the configuration syntax
   - Look for client-specific logs

4. **Cloud Deployment Issues**:
   - Verify environment variables are set
   - Check deployment logs
   - Ensure the build completed successfully

### Debug Steps

1. **Check server logs**:
   ```bash
   # Local development
   pnpm start:sse
   
   # Look for connection messages
   ```

2. **Test with curl**:
   ```bash
   # Test SSE connection
   curl -N -H "Accept: text/event-stream" http://localhost:3000/sse
   ```

3. **Verify MCP client configuration**:
   - Check configuration file syntax
   - Ensure the URL is correct
   - Verify transport type is supported

## Client-Specific Notes

### Claude Desktop
- Configuration location may vary by OS
- Check Claude's documentation for MCP server setup
- May require restart after configuration changes

### Kilo Code
- Check if MCP support is enabled
- Look for MCP or server configuration options
- May have a GUI for server configuration

### Custom MCP Clients
- Implement SSE client following MCP specification
- Handle Server-Sent Events properly
- Include proper headers for SSE connection

## Advanced Configuration

### Custom Headers
```json
{
  "transport": {
    "type": "sse",
    "url": "http://localhost:3000/sse",
    "headers": {
      "Authorization": "Bearer your-token",
      "X-Custom-Header": "value"
    }
  }
}
```

### Connection Options
```json
{
  "transport": {
    "type": "sse",
    "url": "http://localhost:3000/sse",
    "options": {
      "timeout": 30000,
      "retry": true,
      "retryDelay": 1000
    }
  }
}
```

## Next Steps

1. **Choose your deployment method** (local or cloud)
2. **Start the PromptDB server** with SSE transport
3. **Configure your MCP client** with the appropriate settings
4. **Test the connection** using the provided tools
5. **Start using PromptDB** for prompt management

For more detailed information, see:
- [`SSE_TRANSPORT_GUIDE.md`](SSE_TRANSPORT_GUIDE.md) - Complete SSE implementation guide
- [`README.md`](README.md) - General usage and setup instructions
- [`USE_CASES.md`](USE_CASES.md) - Practical usage examples