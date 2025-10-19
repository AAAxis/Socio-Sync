import React from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '../types';

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
  activitiesPerPage
}: DashboardStatsProps) {
  const { t, i18n } = useTranslation();
  
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
          <div className="loading">Loading activities...</div>
        ) : (
          <div className="activity-table-container">
            <table className="activity-table">
              <thead>
                <tr>
                  <th>{t('dashboard.action')}</th>
                  <th>{t('dashboard.note')}</th>
                  <th>{t('dashboard.dateTime')}</th>
                  <th>{t('dashboard.createdBy')}</th>
                </tr>
              </thead>
              <tbody>
                {activityLogs.map((log) => (
                  <tr key={log.id} className="activity-row">
                    <td className="activity-action-cell">{log.action}</td>
                    <td className="activity-note-cell">{log.note}</td>
                    <td className="activity-time-cell">
                      {log.timestamp && typeof log.timestamp === 'object' && log.timestamp.toDate 
                        ? log.timestamp.toDate().toLocaleString()
                        : log.timestamp 
                          ? new Date(log.timestamp).toLocaleString()
                          : 'N/A'
                      }
                    </td>
                    <td className="activity-creator-cell">
                      {log.userEmail || log.createdBy || 'Unknown'}
                    </td>
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
    </div>
  );
}
