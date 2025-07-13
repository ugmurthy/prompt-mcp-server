#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'fs';
import path from 'path';

async function main() {
  const args = process.argv.slice(2);
  const transport = new StdioClientTransport({
    command: 'node',
    args: [path.resolve(process.cwd(), 'dist/index.js'), '--transport', 'stdio'],
  });
  const mcp = new Client({
    name: 'promptdb-client',
    version: '1.0.0',
  });

  await mcp.connect(transport);

  if (args.includes('-s')) {
    const [taskname, promptFilename] = args.slice(args.indexOf('-s') + 1);
    if (!taskname || !promptFilename) {
      console.error('Usage: node promptdb-client.js -s <taskname> <promptfilename>');
      process.exit(1);
    }
    const promptContent = fs.readFileSync(promptFilename, 'utf-8');
    const result = await mcp.callTool({ name: 'setPrompt', arguments: { taskname, content: promptContent } });
    console.log(result.content[0].text);
  } else {
    const [taskname] = args;
    if (!taskname) {
      console.error('Usage: node promptdb-client.js <taskname>');
      process.exit(1);
    }
    const result = await mcp.callTool({ name: 'getPrompt', arguments: { taskname } });
    console.log(result.content[0].text);
  }

  await mcp.close();
}

main().catch(console.error);