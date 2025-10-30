export type CareerFieldType = 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'scale';

export interface CareerQuestion {
  group: string;
  field_name: string;
  field_label: string;
  field_type: CareerFieldType;
  options?: string[];
  description?: string;
  related_model?: string;
  // Optional free-text conditional, e.g., "If unemployed → ...", "If <5000 → ..."
  rule_output?: string;
}

export type CareerAnswers = { [field_name: string]: any };

// 1) Questions dataset
export const careerQuestions: CareerQuestion[] = [
  { group: 'meta', field_name: 'employment_goal', field_label: 'Main Employment Goal', field_type: 'select', options: ['First Job', 'Career Change', 'Post-Maternity', 'Return to Work (Re-Onboarding)', 'Work Support after Injury', 'Tailored Professional Training', 'Employee Retention', 'Routine Management under Limitations'], description: 'Select main guidance path', related_model: 'goals', rule_output: '' },
  { group: 'meta', field_name: 'secondary_goals', field_label: 'Secondary Goals (multi-select)', field_type: 'multiselect', options: ['Clarify Direction', 'Increase Work Hours', 'Salary Upgrade', 'Change Work Environment', 'Flexible Employment', 'Family/Work Organization'], description: 'Supporting goals for planning', related_model: 'goals', rule_output: '' },
  { group: 'meta', field_name: 'time_horizon', field_label: 'Preferred Time Horizon', field_type: 'select', options: ['2 months', '3–6 months', '6–12 months', 'Over a year'], description: 'Planning horizon', related_model: 'planning', rule_output: '' },

  { group: 'via', field_name: 'strengths_top5', field_label: 'Top VIA Strengths (choose up to 5)', field_type: 'multiselect', options: ['Compassion','Creativity','Curiosity','Learning','Perseverance','Resourcefulness','Humor','Hope','Love','Integrity','Perspective','Gratitude','Courage','Self-Discipline','Justice','Leadership','Generosity','Humility'], description: 'Identify core resources', related_model: 'models_via', rule_output: '' },
  { group: 'via', field_name: 'strengths_contexts', field_label: 'Contexts Where Strengths Are Applied', field_type: 'textarea', description: 'Examples from life/work/parenting', related_model: 'models_via', rule_output: '' },

  { group: 'values', field_name: 'core_values', field_label: 'Important Values Today (choose up to 5)', field_type: 'multiselect', options: ['Meaning','Freedom','Balance','Learning','Security','Self-expression','Belonging','Stability','Influence','Creativity','Calm','Growth','Family','Community'], description: 'Define current value compass', related_model: 'models_act', rule_output: '' },
  { group: 'values', field_name: 'non_negotiables', field_label: 'Non-Negotiables at Work', field_type: 'textarea', description: 'Essential conditions; used for tagging/filtering', related_model: 'models_act', rule_output: '' },

  { group: 'schein', field_name: 'career_anchors', field_label: 'Career Anchors (choose up to 3)', field_type: 'multiselect', options: ['Expertise','Management','Autonomy','Security/Stability','Entrepreneurship','Mission/Service','Challenge','Work-Life Balance'], description: 'Deep motivators necessary for satisfaction', related_model: 'models_schein', rule_output: '' },
  { group: 'schein', field_name: 'anchor_examples', field_label: 'Anchor Examples', field_type: 'textarea', description: 'Short story from past/present', related_model: 'models_schein', rule_output: '' },

  { group: 'holland', field_name: 'riasec_types', field_label: 'RIASEC Types (select all that apply)', field_type: 'multiselect', options: ['Realistic (R)','Investigative (I)','Artistic (A)','Social (S)','Enterprising (E)','Conventional (C)'], description: 'Preferred work environment style', related_model: 'models_holland', rule_output: '' },
  { group: 'holland', field_name: 'riasec_examples', field_label: 'RIASEC Example Environments/Tasks', field_type: 'textarea', description: 'Cross-check with past experiences/desires', related_model: 'models_holland', rule_output: '' },

  { group: 'energy', field_name: 'energizers', field_label: 'What Energizes You Daily?', field_type: 'textarea', description: 'Clues for occupational fit', related_model: 'integration', rule_output: '' },
  { group: 'energy', field_name: 'drainers', field_label: 'What Drains Your Energy?', field_type: 'textarea', description: 'Environmental or functional barriers', related_model: 'integration', rule_output: '' },

  { group: 'prefs', field_name: 'work_style', field_label: 'Preferred Work Style', field_type: 'multiselect', options: ['Independent','Team','Hybrid','With People','With Data','Hands-On','Open Space','Quiet Office'], description: 'Role/environment planning', related_model: 'preferences', rule_output: '' },
  { group: 'prefs', field_name: 'schedule', field_label: 'Available Hours/Employment Scope', field_type: 'multiselect', options: ['Morning','Afternoon','Evening','Shifts','Part-Time','Full-Time','Flexible'], description: 'Constraints and expectations alignment', related_model: 'preferences', rule_output: '' },
  { group: 'prefs', field_name: 'location_range', field_label: 'Geographical Range & Transport', field_type: 'text', description: 'City/region; car/public transport', related_model: 'preferences', rule_output: '' },
  { group: 'prefs', field_name: 'salary_expectation', field_label: 'Salary Expectations (monthly/hourly)', field_type: 'text', description: 'Negotiation and placement key', related_model: 'preferences', rule_output: '' },
  { group: 'prefs', field_name: 'accommodations', field_label: 'Required Accommodations (physical/mental)', field_type: 'textarea', description: 'Plan work routine under limitations', related_model: 'preferences', rule_output: '' },

  { group: 'tracks', field_name: 'situation_track', field_label: 'Select Relevant Track(s)', field_type: 'multiselect', options: ['First Job','Career Change','Post-Maternity','Return to Work (Re-Onboarding)','After Injury','Professional Training','Employee Retention','Work Routine under Limitations'], description: 'Career process tracks', related_model: 'goals', rule_output: '' },
  { group: 'tracks', field_name: 'field_interest', field_label: 'Areas of Interest/Industries', field_type: 'multiselect', options: ['Education/Training','Therapy & Welfare','Administration/Customer Service','Finance/Accounting','Marketing/Content','Design/Media','Technology','Logistics/Operations','Health','Manual Trades'], description: 'Base for opportunity search/training', related_model: 'matching', rule_output: '' },
  { group: 'tracks', field_name: 'training_needs', field_label: 'Missing Knowledge or Training', field_type: 'textarea', description: 'Identify skill gaps for training', related_model: 'training', rule_output: '' },

  { group: 'barriers', field_name: 'confidence_level', field_label: 'Occupational Self-Confidence (0–10)', field_type: 'scale', options: ['0','1','2','3','4','5','6','7','8','9','10'], description: 'Opening metric for tracking', related_model: 'emotional', rule_output: 'If <4 → Goal: Strengthen confidence' },
  { group: 'barriers', field_name: 'avoidance_patterns', field_label: 'What Do You Avoid in Job Search?', field_type: 'textarea', description: 'Avoidance patterns for graded exposure', related_model: 'emotional', rule_output: '' },
  { group: 'barriers', field_name: 'fear_statements', field_label: "Complete: 'I am afraid that ___ therefore I ___'", field_type: 'textarea', description: 'ACT language – diffusion and steps', related_model: 'emotional', rule_output: '' },

  { group: 'action', field_name: 'weekly_capacity_hours', field_label: 'Net Weekly Availability (hours)', field_type: 'number', description: 'Coordinate workload between parenting/therapy/work', related_model: 'planning', rule_output: '' },
  { group: 'action', field_name: 'network_assets', field_label: 'Who Can You Contact This Week (3 people)?', field_type: 'textarea', description: 'Activate weak/strong network connections', related_model: 'action', rule_output: '' },
  { group: 'action', field_name: 'next_2_weeks_actions', field_label: 'Which Two Actions Will You Take in the Next 2 Weeks?', field_type: 'textarea', description: 'Turn insights into SMART goals', related_model: 'action', rule_output: '' },

  { group: 'rights', field_name: 'current_status', field_label: 'Current Employment Status', field_type: 'select', options: ['Unemployed','Job Seeking','In Training','Part-Time','Full-Time','Self-Employed'], description: 'Basic action plan translation', related_model: 'rights_link', rule_output: 'If unemployed → Check unemployment benefits' },
  { group: 'rights', field_name: 'income_level', field_label: 'Monthly Income Level (Gross)', field_type: 'number', description: 'Key for occupational/economic rights', related_model: 'rights_link', rule_output: 'If <5000 → Check income support eligibility' }
];

// Helper: parse simple conditions embedded in rule_output (visibility oriented)
// Supports patterns like:
// - "If unemployed" (evaluates against answers.current_status)
// - "If <5000" (evaluates against the same numeric field or income_level when attached)
// - Defaults to always true for empty/unsupported cases
function evaluateRuleStringForVisibility(q: CareerQuestion, answers: CareerAnswers): boolean {
  const rule = (q.rule_output || '').trim();
  if (!rule) return true; // no rule → show
  const lower = rule.toLowerCase();

  // If rule references a direct value like "If unemployed" and question is not that field,
  // attempt to use a well-known dependency mapping.
  const deps: { [k: string]: string } = {
    unemployed: 'current_status'
  };

  if (lower.startsWith('if ')) {
    const cond = lower.slice(3).split('→')[0].trim();

    // Numeric comparators (e.g., "<4", "<5000") evaluated against this field value if numeric
    const numMatch = cond.match(/^([<>]=?|==)\s*(\d+(?:\.\d+)?)$/);
    if (numMatch) {
      const [, op, rhsStr] = numMatch;
      const rhs = Number(rhsStr);
      const val = Number(answers[q.field_name]);
      if (Number.isNaN(val)) return true; // cannot evaluate → do not hide
      if (op === '<') return val < rhs;
      if (op === '<=') return val <= rhs;
      if (op === '>') return val > rhs;
      if (op === '>=') return val >= rhs;
      if (op === '==') return val === rhs;
      return true;
    }

    // Word equality like "unemployed" – check mapped dependency or self
    const token = cond.replace(/[^a-z\-\s]/g, '').trim();
    const depField = deps[token] || q.field_name;
    const answer = (answers[depField] ?? '').toString().toLowerCase();
    return answer.includes(token);
  }

  return true; // unsupported patterns → do not hide by default
}

// 2) shouldShowQuestion(question, answers)
export function shouldShowQuestion(question: CareerQuestion, answers: CareerAnswers): boolean {
  return evaluateRuleStringForVisibility(question, answers);
}

// 3) getVisibleQuestions(answers)
export function getVisibleQuestions(answers: CareerAnswers): CareerQuestion[] {
  return careerQuestions.filter(q => shouldShowQuestion(q, answers));
}

// 4) handleAnswerChange(field_name, value)
export function handleAnswerChange(
  currentAnswers: CareerAnswers,
  field_name: string,
  value: any
): { answers: CareerAnswers; visibleQuestions: CareerQuestion[] } {
  const updated: CareerAnswers = { ...currentAnswers, [field_name]: value };
  const visibleQuestions = getVisibleQuestions(updated);
  return { answers: updated, visibleQuestions };
}

export default {
  careerQuestions,
  shouldShowQuestion,
  getVisibleQuestions,
  handleAnswerChange
};


