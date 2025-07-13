import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath, URL } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    target: 'node18',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'promptdb-mcp-server',
      fileName: 'index',
      formats: ['es']
    },
    rollupOptions: {
      external: [
        // Node.js built-ins
        'fs', 'path', 'fs/promises', 'os', 'process',
        'node:process', 'node:fs', 'node:path', 'node:crypto', 'node:os',
        'http', 'https', 'url', 'events', 'stream', 'util', 'zlib',
        'querystring', 'crypto', 'buffer', 'net', 'async_hooks',
        'string_decoder', 'child_process', 'cluster', 'dgram',
        'dns', 'domain', 'module', 'perf_hooks', 'punycode',
        'readline', 'repl', 'tls', 'tty', 'v8', 'vm', 'worker_threads',
        // Express and related
        'express', 'cors',
        // MCP SDK
        '@modelcontextprotocol/sdk',
        // Other dependencies that should remain external
        /^node:/,
        /^@types\//
      ]
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: false, // Disable minification to avoid bundling issues
    sourcemap: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});