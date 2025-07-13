import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { StorageManager } from './storage/StorageManager.js';
import { PromptCache } from './cache/PromptCache.js';

import { handleListPrompts } from './tools/listPrompts.js';
import { handleGetPrompt } from './tools/getPrompt.js';
import { handleSetPrompt } from './tools/setPrompt.js';

export class PromptDBServer {
  private server: McpServer;
  private storageManager: StorageManager;
  private cache: PromptCache;

  constructor() {
    this.server = new McpServer({
      name: 'promptdb-mcp-server',
      version: '0.0.1',
    });

    this.storageManager = new StorageManager();
    this.cache = new PromptCache();

    this.setupTools();
  }

  // Expose server for SSE usage
  getServer(): McpServer {
    return this.server;
  }

  private setupTools(): void {
    // Register listPrompts tool
    this.server.registerTool(
      'listPrompts',
      {
        title: 'List Prompts',
        description: 'List all available prompts with their content and versions',
        inputSchema: {}
      },
      async () => {
        const result = await handleListPrompts(this.storageManager, this.cache);
        return {
          content: result.content
        };
      }
    );

    // Register getPrompt tool
    this.server.registerTool(
      'getPrompt',
      {
        title: 'Get Prompt',
        description: 'Retrieve a prompt by task name',
        inputSchema: {
          taskname: z.string().describe('The task name identifier'),
          version: z.string().optional().describe('Specific version (defaults to latest)')
        }
      },
      async (args) => {
        const result = await handleGetPrompt(args, this.storageManager, this.cache);
        return {
          content: result.content,
          isError: result.isError
        };
      }
    );

    // Register setPrompt tool
    this.server.registerTool(
      'setPrompt',
      {
        title: 'Set Prompt',
        description: 'Create or update a prompt for a task',
        inputSchema: {
          taskname: z.string().describe('The task name identifier'),
          content: z.string().describe('The prompt content'),
          description: z.string().optional().describe('Optional description'),
          tags: z.array(z.string()).optional().describe('Optional tags')
        }
      },
      async (args) => {
        const result = await handleSetPrompt(args, this.storageManager, this.cache);
        return {
          content: result.content,
          isError: result.isError
        };
      }
    );
  }

  // Modified to accept transport parameter
  async run(transport: any): Promise<void> {
    await this.server.connect(transport);
    console.log('PromptDB MCP Server started');
  }
}