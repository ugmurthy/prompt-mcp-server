#!/usr/bin/env node

import { PromptDBServer } from './server.js';

async function main() {
  try {
    const server = new PromptDBServer();
    await server.run();
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