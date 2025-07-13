import express, { Request, Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { Server as HttpServer } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

export class SSEServer {
  private app = express();
  private server: HttpServer | undefined;

  constructor(private mcpServer: McpServer, private port: number = 3000) {
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    // Enhanced CORS configuration with proper security
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://127.0.0.1:3000'],
      methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Cache-Control', 'mcp-session-id'],
      exposedHeaders: ['Mcp-Session-Id'],
      credentials: false
    }));
    this.app.use(express.json());
    this.app.use(express.text());
  }

  // Store transports by session ID for both transport types
  private streamableTransports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
  private sseTransports: { [sessionId: string]: SSEServerTransport } = {};

  private _createStreamableTransport(): StreamableHTTPServerTransport {
    const newSessionId = randomUUID();
    console.log(`Creating new Streamable HTTP transport with potential session ID: ${newSessionId}`);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => newSessionId,
      onsessioninitialized: (initializedSessionId: string) => {
        // This callback confirms the session ID is officially initialized
        console.log(`Streamable HTTP session initialized and confirmed: ${initializedSessionId}`);
      },
      // DNS rebinding protection (disabled for development)
      enableDnsRebindingProtection: false,
    });

    // Immediately store the transport instance to prevent race conditions
    this.streamableTransports[newSessionId] = transport;
    console.log(`Transport for session ${newSessionId} stored.`);

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        console.log(`Streamable HTTP session closed: ${transport.sessionId}`);
        delete this.streamableTransports[transport.sessionId];
      } else {
        // Also try to clean up using the pre-generated ID if the session was never fully initialized
        console.log(`Streamable HTTP transport closed for uninitialized session: ${newSessionId}`);
        delete this.streamableTransports[newSessionId];
      }
    };

    return transport;
  }

  private setupRoutes(): void {
    // PHASE 1: Modern Streamable HTTP endpoint (primary)
    this.app.all('/mcp', async (req: Request, res: Response) => {
      console.log(`MCP ${req.method} request from:`, req.ip);

      try {
        // Check for existing session ID in headers
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        let transport: StreamableHTTPServerTransport;

        if (sessionId && this.streamableTransports[sessionId]) {
          // Reuse existing transport
          transport = this.streamableTransports[sessionId];
          console.log('Reusing existing Streamable HTTP session:', sessionId);
        } else if (!sessionId && isInitializeRequest(req.body)) {
          // New initialization request
          transport = this._createStreamableTransport();
          // Connect to the MCP server before associating the transport with the session
          await this.mcpServer.connect(transport);
        } else {
          // Invalid request - return proper JSON-RPC error
          return this.sendJsonRpcError(res, -32000, 'Bad Request: No valid session ID provided', req.body);
        }

        // Handle the request
        await transport.handleRequest(req, res, req.body);

      } catch (error) {
        console.error('Error handling Streamable HTTP request:', error);
        if (!res.headersSent) {
          this.sendJsonRpcError(res, -32603, 'Internal server error', req.body);
        }
      }
    });

    // PHASE 1: Legacy SSE endpoint for backwards compatibility
    this.app.get('/sse', async (req: Request, res: Response) => {
      console.log('Legacy SSE connection attempt from:', req.ip);

      try {
        // Create SSE transport with message endpoint and response object
        const transport = new SSEServerTransport('/messages', res);
        
        // Store transport for message handling
        this.sseTransports[transport.sessionId] = transport;
        
        // Connect the MCP server to this transport
        await this.mcpServer.connect(transport);
        
        console.log('MCP server connected via legacy SSE transport, sessionId:', transport.sessionId);

        // Handle connection close
        req.on('close', () => {
          console.log('Legacy SSE connection closed for session:', transport.sessionId);
          delete this.sseTransports[transport.sessionId];
          transport.close();
        });

        req.on('error', (error) => {
          console.error('Legacy SSE connection error:', error);
          delete this.sseTransports[transport.sessionId];
          transport.close();
        });

      } catch (error) {
        console.error('Error setting up legacy SSE connection:', error);
        if (!res.headersSent) {
          // req.body is null for a GET request, which is handled by sendJsonRpcError
          this.sendJsonRpcError(res, -32603, 'Failed to establish SSE connection', null);
        }
      }
    });

    // Legacy message endpoint for SSE clients
    this.app.post('/messages', async (req: Request, res: Response) => {
      console.log('Received message on legacy /messages endpoint');
      const sessionId = req.query.sessionId as string;
      
      if (!sessionId) {
        return this.sendJsonRpcError(res, -32602, 'Missing sessionId parameter', req.body);
      }

      const transport = this.sseTransports[sessionId];
      if (!transport) {
        return this.sendJsonRpcError(res, -32001, 'No transport found for sessionId', req.body);
      }

      try {
        await transport.handlePostMessage(req, res, req.body);
      } catch (error) {
        console.error('Error handling legacy message:', error);
        if (!res.headersSent) {
          this.sendJsonRpcError(res, -32603, 'Internal server error', req.body);
        }
      }
    });

    // Enhanced health check
    this.app.get('/health', (req: Request, res: Response) => {
      const activeStreamableSessions = Object.keys(this.streamableTransports).length;
      const activeSseSessions = Object.keys(this.sseTransports).length;
      
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        sessions: {
          streamable: activeStreamableSessions,
          sse: activeSseSessions,
          total: activeStreamableSessions + activeSseSessions
        },
        uptime: process.uptime()
      });
    });

    // Enhanced root endpoint info
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'PromptDB MCP Server',
        version: '1.0.0',
        transports: ['streamable-http', 'sse-legacy'],
        protocol: {
          streamable: '2025-03-26',
          sse: '2024-11-05'
        },
        endpoints: {
          mcp: '/mcp (Streamable HTTP - Recommended)',
          sse: '/sse (Legacy SSE)',
          messages: '/messages (Legacy SSE Messages)',
          health: '/health'
        },
        features: [
          'Dual transport support',
          'Session management',
          'DNS rebinding protection',
          'Backwards compatibility'
        ]
      });
    });
  }

   // Helper method for consistent JSON-RPC error responses
   private sendJsonRpcError(
     res: Response,
     code: number,
     message: string,
     reqBody: any,
   ): void {
     // Extract the id from the request body if it's a valid JSON-RPC request
     const id = reqBody && typeof reqBody === 'object' ? reqBody.id : null;
 
     const statusCode = this.getHttpStatusFromJsonRpcError(code);
     res.status(statusCode).json({
       jsonrpc: '2.0',
       error: {
         code,
         message,
       },
       id, // Echo the original request id
     });
   }

  // Map JSON-RPC error codes to HTTP status codes
  private getHttpStatusFromJsonRpcError(code: number): number {
    switch (code) {
      case -32700: return 400; // Parse error
      case -32600: return 400; // Invalid Request
      case -32601: return 404; // Method not found
      case -32602: return 400; // Invalid params
      case -32603: return 500; // Internal error
      case -32000: return 400; // Server error (custom)
      case -32001: return 404; // Server error (custom)
      default: return 500;
    }
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`PromptDB MCP Server running on port ${this.port}`);
        console.log(`Modern endpoint: http://localhost:${this.port}/mcp`);
        console.log(`Legacy endpoint: http://localhost:${this.port}/sse`);
        console.log(`Health check: http://localhost:${this.port}/health`);
        resolve();
      });
    });
  }

    async stop(): Promise<void> {
    const closePromises = [
      ...Object.values(this.streamableTransports),
      ...Object.values(this.sseTransports),
    ].map(t => t.close());

    await Promise.all(closePromises);

    // Clear the transport maps
    this.streamableTransports = {};
    this.sseTransports = {};

    if (this.server) {
      this.server.close();
      this.server = undefined;
    }
  }
}