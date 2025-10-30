import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { careerQuestions, getVisibleQuestions, handleAnswerChange, CareerAnswers } from './CareerIntakeLogic';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useTranslation } from 'react-i18next';

export function IntakeProfesionalPage() {
  const { caseId, lang } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<CareerAnswers>({});
  const visible = useMemo(() => getVisibleQuestions(answers), [answers]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!caseId) return;
      try {
        const ref = doc(db, 'patients', String(caseId), 'intakes', 'professional');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setAnswers((data.answers || {}) as CareerAnswers);
        }
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

  const containerStyle: React.CSSProperties = {
    padding: 24,
    maxWidth: 900,
    margin: '0 auto'
  };
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  };
  const backBtnStyle: React.CSSProperties = {
    background: '#6c757d',
    color: '#fff',
    border: 'none',
    padding: '8px 14px',
    borderRadius: 6,
    cursor: 'pointer'
  };
  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid #e9ecef',
    borderRadius: 10,
    padding: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  };
  const fieldStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 14
  };
  const inputStyle: React.CSSProperties = {
    padding: '10px 12px',
    border: '1px solid #ced4da',
    borderRadius: 6
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={{ margin: 0 }}>{t('intake.professionalTitle')}</h2>
        <button
          onClick={() => navigate(`/${lang || 'en'}/patient/${caseId}`)}
          style={backBtnStyle}
        >
          ← {t('intake.back')}
        </button>
      </div>
      <div style={{ color: '#6c757d', marginBottom: 12 }}>{t('intake.case')}: {caseId}</div>

      {isLoaded && (
      <form style={cardStyle} onSubmit={(e) => {
        e.preventDefault();
        if (!caseId) return;
        const ref = doc(db, 'patients', String(caseId), 'intakes', 'professional');
        setDoc(ref, { answers, completed: true, updatedAt: serverTimestamp() }, { merge: true });
      }}>
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
                rows={3}
                style={inputStyle}
              />
            )}
            {q.field_type === 'number' && (
              <input
                type="number"
                value={(answers[q.field_name] as number | string) || ''}
                onChange={(e) => onChange(q.field_name, e.target.value)}
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
                  <option key={opt} value={opt}>{opt}</option>
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
                style={inputStyle}
              >
                {(q.options || []).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
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
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
            {q.description && <div><small>{q.description}</small></div>}
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

export default IntakeProfesionalPage;


