# PromptDB MCP Client

A command-line client for interacting with the PromptDB MCP Server via stdio transport.

## Features

- Get prompts by taskname
- Set prompts from file content
- Simple command-line interface
- Uses stdio transport for communication

## Prerequisites

- Node.js (v14 or higher)
- PromptDB MCP Server (included in this repository)

## Installation

1. Make sure the script is executable:
   ```bash
   chmod +x promptdb-client.js
   ```

## Usage

### Getting a Prompt

To retrieve a prompt by taskname:

```bash
./promptdb-client.js <taskname>
```

Example:
```bash
./promptdb-client.js code-review
```

### Setting a Prompt

To create or update a prompt from a file:

```bash
./promptdb-client.js -s <taskname> <filename>
```

Example:
```bash
./promptdb-client.js -s documentation test-prompt.txt
```

## How It Works

The client:

1. Spawns a PromptDB MCP Server process with stdio transport
2. Establishes communication using JSON-RPC over stdio
3. Sends requests to get or set prompts
4. Displays the results

## Error Handling

The client will display error messages if:
- Required arguments are missing
- The specified file cannot be read
- The server encounters an error processing the request

## Examples

### Example 1: Get a prompt

```bash
./promptdb-client.js code-review
```

### Example 2: Set a prompt

```bash
./promptdb-client.js -s new-task test-prompt.txt
```

## Troubleshooting

If you encounter issues:

1. Make sure the script has execute permissions
2. Verify the PromptDB server is built (`npm run build`)
3. Check that the file paths are correct
4. Look for error messages in the output