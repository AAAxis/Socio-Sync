import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

// Password Reset Page Component
export function PasswordResetPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Set document direction based on language
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      console.log('Please enter your email address');
      return;
    }

    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      console.log(t('passwordReset.success'));
      setEmail('');
    } catch (err: any) {
      console.error('Password reset error:', err);
      
      // Handle specific Firebase errors
      switch (err.code) {
        case 'auth/user-not-found':
          console.log(t('passwordReset.userNotFound'));
          break;
        case 'auth/invalid-email':
          console.log(t('passwordReset.invalidEmail'));
          break;
        case 'auth/too-many-requests':
          console.log(t('passwordReset.tooManyRequests'));
          break;
        default:
          console.log(t('passwordReset.error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <div className="login-card">
          <button onClick={() => navigate('/login')} className="back-to-login-btn" title="Back to login">
            ←
          </button>
          <div className="login-header">
            <img src="/logo.jpeg" alt="SocioSync" className="login-logo" />
            <p>{t('passwordReset.subtitle')}</p>
          </div>

          <div className="login-options">
            <p style={{ marginBottom: '20px', color: '#000000' }}>
              {t('passwordReset.instructions')}
            </p>
            
            <form onSubmit={handlePasswordReset}>
              <div className="form-group">
                <input
                  type="email"
                  id="resetEmail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('passwordReset.emailPlaceholder')}
                  disabled={isLoading}
                />
              </div>
              
              <button 
                type="submit"
                className="signin-btn"
                disabled={isLoading}
                style={{ width: '100%' }}
              >
                {isLoading ? t('passwordReset.sending') : t('passwordReset.sendButton')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
