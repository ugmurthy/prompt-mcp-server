export interface PromptMetadata {
  content: string;
  created: string;      // ISO timestamp
  updated: string;      // ISO timestamp
  version: string;      // Semantic version (1.0, 1.1, etc.)
  tags: string[];       // Searchable tags
  description: string;  // Human-readable description
}

export interface PromptSummary {
  taskname: string;
  content: string;
  version: string;
}