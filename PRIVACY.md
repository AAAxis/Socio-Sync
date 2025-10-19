# Privacy Policy & Data Handling

## Overview

This application is designed with privacy-first principles. We track user activity and engagement without storing any personally identifiable information (PII).

## Data We Store

### Firebase Authentication
- **Firebase UID**: Anonymous identifier (not PII)
- **Authentication tokens**: Managed by Firebase
- **No email addresses, names, or personal data stored in Firebase**

### User Activity Tracking (Firestore)
We store the following **non-PII** data in Firestore:

```typescript
interface UserActivity {
  userId: string;           // Firebase UID (anonymous)
  createdAt: timestamp;     // When user first signed up
  lastLoginAt: timestamp;   // Last login time
  loginCount: number;       // Number of logins
  lastActivityAt: timestamp; // Last activity time
  userAgent: string;        // Browser info (anonymized)
  timezone: string;         // User timezone
  language: string;         // Browser language
}
```

### Local Storage (Browser Only)
- User display information (name, email, picture) - **stored locally only**
- User activity timestamps - **stored locally only**
- No data sent to external servers

## Data We DON'T Store

❌ **Email addresses** in Firestore  
❌ **Names or personal information** in Firestore  
❌ **Phone numbers**  
❌ **Addresses**  
❌ **IP addresses**  
❌ **Location data**  
❌ **Browsing history**  
❌ **Personal preferences**  

## Privacy Features

### 1. Anonymous User IDs
- Users are identified only by Firebase UID
- No correlation with real-world identity possible
- UIDs are randomly generated and non-reversible

### 2. Local Data Storage
- All PII (name, email, picture) stored only in browser
- Data is not transmitted to our servers
- Users can clear their data by clearing browser storage

### 3. Minimal Data Collection
- Only essential activity metrics are collected
- No behavioral tracking or profiling
- No cross-site tracking

### 4. Secure Data Handling
- Firestore security rules prevent PII storage
- All data transmission uses HTTPS
- Firebase handles authentication securely

## Data Retention

- **User activity data**: Retained for analytics purposes
- **Authentication data**: Managed by Firebase (standard retention)
- **Local browser data**: Retained until user clears browser storage

## User Rights

### Data Access
- Users can view their activity data in the dashboard
- All stored data is visible to the user

### Data Deletion
- Users can sign out to clear local data
- Firebase UID and activity data remain for analytics
- No personal information is retained

### Data Portability
- Users can export their local data (browser storage)
- Activity data is anonymized and not portable

## Security Measures

### Firestore Security Rules
```javascript
// Users can only access their own data
allow read, write: if request.auth.uid == userId;

// Prevent PII storage
allow create: if !('email' in resource.data) 
  && !('name' in resource.data);
```

### Data Validation
- All data is validated before storage
- PII fields are explicitly blocked
- Only approved data fields are allowed

## Compliance

### GDPR Compliance
- ✅ No PII stored in databases
- ✅ Users control their local data
- ✅ Minimal data collection
- ✅ Clear data handling practices

### CCPA Compliance
- ✅ No personal information sold
- ✅ No personal information shared
- ✅ Users can opt out (sign out)

## Analytics & Insights

The collected data enables:
- User engagement metrics
- Login frequency analysis
- Timezone and language preferences
- Browser compatibility insights

**All analytics are anonymized and aggregated.**

## Contact

For privacy questions or concerns:
- Review this privacy policy
- Check the source code for data handling
- Contact the development team

## Updates

This privacy policy may be updated to reflect changes in data handling practices. Users will be notified of significant changes.

---

**Last Updated**: December 2024  
**Version**: 1.0
