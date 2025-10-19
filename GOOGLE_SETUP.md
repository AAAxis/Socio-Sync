# Google OAuth2 Setup Guide

This guide will walk you through setting up Google OAuth2 for the login application.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: `google-oauth-login`
4. Click "Create"

## Step 2: Enable Google+ API

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click on it and press "Enable"

## Step 3: Create OAuth2 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. If prompted, configure the OAuth consent screen:
   - Choose "External" user type
   - Fill in required fields (App name, User support email, Developer contact)
   - Add your email to test users
4. For Application type, select "Web application"
5. Give it a name: `Google OAuth Login App`

## Step 4: Configure Authorized Origins

Add the following to **Authorized JavaScript origins**:

### Development
```
http://localhost:3000
```

### Production (replace with your actual domain)
```
https://your-app-name.vercel.app
https://your-custom-domain.com
```

## Step 5: Get Your Client ID

1. After creating the OAuth2 client, you'll see a popup with your credentials
2. Copy the **Client ID** (it looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)
3. **Do NOT share your Client Secret** - it's not needed for this implementation

## Step 6: Configure Environment Variables

### Local Development
1. Copy `env.example` to `.env.local`
2. Replace `your_google_client_id_here` with your actual Client ID

### Production Deployment

#### Vercel
```bash
vercel env add REACT_APP_GOOGLE_CLIENT_ID
# Enter your Client ID when prompted
```

#### Netlify
1. Go to Site settings → Environment variables
2. Add `REACT_APP_GOOGLE_CLIENT_ID` with your Client ID

#### AWS Amplify
1. Go to App settings → Environment variables
2. Add `REACT_APP_GOOGLE_CLIENT_ID` with your Client ID

## Step 7: Test Your Setup

1. Start your development server: `npm start`
2. Open `http://localhost:3000`
3. Click "Sign in with Google"
4. You should see the Google sign-in popup
5. After signing in, you should see your user information

## Troubleshooting

### Common Issues

**"This app isn't verified"**
- This is normal for development
- Click "Advanced" → "Go to [app name] (unsafe)"
- For production, you'll need to verify your app

**"Error 400: redirect_uri_mismatch"**
- Check that your domain is added to Authorized JavaScript origins
- Make sure there are no trailing slashes
- Ensure you're using the exact same URL (http vs https)

**"Error 403: access_denied"**
- Check that Google+ API is enabled
- Verify your OAuth consent screen is configured
- Make sure your email is added to test users

**"Client ID not found"**
- Double-check your Client ID in the environment variables
- Make sure the variable name is exactly `REACT_APP_GOOGLE_CLIENT_ID`
- Restart your development server after changing environment variables

### Security Best Practices

1. **Never commit your Client ID to version control**
2. **Use different Client IDs for development and production**
3. **Regularly rotate your credentials**
4. **Monitor your Google Cloud Console for unusual activity**
5. **Use HTTPS in production**

## Production Checklist

- [ ] OAuth consent screen configured
- [ ] App verified (if required)
- [ ] Production domain added to Authorized origins
- [ ] Environment variables set in deployment platform
- [ ] HTTPS enabled
- [ ] Error monitoring configured

## Support

If you're still having issues:

1. Check the [Google OAuth2 documentation](https://developers.google.com/identity/protocols/oauth2/web-server)
2. Review the [Google Identity Services guide](https://developers.google.com/identity/gsi/web)
3. Check the browser console for detailed error messages
4. Verify your Google Cloud Console configuration
