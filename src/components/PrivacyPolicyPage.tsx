import React from 'react';
import { useTranslation } from 'react-i18next';

export function PrivacyPolicyPage() {
  const { t } = useTranslation();
  const contentHtml = t('privacy.contentHtml', { defaultValue: '' });
  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 12 }}>{t('privacy.title')}</h1>
      <p style={{ color: '#555' }}>{t('privacy.updated')}</p>
      <div style={{ marginTop: 20, lineHeight: 1.6, color: '#333' }}>
        {contentHtml ? (
          <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
        ) : (
          <p>{t('privacy.contentIntro')}</p>
        )}
      </div>
    </div>
  );
}

