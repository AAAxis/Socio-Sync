import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type FieldType = 'text' | 'number' | 'select';

export interface RightsFieldDefinition {
  field_name: string;
  label: string;
  type: FieldType;
  description?: string;
  options?: string[];
  rule?: string;
}

export const RIGHTS_FIELDS: RightsFieldDefinition[] = [
  { field_name: 'id_number', label: 'מספר מזהה', type: 'text' },
  { field_name: 'household_status', label: 'מצב משפחתי', type: 'select', options: ['רווק/ה', 'נשוי/אה', 'גרוש/ה', 'אלמן/ה', 'הורה יחיד/ה'] },
  { field_name: 'children_count', label: 'מספר ילדים', type: 'number' },
  { field_name: 'children_ages', label: 'גילאי הילדים (פירוט)', type: 'text' },
  { field_name: 'employment_status_now', label: 'מצב תעסוקתי נוכחי', type: 'select', options: ['מחוסר עבודה', 'מחפש/ת עבודה', 'בהכשרה', 'משרה חלקית', 'משרה מלאה', 'עצמאי/ת'] },
  { field_name: 'monthly_income_gross', label: 'הכנסה חודשית (ברוטו)', type: 'number' },
  { field_name: 'spouse_income', label: 'הכנסה חודשית של בן/בת זוג (ברוטו)', type: 'number' },
  { field_name: 'unemployment_status', label: 'רישום לאבטלה / זכאות', type: 'select', options: ['כן', 'לא', 'בתהליך'] },
  { field_name: 'employment_injury', label: 'פגיעה בעבודה / תאונה מוכרת', type: 'select', options: ['כן', 'לא'] },
  { field_name: 'housing_status', label: 'מצב דיור', type: 'select', options: ['שוכר/ת', 'בעל/ת דירה', 'ללא דיור קבוע', 'דיור ציבורי'] },
  { field_name: 'rent_amount', label: 'גובה שכר דירה חודשי', type: 'number' },
  { field_name: 'health_condition', label: 'מצב בריאותי', type: 'select', options: ['בריא/ה', 'מחלה כרונית', 'נכות', 'אבחנה נפשית', 'נכות מוכרת'] },
  { field_name: 'mental_health_support', label: 'קבלת תמיכה נפשית', type: 'select', options: ['כן', 'לא', 'בתהליך'] },
  { field_name: 'education_level', label: 'השכלה פורמלית', type: 'select', options: ['ללא', '12 שנות לימוד', 'תעודה מקצועית', 'תואר ראשון', 'תואר שני ומעלה'] },
  { field_name: 'training_interest', label: 'מעוניין/ת בהכשרה מקצועית', type: 'select', options: ['כן', 'לא', 'לא בטוח/ה'] },
  { field_name: 'debt_status', label: 'חובות פעילים / תיקים בהוצל"פ', type: 'select', options: ['כן', 'לא', 'לא בטוח/ה'] },
  { field_name: 'transport_access', label: 'נגישות תחבורתית', type: 'select', options: ['רכב פרטי', 'תחבורה ציבורית', 'אין'] }
];

export type RightsIntakeData = {
  [K in (typeof RIGHTS_FIELDS)[number]['field_name']]?: string | number;
};

export interface Recommendation {
  id: string;
  title: string;
  reason: string;
}

function parseChildAges(input: string | number | undefined): number[] {
  if (typeof input !== 'string') return [];
  const matches = input.match(/\d+/g);
  if (!matches) return [];
  return matches.map((n) => Number(n)).filter((n) => !Number.isNaN(n));
}

export function evaluateRightsRecommendations(values: RightsIntakeData): Recommendation[] {
  const recs: Recommendation[] = [];

  // Single Parent → Income tax credit points
  if (values.household_status === 'Single Parent') {
    recs.push({ id: 'tax_credit_single_parent', title: 'Income tax credit points', reason: 'Household status is Single Parent' });
  }

  // Any child < 3 → Daycare/childcare subsidy
  const ages = parseChildAges(values.children_ages);
  if (ages.some((a) => a < 3)) {
    recs.push({ id: 'childcare_subsidy', title: 'Daycare/childcare subsidy', reason: 'At least one child is under age 3' });
  }

  // If unemployed → Check unemployment benefits
  if (values.employment_status_now === 'Unemployed') {
    recs.push({ id: 'unemployment_benefits', title: 'Check unemployment benefits', reason: 'Current status is Unemployed' });
  }

  // If <5000 → Check income support eligibility
  const income = typeof values.monthly_income_gross === 'number' ? values.monthly_income_gross : Number(values.monthly_income_gross);
  if (!Number.isNaN(income) && income > 0 && income < 5000) {
    recs.push({ id: 'income_support', title: 'Check income support eligibility', reason: 'Monthly gross income is below 5000' });
  }

  // If No unemployment registration → Refer to Employment Service registration
  if (values.unemployment_status === 'No') {
    recs.push({ id: 'employment_service', title: 'Refer to Employment Service registration', reason: 'Not registered for unemployment/benefits' });
  }

  // If Yes work injury → Work injury compensation check
  if (values.employment_injury === 'Yes') {
    recs.push({ id: 'work_injury_comp', title: 'Work injury compensation check', reason: 'Work injury/recognized accident indicated' });
  }

  // If Renting → Check rent assistance eligibility
  if (values.housing_status === 'Renting') {
    recs.push({ id: 'rent_assistance', title: 'Check rent assistance eligibility', reason: 'Housing status is Renting' });
  }

  // If Disability/Recognized Disability → Check disability allowances
  if (values.health_condition === 'Disability' || values.health_condition === 'Recognized Disability') {
    recs.push({ id: 'disability_allowances', title: 'Check disability allowances', reason: 'Health condition indicates disability' });
  }

  // If No mental health support → Refer for mental health support
  if (values.mental_health_support === 'No') {
    recs.push({ id: 'mental_health_referral', title: 'Refer for mental health support', reason: 'Not receiving mental health support' });
  }

  // If Yes training interest → Refer to suitable training programs
  if (values.training_interest === 'Yes') {
    recs.push({ id: 'training_programs', title: 'Refer to suitable training programs', reason: 'Expressed interest in professional training' });
  }

  // If Yes debts → Refer to debt counseling services
  if (values.debt_status === 'Yes') {
    recs.push({ id: 'debt_counseling', title: 'Refer to debt counseling services', reason: 'Active debts/enforcement cases' });
  }

  // If None transport → Check for transport assistance / nearby jobs
  if (values.transport_access === 'None') {
    recs.push({ id: 'transport_assistance', title: 'Check for transport assistance / nearby jobs', reason: 'No transport access' });
  }

  return recs;
}

export interface RightsIntakeFormProps {
  initialValues?: Partial<RightsIntakeData>;
  onSubmit?: (payload: { values: RightsIntakeData; recommendations: Recommendation[] }) => void;
}

export function RightsIntakeForm({ initialValues = {}, onSubmit }: RightsIntakeFormProps) {
  const [values, setValues] = useState<RightsIntakeData>(() => ({ ...initialValues }));
  const { t } = useTranslation();



  const handleChange = (name: string, value: string) => {
    const def = RIGHTS_FIELDS.find((f) => f.field_name === name);
    if (def?.type === 'number') {
      const parsed = value === '' ? '' : Number(value);
      setValues((prev) => ({ ...prev, [name]: parsed as any }));
    } else {
      setValues((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { values, recommendations: [] };
    if (onSubmit) onSubmit(payload);
    // Default no-op submit handling if no callback supplied
    // Consumers can attach their own persistence or navigation logic
  };

  const fieldStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    marginBottom: 12
  };
  const inputStyle: React.CSSProperties = {
    padding: '10px 12px',
    border: '1px solid #ced4da',
    borderRadius: 6
  };

  return (
    <form onSubmit={handleSubmit}>
      {RIGHTS_FIELDS.map((field) => {
        const value = values[field.field_name] ?? '';
        return (
          <div key={field.field_name} style={fieldStyle}>
            <label htmlFor={field.field_name} style={{ fontWeight: 500 }}>
              {field.label}
            </label>
            {field.type === 'select' ? (
              <select
                id={field.field_name}
                value={String(value)}
                onChange={(e) => handleChange(field.field_name, e.target.value)}
                style={inputStyle}
              >
                <option value="">--</option>
                {(field.options || []).map((opt) => (
                  <option key={opt} value={opt}>{String(opt)}</option>
                ))}
              </select>
            ) : (
              <input
                id={field.field_name}
                type={field.type === 'number' ? 'number' : 'text'}
                value={String(value)}
                onChange={(e) => handleChange(field.field_name, e.target.value)}
                inputMode={field.type === 'number' ? 'numeric' : undefined}
                style={inputStyle}
              />
            )}
            {field.description && (t as any).i18n?.language !== 'he' && <small>{field.description}</small>}
            {field.rule && (t as any).i18n?.language !== 'he' && <small>{field.rule}</small>}
          </div>
        );
      })}


      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="submit" style={{ background: '#007acc', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 6, cursor: 'pointer' }}>
          {t('intake.save')}
        </button>
      </div>
    </form>
  );
}

export default RightsIntakeForm;


