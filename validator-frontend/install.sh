#!/bin/bash

echo "🚀 Setting up Validator Frontend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION is compatible"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Check if backend is running
echo "🔍 Checking backend connection..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend is running on port 3001"
else
    echo "⚠️  Backend is not running on port 3001. Please start the backend server first."
    echo "   Run: cd /home/kineva/backend && npm run dev"
fi

echo "🎉 Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Ensure the backend server is running on port 3001"
echo "2. Start the validator frontend:"
echo "   npm run dev"
echo ""
echo "3. Open your browser to: http://localhost:3002"
echo ""
echo "🔐 Login with validator credentials to access the dashboard" 