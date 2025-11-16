import React from 'react';
import { useTranslation } from 'react-i18next';

export function TermsPage() {
  const { t } = useTranslation();
  const contentHtml = t('terms.contentHtml', { defaultValue: '' });
  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 12 }}>{t('terms.title')}</h1>
      <p style={{ color: '#555' }}>{t('terms.updated')}</p>
      <div style={{ marginTop: 20, lineHeight: 1.6, color: '#333' }}>
        {contentHtml ? (
          <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
        ) : (
          <p>{t('terms.contentIntro')}</p>
        )}
      </div>
    </div>
  );
}

