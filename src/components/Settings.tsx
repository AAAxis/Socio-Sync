import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '../types';
import { Link } from 'react-router-dom';
import { getApiUrl } from '../config';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface SettingsProps {
  user: User;
  i18n: any;
  isLinkingCalendar: boolean;
  handleLanguageChange: (language: string) => void;
  handleLinkGoogleCalendar: () => void;
  handleUnlinkGoogleCalendar: () => void;
  refreshUserData?: (userId: string) => void;
}

export default function Settings({
  user,
  i18n,
  isLinkingCalendar,
  handleLanguageChange,
  handleLinkGoogleCalendar,
  handleUnlinkGoogleCalendar,
  refreshUserData
}: SettingsProps) {
  const { t } = useTranslation();
  const langPrefix = i18n?.language ? `/${i18n.language}` : '';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [profileImageError, setProfileImageError] = useState(false);

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch(getApiUrl('/upload'), {
        method: 'POST',
        body: formDataUpload,
      });

      if (response.ok) {
        const result = await response.json();
        const imageUrl = result.file_url;

        if (imageUrl && user.id) {
        // Update user profile picture in Firebase
          try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          picture: imageUrl
        });

            // Refresh user data to show new image
        if (refreshUserData) {
          await refreshUserData(user.id);
            }
            
            alert('Profile picture updated successfully!');
          } catch (firebaseError) {
            console.error('Firebase update failed:', firebaseError);
            alert('Image uploaded but failed to update profile. Please refresh the page.');
          }
        } else {
          alert('Upload successful but missing image URL or user ID');
        }

        setUploadError(null);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>{t('settings.title')}</h2>
      </div>
      
      <div className="settings-content">
        <div className="settings-section">
          <h3>{t('settings.accountInfo')}</h3>
          <div className="account-info">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: user.picture ? 'transparent' : '#6c757d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    border: '2px solid #ddd'
                  }}
                >
              {user.picture && !profileImageError ? (
                <img
                  src={user.picture}
                  alt="Profile"
                  onError={(e) => {
                    setProfileImageError(true);
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : null}
              {(!user.picture || profileImageError) && (
                <span style={{ fontSize: '32px', color: 'white' }}>
                  👤
                </span>
              )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureUpload}
                  style={{ display: 'none' }}
                />
                
                <button
                  onClick={() => {
                    console.log('Change Photo button clicked');
                    fileInputRef.current?.click();
                  }}
                  disabled={isUploading}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    cursor: isUploading ? 'not-allowed' : 'pointer',
                    opacity: isUploading ? 0.6 : 1
                  }}
                >
                  {isUploading ? 'Uploading...' : 'Change Photo'}
                </button>
                
                {uploadError && (
                  <div style={{ color: '#dc3545', fontSize: '12px', textAlign: 'center' }}>
                    {uploadError}
                  </div>
                )}
              </div>
              
              <div style={{ flex: 1 }}>
                <p><strong>{t('settings.name')}:</strong> {user.name}</p>
                <p><strong>{t('settings.email')}:</strong> {user.email}</p>
                <p><strong>{t('settings.role')}:</strong> {user.role}</p>
                <p><strong>{t('settings.created')}:</strong> {new Date(user.createdAt || '').toLocaleDateString('en-GB')}</p>
                <p><strong>{t('settings.lastLogin')}:</strong> {new Date(user.lastLoginAt || '').toLocaleDateString('en-GB')}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="settings-section">
          <h3>{t('settings.languageSettings')}</h3>
          <div className="language-selector">
            <label htmlFor="language-select">{t('settings.selectLanguage')}:</label>
            <select
              id="language-select"
              value={i18n.language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="language-dropdown"
            >
              <option value="en">English</option>
              <option value="he">עברית (Hebrew)</option>
            </select>
          </div>
        </div>
        
        <div className="settings-section">
          <h3>{t('settings.googleIntegration')}</h3>
          <div className="google-integration-grid">
            <div className="integration-item">
              <div className="integration-header">
                <span className="integration-icon">📅</span>
                <span className="integration-title">{t('settings.googleCalendar')}</span>
                <span className={`integration-status ${user.hasGoogleCalendar ? 'linked' : 'not-linked'}`}>
                  {user.hasGoogleCalendar ? t('settings.linked') : t('settings.notLinked')}
                </span>
              </div>
              {user.hasGoogleCalendar ? (
                <div className="integration-details">
                  <p className="integration-description">
                    {t('settings.googleCalendarLinked')}
                  </p>
                  <button 
                    onClick={handleUnlinkGoogleCalendar}
                    disabled={isLinkingCalendar}
                    className="unlink-google-btn"
                  >
                    {isLinkingCalendar ? (
                      <>
                        <span className="spinner"></span>
                        {t('settings.unlinking')}
                      </>
                    ) : (
                      <>
                        🔓 {t('settings.unlinkGoogleCalendar')}
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="integration-details">
                  <p className="integration-description">
                    {t('settings.googleCalendarNotLinked')}
                  </p>
                  <button 
                    onClick={handleLinkGoogleCalendar}
                    disabled={isLinkingCalendar}
                    className="link-google-btn"
                  >
                    {isLinkingCalendar ? (
                      <>
                        <span className="spinner"></span>
                        {t('settings.linking')}
                      </>
                    ) : (
                      <>
                        📅 {t('settings.linkGoogleCalendar')}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="settings-section">
          <h3>{t('settings.legal')}</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link
              to={`${langPrefix}/privacy`}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                textDecoration: 'none',
                color: '#007acc',
                background: '#fff'
              }}
            >
              {t('settings.privacyPolicy')}
            </Link>
            <Link
              to={`${langPrefix}/terms`}
              style={{
                padding: '10px 16px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                textDecoration: 'none',
                color: '#007acc',
                background: '#fff'
              }}
            >
              {t('settings.termsOfService')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
