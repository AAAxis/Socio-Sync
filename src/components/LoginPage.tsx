import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signInWithGoogleSecure, trackUserLogin, findUserByAnyUid, findUserByLinkedGoogleEmail } from '../firebase';
import { User } from '../types';
import { useLanguageNavigate, useCurrentLanguage } from '../hooks/useLanguageNavigate';

// Login Page Component
export function LoginPage() {
  const navigate = useNavigate();
  const langNavigate = useLanguageNavigate();
  const currentLang = useCurrentLanguage();
  const { t, i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);

  const handleGoogleSignIn = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signInWithGoogleSecure();
      const firebaseUser = result.user;
      
      // Track user login with admin role (all users are admins)
      const userRole = 'admin';
      await trackUserLogin(firebaseUser, userRole);
      
      // Get user data using universal finder (handles both original UID and Google UID)
      const userResult = await findUserByAnyUid(firebaseUser.uid);
      let userDataFromDB = userResult?.userData || null;
      let actualUserId = userResult?.userId || firebaseUser.uid;
      
      // If still not found, try finding by email as fallback
      if (!userDataFromDB && firebaseUser.email) {
        const linkedUser = await findUserByLinkedGoogleEmail(firebaseUser.email);
        if (linkedUser) {
          userDataFromDB = linkedUser.userData;
          actualUserId = linkedUser.userId;
        }
      }
      
      const userData: User = {
        id: actualUserId,
        name: firebaseUser.displayName || 'User',
        email: userDataFromDB?.email || firebaseUser.email || '',
        picture: firebaseUser.photoURL || `https://via.placeholder.com/80x80/007acc/ffffff?text=${(firebaseUser.displayName || 'U').charAt(0).toUpperCase()}`,
        role: userDataFromDB?.role || userRole,
        createdAt: userDataFromDB?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        lastLoginAt: userDataFromDB?.lastLoginAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        loginCount: userDataFromDB?.loginCount || 1,
        hasPiiData: userDataFromDB?.hasPiiData || false,
        hasGoogleAccount: userDataFromDB?.hasGoogleAccount || false,
        hasGoogleCalendar: userDataFromDB?.hasGoogleCalendar || false,
      };
      
      // Store user data in localStorage for persistence
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Navigate to dashboard after successful sign-in
      setTimeout(() => {
        langNavigate('/dashboard');
      }, 100);
      
    } catch (err) {
      setError('Failed to sign in with Google');
      console.error('Error signing in with Google:', err);
    } finally {
      setIsLoading(false);
    }
  }, [langNavigate]);

  // Check for admin mode on component mount and set direction
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const adminKey = urlParams.get('admin');
    setIsAdminMode(adminKey === 'true' || adminKey === '1');
    
    // Set document direction based on language
    document.documentElement.dir = i18n.language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <div className="app">
      <div className="container">
        <div className="login-card">
          <div className="login-header">
            <img src="/logo.png" alt="SocioSync" className="login-logo" />
            <p>{t('login.subtitle')}</p>
            {isAdminMode && (
              <div className="admin-mode-indicator">
                <span className="admin-badge">🔐 {t('login.adminMode')}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="login-options">
            <a 
              href={`/${currentLang}/login`}
              className="password-login-btn"
              style={{ textDecoration: 'none', display: 'block' }}
            >
              🔑 {t('login.signInWithPassword')}
            </a>

            {isAdminMode && (
              <a 
                href={`/${currentLang}/create`}
                className="signup-btn"
                style={{ textDecoration: 'none', display: 'block' }}
              >
                📝 {t('login.createAdminAccount')}
              </a>
            )}

            <button 
              onClick={handleGoogleSignIn}
              className="google-signin-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  {t('login.signingIn')}
                </>
              ) : (
                <>
                  <svg className="google-icon" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {t('login.signInWithGoogle')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
