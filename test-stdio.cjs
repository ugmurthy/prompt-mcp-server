#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('Testing stdio transport...');

const server = spawn('node', ['dist/index.js', '--transport', 'stdio'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send a test message
const testMessage = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "tools/list"
}) + '\n';

server.stdin.write(testMessage);

// Handle response
server.stdout.on('data', (data) => {
  console.log('Server response:', data.toString());
  server.kill();
});

server.stderr.on('data', (data) => {
  console.log('Server stderr:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(0);
});

// Timeout after 5 seconds
setTimeout(() => {
  console.log('Test timeout - killing server');
  server.kill();
  process.exit(1);
}, 5000);