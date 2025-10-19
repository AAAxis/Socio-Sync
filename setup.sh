#!/bin/bash

# Google OAuth2 Login App Setup Script
# This script helps you set up the Google OAuth2 login application

set -e

echo "🚀 Setting up Google OAuth2 Login Application..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating environment configuration..."
    cp env.example .env.local
    echo "✅ Created .env.local file"
    echo ""
    echo "🔧 IMPORTANT: You need to configure your Google OAuth2 Client ID:"
    echo "1. Go to https://console.cloud.google.com/"
    echo "2. Create a new project or select existing one"
    echo "3. Enable Google+ API"
    echo "4. Go to Credentials > Create Credentials > OAuth 2.0 Client IDs"
    echo "5. Set Application type to 'Web application'"
    echo "6. Add 'http://localhost:3000' to Authorized JavaScript origins"
    echo "7. Copy your Client ID to .env.local file"
    echo ""
    echo "📁 Edit .env.local and replace 'your_google_client_id_here' with your actual Client ID"
    echo ""
else
    echo "✅ Environment file already exists"
fi

echo ""
echo "🎉 Setup complete! Next steps:"
echo "1. Configure your Google Client ID in .env.local"
echo "2. Run 'npm start' to start the development server"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "📚 For deployment instructions, see README.md"
