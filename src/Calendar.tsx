import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface CalendarProps {
  user: any;
  events: any[];
  getEventsForDate: (date: Date) => any[];
  getCalendarDays: () => Date[];
  navigateMonth: (direction: 'prev' | 'next') => void;
  currentDate: Date;
  selectedDate: Date | null;
  setSelectedDate: (date: Date) => void;
  switchToListView: (date: Date) => void;
  openEventDetailsModal: (event: any) => void;
  handleEventStatusChange: (eventId: string, status: 'active' | 'completed' | 'cancelled') => void;
  handleSyncSingleEvent: (event: any) => void;
  handleDeleteEvent: (eventId: string) => void;
  setShowCreateEventModal: (show: boolean) => void;
}

const Calendar: React.FC<CalendarProps> = ({
  user,
  events,
  getEventsForDate,
  getCalendarDays,
  navigateMonth,
  currentDate,
  selectedDate,
  setSelectedDate,
  switchToListView,
  openEventDetailsModal,
  handleEventStatusChange,
  handleSyncSingleEvent,
  handleDeleteEvent,
  setShowCreateEventModal
}) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';
  
  // Function to truncate text to 3 words
  const truncateToThreeWords = (text: string): string => {
    const words = text.split(' ');
    if (words.length <= 3) {
      return text;
    }
    return words.slice(0, 3).join(' ') + '...';
  };
  
  return (
    <div style={{ position: 'relative' }}>
      {/* Calendar Navigation */}
      <div className="calendar-navigation">
        <button 
          onClick={() => navigateMonth('prev')}
          className="calendar-nav-btn"
        >
          {isRTL ? '→' : '←'}
        </button>
        <button 
          onClick={() => navigateMonth('next')}
          className="calendar-nav-btn"
        >
          {isRTL ? '←' : '→'}
        </button>
        <h3 className="calendar-month-year">
          {currentDate.toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-GB', { month: 'long', year: 'numeric' })}
        </h3>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {/* Day Headers */}
        <div className="calendar-day-headers">
          {[
            { key: 'sun', label: t('calendar.days.sun') },
            { key: 'mon', label: t('calendar.days.mon') },
            { key: 'tue', label: t('calendar.days.tue') },
            { key: 'wed', label: t('calendar.days.wed') },
            { key: 'thu', label: t('calendar.days.thu') },
            { key: 'fri', label: t('calendar.days.fri') },
            { key: 'sat', label: t('calendar.days.sat') }
          ].map(day => (
            <div key={day.key} className="calendar-day-header">
              {day.label}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="calendar-days">
          {getCalendarDays().map((day, index) => {
            const dayEvents = getEventsForDate(day);
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isToday = day.toDateString() === new Date().toDateString();
            
            // Check if this day is selected (for visual highlighting - no highlighting needed, selection handled by switchToListView)
            const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();

            return (
              <div
                key={index}
                className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => switchToListView(day)}
              >
                <div className="day-number">{day.getDate()}</div>
                {dayEvents.length > 0 && (
                  <div className="day-events">
                    {dayEvents.slice(0, 3).map((event, eventIndex) => (
                      <div
                        key={eventIndex}
                        className={`event-dot ${event.status === 'completed' ? 'completed' : event.status === 'cancelled' ? 'cancelled' : 'active'}`}
                        title={`${event.title} - ${event.status}`}
                      >
                        {truncateToThreeWords(event.title)}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="more-events">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Events */}
      {selectedDate && (
        <div className="selected-date-events">
          <h4>
            Events for {selectedDate.toLocaleDateString('en-GB', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h4>
          <div className="selected-events-list">
            {getEventsForDate(selectedDate).length === 0 ? (
              <p className="no-events">No events scheduled for this date.</p>
            ) : (
              getEventsForDate(selectedDate).map(event => (
                <div key={event.id} className="selected-event-item">
                  <div className="event-time">
                    {event.date?.toDate ? event.date.toDate().toLocaleTimeString('en-GB', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    }) : 'All Day'}
                  </div>
                  <div className="event-details">
                    <div className="event-title">{event.title}</div>
                    <div className="event-description">{event.description}</div>
                    {event.patient && (
                      <div className="event-patient">
                        Patient: {event.patient.firstName} {event.patient.lastName}
                      </div>
                    )}
                  </div>
                  <div className="event-actions">
                    <select
                      value={event.status || 'active'}
                      onChange={(e) => handleEventStatusChange(event.id, e.target.value as 'active' | 'completed' | 'cancelled')}
                      className="event-status-select"
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    {user?.role === 'super_admin' && (
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="delete-event-btn"
                        title="Delete Event"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
