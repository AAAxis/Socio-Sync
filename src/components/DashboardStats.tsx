import React from 'react';
import { User } from '../types';
import { useCustomDialog } from './CustomDialog';

interface DashboardStatsProps {
  user: User;
  dashboardStats: {
    totalCases: number;
    totalPatients: number;
    totalUsers: number;
    totalEvents: number;
    totalActivities: number;
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
  t
}: DashboardStatsProps) {
  const { showConfirm, DialogComponent } = useCustomDialog();
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
            <div className="stat-number">{dashboardStats.totalCases}</div>
            <div className="stat-label">{t('dashboard.totalCases')}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-number">{dashboardStats.totalPatients}</div>
            <div className="stat-label">{t('dashboard.totalPatients')}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">👤</div>
          <div className="stat-content">
            <div className="stat-number">{dashboardStats.totalUsers}</div>
            <div className="stat-label">{t('dashboard.totalUsers')}</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-number">{dashboardStats.totalEvents}</div>
            <div className="stat-label">{t('dashboard.totalEvents')}</div>
          </div>
        </div>
      </div>
      
      {/* Today's Milestones Section */}
      <div style={{ 
        marginBottom: '20px',
        padding: '0 20px'
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          overflow: 'auto'
        }}>
          <h3 style={{ marginBottom: '20px', color: '#333' }}>
            {t('navigation.todayMilestones')} - {t('patientDetail.progressMilestones')}
          </h3>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            {todayMilestones.length} {t('patientDetail.milestonesCreatedToday')}
          </div>
          {isTodayMilestonesLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '18px', color: '#666666' }}>
                {i18n.language === 'he' ? 'טוען אבני דרך...' : 'Loading milestones...'}
              </div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '15px'
            }}>
              {todayMilestones.slice(0, 4).map((milestone) => (
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

                  {/* Progress */}
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '6px'
                    }}>
                      <label style={{ 
                        color: '#000000', 
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {t('patientDetail.milestoneProgress')}
                      </label>
                      <span style={{ 
                        color: '#007acc', 
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {milestone.progress}%
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: '#e9ecef',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${milestone.progress}%`,
                        height: '100%',
                        backgroundColor: '#007acc',
                        transition: 'width 0.3s ease'
                      }} />
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
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
                  <h4 style={{ color: '#000000', marginBottom: '8px' }}>{t('patientDetail.noMilestonesToday')}</h4>
                  <p>{t('patientDetail.noMilestonesCreatedToday')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="recent-activities">
        <div className="activities-header">
          <h3>{t('dashboard.recentActivities')}</h3>
          <div className="activity-filters">
            <div className="activity-search-container">
              <input
                type="text"
                placeholder={t('dashboard.searchActivities')}
                value={activitySearchTerm}
                onChange={(e) => setActivitySearchTerm(e.target.value)}
                className="activity-search-input"
              />
              {activitySearchTerm && (
                <button
                  onClick={() => setActivitySearchTerm('')}
                  className="clear-search-btn"
                  title={t('dashboard.clearSearch')}
                >
                  ✕
                </button>
              )}
            </div>
            <select
              value={activityTimeFilter}
              onChange={(e) => setActivityTimeFilter(e.target.value as 'all' | 'today' | 'lastWeek' | 'lastMonth')}
              className="activity-time-filter"
            >
              <option value="all">{t('dashboard.allTime')}</option>
              <option value="today">{t('dashboard.today')}</option>
              <option value="lastWeek">{t('dashboard.lastWeek')}</option>
              <option value="lastMonth">{t('dashboard.lastMonth')}</option>
            </select>
          </div>
        </div>
        {isActivityLoading ? (
          <div className="loading">
            {i18n.language === 'he' ? 'טוען פעילויות...' : 'Loading activities...'}
          </div>
        ) : (
          <div className="activity-table-container">
            <table className="activity-table">
              <thead>
                <tr>
                  <th>{t('dashboard.action')}</th>
                  <th>{t('dashboard.note')}</th>
                  <th>{t('dashboard.dateTime')}</th>
                  <th>{t('dashboard.createdBy')}</th>
                  {user.role === 'super_admin' && <th style={{ width: '60px' }}>{t('dashboard.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {activityLogs.map((log) => (
                  <tr key={log.id} className="activity-row">
                    <td className="activity-action-cell">{translateActivityAction(log.action)}</td>
                    <td className="activity-note-cell">{log.note}</td>
                    <td className="activity-time-cell">
                      {log.timestamp && typeof log.timestamp === 'object' && log.timestamp.toDate 
                        ? log.timestamp.toDate().toLocaleString('en-GB')
                        : log.timestamp 
                          ? new Date(log.timestamp).toLocaleString('en-GB')
                          : 'N/A'
                      }
                    </td>
                    <td className="activity-creator-cell">
                      {log.userEmail || log.createdBy || 'Unknown'}
                    </td>
                    {user.role === 'super_admin' && (
                      <td className="activity-actions-cell" style={{ textAlign: 'center' }}>
                        <button
                          style={{
                            background: 'white',
                            color: '#dc3545',
                            border: '1px solid #dc3545',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '32px',
                            height: '24px'
                          }}
                          onClick={() => {
                            showConfirm(t('patients.confirmDelete'), () => {
                              handleDeleteActivityLog(log.id);
                            });
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                            e.currentTarget.style.borderColor = '#c82333';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.borderColor = '#dc3545';
                          }}
                          title={t('dashboard.deleteActivity')}
                        >
                          🗑️
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {!isActivityLoading && totalActivityLogs > 0 && (
          <div className="activities-pagination">
            <div className="pagination-controls">
              <button
                onClick={() => setActivityCurrentPage(Math.max(1, activityCurrentPage - 1))}
                disabled={activityCurrentPage === 1}
                className="pagination-btn"
              >
                {t('dashboard.isRTL') === 'true' ? '→' : '←'}
              </button>
              <span className="pagination-current">
                {activityCurrentPage} / {activityTotalPages}
              </span>
              <button
                onClick={() => setActivityCurrentPage(Math.min(activityTotalPages, activityCurrentPage + 1))}
                disabled={activityCurrentPage === activityTotalPages}
                className="pagination-btn"
              >
                {t('dashboard.isRTL') === 'true' ? '←' : '→'}
              </button>
            </div>
          </div>
        )}
      </div>
      <DialogComponent />
    </div>
  );
}
