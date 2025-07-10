import { PromptMetadata } from '../storage/types.js';

export class PromptCache {
  private cache: Map<string, PromptMetadata>;
  private maxSize: number = 100;
  private accessOrder: string[] = []; // For LRU eviction

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: string): PromptMetadata | undefined {
    const value = this.cache.get(key);
    if (value) {
      // Move to end for LRU
      this.updateAccessOrder(key);
    }
    return value;
  }

  set(key: string, value: PromptMetadata): void {
    // If cache is full, remove least recently used
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, value);
    this.updateAccessOrder(key);
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  private updateAccessOrder(key: string): void {
    // Remove key from current position
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  private evictLRU(): void {
    if (this.accessOrder.length > 0) {
      const lruKey = this.accessOrder.shift()!;
      this.cache.delete(lruKey);
    }
  }

  // For debugging/monitoring
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
}