import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { careerQuestions, getVisibleQuestions, handleAnswerChange, CareerAnswers } from './CareerIntakeLogic';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useTranslation } from 'react-i18next';
import { useLanguageNavigate } from '../hooks/useLanguageNavigate';
import { getApiUrl } from '../config';

export function IntakeProfesionalPage() {
  const { caseId, lang } = useParams();
  const navigate = useNavigate();
  const langNavigate = useLanguageNavigate();
  const { t, i18n } = useTranslation();
  const [answers, setAnswers] = useState<CareerAnswers>({});
  const visible = useMemo(() => getVisibleQuestions(answers), [answers]);
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
        const ref = doc(db, 'patients', String(caseId), 'intakes', 'professional');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setAnswers(snap.data().answers || {});
        }
      } catch (error) {
        console.error('Error loading professional intake:', error);
      } finally {
        setIsLoaded(true);
      }
    };
    load();
  }, [caseId]);

  const onChange = (field: string, value: any) => {
    const { answers: updated } = handleAnswerChange(answers, field, value);
    setAnswers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId) return;
    try {
      const ref = doc(db, 'patients', String(caseId), 'intakes', 'professional');
      await setDoc(ref, { answers, completed: true, updatedAt: serverTimestamp() }, { merge: true });
      
      // Navigate back to patient detail page with intake tab
      const targetUrl = lang ? `/${lang}/patient/${caseId}` : `/patient/${caseId}`;
      navigate(targetUrl + '#intake');
    } catch (error) {
      console.error('Error saving professional intake:', error);
      console.error('Save error');
    }
  };

  const fieldStyle = {
    marginBottom: 16,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6
  };

  const inputStyle = {
    padding: '10px 12px',
    border: '1px solid #ced4da',
    borderRadius: 6,
    fontSize: 14
  };

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
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
            ← {t('intake.back', 'חזרה')}
          </button>
        </div>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>{t('intake.professionalTitle', 'טופס מקצועי')}</h2>
      </div>
      <p style={{ marginBottom: 20, color: '#666' }}>
        {t('intake.case', 'תיק')}: {caseId}
        {patientName && (
          <span style={{ marginLeft: '12px', fontWeight: '400', color: '#666' }}>
            - {patientName}
          </span>
        )}
      </p>

      {isLoaded && (
        <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #e9ecef', borderRadius: 10, padding: 20 }}>
          {visible.map((q) => (
            <div key={q.field_name} style={fieldStyle}>
              <label style={{ fontWeight: 500 }}>{q.field_label}</label>
              {q.field_type === 'text' && (
                <input
                  type="text"
                  value={(answers[q.field_name] as string) || ''}
                  onChange={(e) => onChange(q.field_name, e.target.value)}
                  style={inputStyle}
                />
              )}
              {q.field_type === 'textarea' && (
                <textarea
                  value={(answers[q.field_name] as string) || ''}
                  onChange={(e) => onChange(q.field_name, e.target.value)}
                  style={{ ...inputStyle, minHeight: 80 }}
                />
              )}
              {q.field_type === 'number' && (
                <input
                  type="number"
                  value={(answers[q.field_name] as number) || ''}
                  onChange={(e) => onChange(q.field_name, Number(e.target.value))}
                  style={inputStyle}
                />
              )}
              {q.field_type === 'select' && (
                <select
                  value={(answers[q.field_name] as string) || ''}
                  onChange={(e) => onChange(q.field_name, e.target.value)}
                  style={inputStyle}
                >
                  <option value="">--</option>
                  {(q.options || []).map((opt) => (
                    <option key={opt} value={opt}>{String(opt)}</option>
                  ))}
                </select>
              )}
              {q.field_type === 'multiselect' && (
                <select
                  multiple
                  value={((answers[q.field_name] as string[]) || [])}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    onChange(
                      q.field_name,
                      Array.from(e.currentTarget.selectedOptions).map((o) => String(o.value))
                    )
                  }
                  style={{ ...inputStyle, minHeight: 120 }}
                >
                  {(q.options || []).map((opt) => (
                    <option key={opt} value={opt}>{String(opt)}</option>
                  ))}
                </select>
              )}
              {q.field_type === 'scale' && (
                <select
                  value={(answers[q.field_name] as string) || ''}
                  onChange={(e) => onChange(q.field_name, e.target.value)}
                  style={inputStyle}
                >
                  <option value="">--</option>
                  {(q.options || []).map((opt) => (
                    <option key={opt} value={opt}>{String(opt)}</option>
                  ))}
                </select>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="submit" style={{ background: '#007acc', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 6, cursor: 'pointer' }}>
              {t('intake.save', 'שמירה')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}