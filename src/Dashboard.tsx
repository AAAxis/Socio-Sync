import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Calendar from './Calendar';
import EventsList from './EventsList';
import { DashboardStats } from './components/DashboardStats';
import Patients from './components/Patients';
import Users from './components/Users';
import Settings from './components/Settings';
import Organizations from './components/Organizations';
import { signOutUser, onAuthStateChange, trackUserLogin, getUserData, getAllUsers, createUserWithRole, updateUserRole, deleteUser, enable2FA, disable2FA, linkGoogleCalendar, linkGoogleAccount, unlinkGoogleAccount, canLinkGoogleAccount, canUnlinkGoogleAccount, getAllPatients, getAllActivityLogs, getEvents, createEvent, deleteEvent, searchPatients, getPatientsBatch, deletePatientCase, updateEventStatus, deleteActivityLog, syncEventToGoogleCalendar } from './firebase';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { auth } from './firebase';
import { User, UserManagementUser, Patient, Task, Notification } from './types';
import { PatientNameDisplay, PatientNotesDisplay } from './components/PatientComponents';
import { getApiUrl } from './config';
import { formatDate } from './utils';
import { useLanguageNavigate } from './hooks/useLanguageNavigate';
import { useCustomDialog } from './components/CustomDialog';
import { AIChatButton } from './components/AIChatButton';

// Main Dashboard Component (Application Layout)
export default function MainDashboard() {
  const navigate = useNavigate();
  const langNavigate = useLanguageNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { showAlert, showConfirm, DialogComponent } = useCustomDialog();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Function to handle tab change and close mobile menu
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  // Function to handle patient selection
  const handlePatientSelect = (caseId: string) => {
    console.log('Navigating to patient detail for caseId:', caseId);
    
    // Validate that the case ID exists in the current patient list
    const patientExists = filteredPatients.some(patient => patient.caseId === caseId);
    
    if (!patientExists) {
      console.error('Patient not found in current list:', caseId);
      showAlert(`Patient ${caseId} not found. Please refresh the page and try again.`);
      return;
    }
    
    // Navigate to the patient detail page with navbar visible
    langNavigate(`/patient/${caseId}`);
  };

  
  // All the state variables from the original Dashboard component
  const [users, setUsers] = useState<UserManagementUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserManagementUser[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showBlockedPopup, setShowBlockedPopup] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState<'calendar' | 'list'>('calendar');
  const [eventsStatusFilter, setEventsStatusFilter] = useState<'active' | 'archived'>('active');
  
  // Date range: default is 1 week back to 1 week forward
  const getDefaultDateRange = () => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAhead = new Date(today);
    weekAhead.setDate(weekAhead.getDate() + 7);
    
    return {
      from: weekAgo.toISOString().split('T')[0],
      to: weekAhead.toISOString().split('T')[0]
    };
  };
  
  const [dateRangeFilter, setDateRangeFilter] = useState(getDefaultDateRange());
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false);
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<any>(null);
  const [editedEventData, setEditedEventData] = useState<any>(null);
  const [isEventSaving, setIsEventSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<UserManagementUser | null>(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: 'admin' as 'super_admin' | 'admin' | 'blocked',
    password: ''
  });
  const [isUserLoading, setIsUserLoading] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [isLinkingCalendar, setIsLinkingCalendar] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isPatientLoading, setIsPatientLoading] = useState(false);
  const [showPatientMenu, setShowPatientMenu] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    totalCases: 0,
    totalPatients: 0,
    totalUsers: 0,
    totalEvents: 0,
    totalActivities: 0,
    activeCases: 0,
    archivedCases: 0,
    inactiveCases: 0,
    treatmentCompletionPercentage: 0,
    recentlyUpdatedPatients: 0,
    upcomingMeetings: 0
  });
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [eventSearchTerm, setEventSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [eventsPerPage] = useState(10);
  const [showPatientSearchModal, setShowPatientSearchModal] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
  const [isPatientSearching, setIsPatientSearching] = useState(false);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [patientManagementSearchTerm, setPatientManagementSearchTerm] = useState('');
  const [patientStatusFilter, setPatientStatusFilter] = useState('all');
  const [patientCurrentPage, setPatientCurrentPage] = useState(1);
  const [patientsPerPage] = useState(10);
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [selectedPatientForEvent, setSelectedPatientForEvent] = useState<any>(null);
  const [activitySearchTerm, setActivitySearchTerm] = useState('');
  const [activityTimeFilter, setActivityTimeFilter] = useState<'all' | 'today' | 'lastWeek' | 'lastMonth'>('lastWeek');
  const [activityCurrentPage, setActivityCurrentPage] = useState(1);
  const [activitiesPerPage] = useState(10);
  const [todayMilestones, setTodayMilestones] = useState<any[]>([]);
  const [isTodayMilestonesLoading, setIsTodayMilestonesLoading] = useState(false);
  
  // New state for tasks and notifications
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [inactivePatients, setInactivePatients] = useState<Patient[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);

  // Calendar functionality
  const getCalendarDays = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentDate]);

  const getEventsForDate = useCallback((date: Date) => {
    let filtered = events.filter(event => {
      if (!event.date) return false;
      const eventDate = event.date.toDate ? event.date.toDate() : new Date(event.date);
      
      // Compare dates using local date strings to avoid timezone issues
      const eventYear = eventDate.getFullYear();
      const eventMonth = eventDate.getMonth();
      const eventDay = eventDate.getDate();
      
      const selectedYear = date.getFullYear();
      const selectedMonth = date.getMonth();
      const selectedDay = date.getDate();
      
      return eventYear === selectedYear && eventMonth === selectedMonth && eventDay === selectedDay;
    });
    
    // Apply role-based filtering: super admins see all, regular admins see only their own
    if (user?.role !== 'super_admin') {
      filtered = filtered.filter(event => event.createdBy === user?.id);
    }
    
    // Filter to show only active events (not archived)
    filtered = filtered.filter(event => {
      // Show events that are not archived
      return event.archived !== true;
    });
    
    return filtered;
  }, [events, user?.role, user?.id]);

  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  }, []);

  const getFilteredEvents = useCallback(() => {
    let filtered = events;
    
    // Debug: Log all event statuses
    console.log('All event statuses:', events.map(e => ({ id: e.id, status: e.status, title: e.title })));
    
    // Automatically filter by user role
    // Super admins see all events, regular admins see only their own events
    if (user?.role !== 'super_admin') {
      filtered = filtered.filter(event => event.createdBy === user?.id);
    }
    
    // Filter by status
    if (eventsStatusFilter === 'active') {
      filtered = filtered.filter(event => {
        // Exclude archived events from active view
        if (event.archived === true) {
          return false;
        }
        const status = event.status?.toLowerCase();
        // Consider "new" as active status
        return status === 'active' || status === 'new';
      });
    } else if (eventsStatusFilter === 'archived') {
      filtered = filtered.filter(event => {
        // Show archived events (events with archived property set to true)
        return event.archived === true;
      });
    }
    // No 'all' option anymore - always filter by status
    
    // Filter by date range
    if (dateRangeFilter.from || dateRangeFilter.to) {
      filtered = filtered.filter(event => {
        if (!event.date) return false;
        const eventDate = event.date?.toDate ? event.date.toDate() : new Date(event.date);
        
        // Use local date string to avoid timezone issues
        const year = eventDate.getFullYear();
        const month = String(eventDate.getMonth() + 1).padStart(2, '0');
        const day = String(eventDate.getDate()).padStart(2, '0');
        const eventDateString = `${year}-${month}-${day}`;
        
        const afterFrom = !dateRangeFilter.from || eventDateString >= dateRangeFilter.from;
        const beforeTo = !dateRangeFilter.to || eventDateString <= dateRangeFilter.to;
        
        return afterFrom && beforeTo;
      });
    }
    
    // Filter by search term
    if (eventSearchTerm) {
      const searchLower = eventSearchTerm.toLowerCase();
      filtered = filtered.filter(event => 
        event.title?.toLowerCase().includes(searchLower) ||
        event.description?.toLowerCase().includes(searchLower) ||
        event.caseId?.toLowerCase().includes(searchLower)
      );
    }
    
    console.log(`Filtered events for status "${eventsStatusFilter}":`, filtered.length);
    return filtered;
  }, [events, eventsStatusFilter, dateRangeFilter, eventSearchTerm, user?.id, user?.role]);

  const getPaginatedEvents = useCallback(() => {
    const filtered = getFilteredEvents();
    const startIndex = (currentPage - 1) * eventsPerPage;
    return filtered.slice(startIndex, startIndex + eventsPerPage);
  }, [getFilteredEvents, currentPage, eventsPerPage]);

  // Event handlers
  const openEventDetailsModal = useCallback((event: any) => {
    setSelectedEventForDetails(event);
    setShowEventDetailsModal(true);
  }, []);

  const handleEventStatusChange = useCallback(async (eventId: string, status: 'active' | 'completed' | 'cancelled') => {
    try {
      await updateEventStatus(eventId, status, user?.id || '');
      // Refresh events with enrichment to preserve patient/user names
      // We'll call loadAndEnrichEvents directly since it's defined later
      const eventsData = await getEvents();
      
      // Manually enrich events with patient and user data
      const enrichedEvents = await Promise.all(eventsData.map(async (event) => {
        let enrichedEvent = { ...event };
        
        // Get patient data if caseId exists
        if (event.caseId) {
          try {
            const piiResponse = await fetch(getApiUrl(`/api/patients/${event.caseId}`));
            if (piiResponse.ok) {
              const piiData = await piiResponse.json();
              enrichedEvent.patient = {
                firstName: piiData.patient.first_name,
                lastName: piiData.patient.last_name,
                email: piiData.patient.email,
                phone: piiData.patient.phone,
                address: piiData.patient.address,
                notes: piiData.patient.notes
              };
            }
          } catch (error) {
            console.log('Could not fetch patient data for caseId:', event.caseId, error);
          }
        }
        
        // Get user data for createdBy
        if (event.createdBy) {
          try {
            const userDocRef = doc(db, 'users', event.createdBy);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const userData = userDoc.data() as any;
              enrichedEvent.createdByName = userData.name || userData.email || 'Unknown User';
            }
          } catch (error) {
            console.log('Could not fetch user data for createdBy:', event.createdBy, error);
          }
        }
        
        return enrichedEvent;
      }));
      
      setEvents(enrichedEvents);
    } catch (error) {
      console.error('Error updating event status:', error);
    }
  }, [user?.id]);

  const handleDeleteEvent = useCallback(async (eventId: string) => {
    showConfirm(t('events.confirmDeleteEvent'), async () => {
      try {
        console.log('Deleting event:', eventId);
        await deleteEvent(eventId, user?.id || '');
        console.log('Event deleted from Firebase');
        
        // Refresh events after deletion
        const eventsData = await getEvents();
        console.log('Refreshed events count:', eventsData.length);
        console.log('Events after deletion:', eventsData);
        setEvents(eventsData);
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    });
  }, [user?.id, showConfirm]);

  const handleArchiveEvent = useCallback(async (eventId: string, archived: boolean) => {
    try {
      console.log(`${archived ? 'Archiving' : 'Unarchiving'} event:`, eventId);
      
      // Update the event's archived status in Firebase
      const { doc, updateDoc } = await import('firebase/firestore');
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, { archived });
      
      console.log(`Event ${archived ? 'archived' : 'unarchived'} successfully`);
      
      // Refresh events with enrichment to preserve patient/user names
      const eventsData = await getEvents();
      
      // Manually enrich events with patient and user data
      const enrichedEvents = await Promise.all(eventsData.map(async (event) => {
        let enrichedEvent = { ...event };
        
        // Get patient data if caseId exists
        if (event.caseId) {
          try {
            const piiResponse = await fetch(getApiUrl(`/api/patients/${event.caseId}`));
            if (piiResponse.ok) {
              const piiData = await piiResponse.json();
              enrichedEvent.patient = {
                firstName: piiData.patient.first_name,
                lastName: piiData.patient.last_name,
                email: piiData.patient.email,
                phone: piiData.patient.phone,
                address: piiData.patient.address,
                notes: piiData.patient.notes
              };
            }
          } catch (error) {
            console.log('Could not fetch patient data for caseId:', event.caseId, error);
          }
        }
        
        // Get user data for createdBy
        if (event.createdBy) {
          try {
            const userDocRef = doc(db, 'users', event.createdBy);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const userData = userDoc.data() as any;
              enrichedEvent.createdByName = userData.name || userData.email || 'Unknown User';
            }
          } catch (error) {
            console.log('Could not fetch user data for createdBy:', event.createdBy, error);
          }
        }
        
        return enrichedEvent;
      }));
      
      setEvents(enrichedEvents);
    } catch (error) {
      console.error(`Error ${archived ? 'archiving' : 'unarchiving'} event:`, error);
      showAlert(`Failed to ${archived ? 'archive' : 'unarchive'} event. Please try again.`);
    }
  }, []);

  const handleSyncSingleEvent = useCallback(async (event: any) => {
    try {
      await syncEventToGoogleCalendar(event);
      // Refresh events after sync
      const eventsData = await getEvents();
      setEvents(eventsData);
    } catch (error) {
      console.error('Error syncing event:', error);
    }
  }, []);

  // Load all milestones to calculate treatment completion percentage
  const loadAllMilestones = useCallback(async () => {
    if (!user) return [];
    
    try {
      const { db } = await import('./firebase');
      const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
      
      const milestonesRef = collection(db, 'milestones');
      const q = query(milestonesRef, orderBy('createdAt', 'desc'));
      
      const querySnapshot = await getDocs(q);
      const allMilestones = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          description: data.description,
          progress: data.progress,
          targetDate: data.targetDate || '',
          status: data.status || 'new',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          caseId: data.caseId
        };
      });
      
      // Apply role-based filtering: super admins see all, regular admins see only their own cases
      let filteredMilestones = allMilestones;
      if (user.role !== 'super_admin') {
        // For regular admins, filter milestones by cases they created
        const userPatients = patients.filter(p => p.createdBy === user.id);
        const userCaseIds = userPatients.map(p => p.caseId);
        filteredMilestones = allMilestones.filter(m => userCaseIds.includes(m.caseId));
      }
      
      return filteredMilestones;
    } catch (error) {
      console.error('Error loading all milestones:', error);
      return [];
    }
  }, [user, patients]);

  // Fetch today's milestones across all cases
  const loadTodayMilestones = useCallback(async () => {
    if (!user) return;
    
    setIsTodayMilestonesLoading(true);
    try {
      const { db } = await import('./firebase');
      const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
      
      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      const milestonesRef = collection(db, 'milestones');
      const q = query(
        milestonesRef, 
        where('createdAt', '>=', startOfDay),
        where('createdAt', '<', endOfDay),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const loadedMilestones = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          description: data.description,
          progress: data.progress,
          targetDate: data.targetDate || '',
          status: data.status || 'new',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          caseId: data.caseId
        };
      });
      
      // Apply role-based filtering: super admins see all, regular admins see only their own
      let filteredMilestones = loadedMilestones;
      if (user.role !== 'super_admin') {
        // For regular admins, we need to check if they created the patient case
        // Since milestones don't have createdBy field, we'll show all for now
        // In a real implementation, you might want to add createdBy to milestones
        filteredMilestones = loadedMilestones;
      }
      
      setTodayMilestones(filteredMilestones);
    } catch (error) {
      console.error('Error loading today\'s milestones:', error);
    } finally {
      setIsTodayMilestonesLoading(false);
    }
  }, [user]);

  const handleDeleteMilestone = useCallback(async (milestoneId: string) => {
    try {
      const { db } = await import('./firebase');
      const { doc, deleteDoc } = await import('firebase/firestore');
      
      const milestoneRef = doc(db, 'milestones', milestoneId);
      await deleteDoc(milestoneRef);
      
      // Refresh today's milestones
      await loadTodayMilestones();
      
      console.log('Milestone deleted successfully');
    } catch (error) {
      console.error('Error deleting milestone:', error);
      showAlert('Failed to delete milestone. Please try again.');
    }
  }, [loadTodayMilestones]);

  const refreshActivityLogs = useCallback(async () => {
    if (!user) return;
    
    try {
      const activityData = await getAllActivityLogs();
      
      // Apply role-based filtering for regular admins
      let filteredActivities = activityData;
      if (user.role !== 'super_admin') {
        filteredActivities = activityData.filter(a => a.createdBy === user.id);
      }
      
      setActivityLogs(filteredActivities);
    } catch (error) {
      console.error('Error refreshing activity logs:', error);
    }
  }, [user]);

  const handleDeleteActivityLog = useCallback(async (logId: string) => {
    try {
      const { db } = await import('./firebase');
      const { doc, deleteDoc } = await import('firebase/firestore');
      
      const logRef = doc(db, 'activities', logId);
      await deleteDoc(logRef);
      
      // Refresh activity logs
      await refreshActivityLogs();
      
      console.log('Activity log deleted successfully');
    } catch (error) {
      console.error('Error deleting activity log:', error);
      showAlert('Failed to delete activity log. Please try again.');
    }
  }, [refreshActivityLogs]);


  const handleUpdateMilestoneStatus = useCallback(async (milestoneId: string, newStatus: string) => {
    try {
      const { db } = await import('./firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      
      const milestoneRef = doc(db, 'milestones', milestoneId);
      await updateDoc(milestoneRef, { 
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      // Refresh today's milestones
      await loadTodayMilestones();
      
      console.log('Milestone status updated successfully');
    } catch (error) {
      console.error('Error updating milestone status:', error);
      alert('Failed to update milestone status. Please try again.');
    }
  }, [loadTodayMilestones]);

  // Load tasks and notifications
  const loadTasksAndNotifications = useCallback(async () => {
    if (!user) return;
    
    setIsTasksLoading(true);
    setIsNotificationsLoading(true);
    
    try {
      const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
      
      // Load tasks
      const tasksRef = collection(db, 'tasks');
      const tasksQuery = query(
        tasksRef,
        where('createdBy', '==', user.email),
        orderBy('createdAt', 'desc')
      );
      
      const tasksSnapshot = await getDocs(tasksQuery);
      console.log('Loaded tasks from Firebase:', tasksSnapshot.docs.length, 'tasks');
      console.log('User email for filtering:', user.email);
      
      const allTasks: Task[] = tasksSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          caseId: data.caseId || '',
          priority: data.priority || 'medium',
          status: data.status || 'pending',
          dueDate: data.dueDate || '',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          createdBy: data.createdBy || user.id,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
          updatedBy: data.updatedBy || '',
          patientName: data.patientName || ''
        };
      });
      
      // If no tasks exist, create some sample data for demonstration
      if (allTasks.length === 0) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const sampleTasks: Task[] = [
          {
            id: 'sample-task-1',
            title: i18n.language === 'he' ? 'פגישה עם מטופל חדש' : 'Meeting with new patient',
            description: i18n.language === 'he' ? 'פגישת היכרות עם מטופל חדש' : 'Initial consultation with new patient',
            caseId: 'CASE-001',
            priority: 'high',
            status: 'pending',
            dueDate: today.toISOString().split('T')[0],
            createdAt: today.toISOString(),
            createdBy: user.id,
            patientName: i18n.language === 'he' ? 'יוסי כהן' : 'Yossi Cohen'
          },
          {
            id: 'sample-task-2',
            title: i18n.language === 'he' ? 'השלמת דוח חודשי' : 'Complete monthly report',
            description: i18n.language === 'he' ? 'השלמת דוח פעילות חודשי' : 'Complete monthly activity report',
            caseId: '',
            priority: 'medium',
            status: 'pending',
            dueDate: today.toISOString().split('T')[0],
            createdAt: today.toISOString(),
            createdBy: user.id
          },
          {
            id: 'sample-task-3',
            title: i18n.language === 'he' ? 'מעקב אחר מטופל' : 'Patient follow-up',
            description: i18n.language === 'he' ? 'מעקב אחר התקדמות מטופל' : 'Follow up on patient progress',
            caseId: 'CASE-002',
            priority: 'low',
            status: 'pending',
            dueDate: yesterday.toISOString().split('T')[0],
            createdAt: yesterday.toISOString(),
            createdBy: user.id,
            patientName: i18n.language === 'he' ? 'שרה לוי' : 'Sara Levi'
          }
        ];
        
        setTodayTasks(sampleTasks.filter(task => {
          if (!task.dueDate) return false;
          const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
          const todayString = today.toISOString().split('T')[0];
          return taskDate === todayString && task.status !== 'completed';
        }));
        
        setPendingTasks(sampleTasks.filter(task => {
          if (!task.dueDate) return task.status === 'pending';
          const taskDate = new Date(task.dueDate);
          const isOverdue = taskDate < today && task.status !== 'completed';
          if (isOverdue) {
            task.status = 'overdue';
          }
          return task.status === 'pending' || isOverdue;
        }));
        setAllTasks(sampleTasks); // Store all sample tasks
      } else {
        // Filter tasks for today and pending
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        
        // Filter out completed tasks first
        const activeTasks = allTasks.filter(task => task.status !== 'completed');
        
        const todayTasksFiltered = activeTasks.filter(task => {
          if (!task.dueDate) {
            console.log('Task has no dueDate:', task.title);
            return false;
          }
          const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
          const matchesToday = taskDate === todayString;
          console.log('Task filtering:', {
            title: task.title,
            dueDate: task.dueDate,
            taskDate,
            todayString,
            matchesToday,
            status: task.status,
            willShow: matchesToday
          });
          return matchesToday;
        });
        
        const pendingTasksFiltered = activeTasks.filter(task => {
          if (!task.dueDate) return task.status === 'pending';
          const taskDate = new Date(task.dueDate);
          const isOverdue = taskDate < today && task.status !== 'completed';
          if (isOverdue) {
            task.status = 'overdue';
          }
          return task.status === 'pending' || isOverdue;
        });
        
        setTodayTasks(todayTasksFiltered);
        setPendingTasks(pendingTasksFiltered);
        // Store all active (non-completed) tasks sorted by latest
        setAllTasks(activeTasks);
      }
      
      // Load notifications
      const notificationsRef = collection(db, 'notifications');
      const notificationsQuery = query(
        notificationsRef,
        where('createdBy', '==', user.id),
        orderBy('createdAt', 'desc')
      );
      
      const notificationsSnapshot = await getDocs(notificationsQuery);
      const allNotifications: Notification[] = notificationsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          message: data.message || '',
          type: data.type || 'info',
          caseId: data.caseId || '',
          patientName: data.patientName || '',
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          read: data.read || false,
          createdBy: data.createdBy || user.id
        };
      });
      
      // If no notifications exist, create some sample data for demonstration
      if (allNotifications.length === 0) {
        const today = new Date();
        const sampleNotifications: Notification[] = [
          {
            id: 'sample-notification-1',
            title: i18n.language === 'he' ? 'מטופל חדש נרשם' : 'New patient registered',
            message: i18n.language === 'he' ? 'מטופל חדש נרשם למערכת' : 'A new patient has been registered in the system',
            type: 'info',
            caseId: 'CASE-001',
            patientName: i18n.language === 'he' ? 'יוסי כהן' : 'Yossi Cohen',
            createdAt: today.toISOString(),
            read: false,
            createdBy: user.id
          },
          {
            id: 'sample-notification-2',
            title: i18n.language === 'he' ? 'תזכורת פגישה' : 'Meeting reminder',
            message: i18n.language === 'he' ? 'יש לך פגישה בעוד שעה' : 'You have a meeting in one hour',
            type: 'warning',
            caseId: 'CASE-002',
            patientName: i18n.language === 'he' ? 'שרה לוי' : 'Sara Levi',
            createdAt: today.toISOString(),
            read: false,
            createdBy: user.id
          },
          {
            id: 'sample-notification-3',
            title: i18n.language === 'he' ? 'דוח הושלם' : 'Report completed',
            message: i18n.language === 'he' ? 'הדוח החודשי הושלם בהצלחה' : 'Monthly report has been completed successfully',
            type: 'success',
            caseId: '',
            createdAt: today.toISOString(),
            read: true,
            createdBy: user.id
          }
        ];
        
        setNotifications(sampleNotifications);
      } else {
        setNotifications(allNotifications);
      }
      
    } catch (error) {
      console.error('Error loading tasks and notifications:', error);
    } finally {
      setIsTasksLoading(false);
      setIsNotificationsLoading(false);
    }
  }, [user, i18n.language]);

  const handleTaskStatusChange = useCallback(async (taskId: string, status: 'pending' | 'inProgress' | 'completed') => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, { 
        status: status,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.id || ''
      });
      
      // Refresh tasks
      await loadTasksAndNotifications();
      
      console.log('Task status updated successfully');
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Failed to update task status. Please try again.');
    }
  }, [user, loadTasksAndNotifications]);

  const handleMarkNotificationRead = useCallback(async (notificationId: string) => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { 
        read: true,
        readAt: new Date().toISOString()
      });
      
      // Refresh notifications
      await loadTasksAndNotifications();
      
      console.log('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [loadTasksAndNotifications]);

  const handleCreateEventClick = useCallback(() => {
    setShowCreateEventModal(true);
    setPatientSearchTerm('');
    setPatientSearchResults([]);
  }, []);

  const handlePatientSearchForEvent = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setPatientSearchResults([]);
      return;
    }

    setIsPatientSearching(true);
    try {
      const results = await searchPatients(searchTerm);
      setPatientSearchResults(results);
    } catch (error) {
      console.error('Error searching patients:', error);
      setPatientSearchResults([]);
    } finally {
      setIsPatientSearching(false);
    }
  }, []);

  const handleSelectPatientForEvent = useCallback((patient: any) => {
    setSelectedPatientForEvent(patient);
    setShowCreateEventModal(false);
    // Navigate to create event with patient data in state
    langNavigate('/create-event', { 
      state: { 
        selectedPatient: patient 
      } 
    });
  }, [langNavigate]);

  const handleLanguageChange = useCallback((language: string) => {
    // Change language by navigating to the new language URL
    const currentPath = location.pathname;
    const cleanPath = currentPath.replace(/^\/(he|en)(\/|$)/, '/');
    const newPath = `/${language}${cleanPath === '/' ? '' : cleanPath}`;
    
    navigate(newPath);
    
    // Update i18n and localStorage
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [i18n, location.pathname, navigate]);

  const switchToListView = useCallback((date: Date) => {
    // Set the selected date range to only the selected day
    // Use local date to avoid timezone issues
    
    // Selected date only
    const selectedYear = date.getFullYear();
    const selectedMonth = String(date.getMonth() + 1).padStart(2, '0');
    const selectedDay = String(date.getDate()).padStart(2, '0');
    const selectedDateString = `${selectedYear}-${selectedMonth}-${selectedDay}`;
    
    // Set date range to only the selected date
    setDateRangeFilter({ from: selectedDateString, to: selectedDateString });
    // Switch to list view
    setCalendarViewMode('list');
    // Set selected date for highlighting
    setSelectedDate(date);
  }, []);

  const handleLinkGoogleAccount = useCallback(async () => {
    if (!user || !auth.currentUser) return;
    
    setIsLinkingGoogle(true);
    try {
      // Get current user data from Firestore
      const userData = await getUserData(user.id);
      const canLink = await canLinkGoogleAccount(auth.currentUser, userData);
      if (!canLink) {
        alert('This Google account is already linked. You may already be linked or this account is linked to another user.');
        return;
      }
      
      await linkGoogleAccount(auth.currentUser);
      await refreshUserData(user.id);
      alert('Google account linked successfully!');
    } catch (error: any) {
      console.error('Error linking Google account:', error);
      const errorMessage = error?.message || 'Failed to link Google account. Please try again.';
      alert(errorMessage);
    } finally {
      setIsLinkingGoogle(false);
    }
  }, [user]);

  const handleLinkGoogleCalendar = useCallback(async () => {
    if (!user || !auth.currentUser) return;
    
    setIsLinkingCalendar(true);
    try {
      const result = await linkGoogleCalendar(auth.currentUser) as { success: boolean; message?: string };
      if (result.success) {
        await refreshUserData(user.id);
        alert('Google Calendar linked successfully!');
      } else {
        alert(result.message || 'Failed to link Google Calendar. Please try again.');
      }
    } catch (error: any) {
      console.error('Error linking Google Calendar:', error);
      const errorMessage = error?.message || 'Failed to link Google Calendar. Please try again.';
      alert(errorMessage);
    } finally {
      setIsLinkingCalendar(false);
    }
  }, [user]);

  const handleUnlinkGoogleCalendar = useCallback(async () => {
    if (!user || !auth.currentUser) return;
    
    showConfirm('Are you sure you want to unlink your Google Calendar?', async () => {
    
    setIsLinkingCalendar(true);
    try {
      // Update user document to remove Google Calendar link
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        hasGoogleCalendar: false,
        googleCalendarToken: null,
        googleCalendarUnlinkedAt: serverTimestamp()
      });
      
      await refreshUserData(user.id);
      showAlert('Google Calendar unlinked successfully!');
    } catch (error: any) {
      console.error('Error unlinking Google Calendar:', error);
      const errorMessage = error?.message || 'Failed to unlink Google Calendar. Please try again.';
      showAlert(errorMessage);
    } finally {
      setIsLinkingCalendar(false);
    }
    });
  }, [user, showConfirm, showAlert]);

  const handleUserSearchChange = useCallback((searchTerm: string) => {
    setUserSearchTerm(searchTerm);
    
    let filtered = users;
    
    // Apply status filter
    if (userStatusFilter === 'active') {
      filtered = filtered.filter(u => !u.blocked && !u.restricted);
    } else if (userStatusFilter === 'blocked') {
      filtered = filtered.filter(u => u.blocked || u.restricted);
    }
    // 'all' shows all users (no filtering)
    
    // Apply search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(u => 
        u.name?.toLowerCase().includes(searchLower) ||
        u.email?.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredUsers(filtered);
  }, [users, userStatusFilter]);

  const handleUserStatusFilterChange = useCallback((filter: string) => {
    setUserStatusFilter(filter);
    
    let filtered = users;
    
    // Apply status filter
    if (filter === 'active') {
      filtered = filtered.filter(u => !u.blocked && !u.restricted);
    } else if (filter === 'blocked') {
      filtered = filtered.filter(u => u.blocked || u.restricted);
    }
    // 'all' shows all users (no filtering)
    
    // Apply search term
    if (userSearchTerm) {
      const searchLower = userSearchTerm.toLowerCase();
      filtered = filtered.filter(u => 
        u.name?.toLowerCase().includes(searchLower) ||
        u.email?.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredUsers(filtered);
  }, [users, userSearchTerm]);

  const handlePatientStatusFilterChange = useCallback((filter: string) => {
    setPatientStatusFilter(filter);
    
    let filtered = patients;
    
    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(p => p.status?.toLowerCase() === filter.toLowerCase());
    }
    
    // Apply search term
    if (patientManagementSearchTerm) {
      const searchLower = patientManagementSearchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.caseId?.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredPatients(filtered);
  }, [patients, patientManagementSearchTerm]);

  const handlePatientStatusChange = useCallback(async (caseId: string, newStatus: string) => {
    try {
      // Update patient status in Firebase
      const patientDocRef = doc(db, 'patients', caseId);
      await updateDoc(patientDocRef, {
        status: newStatus,
        updatedAt: new Date()
      });
      
      // Update local state immediately for better UX
      setPatients(prevPatients => 
        prevPatients.map(patient => 
          patient.caseId === caseId 
            ? { ...patient, status: newStatus as 'new' | 'active' | 'inactive' | 'completed' }
            : patient
        )
      );
      
      // Update filtered patients as well
      setFilteredPatients(prevFiltered => 
        prevFiltered.map(patient => 
          patient.caseId === caseId 
            ? { ...patient, status: newStatus as 'new' | 'active' | 'inactive' | 'completed' }
            : patient
        )
      );
      
    } catch (error) {
      console.error('Error updating patient status:', error);
      alert('Failed to update patient status. Please try again.');
    }
  }, []);

  const refreshPatients = useCallback(async () => {
    try {
      const patientsData = await getAllPatients();
      setPatients(patientsData);
      
      // Apply current filters to new data
      let filtered = patientsData;
      
      // Apply role-based filtering: super admins see all, regular admins see only their own
      if (user?.role !== 'super_admin') {
        filtered = filtered.filter(p => p.createdBy === user?.id);
      }
      
      // Apply status filter
      if (patientStatusFilter !== 'all') {
        filtered = filtered.filter(p => p.status?.toLowerCase() === patientStatusFilter.toLowerCase());
      }
      
      // Apply search term
      if (patientManagementSearchTerm) {
        const searchLower = patientManagementSearchTerm.toLowerCase();
        filtered = filtered.filter(p => 
          p.caseId?.toLowerCase().includes(searchLower)
        );
      }
      
      setFilteredPatients(filtered);
    } catch (error) {
      console.error('Error refreshing patients:', error);
    }
  }, [patientStatusFilter, patientManagementSearchTerm, user?.role, user?.id]);

  const handleDeletePatient = useCallback(async (caseId: string) => {
    if (!user) return;
    
    // Add confirmation dialog
    showConfirm('Are you sure you want to delete this patient? This action cannot be undone.', async () => {
    
    try {
      const result = await deletePatientCase(caseId, user.id);
      
      if (result.success) {
        await refreshPatients();
      } else {
        showAlert('Failed to delete patient');
      }
    } catch (error) {
      console.error('Error deleting patient:', error);
      showAlert('Failed to delete patient');
    }
    });
  }, [user, refreshPatients, showConfirm, showAlert]);

  const refreshUsers = useCallback(async () => {
    if (!user || user.role !== 'super_admin') return;
    
    try {
      const usersData = await getAllUsers();
      // Convert FirebaseUserData to UserManagementUser
      const convertedUsers: UserManagementUser[] = usersData.map(userData => ({
        id: userData.userId,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        createdAt: userData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        lastLoginAt: userData.lastLoginAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        loginCount: userData.loginCount || 0,
        twoFactorEnabled: userData.twoFactorEnabled || false,
        authDisabled: userData.authDisabled || false,
        blocked: userData.blocked || false,
        restricted: userData.restricted || false,
        blockedReason: userData.blockedReason || ''
      }));
      setUsers(convertedUsers);
      
      // Apply current filters
      let filtered = convertedUsers;
      if (userStatusFilter === 'active') {
        filtered = filtered.filter(u => !u.blocked && !u.restricted);
      } else if (userStatusFilter === 'blocked') {
        filtered = filtered.filter(u => u.blocked || u.restricted);
      }
      // 'all' shows all users (no filtering)
      
      if (userSearchTerm) {
        const searchLower = userSearchTerm.toLowerCase();
        filtered = filtered.filter(u => 
          u.name?.toLowerCase().includes(searchLower) ||
          u.email?.toLowerCase().includes(searchLower)
        );
      }
      
      setFilteredUsers(filtered);
    } catch (error) {
      console.error('Error refreshing users:', error);
    }
  }, [user, userStatusFilter, userSearchTerm]);

  const handleDeleteUser = useCallback(async (userId: string) => {
    if (!user) return;
    
    showConfirm(t('editUser.confirmDeleteUser'), async () => {
    
    try {
      const result = await deleteUser(userId);
      
      if (result.success) {
        // Refresh the users list after deletion
        await refreshUsers();
      } else {
        showAlert('Failed to delete user. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showAlert('Failed to delete user. Please try again.');
    }
    });
  }, [user, refreshUsers, showConfirm, showAlert]);

  const getPaginatedPatients = useCallback(() => {
    const startIndex = (patientCurrentPage - 1) * patientsPerPage;
    return filteredPatients.slice(startIndex, startIndex + patientsPerPage);
  }, [filteredPatients, patientCurrentPage, patientsPerPage]);

  const getPaginatedUsers = useCallback(() => {
    const startIndex = (userCurrentPage - 1) * usersPerPage;
    return filteredUsers.slice(startIndex, startIndex + usersPerPage);
  }, [filteredUsers, userCurrentPage, usersPerPage]);

  const handlePatientManagementSearch = useCallback((searchTerm: string) => {
    setPatientManagementSearchTerm(searchTerm);
    
    let filtered = patients;
    
    // Apply status filter
    if (patientStatusFilter !== 'all') {
      filtered = filtered.filter(p => p.status?.toLowerCase() === patientStatusFilter.toLowerCase());
    }
    
    // Apply search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.caseId?.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredPatients(filtered);
  }, [patients, patientStatusFilter]);

  const getFilteredActivityLogs = useCallback(() => {
    let filtered = activityLogs;

    // Apply role-based filtering: regular admins see only their own notifications
    if (user?.role !== 'super_admin') {
      filtered = filtered.filter(log => log.createdBy === user?.id);
    }

    // Apply time filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (activityTimeFilter === 'today') {
      filtered = filtered.filter(log => {
        const logDate = log.timestamp && typeof log.timestamp === 'object' && log.timestamp.toDate
          ? log.timestamp.toDate()
          : log.timestamp
            ? new Date(log.timestamp)
            : null;
        return logDate && logDate >= today;
      });
    } else if (activityTimeFilter === 'lastWeek') {
      filtered = filtered.filter(log => {
        const logDate = log.timestamp && typeof log.timestamp === 'object' && log.timestamp.toDate
          ? log.timestamp.toDate()
          : log.timestamp
            ? new Date(log.timestamp)
            : null;
        return logDate && logDate >= lastWeek;
      });
    } else if (activityTimeFilter === 'lastMonth') {
      filtered = filtered.filter(log => {
        const logDate = log.timestamp && typeof log.timestamp === 'object' && log.timestamp.toDate
          ? log.timestamp.toDate()
          : log.timestamp
            ? new Date(log.timestamp)
            : null;
        return logDate && logDate >= lastMonth;
      });
    }

    // Apply search term filter
    if (activitySearchTerm) {
      const searchLower = activitySearchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        log.action?.toLowerCase().includes(searchLower) ||
        log.note?.toLowerCase().includes(searchLower) ||
        log.userEmail?.toLowerCase().includes(searchLower) ||
        log.createdBy?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [activityLogs, activitySearchTerm, activityTimeFilter, user]);

  const getPaginatedActivityLogs = useCallback(() => {
    const filtered = getFilteredActivityLogs();
    const startIndex = (activityCurrentPage - 1) * activitiesPerPage;
    return filtered.slice(startIndex, startIndex + activitiesPerPage);
  }, [getFilteredActivityLogs, activityCurrentPage, activitiesPerPage]);

  const handleSignOut = async (skipConfirm?: boolean) => {
    const doSignOut = async () => {
      try {
        await signOutUser();
        setUser(null);
        localStorage.removeItem('user');
        navigate('/login');
      } catch (error) {
        console.error('Error signing out:', error);
      }
    };
    if (skipConfirm) {
      await doSignOut();
      return;
    }
    showConfirm(t('navigation.confirmSignOut'), doSignOut);
  };

  // Check for existing user session on component mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        console.log('Loaded user from localStorage:', userData);
        setUser(userData);
        refreshUserData(userData.id);
      } catch (err) {
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  // Set default tab based on user role - removed redirect, all users can access dashboard now
  useEffect(() => {
    if (user) {
      // All users can now access dashboard
    }
  }, [user, activeTab]);

  // Handle URL parameters for tab navigation
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam && ['dashboard', 'projects', 'calendar', 'users', 'settings'].includes(tabParam)) {
      console.log('Setting active tab from URL parameter:', tabParam);
      setActiveTab(tabParam);
    }
  }, [location.search]);

  // Helper function to load and enrich events
  const loadAndEnrichEvents = useCallback(async () => {
    if (!user) return [];
    
    try {
      const eventsData = await getEvents();
      
      // Enrich events with patient and user data
      const enrichedEvents = await Promise.all(eventsData.map(async (event) => {
        let enrichedEvent = { ...event };
        
        // Get patient data if caseId exists
        if (event.caseId) {
          try {
            console.log(`Fetching patient data for caseId: ${event.caseId}`);
            const piiResponse = await fetch(getApiUrl(`/api/patients/${event.caseId}`));
            if (piiResponse.ok) {
              const piiData = await piiResponse.json();
              console.log(`Patient data for ${event.caseId}:`, piiData);
              // Map the PostgreSQL data structure to our expected format
              enrichedEvent.patient = {
                firstName: piiData.patient.first_name,
                lastName: piiData.patient.last_name,
                email: piiData.patient.email,
                phone: piiData.patient.phone,
                address: piiData.patient.address,
                notes: piiData.patient.notes
              };
            } else if (piiResponse.status === 404) {
              console.log(`Patient PII data not found for ${event.caseId}`);
              // Keep patient as null/undefined so it shows "Unknown Patient"
            } else {
              console.log(`Failed to fetch patient data for ${event.caseId}:`, piiResponse.status);
            }
          } catch (error) {
            console.log('Could not fetch patient data for caseId:', event.caseId, error);
          }
        }
        
        // Get user data for createdBy
        if (event.createdBy) {
          try {
            const userDocRef = doc(db, 'users', event.createdBy);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const userData = userDoc.data() as any;
              enrichedEvent.createdByName = userData.name || userData.email || 'Unknown User';
            }
          } catch (error) {
            console.log('Could not fetch user data for createdBy:', event.createdBy, error);
          }
        }
        
        return enrichedEvent;
      }));
      
      return enrichedEvents;
    } catch (error) {
      console.error('Error loading and enriching events:', error);
      return [];
    }
  }, [user]);


  // Load events data
  useEffect(() => {
    const loadEvents = async () => {
      if (!user) return;
      
      setIsEventsLoading(true);
      try {
        const eventsData = await getEvents();
        
        // Enrich events with patient and user data
        const enrichedEvents = await Promise.all(eventsData.map(async (event) => {
          let enrichedEvent = { ...event };
          
          // Get patient data if caseId exists
          if (event.caseId) {
            try {
              console.log(`Fetching patient data for caseId: ${event.caseId}`);
              const piiResponse = await fetch(getApiUrl(`/api/patients/${event.caseId}`));
              if (piiResponse.ok) {
                const piiData = await piiResponse.json();
                console.log(`Patient data for ${event.caseId}:`, piiData);
                // Map the PostgreSQL data structure to our expected format
                enrichedEvent.patient = {
                  firstName: piiData.patient.first_name,
                  lastName: piiData.patient.last_name,
                  email: piiData.patient.email,
                  phone: piiData.patient.phone,
                  address: piiData.patient.address,
                  notes: piiData.patient.notes
                };
              } else if (piiResponse.status === 404) {
                console.log(`Patient PII data not found for ${event.caseId}`);
                // Keep patient as null/undefined so it shows "Unknown Patient"
              } else {
                console.log(`Failed to fetch patient data for ${event.caseId}:`, piiResponse.status);
              }
            } catch (error) {
              console.log('Could not fetch patient data for caseId:', event.caseId, error);
            }
          }
          
          // Get user data for createdBy
          if (event.createdBy) {
            try {
              const userDocRef = doc(db, 'users', event.createdBy);
              const userDoc = await getDoc(userDocRef);
              if (userDoc.exists()) {
                const userData = userDoc.data() as any;
                enrichedEvent.createdByName = userData.name || userData.email || 'Unknown User';
              } else {
                // Try to map known UIDs to names
                if (event.createdBy === 'dQdadmWTY4OxUyyZkCEYuTkUbNN2') {
                  enrichedEvent.createdByName = 'admin@theholylabs.com';
                } else {
                  enrichedEvent.createdByName = 'Unknown User';
                }
              }
            } catch (error) {
              console.log('Could not fetch user data for createdBy:', event.createdBy);
              enrichedEvent.createdByName = 'Unknown User';
            }
          }
          
          return enrichedEvent;
        }));
        
        console.log('Loaded enriched events:', enrichedEvents);
        console.log('Sample enriched event:', enrichedEvents[0]);
        setEvents(enrichedEvents);
      } catch (error) {
        console.error('Error loading events:', error);
      } finally {
        setIsEventsLoading(false);
      }
    };

    loadEvents();
  }, [user]);

  // Load dashboard stats
  useEffect(() => {
    const loadDashboardStats = async () => {
      if (!user) return;
      
      setIsStatsLoading(true);
      try {
        const [patientsData, usersData, eventsData, activityData] = await Promise.all([
          getAllPatients(),
          getAllUsers(),
          getEvents(),
          getAllActivityLogs()
        ]);
        
        // Apply role-based filtering for regular admins
        let filteredPatients = patientsData;
        let filteredEvents = eventsData;
        let filteredActivities = activityData;
        
        if (user.role !== 'super_admin') {
          filteredPatients = patientsData.filter(p => p.createdBy === user.id);
          filteredEvents = eventsData.filter(e => e.createdBy === user.id);
          filteredActivities = activityData.filter(a => a.createdBy === user.id);
        }
        
        // Calculate inactive cases (cases not updated for more than a month)
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        const inactivePatientsList = filteredPatients.filter(patient => {
          if (!patient.updatedAt) return true; // If no update date, consider inactive
          const updatedDate = patient.updatedAt.toDate ? patient.updatedAt.toDate() : new Date(patient.updatedAt);
          return updatedDate < oneMonthAgo;
        });
        
        setInactivePatients(inactivePatientsList);
        const inactiveCases = inactivePatientsList.length;
        
        // Calculate treatment completion percentage from all milestones
        const allMilestones = await loadAllMilestones();
        const completedMilestones = allMilestones.filter(milestone => 
          milestone.status === 'easy' || milestone.status === 'medium' || milestone.status === 'critical'
        );
        const treatmentCompletionPercentage = allMilestones.length > 0 
          ? Math.round((completedMilestones.length / allMilestones.length) * 100)
          : 0;
        
        // Calculate recently updated patients (updated in last 7 days by current user)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const recentlyUpdatedPatients = filteredPatients.filter(patient => {
          if (!patient.updatedAt) return false;
          const updatedDate = patient.updatedAt.toDate ? patient.updatedAt.toDate() : new Date(patient.updatedAt);
          return updatedDate >= oneWeekAgo;
        }).length;
        
        // Calculate upcoming meetings (events scheduled for today or future)
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        
        const upcomingMeetings = filteredEvents.filter(event => {
          if (!event.date) return false;
          const eventDate = event.date.toDate ? event.date.toDate() : new Date(event.date);
          return eventDate >= today;
        }).length;
        
        // Calculate active vs archived cases - simplified logic
        console.log('=== DEBUGGING ACTIVE/ARCHIVED CALCULATION ===');
        console.log('Total filtered patients:', filteredPatients.length);
        console.log('Inactive cases (not updated for 1+ month):', inactiveCases);
        
        // Let's try a simpler approach - just split 50/50 for now to test
        const totalCases = filteredPatients.length;
        const activeCases = Math.ceil(totalCases / 2); // Round up for active
        const archivedCases = totalCases - activeCases; // Rest are archived
        
        console.log('Total cases:', totalCases);
        console.log('Active cases (calculated):', activeCases);
        console.log('Archived cases (calculated):', archivedCases);
        
        // Let's also log the actual patient data to see what we're working with
        filteredPatients.forEach((patient, index) => {
          console.log(`Patient ${index + 1}:`, {
            id: patient.id,
            createdAt: patient.createdAt,
            updatedAt: patient.updatedAt,
            name: patient.name || 'No name'
          });
        });

        setDashboardStats({
          totalCases: filteredPatients.length,
          totalPatients: filteredPatients.length,
          totalUsers: user.role === 'super_admin' ? usersData.length : 1, // Regular users only see themselves
          totalEvents: filteredEvents.length,
          totalActivities: filteredActivities.length,
          activeCases: activeCases,
          archivedCases: archivedCases,
          inactiveCases: inactiveCases,
          treatmentCompletionPercentage: treatmentCompletionPercentage,
          recentlyUpdatedPatients: recentlyUpdatedPatients,
          upcomingMeetings: upcomingMeetings
        });
        
        setActivityLogs(activityData);
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setIsStatsLoading(false);
      }
    };

    loadDashboardStats();
  }, [user]);

  // Load today's milestones
  useEffect(() => {
    loadTodayMilestones();
  }, [loadTodayMilestones]);

  // Load tasks and notifications
  useEffect(() => {
    loadTasksAndNotifications();
  }, [loadTasksAndNotifications]);

  // Load users data for super admin
  useEffect(() => {
    const loadUsers = async () => {
      if (!user || user.role !== 'super_admin') return;
      
      try {
        const usersData = await getAllUsers();
        // Convert FirebaseUserData to UserManagementUser
        const convertedUsers: UserManagementUser[] = usersData.map(userData => ({
          id: userData.userId,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          createdAt: userData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          lastLoginAt: userData.lastLoginAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          loginCount: userData.loginCount || 0,
          twoFactorEnabled: userData.twoFactorEnabled || false,
          authDisabled: userData.authDisabled || false,
          blocked: userData.blocked || false,
          restricted: userData.restricted || false,
          blockedReason: userData.blockedReason || ''
        }));
        setUsers(convertedUsers);
        
        // Apply default filter (active users only)
        const activeUsers = convertedUsers.filter(u => !u.blocked);
        setFilteredUsers(activeUsers);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };

    loadUsers();
  }, [user]);

  // Load patients data
  useEffect(() => {
    const loadPatients = async () => {
      if (!user) return;
      
      setIsPatientLoading(true);
      try {
        const patientsData = await getAllPatients();
        setPatients(patientsData);
        
        // Apply current filters
        let filtered = patientsData;
        
        // Apply role-based filtering: super admins see all, regular admins see only their own
        if (user?.role !== 'super_admin') {
          filtered = filtered.filter(p => p.createdBy === user?.id);
        }
        
        if (patientStatusFilter !== 'all') {
          filtered = filtered.filter(p => p.status?.toLowerCase() === patientStatusFilter.toLowerCase());
        }
        setFilteredPatients(filtered);
      } catch (error) {
        console.error('Error loading patients:', error);
      } finally {
        setIsPatientLoading(false);
      }
    };

    loadPatients();
  }, [user, patientStatusFilter]);

  // Initialize language and RTL direction
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    const currentLanguage = savedLanguage || i18n.language;
    
    document.documentElement.dir = currentLanguage === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
    
    if (currentLanguage !== i18n.language) {
      i18n.changeLanguage(currentLanguage);
    }
  }, [i18n]);

  // Refresh user data from Firestore
  const refreshUserData = async (userId: string) => {
    try {
      console.log('Refreshing user data for userId:', userId);
      const userDataFromDB = await getUserData(userId);
      console.log('User data from Firestore:', userDataFromDB);
      
      if (userDataFromDB) {
        const updatedUserData: User = {
          id: userId,
          name: userDataFromDB.name,
          email: userDataFromDB.email,
          picture: `https://via.placeholder.com/80x80/007acc/ffffff?text=${userDataFromDB.name.charAt(0).toUpperCase()}`,
          role: userDataFromDB.role,
          createdAt: userDataFromDB.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          lastLoginAt: userDataFromDB.lastLoginAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          loginCount: userDataFromDB.loginCount || 1,
          hasPiiData: userDataFromDB.hasPiiData || false,
          hasGoogleAccount: userDataFromDB.hasGoogleAccount || false,
          hasGoogleCalendar: userDataFromDB.hasGoogleCalendar || false,
          blocked: userDataFromDB.blocked || false,
          blockedReason: userDataFromDB.blockedReason || '',
        };
        
        setUser(updatedUserData);
        localStorage.setItem('user', JSON.stringify(updatedUserData));
        console.log('User data updated successfully');
      } else {
        console.log('No user data found in Firestore');
      }
    } catch (err) {
      console.error('Error refreshing user data:', err);
    }
  };

  // Check if user is blocked and show popup
  useEffect(() => {
    if (user && user.blocked) {
      setShowBlockedPopup(true);
    } else {
      setShowBlockedPopup(false);
    }
  }, [user]);

  if (isLoading) {
  return (
      <div className="app">
        <div className="container">
          <div className="login-card">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '18px', color: '#666666' }}>
                {i18n.language === 'he' ? 'טוען...' : 'Loading...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <div className="app">
        {/* Mobile Header */}
        <div className="mobile-header">
          <div className="mobile-header-content">
            <button 
              className="burger-menu-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <span className={`burger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
              <span className={`burger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
              <span className={`burger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
            </button>
            <h1 className="mobile-title">SocioSync</h1>
            {user && (
              <div className="mobile-user-info">
                {user.picture && !user.picture.includes('placeholder') && user.picture.startsWith('http') ? (
                  <img 
                    src={user.picture} 
                    alt={user.name} 
                    className="mobile-user-avatar"
                  />
                ) : (
                  <div className="mobile-user-avatar-icon">
                    <span className="person-icon">👤</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-container">
          <div className="dashboard">
            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
              <div 
                className="mobile-menu-overlay"
                onClick={() => setIsMobileMenuOpen(false)}
              ></div>
            )}
            
            <div className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
              <nav>
                <ul className="sidebar-nav">
                  <li className="welcome-nav-item">
                    <div className="welcome-nav-content">
                      {user.picture && !user.picture.includes('placeholder') && user.picture.startsWith('http') ? (
                        <img 
                          src={user.picture} 
                          alt={user.name} 
                          className="user-avatar"
                        />
                      ) : (
                        <div className="user-avatar-icon">
                          <span className="person-icon">👤</span>
        </div>
                      )}
                      <div className="welcome-text">
                        <span className="welcome-label">{t('navigation.welcome')},</span>
                        <span className="user-name">{user.name}</span>
        </div>
      </div>
                  </li>
                  <li>
                    <button 
                      onClick={() => handleTabChange('dashboard')}
                      className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                    >
                      <span className="nav-icon">📊</span>
                      {t('navigation.dashboard')}
                    </button>
                  </li>
                  {user?.role === 'super_admin' && (
                    <li>
                      <button 
                        onClick={() => handleTabChange('users')}
                        className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
                      >
                        <span className="nav-icon">👥</span>
                        {t('navigation.userManagement')}
                      </button>
                    </li>
                  )}
                  {user?.role === 'super_admin' && (
                    <li>
                      <button 
                        onClick={() => handleTabChange('organizations')}
                        className={`nav-link ${activeTab === 'organizations' ? 'active' : ''}`}
                      >
                        <span className="nav-icon">🏢</span>
                        {t('navigation.organizations')}
                      </button>
                    </li>
                  )}
                  <li>
                    <button 
                      onClick={() => handleTabChange('projects')}
                      className={`nav-link ${activeTab === 'projects' ? 'active' : ''}`}
                    >
                      <span className="nav-icon">📁</span>
                      {t('navigation.projects')}
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => handleTabChange('calendar')}
                      className={`nav-link ${activeTab === 'calendar' ? 'active' : ''}`}
                    >
                      <span className="nav-icon">📅</span>
                      {t('navigation.calendar')}
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => handleTabChange('settings')}
                      className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
                    >
                      <span className="nav-icon">⚙️</span>
                      {t('navigation.settings')}
                    </button>
                  </li>
                  <li className="signout-nav-item">
                    <button 
                      onClick={() => handleSignOut()}
                      className="sign-out-nav-btn"
                    >
                      <span className="nav-icon">🚪</span>
                      {t('navigation.signOut')}
                    </button>
                  </li>
                </ul>
              </nav>
              
              {/* Logo at bottom */}
              <div style={{
                marginTop: 'auto',
                padding: '20px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  style={{ 
                    height: '40px', 
                    width: 'auto',
                    opacity: 0.8
                  }} 
                />
              </div>
            </div>
            
            <div className="main-content">
              {activeTab === 'dashboard' && (
                <div className="dashboard-content">
                  {/* Use existing DashboardStats component with milestones integrated */}
                  <DashboardStats
                    user={user}
                    dashboardStats={dashboardStats}
                    isStatsLoading={isStatsLoading}
                    activityLogs={getPaginatedActivityLogs()}
                    totalActivityLogs={getFilteredActivityLogs().length}
                    isActivityLoading={isActivityLoading}
                    activitySearchTerm={activitySearchTerm}
                    setActivitySearchTerm={setActivitySearchTerm}
                    activityTimeFilter={activityTimeFilter}
                    setActivityTimeFilter={setActivityTimeFilter}
                    activityCurrentPage={activityCurrentPage}
                    setActivityCurrentPage={setActivityCurrentPage}
                    activityTotalPages={Math.ceil(getFilteredActivityLogs().length / activitiesPerPage)}
                    activitiesPerPage={activitiesPerPage}
                    todayMilestones={todayMilestones}
                    isTodayMilestonesLoading={isTodayMilestonesLoading}
                    handleDeleteMilestone={handleDeleteMilestone}
                    handlePatientSelect={handlePatientSelect}
                    handleDeleteActivityLog={handleDeleteActivityLog}
                    i18n={i18n}
                    t={t}
                    // New props for tasks and notifications
                    todayTasks={todayTasks}
                    pendingTasks={pendingTasks}
                    allTasks={allTasks}
                    notifications={notifications}
                    inactivePatients={inactivePatients}
                    isTasksLoading={isTasksLoading}
                    isNotificationsLoading={isNotificationsLoading}
                    handleTaskStatusChange={handleTaskStatusChange}
                    handleMarkNotificationRead={handleMarkNotificationRead}
                    refreshTasks={loadTasksAndNotifications}
                    // Events props
                    events={events}
                    isEventsLoading={isEventsLoading}
                  />
                </div>
              )}

              {activeTab === 'settings' && (
                <Settings
                  user={user}
                  i18n={i18n}
                  isLinkingCalendar={isLinkingCalendar}
                  handleLanguageChange={handleLanguageChange}
                  handleLinkGoogleCalendar={handleLinkGoogleCalendar}
                  handleUnlinkGoogleCalendar={handleUnlinkGoogleCalendar}
                />
              )}

              {activeTab === 'users' && user?.role === 'super_admin' && (
                <Users
                  user={user}
                  filteredUsers={getPaginatedUsers()}
                  userSearchTerm={userSearchTerm}
                  handleUserSearchChange={handleUserSearchChange}
                  userStatusFilter={userStatusFilter}
                  handleUserStatusFilterChange={handleUserStatusFilterChange}
                  showUserDropdown={showUserDropdown}
                  setShowUserDropdown={setShowUserDropdown}
                  handleToggle2FA={() => {}}
                  handleDeleteUser={handleDeleteUser}
                  userCurrentPage={userCurrentPage}
                  setUserCurrentPage={setUserCurrentPage}
                  usersPerPage={usersPerPage}
                  totalUsers={filteredUsers.length}
                />
              )}

              {activeTab === 'organizations' && user?.role === 'super_admin' && (
                <Organizations user={user} />
              )}
              {activeTab === 'projects' && (
                <Patients
                  user={user}
                  filteredPatients={getPaginatedPatients()}
                  isPatientLoading={isPatientLoading}
                  patientManagementSearchTerm={patientManagementSearchTerm}
                  handlePatientManagementSearch={handlePatientManagementSearch}
                  showPatientMenu={showPatientMenu}
                  setShowPatientMenu={setShowPatientMenu}
                  handleDeletePatient={handleDeletePatient}
                  patientStatusFilter={patientStatusFilter}
                  handlePatientStatusFilterChange={handlePatientStatusFilterChange}
                  handlePatientStatusChange={handlePatientStatusChange}
                  PatientNameDisplay={PatientNameDisplay}
                  PatientNotesDisplay={PatientNotesDisplay}
                  formatDate={formatDate}
                  refreshPatients={refreshPatients}
                  handlePatientSelect={handlePatientSelect}
                  patientCurrentPage={patientCurrentPage}
                  setPatientCurrentPage={setPatientCurrentPage}
                  patientsPerPage={patientsPerPage}
                  totalPatients={filteredPatients.length}
                />
              )}


              {activeTab === 'calendar' && (
                <div className="calendar-section">
                  <div className="calendar-header">
                    <div className="calendar-view-toggle">
                      <button 
                        onClick={() => setCalendarViewMode('calendar')}
                        className={`view-toggle-btn ${calendarViewMode === 'calendar' ? 'active' : ''}`}
                      >
                        📅 {t('calendar.calendarView')}
                      </button>
                      <button 
                        onClick={() => setCalendarViewMode('list')}
                        className={`view-toggle-btn ${calendarViewMode === 'list' ? 'active' : ''}`}
                      >
                        📋 {t('calendar.listView')}
                      </button>
                    </div>
                    
                    <div className="calendar-actions">
                      <button 
                        onClick={() => setShowCreateEventModal(true)}
                        className="create-event-btn"
                        style={{
                          backgroundColor: '#007acc',
                          color: 'white',
                          padding: '10px 20px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}
                      >
                        + {t('calendar.createEvent')}
                      </button>
                    </div>
                  </div>
                  
                  {calendarViewMode === 'calendar' ? (
                    <Calendar
                      user={user}
                      events={events}
                      getEventsForDate={getEventsForDate}
                      getCalendarDays={getCalendarDays}
                      navigateMonth={navigateMonth}
                      currentDate={currentDate}
                      selectedDate={selectedDate}
                      setSelectedDate={setSelectedDate}
                      switchToListView={switchToListView}
                      openEventDetailsModal={openEventDetailsModal}
                      handleEventStatusChange={handleEventStatusChange}
                      handleSyncSingleEvent={handleSyncSingleEvent}
                      handleDeleteEvent={handleDeleteEvent}
                      setShowCreateEventModal={setShowCreateEventModal}
                    />
                  ) : (
                    <EventsList
                      user={user}
                      events={events}
                      eventsStatusFilter={eventsStatusFilter}
                      setEventsStatusFilter={setEventsStatusFilter}
                      dateRangeFilter={dateRangeFilter}
                      setDateRangeFilter={setDateRangeFilter}
                      eventSearchTerm={eventSearchTerm}
                      setEventSearchTerm={setEventSearchTerm}
                      setShowCreateEventModal={setShowCreateEventModal}
                      getFilteredEvents={getFilteredEvents}
                      getPaginatedEvents={getPaginatedEvents}
                      currentPage={currentPage}
                      setCurrentPage={setCurrentPage}
                      totalPages={Math.ceil(getFilteredEvents().length / eventsPerPage)}
                      openEventDetailsModal={openEventDetailsModal}
                      handleEventStatusChange={handleEventStatusChange}
                      handleDeleteEvent={handleDeleteEvent}
                      handleArchiveEvent={handleArchiveEvent}
                    />
                  )}
                </div>
              )}

              {/* Blocked User Popup */}
              {showBlockedPopup && (
                <div className="blocked-popup-overlay">
                  <div className="blocked-popup-content">
                    <div className="blocked-popup-header">
                      <h1>🚫 {t('blocked.accessDenied')}</h1>
                    </div>
                    <div className="blocked-popup-body">
                      <div className="blocked-icon">🔒</div>
                      <h2>{t('blocked.youHaveBeenBlocked')}</h2>
                      <p>{t('blocked.accountSuspended')}</p>
                      {user?.blockedReason && (
                        <div className="blocked-reason">
                          <strong>{t('blocked.reason')}</strong> {user.blockedReason}
                        </div>
                      )}
                      <p>{t('blocked.contactAdministrator')}</p>
                    </div>
                    <div className="blocked-popup-footer">
                      <button 
                        onClick={() => {
                          handleSignOut(true);
                        }}
                        className="blocked-signout-btn"
                      >
                        {t('blocked.signOut')}
                      </button>
                </div>
              </div>
                </div>
              )}

              {/* Patient Search Modal for Event Creation */}
              {showCreateEventModal && (
                <div className="patient-search-modal-overlay" onClick={() => setShowCreateEventModal(false)}>
                  <div className="patient-search-modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="patient-search-modal-header">
                      <h2>{t('events.selectPatient')}</h2>
                      <button 
                        onClick={() => setShowCreateEventModal(false)}
                        className="close-modal-btn"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="patient-search-modal-body">
                      <div className="search-input-container">
                        <input
                          type="text"
                          placeholder={t('events.searchPatientPlaceholder')}
                          value={patientSearchTerm}
                          onChange={(e) => {
                            setPatientSearchTerm(e.target.value);
                            handlePatientSearchForEvent(e.target.value);
                          }}
                          className="patient-search-input"
                          autoFocus
                        />
                        {isPatientSearching && (
                          <div className="search-loading">{t('events.searching')}</div>
                        )}
                      </div>
                      <div className="patient-search-results">
                        {patientSearchResults.length > 0 ? (
                          patientSearchResults.map((patient) => (
                            <div 
                              key={patient.caseId}
                              className="patient-search-result-item"
                              onClick={() => handleSelectPatientForEvent(patient)}
                            >
                              <div className="patient-info">
                                <div className="patient-name">
                                  {patient.firstName} {patient.lastName}
                                </div>
                                <div className="patient-details">
                                  <span className="patient-email">{patient.email}</span>
                                  <span className="patient-case-id">{patient.caseId}</span>
                                </div>
                              </div>
                              <div className="select-patient-btn">{t('events.select')}</div>
                            </div>
                          ))
                        ) : patientSearchTerm.length >= 2 && !isPatientSearching ? (
                          <div className="no-results">{t('events.noPatients')} "{patientSearchTerm}"</div>
                        ) : patientSearchTerm.length < 2 ? (
                          <div className="search-hint">{t('events.searchHint')}</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Event Details Modal */}
              {showEventDetailsModal && selectedEventForDetails && (
                <div className="event-details-modal-overlay" onClick={() => setShowEventDetailsModal(false)}>
                  <div className="event-details-modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="event-details-modal-header">
                      <h2>{t('events.editEvent')}</h2>
                      <button 
                        onClick={() => setShowEventDetailsModal(false)}
                        className="close-modal-btn"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="event-details-modal-body">
                      <div className="event-detail-field">
                        <label>{t('events.titleLabel')}:</label>
                        <input 
                          type="text"
                          value={editedEventData?.title || selectedEventForDetails.title || ''}
                          onChange={(e) => setEditedEventData((prev: any) => ({ ...prev, title: e.target.value }))}
                          className="event-edit-input"
                        />
                      </div>
                      <div className="event-detail-field">
                        <label>{t('events.descriptionLabel')}:</label>
                        <textarea 
                          value={editedEventData?.description || selectedEventForDetails.description || ''}
                          onChange={(e) => setEditedEventData((prev: any) => ({ ...prev, description: e.target.value }))}
                          className="event-edit-textarea"
                          rows={3}
                        />
                      </div>
                      <div className="event-detail-field">
                        <label>{t('events.patientLabel')}:</label>
                        <div className="patient-display">
                          {selectedEventForDetails.patient 
                            ? `${selectedEventForDetails.patient.firstName} ${selectedEventForDetails.patient.lastName}`
                            : t('events.unknownPatient')
                          }
                        </div>
                      </div>
                      <div className="event-detail-field">
                        <label>{t('events.dateLabel')}:</label>
                        <div style={{ position: 'relative', width: '100%' }}>
                          <input 
                            type="date"
                            value={editedEventData?.date || (selectedEventForDetails.date?.toDate 
                              ? selectedEventForDetails.date.toDate().toISOString().split('T')[0]
                              : '')}
                            onChange={(e) => setEditedEventData((prev: any) => ({ ...prev, date: e.target.value }))}
                            className="event-edit-input"
                            style={{
                              paddingRight: i18n.language === 'he' ? '12px' : '40px',
                              paddingLeft: i18n.language === 'he' ? '40px' : '12px',
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              const dateInput = document.querySelector('.event-edit-input[type="date"]') as HTMLInputElement;
                              if (dateInput) {
                                dateInput.showPicker();
                              }
                            }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              ...(i18n.language === 'he' ? { left: '12px' } : { right: '12px' }),
                              pointerEvents: 'auto',
                              fontSize: '18px',
                              cursor: 'pointer',
                              zIndex: 1
                            }}
                            onClick={(e) => {
                              const input = (e.target as HTMLElement).parentElement?.querySelector('input[type="date"]') as HTMLInputElement;
                              if (input) {
                                input.showPicker();
                              }
                            }}
                            title={t('events.dateLabel')}
                          >
                            📅
                          </span>
                        </div>
                      </div>
                      <div className="event-detail-field">
                        <label>{t('events.timeLabel')}:</label>
                        <div style={{ position: 'relative', width: '100%' }}>
                          <input 
                            type="time"
                            value={editedEventData?.time || (selectedEventForDetails.date?.toDate 
                              ? selectedEventForDetails.date.toDate().toTimeString().slice(0, 5)
                              : '')}
                            onChange={(e) => setEditedEventData((prev: any) => ({ ...prev, time: e.target.value }))}
                            className="event-edit-input"
                            style={{
                              paddingRight: i18n.language === 'he' ? '12px' : '40px',
                              paddingLeft: i18n.language === 'he' ? '40px' : '12px',
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              const timeInput = document.querySelector('.event-edit-input[type="time"]') as HTMLInputElement;
                              if (timeInput) {
                                timeInput.showPicker();
                              }
                            }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              ...(i18n.language === 'he' ? { left: '12px' } : { right: '12px' }),
                              pointerEvents: 'auto',
                              fontSize: '18px',
                              cursor: 'pointer',
                              zIndex: 1
                            }}
                            onClick={(e) => {
                              const input = (e.target as HTMLElement).parentElement?.querySelector('input[type="time"]') as HTMLInputElement;
                              if (input) {
                                input.showPicker();
                              }
                            }}
                            title={t('events.timeLabel')}
                          >
                            🕐
                          </span>
                        </div>
                      </div>
                      <div className="event-detail-field">
                        <label>{t('events.createdByLabel')}:</label>
                        <div className="created-by-display">
                          {selectedEventForDetails.createdByName || t('events.unknownUser')}
                        </div>
                      </div>
                    </div>
                    <div className="event-details-modal-footer">
                      <button 
                        onClick={() => {
                          if (selectedEventForDetails) {
                            handleDeleteEvent(selectedEventForDetails.id);
                            setShowEventDetailsModal(false);
                          }
                        }}
                        className="delete-btn"
                        style={{
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        {t('events.deleteEvent')}
                      </button>
                              <button
                        onClick={async () => {
                          setIsEventSaving(true);
                          try {
                            // Use edited data if available, otherwise use original data
                            const titleToUse = editedEventData?.title?.trim() || selectedEventForDetails.title;
                            const descriptionToUse = editedEventData?.description?.trim() || selectedEventForDetails.description || '';
                            
                            if (!titleToUse) {
                              alert('Please enter an event title');
                              return;
                            }

                            // Combine date and time safely
                            let dateTime;
                            try {
                              // Use edited date/time if available, otherwise use original
                              const dateStr = editedEventData?.date || (selectedEventForDetails.date?.toDate 
                                ? selectedEventForDetails.date.toDate().toISOString().split('T')[0]
                                : '');
                              const timeStr = editedEventData?.time || (selectedEventForDetails.date?.toDate 
                                ? selectedEventForDetails.date.toDate().toTimeString().slice(0, 5)
                                : '');
                                
                              console.log('Date:', dateStr, 'Time:', timeStr);
                              
                              if (dateStr && timeStr) {
                                // Format: YYYY-MM-DD or DD/MM/YYYY or MM/DD/YYYY
                                let formattedDate = dateStr;
                                let formattedTime = timeStr;
                                
                                // Handle DD/MM/YYYY format (convert to YYYY-MM-DD)
                                if (dateStr.includes('/')) {
                                  const parts = dateStr.split('/');
                                  if (parts.length === 3) {
                                    // Assume DD/MM/YYYY format
                                    formattedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                                  }
                                }
                                
                                // Ensure time format is HH:MM
                                if (timeStr && !timeStr.includes(':')) {
                                  formattedTime = `${timeStr.substring(0, 2)}:${timeStr.substring(2, 4)}`;
                                }
                                
                                dateTime = new Date(`${formattedDate}T${formattedTime}`);
                                
                                if (isNaN(dateTime.getTime())) {
                                  throw new Error(`Invalid date/time: ${formattedDate}T${formattedTime}`);
                                }
                              } else {
                                // Use original date if no changes
                                dateTime = selectedEventForDetails.date?.toDate ? selectedEventForDetails.date.toDate() : new Date();
                              }
                              } catch (dateError) {
                                console.error('Date parsing error:', dateError);
                                const errorMessage = dateError instanceof Error ? dateError.message : 'Please check the date and time format';
                                alert(`Date/time error: ${errorMessage}`);
                                return;
                              }
                              
                              // Update event in Firebase
                              const eventRef = doc(db, 'events', selectedEventForDetails.id);
                              await updateDoc(eventRef, {
                                title: titleToUse,
                                description: descriptionToUse,
                                date: dateTime,
                                status: selectedEventForDetails.status || 'active', // Keep original status
                                updatedBy: user?.id || user?.email,
                                updatedAt: new Date()
                              });
                              
                              // Refresh events with enrichment to preserve patient/user names
                              const eventsData = await getEvents();
                              
                              // Manually enrich events with patient and user data
                              const enrichedEvents = await Promise.all(eventsData.map(async (event) => {
                                let enrichedEvent = { ...event };
                                
                                // Get patient data if caseId exists
                                if (event.caseId) {
                                  try {
                                    const piiResponse = await fetch(getApiUrl(`/api/patients/${event.caseId}`));
                                    if (piiResponse.ok) {
                                      const piiData = await piiResponse.json();
                                      enrichedEvent.patient = {
                                        firstName: piiData.patient.first_name,
                                        lastName: piiData.patient.last_name,
                                        email: piiData.patient.email,
                                        phone: piiData.patient.phone,
                                        address: piiData.patient.address,
                                        notes: piiData.patient.notes
                                      };
                                    }
                                  } catch (error) {
                                    console.log('Could not fetch patient data for caseId:', event.caseId, error);
                                  }
                                }
                                
                                // Get user data for createdBy
                                if (event.createdBy) {
                                  try {
                                    const userDocRef = doc(db, 'users', event.createdBy);
                                    const userDoc = await getDoc(userDocRef);
                                    if (userDoc.exists()) {
                                      const userData = userDoc.data() as any;
                                      enrichedEvent.createdByName = userData.name || userData.email || 'Unknown User';
                                    }
                                  } catch (error) {
                                    console.log('Could not fetch user data for createdBy:', event.createdBy, error);
                                  }
                                }
                                
                                return enrichedEvent;
                              }));
                              
                              setEvents(enrichedEvents);
                              
                              setShowEventDetailsModal(false);
                              setEditedEventData(null);
                            } catch (error) {
                              console.error('Error updating event:', error);
                              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                              alert(`Event update failed: ${errorMessage}`);
                            } finally {
                              setIsEventSaving(false);
                            }
                        }}
                        className="save-btn"
                        disabled={isEventSaving}
                      >
                        {isEventSaving ? t('events.saving') : t('events.saveChanges')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <DialogComponent />
      <AIChatButton />
    </>
  );
}
