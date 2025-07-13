#!/bin/bash

# PromptDB MCP Server - Quick Setup Script
# This script helps you quickly deploy and configure the PromptDB MCP Server with SSE transport

set -e

echo "🚀 PromptDB MCP Server - Quick Setup"
echo "===================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build the project
echo "🔨 Building the project..."
pnpm build

echo "✅ Build completed successfully"

# Ask user for deployment type
echo ""
echo "Choose deployment option:"
echo "1) Local development (http://localhost:3000)"
echo "2) Deploy to Vercel"
echo "3) Just build (manual deployment)"

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🌐 Starting local SSE server..."
        echo "Server will be available at: http://localhost:3000"
        echo "SSE endpoint: http://localhost:3000/sse"
        echo "Health check: http://localhost:3000/health"
        echo ""
        echo "Press Ctrl+C to stop the server"
        echo ""
        pnpm start:sse
        ;;
    2)
        if ! command -v vercel &> /dev/null; then
            echo "📦 Installing Vercel CLI..."
            npm install -g vercel
        fi
        
        echo "🚀 Deploying to Vercel..."
        vercel deploy
        
        echo ""
        echo "✅ Deployment completed!"
        echo "Don't forget to set these environment variables in Vercel:"
        echo "- TRANSPORT_TYPE=sse"
        echo "- PORT=3000"
        ;;
    3)
        echo ""
        echo "✅ Build completed! You can now deploy manually."
        echo "Built files are in the 'dist' directory."
        echo ""
        echo "For manual deployment:"
        echo "- Set TRANSPORT_TYPE=sse"
        echo "- Set PORT=3000"
        echo "- Deploy the 'dist' directory"
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "📋 MCP Client Configuration:"
echo "=========================="
echo ""
echo "For Claude Desktop, add this to your config:"
echo '{'
echo '  "mcpServers": {'
echo '    "promptdb": {'
echo '      "transport": {'
echo '        "type": "sse",'
echo '        "url": "http://localhost:3000/sse"'
echo '      }'
echo '    }'
echo '  }'
echo '}'
echo ""
echo "For cloud deployment, replace localhost:3000 with your deployment URL."
echo ""
echo "📚 For more configuration options, see:"
echo "- MCP_CLIENT_CONFIGURATION.md"
echo "- SSE_TRANSPORT_GUIDE.md"
echo "- README.md"
echo ""
echo "🎉 Setup complete! Happy prompting!"