import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { StorageManager } from '../storage/StorageManager.js';
import { PromptCache } from '../cache/PromptCache.js';

export const getPromptTool: Tool = {
  name: 'getPrompt',
  description: 'Retrieve a prompt by task name',
  inputSchema: {
    type: 'object',
    properties: {
      taskname: {
        type: 'string',
        description: 'The task name identifier'
      },
      version: {
        type: 'string',
        description: 'Specific version (defaults to latest)'
      }
    },
    required: ['taskname'],
    additionalProperties: false
  }
};

const GetPromptArgsSchema = z.object({
  taskname: z.string(),
  version: z.string().optional()
});

export async function handleGetPrompt(
  args: unknown,
  storageManager: StorageManager,
  cache: PromptCache
) {
  try {
    const { taskname, version } = GetPromptArgsSchema.parse(args);
    
    // Create cache key
    const cacheKey = version ? `${taskname}_v${version}` : taskname;
    
    // Try cache first
    let prompt = cache.get(cacheKey);
    
    if (!prompt) {
      // Load from storage
      prompt = await storageManager.getPrompt(taskname, version);
      // Cache the result
      cache.set(cacheKey, prompt);
    }
    
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify(prompt, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text' as const,
        text: `Error retrieving prompt: ${(error as Error).message}`
      }],
      isError: true
    };
  }
}