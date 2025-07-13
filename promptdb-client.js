#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { createInterface } from 'readline';

// Parse command line arguments
async function parseArgs() {
  const args = process.argv.slice(2);
  let isSetMode = false;
  let taskname = '';
  let filename = '';

  // Check for -s flag
  const setIndex = args.indexOf('-s');
  if (setIndex !== -1) {
    isSetMode = true;
    args.splice(setIndex, 1); // Remove -s flag
  }

  // Get taskname (first argument)
  if (args.length > 0) {
    taskname = args[0];
  } else {
    console.error('Error: Taskname is required');
    printUsage();
    process.exit(1);
  }

  // If in set mode, get filename (second argument)
  if (isSetMode) {
    if (args.length > 1) {
      filename = args[1];
    } else {
      console.error('Error: Filename is required in set mode');
      printUsage();
      process.exit(1);
    }
  }

  return { isSetMode, taskname, filename };
}

function printUsage() {
  console.log('Usage:');
  console.log('  Get prompt: node promptdb-client.js <taskname>');
  console.log('  Set prompt: node promptdb-client.js -s <taskname> <filename>');
}

// Custom implementation of a simple MCP client over stdio
class StdioMcpClient {
  constructor(serverProcess) {
    this.serverProcess = serverProcess;
    this.messageId = 1;
    this.pendingRequests = new Map();
    
    // Set up readline interface to read from server stdout
    this.rl = createInterface({
      input: serverProcess.stdout,
      crlfDelay: Infinity
    });
    
    // Handle server responses
    this.rl.on('line', (line) => {
      try {
        const response = JSON.parse(line);
        const pendingRequest = this.pendingRequests.get(response.id);
        
        if (pendingRequest) {
          if (response.error) {
            pendingRequest.reject(new Error(response.error.message));
          } else {
            pendingRequest.resolve(response.result);
          }
          this.pendingRequests.delete(response.id);
        }
      } catch (error) {
        console.error('Error parsing server response:', error.message);
      }
    });
    
    // Handle server process errors and exit
    serverProcess.on('error', (error) => {
      console.error('Server process error:', error.message);
      process.exit(1);
    });
    
    serverProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Server process exited with code ${code}`);
      }
    });
  }
  
  async sendRequest(method, params) {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };
      
      this.pendingRequests.set(id, { resolve, reject });
      
      this.serverProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  }
  
  async getPrompt(taskname) {
    return this.sendRequest('tools/use', {
      server: 'promptdb',
      tool: 'getPrompt',
      arguments: { taskname }
    });
  }
  
  async setPrompt(taskname, content, description, tags) {
    return this.sendRequest('tools/use', {
      server: 'promptdb',
      tool: 'setPrompt',
      arguments: {
        taskname,
        content,
        description,
        tags
      }
    });
  }
  
  close() {
    this.rl.close();
    this.serverProcess.stdin.end();
  }
}

async function main() {
  try {
    const { isSetMode, taskname, filename } = await parseArgs();
    
    // Start the promptdb server with stdio transport
    const server = spawn('node', ['dist/index.js', '--transport', 'stdio'], {
      stdio: ['pipe', 'pipe', 'inherit'] // We'll handle stdin/stdout, but pass stderr through
    });
    
    // Create our custom MCP client
    const client = new StdioMcpClient(server);
    
    // Wait a moment for the server to start
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.error('Connected to promptdb server');
    
    if (isSetMode) {
      // Set prompt mode
      try {
        // Read file content
        const filePath = path.resolve(process.cwd(), filename);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Call setPrompt
        const result = await client.setPrompt(
          taskname,
          content,
          `Prompt for ${taskname}`,
          ['cli-generated']
        );
        
        console.log(JSON.stringify(result, null, 2));
        console.error(`Prompt '${taskname}' set successfully`);
      } catch (error) {
        console.error(`Error setting prompt: ${error.message}`);
        process.exit(1);
      }
    } else {
      // Get prompt mode (default)
      try {
        // Call getPrompt
        const result = await client.getPrompt(taskname);
        
        console.log(JSON.stringify(result, null, 2));
      } catch (error) {
        console.error(`Error getting prompt: ${error.message}`);
        process.exit(1);
      }
    }
    
    // Close connection and exit
    client.close();
    server.kill();
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();