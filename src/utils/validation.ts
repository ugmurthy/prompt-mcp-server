import { z } from 'zod';

export const TasknameSchema = z.string()
  .min(1, 'Task name cannot be empty')
  .max(100, 'Task name too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Task name can only contain letters, numbers, underscores, and hyphens');

export const VersionSchema = z.string()
  .regex(/^\d+\.\d+$/, 'Version must be in format X.Y (e.g., 1.0, 1.1)');

export const ContentSchema = z.string()
  .min(1, 'Content cannot be empty');

export const DescriptionSchema = z.string().optional();

export const TagsSchema = z.array(z.string()).optional();

export function validateTaskname(taskname: string): string {
  return TasknameSchema.parse(taskname);
}

export function validateVersion(version: string): string {
  return VersionSchema.parse(version);
}

export function validateContent(content: string): string {
  return ContentSchema.parse(content);
}

export function sanitizeFilename(filename: string): string {
  // Remove any path traversal attempts and invalid characters
  return filename.replace(/[^a-zA-Z0-9_-]/g, '_');
}