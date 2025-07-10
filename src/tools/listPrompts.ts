import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { StorageManager } from '../storage/StorageManager.js';
import { PromptCache } from '../cache/PromptCache.js';

export const listPromptsTool: Tool = {
  name: 'listPrompts',
  description: 'List all available prompts with their content and versions',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  }
};

export async function handleListPrompts(
  storageManager: StorageManager,
  cache: PromptCache
) {
  try {
    const prompts = await storageManager.listPrompts();
    
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(prompts, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text' as const,
        text: `Error listing prompts: ${(error as Error).message}`
      }],
      isError: true
    };
  }
}