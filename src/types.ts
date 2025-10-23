// TypeScript interfaces and types for the medical management system

export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
  role: 'super_admin' | 'admin' | 'blocked';
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
  role: 'super_admin' | 'admin' | 'blocked';
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
