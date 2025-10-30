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
  { field_name: 'id_number', label: 'ID Number', type: 'text', description: 'For cross-checking eligibility (optional)' },
  { field_name: 'household_status', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed', 'Single Parent'], rule: 'If Single Parent → Income tax credit points' },
  { field_name: 'children_count', label: 'Number of Children', type: 'number' },
  { field_name: 'children_ages', label: 'Children’s Ages (details)', type: 'text', rule: 'If any child <3 → Daycare/childcare subsidy' },
  { field_name: 'employment_status_now', label: 'Current Employment Status', type: 'select', options: ['Unemployed', 'Job Seeking', 'In Training', 'Part-Time', 'Full-Time', 'Self-Employed'], rule: 'If unemployed → Check unemployment benefits' },
  { field_name: 'monthly_income_gross', label: 'Monthly Income (Gross)', type: 'number', rule: 'If <5000 → Check income support eligibility' },
  { field_name: 'spouse_income', label: 'Spouse Monthly Income (Gross)', type: 'number' },
  { field_name: 'unemployment_status', label: 'Registered for Unemployment / Benefits', type: 'select', options: ['Yes', 'No', 'In Process'], rule: 'If No → Refer to Employment Service registration' },
  { field_name: 'employment_injury', label: 'Work Injury / Recognized Accident', type: 'select', options: ['Yes', 'No'], rule: 'If Yes → Work injury compensation check' },
  { field_name: 'housing_status', label: 'Housing Situation', type: 'select', options: ['Renting', 'Homeowner', 'No Permanent Housing', 'Public Housing'], rule: 'If Renting → Check rent assistance eligibility' },
  { field_name: 'rent_amount', label: 'Monthly Rent Amount', type: 'number' },
  { field_name: 'health_condition', label: 'Health Condition', type: 'select', options: ['Healthy', 'Chronic Illness', 'Disability', 'Mental Diagnosis', 'Recognized Disability'], rule: 'If Disability → Check disability allowances' },
  { field_name: 'mental_health_support', label: 'Receiving Mental Health Support', type: 'select', options: ['Yes', 'No', 'In Process'], rule: 'If No → Refer for mental health support' },
  { field_name: 'education_level', label: 'Formal Education Level', type: 'select', options: ['None', '12 Years', 'Vocational Certificate', 'Bachelor’s', 'Master’s+'] },
  { field_name: 'training_interest', label: 'Interested in Professional Training', type: 'select', options: ['Yes', 'No', 'Not Sure'], rule: 'If Yes → Refer to suitable training programs' },
  { field_name: 'debt_status', label: 'Active Debts / Enforcement Cases', type: 'select', options: ['Yes', 'No', 'Not Sure'], rule: 'If Yes → Refer to debt counseling services' },
  { field_name: 'transport_access', label: 'Transport Accessibility', type: 'select', options: ['Private Car', 'Public Transport', 'None'], rule: 'If None → Check for transport assistance / nearby jobs' }
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

  const recommendations = useMemo(() => evaluateRightsRecommendations(values), [values]);

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
    const payload = { values, recommendations };
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
            <label htmlFor={field.field_name} style={{ fontWeight: 500 }}>{field.label}</label>
            {field.type === 'select' ? (
              <select
                id={field.field_name}
                value={String(value)}
                onChange={(e) => handleChange(field.field_name, e.target.value)}
                style={inputStyle}
              >
                <option value="">--</option>
                {(field.options || []).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
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
            {field.description && <small>{field.description}</small>}
            {field.rule && <small>{field.rule}</small>}
          </div>
        );
      })}

      <div>
        <h4>Suggested Next Steps</h4>
        {recommendations.length === 0 ? (
          <div>No current suggestions</div>
        ) : (
          <ul>
            {recommendations.map((r) => (
              <li key={r.id}>
                <strong>{r.title}</strong>: {r.reason}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="submit" style={{ background: '#007acc', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 6, cursor: 'pointer' }}>
          {t('intake.save')}
        </button>
      </div>
    </form>
  );
}

export default RightsIntakeForm;


