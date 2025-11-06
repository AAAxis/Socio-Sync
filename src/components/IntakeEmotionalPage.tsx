import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { emotionalQuestions, getVisibleQuestions, handleAnswerChange, EmotionalAnswerMap } from './EmotionalIntakeLogic';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguageNavigate } from '../hooks/useLanguageNavigate';
import { getApiUrl } from '../config';

export function IntakeEmotionalPage() {
  const { caseId, lang } = useParams();
  const navigate = useNavigate();
  const langNavigate = useLanguageNavigate();
  const { t, i18n } = useTranslation();
  const [answers, setAnswers] = useState<EmotionalAnswerMap>({});
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
        const ref = doc(db, 'patients', String(caseId), 'intakes', 'emotional');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setAnswers((data.answers || {}) as EmotionalAnswerMap);
        }
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, [caseId]);

  const visible = useMemo(() => getVisibleQuestions(answers), [answers]);

  const onChange = (field: string, value: any) => {
    const { answers: updated } = handleAnswerChange(answers, field, value);
    setAnswers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId) return;
    try {
      const ref = doc(db, 'patients', String(caseId), 'intakes', 'emotional');
      await setDoc(ref, { answers, completed: true, updatedAt: serverTimestamp() }, { merge: true });
      
      // Navigate back to patient detail page with intake tab
      const targetUrl = lang ? `/${lang}/patient/${caseId}` : `/patient/${caseId}`;
      navigate(targetUrl + '#intake');
    } catch (error) {
      console.error('Error saving emotional intake:', error);
      alert('שגיאה בשמירה. אנא נסה שוב.');
    }
  };

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
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>{t('intake.emotionalTitle')}</h2>
      </div>
      <div style={{ color: '#6c757d', marginBottom: 12 }}>
        {t('intake.case')}: {caseId}
        {patientName && (
          <span style={{ marginLeft: '12px', fontWeight: '400', color: '#666' }}>
            - {patientName}
          </span>
        )}
      </div>

      {isLoaded && (
      <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 10, padding: 20 }}>
        {visible.map((q) => (
          <div key={q.field_name} style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontWeight: 500 }}>{q.question_text}</label>
            {q.input_type === 'text' && (
              <input
                type="text"
                value={(answers[q.field_name] as string) || ''}
                onChange={(e) => onChange(q.field_name, e.target.value)}
                style={{ padding: '10px 12px', border: '1px solid #ced4da', borderRadius: 6 }}
              />
            )}
            {q.input_type === 'yes_no' && (
              <select
                value={(answers[q.field_name] as string) || ''}
                onChange={(e) => onChange(q.field_name, e.target.value)}
                style={{ padding: '10px 12px', border: '1px solid #ced4da', borderRadius: 6 }}
              >
                <option value="">--</option>
                <option value="כן">כן</option>
                <option value="לא">לא</option>
              </select>
            )}
            {q.input_type === 'scale' && (
              <select
                value={(answers[q.field_name] as string) || ''}
                onChange={(e) => onChange(q.field_name, e.target.value)}
                style={{ padding: '10px 12px', border: '1px solid #ced4da', borderRadius: 6 }}
              >
                <option value="">--</option>
                {(q.options || []).map((opt) => (
                  <option key={opt} value={opt}>{String(opt)}</option>
                ))}
              </select>
            )}
            {q.input_type === 'multidropdown' && (
              <select
                multiple
                value={((answers[q.field_name] as string[]) || [])}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  onChange(
                    q.field_name,
                    Array.from(e.currentTarget.selectedOptions).map((o) => String(o.value))
                  )
                }
                style={{ padding: '10px 12px', border: '1px solid #ced4da', borderRadius: 6 }}
              >
                {(q.options || []).map((opt) => (
                  <option key={opt} value={opt}>{String(opt)}</option>
                ))}
              </select>
            )}
            {/* no per-question description in emotional dataset */}
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="submit" style={{ background: '#007acc', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 6, cursor: 'pointer' }}>
            {t('intake.save')}
          </button>
        </div>
      </form>
      )}
    </div>
  );
}

export default IntakeEmotionalPage;


