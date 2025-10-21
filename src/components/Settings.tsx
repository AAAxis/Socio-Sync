import React from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '../types';

interface SettingsProps {
  user: User;
  i18n: any;
  isLinkingCalendar: boolean;
  handleLanguageChange: (language: string) => void;
  handleLinkGoogleCalendar: () => void;
  handleUnlinkGoogleCalendar: () => void;
}

export default function Settings({
  user,
  i18n,
  isLinkingCalendar,
  handleLanguageChange,
  handleLinkGoogleCalendar,
  handleUnlinkGoogleCalendar
}: SettingsProps) {
  const { t } = useTranslation();
  
  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>{t('settings.title')}</h2>
      </div>
      
      <div className="settings-content">
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
          <h3>{t('settings.accountInfo')}</h3>
          <div className="account-info">
            <p><strong>{t('settings.name')}:</strong> {user.name}</p>
            <p><strong>{t('settings.email')}:</strong> {user.email}</p>
            <p><strong>{t('settings.role')}:</strong> {user.role}</p>
            <p><strong>{t('settings.created')}:</strong> {new Date(user.createdAt || '').toLocaleDateString('en-GB')}</p>
            <p><strong>{t('settings.lastLogin')}:</strong> {new Date(user.lastLoginAt || '').toLocaleDateString('en-GB')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
