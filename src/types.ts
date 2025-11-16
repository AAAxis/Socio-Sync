// TypeScript interfaces and types for the medical management system

export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
  role: 'super_admin' | 'admin' | 'blocked' | 'department_manager' | 'program_manager' | 'team_manager' | 'instructor';
  createdAt?: string;
  lastLoginAt?: string;
  loginCount?: number;
  hasPiiData?: boolean; // Flag to indicate if PII exists in PostgreSQL
  hasGoogleAccount?: boolean; // Flag to indicate if Google account is linked
  hasGoogleCalendar?: boolean; // Flag to indicate if Google Calendar is linked
  twoFactorEnabled?: boolean; // Flag to indicate if 2FA is enabled
  authDisabled?: boolean; // Flag to indicate if authentication is disabled
  blocked?: boolean; // Flag to indicate if user is blocked
  blockedReason?: string; // Reason why user was blocked
}

export interface UserManagementUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'blocked' | 'department_manager' | 'program_manager' | 'team_manager' | 'instructor';
  createdAt: string;
  lastLoginAt: string;
  loginCount: number;
  twoFactorEnabled?: boolean;
  authDisabled?: boolean;
  blocked?: boolean;
  restricted?: boolean;
  blockedReason?: string;
}

export interface Patient {
  id: string;
  caseId: string;
  createdAt: string;
  createdBy: string;
  status: 'new' | 'active' | 'inactive' | 'completed';
  assignedAdmins?: string[]; // Users assigned to this patient (by user.id)
}

export interface ActivityNote {
  id: string;
  caseId: string;
  note: string;
  action: string;
  timestamp: string;
  createdBy: string;
  userEmail?: string;
  archived?: boolean;
}

export interface PatientPII {
  caseId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  caseId?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'inProgress' | 'completed' | 'overdue';
  dueDate?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  patientName?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  caseId?: string;
  patientName?: string;
  createdAt: string;
  read: boolean;
  createdBy: string;
}

// Treatment Plan Types
export interface TreatmentMilestone {
  id: string;
  caseId: string;
  title: string; // כותרת - what we want to achieve
  axis: 'emotional' | 'occupational' | 'rights'; // ציר - Emotional/Occupational/Rights
  description: string; // תיאור קצר - short description
  successMetric: string; // מדד הצלחה - success criteria
  targetDate: string; // תאריך יעד - target date
  resources: string; // משאב רלוונטי - relevant resources
  barriers: string; // חסם פוטנציאלי - potential barriers
  notes: string; // הערות/מעקב שיחה - notes/conversation tracking
  status: 'in_progress' | 'achieved' | 'frozen' | 'maintenance' | 'stuck'; // סטטוס
  progress: number; // Progress percentage (0-100)
  steps: TreatmentStep[]; // רשימת צעדים - list of steps
  therapistNotes: string; // הערת מטפל - therapist notes
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface TreatmentStep {
  id: string;
  milestoneId: string;
  description: string;
  completed: boolean;
  completedAt?: string;
  order: number;
}

export interface MeetingRecord {
  id: string;
  caseId: string;
  date: string; // תאריך פגישה - meeting date
  topic: string; // נושא הפגישה - meeting topic
  notes: string; // מלל פתוח - open text notes
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}
