# Simplified SSE Transport Implementation Plan

## Overview

This is a streamlined version of the SSE transport implementation that focuses on the core functionality needed to deploy the PromptDB MCP server to cloud platforms like Vercel with minimal changes to the existing codebase.

## Simplified Goals

1. **Add SSE Transport**: Basic SSE transport alongside existing stdio
2. **Command Line Selection**: Simple `--transport` flag
3. **Cloud Ready**: Deploy to Vercel/Netlify with minimal configuration
4. **Backward Compatible**: Keep existing functionality intact

## Minimal Architecture Changes

### Current vs. Simplified Structure

**Current:**
```
src/
├── index.ts          # CLI entry
├── server.ts         # Server with hardcoded stdio
├── cache/
├── storage/
├── tools/
└── utils/
```

**Simplified Addition:**
```
src/
├── index.ts          # Enhanced CLI entry (modified)
├── server.ts         # Transport-agnostic server (modified)
├── sse-server.ts     # New: SSE-specific server
├── cache/            # Unchanged
├── storage/          # Unchanged
├── tools/            # Unchanged
└── utils/            # Unchanged
```

## Implementation Steps

### Step 1: Create SSE Server Module
**File**: `src/sse-server.ts`
- Simple Express server with SSE endpoint
- Minimal middleware (just CORS)
- Direct integration with existing PromptDB server

### Step 2: Modify Entry Point
**File**: `src/index.ts` (Modified)
- Add simple argument parsing for `--transport` flag
- Route to appropriate server based on transport type

### Step 3: Extract Server Core
**File**: `src/server.ts` (Modified)
- Remove hardcoded transport from constructor
- Accept transport as parameter in `run()` method

### Step 4: Add Dependencies
**File**: `package.json` (Modified)
- Add minimal dependencies: `express`, `cors`
- Add SSE-specific scripts

### Step 5: Cloud Configuration
- Simple `vercel.json` for Vercel deployment
- Environment variable support

## Detailed Implementation

### 1. SSE Server Implementation

```typescript
// src/sse-server.ts
import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

export class SSEServer {
  private app = express();
  private server: any;

  constructor(private mcpServer: Server, private port: number = 3000) {
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupRoutes(): void {
    // SSE endpoint for MCP communication
    this.app.get('/sse', async (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      const transport = new SSEServerTransport(res);
      await this.mcpServer.connect(transport);

      req.on('close', () => {
        transport.close();
      });
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Root endpoint info
    this.app.get('/', (req, res) => {
      res.json({
        name: 'PromptDB MCP Server',
        version: '1.0.0',
        transport: 'sse',
        endpoints: {
          sse: '/sse',
          health: '/health'
        }
      });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.error(`PromptDB MCP Server (SSE) running on port ${this.port}`);
        console.error(`SSE endpoint: http://localhost:${this.port}/sse`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.close();
    }
  }
}
```

### 2. Modified Entry Point

```typescript
// src/index.ts (Modified)
#!/usr/bin/env node

import { PromptDBServer } from './server.js';
import { SSEServer } from './sse-server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

interface CLIArgs {
  transport: 'stdio' | 'sse';
  port: number;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const transport = args.includes('--transport') 
    ? args[args.indexOf('--transport') + 1] as 'stdio' | 'sse'
    : (process.env.TRANSPORT_TYPE as 'stdio' | 'sse') || 'stdio';
  
  const portIndex = args.indexOf('--port');
  const port = portIndex !== -1 
    ? parseInt(args[portIndex + 1]) 
    : parseInt(process.env.PORT || '3000');

  return { transport, port };
}

async function main() {
  try {
    const { transport, port } = parseArgs();
    const promptDBServer = new PromptDBServer();

    if (transport === 'sse') {
      const sseServer = new SSEServer(promptDBServer.getServer(), port);
      await sseServer.start();
    } else {
      const stdioTransport = new StdioServerTransport();
      await promptDBServer.run(stdioTransport);
    }
  } catch (error) {
    console.error('Failed to start PromptDB MCP Server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
```

### 3. Modified Server Class

```typescript
// src/server.ts (Modified)
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { StorageManager } from './storage/StorageManager.js';
import { PromptCache } from './cache/PromptCache.js';

import { listPromptsTool, handleListPrompts } from './tools/listPrompts.js';
import { getPromptTool, handleGetPrompt } from './tools/getPrompt.js';
import { setPromptTool, handleSetPrompt } from './tools/setPrompt.js';

export class PromptDBServer {
  private server: Server;
  private storageManager: StorageManager;
  private cache: PromptCache;

  constructor() {
    this.server = new Server(
      {
        name: 'promptdb-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.storageManager = new StorageManager();
    this.cache = new PromptCache();

    this.setupHandlers();
  }

  // Expose server for SSE usage
  getServer(): Server {
    return this.server;
  }

  private setupHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [listPromptsTool, getPromptTool, setPromptTool],
      };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'listPrompts':
            return await handleListPrompts(this.storageManager, this.cache);

          case 'getPrompt':
            return await handleGetPrompt(args, this.storageManager, this.cache);

          case 'setPrompt':
            return await handleSetPrompt(args, this.storageManager, this.cache);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error executing tool ${name}: ${(error as Error).message}`
          }],
          isError: true
        };
      }
    });
  }

  // Modified to accept transport parameter
  async run(transport: any): Promise<void> {
    await this.server.connect(transport);
    console.error('PromptDB MCP Server started');
  }
}
```

### 4. Package.json Updates

```json
{
  "name": "promptdb-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "promptdb-mcp-server": "dist/index.js"
  },
  "scripts": {
    "build": "vite build",
    "dev": "vite build --watch",
    "start": "node dist/index.js",
    "start:stdio": "node dist/index.js --transport stdio",
    "start:sse": "node dist/index.js --transport sse --port 3000",
    "dev:sse": "npm run build && npm run start:sse",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",
    "zod": "^3.22.0",
    "express": "^4.18.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "@types/cors": "^2.8.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

### 5. Vercel Configuration

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/dist/index.js"
    }
  ],
  "env": {
    "TRANSPORT_TYPE": "sse",
    "PORT": "3000"
  }
}
```

### 6. Environment Configuration

```env
# .env.example
TRANSPORT_TYPE=sse
PORT=3000
PROMPTS_DIR=./prompts
```

## Usage Examples

### Local Development
```bash
# Stdio (existing behavior)
npm start
# or
npm run start:stdio

# SSE transport
npm run start:sse
# or
node dist/index.js --transport sse --port 3000
```

### Cloud Deployment
```bash
# Deploy to Vercel
vercel deploy

# The server will automatically use SSE transport based on environment variables
```

### Client Connection
```javascript
// Connect to SSE endpoint
const eventSource = new EventSource('http://localhost:3000/sse');

eventSource.onmessage = function(event) {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

## Testing Strategy

### Manual Testing
1. **Stdio Mode**: Verify existing functionality works unchanged
2. **SSE Mode**: Test HTTP endpoints and SSE connection
3. **Cloud Deployment**: Deploy to Vercel and test remotely

### Basic Tests
```bash
# Test stdio mode
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | npm start

# Test SSE mode (in separate terminals)
npm run start:sse
curl http://localhost:3000/health
curl http://localhost:3000/sse
```

## Deployment Steps

### Vercel Deployment
1. Build the project: `npm run build`
2. Create `vercel.json` configuration
3. Deploy: `vercel deploy`
4. Test SSE endpoint: `https://your-app.vercel.app/sse`

### Environment Variables
Set in Vercel dashboard:
- `TRANSPORT_TYPE=sse`
- `PORT=3000`

## Benefits of Simplified Approach

1. **Minimal Changes**: Only 3 files modified, 1 file added
2. **Fast Implementation**: Can be completed in a few hours
3. **Backward Compatible**: Existing stdio functionality unchanged
4. **Cloud Ready**: Immediate deployment to Vercel/Netlify
5. **Easy Testing**: Simple HTTP endpoints for verification

## Limitations

1. **No Authentication**: Basic implementation without auth
2. **Limited Middleware**: Minimal Express setup
3. **No Advanced Features**: No rate limiting, detailed logging, etc.
4. **Single SSE Connection**: No connection pooling

## Future Enhancements

Once the simplified version is working:
1. Add authentication middleware
2. Implement connection pooling
3. Add comprehensive logging
4. Add rate limiting
5. Implement the full architecture from the detailed plan

## Success Criteria

1. ✅ Existing stdio functionality works unchanged
2. ✅ SSE transport serves HTTP endpoints correctly
3. ✅ MCP protocol works over SSE
4. ✅ Successful deployment to Vercel
5. ✅ Health check endpoint responds correctly

This simplified approach gets you to a working SSE transport quickly while maintaining all existing functionality and providing a foundation for future enhancements.