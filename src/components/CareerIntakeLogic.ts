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
  label_key?: string; // i18n key, e.g. intakeProfessional.questions.<field_name>
}

export type CareerAnswers = { [field_name: string]: any };

// 1) Questions dataset
const CAREER_QUESTIONS_BASE: CareerQuestion[] = [
  { group: 'meta', field_name: 'employment_goal', field_label: 'מטרת תעסוקה עיקרית', field_type: 'select', options: ['עבודה ראשונה', 'הסבת קריירה', 'אחרי לידה', 'חזרה לעבודה', 'תמיכה אחרי פגיעה', 'הכשרה מקצועית מותאמת', 'שימור תעסוקה', 'ניהול שגרה תחת מגבלות'], description: '', related_model: 'goals', rule_output: '' },
  { group: 'meta', field_name: 'secondary_goals', field_label: 'מטרות משניות (בחירה מרובה)', field_type: 'multiselect', options: ['הבהרת כיוון', 'הגדלת היקף משרה', 'שדרוג שכר', 'שינוי סביבת עבודה', 'גמישות תעסוקתית', 'ארגון משפחה/עבודה'], description: '', related_model: 'goals', rule_output: '' },
  { group: 'meta', field_name: 'time_horizon', field_label: 'אופק זמן מועדף', field_type: 'select', options: ['חודשיים', '3–6 חודשים', '6–12 חודשים', 'מעל שנה'], description: '', related_model: 'planning', rule_output: '' },

  { group: 'via', field_name: 'strengths_top5', field_label: 'חוזקות אישיות מובילות (עד 5)', field_type: 'multiselect', options: ['חמלה','יצירתיות','סקרנות','למידה','התמדה','תושייה','הומור','תקווה','אהבה','יושרה','פרספקטיבה','הכרת הטוב','אומץ','משמעת עצמית','צדק','מנהיגות','נדיבות','ענווה'], description: '', related_model: 'models_via', rule_output: '' },
  { group: 'via', field_name: 'strengths_contexts', field_label: 'הקשרים בהם החוזקות מיושמות', field_type: 'textarea', description: '', related_model: 'models_via', rule_output: '' },

  { group: 'values', field_name: 'core_values', field_label: 'ערכים חשובים היום (עד 5)', field_type: 'multiselect', options: ['משמעות','חופש','איזון','למידה','ביטחון','ביטוי עצמי','שייכות','יציבות','השפעה','יצירתיות','שקט','צמיחה','משפחה','קהילה'], description: '', related_model: 'models_act', rule_output: '' },
  { group: 'values', field_name: 'non_negotiables', field_label: 'דברים שאי אפשר להתפשר עליהם בעבודה', field_type: 'textarea', description: '', related_model: 'models_act', rule_output: '' },

  { group: 'schein', field_name: 'career_anchors', field_label: 'עוגני קריירה (עד 3)', field_type: 'multiselect', options: ['מומחיות','ניהול','אוטונומיה','ביטחון/יציבות','יזמות','משימה/שירות','אתגר','איזון עבודה-חיים'], description: '', related_model: 'models_schein', rule_output: '' },
  { group: 'schein', field_name: 'anchor_examples', field_label: 'דוגמאות לעוגנים', field_type: 'textarea', description: '', related_model: 'models_schein', rule_output: '' },

  { group: 'holland', field_name: 'riasec_types', field_label: 'תחומי עניין מקצועיים (בחר את כל הרלוונטיים)', field_type: 'multiselect', options: ['מעשי (R)','חוקר (I)','אמנותי (A)','חברתי (S)','יוזם (E)','קונבנציונלי (C)'], description: '', related_model: 'models_holland', rule_output: '' },
  { group: 'holland', field_name: 'riasec_examples', field_label: 'דוגמאות לסביבות/משימות עבודה', field_type: 'textarea', description: '', related_model: 'models_holland', rule_output: '' },

  { group: 'energy', field_name: 'energizers', field_label: 'מה נותן לך אנרגיה ביום-יום?', field_type: 'textarea', description: '', related_model: 'integration', rule_output: '' },
  { group: 'energy', field_name: 'drainers', field_label: 'מה מרוקן לך את האנרגיה?', field_type: 'textarea', description: '', related_model: 'integration', rule_output: '' },

  { group: 'prefs', field_name: 'work_style', field_label: 'סגנון עבודה מועדף', field_type: 'multiselect', options: ['עצמאי/ת','עבודת צוות','היברידי','עם אנשים','עם נתונים','עבודה מעשית','אופן ספייס','משרד שקט'], description: '', related_model: 'preferences', rule_output: '' },
  { group: 'prefs', field_name: 'schedule', field_label: 'שעות זמינות/היקף תעסוקה', field_type: 'multiselect', options: ['בוקר','צוהריים','ערב','משמרות','משרה חלקית','משרה מלאה','גמיש'], description: '', related_model: 'preferences', rule_output: '' },
  { group: 'prefs', field_name: 'location_range', field_label: 'טווח גיאוגרפי ותחבורה', field_type: 'text', description: '', related_model: 'preferences', rule_output: '' },
  { group: 'prefs', field_name: 'salary_expectation', field_label: 'ציפיות שכר (חודשי/שעתי)', field_type: 'text', description: '', related_model: 'preferences', rule_output: '' },
  { group: 'prefs', field_name: 'accommodations', field_label: 'התאמות נדרשות (פיזיות/נפשיות)', field_type: 'textarea', description: '', related_model: 'preferences', rule_output: '' },

  { group: 'tracks', field_name: 'situation_track', field_label: 'בחר מסלול/ים רלוונטיים', field_type: 'multiselect', options: ['עבודה ראשונה','הסבת קריירה','אחרי לידה','חזרה לעבודה','אחרי פגיעה','הכשרה מקצועית','שימור תעסוקה','שגרת עבודה תחת מגבלות'], description: '', related_model: 'goals', rule_output: '' },
  { group: 'tracks', field_name: 'field_interest', field_label: 'תחומי עניין/תעשיות', field_type: 'multiselect', options: ['חינוך/הכשרה','טיפול ורווחה','מינהל/שירות לקוחות','כספים/חשבונאות','שיווק/תוכן','עיצוב/מדיה','טכנולוגיה','לוגיסטיקה/תפעול','בריאות','מקצועות יד'], description: '', related_model: 'matching', rule_output: '' },
  { group: 'tracks', field_name: 'training_needs', field_label: 'ידע או הכשרה חסרים', field_type: 'textarea', description: '', related_model: 'training', rule_output: '' },

  { group: 'barriers', field_name: 'confidence_level', field_label: 'ביטחון עצמי תעסוקתי (0-10)', field_type: 'scale', options: ['0','1','2','3','4','5','6','7','8','9','10'], description: '', related_model: 'emotional', rule_output: '' },
  { group: 'barriers', field_name: 'avoidance_patterns', field_label: 'ממה אתה נמנע בחיפוש עבודה?', field_type: 'textarea', description: '', related_model: 'emotional', rule_output: '' },
  { group: 'barriers', field_name: 'fear_statements', field_label: 'חששות או מחשבות מעכבות', field_type: 'textarea', description: '', related_model: 'emotional', rule_output: '' },

  { group: 'action', field_name: 'weekly_capacity_hours', field_label: 'כמה שעות בשבוע אתה זמין לעבודה?', field_type: 'number', description: '', related_model: 'planning', rule_output: '' },
  { group: 'action', field_name: 'network_assets', field_label: 'קשרים מקצועיים וחברתיים', field_type: 'textarea', description: '', related_model: 'action', rule_output: '' },
  { group: 'action', field_name: 'next_2_weeks_actions', field_label: 'פעולות קונקרטיות לשבועיים הקרובים', field_type: 'textarea', description: '', related_model: 'action', rule_output: '' },

  { group: 'rights', field_name: 'current_status', field_label: 'מצב תעסוקתי נוכחי', field_type: 'select', options: ['מחוסר עבודה','מחפש/ת עבודה','בהכשרה','משרה חלקית','משרה מלאה','עצמאי/ת'], description: '', related_model: 'rights_link', rule_output: '' },
  { group: 'rights', field_name: 'income_level', field_label: 'רמת הכנסה נוכחית (חודשי)', field_type: 'number', description: '', related_model: 'rights_link', rule_output: '' }
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

// Add default i18n keys for each question
export const careerQuestions: CareerQuestion[] = CAREER_QUESTIONS_BASE.map(q => ({
  ...q,
  label_key: q.label_key || `intakeProfessional.questions.${q.field_name}`
}));

export default {
  careerQuestions,
  shouldShowQuestion,
  getVisibleQuestions,
  handleAnswerChange
};


