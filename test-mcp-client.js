import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

async function testMCPClient() {
  console.log('Testing MCP client connection to SSE server...');
  
  try {
    const client = new Client({
      name: 'test-client',
      version: '1.0.0'
    });

    const transport = new SSEClientTransport(new URL('http://localhost:3000/sse'));
    
    console.log('Connecting to MCP server...');
    
    // Add timeout to prevent hanging
    const connectPromise = client.connect(transport);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    console.log('✅ Successfully connected to MCP server!');
    
    // Test listing prompts
    console.log('Testing listPrompts...');
    const prompts = await client.listPrompts();
    console.log('Available prompts:', prompts.prompts?.length || 0);
    
    // Test listing tools
    console.log('Testing listTools...');
    const tools = await client.listTools();
    console.log('Available tools:', tools.tools?.length || 0);
    
    // Test listing resources
    console.log('Testing listResources...');
    const resources = await client.listResources();
    console.log('Available resources:', resources.resources?.length || 0);
    
    console.log('✅ All tests passed!');
    
    // Close the connection
    await transport.close();
    console.log('Connection closed.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testMCPClient();