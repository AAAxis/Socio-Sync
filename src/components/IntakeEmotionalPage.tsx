import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { emotionalQuestions, getVisibleQuestions, handleAnswerChange, EmotionalAnswerMap } from './EmotionalIntakeLogic';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export function IntakeEmotionalPage() {
  const { caseId, lang } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<EmotionalAnswerMap>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!caseId) return;
      try {
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
      console.error('Save error');
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>{t('intake.emotionalTitle')}</h2>
        <button
          onClick={() => {
            const targetUrl = lang ? `/${lang}/patient/${caseId}` : `/patient/${caseId}`;
            navigate(targetUrl + '#intake');
          }}
          style={{ background: '#6c757d', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer' }}
        >
          ← {t('intake.back')}
        </button>
      </div>
      <div style={{ color: '#6c757d', marginBottom: 12 }}>{t('intake.case')}: {caseId}</div>

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


