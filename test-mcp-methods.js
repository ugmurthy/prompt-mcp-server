import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

async function testMCPMethods() {
  console.log('Testing individual MCP methods...');
  
  try {
    const client = new Client({
      name: 'test-client',
      version: '1.0.0'
    });

    const transport = new SSEClientTransport(new URL('http://localhost:3000/sse'));
    
    console.log('Connecting...');
    await client.connect(transport);
    console.log('✅ Connected!');
    
    // Test each method individually with timeout
    const testMethod = async (methodName, method) => {
      try {
        console.log(`\nTesting ${methodName}...`);
        const result = await Promise.race([
          method(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`${methodName} timeout after 3 seconds`)), 3000)
          )
        ]);
        console.log(`✅ ${methodName} succeeded:`, JSON.stringify(result, null, 2));
        return true;
      } catch (error) {
        console.log(`❌ ${methodName} failed:`, error.message);
        return false;
      }
    };
    
    // Test each method
    await testMethod('listPrompts', () => client.listPrompts());
    await testMethod('listTools', () => client.listTools());
    await testMethod('listResources', () => client.listResources());
    
    console.log('\n--- Test completed ---');
    
    // Close the connection
    await transport.close();
    console.log('✅ Connection closed');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testMCPMethods();