// Intake Form Completion Percentage Calculator
// Based on different user types and form sections

import { RIGHTS_FIELDS } from '../components/RightsIntakeForm';
import { careerQuestions } from '../components/CareerIntakeLogic';
import { emotionalQuestions } from '../components/EmotionalIntakeLogic';

export type UserType = 'social_worker' | 'career_counselor' | 'emotional_therapist' | 'general';

export interface IntakeSection {
  name: string;
  nameHe: string;
  fields: string[];
  required: boolean;
  userTypes: UserType[];
}

export interface CompletionResult {
  overall: number;
  sections: {
    [sectionName: string]: {
      completed: number;
      total: number;
      percentage: number;
      required: boolean;
    };
  };
  requiredSectionsComplete: boolean;
  totalFields: number;
  completedFields: number;
}

// Define intake sections based on the spreadsheet structure
export const INTAKE_SECTIONS: IntakeSection[] = [
  {
    name: 'personal_info',
    nameHe: 'מידע אישי',
    fields: ['firstName', 'lastName', 'dateOfBirth', 'governmentId', 'gender', 'maritalStatus', 'education'],
    required: true,
    userTypes: ['social_worker', 'career_counselor', 'emotional_therapist', 'general']
  },
  {
    name: 'contact_info', 
    nameHe: 'פרטי התקשרות',
    fields: ['email', 'phone', 'address'],
    required: true,
    userTypes: ['social_worker', 'career_counselor', 'emotional_therapist', 'general']
  },
  {
    name: 'social_work',
    nameHe: 'עבודה סוציאלית',
    fields: RIGHTS_FIELDS.map(f => f.field_name),
    required: false,
    userTypes: ['social_worker']
  },
  {
    name: 'career_guidance',
    nameHe: 'הכוונה מקצועית',
    fields: careerQuestions.map(q => q.field_name),
    required: false,
    userTypes: ['career_counselor']
  },
  {
    name: 'emotional_therapy',
    nameHe: 'טיפול רגשי',
    fields: emotionalQuestions.map(q => q.field_name),
    required: false,
    userTypes: ['emotional_therapist']
  },
  {
    name: 'general_intake',
    nameHe: 'זיוף אינטייק/סיכום מקיף על התהליך',
    fields: ['strengths', 'obstacles', 'notes'],
    required: false,
    userTypes: ['social_worker', 'career_counselor', 'emotional_therapist', 'general']
  }
];

/**
 * Calculate intake form completion percentage for a specific user type
 */
export function calculateIntakeCompletion(
  patientData: any,
  userType: UserType
): CompletionResult {
  const relevantSections = INTAKE_SECTIONS.filter(section => 
    section.userTypes.includes(userType)
  );

  const sectionResults: CompletionResult['sections'] = {};
  let totalFields = 0;
  let completedFields = 0;
  let requiredSectionsComplete = true;

  for (const section of relevantSections) {
    const sectionTotal = section.fields.length;
    const sectionCompleted = section.fields.filter(field => {
      const value = getNestedValue(patientData, field);
      return isFieldCompleted(value);
    }).length;

    const sectionPercentage = sectionTotal > 0 ? Math.round((sectionCompleted / sectionTotal) * 100) : 0;

    sectionResults[section.name] = {
      completed: sectionCompleted,
      total: sectionTotal,
      percentage: sectionPercentage,
      required: section.required
    };

    totalFields += sectionTotal;
    completedFields += sectionCompleted;

    // Check if required sections are complete
    if (section.required && sectionPercentage < 100) {
      requiredSectionsComplete = false;
    }
  }

  const overallPercentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;

  return {
    overall: overallPercentage,
    sections: sectionResults,
    requiredSectionsComplete,
    totalFields,
    completedFields
  };
}

/**
 * Get completion percentage for all user types
 */
export function getAllUserTypeCompletions(patientData: any): {
  [userType in UserType]: CompletionResult;
} {
  return {
    social_worker: calculateIntakeCompletion(patientData, 'social_worker'),
    career_counselor: calculateIntakeCompletion(patientData, 'career_counselor'),
    emotional_therapist: calculateIntakeCompletion(patientData, 'emotional_therapist'),
    general: calculateIntakeCompletion(patientData, 'general')
  };
}

/**
 * Get user type based on user role
 */
export function getUserTypeFromRole(role: string): UserType {
  switch (role) {
    case 'social_worker':
      return 'social_worker';
    case 'career_counselor':
      return 'career_counselor';
    case 'emotional_therapist':
      return 'emotional_therapist';
    default:
      return 'general';
  }
}

/**
 * Check if a field value is considered "completed"
 */
function isFieldCompleted(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return !isNaN(value);
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Get completion status color
 */
export function getCompletionColor(percentage: number): string {
  if (percentage >= 90) return '#28a745'; // Green
  if (percentage >= 70) return '#ffc107'; // Yellow
  if (percentage >= 50) return '#fd7e14'; // Orange
  return '#dc3545'; // Red
}

/**
 * Get completion status text
 */
export function getCompletionStatus(percentage: number, language: 'en' | 'he' = 'en'): string {
  if (language === 'he') {
    if (percentage >= 90) return 'הושלם';
    if (percentage >= 70) return 'כמעט הושלם';
    if (percentage >= 50) return 'בתהליך';
    return 'התחיל';
  } else {
    if (percentage >= 90) return 'Complete';
    if (percentage >= 70) return 'Nearly Complete';
    if (percentage >= 50) return 'In Progress';
    return 'Started';
  }
}
