# Quick Start Guide - Socio-Sync

This is a streamlined guide to get you up and running quickly.

## 🚀 Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Git installed
- [ ] Firebase account created
- [ ] PostgreSQL database (or use existing backend API)

## ⚡ Fast Setup (5 Steps)

### 1️⃣ Install Dependencies

```bash
npm install
```

### 2️⃣ Firebase Setup

**A. Create Firebase Project:**
1. Go to https://console.firebase.google.com/
2. Click "Add project" → Enter "socio-sync" → Create

**B. Enable Authentication:**
1. Click "Authentication" → "Get started"
2. Enable **Google** sign-in provider
3. Enable **Email/Password** sign-in provider

**C. Create Firestore Database:**
1. Click "Firestore Database" → "Create database"
2. Choose "Production mode" → Select region → Enable

**D. Get Your Config:**
1. Go to Project Settings (⚙️ gear icon)
2. Scroll to "Your apps" → Click web icon `</>`
3. Copy the `firebaseConfig` object

**E. Update App Config:**

Edit `src/firebase.ts` and replace the `firebaseConfig` object (around line 26) with your values:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

**F. Set Firestore Rules:**

1. In Firestore → Rules tab
2. Copy content from `firestore.rules` file in this project
3. Paste and Publish

### 3️⃣ Database Backend (Choose One)

**Option A: Use Existing Backend** (Easiest)
- Already configured in `src/config.ts`
- Uses: `https://intake.theholylabs.com`
- No additional setup needed!

**Option B: Set Up Your Own Backend**
- See [DATABASE_SETUP.md](DATABASE_SETUP.md) for PostgreSQL setup
- Update `src/config.ts` with your backend URL

### 4️⃣ Run the App

```bash
npm start
```

App opens at `http://localhost:3000`

### 5️⃣ Create First Admin User

1. Click "Sign in with Google" or "Create Account"
2. Sign in with your email
3. You're the first user, so you'll be auto-approved!

---

## 🌐 Deploy to Vercel (3 Steps)

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy on Vercel

1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repository
4. Click "Deploy" (default settings work!)

### 3. Update Firebase Authorized Domains

1. Go to Firebase Console → Authentication → Settings → Authorized domains
2. Click "Add domain"
3. Add your Vercel URL: `your-app.vercel.app`

**Done! 🎉**

---

## 📋 Configuration Files

### `.gitignore` ✅
Already created - excludes `node_modules`, `build`, etc.

### `.vercelignore` ✅
Already created - optimizes Vercel deployment

### `vercel.json` ✅
Already configured for React SPA routing

### `package.json` ✅
Updated with `vercel-build` script

---

## 🔧 Environment Variables (Optional - For Production)

For better security in production, use environment variables:

### Local Development (.env.local)
```env
REACT_APP_FIREBASE_API_KEY=your-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-domain
REACT_APP_FIREBASE_PROJECT_ID=your-id
# ... (see .env.example for all variables)
```

### Vercel Production
1. Go to Vercel Project Settings → Environment Variables
2. Add each `REACT_APP_*` variable
3. Redeploy

---

## 📚 Detailed Documentation

For more detailed setup instructions:

- **Firebase**: [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
- **Database & API**: [DATABASE_SETUP.md](DATABASE_SETUP.md)
- **Google Calendar**: [GOOGLE_SETUP.md](GOOGLE_SETUP.md)
- **Vercel Deployment**: [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] App runs locally (`npm start`)
- [ ] Can sign in with Google
- [ ] Can create account with email/password
- [ ] Can see dashboard
- [ ] Can create a patient case
- [ ] Patient data saves to database
- [ ] Can view activity logs
- [ ] Firebase Console shows users
- [ ] Firestore shows patient cases

---

## 🆘 Common Issues

### Build Error: "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Firebase Auth Error: "unauthorized-domain"
- Add your domain to Firebase Console → Authentication → Authorized domains

### Database Connection Error
- Check if backend API URL is correct in `src/config.ts`
- Verify backend server is running (if using your own)

### Deployment Fails on Vercel
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Clear Vercel cache and redeploy

---

## 📞 Support

Having issues? Check these resources:

1. **Browser Console** - Press F12 to see error messages
2. **Firebase Console** - Check Authentication and Firestore tabs
3. **Vercel Logs** - View deployment logs in dashboard
4. **Documentation** - See detailed guides in this project

---

## 🎯 Next Steps

Once everything is working:

1. **Add users**: Settings → Users → Create New User
2. **Create patients**: Dashboard → Create New Patient
3. **Schedule events**: Calendar → Add Event
4. **Set up Google Calendar**: Settings → Link Google Calendar
5. **Customize**: Update branding, colors, etc.

---

**Ready to deploy? See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)**

**Need help with Firebase? See [FIREBASE_SETUP.md](FIREBASE_SETUP.md)**

**Setting up your own database? See [DATABASE_SETUP.md](DATABASE_SETUP.md)**

