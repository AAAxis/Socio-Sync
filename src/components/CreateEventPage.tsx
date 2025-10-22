import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createEvent, searchPatients } from '../firebase';
import { useCustomDialog } from './CustomDialog';

// Create Event Page Component
export function CreateEventPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { showAlert, DialogComponent } = useCustomDialog();
  const [eventFormData, setEventFormData] = useState({
    title: '',
    description: '',
    caseId: '',
    date: '',
    time: ''
  });
  const [isEventSaving, setIsEventSaving] = useState(false);
  
  // Get selected patient from navigation state
  const [selectedPatient, setSelectedPatient] = useState<any>(location.state?.selectedPatient || null);
  
  // Patient search modal state
  const [showPatientSearchModal, setShowPatientSearchModal] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
  const [isPatientSearching, setIsPatientSearching] = useState(false);
  
  // Get current user from localStorage
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Set RTL direction for Hebrew
  useEffect(() => {
    if (i18n.language === 'he') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'he';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = 'en';
    }
  }, [i18n.language]);
  
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  // Set case ID when patient is selected
  useEffect(() => {
    if (selectedPatient) {
      setEventFormData(prev => ({
        ...prev,
        caseId: selectedPatient.caseId
      }));
    }
  }, [selectedPatient]);

  // Handle patient search
  const handlePatientSearch = async (searchTerm: string) => {
    setPatientSearchTerm(searchTerm);
    
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
  };

  // Handle patient selection
  const handleSelectPatient = (patient: any) => {
    setSelectedPatient(patient);
    setEventFormData(prev => ({
      ...prev,
      caseId: patient.caseId
    }));
    setShowPatientSearchModal(false);
    setPatientSearchTerm('');
    setPatientSearchResults([]);
  };

  const handleEventFormChange = (field: string, value: string) => {
    setEventFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventFormData.title || !eventFormData.description || !eventFormData.caseId || !eventFormData.date || !eventFormData.time) {
      showAlert(t('createEvent.fillAllFields'));
      return;
    }

    try {
      setIsEventSaving(true);
      
      // Combine date and time into a single Date object
      const [hours, minutes] = eventFormData.time.split(':');
      const eventDateTime = new Date(eventFormData.date);
      eventDateTime.setHours(parseInt(hours), parseInt(minutes));
      
      await createEvent({
        title: eventFormData.title,
        description: eventFormData.description,
        caseId: eventFormData.caseId,
        date: eventDateTime,
        type: 'General', // Default type since we removed it from the form
        status: 'active', // Set to active instead of New
        createdBy: currentUser?.id || 'unknown'
      });
      
      navigate('/dashboard');
      showAlert(t('createEvent.eventCreatedSuccess'));
    } catch (error) {
      console.error('Error creating event:', error);
      showAlert(t('createEvent.eventCreatedError'));
    } finally {
      setIsEventSaving(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-title">{t('createEvent.title')}</h2>
          <p className="dashboard-subtitle">{t('createEvent.subtitle')}</p>
        </div>
      </div>
      
      <div className="dashboard-content">
        {!selectedPatient ? (
          <div className="no-patient-selected">
            <h3>{t('createEvent.noPatientSelected')}</h3>
            <p>{t('createEvent.noPatientMessage')}</p>
            <button onClick={() => navigate('/dashboard')} className="back-btn">
              {t('createEvent.backToDashboard')}
            </button>
          </div>
        ) : (
          <div className="create-event-container">
            <div className="selected-patient-info">
              <div className="selected-patient">
                <strong style={{ color: '#333333' }}>{t('createEvent.selectedPatient')}</strong>
                <span style={{ color: '#000000' }}>{selectedPatient.firstName} {selectedPatient.lastName}</span>
                <span className="patient-case-id" style={{ color: '#007acc' }}>{selectedPatient.caseId}</span>
                <button
                  type="button"
                  onClick={() => setShowPatientSearchModal(true)}
                  className="change-patient-btn"
                >
                  {t('createEvent.changePatient')}
                </button>
              </div>
            </div>
            
            <form onSubmit={handleCreateEvent} className="create-event-form">
              <div className="form-group">
                <label>{t('createEvent.eventTitle')} *</label>
                <input
                  type="text"
                  value={eventFormData.title}
                  onChange={(e) => handleEventFormChange('title', e.target.value)}
                  placeholder={t('createEvent.eventTitlePlaceholder')}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>{t('createEvent.eventDate')} *</label>
                <div className="input-with-icon">
                  <span 
                    className="field-icon" 
                    onClick={() => {
                      const dateInput = document.querySelector('.date-picker-input') as HTMLInputElement;
                      if (dateInput) {
                        dateInput.showPicker();
                      }
                    }}
                    title={t('createEvent.eventDate')}
                  >📅</span>
                  <input
                    type="date"
                    className="date-picker-input"
                    value={eventFormData.date}
                    onChange={(e) => handleEventFormChange('date', e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>{t('createEvent.eventTime')} *</label>
                <div className="input-with-icon">
                  <span 
                    className="field-icon" 
                    onClick={() => {
                      const timeInput = document.querySelector('.time-picker-input') as HTMLInputElement;
                      if (timeInput) {
                        timeInput.showPicker();
                      }
                    }}
                    title={t('createEvent.eventTime')}
                  >🕐</span>
                  <input
                    type="time"
                    className="time-picker-input"
                    value={eventFormData.time}
                    onChange={(e) => handleEventFormChange('time', e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>{t('createEvent.description')} *</label>
                <textarea
                  value={eventFormData.description}
                  onChange={(e) => handleEventFormChange('description', e.target.value)}
                  placeholder={t('createEvent.descriptionPlaceholder')}
                  rows={4}
                  required
                />
              </div>
            
              <div className="form-actions">
                <button type="button" onClick={() => navigate('/dashboard')} className="cancel-btn">
                  {t('createEvent.cancel')}
                </button>
                <button type="submit" disabled={isEventSaving} className="submit-btn">
                  {isEventSaving ? t('createEvent.creatingEvent') : t('createEvent.createEvent')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Patient Search Modal */}
      {showPatientSearchModal && (
        <div 
          className="patient-search-modal-overlay" 
          onClick={() => setShowPatientSearchModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
        >
          <div 
            className="patient-search-modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '30px',
              width: '600px',
              maxWidth: '90vw',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="patient-search-modal-header" style={{ marginBottom: '20px' }}>
              <h2 style={{ color: '#000000', margin: 0 }}>{t('events.selectPatient')}</h2>
            </div>
            <div className="patient-search-modal-body">
              <div className="search-input-container" style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder={t('events.searchPatientPlaceholder')}
                  value={patientSearchTerm}
                  onChange={(e) => handlePatientSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ced4da',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              
              {isPatientSearching ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  {t('events.searching')}
                </div>
              ) : patientSearchResults.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {patientSearchResults.map((patient) => (
                    <div
                      key={patient.caseId}
                      style={{
                        padding: '16px',
                        border: '1px solid #dee2e6',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'white',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                        e.currentTarget.style.borderColor = '#007acc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.borderColor = '#dee2e6';
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', color: '#000000', marginBottom: '4px' }}>
                          {patient.firstName} {patient.lastName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>
                          {t('events.case')}: {patient.caseId}
                        </div>
                        {patient.email && (
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {patient.email}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleSelectPatient(patient)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#007acc',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        {t('events.select')}
                      </button>
                    </div>
                  ))}
                </div>
              ) : patientSearchTerm.length >= 2 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  {t('events.noPatients')} "{patientSearchTerm}"
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  {t('events.searchHint')}
                </div>
              )}
            </div>
            <div className="patient-search-modal-footer" style={{ marginTop: '20px', textAlign: 'right' }}>
              <button 
                onClick={() => setShowPatientSearchModal(false)}
                className="cancel-btn"
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {t('events.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
      <DialogComponent />
    </div>
  );
}
