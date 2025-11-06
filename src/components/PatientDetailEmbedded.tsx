import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getActivityNotes, deletePatientCase, deleteActivityLog } from '../firebase';
import { User, ActivityNote } from '../types';
import { formatDate } from '../utils';
import { getApiUrl } from '../config';

interface PatientDetailEmbeddedProps {
  caseId: string;
  user: User;
  onBack: () => void;
}

// Embedded Patient Detail Component
export function PatientDetailEmbedded({ caseId, user, onBack }: PatientDetailEmbeddedProps) {
  const { t, i18n } = useTranslation();

  // Helper function to translate stored values to display text
  const translateValue = (field: string, value: string) => {
    if (!value || value === '') return 'N/A';
    
    switch (field) {
      case 'gender':
        return value === 'male' ? t('intakeForm.male') : t('intakeForm.female');
      case 'marital_status':
        return value === 'single' ? t('patientDetail.single') : t('patientDetail.married');
      case 'education':
        switch (value) {
          case 'elementary': return t('patientDetail.elementarySchool');
          case 'high_school': return t('patientDetail.highSchool');
          case 'college': return t('patientDetail.college');
          case 'university': return t('patientDetail.university');
          case 'graduate': return t('patientDetail.graduateDegree');
          case 'other': return t('patientDetail.other');
          default: return value;
        }
      default:
        return value;
    }
  };

  const [isLoading, setIsLoading] = useState(true);
  const [patientPII, setPatientPII] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPatientData, setEditedPatientData] = useState<any>(null);

  // Fetch patient data
  useEffect(() => {
    const fetchPatientData = async () => {
      if (!caseId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('Fetching patient data for caseId:', caseId);
        
        // Fetch PII data from PostgreSQL
        const response = await fetch(getApiUrl(`/api/patients/${caseId}`), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log('Response status:', response.status);

        if (response.ok) {
          const patientData = await response.json();
          console.log('Patient data received:', patientData);
          setPatientPII(patientData);
        } else if (response.status === 404) {
          console.error('Patient not found:', caseId);
          setError(`Patient not found: ${caseId}`);
          // Auto-close after 3 seconds
          setTimeout(() => {
            onBack();
          }, 3000);
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch patient data:', errorText);
          setError(`Failed to load patient: ${errorText}`);
        }

        // Fetch activities
        try {
          const activityData = await getActivityNotes(caseId);
          console.log('Activity data received:', activityData);
          setActivities(activityData);
        } catch (activityError) {
          console.error('Error fetching activities:', activityError);
          setActivities([]); // Set empty array instead of failing
        }
        
      } catch (error) {
        console.error('Error fetching patient data:', error);
        setError(`Failed to load patient data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatientData();
  }, [caseId, onBack]);

  const handleDelete = async () => {
    if (!caseId) return;
    
    setIsDeleting(true);
    try {
      await deletePatientCase(caseId, user.email);
      onBack(); // Go back to patients list
    } catch (error) {
      console.error('Error deleting patient:', error);
      setError('Failed to delete patient');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleEdit = () => {
    if (patientPII) {
      setEditedPatientData({ ...patientPII });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!caseId || !editedPatientData) return;
    
    try {
      // Update patient data in PostgreSQL via fileserver
      const response = await fetch(getApiUrl(`/api/patients/${caseId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: editedPatientData.first_name,
          last_name: editedPatientData.last_name,
          date_of_birth: editedPatientData.date_of_birth,
          government_id: editedPatientData.government_id,
          email: editedPatientData.email,
          phone: editedPatientData.phone,
          address: editedPatientData.address
        })
      });

      if (response.ok) {
        // Save non-PII fields to Firebase
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const patientDocRef = doc(db, 'patients', caseId);
        await updateDoc(patientDocRef, {
          gender: editedPatientData.gender,
          maritalStatus: editedPatientData.marital_status,
          education: editedPatientData.education,
          notes: editedPatientData.notes,
          updatedAt: new Date()
        });
        
        // Update local state only after successful save
        setPatientPII(editedPatientData);
        setIsEditing(false);
        setEditedPatientData(null);
        
        // Add activity note for the update
        if (user) {
          const { addActivityNote } = await import('../firebase');
          await addActivityNote(caseId, 'Patient information updated', 'updated', user.email);
        }
        
        console.log('Patient data updated successfully');
      } else {
        const errorText = await response.text();
        console.error('Failed to update patient data:', errorText);
        setError('Failed to save patient data');
      }
    } catch (error) {
      console.error('Error saving patient data:', error);
      setError('Failed to save patient data');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedPatientData(null);
  };

  if (isLoading) {
    return (
      <div className="patient-detail-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>{t('patientDetail.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isNotFound = error.includes('not found');
    return (
      <div className="patient-detail-container">
        <div className="error-container">
          <h3>Error Loading Patient</h3>
          <p>{error}</p>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
            Case ID: {caseId}
          </p>
          {isNotFound && (
            <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
              Auto-closing in 3 seconds...
            </p>
          )}
          <button onClick={onBack} className="btn btn-secondary">
            ← Back to Patients List
          </button>
        </div>
      </div>
    );
  }

  if (!patientPII) {
    return (
      <div className="patient-detail-container">
        <div className="error-container">
          <h3>Patient Not Found</h3>
          <p>No patient data found for this case ID.</p>
          <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
            Case ID: {caseId}
          </p>
          <button onClick={onBack} className="btn btn-secondary">
            ← Back to Patients List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-detail-container">
      {/* Header */}
      <div className="patient-detail-header">
        <div className="header-left">
          <button onClick={onBack} className="back-button">
            ← {t('patientDetail.back')}
          </button>
          <h1>{t('patientDetail.patientDetails')} - {patientPII.first_name} {patientPII.last_name}</h1>
        </div>
        <div className="header-actions">
          <button onClick={handleEdit} className="btn btn-primary">
            {t('patientDetail.editPatient')}
          </button>
          <div className="dropdown-menu">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="menu-button"
            >
              ⋯
            </button>
            {showMenu && (
              <div className="dropdown-content">
                <button 
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setShowMenu(false);
                  }}
                  className="delete-button"
                >
                  {t('patientDetail.deletePatient')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Patient Information */}
      <div className="patient-detail-content">
        <div className="patient-info-section">
          <h2>{t('patientDetail.information')}</h2>
          
          {isEditing ? (
            <div className="edit-form">
              <div className="form-row">
                <div className="form-group">
                  <label>{t('patientDetail.firstName')}</label>
                  <input
                    type="text"
                    value={editedPatientData.first_name || ''}
                    onChange={(e) => setEditedPatientData({...editedPatientData, first_name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>{t('patientDetail.lastName')}</label>
                  <input
                    type="text"
                    value={editedPatientData.last_name || ''}
                    onChange={(e) => setEditedPatientData({...editedPatientData, last_name: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>{t('patientDetail.dateOfBirth')}</label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type="date"
                      value={editedPatientData.date_of_birth || ''}
                      onChange={(e) => setEditedPatientData({...editedPatientData, date_of_birth: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '12px',
                        paddingRight: i18n.language === 'he' ? '12px' : '40px',
                        paddingLeft: i18n.language === 'he' ? '40px' : '12px',
                        border: '1px solid #ced4da',
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
                      title={t('patientDetail.dateOfBirth')}
                    >
                      📅
                    </span>
                  </div>
                </div>
                <div className="form-group">
                  <label>{t('patientDetail.governmentId')}</label>
                  <input
                    type="text"
                    value={editedPatientData.government_id || ''}
                    onChange={(e) => setEditedPatientData({...editedPatientData, government_id: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('patientDetail.email')}</label>
                  <input
                    type="email"
                    value={editedPatientData.email || ''}
                    onChange={(e) => setEditedPatientData({...editedPatientData, email: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>{t('patientDetail.phone')}</label>
                  <input
                    type="tel"
                    value={editedPatientData.phone || ''}
                    onChange={(e) => setEditedPatientData({...editedPatientData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t('patientDetail.address')}</label>
                <textarea
                  value={editedPatientData.address || ''}
                  onChange={(e) => setEditedPatientData({...editedPatientData, address: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button onClick={handleSaveEdit} className="btn btn-primary">
                  {t('patientDetail.saveChanges')}
                </button>
              </div>
            </div>
          ) : (
            <div className="patient-info-grid">
              <div className="info-item">
                <label>{t('patientDetail.firstName')}</label>
                <span>{patientPII.first_name || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>{t('patientDetail.lastName')}</label>
                <span>{patientPII.last_name || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>{t('patientDetail.dateOfBirth')}</label>
                <span>{patientPII.date_of_birth ? formatDate(new Date(patientPII.date_of_birth)) : 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>{t('patientDetail.governmentId')}</label>
                <span>{patientPII.government_id || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>{t('patientDetail.email')}</label>
                <span>{patientPII.email || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>{t('patientDetail.phone')}</label>
                <span>{patientPII.phone || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>{t('patientDetail.address')}</label>
                <span>{patientPII.address || 'N/A'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Activity History */}
        <div className="activity-section">
          <h2>{t('patientDetail.meetings')}</h2>
          {activities.length > 0 ? (
            <div className="activity-list">
              {activities.map((activity, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-content">
                    <p>{activity.note.replace(/^Meeting: /, '')}</p>
                    <small>
                      {t('patientDetail.by')} {activity.createdBy} - {formatDate(new Date(activity.timestamp))}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>{t('patientDetail.noActivityHistory')}</p>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{t('patientDetail.deletePatient')}</h3>
            <p>{t('patients.confirmDelete')}</p>
            <div className="modal-actions">
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="btn btn-danger"
              >
                {isDeleting ? t('patientDetail.deleting') : t('patientDetail.deletePatient')}
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-secondary"
              >
                {t('patientDetail.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
