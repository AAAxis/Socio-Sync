# Firebase Authentication Setup Guide

This guide will walk you through setting up Firebase Authentication for the login application.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `firebase-auth-app`
4. Enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Authentication

1. In the Firebase Console, go to "Authentication" → "Get started"
2. Go to "Sign-in method" tab
3. Enable "Google" provider
4. Add your project support email
5. Save the configuration

## Step 3: Set Up Firestore Database

1. In the Firebase Console, go to "Firestore Database" → "Create database"
2. Choose "Start in test mode" (we'll secure it with rules)
3. Select a location for your database
4. Click "Done"

## Step 4: Configure Firestore Security Rules

1. Go to "Firestore Database" → "Rules"
2. Replace the default rules with the content from `firestore.rules` file
3. Click "Publish" to apply the rules

The security rules ensure:
- Users can only access their own activity data
- No PII can be stored in the database
- Only authenticated users can read/write data

## Step 5: Get Firebase Configuration

1. Go to "Project settings" (gear icon)
2. Scroll down to "Your apps" section
3. Click "Add app" → Web app (</>) icon
4. Register your app with a nickname
5. Copy the Firebase configuration object

## Step 6: Configure Firebase Config

Update the `src/firebase.ts` file with your Firebase configuration:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id" // optional
};
```

## Step 7: Configure Authorized Domains

In Firebase Console → Authentication → Settings → Authorized domains:

### Development
```
localhost
```

### Production (replace with your actual domain)
```
your-app-name.vercel.app
your-custom-domain.com
```

## Step 8: Test Your Setup

1. Start your development server: `npm start`
2. Open `http://localhost:3000`
3. Click "Sign in with Google"
4. You should see the Google sign-in popup
5. After signing in, you should see your user information

## Privacy & Security Features

### No PII Storage in Firestore
- User data is only stored locally in the browser
- Firestore only stores anonymous activity metrics (login count, timestamps, browser info)
- No personal information (names, emails, addresses) is stored in Firebase databases

### Privacy Protection
- Email addresses are only used for authentication
- User activity is tracked anonymously using Firebase UIDs
- All personal information remains in the client-side application
- Firestore security rules prevent PII storage

### Data Stored in Firestore
- `userId`: Firebase UID (anonymous identifier)
- `createdAt`: When user first signed up
- `lastLoginAt`: Last login timestamp
- `loginCount`: Number of logins
- `lastActivityAt`: Last activity timestamp
- `userAgent`: Browser information (anonymized)
- `timezone`: User timezone
- `language`: Browser language

### Data NOT Stored in Firestore
- Email addresses
- Names or personal information
- Phone numbers
- Addresses
- IP addresses
- Location data

## Troubleshooting

### Common Issues

**"Firebase: Error (auth/popup-closed-by-user)"**
- User closed the sign-in popup
- This is normal behavior, not an error

**"Firebase: Error (auth/unauthorized-domain)"**
- Your domain is not in the authorized domains list
- Add your domain to Firebase Console → Authentication → Settings → Authorized domains

**"Firebase: Error (auth/operation-not-allowed)"**
- Google sign-in provider is not enabled
- Enable it in Firebase Console → Authentication → Sign-in method

**"Firebase: Error (auth/api-key-not-valid)"**
- Check your Firebase configuration
- Make sure you copied the correct API key from Firebase Console

### Security Best Practices

1. **Never commit your Firebase config to version control**
2. **Use different Firebase projects for development and production**
3. **Regularly review your Firebase security rules**
4. **Monitor your Firebase Console for unusual activity**
5. **Use HTTPS in production**
6. **Enable App Check for additional security**

## Production Checklist

- [ ] Firebase project created and configured
- [ ] Google sign-in provider enabled
- [ ] Production domain added to Authorized domains
- [ ] Firebase configuration updated in code
- [ ] HTTPS enabled
- [ ] Error monitoring configured
- [ ] Security rules reviewed

## Support

If you're still having issues:

1. Check the [Firebase Authentication documentation](https://firebase.google.com/docs/auth)
2. Review the [Firebase Web SDK guide](https://firebase.google.com/docs/web/setup)
3. Check the browser console for detailed error messages
4. Verify your Firebase Console configuration
