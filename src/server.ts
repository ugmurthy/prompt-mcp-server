import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Log server start (to stderr so it doesn't interfere with MCP protocol)
    console.error('PromptDB MCP Server started');
  }
}