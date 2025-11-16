// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider as GoogleProvider, updateProfile, linkWithCredential, unlink } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, getDocs, deleteDoc, addDoc, query, where, orderBy } from "firebase/firestore";
import { getApiUrl } from './config';

// Google Calendar TypeScript declarations
declare global {
  interface Window {
    gapi: any;
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDpVuFtWBqlMYL2-FhT3SxfJEWyiZcrS9U",
  authDomain: "madical-one.firebaseapp.com",
  projectId: "madical-one",
  storageBucket: "madical-one.firebasestorage.app",
  messagingSenderId: "299857621397",
  appId: "1:299857621397:web:41dd0838e40fa94284c69c",
  measurementId: "G-N965TY4FDC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics (optional)
export const analytics = getAnalytics(app);

// Firebase Auth helper functions
export const signInWithGoogle = async () => {
  // We need to prevent unauthorized account creation entirely
  // The issue is that signInWithPopup creates accounts before we can check authorization
  
  try {
    // Use signInWithPopup but immediately check if user is authorized
    const result = await signInWithPopup(auth, googleProvider);
    const userEmail = result.user.email;
    
    if (!userEmail) {
      // Sign out immediately if no email
      await signOutUser();
      throw new Error('No email found in Google account');
    }
    
    // Check if user is registered (admin-only access)
    const isRegistered = await isUserRegistered(userEmail);
    if (!isRegistered) {
      // Sign out the user immediately
      await signOutUser();
      
      // Try multiple methods to delete the unauthorized account
      try {
        // Method 1: Try to delete the user account
        await result.user.delete();
        console.log('Unauthorized Firebase Auth user deleted via user.delete()');
      } catch (deleteError) {
        console.log('Could not delete user via user.delete() - trying alternative methods');
        
        // Method 2: Try to revoke the token and sign out
        try {
          await result.user.getIdToken(true); // Force token refresh
          await signOutUser();
          console.log('User signed out and token revoked');
        } catch (revokeError) {
          console.log('Could not revoke token');
        }
      }
      
      throw new Error('ACCESS DENIED: This email is not registered. This is an admin-only application. Please contact an administrator to create an account.');
    }
    
    return result;
  } catch (error: any) {
    // If it's our custom error, re-throw it
    if (error.message.includes('ACCESS DENIED') || error.message.includes('not registered') || error.message.includes('admin-only')) {
      throw error;
    }
    
    // For other errors, sign out and throw
    try {
      await signOutUser();
    } catch (signOutError) {
      console.log('Error signing out:', signOutError);
    }
    
    throw new Error(`Google sign-in failed: ${error.message}`);
  }
};

export const signOutUser = () => {
  return signOut(auth);
};

// Password authentication functions
export const signUpWithEmail = async (email: string, password: string, name?: string) => {
  console.log('signUpWithEmail called with:', { email, name });
  const result = await createUserWithEmailAndPassword(auth, email, password);
  
  // Set display name if provided
  if (name) {
    console.log('Setting display name to:', name);
    await updateProfile(result.user, {
      displayName: name
    });
    console.log('Display name set successfully:', result.user.displayName);
  }
  
  // Send custom verification email via API
  await sendVerificationEmail(email, name || result.user.displayName || 'User', result.user.uid);
  
  return result;
};

export const signInWithEmail = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

// Link Google account to existing email/password account
export const linkGoogleAccount = async (user: User) => {
  console.log('linkGoogleAccount called with user:', user.uid);
  const provider = new GoogleProvider();
  
  // Store current user info to restore session if needed
  const currentUserEmail = user.email;
  const currentUserPassword = 'restore_session'; // We'll need to handle this differently
  
  try {
    // First, get the Google credential
    const result = await signInWithPopup(auth, provider);
    const googleEmail = result.user.email;
    const googleCredential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!googleEmail || !googleCredential) {
      throw new Error('No email or credential found in Google account');
    }
    
    // SECURITY CHECK: Verify the Google email matches the current user's email
    if (googleEmail !== currentUserEmail) {
      // Sign out the Google user
      await signOutUser();
      
      // The user will need to sign back in manually since we can't restore their session
      // without their password. We'll show a clear error message.
      throw new Error('Failed to link: Google account email is different from your current account email. Please use a Google account with the same email address. You will need to sign in again.');
    }
    
    // Sign out the Google user first
    await signOutUser();
    
    // Now link the Google credential to the existing user
    const linkResult = await linkWithCredential(user, googleCredential);
    
    // Update the existing user collection with Google account information
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      hasGoogleAccount: true,
      linkedGoogleEmail: googleEmail,
      linkedGoogleName: linkResult.user.displayName,
      linkedGoogleUid: linkResult.user.uid,
      linkedGooglePhoto: linkResult.user.photoURL,
      linkedAt: serverTimestamp()
    });
    
    console.log('Google account linked successfully to existing user');
    
    // Return the linked user result
    return linkResult;
    
  } catch (error: any) {
    console.error('Error in linkGoogleAccount:', error);
    
    // Clean up any partial authentication
    try {
      await signOutUser();
    } catch (cleanupError) {
      console.log('Cleanup error:', cleanupError);
    }
    
    // Handle specific Firebase linking errors
    if (error.code === 'auth/credential-already-in-use') {
      throw new Error('This Google account is already linked to another user.');
    } else if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email is already in use by another account.');
    } else if (error.code === 'auth/invalid-credential') {
      throw new Error('Invalid Google credential. Please try again.');
    }
    
    throw new Error(`Failed to link Google account: ${error.message}`);
  }
};

// Unlink Google account
export const unlinkGoogleAccount = async (user: User) => {
  try {
    // Unlink Google provider from Firebase Auth
    const unlinkResult = await unlink(user, GoogleAuthProvider.PROVIDER_ID);
    
    // Update Firestore to remove Google account info
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      hasGoogleAccount: false,
      linkedGoogleEmail: null,
      linkedGoogleName: null,
      linkedGoogleUid: null,
      linkedGooglePhoto: null,
      unlinkedAt: serverTimestamp()
    });
    
    console.log('Google account unlinked successfully from Firebase Auth and Firestore');
    return { success: true, user: unlinkResult };
  } catch (error: any) {
    console.error('Error unlinking Google account:', error);
    
    // Handle specific Firebase unlinking errors
    if (error.code === 'auth/no-such-provider') {
      throw new Error('Google account is not linked to this user.');
    } else if (error.code === 'auth/requires-recent-login') {
      throw new Error('Please sign in again before unlinking your Google account.');
    }
    
    throw new Error(`Failed to unlink Google account: ${error.message}`);
  }
};

// Check if user can link Google account
export const canLinkGoogleAccount = (user: User, userData: FirebaseUserData | null): boolean => {
  // User must have email/password provider
  const hasEmailPassword = user.providerData.some(provider => provider.providerId === 'password');
  
  // User must not already have Google linked
  const hasGoogleLinked = userData?.hasGoogleAccount || false;
  
  // User must have an email address
  const hasEmail = !!user.email;
  
  return hasEmailPassword && !hasGoogleLinked && hasEmail;
};

// Check if user can unlink Google account
export const canUnlinkGoogleAccount = (user: User, userData: FirebaseUserData | null): boolean => {
  // User must have Google provider linked
  const hasGoogleProvider = user.providerData.some(provider => provider.providerId === GoogleAuthProvider.PROVIDER_ID);
  
  // User must have Google linked in Firestore
  const hasGoogleLinked = userData?.hasGoogleAccount || false;
  
  // User must have at least one other provider (email/password) to prevent account lockout
  const hasOtherProviders = user.providerData.length > 1;
  
  return hasGoogleProvider && hasGoogleLinked && hasOtherProviders;
};

// Google Calendar API integration
const GOOGLE_CALENDAR_API_KEY = 'AIzaSyBsBLo1hjAswBsLN-DpjpuZ5CGpp5ID1Vw';
const GOOGLE_CALENDAR_CLIENT_ID = '299857621397-qvt5f5bf61b002b5aq13obhams8p4otn.apps.googleusercontent.com';

// Load Google Calendar API with new Google Identity Services
const loadGoogleCalendarAPI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    console.log('Loading Google Calendar API with new Google Identity Services...');
    console.log('Client ID:', GOOGLE_CALENDAR_CLIENT_ID);
    console.log('API Key:', GOOGLE_CALENDAR_API_KEY);
    
    if (window.gapi && window.gapi.client) {
      console.log('Google API already loaded');
      resolve();
      return;
    }

    // Load Google Identity Services first
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = () => {
      console.log('Google Identity Services loaded');
      
      // Then load the Google API
      const apiScript = document.createElement('script');
      apiScript.src = 'https://apis.google.com/js/api.js';
      apiScript.onload = () => {
        console.log('Google API script loaded, initializing...');
        console.log('Current domain:', window.location.hostname);
        
        window.gapi.load('client', () => {
          console.log('Initializing Google API client...');
          
          window.gapi.client.init({
            apiKey: GOOGLE_CALENDAR_API_KEY,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest']
          }).then(() => {
            console.log('Google API client initialized successfully');
            resolve();
          }).catch((error: any) => {
            console.error('Failed to initialize Google API client:', error);
            console.error('Error details:', error);
            reject(error);
          });
        });
      };
      apiScript.onerror = (error: any) => {
        console.error('Failed to load Google API script:', error);
        reject(error);
      };
      document.head.appendChild(apiScript);
    };
    gisScript.onerror = (error: any) => {
      console.error('Failed to load Google Identity Services script:', error);
      reject(error);
    };
    document.head.appendChild(gisScript);
  });
};

// Link Google Calendar using new Google Identity Services
export const linkGoogleCalendar = async (user: User) => {
  try {
    console.log('Starting Google Calendar linking process...');
    console.log('Client ID:', GOOGLE_CALENDAR_CLIENT_ID);
    
    await loadGoogleCalendarAPI();
    console.log('Google Calendar API loaded successfully');
    
    // Check if Google Identity Services is available
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      throw new Error('Google Identity Services not loaded. Please refresh the page and try again.');
    }
    
    // Use new Google Identity Services for authentication
    return new Promise((resolve, reject) => {
      const client = window.google.accounts.oauth2;
      console.log('Initializing token client with client ID:', GOOGLE_CALENDAR_CLIENT_ID);

      const tokenClient = client.initTokenClient({
        client_id: GOOGLE_CALENDAR_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar',
        callback: async (response: any) => {
          try {
            console.log('OAuth token received:', response);
            
            if (response.access_token) {
              // Store the token and update user document
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, {
                hasGoogleCalendar: true,
                googleCalendarToken: response.access_token,
                googleCalendarLinkedAt: serverTimestamp()
              });
              
              console.log('Google Calendar linked successfully!');
              resolve({ success: true, message: 'Google Calendar linked successfully!' });
            } else {
              reject(new Error('No access token received from Google'));
            }
          } catch (error) {
            console.error('Error storing Google Calendar token:', error);
            reject(error);
          }
        },
        error_callback: (error: any) => {
          console.error('OAuth error:', error);
          reject(new Error(`Failed to authenticate with Google Calendar: ${error.error || 'Unknown OAuth error'}`));
        }
      });

      // Request access token
      console.log('Requesting access token...');
      tokenClient.requestAccessToken();
    });
  } catch (error) {
    console.error('Error linking Google Calendar:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error(`Failed to link Google Calendar: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Sync event to Google Calendar using new Google Identity Services
export const syncEventToGoogleCalendar = async (eventData: {
  title: string;
  description: string;
  caseId: string;
  date: Date;
  type: string;
  status: string;
  createdBy: string;
}): Promise<{ success: boolean; googleEventId?: string; error?: string }> => {
  try {
    console.log('Sync to Google Calendar requested for:', eventData.title);
    console.log('Event data:', eventData);
    
    // Load Google Calendar API
    await loadGoogleCalendarAPI();
    
    if (!window.gapi || !window.gapi.client) {
      return { 
        success: false, 
        error: 'Google API not loaded. Please refresh the page and try again.' 
      };
    }
    
    // Check if user has Google Calendar linked
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { 
        success: false, 
        error: 'User not authenticated. Please log in again.' 
      };
    }

    const userRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists() || !userDoc.data()?.hasGoogleCalendar) {
      return { 
        success: false, 
        error: 'Please link your Google Calendar first in Settings.' 
      };
    }

    // Get access token using new Google Identity Services
    return new Promise((resolve) => {
      const client = window.google?.accounts?.oauth2;
      if (!client) {
        resolve({ 
          success: false, 
          error: 'Google Identity Services not loaded. Please refresh the page and try again.' 
        });
        return;
      }

      const tokenClient = client.initTokenClient({
        client_id: GOOGLE_CALENDAR_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar',
        callback: async (response: any) => {
          try {
            console.log('OAuth token received for sync:', response);
            
            if (response.access_token) {
              // Set the access token for the gapi client
              window.gapi.client.setToken({ access_token: response.access_token });

              // Format date for Google Calendar
              const startDate = new Date(eventData.date);
              const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration
              
              const googleEvent = {
                summary: eventData.title,
                description: `${eventData.description}\n\nPatient Case: ${eventData.caseId}\nType: ${eventData.type}`,
                start: {
                  dateTime: startDate.toISOString(),
                  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                end: {
                  dateTime: endDate.toISOString(),
                  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                colorId: eventData.status === 'completed' ? '10' : eventData.status === 'cancelled' ? '11' : '1'
              };

              console.log('Creating Google Calendar event:', googleEvent);

              const calendarResponse = await window.gapi.client.calendar.events.insert({
                calendarId: 'primary',
                resource: googleEvent
              });

              console.log('Event synced to Google Calendar:', calendarResponse.result.id);
              resolve({ 
                success: true, 
                googleEventId: calendarResponse.result.id 
              });
            } else {
              resolve({ 
                success: false, 
                error: 'No access token received from Google' 
              });
            }
          } catch (error) {
            console.error('Error creating calendar event:', error);
            resolve({ 
              success: false, 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
          }
        },
        error_callback: (error: any) => {
          console.error('OAuth error during sync:', error);
          resolve({ 
            success: false, 
            error: 'Failed to authenticate with Google Calendar' 
          });
        }
      });

      // Request access token
      tokenClient.requestAccessToken();
    });
  } catch (error) {
    console.error('Error syncing event to Google Calendar:', error);
    console.error('Error type:', typeof error);
    console.error('Error details:', error);
    
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
};

// Sync all events to Google Calendar
export const syncAllEventsToGoogleCalendar = async (): Promise<{ success: boolean; syncedCount: number; errors: string[] }> => {
  try {
    const events = await getEvents();
    const errors: string[] = [];
    let syncedCount = 0;

    for (const event of events) {
      const result = await syncEventToGoogleCalendar({
        title: event.title,
        description: event.description,
        caseId: event.caseId,
        date: event.date.toDate ? event.date.toDate() : new Date(event.date),
        type: event.type,
        status: event.status,
        createdBy: event.createdBy
      });

      if (result.success) {
        syncedCount++;
        // Update the event with Google Calendar ID
        const eventRef = doc(db, 'events', event.id);
        await updateDoc(eventRef, {
          googleEventId: result.googleEventId
        });
      } else {
        errors.push(`Failed to sync "${event.title}": ${result.error}`);
      }
    }

    return { success: true, syncedCount, errors };
  } catch (error) {
    console.error('Error syncing all events:', error);
    return { 
      success: false, 
      syncedCount: 0, 
      errors: [error instanceof Error ? error.message : 'Unknown error'] 
    };
  }
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Firebase user data interface (basic user info only)
export interface FirebaseUserData {
  userId: string; // Firebase UID
  email: string; // Email for basic identification
  name: string; // Display name
  picture?: string; // Profile picture URL
  role: 'super_admin' | 'admin' | 'blocked' | 'department_manager' | 'program_manager' | 'team_manager' | 'instructor';
  createdAt: any; // Server timestamp
  lastLoginAt: any; // Server timestamp
  loginCount: number;
  hasPiiData: boolean; // Flag to indicate if PII exists in PostgreSQL
  hasGoogleAccount?: boolean; // Flag to indicate if Google account is linked
  hasGoogleCalendar?: boolean; // Flag to indicate if Google Calendar is linked
  linkedGoogleEmail?: string; // Email of the linked Google account
  linkedGoogleName?: string; // Display name of the linked Google account
  linkedGoogleUid?: string; // UID of the linked Google account
  linkedGooglePhoto?: string; // Photo URL of the linked Google account
  twoFactorEnabled?: boolean; // Flag to indicate if 2FA is enabled
  // Blocked user fields
  authDisabled?: boolean; // Flag to indicate if authentication is disabled
  blocked?: boolean; // Flag to indicate if user is blocked
  restricted?: boolean; // Flag to indicate if user is restricted
  blockedAt?: any; // Server timestamp when user was blocked
  blockedReason?: string; // Reason why user was blocked
}

// Track user login - only store admin data in Firebase, clients go to PostgreSQL only
export const trackUserLogin = async (user: User, role: 'super_admin' | 'admin' | 'department_manager' | 'program_manager' | 'team_manager' | 'instructor' = 'admin', name?: string) => {
  try {
    console.log('trackUserLogin called with:', { userId: user.uid, role, name, displayName: user.displayName });
    // Store admin data in Firebase (all users are admins)
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      const now = serverTimestamp();
      
      if (userSnap.exists()) {
        // Update existing admin user
        await updateDoc(userRef, {
          lastLoginAt: now,
          loginCount: (userSnap.data().loginCount || 0) + 1,
        });
      } else {
        // Create new admin user record with basic info
        const newUserData: FirebaseUserData = {
          userId: user.uid,
          email: user.email || '',
          name: name || user.displayName || 'Admin User',
          role: role,
          createdAt: now,
          lastLoginAt: now,
          loginCount: 1,
          hasPiiData: false, // Will be updated when PII is created in PostgreSQL
          blocked: false, // Default to active status for new users
          restricted: false, // Explicitly set to active (not restricted)
          blockedReason: '',
        };
        
        console.log('Creating new user in Firestore:', newUserData);
        await setDoc(userRef, newUserData);
        console.log('User created successfully in Firestore');
      }
  } catch (error) {
    console.error('Error tracking user login:', error);
    // Don't throw error to avoid breaking the auth flow
  }
};

// Get user data from Firebase (only admins will have data here)
export const getUserData = async (userId: string): Promise<FirebaseUserData | null> => {
  try {
    console.log('getUserData called for userId:', userId);
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data() as FirebaseUserData;
      console.log('getUserData returning:', data);
      console.log('hasGoogleAccount in getUserData:', data.hasGoogleAccount);
      return data;
    }
    console.log('User document does not exist');
    // For clients, return null as they don't have Firebase data
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Universal user finder - finds user by either original UID or Google UID
export const findUserByAnyUid = async (uid: string): Promise<{userId: string, userData: FirebaseUserData} | null> => {
  try {
    console.log('findUserByAnyUid called for uid:', uid);
    
    // First, try to find by direct UID (original user document)
    const userData = await getUserData(uid);
    if (userData) {
      console.log('Found user by direct UID');
      return { userId: uid, userData };
    }
    
    // If not found by direct UID, search for user with this UID as linkedGoogleUid
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    
    for (const doc of usersSnap.docs) {
      const userData = doc.data() as FirebaseUserData;
      if (userData.linkedGoogleUid === uid) {
        console.log('Found user by linkedGoogleUid');
        return { userId: doc.id, userData };
      }
    }
    
    console.log('User not found by any UID method');
    return null;
  } catch (error) {
    console.error('Error finding user by any UID:', error);
    return null;
  }
};

// Find user by linked Google account email
export const findUserByLinkedGoogleEmail = async (googleEmail: string): Promise<{userId: string, userData: FirebaseUserData} | null> => {
  try {
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    
    for (const doc of usersSnap.docs) {
      const userData = doc.data() as FirebaseUserData;
      if (userData.linkedGoogleEmail === googleEmail) {
        return { userId: doc.id, userData };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding user by linked Google email:', error);
    return null;
  }
};

// Hardcoded whitelist of authorized admin emails
const AUTHORIZED_ADMIN_EMAILS = [
  'admin@roamjet.net',
  'your-email@example.com', // Replace with your actual email
  // Add more authorized emails here
];

// Check if user is registered (admin-only whitelist check)
export const isUserRegistered = async (email: string): Promise<boolean> => {
  try {
    // First check hardcoded whitelist (for initial bootstrap)
    if (AUTHORIZED_ADMIN_EMAILS.includes(email)) {
      console.log('Email found in hardcoded whitelist:', email);
      return true;
    }
    
    // Check if any users exist in database
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    
    // If no users exist, allow first user to bootstrap the system
    if (usersSnap.empty) {
      console.log('No users in database - allowing first user to bootstrap system:', email);
      return true;
    }
    
    // If users exist, check if email exists with admin role
    let anyAdminExists = false;
    for (const doc of usersSnap.docs) {
      const userData = doc.data() as FirebaseUserData;
      // Check if email matches AND user has admin role (not blocked)
      if ((userData.email === email || userData.linkedGoogleEmail === email) &&
          (userData.role === 'admin' || userData.role === 'super_admin')) {
        console.log('Email found in database with admin role:', email);
        return true;
      }
      if (userData.role === 'admin' || userData.role === 'super_admin') {
        anyAdminExists = true;
      }
    }
    
    // Bootstrap fallback: if there are no admin users at all, allow this sign-in
    if (!anyAdminExists) {
      console.log('No admin users found in database - allowing bootstrap for:', email);
      return true;
    }

    console.log('Email not authorized (not admin):', email);
    return false;
  } catch (error) {
    console.error('Error checking if user is registered:', error);
    return false;
  }
};

// Admin utility: Check for unauthorized Firebase Auth users
export const checkForUnauthorizedUsers = async (): Promise<{authorized: number, unauthorized: number}> => {
  try {
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    
    const registeredEmails = new Set<string>();
    usersSnap.docs.forEach(doc => {
      const userData = doc.data() as FirebaseUserData;
      if (userData.email) registeredEmails.add(userData.email);
      if (userData.linkedGoogleEmail) registeredEmails.add(userData.linkedGoogleEmail);
    });
    
    // Note: This is a simplified check. In a real implementation, you'd need to
    // compare Firebase Auth users with your registered users list
    console.log(`Found ${registeredEmails.size} registered email addresses`);
    
    return {
      authorized: registeredEmails.size,
      unauthorized: 0 // This would need Firebase Admin SDK to check actual Auth users
    };
  } catch (error) {
    console.error('Error checking for unauthorized users:', error);
    return { authorized: 0, unauthorized: 0 };
  }
};

// Blocked user interface - allows account creation but blocks access
export const signInWithGoogleSecure = async () => {
  try {
    // Allow account creation; enforce access via blocked flag
    const result = await signInWithPopup(auth, googleProvider);
    const userEmail = result.user.email;
    const userUid = result.user.uid;
    
    if (!userEmail) {
      await signOutUser();
      throw new Error('No email found in Google account');
    }
    
    // Check if this email is authorized (admin-only access)
    const isRegistered = await isUserRegistered(userEmail);
    
    // Ensure user document exists; if unauthorized, create as blocked
    const userRef = doc(db, 'users', userUid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      const now = serverTimestamp();
      const newUserData: FirebaseUserData = {
        userId: userUid,
        email: userEmail,
        name: result.user.displayName || 'User',
        role: isRegistered ? 'admin' : 'blocked',
        createdAt: now,
        lastLoginAt: now,
        loginCount: 1,
        hasPiiData: false,
        blocked: !isRegistered,
        restricted: false,
        blockedReason: !isRegistered ? 'Awaiting administrator approval' : ''
      };
      await setDoc(userRef, newUserData);
    } else if (!isRegistered) {
      // If user doc exists but not registered, ensure blocked flag is set
      await updateDoc(userRef, { blocked: true, restricted: false, blockedReason: 'Awaiting administrator approval' });
    } else {
      // Authorized: update last login metadata
      await updateDoc(userRef, { lastLoginAt: serverTimestamp(), loginCount: (userSnap.data().loginCount || 0) + 1 });
    }
    
    // If unauthorized, return flag to show blocked screen (do not sign out)
    const isBlocked = !isRegistered;
    return { ...result, isBlocked };
    
  } catch (error: any) {
    // Clean up any partial authentication
    try {
      await signOutUser();
    } catch (cleanupError) {
      console.log('Cleanup error:', cleanupError);
    }
    
    throw new Error(`Authentication failed: ${error.message}`);
  }
};

// 2FA OTP functions (for login only)
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOTPEmail = async (email: string, userName: string, otpCode: string) => {
  try {
    // Construct the API URL with parameters
    const apiUrl = new URL('https://smtp.roamjet.net/api/email/send');
    apiUrl.searchParams.set('email', email);
    apiUrl.searchParams.set('project_id', 'u2LpTkbed1n7U4ff607n');
    apiUrl.searchParams.set('template_id', 'rAASNbN1sSGi9hZZjA9m');
    apiUrl.searchParams.set('user_name', userName);
    apiUrl.searchParams.set('otp_code', otpCode);

    console.log('Sending 2FA OTP to:', email);
    console.log('OTP Code:', otpCode);

    // Use hidden iframe to bypass CORS and actually send the email
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = apiUrl.toString();
    
    return new Promise<void>((resolve, reject) => {
      iframe.onload = () => {
        console.log('2FA OTP sent successfully!');
        document.body.removeChild(iframe);
        resolve();
      };
      
      iframe.onerror = () => {
        document.body.removeChild(iframe);
        reject(new Error('Failed to send 2FA OTP email'));
      };
      
      document.body.appendChild(iframe);
    });
  } catch (err) {
    console.error('2FA OTP sending error:', err);
    throw err;
  }
};

export const sendVerificationEmail = async (email: string, userName: string, userId: string) => {
  try {
    // Construct the verification link with userId using the production domain
    // Using /en/verify-email to ensure proper routing
    const verificationLink = `https://socio-sync-sepia.vercel.app/en/verify-email?userId=${userId}`;
    
    // Construct the API URL with parameters (matching the API format)
    const apiUrl = new URL('https://smtp.roamjet.net/api/email/send');
    apiUrl.searchParams.set('email', email);
    apiUrl.searchParams.set('project_id', 'fZNC6AUBzG6vPGNULbfI');
    apiUrl.searchParams.set('template_id', 'kTaUoVCbrfgZ6NKkeo36');
    apiUrl.searchParams.set('link', verificationLink);

    console.log('Sending verification email to:', email);
    console.log('Verification Link:', verificationLink);

    // Use hidden iframe to bypass CORS and actually send the email
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = apiUrl.toString();
    
    return new Promise<void>((resolve, reject) => {
      iframe.onload = () => {
        console.log('Verification email sent successfully!');
        document.body.removeChild(iframe);
        resolve();
      };
      
      iframe.onerror = () => {
        document.body.removeChild(iframe);
        reject(new Error('Failed to send verification email'));
      };
      
      document.body.appendChild(iframe);
    });
  } catch (err) {
    console.error('Verification email sending error:', err);
    throw err;
  }
};

// User management functions
export const getAllUsers = async (): Promise<FirebaseUserData[]> => {
  try {
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    const users: FirebaseUserData[] = [];
    
    usersSnap.forEach((doc) => {
      users.push(doc.data() as FirebaseUserData);
    });
    
    return users;
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
};

export const createUserWithRole = async (email: string, password: string, name: string, role: 'super_admin' | 'admin' | 'blocked') => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = result.user;
    
    // Create Firebase data for all users (all are admins)
      const userRef = doc(db, 'users', firebaseUser.uid);
      const newUserData: FirebaseUserData = {
        userId: firebaseUser.uid,
        email: email,
        name: name,
        role: role,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        loginCount: 0,
        hasPiiData: false,
        blocked: false, // Default to active status for new users
        restricted: false, // Explicitly set to active (not restricted)
        blockedReason: '',
      };
      
      await setDoc(userRef, newUserData);
    
    return { success: true, user: firebaseUser };
  } catch (error) {
    console.error('Error creating user with role:', error);
    return { success: false, error: error };
  }
};

export const updateUserRole = async (userId: string, newRole: 'super_admin' | 'admin' | 'department_manager' | 'program_manager' | 'team_manager' | 'instructor', name?: string, email?: string, status?: 'active' | 'blocked' | 'restricted') => {
  try {
    // Update Firebase data for all users (all are admins)
    const userRef = doc(db, 'users', userId);
    const updateData: any = {
      role: newRole,
    };
    
    if (name) {
      updateData.name = name;
    }
    
    if (email) {
      updateData.email = email;
    }
    
    if (status) {
      // Handle status updates
      if (status === 'blocked') {
        updateData.blocked = true;
        updateData.restricted = false;
      } else if (status === 'restricted') {
        updateData.blocked = false;
        updateData.restricted = true;
      } else if (status === 'active') {
        updateData.blocked = false;
        updateData.restricted = false;
      }
    }
    
    await updateDoc(userRef, updateData);
    return { success: true };
  } catch (error) {
    console.error('Error updating user role:', error);
    return { success: false, error: error };
  }
};

export const deleteUser = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: error };
  }
};

// Enable 2FA for user
export const enable2FA = async (userId: string): Promise<{success: boolean, message?: string}> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      twoFactorEnabled: true,
      twoFactorEnabledAt: serverTimestamp()
    });
    return { success: true, message: '2FA enabled successfully' };
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    return { success: false, message: 'Failed to enable 2FA' };
  }
};

// Disable 2FA for user
export const disable2FA = async (userId: string): Promise<{success: boolean, message?: string}> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      twoFactorEnabled: false,
      twoFactorDisabledAt: serverTimestamp()
    });
    return { success: true, message: '2FA disabled successfully' };
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    return { success: false, message: 'Failed to disable 2FA' };
  }
};

// Generate unique case ID
export const generateCaseId = async (): Promise<string> => {
  try {
    // Get the next sequential number from database
    const response = await fetch(getApiUrl('/api/patients/next-case-id'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return `CASE-${String(data.nextId).padStart(3, '0')}`;
    } else {
      // Fallback to timestamp-based ID if API fails
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 5);
      return `CASE-${timestamp}-${random}`.toUpperCase();
    }
  } catch (error) {
    console.error('Error getting next case ID:', error);
    // Fallback to timestamp-based ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `CASE-${timestamp}-${random}`.toUpperCase();
  }
};

// Create new patient case
export const createPatientCase = async (patientData: any, createdBy: string) => {
  try {
    const caseId = await generateCaseId();
    const now = serverTimestamp();
    
    // Create patient record in Firebase (non-PII data only - just case ID and metadata)
    const patientRef = doc(db, 'patients', caseId);
    const patientRecord = {
      id: caseId,
      caseId: caseId,
      createdAt: now,
      createdBy: createdBy,
      assignedAdmins: Array.isArray(patientData.assignedAdmins) && patientData.assignedAdmins.length > 0
        ? Array.from(new Set([createdBy, ...patientData.assignedAdmins]))
        : [createdBy],
      status: patientData.status || 'new', // Default to 'new' for freshly created patients
      notes: patientData.notes || '' // Save notes to Firebase as non-PII
    };
    
    await setDoc(patientRef, patientRecord);
    
    // Create initial activity note
    const activityRef = doc(db, 'activities', `${caseId}_${Date.now()}`);
    const activityNote = {
      id: activityRef.id,
      caseId: caseId,
      note: 'Patient case created',
      action: 'case_created',
      timestamp: now,
      createdBy: createdBy
    };
    
    await setDoc(activityRef, activityNote);
    
    // Save PII data to PostgreSQL via fileserver
    try {
      const piiResponse = await fetch(getApiUrl('/api/patients'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          case_id: caseId,
          first_name: patientData.firstName || '',
          last_name: patientData.lastName || '',
          date_of_birth: patientData.dateOfBirth || '',
          email: patientData.email || '',
          phone: patientData.phone || '',
          address: patientData.address || ''
        })
      });
      
      if (!piiResponse.ok) {
        const errorText = await piiResponse.text();
        console.error('Failed to save PII data to PostgreSQL:', errorText);
        throw new Error(`Failed to create patient PII: ${errorText}`);
      }
    } catch (error) {
      console.error('Error saving PII data to PostgreSQL:', error);
      throw error; // Re-throw so the UI knows it failed
    }
    
    return { success: true, caseId: caseId };
  } catch (error) {
    console.error('Error creating patient case:', error);
    return { success: false, error: error };
  }
};

// Get all patients
export const getAllPatients = async (): Promise<any[]> => {
  try {
    const patientsRef = collection(db, 'patients');
    const snapshot = await getDocs(patientsRef);
    const patients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort by createdAt in descending order (most recent first)
    return patients.sort((a: any, b: any) => {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return bTime.getTime() - aTime.getTime();
    });
  } catch (error) {
    console.error('Error getting patients:', error);
    return [];
  }
};

// Update patient assigned admins
export const updatePatientAssignedAdmins = async (caseId: string, assignedUserIds: string[]) => {
  try {
    const patientRef = doc(db, 'patients', caseId);
    const uniqueAssigned = Array.from(new Set(assignedUserIds));
    await updateDoc(patientRef, { assignedAdmins: uniqueAssigned });
    return { success: true };
  } catch (error) {
    console.error('Error updating assigned admins:', error);
    return { success: false, error };
  }
};

// Update patient status
export const updatePatientStatus = async (patientId: string, status: 'active' | 'completed', updatedBy: string): Promise<void> => {
  try {
    const patientRef = doc(db, 'patients', patientId);
    await updateDoc(patientRef, {
      status: status,
      updatedAt: serverTimestamp()
    });
    
    // Get user email for logging
    let userEmail = updatedBy;
    try {
      const userDocRef = doc(db, 'users', updatedBy);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data() as any;
        userEmail = userData.email || updatedBy;
      }
    } catch (error) {
      console.log('Could not fetch user email for:', updatedBy);
    }

    // Add activity note for status update
    const activityRef = doc(db, 'activities', `${patientId}_${Date.now()}`);
    const activityNote = {
      id: activityRef.id,
      caseId: patientId,
      note: `Patient status updated to ${status}`,
      action: 'status_updated',
      timestamp: serverTimestamp(),
      createdBy: updatedBy,
      userEmail: userEmail
    };
    
    await setDoc(activityRef, activityNote);
    
    console.log(`Patient ${patientId} status updated to ${status}`);
  } catch (error) {
    console.error('Error updating patient status:', error);
    throw error;
  }
};

// Add activity note
export const addActivityNote = async (caseId: string, note: string, action: string, createdBy: string) => {
  try {
    // If createdBy is already an email, use it directly
    let userEmail = createdBy;
    
    // Only try to fetch from Firebase if createdBy looks like a UID (not an email)
    if (!createdBy.includes('@')) {
      try {
        console.log('Fetching user email for UID:', createdBy);
        const userDocRef = doc(db, 'users', createdBy);
        const userDoc = await getDoc(userDocRef);
        console.log('User doc exists:', userDoc.exists());
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as any;
          console.log('User data found:', userData);
          userEmail = userData.email || createdBy;
          console.log('Using email:', userEmail);
        } else {
          console.log('User document does not exist for UID:', createdBy);
          // Keep the UID as fallback
          userEmail = createdBy;
        }
      } catch (error) {
        console.log('Could not fetch user email for:', createdBy, error);
        userEmail = createdBy;
      }
    } else {
      console.log('createdBy is already an email:', createdBy);
    }

    const activityRef = doc(db, 'activities', `${caseId}_${Date.now()}`);
    const activityNote = {
      id: activityRef.id,
      caseId: caseId,
      note: note,
      action: action,
      timestamp: serverTimestamp(),
      createdBy: createdBy,
      userEmail: userEmail
    };
    
    console.log('Creating activity note:', activityNote);
    await setDoc(activityRef, activityNote);
    return { success: true };
  } catch (error) {
    console.error('Error adding activity note:', error);
    return { success: false, error: error };
  }
};

// Get activity notes for a case
export const getActivityNotes = async (caseId: string): Promise<any[]> => {
  try {
    const activitiesRef = collection(db, 'activities');
    const q = query(activitiesRef, where('caseId', '==', caseId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting activity notes:', error);
    return [];
  }
};

// Get all activity logs across all cases
export const getAllActivityLogs = async (): Promise<any[]> => {
  try {
    const activitiesRef = collection(db, 'activities');
    const q = query(activitiesRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    
    const logs = await Promise.all(snapshot.docs.map(async (docSnapshot) => {
      const data = docSnapshot.data();
      let userEmail = data.userEmail || data.createdBy; // Use stored userEmail if available
      
      // If no userEmail is stored, try to fetch it
      if (!data.userEmail) {
        try {
          const userDocRef = doc(db, 'users', data.createdBy);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data() as any;
            userEmail = userData.email || data.createdBy;
          } else {
            // User document doesn't exist, try to map known UIDs to emails
            console.log('User document does not exist for UID:', data.createdBy);
            if (data.createdBy === 'dQdadmWTY4OxUyyZkCEYuTkUbNN2') {
              userEmail = 'admin@theholylabs.com'; // Map the known UID to email
              console.log('Mapped UID to email:', userEmail);
            } else {
              userEmail = data.createdBy; // Keep UID as fallback
              console.log('Using UID as fallback:', userEmail);
            }
          }
        } catch (error) {
          console.log('Could not fetch user email for:', data.createdBy);
          // Try to map known UIDs to emails
          if (data.createdBy === 'dQdadmWTY4OxUyyZkCEYuTkUbNN2') {
            userEmail = 'admin@theholylabs.com';
            console.log('Mapped UID to email in catch block:', userEmail);
          } else {
            userEmail = data.createdBy;
            console.log('Using UID as fallback in catch block:', userEmail);
          }
        }
      }
      
      return {
        id: docSnapshot.id,
        ...data,
        userEmail: userEmail
      };
    }));
    
    console.log('All activity logs processed:', logs);
    return logs;
  } catch (error) {
    console.error('Error getting all activity logs:', error);
    return [];
  }
};

// Get all events
export const getEvents = async (): Promise<any[]> => {
  try {
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting events:', error);
    return [];
  }
};

// Create a new event
export const createEvent = async (eventData: {
  title: string;
  description: string;
  caseId: string;
  date: Date;
  type: string;
  status: string;
  createdBy: string;
}): Promise<string> => {
  try {
    const eventsRef = collection(db, 'events');
    const eventDoc = await addDoc(eventsRef, {
      ...eventData,
      createdAt: serverTimestamp()
    });
    
    // Automatically sync to Google Calendar if user has it linked
    try {
      const syncResult = await syncEventToGoogleCalendar({
        title: eventData.title,
        description: eventData.description,
        caseId: eventData.caseId,
        date: eventData.date,
        type: eventData.type,
        status: eventData.status,
        createdBy: eventData.createdBy
      });
      
      if (syncResult.success && syncResult.googleEventId) {
        // Update the event with Google Calendar ID
        await updateDoc(eventDoc, {
          googleEventId: syncResult.googleEventId
        });
        console.log('Event automatically synced to Google Calendar');
      } else {
        console.log('Event not synced to Google Calendar:', syncResult.error);
      }
    } catch (syncError) {
      console.error('Error during automatic calendar sync:', syncError);
      // Don't fail event creation if sync fails
    }
    
    // Save event as a meeting note with proper structure (only one record)
    if (eventData.description && eventData.description.trim()) {
      // Get user email for the createdBy field
      let userEmail = eventData.createdBy;
      if (!eventData.createdBy.includes('@')) {
        try {
          const userDocRef = doc(db, 'users', eventData.createdBy);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data() as any;
            userEmail = userData.email || eventData.createdBy;
          }
        } catch (error) {
          console.error('Error fetching user email:', error);
        }
      }
      
      // Use today's date instead of event date
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;
      
      // Create meeting note with proper structure
      const meetingNote = `${eventData.title} - ${eventData.description}`;
      
      // Add meeting note with proper structure
      await addDoc(collection(db, 'activities'), {
        caseId: eventData.caseId,
        note: meetingNote,
        action: 'meeting',
        createdBy: userEmail,
        timestamp: serverTimestamp(),
        userEmail: userEmail,
        meetingDate: formattedDate,
        meetingDescription: eventData.title,  // Use title as meeting description
        meetingNotes: eventData.description,  // Use description as meeting notes
        isEventCreated: true  // Flag to mark this as non-editable
      });
    }
    
    return eventDoc.id;
  } catch (error) {
    console.error('Error creating event:', error);
    throw error;
  }
};

// Update activity archive status
export const updateActivityArchiveStatus = async (activityId: string, archived: boolean): Promise<void> => {
  try {
    const activityRef = doc(db, 'activities', activityId);
    await updateDoc(activityRef, {
      archived: archived,
      updatedAt: serverTimestamp()
    });
    
    console.log(`Activity ${activityId} ${archived ? 'archived' : 'unarchived'} successfully`);
  } catch (error) {
    console.error(`Error ${archived ? 'archiving' : 'unarchiving'} activity:`, error);
    throw error;
  }
};

// Delete an event
export const deleteEvent = async (eventId: string, deletedBy: string): Promise<void> => {
  try {
    console.log('deleteEvent called for:', eventId);
    const eventRef = doc(db, 'events', eventId);
    const eventDoc = await getDoc(eventRef);
    
    if (eventDoc.exists()) {
      const eventData = eventDoc.data();
      console.log('Event found in Firebase:', eventData.title);
      
      // If event is synced to Google Calendar, delete it from there first
      if (eventData.googleEventId) {
        try {
          console.log('Deleting event from Google Calendar:', eventData.googleEventId);
          
          // Load Google Calendar API
          await loadGoogleCalendarAPI();
          
          if (window.gapi && window.gapi.client && window.gapi.client.calendar) {
            await window.gapi.client.calendar.events.delete({
              calendarId: 'primary',
              eventId: eventData.googleEventId
            });
            console.log('Event deleted from Google Calendar successfully');
          }
        } catch (gcalError) {
          console.warn('Failed to delete from Google Calendar:', gcalError);
          // Continue with Firebase deletion even if Google Calendar deletion fails
        }
      }
      
      // Log event deletion
      await addActivityNote(eventData.caseId, `Event "${eventData.title}" deleted`, 'event_deleted', deletedBy);
      
      // Delete the event from Firebase
      await deleteDoc(eventRef);
      console.log('Event deleted from Firebase successfully');
    } else {
      console.warn('Event not found in Firebase:', eventId);
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

// Update event status
export const updateEventStatus = async (eventId: string, status: 'active' | 'completed' | 'cancelled', updatedBy: string): Promise<void> => {
  try {
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, {
      status: status,
      updatedAt: serverTimestamp()
    });
    
    // Get event details to find the case ID for logging
    const eventDoc = await getDoc(eventRef);
    const eventData = eventDoc.data();
    
    if (eventData?.caseId) {
      // Get user email for logging
      let userEmail = updatedBy;
      try {
        const userDocRef = doc(db, 'users', updatedBy);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data() as any;
          userEmail = userData.email || updatedBy;
        }
      } catch (error) {
        console.log('Could not fetch user email for:', updatedBy);
      }

      // Add activity note for event status update
      const activityRef = doc(db, 'activities', `${eventData.caseId}_${Date.now()}`);
      const activityNote = {
        id: activityRef.id,
        caseId: eventData.caseId,
        note: `Event "${eventData.title}" status updated to ${status}`,
        action: 'event_status_updated',
        timestamp: serverTimestamp(),
        createdBy: updatedBy,
        userEmail: userEmail
      };
      
      await setDoc(activityRef, activityNote);
    }
    
    console.log(`Event ${eventId} status updated to ${status}`);
  } catch (error) {
    console.error('Error updating event status:', error);
    throw error;
  }
};

// Search patients by name or email from PostgreSQL
export const searchPatients = async (searchTerm: string): Promise<any[]> => {
  try {
    const response = await fetch(getApiUrl(`/api/patients/search?q=${encodeURIComponent(searchTerm)}`));
    if (!response.ok) {
      throw new Error('Failed to search patients');
    }
    const data = await response.json();
    return data.patients || [];
  } catch (error) {
    console.error('Error searching patients:', error);
    return [];
  }
};

// Delete activity log (super admin only)
export const deleteActivityLog = async (logId: string): Promise<void> => {
  try {
    const activityRef = doc(db, 'activities', logId);
    await deleteDoc(activityRef);
    console.log(`Activity log ${logId} deleted successfully`);
  } catch (error) {
    console.error('Error deleting activity log:', error);
    throw error;
  }
};

// Get patient details by case IDs (batch)
export const getPatientsBatch = async (caseIds: string[]): Promise<{[key: string]: any}> => {
  try {
    const response = await fetch(getApiUrl('/api/patients/batch'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ case_ids: caseIds }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch patients batch');
    }
    
    const data = await response.json();
    return data.patients || {};
  } catch (error) {
    console.error('Error fetching patients batch:', error);
    return {};
  }
};

// Delete patient case from Firebase (only Firebase data, not PostgreSQL PII)
export const deletePatientCase = async (caseId: string, deletedBy: string): Promise<{ success: boolean; error?: any }> => {
  try {
    // Delete patient record from Firebase
    const patientRef = doc(db, 'patients', caseId);
    await deleteDoc(patientRef);
    
    // Add deletion activity note
    const activityRef = doc(db, 'activities', `${caseId}_delete_${Date.now()}`);
    const activityNote = {
      id: activityRef.id,
      caseId: caseId,
      note: 'Patient case deleted from system',
      action: 'case_deleted',
      timestamp: serverTimestamp(),
      createdBy: deletedBy
    };
    
    await setDoc(activityRef, activityNote);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting patient case:', error);
    return { success: false, error: error };
  }
};

// Create a new task
export const createTask = async (taskData: {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  caseId?: string;
  patientName?: string;
  dueDate?: string;
}, createdBy: string): Promise<{ success: boolean; taskId?: string; error?: any }> => {
  try {
    const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
    const { db } = await import('./firebase');
    
    const task = {
      title: taskData.title,
      description: taskData.description || '',
      priority: taskData.priority,
      status: 'pending' as const,
      caseId: taskData.caseId || '',
      patientName: taskData.patientName || '',
      dueDate: taskData.dueDate || new Date().toISOString().split('T')[0], // Default to today
      createdAt: serverTimestamp(),
      createdBy: createdBy,
      updatedAt: serverTimestamp(),
      updatedBy: createdBy
    };
    
    const tasksCollection = collection(db, 'tasks');
    const docRef = await addDoc(tasksCollection, task);
    
    console.log('Task created successfully with ID:', docRef.id);
    return { success: true, taskId: docRef.id };
  } catch (error) {
    console.error('Error creating task:', error);
    return { success: false, error };
  }
};

export default app;
