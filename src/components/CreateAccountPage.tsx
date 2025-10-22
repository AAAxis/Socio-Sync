import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signUpWithEmail, trackUserLogin } from '../firebase';
import { User } from '../types';

// Create Account Page Component
export function CreateAccountPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [passwordData, setPasswordData] = useState({
    name: '',
    email: '',
    password: ''
  });
  
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check for existing user session on component mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="app">
        <div className="container">
          <div className="login-card">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '18px', color: '#666666' }}>
                {i18n.language === 'he' ? 'טוען...' : 'Loading...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const handlePasswordSignUp = async () => {
    if (!passwordData.name || !passwordData.email || !passwordData.password) {
      setAuthError(t('createAccount.fillAllFields'));
      return;
    }

    setIsPasswordLoading(true);
    setAuthError(null);

    try {
      console.log('Creating account with data:', passwordData);
      const result = await signUpWithEmail(passwordData.email, passwordData.password, passwordData.name);
      const firebaseUser = result.user;
      
      console.log('Firebase user created:', firebaseUser.displayName);
      
      // Track user login with admin role (since this is admin signup)
      await trackUserLogin(firebaseUser, 'admin', passwordData.name);
      
      // Show success message
      setAuthError(t('createAccount.successMessage'));
      
      // Reset form
      setPasswordData({ name: '', email: '', password: '' });
      
      // Navigate back to users tab after 2 seconds
      setTimeout(() => {
        navigate('/dashboard?tab=users');
      }, 2000);
      
    } catch (err: any) {
      setAuthError(err.message || t('createAccount.error'));
      console.error('Password sign up error:', err);
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const handlePasswordInputChange = (field: string, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="app">
      <div className="container">
        <div className="login-card">
          <button onClick={() => navigate('/dashboard')} className="back-to-login-btn" title="Back to dashboard">
            ←
          </button>
          <div className="login-header">
            <img src="/logo.jpeg" alt="SocioSync" className="login-logo" />
            <p>{t('createAccount.subtitle')}</p>
          </div>

          <div className="login-options">
            <div className="form-group">
              <input
                type="text"
                id="signupName"
                value={passwordData.name}
                onChange={(e) => handlePasswordInputChange('name', e.target.value)}
                placeholder={t('createAccount.namePlaceholder')}
              />
            </div>
            
            <div className="form-group">
              <input
                type="email"
                id="signupEmail"
                value={passwordData.email}
                onChange={(e) => handlePasswordInputChange('email', e.target.value)}
                placeholder={t('createAccount.emailPlaceholder')}
              />
            </div>
            
            <div className="form-group">
              <input
                type="password"
                id="signupPassword"
                value={passwordData.password}
                onChange={(e) => handlePasswordInputChange('password', e.target.value)}
                placeholder={t('createAccount.passwordPlaceholder')}
              />
            </div>

            {authError && (
              <div className="error-message">{authError}</div>
            )}

            <button
              onClick={handlePasswordSignUp} 
              className="signin-btn"
              disabled={isPasswordLoading}
            >
              {isPasswordLoading ? t('createAccount.creating') : t('createAccount.inviteButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
