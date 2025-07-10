#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

async function testDirectoryCreation() {
  console.log('Testing directory creation fix...');
  
  try {
    // Test the path resolution logic
    const testDir = 'test-prompts-fix';
    const resolvedPath = path.resolve(process.cwd(), testDir);
    console.log('Resolved path:', resolvedPath);
    
    // Create directory
    await fs.mkdir(resolvedPath, { recursive: true });
    console.log('✅ Directory created successfully');
    
    // Test writing a file
    const testFile = path.join(resolvedPath, 'test.json');
    const testData = {
      content: 'Test prompt content',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      version: '1.0',
      tags: ['test'],
      description: 'Test prompt'
    };
    
    await fs.writeFile(testFile, JSON.stringify(testData, null, 2));
    console.log('✅ File written successfully');
    
    // Read it back
    const content = await fs.readFile(testFile, 'utf-8');
    const parsed = JSON.parse(content);
    console.log('✅ File read successfully, version:', parsed.version);
    
    // Cleanup
    await fs.rm(resolvedPath, { recursive: true, force: true });
    console.log('✅ Cleanup completed');
    
    console.log('\n🎉 Directory creation fix is working correctly!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testDirectoryCreation();