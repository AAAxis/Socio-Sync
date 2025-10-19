#!/bin/bash

# Deployment Script for Google OAuth2 Login App
# This script helps deploy the application to various platforms

set -e

echo "🚀 Google OAuth2 Login App Deployment Script"
echo ""

# Function to deploy to Vercel
deploy_vercel() {
    echo "📦 Deploying to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        echo "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    # Build the project
    echo "Building project..."
    npm run build
    
    # Deploy to Vercel
    echo "Deploying..."
    vercel --prod
    
    echo "✅ Deployment to Vercel complete!"
    echo "🔗 Your app is now live at the URL shown above"
}

# Function to deploy to Netlify
deploy_netlify() {
    echo "📦 Deploying to Netlify..."
    
    # Check if Netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        echo "Installing Netlify CLI..."
        npm install -g netlify-cli
    fi
    
    # Build the project
    echo "Building project..."
    npm run build
    
    # Deploy to Netlify
    echo "Deploying..."
    netlify deploy --prod --dir=build
    
    echo "✅ Deployment to Netlify complete!"
}

# Function to show deployment options
show_options() {
    echo "Choose your deployment platform:"
    echo "1) Vercel (Recommended)"
    echo "2) Netlify"
    echo "3) Manual deployment instructions"
    echo "4) Exit"
    echo ""
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            deploy_vercel
            ;;
        2)
            deploy_netlify
            ;;
        3)
            show_manual_instructions
            ;;
        4)
            echo "Goodbye! 👋"
            exit 0
            ;;
        *)
            echo "Invalid choice. Please try again."
            show_options
            ;;
    esac
}

# Function to show manual deployment instructions
show_manual_instructions() {
    echo ""
    echo "📋 Manual Deployment Instructions:"
    echo ""
    echo "1. Build the project:"
    echo "   npm run build"
    echo ""
    echo "2. Upload the 'build' folder to your hosting provider"
    echo ""
    echo "3. Set environment variable:"
    echo "   REACT_APP_GOOGLE_CLIENT_ID=your_client_id_here"
    echo ""
    echo "4. Add your domain to Google Cloud Console:"
    echo "   - Go to Google Cloud Console"
    echo "   - Navigate to APIs & Services > Credentials"
    echo "   - Edit your OAuth 2.0 Client ID"
    echo "   - Add your domain to 'Authorized JavaScript origins'"
    echo ""
    echo "5. Test your deployment!"
    echo ""
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found!"
    echo "Please configure your Google Client ID first:"
    echo "1. Copy env.example to .env.local"
    echo "2. Add your Google Client ID"
    echo "3. Run this script again"
    echo ""
    exit 1
fi

# Show deployment options
show_options
