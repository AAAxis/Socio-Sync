import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { auth, db } from '../firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export function EmailVerificationPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const verifyEmail = async () => {
      const userId = searchParams.get('userId');
      
      if (!userId) {
        setStatus('error');
        setMessage(i18n.language === 'he' ? 'מזהה משתמש לא נמצא' : 'User ID not found');
        return;
      }

      try {
        // Get current user if logged in
        const currentUser = auth.currentUser;
        
        // Update user document to mark as verified
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          setStatus('error');
          setMessage(i18n.language === 'he' ? 'משתמש לא נמצא' : 'User not found');
          return;
        }

        // Update user document with email verified flag
        await updateDoc(userRef, {
          emailVerified: true,
          emailVerifiedAt: new Date().toISOString()
        });

        // If user is currently logged in, reload to update emailVerified status
        if (currentUser && currentUser.uid === userId) {
          await currentUser.reload();
        }

        setStatus('success');
        setMessage(i18n.language === 'he' ? 'אימייל אומת בהצלחה!' : 'Email verified successfully!');
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          const lang = i18n.language === 'he' ? 'he' : 'en';
          navigate(`/${lang}/dashboard`);
        }, 2000);

      } catch (error: any) {
        console.error('Email verification error:', error);
        setStatus('error');
        setMessage(i18n.language === 'he' 
          ? 'שגיאה באימות אימייל' 
          : 'Error verifying email');
      }
    };

    verifyEmail();
  }, [searchParams, navigate, i18n, t]);

  return (
    <div className="app">
      <div className="container">
        <div className="login-card">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            {status === 'verifying' && (
              <>
                <div style={{ fontSize: '18px', color: '#666666', marginBottom: '20px' }}>
                  {i18n.language === 'he' ? 'מאמת אימייל...' : 'Verifying email...'}
                </div>
                <div className="spinner"></div>
              </>
            )}
            
            {status === 'success' && (
              <>
                <div style={{ fontSize: '24px', color: '#4CAF50', marginBottom: '20px' }}>
                  ✓
                </div>
                <div style={{ fontSize: '18px', color: '#333', marginBottom: '10px' }}>
                  {message}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {i18n.language === 'he' ? 'מעבר לדשבורד...' : 'Redirecting to dashboard...'}
                </div>
              </>
            )}
            
            {status === 'error' && (
              <>
                <div style={{ fontSize: '24px', color: '#f44336', marginBottom: '20px' }}>
                  ✗
                </div>
                <div style={{ fontSize: '18px', color: '#333', marginBottom: '20px' }}>
                  {message}
                </div>
                <button
                  onClick={() => {
                    const lang = i18n.language === 'he' ? 'he' : 'en';
                    navigate(`/${lang}/dashboard`);
                  }}
                  style={{
                    padding: '10px 20px',
                    fontSize: '16px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {i18n.language === 'he' ? 'עבור לדשבורד' : 'Go to Dashboard'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

