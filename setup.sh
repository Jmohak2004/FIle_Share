#!/bin/bash

# FileFight Setup Script
# This script helps set up the project for local development

echo "🎮 FileFight Setup"
echo "=================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Setup server
echo "📦 Setting up server..."
cd server
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "   (node_modules already exists, skipping npm install)"
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "   ✅ Created .env from .env.example"
    echo "   ⚠️  Please update .env with your MongoDB URI and other settings"
else
    echo "   ✅ .env already exists"
fi

cd ..
echo ""

# Setup client
echo "📦 Setting up client..."
cd client
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "   (node_modules already exists, skipping npm install)"
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "   ✅ Created .env from .env.example"
else
    echo "   ✅ .env already exists"
fi

cd ..
echo ""

echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Update server/.env with your MongoDB URI"
echo "   2. Update client/.env with your API URL (http://localhost:5001 for local dev)"
echo ""
echo "🚀 To start development:"
echo "   Terminal 1: cd server && npm run dev"
echo "   Terminal 2: cd client && npm run dev"
echo ""
echo "📖 For deployment instructions, see DEPLOYMENT.md"
