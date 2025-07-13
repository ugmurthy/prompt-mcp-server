// Simple test to start SSE server using environment variables
import { spawn } from 'child_process';

console.log('Starting SSE server test...');

const server = spawn('node', ['dist/index.js'], {
  env: {
    ...process.env,
    TRANSPORT_TYPE: 'sse',
    PORT: '3002'
  },
  stdio: 'inherit'
});

server.on('error', (error) => {
  console.error('Failed to start server:', error);
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

// Test endpoints after a delay
setTimeout(() => {
  console.log('\nTesting endpoints:');
  console.log('- Health: http://localhost:3002/health');
  console.log('- SSE: http://localhost:3002/sse');
  console.log('- Info: http://localhost:3002/');
  console.log('\nYou can test these endpoints in another terminal with:');
  console.log('curl http://localhost:3002/health');
}, 3000);

// Keep test running
process.on('SIGINT', () => {
  console.log('\nShutting down test...');
  server.kill();
  process.exit(0);
});