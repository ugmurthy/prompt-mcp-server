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