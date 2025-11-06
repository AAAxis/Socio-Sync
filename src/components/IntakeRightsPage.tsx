import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RightsIntakeForm from './RightsIntakeForm';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useTranslation } from 'react-i18next';
import { useLanguageNavigate } from '../hooks/useLanguageNavigate';
import { getApiUrl } from '../config';

export function IntakeRightsPage() {
  const { caseId, lang } = useParams();
  const navigate = useNavigate();
  const langNavigate = useLanguageNavigate();
  const { t, i18n } = useTranslation();
  const [initialValues, setInitialValues] = useState<any>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [patientName, setPatientName] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      if (!caseId) return;
      try {
        // Load patient name
        try {
          const response = await fetch(getApiUrl(`/api/patients/${caseId}`));
          if (response.ok) {
            const data = await response.json();
            if (data.patient && data.patient.first_name && data.patient.last_name) {
              setPatientName(`${data.patient.first_name} ${data.patient.last_name}`);
            }
          }
        } catch (error) {
          console.error('Error fetching patient name:', error);
        }

        // Load intake data
        const ref = doc(db, 'patients', String(caseId), 'intakes', 'rights');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setInitialValues(data.answers || {});
        }
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, [caseId]);
  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      {/* Navigation Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 20,
        padding: '12px 16px',
        background: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef',
        flexWrap: 'wrap',
        gap: '8px',
        direction: i18n.language === 'he' ? 'rtl' : 'ltr'
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => langNavigate('/dashboard?tab=calendar')}
            style={{ 
              background: '#007acc', 
              color: '#fff', 
              border: 'none', 
              padding: '8px 14px', 
              borderRadius: 6, 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            📅 {t('navigation.calendar')}
          </button>
          <button
            onClick={() => langNavigate('/dashboard?tab=projects')}
            style={{ 
              background: '#007acc', 
              color: '#fff', 
              border: 'none', 
              padding: '8px 14px', 
              borderRadius: 6, 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            👥 {t('navigation.projects')}
          </button>
          <button
            onClick={() => langNavigate('/dashboard')}
            style={{ 
              background: '#007acc', 
              color: '#fff', 
              border: 'none', 
              padding: '8px 14px', 
              borderRadius: 6, 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            📊 {t('navigation.dashboard')}
          </button>
          <button
            onClick={() => {
              const targetUrl = lang ? `/${lang}/patient/${caseId}` : `/patient/${caseId}`;
              navigate(targetUrl + '#intake');
            }}
            style={{ 
              background: '#6c757d', 
              color: '#fff', 
              border: 'none', 
              padding: '8px 14px', 
              borderRadius: 6, 
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ← {t('intake.back')}
          </button>
        </div>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>{t('intake.rightsTitle')}</h2>
      </div>
      <div style={{ color: '#6c757d', marginBottom: 12 }}>
        {t('intake.case')}: {caseId}
        {patientName && (
          <span style={{ marginLeft: '12px', fontWeight: '400', color: '#666' }}>
            - {patientName}
          </span>
        )}
      </div>
      <div style={{ background: '#ffffff', border: '1px solid #e9ecef', borderRadius: 10, padding: 20 }}>
        {isLoaded && (
          <RightsIntakeForm
            initialValues={initialValues}
            onSubmit={async ({ values, recommendations }) => {
              if (!caseId) return;
              try {
                const ref = doc(db, 'patients', String(caseId), 'intakes', 'rights');
                await setDoc(ref, {
                  answers: values,
                  recommendations,
                  completed: true,
                  updatedAt: serverTimestamp()
                }, { merge: true });
                
                // Navigate back to patient detail page with intake tab
                const targetUrl = lang ? `/${lang}/patient/${caseId}` : `/patient/${caseId}`;
                navigate(targetUrl + '#intake');
              } catch (error) {
                console.error('Error saving rights intake:', error);
                alert('שגיאה בשמירה. אנא נסה שוב.');
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

export default IntakeRightsPage;


