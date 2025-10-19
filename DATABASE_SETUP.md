# Database & Firebase Connection Setup Guide

This guide covers setting up both Firebase (for authentication and non-PII data) and PostgreSQL (for PII patient data).

## Architecture Overview

The application uses a dual-database architecture:
- **Firebase/Firestore**: Authentication, user management, activity logs, non-PII data
- **PostgreSQL**: Patient PII (Personally Identifiable Information) data
- **Backend API**: Node.js/Express server at `https://intake.theholylabs.com`

---

## Part 1: Firebase Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "socio-sync")
4. Enable/disable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click "Get started"
3. Enable sign-in providers:
   - **Google**: Click enable, add project support email
   - **Email/Password**: Click enable

### Step 3: Create Firestore Database

1. Go to **Build** → **Firestore Database**
2. Click "Create database"
3. Choose **Production mode**
4. Select your region
5. Click "Enable"

### Step 4: Set Firestore Security Rules

1. In Firestore, go to **Rules** tab
2. Replace with the rules from `firestore.rules` file:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Helper function to check if user is admin
    function isAdmin() {
      return isSignedIn() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'super_admin'];
    }
    
    // Users collection - only admins can read/write
    match /users/{userId} {
      allow read, write: if isAdmin() || request.auth.uid == userId;
    }
    
    // Patients collection - only admins
    match /patients/{patientId} {
      allow read, write: if isAdmin();
    }
    
    // Activities collection - only admins
    match /activities/{activityId} {
      allow read, write: if isAdmin();
    }
    
    // Events collection - only admins
    match /events/{eventId} {
      allow read, write: if isAdmin();
    }
  }
}
```

3. Click "Publish"

### Step 5: Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps" section
3. Click the web icon `</>`
4. Register your app with a nickname
5. Copy the `firebaseConfig` object

It looks like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:...",
  measurementId: "G-..."
};
```

### Step 6: Update Firebase Config in Your App

**Option A: Use Environment Variables (Recommended for Production)**

1. Create `.env.local` file in project root:
```env
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

2. Update `src/firebase.ts`:
```typescript
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};
```

**Option B: Direct Configuration (Quick Testing)**

Replace the firebaseConfig in `src/firebase.ts` with your values.

### Step 7: Configure Authorized Domains

1. In Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Add your domains:
   - `localhost` (already added)
   - Your Vercel domain: `your-app.vercel.app`
   - Any custom domains

---

## Part 2: PostgreSQL Database Setup

### Architecture

The PostgreSQL database stores sensitive PII data and is accessed through a backend API server.

### Current Configuration

- **Backend API**: `https://intake.theholylabs.com`
- **Database**: PostgreSQL (hosted separately)
- **Connection**: Via REST API endpoints

### Backend API Endpoints

Your app uses these endpoints:

1. **Create Patient**
   - `POST /api/patients`
   - Body: `{ case_id, first_name, last_name, date_of_birth, email, phone, address }`

2. **Get Patient**
   - `GET /api/patients/:case_id`

3. **Search Patients**
   - `GET /api/patients/search?q=search_term`

4. **Batch Get Patients**
   - `POST /api/patients/batch`
   - Body: `{ case_ids: [...] }`

5. **Next Case ID**
   - `GET /api/patients/next-case-id`

### Setting Up Your Own Backend (Optional)

If you need to set up your own backend server:

#### 1. Database Schema

Create PostgreSQL table:

```sql
CREATE TABLE patients (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  date_of_birth DATE,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_case_id ON patients(case_id);
CREATE INDEX idx_email ON patients(email);
CREATE INDEX idx_name ON patients(first_name, last_name);
```

#### 2. Backend Server Setup

Create a Node.js/Express server with PostgreSQL connection:

**Install dependencies:**
```bash
npm install express pg cors dotenv
```

**Environment variables (.env):**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/socio_sync
PORT=3001
```

**Basic server structure (server.js):**
```javascript
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.use(cors());
app.use(express.json());

// Create patient
app.post('/api/patients', async (req, res) => {
  const { case_id, first_name, last_name, date_of_birth, email, phone, address } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO patients (case_id, first_name, last_name, date_of_birth, email, phone, address) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [case_id, first_name, last_name, date_of_birth, email, phone, address]
    );
    res.json({ success: true, patient: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get patient by case_id
app.get('/api/patients/:case_id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patients WHERE case_id = $1', [req.params.case_id]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Patient not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search patients
app.get('/api/patients/search', async (req, res) => {
  const searchTerm = req.query.q;
  try {
    const result = await pool.query(
      'SELECT * FROM patients WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1',
      [`%${searchTerm}%`]
    );
    res.json({ patients: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Batch get patients
app.post('/api/patients/batch', async (req, res) => {
  const { case_ids } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM patients WHERE case_id = ANY($1)',
      [case_ids]
    );
    const patients = {};
    result.rows.forEach(patient => {
      patients[patient.case_id] = patient;
    });
    res.json({ patients });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get next case ID
app.get('/api/patients/next-case-id', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM patients');
    const nextId = parseInt(result.rows[0].count) + 1;
    res.json({ nextId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### 3. Update Frontend Configuration

Update `src/config.ts`:

```typescript
const isProduction = window.location.hostname !== 'localhost';

export const API_CONFIG = {
  FILESERVER_URL: isProduction 
    ? 'https://your-backend-api.com'  // Your production backend URL
    : 'http://localhost:3001',         // Local development
};
```

Or use environment variables:

```env
REACT_APP_FILESERVER_URL=http://localhost:3001
```

```typescript
export const API_CONFIG = {
  FILESERVER_URL: process.env.REACT_APP_FILESERVER_URL || 'http://localhost:3001'
};
```

---

## Part 3: Complete Environment Variables

Create `.env.local` with all configurations:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Backend API Configuration
REACT_APP_FILESERVER_URL=http://localhost:3001

# Google Calendar API (if using)
REACT_APP_GOOGLE_CALENDAR_API_KEY=your-calendar-api-key
REACT_APP_GOOGLE_CALENDAR_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

---

## Part 4: Testing the Connection

### Test Firebase Connection

1. Start the app:
```bash
npm start
```

2. Try to sign in with Google or create an account
3. Check Firebase Console → Authentication to see the user
4. Check Firestore to see data being created

### Test Database Connection

1. Start your backend server (if running locally):
```bash
cd backend
node server.js
```

2. In the app, try creating a patient
3. Check PostgreSQL database to verify data was saved
4. Check Firestore to see the non-PII case record

### Debug Connection Issues

**Firebase Issues:**
- Check browser console for errors
- Verify API keys are correct
- Check authorized domains in Firebase Console
- Review Firestore security rules

**Database Issues:**
- Check if backend server is running
- Verify `FILESERVER_URL` is correct
- Check browser network tab for API call failures
- Review backend server logs

---

## Part 5: Production Deployment

### Firebase (Vercel)

Add environment variables in Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add all `REACT_APP_*` variables
3. Redeploy

### Database (Backend)

Options:
1. **Heroku**: Deploy backend + PostgreSQL addon
2. **Railway**: Deploy backend + PostgreSQL
3. **Render**: Deploy backend + PostgreSQL
4. **AWS**: EC2 + RDS
5. **DigitalOcean**: Droplet + Managed PostgreSQL

Update `REACT_APP_FILESERVER_URL` to production backend URL.

---

## Security Checklist

- [ ] Firebase security rules are properly configured
- [ ] Firestore indexes are created
- [ ] Environment variables are not committed to Git
- [ ] Backend API has CORS configured properly
- [ ] Backend API has authentication/authorization
- [ ] PostgreSQL has SSL enabled
- [ ] Database credentials are stored securely
- [ ] Authorized domains are updated in Firebase
- [ ] API endpoints validate input
- [ ] Sensitive data is only in PostgreSQL

---

## Need Help?

- **Firebase**: See [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
- **Google Calendar**: See [GOOGLE_SETUP.md](GOOGLE_SETUP.md)
- **Deployment**: See [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md)
- **Firebase Docs**: https://firebase.google.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

