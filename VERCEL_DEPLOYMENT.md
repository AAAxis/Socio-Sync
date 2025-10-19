# Vercel Deployment Guide

This guide will help you deploy the Socio-Sync application to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Git repository (GitHub, GitLab, or Bitbucket)
3. Firebase project with valid credentials
4. Node.js 18+ installed locally (for testing)

## Step 1: Prepare Your Repository

### 1.1 Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

### 1.2 Commit Your Code

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your Git repository
4. Configure your project:
   - **Framework Preset**: Create React App
   - **Root Directory**: `./`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `build` (default)
   - **Install Command**: `npm install` (default)

5. Click "Deploy"

### Option B: Deploy via CLI

```bash
cd /Users/admin/Documents/GitHub/Socio-Sync
vercel
```

Follow the prompts to complete the deployment.

## Step 3: Configure Environment Variables (If Needed)

If you plan to use environment variables for Firebase config (recommended for production):

1. Go to your project settings in Vercel
2. Navigate to "Environment Variables"
3. Add the following variables:
   - `REACT_APP_FIREBASE_API_KEY`
   - `REACT_APP_FIREBASE_AUTH_DOMAIN`
   - `REACT_APP_FIREBASE_PROJECT_ID`
   - `REACT_APP_FIREBASE_STORAGE_BUCKET`
   - `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
   - `REACT_APP_FIREBASE_APP_ID`
   - `REACT_APP_FIREBASE_MEASUREMENT_ID`
   - `REACT_APP_GOOGLE_CALENDAR_API_KEY`
   - `REACT_APP_GOOGLE_CALENDAR_CLIENT_ID`
   - `REACT_APP_FILESERVER_URL` (e.g., https://intake.theholylabs.com)

4. Redeploy your application

## Step 4: Update Firebase Authorized Domains

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to Authentication → Settings → Authorized Domains
4. Add your Vercel domain (e.g., `your-app.vercel.app`)
5. If using custom domain, add that too

## Step 5: Configure Google Calendar API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add your Vercel domain to "Authorized JavaScript origins":
   - `https://your-app.vercel.app`
5. Add to "Authorized redirect URIs":
   - `https://your-app.vercel.app`
   - `https://your-app.vercel.app/oauth2callback`

## Step 6: Verify Deployment

1. Visit your Vercel deployment URL
2. Test authentication with Google
3. Verify Firebase connectivity
4. Test Google Calendar integration
5. Check that all features work as expected

## Troubleshooting

### Build Fails

- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### Firebase Connection Issues

- Verify Firebase config in `src/firebase.ts`
- Check Firebase authorized domains
- Ensure Firestore rules allow necessary operations

### Google Calendar Not Working

- Verify Google Calendar API credentials
- Check authorized JavaScript origins
- Ensure API key restrictions allow your domain

## Custom Domain Setup

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain
4. Update DNS records as instructed
5. Add custom domain to Firebase and Google Cloud authorized domains

## Continuous Deployment

Vercel automatically deploys:
- **Production**: Pushes to `main` branch
- **Preview**: Pull requests and other branches

## Performance Optimization

Your `vercel.json` is configured to:
- Cache static assets for 1 year
- Route all traffic through `index.html` (SPA routing)

## Support

For issues:
- Check [Vercel Documentation](https://vercel.com/docs)
- Review Firebase logs
- Contact your development team

## Security Notes

- Never commit sensitive keys to Git
- Use environment variables for secrets
- Keep Firebase security rules updated
- Regularly review authorized domains
- Monitor authentication logs

