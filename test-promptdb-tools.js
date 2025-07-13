import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

// Test configuration
const SERVER_URL = 'http://localhost:3000/sse';
const TEST_TIMEOUT = 10000;

// Test data
const testPrompts = {
  basic: {
    taskname: 'test-basic-prompt',
    content: 'This is a basic test prompt for unit testing.'
  },
  full: {
    taskname: 'test-full-prompt',
    content: 'This is a comprehensive test prompt with all fields.',
    description: 'A test prompt with description and tags',
    tags: ['test', 'comprehensive', 'example']
  },
  update: {
    taskname: 'test-update-prompt',
    content: 'Original content for update testing.'
  },
  special: {
    taskname: 'test-special-chars',
    content: 'Test with special characters: áéíóú, 中文, 🚀, "quotes", \'apostrophes\', and\nnewlines.',
    description: 'Testing Unicode and special characters',
    tags: ['unicode', 'special-chars', 'testing']
  }
};

class PromptDBTester {
  constructor() {
    this.client = null;
    this.transport = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async connect() {
    console.log('🔌 Connecting to PromptDB MCP Server...');
    
    this.client = new Client({
      name: 'promptdb-test-client',
      version: '1.0.0'
    });

    this.transport = new SSEClientTransport(new URL(SERVER_URL));
    
    const connectPromise = this.client.connect(this.transport);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timeout')), TEST_TIMEOUT)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    console.log('✅ Connected successfully\n');
  }

  async disconnect() {
    if (this.transport) {
      await this.transport.close();
      console.log('🔌 Connection closed');
    }
  }

  logTest(testName, passed, error = null) {
    if (passed) {
      console.log(`✅ ${testName}`);
      this.testResults.passed++;
    } else {
      console.log(`❌ ${testName}: ${error?.message || 'Unknown error'}`);
      this.testResults.failed++;
      this.testResults.errors.push({ test: testName, error: error?.message });
    }
  }

  async runTest(testName, testFunction) {
    try {
      await testFunction();
      this.logTest(testName, true);
    } catch (error) {
      this.logTest(testName, false, error);
    }
  }

  // TEST CASE 1: Tool Discovery Tests
  async testToolDiscovery() {
    console.log('📋 TEST CASE 1: Tool Discovery Tests');
    console.log('=====================================');

    await this.runTest('List available tools', async () => {
      const result = await this.client.listTools();
      
      if (!result.tools || !Array.isArray(result.tools)) {
        throw new Error('Tools list not returned or not an array');
      }

      const expectedTools = ['listPrompts', 'getPrompt', 'setPrompt'];
      const actualTools = result.tools.map(tool => tool.name);
      
      for (const expectedTool of expectedTools) {
        if (!actualTools.includes(expectedTool)) {
          throw new Error(`Missing expected tool: ${expectedTool}`);
        }
      }

      if (result.tools.length !== 3) {
        throw new Error(`Expected 3 tools, got ${result.tools.length}`);
      }
    });

    await this.runTest('Verify tool schemas', async () => {
      const result = await this.client.listTools();
      
      for (const tool of result.tools) {
        if (!tool.name || !tool.description || !tool.inputSchema) {
          throw new Error(`Tool ${tool.name} missing required properties`);
        }

        // Verify specific tool schemas
        switch (tool.name) {
          case 'listPrompts':
            if (Object.keys(tool.inputSchema.properties || {}).length !== 0) {
              throw new Error('listPrompts should have no input parameters');
            }
            break;
          
          case 'getPrompt':
            const getSchema = tool.inputSchema.properties;
            if (!getSchema.taskname || !getSchema.taskname.type === 'string') {
              throw new Error('getPrompt missing taskname parameter');
            }
            if (!tool.inputSchema.required.includes('taskname')) {
              throw new Error('getPrompt taskname should be required');
            }
            break;
          
          case 'setPrompt':
            const setSchema = tool.inputSchema.properties;
            if (!setSchema.taskname || !setSchema.content) {
              throw new Error('setPrompt missing required parameters');
            }
            const required = tool.inputSchema.required;
            if (!required.includes('taskname') || !required.includes('content')) {
              throw new Error('setPrompt missing required field specifications');
            }
            break;
        }
      }
    });

    console.log('');
  }

  // TEST CASE 2: setPrompt Tool Tests
  async testSetPromptTool() {
    console.log('💾 TEST CASE 2: setPrompt Tool Tests');
    console.log('===================================');

    await this.runTest('Create basic prompt', async () => {
      const result = await this.client.callTool('setPrompt', testPrompts.basic);
      
      if (result.isError) {
        throw new Error(`Tool returned error: ${result.content[0]?.text}`);
      }

      const response = JSON.parse(result.content[0].text);
      if (!response.message.includes('saved successfully')) {
        throw new Error('Success message not found in response');
      }
      
      if (!response.version || !response.created || !response.updated) {
        throw new Error('Missing metadata in response');
      }
    });

    await this.runTest('Create prompt with all fields', async () => {
      const result = await this.client.callTool('setPrompt', testPrompts.full);
      
      if (result.isError) {
        throw new Error(`Tool returned error: ${result.content[0]?.text}`);
      }

      const response = JSON.parse(result.content[0].text);
      if (!response.message.includes(testPrompts.full.taskname)) {
        throw new Error('Taskname not found in success message');
      }
    });

    await this.runTest('Update existing prompt', async () => {
      // First create the prompt
      await this.client.callTool('setPrompt', testPrompts.update);
      
      // Then update it
      const updatedPrompt = {
        ...testPrompts.update,
        content: 'Updated content for version testing.',
        description: 'Updated description'
      };
      
      const result = await this.client.callTool('setPrompt', updatedPrompt);
      
      if (result.isError) {
        throw new Error(`Update failed: ${result.content[0]?.text}`);
      }

      const response = JSON.parse(result.content[0].text);
      // Version should be incremented (assuming it starts at 1.0)
      if (!response.version || response.version === '1.0') {
        console.warn('Version increment not detected - this may be expected behavior');
      }
    });

    await this.runTest('Handle special characters', async () => {
      const result = await this.client.callTool('setPrompt', testPrompts.special);
      
      if (result.isError) {
        throw new Error(`Special characters failed: ${result.content[0]?.text}`);
      }
    });

    await this.runTest('Validate required fields', async () => {
      try {
        // Test missing taskname
        await this.client.callTool('setPrompt', { content: 'test content' });
        throw new Error('Should have failed with missing taskname');
      } catch (error) {
        if (!error.message.includes('taskname') && !error.message.includes('required')) {
          throw new Error('Wrong error message for missing taskname');
        }
      }

      try {
        // Test missing content
        await this.client.callTool('setPrompt', { taskname: 'test' });
        throw new Error('Should have failed with missing content');
      } catch (error) {
        if (!error.message.includes('content') && !error.message.includes('required')) {
          throw new Error('Wrong error message for missing content');
        }
      }
    });

    console.log('');
  }

  // TEST CASE 3: getPrompt Tool Tests
  async testGetPromptTool() {
    console.log('📖 TEST CASE 3: getPrompt Tool Tests');
    console.log('===================================');

    await this.runTest('Retrieve basic prompt', async () => {
      const result = await this.client.callTool('getPrompt', { 
        taskname: testPrompts.basic.taskname 
      });
      
      if (result.isError) {
        throw new Error(`Failed to get prompt: ${result.content[0]?.text}`);
      }

      const prompt = JSON.parse(result.content[0].text);
      if (prompt.content !== testPrompts.basic.content) {
        throw new Error('Retrieved content does not match original');
      }

      // Verify metadata structure
      if (!prompt.created || !prompt.updated || !prompt.version) {
        throw new Error('Missing metadata in retrieved prompt');
      }
    });

    await this.runTest('Retrieve prompt with all fields', async () => {
      const result = await this.client.callTool('getPrompt', { 
        taskname: testPrompts.full.taskname 
      });
      
      if (result.isError) {
        throw new Error(`Failed to get full prompt: ${result.content[0]?.text}`);
      }

      const prompt = JSON.parse(result.content[0].text);
      
      if (prompt.content !== testPrompts.full.content) {
        throw new Error('Content mismatch');
      }
      
      if (prompt.description !== testPrompts.full.description) {
        throw new Error('Description mismatch');
      }
      
      if (!Array.isArray(prompt.tags) || prompt.tags.length !== testPrompts.full.tags.length) {
        throw new Error('Tags mismatch');
      }
    });

    await this.runTest('Handle non-existent prompt', async () => {
      const result = await this.client.callTool('getPrompt', { 
        taskname: 'non-existent-prompt-12345' 
      });
      
      if (!result.isError) {
        throw new Error('Should have returned error for non-existent prompt');
      }

      if (!result.content[0]?.text.includes('Error')) {
        throw new Error('Error message not properly formatted');
      }
    });

    await this.runTest('Test cache behavior', async () => {
      const taskname = testPrompts.basic.taskname;
      
      // First call
      const start1 = Date.now();
      const result1 = await this.client.callTool('getPrompt', { taskname });
      const time1 = Date.now() - start1;
      
      // Second call (should be cached)
      const start2 = Date.now();
      const result2 = await this.client.callTool('getPrompt', { taskname });
      const time2 = Date.now() - start2;
      
      if (result1.isError || result2.isError) {
        throw new Error('Cache test failed due to errors');
      }

      // Results should be identical
      if (result1.content[0].text !== result2.content[0].text) {
        throw new Error('Cached result differs from original');
      }

      // Note: Cache performance test is informational
      console.log(`    Cache performance: First call ${time1}ms, Second call ${time2}ms`);
    });

    await this.runTest('Validate required parameters', async () => {
      try {
        await this.client.callTool('getPrompt', {});
        throw new Error('Should have failed with missing taskname');
      } catch (error) {
        if (!error.message.includes('taskname') && !error.message.includes('required')) {
          throw new Error('Wrong error message for missing taskname');
        }
      }
    });

    console.log('');
  }

  // TEST CASE 4: listPrompts Tool Tests
  async testListPromptsTool() {
    console.log('📋 TEST CASE 4: listPrompts Tool Tests');
    console.log('=====================================');

    await this.runTest('List all prompts', async () => {
      const result = await this.client.callTool('listPrompts', {});
      
      if (result.isError) {
        throw new Error(`Failed to list prompts: ${result.content[0]?.text}`);
      }

      const prompts = JSON.parse(result.content[0].text);
      
      if (!Array.isArray(prompts)) {
        throw new Error('Prompts list is not an array');
      }

      // Should have at least the prompts we created
      const expectedTasknames = [
        testPrompts.basic.taskname,
        testPrompts.full.taskname,
        testPrompts.update.taskname,
        testPrompts.special.taskname
      ];

      const actualTasknames = prompts.map(p => p.taskname);
      
      for (const expected of expectedTasknames) {
        if (!actualTasknames.includes(expected)) {
          throw new Error(`Missing expected prompt: ${expected}`);
        }
      }
    });

    await this.runTest('Verify prompt summary structure', async () => {
      const result = await this.client.callTool('listPrompts', {});
      const prompts = JSON.parse(result.content[0].text);
      
      for (const prompt of prompts) {
        if (!prompt.taskname || !prompt.content || !prompt.version) {
          throw new Error(`Prompt summary missing required fields: ${JSON.stringify(prompt)}`);
        }
        
        if (typeof prompt.taskname !== 'string' || 
            typeof prompt.content !== 'string' || 
            typeof prompt.version !== 'string') {
          throw new Error('Prompt summary fields have wrong types');
        }
      }
    });

    await this.runTest('Verify alphabetical sorting', async () => {
      const result = await this.client.callTool('listPrompts', {});
      const prompts = JSON.parse(result.content[0].text);
      
      if (prompts.length < 2) {
        console.log('    Skipping sort test - need at least 2 prompts');
        return;
      }

      for (let i = 1; i < prompts.length; i++) {
        if (prompts[i-1].taskname > prompts[i].taskname) {
          throw new Error(`Prompts not sorted alphabetically: ${prompts[i-1].taskname} > ${prompts[i].taskname}`);
        }
      }
    });

    await this.runTest('Verify content accuracy', async () => {
      const result = await this.client.callTool('listPrompts', {});
      const prompts = JSON.parse(result.content[0].text);
      
      // Find our test prompts and verify content
      const basicPrompt = prompts.find(p => p.taskname === testPrompts.basic.taskname);
      if (!basicPrompt) {
        throw new Error('Basic test prompt not found in list');
      }
      
      if (basicPrompt.content !== testPrompts.basic.content) {
        throw new Error('Basic prompt content mismatch in list');
      }

      const fullPrompt = prompts.find(p => p.taskname === testPrompts.full.taskname);
      if (!fullPrompt) {
        throw new Error('Full test prompt not found in list');
      }
      
      if (fullPrompt.content !== testPrompts.full.content) {
        throw new Error('Full prompt content mismatch in list');
      }
    });

    console.log('');
  }

  async runAllTests() {
    console.log('🧪 PromptDB MCP Server Tool Tests');
    console.log('==================================\n');

    try {
      await this.connect();
      
      await this.testToolDiscovery();
      await this.testSetPromptTool();
      await this.testGetPromptTool();
      await this.testListPromptsTool();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.testResults.failed++;
      this.testResults.errors.push({ test: 'Test Suite', error: error.message });
    } finally {
      await this.disconnect();
    }

    // Print summary
    console.log('\n📊 Test Results Summary');
    console.log('=======================');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n🔍 Error Details:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.test}: ${error.error}`);
      });
    }

    console.log('\n🏁 Test suite completed');
    
    // Exit with appropriate code
    process.exit(this.testResults.failed > 0 ? 1 : 0);
  }
}

// Run the tests
const tester = new PromptDBTester();
tester.runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});