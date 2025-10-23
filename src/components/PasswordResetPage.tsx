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
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  // Set document direction based on language
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setMessage(t('passwordReset.invalidEmail'));
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('');
    setMessageType('');

    try {
      console.log('Attempting to send password reset email to:', email);
      await sendPasswordResetEmail(auth, email);
      console.log('Password reset email sent successfully to:', email);
      setMessage(t('passwordReset.success'));
      setMessageType('success');
      setEmail('');
    } catch (err: any) {
      console.error('Password reset error:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      
      // Handle specific Firebase errors
      switch (err.code) {
        case 'auth/user-not-found':
          setMessage(t('passwordReset.userNotFound'));
          setMessageType('error');
          break;
        case 'auth/invalid-email':
          setMessage(t('passwordReset.invalidEmail'));
          setMessageType('error');
          break;
        case 'auth/too-many-requests':
          setMessage(t('passwordReset.tooManyRequests'));
          setMessageType('error');
          break;
        default:
          setMessage(t('passwordReset.error'));
          setMessageType('error');
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
            <img src="/logo.png" alt="SocioSync" className="login-logo" />
            <p>{t('passwordReset.subtitle')}</p>
          </div>

          <div className="login-options">
            <p style={{ marginBottom: '20px', color: '#000000' }}>
              {t('passwordReset.instructions')}
            </p>
            
            {message && (
              <div 
                style={{
                  padding: '12px',
                  marginBottom: '20px',
                  borderRadius: '6px',
                  backgroundColor: messageType === 'success' ? '#d4edda' : '#f8d7da',
                  color: messageType === 'success' ? '#155724' : '#721c24',
                  border: `1px solid ${messageType === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
                  fontSize: '14px'
                }}
              >
                {message}
              </div>
            )}
            
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
