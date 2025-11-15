import React, { useState } from 'react';
import { User, Task, Notification } from '../types';
import { useCustomDialog } from './CustomDialog';
import { createTask } from '../firebase';
import { PatientNameDisplay } from './PatientComponents';

interface DashboardStatsProps {
  user: User;
  dashboardStats: {
    totalCases: number;
    totalPatients: number;
    totalUsers: number;
    totalEvents: number;
    totalActivities: number;
    activeCases: number;
    archivedCases: number;
    inactiveCases: number;
    treatmentCompletionPercentage: number;
    recentlyUpdatedPatients: number;
    upcomingMeetings: number;
  };
  isStatsLoading: boolean;
  activityLogs: any[];
  totalActivityLogs: number;
  isActivityLoading: boolean;
  activitySearchTerm: string;
  setActivitySearchTerm: (term: string) => void;
  activityTimeFilter: 'all' | 'today' | 'lastWeek' | 'lastMonth';
  setActivityTimeFilter: (filter: 'all' | 'today' | 'lastWeek' | 'lastMonth') => void;
  activityCurrentPage: number;
  setActivityCurrentPage: (page: number) => void;
  activityTotalPages: number;
  activitiesPerPage: number;
  todayMilestones: any[];
  isTodayMilestonesLoading: boolean;
  handleDeleteMilestone: (milestoneId: string) => void;
  handlePatientSelect: (caseId: string) => void;
  handleDeleteActivityLog: (logId: string) => void;
  i18n: any;
  t: (key: string) => string;
  // New props for tasks and notifications
  todayTasks?: Task[];
  pendingTasks?: Task[];
  allTasks?: Task[];
  notifications?: Notification[];
  isTasksLoading?: boolean;
  isNotificationsLoading?: boolean;
  handleTaskStatusChange?: (taskId: string, status: 'pending' | 'inProgress' | 'completed') => void;
  handleMarkNotificationRead?: (notificationId: string) => void;
  refreshTasks?: () => void;
  // Events props
  events?: any[];
  isEventsLoading?: boolean;
  // Inactive patients
  inactivePatients?: any[];
}

export function DashboardStats({
  user,
  dashboardStats,
  isStatsLoading,
  activityLogs,
  totalActivityLogs,
  isActivityLoading,
  activitySearchTerm,
  setActivitySearchTerm,
  activityTimeFilter,
  setActivityTimeFilter,
  activityCurrentPage,
  setActivityCurrentPage,
  activityTotalPages,
  activitiesPerPage,
  todayMilestones,
  isTodayMilestonesLoading,
  handleDeleteMilestone,
  handlePatientSelect,
  handleDeleteActivityLog,
  i18n,
  t,
  // New props for tasks and notifications
  todayTasks = [],
  pendingTasks = [],
  allTasks = [],
  notifications = [],
  isTasksLoading = false,
  isNotificationsLoading = false,
  handleTaskStatusChange,
  handleMarkNotificationRead,
  refreshTasks,
  // Events props
  events = [],
  isEventsLoading = false,
  // Inactive patients
  inactivePatients = []
}: DashboardStatsProps) {
  const { showConfirm, DialogComponent } = useCustomDialog();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'notifications' | 'todayTasks' | 'pendingTasks' | 'milestones' | 'upcomingMeetings' | 'inactiveCases'>('notifications');
  
  // Task filter state
  const [taskFilter, setTaskFilter] = useState<'all' | 'today'>('all');
  
  // Create task state
  const [showCreateTaskForm, setShowCreateTaskForm] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [createTaskError, setCreateTaskError] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    dueDate: ''
  });
  const translateTaskStatus = (status: string) => {
    const statusTranslations: { [key: string]: string } = {
      'pending': i18n.language === 'he' ? 'ממתין' : 'Pending',
      'inProgress': i18n.language === 'he' ? 'בתהליך' : 'In Progress',
      'completed': i18n.language === 'he' ? 'הושלם' : 'Completed',
      'overdue': i18n.language === 'he' ? 'איחור' : 'Overdue'
    };
    
    return statusTranslations[status] || status;
  };

  const translateActivityAction = (action: string) => {
    const actionTranslations: { [key: string]: string } = {
      // Original translations
      'Patient created': i18n.language === 'he' ? 'מטופל נוצר' : 'Patient Created',
      'Patient updated': i18n.language === 'he' ? 'מטופל עודכן' : 'Patient Updated',
      'Patient deleted': i18n.language === 'he' ? 'מטופל נמחק' : 'Patient Deleted',
      'Event created': i18n.language === 'he' ? 'אירוע נוצר' : 'Event Created',
      'Event updated': i18n.language === 'he' ? 'אירוע עודכן' : 'Event Updated',
      'Event deleted': i18n.language === 'he' ? 'אירוע נמחק' : 'Event Deleted',
      'Event archived': i18n.language === 'he' ? 'אירוע נשמר בארכיון' : 'Event Archived',
      'Event unarchived': i18n.language === 'he' ? 'אירוע הוצא מהארכיון' : 'Event Unarchived',
      'Milestone created': i18n.language === 'he' ? 'אבן דרך נוצרה' : 'Milestone Created',
      'Milestone updated': i18n.language === 'he' ? 'אבן דרך עודכנה' : 'Milestone Updated',
      'Milestone deleted': i18n.language === 'he' ? 'אבן דרך נמחקה' : 'Milestone Deleted',
      'Milestone progress updated': i18n.language === 'he' ? 'התקדמות אבן דרך עודכנה' : 'Milestone Progress Updated',
      'Milestone status updated': i18n.language === 'he' ? 'סטטוס אבן דרך עודכן' : 'Milestone Status Updated',
      'User logged in': i18n.language === 'he' ? 'משתמש התחבר' : 'User Logged In',
      'User logged out': i18n.language === 'he' ? 'משתמש התנתק' : 'User Logged Out',
      'User created': i18n.language === 'he' ? 'משתמש נוצר' : 'User Created',
      'User updated': i18n.language === 'he' ? 'משתמש עודכן' : 'User Updated',
      'User deleted': i18n.language === 'he' ? 'משתמש נמחק' : 'User Deleted',
      'Meeting created': i18n.language === 'he' ? 'פגישה נוצרה' : 'Meeting Created',
      'Meeting updated': i18n.language === 'he' ? 'פגישה עודכנה' : 'Meeting Updated',
      'Meeting deleted': i18n.language === 'he' ? 'פגישה נמחקה' : 'Meeting Deleted',
      'Document uploaded': i18n.language === 'he' ? 'מסמך הועלה' : 'Document Uploaded',
      'Document deleted': i18n.language === 'he' ? 'מסמך נמחק' : 'Document Deleted',
      'Notes updated': i18n.language === 'he' ? 'הערות עודכנו' : 'Notes Updated',
      
      // Hardcoded strings from database
      'Patient case created': i18n.language === 'he' ? 'מקרה מטופל נוצר' : 'Patient Case Created',
      'Patient notes updated': i18n.language === 'he' ? 'הערות מטופל עודכנו' : 'Patient Notes Updated',
      'Patient information updated': i18n.language === 'he' ? 'מידע מטופל עודכן' : 'Patient Information Updated',
      'Patient case deleted from system': i18n.language === 'he' ? 'מקרה מטופל נמחק מהמערכת' : 'Patient Case Deleted from System',
      'Event "היכרות עם המערכת" deleted': i18n.language === 'he' ? 'אירוע נמחק' : 'Event Deleted',
      'Event "היכרות עם דנה" deleted': i18n.language === 'he' ? 'אירוע נמחק' : 'Event Deleted',
      'Event "פגישה בנושא טיפול מתקדם" deleted': i18n.language === 'he' ? 'אירוע נמחק' : 'Event Deleted',
      'updated': i18n.language === 'he' ? 'עודכן' : 'Updated',
      'case_deleted': i18n.language === 'he' ? 'מקרה נמחק' : 'Case Deleted',
      'event_deleted': i18n.language === 'he' ? 'אירוע נמחק' : 'Event Deleted',
      'case_created': i18n.language === 'he' ? 'מקרה מטופל נוצר' : 'Patient Case Created',
      'dashboard.updated': i18n.language === 'he' ? 'עודכן' : 'Updated',
      'dashboard.caseDeleted': i18n.language === 'he' ? 'מקרה נמחק' : 'Case Deleted',
      'dashboard.eventDeleted': i18n.language === 'he' ? 'אירוע נמחק' : 'Event Deleted',
      'dashboard.patientCaseCreated': i18n.language === 'he' ? 'מקרה מטופל נוצר' : 'Patient Case Created',
      'dashboard.patientNotesUpdated': i18n.language === 'he' ? 'הערות מטופל עודכנו' : 'Patient Notes Updated',
      'dashboard.patientInformationUpdated': i18n.language === 'he' ? 'מידע מטופל עודכן' : 'Patient Information Updated',
      'dashboard.patientCaseDeleted': i18n.language === 'he' ? 'מקרה מטופל נמחק מהמערכת' : 'Patient Case Deleted from System',
      
      // Additional hardcoded strings found in logs
      'Event "Test 2" deleted': i18n.language === 'he' ? 'אירוע נמחק' : 'Event Deleted',
      'Event "test 3" deleted': i18n.language === 'he' ? 'אירוע נמחק' : 'Event Deleted',
      'removed': i18n.language === 'he' ? 'הוסר' : 'Removed',
      'Document removed from patient record: 28.9.25_-_SocioSync.docx': i18n.language === 'he' ? 'מסמך הוסר מרשומת המטופל' : 'Document Removed from Patient Record',
      'meeting': i18n.language === 'he' ? 'פגישה' : 'Meeting',
      'Meeting: Third test - Test': i18n.language === 'he' ? 'פגישה: בדיקה שלישית - בדיקה' : 'Meeting: Third test - Test',
      'Meeting: Second meeting - Second test': i18n.language === 'he' ? 'פגישה: פגישה שנייה - בדיקה שנייה' : 'Meeting: Second meeting - Second test',
      'Meeting: First meeting - First test': i18n.language === 'he' ? 'פגישה: פגישה ראשונה - בדיקה ראשונה' : 'Meeting: First meeting - First test'
    };
    
    return actionTranslations[action] || action;
  };

  return (
    <div className="dashboard-stats">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📁</div>
          <div className="stat-content">
            <div className="stat-number">{dashboardStats.inactiveCases}</div>
            <div className="stat-label">{t('dashboard.inactiveCases')}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-number">{dashboardStats.treatmentCompletionPercentage}%</div>
            <div className="stat-label">{t('dashboard.treatmentCompletion')}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">👤</div>
          <div className="stat-content">
            <div className="stat-number">{dashboardStats.recentlyUpdatedPatients}</div>
            <div className="stat-label">{t('dashboard.recentlyUpdatedPatients')}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-number">{dashboardStats.totalCases}</div>
            <div className="stat-label">{t('dashboard.totalCases')}</div>
          </div>
        </div>
      </div>
      
      {/* Tabbed Dashboard Interface */}
      <div style={{ 
        marginBottom: '20px',
        padding: '0 20px'
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            borderBottom: '2px solid #e9ecef',
            marginBottom: '20px',
            gap: '0'
          }}>
            <button
              onClick={() => setActiveTab('notifications')}
              style={{
                padding: '12px 20px',
                border: 'none',
                backgroundColor: activeTab === 'notifications' ? '#007acc' : 'transparent',
                color: activeTab === 'notifications' ? 'white' : '#666',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>🔔</span>
              {t('dashboard.recentActivities')}
              {activityLogs.length > 0 && (
                <span style={{
                  backgroundColor: '#007acc',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  {activityLogs.length}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('todayTasks')}
              style={{
                padding: '12px 20px',
                border: 'none',
                backgroundColor: activeTab === 'todayTasks' ? '#007acc' : 'transparent',
                color: activeTab === 'todayTasks' ? 'white' : '#666',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>📋</span>
              {t('dashboard.todayTasks')}
              {todayTasks.length > 0 && (
                <span style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  {todayTasks.length}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('milestones')}
              style={{
                padding: '12px 20px',
                border: 'none',
                backgroundColor: activeTab === 'milestones' ? '#007acc' : 'transparent',
                color: activeTab === 'milestones' ? 'white' : '#666',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>🎯</span>
              {t('navigation.todayMilestones')}
              {todayMilestones.length > 0 && (
                <span style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  {todayMilestones.length}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('upcomingMeetings')}
              style={{
                padding: '12px 20px',
                border: 'none',
                backgroundColor: activeTab === 'upcomingMeetings' ? '#007acc' : 'transparent',
                color: activeTab === 'upcomingMeetings' ? 'white' : '#666',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>📅</span>
              {t('dashboard.upcomingMeetings')}
              {dashboardStats.upcomingMeetings > 0 && (
                <span style={{
                  backgroundColor: '#007acc',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  {dashboardStats.upcomingMeetings}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('inactiveCases')}
              style={{
                padding: '12px 20px',
                border: 'none',
                backgroundColor: activeTab === 'inactiveCases' ? '#007acc' : 'transparent',
                color: activeTab === 'inactiveCases' ? 'white' : '#666',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <span>📁</span>
              {t('dashboard.inactiveCases')}
              {dashboardStats.inactiveCases > 0 && (
                <span style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  {dashboardStats.inactiveCases}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ minHeight: '400px' }}>
            {/* Notifications Tab - Using Recent Activities */}
            {activeTab === 'notifications' && (
              <div>
                <h3 style={{ marginBottom: '15px', color: '#333', display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '8px' }}>🔔</span>
                  {t('dashboard.recentActivities')}
                </h3>
                
                {/* Filter Controls */}
                <div style={{ 
                  marginBottom: '20px', 
                  display: 'flex', 
                  gap: '10px', 
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}>
                  <input
                    type="text"
                    placeholder={t('dashboard.searchActivities')}
                    value={activitySearchTerm}
                    onChange={(e) => setActivitySearchTerm(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px',
                      minWidth: '200px',
                      flex: '1'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setActivityTimeFilter('all')}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        backgroundColor: activityTimeFilter === 'all' ? '#007acc' : 'white',
                        color: activityTimeFilter === 'all' ? 'white' : '#666',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {t('dashboard.allTime')}
                    </button>
                    <button
                      onClick={() => setActivityTimeFilter('today')}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        backgroundColor: activityTimeFilter === 'today' ? '#007acc' : 'white',
                        color: activityTimeFilter === 'today' ? 'white' : '#666',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {t('dashboard.today')}
                    </button>
                    <button
                      onClick={() => setActivityTimeFilter('lastWeek')}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        backgroundColor: activityTimeFilter === 'lastWeek' ? '#007acc' : 'white',
                        color: activityTimeFilter === 'lastWeek' ? 'white' : '#666',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {t('dashboard.lastWeek')}
                    </button>
                    <button
                      onClick={() => setActivityTimeFilter('lastMonth')}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        backgroundColor: activityTimeFilter === 'lastMonth' ? '#007acc' : 'white',
                        color: activityTimeFilter === 'lastMonth' ? 'white' : '#666',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      {t('dashboard.lastMonth')}
                    </button>
                  </div>
                </div>
                {isActivityLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '18px', color: '#666666' }}>
                      {i18n.language === 'he' ? 'טוען פעילויות...' : 'Loading activities...'}
                    </div>
                  </div>
                ) : activityLogs.length > 0 ? (
                  <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    {activityLogs.map((log) => (
                      <div
                        key={log.id}
                        style={{
                          padding: '15px',
                          border: '1px solid #e9ecef',
                          borderRadius: '8px',
                          marginBottom: '12px',
                          backgroundColor: 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => {
                          if (log.caseId) {
                            handlePatientSelect(log.caseId);
                          } else {
                            showConfirm(
                              i18n.language === 'he' 
                                ? 'מזהה מקרה לא נמצא. האם ברצונך להסיר את רשומת הפעילות הזו?' 
                                : 'Patient CASE not found. Do you want to remove this activity log?',
                              () => {
                                if (handleDeleteActivityLog) {
                                  handleDeleteActivityLog(log.id);
                                }
                              }
                            );
                          }
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8f9fa';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: '600', 
                          color: '#333',
                          marginBottom: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>{translateActivityAction(log.action)}</span>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {!log.caseId && (
                              <span style={{
                                backgroundColor: '#dc3545',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '8px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                              }}
                              title={i18n.language === 'he' ? 'לחץ להסרה' : 'Click to remove'}
                              >
                                {i18n.language === 'he' ? 'להסיר' : 'REMOVE'}
                              </span>
                            )}
                            <span style={{
                              backgroundColor: '#007acc',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 'bold'
                            }}>
                              {i18n.language === 'he' ? 'פעילות' : 'ACTIVITY'}
                            </span>
                          </div>
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#999',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span>
                            {log.timestamp && typeof log.timestamp === 'object' && log.timestamp.toDate 
                              ? log.timestamp.toDate().toLocaleString('en-GB')
                              : log.timestamp 
                                ? new Date(log.timestamp).toLocaleString('en-GB')
                                : 'N/A'
                            }
                          </span>
                          <span style={{ color: '#007acc', fontWeight: '500' }}>
                            👤 {log.userEmail || log.createdBy || t('unknownUser')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6c757d' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                    <h4 style={{ color: '#000000', marginBottom: '8px' }}>{t('dashboard.noNotifications')}</h4>
                  </div>
                )}
              </div>
            )}


            {/* Today's Tasks Tab */}
            {activeTab === 'todayTasks' && (
              <div>
                <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ color: '#333', display: 'flex', alignItems: 'center', margin: 0 }}>
                    <span style={{ marginRight: '8px' }}>📋</span>
                    {t('dashboard.todayTasks')}
                  </h3>
                  <button
                    onClick={() => setShowCreateTaskForm(true)}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#218838';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#28a745';
                    }}
                  >
                    <span>+</span>
                    {i18n.language === 'he' ? 'הוסף משימה' : 'Add Task'}
                  </button>
                </div>
                
                {/* Filter Buttons */}
                <div style={{ 
                  marginBottom: '20px', 
                  display: 'flex', 
                  gap: '8px',
                  alignItems: 'center'
                }}>
                  <button
                    onClick={() => setTaskFilter('all')}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      backgroundColor: taskFilter === 'all' ? '#007acc' : 'white',
                      color: taskFilter === 'all' ? 'white' : '#666',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {i18n.language === 'he' ? 'הכל' : 'All'}
                  </button>
                  <button
                    onClick={() => setTaskFilter('today')}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      backgroundColor: taskFilter === 'today' ? '#007acc' : 'white',
                      color: taskFilter === 'today' ? 'white' : '#666',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {i18n.language === 'he' ? 'משימות שצריך לעשות היום' : 'Today'}
                  </button>
                </div>
                {isTasksLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '18px', color: '#666666' }}>
                      {i18n.language === 'he' ? 'טוען משימות...' : 'Loading tasks...'}
                    </div>
                  </div>
                ) : (allTasks.length > 0 || todayTasks.length > 0) ? (
                  <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    {(allTasks.length > 0 ? allTasks : todayTasks)
                      .filter(task => {
                        // Always remove completed tasks from the list
                        if (task.status === 'completed') return false;
                        
                        if (taskFilter === 'all') return true;
                        if (taskFilter === 'today') {
                          if (!task.dueDate) return false;
                          const today = new Date();
                          const todayString = today.toISOString().split('T')[0];
                          const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
                          return taskDate === todayString;
                        }
                        return true;
                      })
                      .sort((a, b) => {
                        // Sort by createdAt descending (newest first)
                        const aDate = new Date(a.createdAt || 0).getTime();
                        const bDate = new Date(b.createdAt || 0).getTime();
                        return bDate - aDate;
                      })
                      .map((task) => (
                      <div
                        key={task.id}
                        style={{
                          padding: '15px',
                          border: '1px solid #e9ecef',
                          borderRadius: '8px',
                          marginBottom: '12px',
                          backgroundColor: 'white',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8f9fa';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '10px'
                        }}>
                          <div style={{ 
                            fontSize: '16px', 
                            fontWeight: '600', 
                            color: '#333',
                            flex: 1
                          }}>
                            {task.title}
                          </div>
                          <div style={{ 
                            fontSize: '11px', 
                            fontWeight: '500',
                            backgroundColor: task.status === 'overdue' ? '#dc3545' : 
                            task.priority === 'urgent' ? '#dc3545' : 
                            task.priority === 'high' ? '#fd7e14' : 
                            task.priority === 'medium' ? '#ffc107' : '#28a745',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            marginLeft: '10px'
                          }}>
                            {task.status === 'overdue' ? t('dashboard.overdue') : 
                            task.priority === 'urgent' ? t('dashboard.urgent') : 
                            task.priority === 'high' ? t('dashboard.highPriority') : 
                            task.priority === 'medium' ? t('dashboard.mediumPriority') : t('dashboard.lowPriority')}
                          </div>
                        </div>
                        
                        <div style={{ 
                          fontSize: '14px', 
                          color: '#666',
                          marginBottom: '8px'
                        }}>
                          {task.description}
                        </div>
                        
                        <div style={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12px',
                          color: '#6c757d'
                        }}>
                          <span>{t('dashboard.dueDate')}: {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB') : 'N/A'}</span>
                          <span>{t('dashboard.taskStatus')}: {translateTaskStatus(task.status)}</span>
                        </div>
                        
                        {handleTaskStatusChange && task.status !== 'completed' && (
                          <div style={{ marginTop: '10px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskStatusChange(task.id, 'completed');
                              }}
                              style={{
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#218838';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#28a745';
                              }}
                            >
                              {t('dashboard.markAsDone')}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6c757d' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                    <h4 style={{ color: '#000000', marginBottom: '8px' }}>{t('dashboard.noTodayTasks')}</h4>
                  </div>
                )}
                
                {/* Create Task Form Modal */}
                {showCreateTaskForm && (
                  <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                  }}>
                    <div style={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      width: '90%',
                      maxWidth: '500px',
                      maxHeight: '80vh',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      {/* Fixed Header: Title and Close Button on same row */}
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '20px 24px 15px 24px',
                        borderBottom: '1px solid #e9ecef',
                        background: 'white',
                        borderRadius: '12px 12px 0 0',
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        direction: i18n.language === 'he' ? 'rtl' : 'ltr'
                      }}>
                        <h3 style={{ 
                          margin: 0,
                          color: '#333',
                          textAlign: 'center',
                          flex: 1
                        }}>
                          {i18n.language === 'he' ? 'הוסף משימה חדשה' : 'Add New Task'}
                        </h3>
                        <button
                          onClick={() => {
                            setShowCreateTaskForm(false);
                            setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' });
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: '#666',
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                            e.currentTarget.style.color = '#000';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#666';
                          }}
                          title={i18n.language === 'he' ? 'סגור' : 'Close'}
                        >
                          ×
                        </button>
                      </div>
                      
                      {/* Scrollable Content */}
                      <div style={{
                        padding: '24px',
                        overflowY: 'auto',
                        flex: 1
                      }}>
                      
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        setIsCreatingTask(true);
                        setCreateTaskError(null);
                        
                        try {
                          console.log('Creating task with data:', {
                            title: newTask.title,
                            description: newTask.description,
                            priority: newTask.priority,
                            dueDate: newTask.dueDate,
                            createdBy: user.email
                          });
                          
                          const result = await createTask({
                            title: newTask.title,
                            description: newTask.description,
                            priority: newTask.priority,
                            dueDate: newTask.dueDate || undefined
                          }, user.email);
                          
                          console.log('Create task result:', result);
                          
                          if (result.success) {
                            console.log('Task created successfully:', result.taskId);
                            setShowCreateTaskForm(false);
                            setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' });
                            // Switch to showing all tasks tab and refresh
                            setActiveTab('todayTasks');
                            setTaskFilter('all');
                            // Refresh the tasks list
                            if (refreshTasks) {
                              refreshTasks();
                            }
                          } else {
                            setCreateTaskError(i18n.language === 'he' ? 'שגיאה ביצירת המשימה' : 'Error creating task');
                          }
                        } catch (error) {
                          console.error('Error creating task:', error);
                          setCreateTaskError(i18n.language === 'he' ? 'שגיאה ביצירת המשימה' : 'Error creating task');
                        } finally {
                          setIsCreatingTask(false);
                        }
                      }}>
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                            {i18n.language === 'he' ? 'כותרת המשימה' : 'Task Title'} *
                          </label>
                          <input
                            type="text"
                            value={newTask.title}
                            onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                            placeholder={i18n.language === 'he' ? 'הכנס כותרת למשימה' : 'Enter task title'}
                            required
                            style={{
                              width: '100%',
                              padding: '12px',
                              border: '1px solid #ddd',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          />
                        </div>
                        
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                            {i18n.language === 'he' ? 'תיאור' : 'Description'}
                          </label>
                          <textarea
                            value={newTask.description}
                            onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                            placeholder={i18n.language === 'he' ? 'הכנס תיאור למשימה' : 'Enter task description'}
                            rows={3}
                            style={{
                              width: '100%',
                              padding: '12px',
                              border: '1px solid #ddd',
                              borderRadius: '6px',
                              fontSize: '14px',
                              resize: 'vertical'
                            }}
                          />
                        </div>
                        
                        <div style={{ marginBottom: '16px' }}>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                            {i18n.language === 'he' ? 'תאריך יעד' : 'Due Date'}
                          </label>
                          <div style={{ position: 'relative', width: '100%' }}>
                            <input
                              type="date"
                              value={newTask.dueDate}
                              onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))}
                              style={{
                                width: '100%',
                                padding: '12px',
                                paddingRight: i18n.language === 'he' ? '12px' : '40px',
                                paddingLeft: i18n.language === 'he' ? '40px' : '12px',
                                border: '1px solid #ddd',
                                borderRadius: '6px',
                                fontSize: '14px',
                                cursor: 'pointer'
                              }}
                              onClick={() => {
                                const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
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
                              title={i18n.language === 'he' ? 'תאריך יעד' : 'Due Date'}
                            >
                              📅
                            </span>
                          </div>
                        </div>
                        
                        <div style={{ marginBottom: '20px' }}>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
                            {i18n.language === 'he' ? 'עדיפות' : 'Priority'}
                          </label>
                          <select
                            value={newTask.priority}
                            onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' }))}
                            style={{
                              width: '100%',
                              padding: '12px',
                              border: '1px solid #ddd',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          >
                            <option value="low">{i18n.language === 'he' ? 'נמוכה' : 'Low'}</option>
                            <option value="medium">{i18n.language === 'he' ? 'בינונית' : 'Medium'}</option>
                            <option value="high">{i18n.language === 'he' ? 'גבוהה' : 'High'}</option>
                            <option value="urgent">{i18n.language === 'he' ? 'דחוף' : 'Urgent'}</option>
                          </select>
                        </div>
                        
                        {/* Error Message */}
                        {createTaskError && (
                          <div style={{
                            marginBottom: '16px',
                            padding: '12px',
                            backgroundColor: '#f8d7da',
                            color: '#721c24',
                            border: '1px solid #f5c6cb',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}>
                            {createTaskError}
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                          <button
                            type="submit"
                            disabled={isCreatingTask}
                            style={{
                              padding: '10px 20px',
                              border: 'none',
                              borderRadius: '6px',
                              backgroundColor: isCreatingTask ? '#6c757d' : '#28a745',
                              color: 'white',
                              cursor: isCreatingTask ? 'not-allowed' : 'pointer',
                              fontSize: '14px',
                              fontWeight: '500',
                              opacity: isCreatingTask ? 0.7 : 1
                            }}
                          >
                            {isCreatingTask 
                              ? (i18n.language === 'he' ? 'יוצר...' : 'Creating...') 
                              : (i18n.language === 'he' ? 'צור משימה' : 'Create Task')
                            }
                          </button>
                        </div>
                      </form>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Pending Tasks Tab */}
            {activeTab === 'pendingTasks' && (
              <div>
                <h3 style={{ marginBottom: '15px', color: '#333', display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '8px' }}>⏳</span>
                  {t('dashboard.pendingTasks')}
                </h3>
                {isTasksLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '18px', color: '#666666' }}>
                      {i18n.language === 'he' ? 'טוען משימות...' : 'Loading tasks...'}
                    </div>
                  </div>
                ) : pendingTasks.length > 0 ? (
                  <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    {pendingTasks.map((task) => (
                      <div
                        key={task.id}
                        style={{
                          padding: '15px',
                          border: '1px solid #e9ecef',
                          borderRadius: '8px',
                          marginBottom: '12px',
                          backgroundColor: task.status === 'overdue' ? '#fff5f5' : 'white',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = task.status === 'overdue' ? '#ffe6e6' : '#f8f9fa';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = task.status === 'overdue' ? '#fff5f5' : 'white';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '10px'
                        }}>
                          <div style={{ 
                            fontSize: '16px', 
                            fontWeight: '600', 
                            color: task.status === 'overdue' ? '#dc3545' : '#333',
                            flex: 1
                          }}>
                            {task.title}
                          </div>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '500',
                            backgroundColor: task.status === 'overdue' ? '#dc3545' : 
                                             task.priority === 'urgent' ? '#dc3545' : 
                                             task.priority === 'high' ? '#fd7e14' : 
                                             task.priority === 'medium' ? '#ffc107' : '#28a745',
                            color: 'white'
                          }}>
                            {task.status === 'overdue' ? t('dashboard.overdue') :
                             task.priority === 'urgent' ? t('dashboard.urgent') :
                             task.priority === 'high' ? t('dashboard.highPriority') :
                             task.priority === 'medium' ? t('dashboard.mediumPriority') : t('dashboard.lowPriority')}
                          </span>
                        </div>
                        {task.description && (
                          <div style={{ 
                            fontSize: '14px', 
                            color: '#666',
                            marginBottom: '10px',
                            lineHeight: '1.4'
                          }}>
                            {task.description}
                          </div>
                        )}
                        <div style={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#999',
                            display: 'flex',
                            gap: '12px'
                          }}>
                            {task.patientName && (
                              <span style={{ color: '#007acc', fontWeight: '500' }}>
                                👤 {task.patientName}
                              </span>
                            )}
                            {task.dueDate && (
                              <span>
                                📅 {new Date(task.dueDate).toLocaleDateString('en-GB')}
                              </span>
                            )}
                          </div>
                          {handleTaskStatusChange && (
                            <button
                              style={{
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                fontWeight: '500'
                              }}
                              onClick={() => handleTaskStatusChange(task.id, 'inProgress')}
                            >
                              {t('dashboard.inProgress')}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6c757d' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                    <h4 style={{ color: '#000000', marginBottom: '8px' }}>{i18n.language === 'he' ? 'תיקים לא מעודכנים' : 'Inactive cases'}</h4>
                  </div>
                )}
              </div>
            )}

            {/* Milestones Tab */}
            {activeTab === 'milestones' && (
              <div>
                <h3 style={{ marginBottom: '15px', color: '#333', display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '8px' }}>🎯</span>
                  {t('navigation.todayMilestones')}
                </h3>
          {isTodayMilestonesLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '18px', color: '#666666' }}>
                {i18n.language === 'he' ? 'טוען אבני דרך...' : 'Loading milestones...'}
              </div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '15px'
            }}>
                    {todayMilestones.map((milestone) => (
                <div
                  key={milestone.id}
                  style={{
                    background: 'white',
                    border: '2px solid #e9ecef',
                    borderRadius: '12px',
                    padding: '15px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#007acc';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e9ecef';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                  }}
                  onClick={() => handlePatientSelect(milestone.caseId)}
                >
                              {/* Status Badge */}
                              <div style={{
                                position: 'absolute',
                                top: '8px',
                                left: i18n.language === 'he' ? '8px' : 'auto',
                                right: i18n.language === 'he' ? 'auto' : '8px',
                                zIndex: 10
                              }}>
                                <span style={{
                                  padding: '3px 6px',
                                  borderRadius: '8px',
                                  fontSize: '10px',
                                  fontWeight: '500',
                                  backgroundColor: milestone.status === 'critical' ? '#dc3545' : 
                                                 milestone.status === 'medium' ? '#ffc107' : 
                                                 milestone.status === 'easy' ? '#28a745' : '#007acc',
                                  color: 'white'
                                }}>
                                  {milestone.status === 'new' ? t('patientDetail.statusNew') :
                                   milestone.status === 'easy' ? t('patientDetail.statusEasy') :
                                   milestone.status === 'medium' ? t('patientDetail.statusMedium') :
                                   milestone.status === 'critical' ? t('patientDetail.statusCritical') : milestone.status}
                                </span>
                              </div>

                  {/* Milestone Title */}
                  <h4 style={{ 
                    color: '#000000', 
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    paddingLeft: i18n.language === 'he' ? '30px' : '0px',
                    paddingRight: i18n.language === 'he' ? '0px' : '30px',
                    textAlign: i18n.language === 'he' ? 'right' : 'left',
                    direction: i18n.language === 'he' ? 'rtl' : 'ltr'
                  }}>
                    {milestone.title}
                  </h4>

                  {/* Case ID */}
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#007acc',
                    marginBottom: '8px',
                    fontWeight: '500'
                  }}>
                    {milestone.caseId}
                  </div>

                  {/* Progress - Same style as edit dialog */}
                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ color: '#000000', display: 'block', marginBottom: '5px', fontSize: '12px' }}>{t('patientDetail.progress')}</label>
                    <div style={{ display: 'flex', gap: '2px', marginBottom: '10px' }}>
                      {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((value) => (
                        <div
                          key={value}
                          style={{
                            flex: 1,
                            height: '30px',
                            backgroundColor: milestone.progress >= value ? '#007acc' : '#e9ecef',
                            cursor: 'default',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            color: milestone.progress >= value ? 'white' : '#666',
                            borderRadius: value === 0 ? '4px 0 0 4px' : value === 100 ? '0 4px 4px 0' : '0',
                            transition: 'background-color 0.2s ease'
                          }}
                        >
                          {value}
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
                      {t('patientDetail.currentProgress')}: {milestone.progress}%
                    </div>
                  </div>

                  {/* Created Date */}
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#6c757d',
                    borderTop: '1px solid #e9ecef',
                    paddingTop: '8px',
                    marginBottom: '8px'
                  }}>
                    {i18n.language === 'he' ? (
                      <>
                        {new Date(milestone.createdAt).toLocaleDateString('en-GB')} : {t('patientDetail.created')}
                      </>
                    ) : (
                      <>
                        {t('patientDetail.created')}: {new Date(milestone.createdAt).toLocaleDateString('en-GB')}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {todayMilestones.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#6c757d',
                  gridColumn: '1 / -1'
                }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
                  <h4 style={{ color: '#000000', marginBottom: '8px' }}>{t('patientDetail.noMilestonesToday')}</h4>
                </div>
              )}
            </div>
          )}
        </div>
            )}
            
            {/* Upcoming Meetings Tab */}
            {activeTab === 'upcomingMeetings' && (
              <div>
                <h3 style={{ marginBottom: '15px', color: '#333', display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '8px' }}>📅</span>
                  {t('dashboard.upcomingMeetings')}
                </h3>
                {isEventsLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '18px', color: '#666666' }}>
                      {i18n.language === 'he' ? 'טוען פגישות...' : 'Loading meetings...'}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '15px'
                  }}>
                    {events
                      .filter(event => {
                        if (!event.date) return false;
                        const eventDate = event.date.toDate ? event.date.toDate() : new Date(event.date);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return eventDate >= today;
                      })
                      .sort((a, b) => {
                        const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
                        const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
                        return dateA.getTime() - dateB.getTime(); // Ascending order (closest first)
                      })
                      .map((event) => (
                        <div
                          key={event.id}
                          style={{
                            backgroundColor: 'white',
                            border: '1px solid #e9ecef',
                            borderRadius: '8px',
                            padding: '16px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                          }}
                          onClick={() => {
                            if (event.caseId) {
                              handlePatientSelect(event.caseId);
                            }
                          }}
                        >
                          {/* Event Title */}
                          <div style={{ 
                            fontSize: '16px', 
                            fontWeight: '600', 
                            color: '#333',
                            marginBottom: '8px'
                          }}>
                            {event.title}
                          </div>

                          {/* Event Description */}
                          {event.description && (
                            <div style={{ 
                              fontSize: '14px', 
                              color: '#666',
                              marginBottom: '12px',
                              lineHeight: '1.4'
                            }}>
                              {event.description.length > 100 
                                ? `${event.description.substring(0, 100)}...` 
                                : event.description
                              }
                            </div>
                          )}

                          {/* Patient Info */}
                          <div style={{ marginBottom: '12px' }}>
                            {event.patient ? (
                              <div style={{ 
                                fontSize: '14px', 
                                color: '#007acc',
                                fontWeight: '500'
                              }}>
                                👤 {event.patient.firstName} {event.patient.lastName}
                              </div>
                            ) : (
                              <div style={{ 
                                fontSize: '14px', 
                                color: '#dc3545',
                                fontWeight: '500'
                              }}>
                                👤 {i18n.language === 'he' ? 'מטופל לא ידוע' : 'Unknown Patient'}
                              </div>
                            )}
                          </div>

                          {/* Date and Time */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px'
                          }}>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#6c757d',
                              fontWeight: '500'
                            }}>
                              📅 {event.date?.toDate ? event.date.toDate().toLocaleDateString('en-GB') : 'N/A'}
                            </div>
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#6c757d',
                              fontWeight: '500'
                            }}>
                              🕐 {event.date?.toDate ? event.date.toDate().toLocaleTimeString('en-GB', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              }) : 'N/A'}
                            </div>
                          </div>

                          {/* Case ID */}
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#007acc',
                            fontWeight: '500',
                            borderTop: '1px solid #e9ecef',
                            paddingTop: '8px'
                          }}>
                            {event.caseId}
                          </div>
                        </div>
                      ))}
                    {events.filter(event => {
                      if (!event.date) return false;
                      const eventDate = event.date.toDate ? event.date.toDate() : new Date(event.date);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      return eventDate >= today;
                    }).length === 0 && (
                      <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        color: '#6c757d',
                        gridColumn: '1 / -1'
                      }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
                        <h4 style={{ color: '#000000', marginBottom: '8px' }}>
                          {i18n.language === 'he' ? 'אין פגישות קרובות' : 'No upcoming meetings'}
                        </h4>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Inactive Cases Tab */}
            {activeTab === 'inactiveCases' && (
              <div>
                <h3 style={{ marginBottom: '15px', color: '#333', display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '8px' }}>📁</span>
                  {t('dashboard.inactiveCases')}
                </h3>
                {isStatsLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '18px', color: '#666666' }}>
                      {i18n.language === 'he' ? 'טוען תיקים...' : 'Loading cases...'}
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '15px'
                  }}>
                    {inactivePatients.length > 0 ? (
                      inactivePatients.map((patient) => (
                        <div
                          key={patient.id}
                          onClick={() => handlePatientSelect(patient.id)}
                          style={{
                            background: 'white',
                            border: '2px solid #dc3545',
                            borderRadius: '12px',
                            padding: '15px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                          }}
                        >
                          <h4 style={{ 
                            color: '#000000', 
                            marginBottom: '8px',
                            fontSize: '16px',
                            fontWeight: '600',
                            textAlign: i18n.language === 'he' ? 'right' : 'left',
                            direction: i18n.language === 'he' ? 'rtl' : 'ltr'
                          }}>
                            {patient.caseId || patient.id}
                          </h4>
                          <p style={{
                            color: '#666',
                            fontSize: '14px',
                            marginBottom: '8px',
                            textAlign: i18n.language === 'he' ? 'right' : 'left',
                            direction: i18n.language === 'he' ? 'rtl' : 'ltr'
                          }}>
                            <PatientNameDisplay caseId={patient.caseId || patient.id} />
                          </p>
                          {patient.updatedAt && (
                            <p style={{
                              color: '#999',
                              fontSize: '12px',
                              textAlign: i18n.language === 'he' ? 'right' : 'left',
                              direction: i18n.language === 'he' ? 'rtl' : 'ltr'
                            }}>
                              {i18n.language === 'he' ? 'עודכן לאחרונה: ' : 'Last updated: '}
                              {patient.updatedAt.toDate ? 
                                patient.updatedAt.toDate().toLocaleDateString('he-IL') :
                                new Date(patient.updatedAt).toLocaleDateString('he-IL')
                              }
                            </p>
                          )}
                        </div>
                      ))
                    ) : (
                      <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        color: '#6c757d',
                        gridColumn: '1 / -1'
                      }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
                        <h4 style={{ color: '#000000', marginBottom: '8px' }}>
                          {t('dashboard.noInactiveCases')}
                        </h4>
                        <p style={{ fontSize: '14px', color: '#6c757d' }}>
                          {t('dashboard.allCasesUpToDate')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <DialogComponent />
    </div>
  );
}
