import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signInWithEmail, generateOTP, sendOTPEmail, trackUserLogin, findUserByAnyUid } from '../firebase';
import { User } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

// Password Login Page Component
export function PasswordLoginPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [show2FA, setShow2FA] = useState(false);
  const [pendingUser, setPendingUser] = useState<FirebaseUser | null>(null);
  const [passwordData, setPasswordData] = useState({
    email: '',
    password: ''
  });
  const [twoFAData, setTwoFAData] = useState({
    otpCode: '',
    enteredOtp: ''
  });
  
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [is2FALoading, setIs2FALoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Set document direction based on language
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const handlePasswordSignIn = async () => {
    if (!passwordData.email || !passwordData.password) {
      setAuthError('Please fill in all required fields');
      return;
    }

    setIsPasswordLoading(true);
    setAuthError(null);

    try {
      const result = await signInWithEmail(passwordData.email, passwordData.password);
      const firebaseUser = result.user;
      setPendingUser(firebaseUser);
      
      // Check if user has 2FA enabled using universal finder
      const userResult = await findUserByAnyUid(firebaseUser.uid);
      const userDataFromDB = userResult?.userData || null;
      const is2FAEnabled = userDataFromDB?.twoFactorEnabled || false;
      
      if (is2FAEnabled) {
        // Generate and send OTP for 2FA
        const otpCode = generateOTP();
        setTwoFAData(prev => ({ ...prev, otpCode }));
        
        await sendOTPEmail(passwordData.email, firebaseUser.displayName || 'User', otpCode);
        
        // Show 2FA form
        setShow2FA(true);
      } else {
        // 2FA is disabled, proceed with direct login
        await handleDirectLogin(firebaseUser);
      }
      
    } catch (err: any) {
      setAuthError(err.message || 'Failed to sign in');
      console.error('Password sign in error:', err);
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handleDirectLogin = async (firebaseUser: FirebaseUser) => {
    try {
      // Track user login with admin role
      await trackUserLogin(firebaseUser, 'admin');
      
      // Get user data using universal finder
      const userResult = await findUserByAnyUid(firebaseUser.uid);
      const userDataFromDB = userResult?.userData || null;
      
      const userData: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || userDataFromDB?.name || 'User',
        email: firebaseUser.email || '',
        picture: firebaseUser.photoURL || '',
        role: userDataFromDB?.role || 'admin',
        createdAt: userDataFromDB?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        lastLoginAt: userDataFromDB?.lastLoginAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        loginCount: userDataFromDB?.loginCount || 1,
        hasPiiData: userDataFromDB?.hasPiiData || false,
      };

      localStorage.setItem('user', JSON.stringify(userData));
      
      // Reset all auth states
      setShow2FA(false);
      setPendingUser(null);
      setPasswordData({ email: '', password: '' });
      setTwoFAData({ otpCode: '', enteredOtp: '' });
      
      // Small delay to ensure localStorage is set before navigation
      setTimeout(() => {
        navigate('/dashboard');
      }, 100);
      
    } catch (error) {
      console.error('Direct login error:', error);
      setAuthError('Failed to complete login process');
    }
  };

  const handle2FAVerification = async () => {
    if (!twoFAData.enteredOtp || !pendingUser) {
      setAuthError('Please enter the OTP code');
      return;
    }

    if (twoFAData.enteredOtp !== twoFAData.otpCode) {
      setAuthError('Invalid OTP code');
      return;
    }

    setIs2FALoading(true);
    setAuthError(null);

    try {
      // Track user login with admin role
      await trackUserLogin(pendingUser, 'admin');
      
      // Get user data using universal finder
      const userResult = await findUserByAnyUid(pendingUser.uid);
      const userDataFromDB = userResult?.userData || null;
      
      const userData: User = {
        id: pendingUser.uid,
        name: userDataFromDB?.name || pendingUser.displayName || 'User',
        email: pendingUser.email || '',
        picture: pendingUser.photoURL || `https://via.placeholder.com/80x80/007acc/ffffff?text=${(userDataFromDB?.name || pendingUser.displayName || 'U').charAt(0).toUpperCase()}`,
        role: userDataFromDB?.role || 'admin',
        createdAt: userDataFromDB?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        lastLoginAt: userDataFromDB?.lastLoginAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        loginCount: userDataFromDB?.loginCount || 1,
        hasPiiData: userDataFromDB?.hasPiiData || false,
      };

      localStorage.setItem('user', JSON.stringify(userData));
      
      // Reset all auth states
      setShow2FA(false);
      setPendingUser(null);
      setPasswordData({ email: '', password: '' });
      setTwoFAData({ otpCode: '', enteredOtp: '' });
      
      // Small delay to ensure localStorage is set before navigation
      setTimeout(() => {
        navigate('/dashboard');
      }, 100);
      
    } catch (err) {
      setAuthError('Failed to complete authentication');
      console.error('2FA verification error:', err);
    } finally {
      setIs2FALoading(false);
    }
  };

  const handlePasswordInputChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  const handle2FAInputChange = (field: string, value: string) => {
    setTwoFAData(prev => ({ ...prev, [field]: value }));
  };

  const closeAuthModals = () => {
    setShow2FA(false);
    setPendingUser(null);
    setPasswordData({ email: '', password: '' });
    setTwoFAData({ otpCode: '', enteredOtp: '' });
    setAuthError(null);
  };

  if (show2FA) {
    return (
      <div className="app">
        <div className="container">
          <div className="login-card">
            <div className="login-header">
              <h1>SocioSync</h1>
              <p>Two-Factor Authentication</p>
            </div>
            
            {authError && (
              <div className="error-message">
                {authError}
              </div>
            )}
            
            <div className="login-options">
              <p>We've sent a 6-digit code to your email. Please enter it below:</p>
              
              <div className="form-group">
                <label htmlFor="otp">Verification Code *</label>
                <input
                  type="text"
                  id="otp"
                  value={twoFAData.enteredOtp}
                  onChange={(e) => handle2FAInputChange('enteredOtp', e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
              </div>
              
              <button 
                onClick={handle2FAVerification} 
                className="signin-btn"
                disabled={is2FALoading}
              >
                {is2FALoading ? 'Verifying...' : 'Verify & Sign In'}
              </button>

              <button 
                onClick={closeAuthModals}
                className="cancel-btn"
                style={{ marginTop: '10px' }}
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="container">
        <div className="login-card">
          <button onClick={() => navigate('/')} className="back-to-login-btn" title="Back to main login">
            ←
          </button>
          <div className="login-header">
            <img src="/logo.jpeg" alt="SocioSync" className="login-logo" />
            <p>{t('passwordLogin.subtitle')}</p>
          </div>

          {authError && (
            <div className="error-message">
              {authError}
            </div>
          )}

          <div className="login-options">
            <div className="form-group">
              <input
                type="email"
                id="email"
                value={passwordData.email}
                onChange={(e) => handlePasswordInputChange('email', e.target.value)}
                placeholder={t('passwordLogin.emailPlaceholder')}
              />
            </div>

            <div className="form-group">
              <input
                type="password"
                id="password"
                value={passwordData.password}
                onChange={(e) => handlePasswordInputChange('password', e.target.value)}
                placeholder={t('passwordLogin.passwordPlaceholder')}
              />
            </div>
            
            <button 
              onClick={handlePasswordSignIn} 
              className="signin-btn"
              disabled={isPasswordLoading}
            >
              {isPasswordLoading ? t('passwordLogin.signingIn') : t('passwordLogin.signIn')}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <p>
                <a href="/reset-password" style={{ color: '#007acc', textDecoration: 'none', fontSize: '14px' }}>
                  🔒 {t('passwordLogin.forgotPassword')}
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
