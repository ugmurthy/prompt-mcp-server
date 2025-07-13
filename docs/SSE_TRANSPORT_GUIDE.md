# PromptDB MCP Server - SSE Transport Guide

## Overview

The PromptDB MCP Server now supports both **stdio** and **SSE (Server-Sent Events)** transports, enabling deployment to cloud platforms like Vercel, Netlify, and other serverless environments.

## Transport Options

### 1. Stdio Transport (Default)
- **Use Case**: Local development, CLI tools, MCP clients
- **Protocol**: Standard input/output communication
- **Deployment**: Local machines, servers with direct process communication

### 2. SSE Transport (New)
- **Use Case**: Web applications, cloud deployment, HTTP-based clients
- **Protocol**: HTTP with Server-Sent Events
- **Deployment**: Vercel, Netlify, Railway, any HTTP server

## Usage

### Command Line Options

```bash
# Stdio transport (default behavior)
node dist/index.js
node dist/index.js --transport stdio

# SSE transport
node dist/index.js --transport sse --port 3000
```

### Environment Variables

```bash
# Set transport type
export TRANSPORT_TYPE=sse
export PORT=3000

# Run server
node dist/index.js
```

### NPM Scripts

```bash
# Stdio mode
npm run start:stdio

# SSE mode  
npm run start:sse

# Development with SSE
npm run dev:sse
```

## SSE Transport Endpoints

When running in SSE mode, the server provides these HTTP endpoints:

### 1. SSE Endpoint
- **URL**: `http://localhost:3000/sse`
- **Purpose**: MCP protocol communication via Server-Sent Events
- **Usage**: Connect MCP clients to this endpoint

### 2. Health Check
- **URL**: `http://localhost:3000/health`
- **Purpose**: Server health monitoring
- **Response**: `{"status":"ok","timestamp":"2025-01-07T..."}`

### 3. Server Info
- **URL**: `http://localhost:3000/`
- **Purpose**: Server information and available endpoints
- **Response**: Server metadata and endpoint list

## Testing SSE Transport

### 1. Start SSE Server
```bash
npm run build
npm run start:sse
```

### 2. Test Health Endpoint
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{"status":"ok","timestamp":"2025-01-07T..."}
```

### 3. Test Server Info
```bash
curl http://localhost:3000/
```

Expected response:
```json
{
  "name": "PromptDB MCP Server",
  "version": "1.0.0",
  "transport": "sse",
  "endpoints": {
    "sse": "/sse",
    "health": "/health"
  }
}
```

### 4. Test SSE Connection
```bash
curl -N http://localhost:3000/sse
```

This will establish an SSE connection for MCP communication.

## Cloud Deployment

### Vercel Deployment

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel deploy
   ```

3. **Environment Variables** (set in Vercel dashboard):
   - `TRANSPORT_TYPE=sse`
   - `PORT=3000`

4. **Access your deployed server**:
   - SSE endpoint: `https://your-app.vercel.app/sse`
   - Health check: `https://your-app.vercel.app/health`

### Netlify Deployment

1. **Build and deploy**:
   ```bash
   npm run build
   netlify deploy --prod --dir=dist
   ```

2. **Environment Variables**:
   - Set `TRANSPORT_TYPE=sse` in Netlify dashboard

### Railway Deployment

1. **Connect your repository** to Railway

2. **Set environment variables**:
   - `TRANSPORT_TYPE=sse`
   - `PORT=3000`

3. **Railway will automatically build and deploy**

## Client Integration

### JavaScript/Web Client Example

```javascript
// Connect to SSE endpoint
const eventSource = new EventSource('http://localhost:3000/sse');

eventSource.onopen = function(event) {
  console.log('SSE connection opened');
};

eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Received MCP message:', data);
  
  // Handle MCP protocol messages
  if (data.method === 'tools/list') {
    // Handle tools list response
  }
};

eventSource.onerror = function(event) {
  console.error('SSE connection error:', event);
};

// Send MCP requests (you'll need to implement the request mechanism)
function sendMCPRequest(request) {
  // Implementation depends on your MCP client setup
  // This is a simplified example
  fetch('/sse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
}
```

### MCP Client Configuration

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

## Architecture

### Transport Selection Flow

```
CLI Arguments / Environment Variables
           ↓
    Transport Factory
           ↓
    ┌─────────────────┐    ┌─────────────────┐
    │  Stdio Transport │    │  SSE Transport  │
    │                 │    │                 │
    │ • Direct I/O    │    │ • HTTP Server   │
    │ • Process comm  │    │ • SSE Endpoint  │
    │ • Local only    │    │ • Cloud ready   │
    └─────────────────┘    └─────────────────┘
           ↓                        ↓
    PromptDB Server Core
           ↓
    Storage Manager + Cache + Tools
```

### SSE Transport Components

1. **SSEServer Class**: HTTP server with Express
2. **SSE Endpoint**: `/sse` route for MCP communication
3. **Health Endpoint**: `/health` for monitoring
4. **CORS Support**: Cross-origin request handling

## Configuration Files

### package.json Scripts
```json
{
  "scripts": {
    "start": "node dist/index.js",
    "start:stdio": "node dist/index.js --transport stdio",
    "start:sse": "node dist/index.js --transport sse --port 3000",
    "dev:sse": "npm run build && npm run start:sse"
  }
}
```

### vercel.json
```json
{
  "version": 2,
  "builds": [{"src": "dist/index.js", "use": "@vercel/node"}],
  "routes": [{"src": "/(.*)", "dest": "/dist/index.js"}],
  "env": {
    "TRANSPORT_TYPE": "sse",
    "PORT": "3000"
  }
}
```

### .env.example
```env
TRANSPORT_TYPE=sse
PORT=3000
PROMPTS_DIR=./prompts
```

## Troubleshooting

### Common Issues

1. **Build Errors**: 
   - Ensure all dependencies are installed: `pnpm install`
   - Check Node.js version (18+ required)

2. **Port Already in Use**:
   ```bash
   # Find process using port
   lsof -i :3000
   
   # Kill process
   kill -9 <PID>
   ```

3. **CORS Issues**:
   - The server includes CORS headers by default
   - For custom origins, modify the CORS configuration in `src/sse-server.ts`

4. **Cloud Deployment Issues**:
   - Verify environment variables are set correctly
   - Check build logs for errors
   - Ensure `dist/` directory is included in deployment

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm run start:sse

# Check server logs
curl http://localhost:3000/health -v
```

## Performance Considerations

### SSE Transport
- **Connection Limit**: Each SSE connection maintains an open HTTP connection
- **Memory Usage**: Monitor memory usage with multiple concurrent connections
- **Timeout Handling**: Implement proper connection timeout and cleanup

### Cloud Deployment
- **Cold Starts**: Serverless platforms may have cold start delays
- **Connection Limits**: Check platform-specific connection limits
- **Resource Usage**: Monitor CPU and memory usage in production

## Security

### HTTP Security
- CORS is enabled by default for cross-origin requests
- Consider adding authentication for production deployments
- Use HTTPS in production environments

### Environment Variables
- Store sensitive configuration in environment variables
- Never commit `.env` files to version control
- Use platform-specific secret management

## Future Enhancements

1. **WebSocket Transport**: For bidirectional real-time communication
2. **Authentication**: API key and OAuth support
3. **Rate Limiting**: Request throttling and abuse prevention
4. **Monitoring**: Metrics collection and alerting
5. **Load Balancing**: Multi-instance deployment support

## Support

For issues and questions:
- Check the troubleshooting section above
- Review server logs for error messages
- Test with both transport modes to isolate issues
- Verify cloud platform configuration and environment variables