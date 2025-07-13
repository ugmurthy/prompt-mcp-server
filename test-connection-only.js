import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

async function testConnection() {
  console.log('Testing basic SSE connection...');
  
  try {
    const client = new Client({
      name: 'test-client',
      version: '1.0.0'
    });

    const transport = new SSEClientTransport(new URL('http://localhost:3000/sse'));
    
    console.log('Attempting to connect...');
    
    // Add timeout to prevent hanging
    const connectPromise = client.connect(transport);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout after 5 seconds')), 5000)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    console.log('✅ Connection successful!');
    
    // Just wait a moment to ensure connection is stable
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Connection is stable!');
    
    // Close the connection
    await transport.close();
    console.log('✅ Connection closed successfully!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testConnection();