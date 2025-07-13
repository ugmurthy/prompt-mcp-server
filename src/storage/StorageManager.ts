import { promises as fs } from 'fs';
import path from 'path';
import { PromptMetadata, PromptSummary } from './types.js';
import { validateTaskname, validateContent, sanitizeFilename } from '../utils/validation.js';

export class StorageManager {
  private promptsDir: string;
  private cache: Map<string, { prompt: PromptMetadata, timestamp: number }> = new Map();
  private CACHE_TTL = 5000; // 5 seconds

  constructor(promptsDir: string = 'prompts') {
    // If it's a relative path, resolve it relative to the current working directory
    // If it's already absolute, use it as-is
    if (path.isAbsolute(promptsDir)) {
      this.promptsDir = promptsDir;
    } else {
      this.promptsDir = path.resolve(process.cwd(), promptsDir);
    }
  }

  async getPrompt(taskname: string, version?: string): Promise<PromptMetadata> {
    validateTaskname(taskname);
    await this.ensurePromptsDirectory();

    const filename = version 
      ? `${sanitizeFilename(taskname)}_v${version}.json`
      : `${sanitizeFilename(taskname)}.json`;
    
    const filePath = path.join(this.promptsDir, filename);

    const cached = this.cache.get(filePath);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      return cached.prompt;
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const prompt = JSON.parse(content) as PromptMetadata;
      this.cache.set(filePath, { prompt, timestamp: Date.now() });
      return prompt;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Prompt '${taskname}' ${version ? `version ${version}` : ''} not found`);
      }
      throw new Error(`Failed to read prompt: ${(error as Error).message}`);
    }
  }

  async setPrompt(taskname: string, data: Partial<PromptMetadata>): Promise<PromptMetadata> {
    validateTaskname(taskname);
    if (data.content) {
      validateContent(data.content);
    }
    
    await this.ensurePromptsDirectory();

    // Get next version
    const nextVersion = await this.getNextVersion(taskname);
    
    // Archive current version if it exists
    if (nextVersion !== '1.0') {
      const currentVersion = await this.getCurrentVersion(taskname);
      if (currentVersion) {
        await this.archiveCurrentVersion(taskname, currentVersion);
      }
    }

    // Create new prompt metadata
    const now = new Date().toISOString();
    const promptMetadata: PromptMetadata = {
      content: data.content || '',
      created: nextVersion === '1.0' ? now : (await this.getCreatedDate(taskname)) || now,
      updated: now,
      version: nextVersion,
      tags: data.tags || [],
      description: data.description || ''
    };

    // Write to main file
    const filePath = path.join(this.promptsDir, `${sanitizeFilename(taskname)}.json`);
    await fs.writeFile(filePath, JSON.stringify(promptMetadata, null, 2), 'utf-8');

    // Invalidate cache
    this.cache.delete(filePath);
    return promptMetadata;
  }

  async listPrompts(): Promise<PromptSummary[]> {
    await this.ensurePromptsDirectory();

    try {
      const files = await fs.readdir(this.promptsDir);
      const promptFiles = files.filter(file => 
        file.endsWith('.json') && !file.includes('_v')
      );

      const prompts: PromptSummary[] = [];

      for (const file of promptFiles) {
        try {
          const taskname = path.basename(file, '.json');
          const prompt = await this.getPrompt(taskname);
          prompts.push({
            taskname,
            content: prompt.content,
            version: prompt.version
          });
        } catch (error) {
          // Skip files that can't be read
          console.warn(`Failed to read prompt file ${file}: ${(error as Error).message}`);
        }
      }

      return prompts.sort((a, b) => a.taskname.localeCompare(b.taskname));
    } catch (error) {
      throw new Error(`Failed to list prompts: ${(error as Error).message}`);
    }
  }

  private async getNextVersion(taskname: string): Promise<string> {
    try {
      const currentPrompt = await this.getPrompt(taskname);
      const [major, minor] = currentPrompt.version.split('.').map(Number);
      return `${major}.${minor + 1}`;
    } catch (error) {
      // If prompt doesn't exist, start with version 1.0
      return '1.0';
    }
  }

  private async getCurrentVersion(taskname: string): Promise<string | null> {
    try {
      const prompt = await this.getPrompt(taskname);
      return prompt.version;
    } catch (error) {
      return null;
    }
  }

  private async getCreatedDate(taskname: string): Promise<string | null> {
    try {
      const prompt = await this.getPrompt(taskname);
      return prompt.created;
    } catch (error) {
      return null;
    }
  }

  private async archiveCurrentVersion(taskname: string, currentVersion: string): Promise<void> {
    const currentFile = path.join(this.promptsDir, `${sanitizeFilename(taskname)}.json`);
    const archiveFile = path.join(this.promptsDir, `${sanitizeFilename(taskname)}_v${currentVersion}.json`);

    try {
      await fs.access(currentFile);
      await fs.copyFile(currentFile, archiveFile);
    } catch (error) {
      // If current file doesn't exist, nothing to archive
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error(`Failed to archive current version: ${(error as Error).message}`);
      }
    }
  }

  private async ensurePromptsDirectory(): Promise<void> {
    try {
      await fs.access(this.promptsDir);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        await fs.mkdir(this.promptsDir, { recursive: true });
      } else {
        throw error;
      }
    }
  }
}