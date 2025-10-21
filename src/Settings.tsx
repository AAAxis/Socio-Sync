import React from 'react';
import { useTranslation } from 'react-i18next';

interface SettingsProps {
  user: any;
  i18n: any;
  isLinkingCalendar: boolean;
  handleLanguageChange: (language: string) => void;
  handleLinkGoogleCalendar: () => void;
  handleUnlinkGoogleCalendar: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  user,
  i18n,
  isLinkingCalendar,
  handleLanguageChange,
  handleLinkGoogleCalendar,
  handleUnlinkGoogleCalendar
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-title">{t('settings.title')}</h2>
          <p className="dashboard-subtitle">{t('settings.manageAccountInfo')}</p>
        </div>
      </div>
            
      <div className="settings-content">
        <div className="settings-section">
          <h3>{t('settings.accountInformation')}</h3>
          <div className="user-info-grid">
            <div className="info-item">
              <label>{t('users.name')}:</label>
              <span>{user.name}</span>
            </div>
            <div className="info-item">
              <label>{t('users.email')}:</label>
              <span>{user.email}</span>
            </div>
            <div className="info-item">
              <label>{t('users.role')}:</label>
              <span className={`role-badge ${user.role}`}>
                {user.role === 'super_admin' ? t('users.roles.super_admin') : t('users.roles.admin')}
              </span>
            </div>
            <div className="info-item">
              <label>{t('settings.memberSince')}:</label>
              <span>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB') : 'Unknown'}</span>
            </div>
            <div className="info-item">
              <label>{t('settings.lastLogin')}:</label>
              <span>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('en-GB') : 'Unknown'}</span>
            </div>
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
          <h3>{t('settings.language')}</h3>
          <div className="language-switch-container">
            <div className="language-option">
              <label>
                <input
                  type="radio"
                  name="language"
                  value="en"
                  checked={i18n.language === 'en'}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                />
                <span className="language-label">
                  🇺🇸
                </span>
              </label>
            </div>
            <div className="language-option">
              <label>
                <input
                  type="radio"
                  name="language"
                  value="he"
                  checked={i18n.language === 'he'}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                />
                <span className="language-label">
                  🇮🇱
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;
