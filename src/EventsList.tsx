import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface EventsListProps {
  user: any;
  events: any[];
  eventsStatusFilter: 'active' | 'archived';
  setEventsStatusFilter: (filter: 'active' | 'archived') => void;
  dateRangeFilter: { from: string; to: string };
  setDateRangeFilter: (range: { from: string; to: string }) => void;
  eventSearchTerm: string;
  setEventSearchTerm: (term: string) => void;
  getFilteredEvents: () => any[];
  getPaginatedEvents: () => any[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  openEventDetailsModal: (event: any) => void;
  handleEventStatusChange: (eventId: string, status: 'active' | 'completed' | 'cancelled') => void;
  handleDeleteEvent: (eventId: string) => void;
  handleArchiveEvent: (eventId: string, archived: boolean) => void;
  setShowCreateEventModal: (show: boolean) => void;
}

const EventsList: React.FC<EventsListProps> = ({
  user,
  events,
  eventsStatusFilter,
  setEventsStatusFilter,
  dateRangeFilter,
  setDateRangeFilter,
  eventSearchTerm,
  setEventSearchTerm,
  getFilteredEvents,
  getPaginatedEvents,
  currentPage,
  setCurrentPage,
  totalPages,
  openEventDetailsModal,
  handleEventStatusChange,
  handleDeleteEvent,
  handleArchiveEvent,
  setShowCreateEventModal
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'he';

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [eventsStatusFilter, dateRangeFilter.from, dateRangeFilter.to, eventSearchTerm, setCurrentPage]);
  
  return (
    <div className="events-management-section" style={{ position: 'relative' }}>
      <div className="events-header">
        <h3>{t('events.title')}</h3>
      </div>
      
      <div className="events-filters">
        <div className="events-filter-row">
          
          <div className="events-status-filter">
            <select
              value={eventsStatusFilter}
              onChange={(e) => setEventsStatusFilter(e.target.value as 'active' | 'archived')}
              className="status-select"
            >
              <option value="active">{t('events.filterActive')}</option>
              <option value="archived">{t('events.filterArchived')}</option>
            </select>
          </div>
          
          <div className="events-date-filter" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div className="input-with-icon">
              <span 
                className="field-icon" 
                onClick={() => {
                  const fromInput = document.querySelector('.events-date-filter .input-with-icon:first-child input') as HTMLInputElement;
                  if (fromInput) {
                    fromInput.showPicker();
                  }
                }}
                title="From date"
              >📅</span>
              <input
                type="date"
                value={dateRangeFilter.from}
                onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, from: e.target.value })}
                className="date-picker-input"
                placeholder="From date"
                style={{ width: '140px' }}
              />
            </div>
            <span style={{ color: '#666' }}>→</span>
            <div className="input-with-icon">
              <span 
                className="field-icon" 
                onClick={() => {
                  const toInput = document.querySelector('.events-date-filter .input-with-icon:last-child input') as HTMLInputElement;
                  if (toInput) {
                    toInput.showPicker();
                  }
                }}
                title="To date"
              >📅</span>
              <input
                type="date"
                value={dateRangeFilter.to}
                onChange={(e) => setDateRangeFilter({ ...dateRangeFilter, to: e.target.value })}
                className="date-picker-input"
                placeholder="To date"
                style={{ width: '140px' }}
              />
            </div>
            {(dateRangeFilter.from || dateRangeFilter.to) && (
              <button
                onClick={() => {
                  const today = new Date();
                  const weekAgo = new Date(today);
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  const weekAhead = new Date(today);
                  weekAhead.setDate(weekAhead.getDate() + 7);
                  setDateRangeFilter({
                    from: weekAgo.toISOString().split('T')[0],
                    to: weekAhead.toISOString().split('T')[0]
                  });
                }}
                className="clear-date-btn"
                title="Reset to default (1 week back and forward)"
              >
                ↻
              </button>
            )}
          </div>
          
          <div className="events-search">
            <input
              type="text"
              placeholder={t('events.searchPlaceholder')}
              value={eventSearchTerm}
              onChange={(e) => setEventSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>
      </div>
      
      {getFilteredEvents().length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          <p>{events.length === 0 ? t('events.noEvents') : t('events.noMatch')}</p>
        </div>
      ) : (
        <>
          <div className="events-table-container">
            <table className="events-table">
              <thead>
                <tr>
                  <th>{t('events.title')}</th>
                  <th>{t('events.description')}</th>
                  <th>{t('events.patient')}</th>
                  <th>{t('events.date')}</th>
                  <th>{t('events.time')}</th>
                  <th>{t('events.createdBy')}</th>
                  {user?.role === 'super_admin' && <th>{t('events.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {getPaginatedEvents().map((event) => (
                  <tr 
                    key={event.id} 
                    className="event-row"
                    onClick={() => openEventDetailsModal(event)}
                    style={{ cursor: 'pointer' }}
                    title="Click to view full event details"
                  >
                    <td>
                      <strong>{event.title}</strong>
                    </td>
                    <td>
                      <div className="event-description-cell">
                        <div>
                          {event.description && event.description.length > 50 
                            ? `${event.description.substring(0, 50)}...` 
                            : event.description
                          }
                        </div>
                      </div>
                    </td>
                    <td>
                      {event.patient ? (
                        <div>
                          <div>{event.patient.firstName} {event.patient.lastName}</div>
                        </div>
                      ) : (
                  <span className="patient-unknown">{t('events.unknownPatient')}</span>
                )}
              </td>
              <td>
                {event.date?.toDate ? event.date.toDate().toLocaleDateString('en-GB') : t('events.na')}
              </td>
              <td>
                      {event.date?.toDate ? event.date.toDate().toLocaleTimeString('en-GB', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      }) : t('events.na')}
                    </td>
                    <td>
                      {event.createdByName || t('events.unknownUser')}
                    </td>
                    {user?.role === 'super_admin' && (
                      <td>
                        <div className="event-actions-menu" style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchiveEvent(event.id, !event.archived);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '16px',
                              color: '#007acc',
                              transition: 'background-color 0.2s ease'
                            }}
                            onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
                            onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
                            title={event.archived ? t('events.unarchiveEvent') : t('events.archiveEvent')}
                          >
                            {event.archived ? '📤' : '📦'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="events-pagination">
            <div className="pagination-controls">
              <button 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                {isRTL ? '→' : '←'}
              </button>
              <span className="pagination-current">
                {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                {isRTL ? '←' : '→'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EventsList;
