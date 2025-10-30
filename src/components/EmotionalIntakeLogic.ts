export type InputType = 'text' | 'yes_no' | 'scale' | 'multidropdown';

export interface EmotionalQuestion {
  intake_type: 'emotional';
  section: string;
  field_name: string; // unique key for answers map
  question_text: string;
  input_type: InputType;
  options?: string[];
  condition?: string; // e.g. "reason=Anxiety", "has_trauma=yes", "reason=*", "reason=Loneliness,Lack of support"
}

export type EmotionalAnswerMap = {
  // values may be string | string[] depending on input type
  [field_name: string]: any;
};

// 1) Questions dataset (augmented with field_name keys)
export const emotionalQuestions: EmotionalQuestion[] = [
  { intake_type: 'emotional', section: 'anxiety', field_name: 'anxiety_level', question_text: 'Rate your overall anxiety level (1–5)', input_type: 'scale', options: ['1', '2', '3', '4', '5'] },
  { intake_type: 'emotional', section: 'trauma', field_name: 'has_trauma', question_text: 'Have you experienced a traumatic event?', input_type: 'yes_no' },
  { intake_type: 'emotional', section: 'trauma', field_name: 'trauma_description', question_text: 'Describe the event', input_type: 'text', condition: 'has_trauma=yes' },
  { intake_type: 'emotional', section: 'coping', field_name: 'coping_methods', question_text: 'What coping methods help you?', input_type: 'multidropdown', options: ['Sport', 'Meditation', 'Sleep', 'Writing', 'Talking with friends/family', 'Therapy', 'Other'] },
  { intake_type: 'emotional', section: 'strengths', field_name: 'emotional_strengths', question_text: 'What are your emotional strengths?', input_type: 'multidropdown', options: ['Resilience', 'Empathy', 'Creativity', 'Optimism', 'Humor', 'Emotional Regulation'] },
  { intake_type: 'emotional', section: 'support', field_name: 'support_network', question_text: 'Who is part of your support network?', input_type: 'multidropdown', options: ['Family', 'Friends', 'Therapist', 'Community/Leader', 'Organization', 'Other'] },
  { intake_type: 'emotional', section: 'wellbeing', field_name: 'life_satisfaction', question_text: 'How satisfied are you with your life?', input_type: 'scale', options: ['1', '2', '3', '4', '5'] },
  { intake_type: 'emotional', section: 'emotional_goal', field_name: 'emotional_goal', question_text: 'What could help you progress emotionally?', input_type: 'multidropdown', options: ['Learn coping skills', 'Improve relationships', 'Talk about the issue', 'Understand the root cause', 'Improve work life', 'Improve benefit access'] },
  { intake_type: 'emotional', section: 'reason', field_name: 'reason', question_text: 'What is the reason you seek emotional support?', input_type: 'multidropdown', options: ['Anxiety', 'Depression', 'Emotional regulation difficulty', 'Crisis', 'Trauma', 'Low self-esteem', 'Self-criticism', 'Loneliness', 'Lack of support', 'Relationship issues', 'Fatigue', 'Burnout', 'Low self-awareness', 'Other'] },
  { intake_type: 'emotional', section: 'definition', field_name: 'problem_definition', question_text: 'How would you define your problem?', input_type: 'text' },
  { intake_type: 'emotional', section: 'general', field_name: 'success_definition', question_text: 'How will you know the problem is solved?', input_type: 'text' },
  { intake_type: 'emotional', section: 'when', field_name: 'problem_start_when', question_text: 'When did the problem start?', input_type: 'text' },
  { intake_type: 'emotional', section: 'where', field_name: 'problem_frequency', question_text: 'When does it appear?', input_type: 'scale', options: ['Always', 'Most of the day', 'Part of the day', 'Rarely', 'Never'] },
  { intake_type: 'emotional', section: 'situations', field_name: 'problem_situations', question_text: 'In what situations do you feel the problem?', input_type: 'text' },
  { intake_type: 'emotional', section: 'reaction', field_name: 'problem_reaction', question_text: 'What do you do when the problem arises?', input_type: 'text' },
  { intake_type: 'emotional', section: 'past', field_name: 'felt_better_when', question_text: 'Have you ever felt better, and when was that?', input_type: 'text' },
  { intake_type: 'emotional', section: 'contact', field_name: 'contact_persons', question_text: 'Who can you turn to for support?', input_type: 'multidropdown', options: ['Family', 'Friends', 'Therapists', 'Community', 'Faith', 'Other'] },
  { intake_type: 'emotional', section: 'birth', field_name: 'birth_pregnancy_experiences', question_text: 'Birth and pregnancy experiences', input_type: 'yes_no', options: ['Yes', 'No'] },
  { intake_type: 'emotional', section: 'childhood_satisfaction', field_name: 'childhood_satisfaction', question_text: 'Satisfaction with childhood', input_type: 'scale', options: ['1 – Not satisfied', '2 – Slightly satisfied', '3 – Moderately satisfied'] },
  { intake_type: 'emotional', section: 'depression', field_name: 'depression_screen', question_text: 'Have you recently felt little interest or pleasure in daily activities?', input_type: 'yes_no' },
  { intake_type: 'emotional', section: 'anxiety_context', field_name: 'anxiety_context', question_text: 'When do you feel anxiety most strongly?', input_type: 'multidropdown', options: ['At home', 'At work', 'In social situations', 'While driving', 'Other'], condition: 'reason=Anxiety' },
  { intake_type: 'emotional', section: 'anxiety_coping', field_name: 'anxiety_coping', question_text: 'How do you currently cope with anxiety?', input_type: 'multidropdown', options: ['Medication', 'Breathing/relaxation', 'Talking', 'Avoidance', 'Therapy', 'Other'], condition: 'reason=Anxiety' },
  { intake_type: 'emotional', section: 'depression_days', field_name: 'depression_days', question_text: 'How many days per week do you experience low energy or disinterest?', input_type: 'scale', options: ['0', '1–2', '3–4', '5–7'], condition: 'reason=Depression' },
  { intake_type: 'emotional', section: 'depression_difficulty', field_name: 'depression_difficulty', question_text: 'What makes it hardest to get up or take initiative?', input_type: 'text', condition: 'reason=Depression' },
  { intake_type: 'emotional', section: 'trauma_effect', field_name: 'trauma_effect', question_text: 'Does the traumatic event still affect your daily life?', input_type: 'yes_no', condition: 'reason=Trauma' },
  { intake_type: 'emotional', section: 'trauma_trigger', field_name: 'trauma_trigger', question_text: 'What situations trigger flashbacks or distress?', input_type: 'text', condition: 'reason=Trauma' },
  { intake_type: 'emotional', section: 'regulation_context', field_name: 'regulation_context', question_text: 'When do you experience the greatest difficulty?', input_type: 'multidropdown', options: ['Work', 'Parenting', 'Relationship', 'Alone', 'Other'], condition: 'reason=Emotional regulation difficulty' },
  { intake_type: 'emotional', section: 'self_criticism', field_name: 'self_criticism_thoughts', question_text: 'What thoughts repeat in these situations?', input_type: 'text', condition: 'reason=Self-criticism,Low self-esteem' },
  { intake_type: 'emotional', section: 'loneliness_contact', field_name: 'loneliness_contact', question_text: 'Who is the closest person you can reach out to in difficulty?', input_type: 'text', condition: 'reason=Loneliness,Lack of support' },
  { intake_type: 'emotional', section: 'loneliness_support', field_name: 'loneliness_support_level', question_text: 'How much do you feel you have a sufficient support network?', input_type: 'scale', options: ['1', '2', '3', '4', '5'], condition: 'reason=Loneliness,Lack of support' },
  { intake_type: 'emotional', section: 'burnout_context', field_name: 'burnout_context', question_text: 'In which area do you feel the most burnout?', input_type: 'multidropdown', options: ['Work', 'Parenting', 'Caring for relative', 'Studies', 'Other'], condition: 'reason=Burnout,Fatigue' },
  { intake_type: 'emotional', section: 'burnout_recovery', field_name: 'burnout_recovery', question_text: 'What helps you recharge (if anything)?', input_type: 'multidropdown', options: ['Sleep', 'Vacation', 'Exercise', 'Talking with friends', 'Therapy', 'Other'], condition: 'reason=Burnout,Fatigue' },
  { intake_type: 'emotional', section: 'crisis_feeling', field_name: 'crisis_feeling', question_text: 'What is the main feeling around your crisis?', input_type: 'multidropdown', options: ['Confusion', 'Despair', 'Fear', 'Loss of control', 'Anger', 'Other'], condition: 'reason=Crisis,Lack of self-confidence' },
  { intake_type: 'emotional', section: 'help_needed', field_name: 'help_needed', question_text: 'What do you think would help you most at this stage?', input_type: 'multidropdown', options: ['Emotional support', 'Practical tools', 'Both'], condition: 'reason=*' }
];

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


