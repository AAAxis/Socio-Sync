export type InputType = 'text' | 'yes_no' | 'scale' | 'multidropdown';

export interface EmotionalQuestion {
  intake_type: 'emotional';
  section: string;
  field_name: string; // unique key for answers map
  question_text: string;
  input_type: InputType;
  options?: string[];
  condition?: string; // e.g. "reason=Anxiety", "has_trauma=yes", "reason=*", "reason=Loneliness,Lack of support"
  label_key?: string; // i18n key, e.g. intakeEmotional.questions.<field_name>
}

export type EmotionalAnswerMap = {
  // values may be string | string[] depending on input type
  [field_name: string]: any;
};

// 1) Questions dataset (augmented with field_name keys)
const EMOTIONAL_QUESTIONS_BASE: EmotionalQuestion[] = [
  { intake_type: 'emotional', section: 'anxiety', field_name: 'anxiety_level', question_text: 'דרג/י את רמת החרדה הכללית (1–5)', input_type: 'scale', options: ['1', '2', '3', '4', '5'] },
  { intake_type: 'emotional', section: 'trauma', field_name: 'has_trauma', question_text: 'האם חווית אירוע טראומטי?', input_type: 'yes_no' },
  { intake_type: 'emotional', section: 'trauma', field_name: 'trauma_description', question_text: 'תאר/י את האירוע', input_type: 'text', condition: 'has_trauma=כן' },
  { intake_type: 'emotional', section: 'coping', field_name: 'coping_methods', question_text: 'אילו שיטות התמודדות עוזרות לך?', input_type: 'multidropdown', options: ['ספורט', 'מדיטציה', 'שינה', 'כתיבה', 'שיחה עם חברים/משפחה', 'טיפול', 'אחר'] },
  { intake_type: 'emotional', section: 'strengths', field_name: 'emotional_strengths', question_text: 'מהן החוזקות הרגשיות שלך?', input_type: 'multidropdown', options: ['חוסן נפשי', 'אמפתיה', 'יצירתיות', 'אופטימיות', 'הומור', 'ויסות רגשי'] },
  { intake_type: 'emotional', section: 'support', field_name: 'support_network', question_text: 'מי נמצא ברשת התמיכה שלך?', input_type: 'multidropdown', options: ['משפחה', 'חברים', 'מטפל/ת', 'קהילה/מנהיג', 'ארגון', 'אחר'] },
  { intake_type: 'emotional', section: 'wellbeing', field_name: 'life_satisfaction', question_text: 'עד כמה את/ה מרוצה מהחיים?', input_type: 'scale', options: ['1', '2', '3', '4', '5'] },
  { intake_type: 'emotional', section: 'emotional_goal', field_name: 'emotional_goal', question_text: 'מה יכול לעזור לך להתקדם רגשית?', input_type: 'multidropdown', options: ['לימוד כישורי התמודדות', 'שיפור יחסים', 'שיחה על הנושא', 'הבנת הסיבה השורשית', 'שיפור חיי העבודה', 'שיפור גישה לזכויות'] },
  { intake_type: 'emotional', section: 'reason', field_name: 'reason', question_text: 'מה הסיבה לפנייה לתמיכה רגשית?', input_type: 'multidropdown', options: ['חרדה', 'דיכאון', 'קושי בוויסות רגשי', 'משבר', 'טראומה', 'דימוי עצמי נמוך', 'ביקורת עצמית', 'בדידות', 'חוסר תמיכה', 'קשיים בזוגיות/יחסים', 'עייפות', 'שחיקה', 'מודעות עצמית נמוכה', 'אחר'] },
  { intake_type: 'emotional', section: 'definition', field_name: 'problem_definition', question_text: 'איך היית מגדיר/ה את הבעיה?', input_type: 'text' },
  { intake_type: 'emotional', section: 'general', field_name: 'success_definition', question_text: 'איך תדעי/ה שהבעיה נפתרה?', input_type: 'text' },
  { intake_type: 'emotional', section: 'when', field_name: 'problem_start_when', question_text: 'מתי התחילה הבעיה?', input_type: 'text' },
  { intake_type: 'emotional', section: 'where', field_name: 'problem_frequency', question_text: 'מתי זה מופיע?', input_type: 'scale', options: ['תמיד', 'רוב היום', 'חלק מהיום', 'לעיתים רחוקות', 'אף פעם'] },
  { intake_type: 'emotional', section: 'situations', field_name: 'problem_situations', question_text: 'באילו מצבים את/ה מרגיש/ה את הבעיה?', input_type: 'text' },
  { intake_type: 'emotional', section: 'reaction', field_name: 'problem_reaction', question_text: 'מה את/ה עושה כשהבעיה עולה?', input_type: 'text' },
  { intake_type: 'emotional', section: 'past', field_name: 'felt_better_when', question_text: 'האם היה תקופה שהרגשת טוב יותר ומתי?', input_type: 'text' },
  { intake_type: 'emotional', section: 'contact', field_name: 'contact_persons', question_text: 'אל מי אפשר לפנות לעזרה?', input_type: 'multidropdown', options: ['משפחה', 'חברים', 'מטפלים', 'קהילה', 'אמונה', 'אחר'] },
  { intake_type: 'emotional', section: 'birth', field_name: 'birth_pregnancy_experiences', question_text: 'חוויות לידה והריון', input_type: 'yes_no', options: ['כן', 'לא'] },
  { intake_type: 'emotional', section: 'childhood_satisfaction', field_name: 'childhood_satisfaction', question_text: 'שביעות רצון מהילדות', input_type: 'scale', options: ['1 – לא מרוצה', '2 – מרוצה במעט', '3 – מרוצה במידה בינונית'] },
  { intake_type: 'emotional', section: 'depression', field_name: 'depression_screen', question_text: 'האם לאחרונה חשת חוסר עניין או הנאה מפעילויות יומיומיות?', input_type: 'yes_no' },
  { intake_type: 'emotional', section: 'anxiety_context', field_name: 'anxiety_context', question_text: 'מתי את/ה מרגיש/ה חרדה בעוצמה הגבוהה ביותר?', input_type: 'multidropdown', options: ['בבית', 'בעבודה', 'בסיטואציות חברתיות', 'בנהיגה', 'אחר'], condition: 'reason=חרדה' },
  { intake_type: 'emotional', section: 'anxiety_coping', field_name: 'anxiety_coping', question_text: 'איך את/ה מתמודד/ת כיום עם חרדה?', input_type: 'multidropdown', options: ['תרופות', 'נשימות/הרפיה', 'שיחה', 'הימנעות', 'טיפול', 'אחר'], condition: 'reason=חרדה' },
  { intake_type: 'emotional', section: 'depression_days', field_name: 'depression_days', question_text: 'כמה ימים בשבוע יש חוסר אנרגיה או חוסר עניין?', input_type: 'scale', options: ['0', '1–2', '3–4', '5–7'], condition: 'reason=דיכאון' },
  { intake_type: 'emotional', section: 'depression_difficulty', field_name: 'depression_difficulty', question_text: 'מה מקשה הכי הרבה להתחיל או לקום?', input_type: 'text', condition: 'reason=דיכאון' },
  { intake_type: 'emotional', section: 'trauma_effect', field_name: 'trauma_effect', question_text: 'האם האירוע הטראומטי עדיין משפיע על היום-יום?', input_type: 'yes_no', condition: 'reason=טראומה' },
  { intake_type: 'emotional', section: 'trauma_trigger', field_name: 'trauma_trigger', question_text: 'אילו מצבים מעוררים פלאשבקים או מצוקה?', input_type: 'text', condition: 'reason=טראומה' },
  { intake_type: 'emotional', section: 'regulation_context', field_name: 'regulation_context', question_text: 'מתי חווים את הקושי הגדול ביותר?', input_type: 'multidropdown', options: ['עבודה', 'הורות', 'זוגיות', 'לבד', 'אחר'], condition: 'reason=קושי בוויסות רגשי' },
  { intake_type: 'emotional', section: 'self_criticism', field_name: 'self_criticism_thoughts', question_text: 'אילו מחשבות חוזרות במצבים האלה?', input_type: 'text', condition: 'reason=ביקורת עצמית,דימוי עצמי נמוך' },
  { intake_type: 'emotional', section: 'loneliness_contact', field_name: 'loneliness_contact', question_text: 'מי האדם הקרוב ביותר שאפשר לפנות אליו בשעת קושי?', input_type: 'text', condition: 'reason=בדידות,חוסר תמיכה' },
  { intake_type: 'emotional', section: 'loneliness_support', field_name: 'loneliness_support_level', question_text: 'עד כמה את/ה מרגיש/ה שיש רשת תמיכה מספקת?', input_type: 'scale', options: ['1', '2', '3', '4', '5'], condition: 'reason=בדידות,חוסר תמיכה' },
  { intake_type: 'emotional', section: 'burnout_context', field_name: 'burnout_context', question_text: 'באיזה תחום את/ה חווה את השחיקה הגדולה ביותר?', input_type: 'multidropdown', options: ['עבודה', 'הורות', 'טיפול בקרוב משפחה', 'לימודים', 'אחר'], condition: 'reason=שחיקה,עייפות' },
  { intake_type: 'emotional', section: 'burnout_recovery', field_name: 'burnout_recovery', question_text: 'מה עוזר לך להיטען מחדש (אם בכלל)?', input_type: 'multidropdown', options: ['שינה', 'חופשה', 'פעילות גופנית', 'שיחה עם חברים', 'טיפול', 'אחר'], condition: 'reason=שחיקה,עייפות' },
  { intake_type: 'emotional', section: 'crisis_feeling', field_name: 'crisis_feeling', question_text: 'מהו הרגש המרכזי סביב המשבר?', input_type: 'multidropdown', options: ['בלבול', 'ייאוש', 'פחד', 'אובדן שליטה', 'כעס', 'אחר'], condition: 'reason=משבר,חוסר ביטחון עצמי' },
  { intake_type: 'emotional', section: 'help_needed', field_name: 'help_needed', question_text: 'מה לדעתך יעזור לך בשלב זה?', input_type: 'multidropdown', options: ['תמיכה רגשית', 'כלים מעשיים', 'גם וגם'], condition: 'reason=*' }
];

// Add default i18n keys for each question
export const emotionalQuestions: EmotionalQuestion[] = EMOTIONAL_QUESTIONS_BASE.map(q => ({
  ...q,
  label_key: q.label_key || `intakeEmotional.questions.${q.field_name}`
}));

// Helper: normalize value to array for comparison when needed
function toArray(value: any): string[] {
  if (Array.isArray(value)) return value as string[];
  if (value == null) return [];
  return [String(value)];
}

// 2) shouldShowQuestion(question, answers)
export function shouldShowQuestion(question: EmotionalQuestion, answers: EmotionalAnswerMap): boolean {
  const { condition } = question;
  if (!condition || condition.trim() === '') return true;

  // condition can be like:
  // - 'reason=*' (always true if any reason chosen; spec says always true)
  // - 'reason=Anxiety' or 'reason=Loneliness,Lack of support'
  // - 'has_trauma=yes'
  const [left, rightRaw] = condition.split('=');
  if (!left) return true;

  const field = left.trim();
  const right = (rightRaw || '').trim();

  // reason=* → always true
  if (field === 'reason' && right === '*') {
    return true;
  }

  const answer = answers[field];
  if (right.includes(',')) {
    // OR semantics across multiple values
    const allowed = right.split(',').map(s => s.trim());
    const answerValues = toArray(answer);
    return allowed.some(val => answerValues.includes(val));
  }

  // simple equality
  if (Array.isArray(answer)) {
    return (answer as string[]).includes(right);
  }
  return String(answer) === right;
}

// 3) getVisibleQuestions(answers)
export function getVisibleQuestions(answers: EmotionalAnswerMap): EmotionalQuestion[] {
  return emotionalQuestions.filter(q => shouldShowQuestion(q, answers));
}

// 4) handleAnswerChange(field_name, value)
export function handleAnswerChange(
  currentAnswers: EmotionalAnswerMap,
  field_name: string,
  value: any
): { answers: EmotionalAnswerMap; visibleQuestions: EmotionalQuestion[] } {
  const updated: EmotionalAnswerMap = { ...currentAnswers, [field_name]: value };
  const visibleQuestions = getVisibleQuestions(updated);
  return { answers: updated, visibleQuestions };
}

export default {
  emotionalQuestions,
  shouldShowQuestion,
  getVisibleQuestions,
  handleAnswerChange
};


