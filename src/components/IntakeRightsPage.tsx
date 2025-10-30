import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RightsIntakeForm from './RightsIntakeForm';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useTranslation } from 'react-i18next';

export function IntakeRightsPage() {
  const { caseId, lang } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [initialValues, setInitialValues] = useState<any>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!caseId) return;
      try {
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>{t('intake.rightsTitle')}</h2>
        <button
          onClick={() => navigate(`/${lang || 'en'}/patient/${caseId}`)}
          style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' }}
        >
          ← {t('intake.back')}
        </button>
      </div>
      <div style={{ color: '#6c757d', marginBottom: 12 }}>{t('intake.case')}: {caseId}</div>
      <div style={{ background: '#ffffff', border: '1px solid #e9ecef', borderRadius: 10, padding: 20 }}>
        {isLoaded && (
          <RightsIntakeForm
            initialValues={initialValues}
            onSubmit={async ({ values, recommendations }) => {
              if (!caseId) return;
              const ref = doc(db, 'patients', String(caseId), 'intakes', 'rights');
              await setDoc(ref, {
                answers: values,
                recommendations,
                completed: true,
                updatedAt: serverTimestamp()
              }, { merge: true });
              console.log('Rights Intake saved');
            }}
          />
        )}
      </div>
    </div>
  );
}

export default IntakeRightsPage;


