import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { StorageManager } from '../storage/StorageManager.js';
import { PromptCache } from '../cache/PromptCache.js';

export const setPromptTool: Tool = {
  name: 'setPrompt',
  description: 'Create or update a prompt for a task',
  inputSchema: {
    type: 'object',
    properties: {
      taskname: {
        type: 'string',
        description: 'The task name identifier'
      },
      content: {
        type: 'string',
        description: 'The prompt content'
      },
      description: {
        type: 'string',
        description: 'Optional description'
      },
      tags: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Optional tags'
      }
    },
    required: ['taskname', 'content'],
    additionalProperties: false
  }
};

const SetPromptArgsSchema = z.object({
  taskname: z.string(),
  content: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional()
});

export async function handleSetPrompt(
  args: unknown,
  storageManager: StorageManager,
  cache: PromptCache
) {
  try {
    const { taskname, content, description, tags } = SetPromptArgsSchema.parse(args);
    
    // Set the prompt
    const prompt = await storageManager.setPrompt(taskname, {
      content,
      description,
      tags
    });
    
    // Update cache with new version
    cache.set(taskname, prompt);
    
    // Invalidate any version-specific cache entries for this taskname
    // Note: In a more sophisticated implementation, we might track all cache keys
    // For now, we'll rely on the LRU eviction to handle old entries
    
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          message: `Prompt '${taskname}' saved successfully`,
          version: prompt.version,
          created: prompt.created,
          updated: prompt.updated
        }, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text' as const,
        text: `Error setting prompt: ${(error as Error).message}`
      }],
      isError: true
    };
  }
}