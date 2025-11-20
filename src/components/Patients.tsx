import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Patient } from '../types';
import { PatientNameDisplay, PatientNotesDisplay, PatientCreatedByDisplay, AssignedUserAvatar } from './PatientComponents';
import { formatDate } from '../utils';
import { createPatientCase } from '../firebase';

interface PatientsProps {
  user: User;
  filteredPatients: Patient[];
  isPatientLoading: boolean;
  patientManagementSearchTerm: string;
  handlePatientManagementSearch: (term: string) => void;
  showPatientMenu: string | null;
  setShowPatientMenu: (caseId: string | null) => void;
  handleDeletePatient: (caseId: string) => void;
  patientStatusFilter: string;
  handlePatientStatusFilterChange: (filter: string) => void;
  handlePatientStatusChange: (caseId: string, newStatus: string) => void;
  PatientNameDisplay: React.ComponentType<{ caseId: string }>;
  PatientNotesDisplay: React.ComponentType<{ caseId: string }>;
  formatDate: (dateString: string | any) => string;
  refreshPatients: () => void;
  handlePatientSelect: (caseId: string) => void;
  // Pagination props
  patientCurrentPage: number;
  setPatientCurrentPage: (page: number) => void;
  patientsPerPage: number;
  totalPatients: number;
}

export default function Patients({
  user,
  filteredPatients,
  isPatientLoading,
  patientManagementSearchTerm,
  handlePatientManagementSearch,
  showPatientMenu,
  setShowPatientMenu,
  handleDeletePatient,
  patientStatusFilter,
  handlePatientStatusFilterChange,
  handlePatientStatusChange,
  PatientNameDisplay,
  PatientNotesDisplay,
  formatDate,
  refreshPatients,
  handlePatientSelect,
  // Pagination props
  patientCurrentPage,
  setPatientCurrentPage,
  patientsPerPage,
  totalPatients
}: PatientsProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  // Assign modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignForCaseId, setAssignForCaseId] = useState<string | null>(null);
  const [assignSearchTerm, setAssignSearchTerm] = useState('');
  const [assignResults, setAssignResults] = useState<any[]>([]);
  const [assignSelectedIds, setAssignSelectedIds] = useState<string[]>([]);
  const [isAssignSaving, setIsAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newPatient, setNewPatient] = useState({
    firstName: '',
    lastName: '',
    notes: ''
  });
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, left: number, caseId: string} | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPatientMenu) {
        const target = event.target as Element;
        if (!target.closest('.patient-actions-menu') && !target.closest('.patient-dropdown-new')) {
          setShowPatientMenu(null);
          setDropdownPosition(null);
        }
      }
    };

    if (showPatientMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPatientMenu]);

  // Pagination logic
  const getPaginatedPatients = () => {
    const startIndex = (patientCurrentPage - 1) * patientsPerPage;
    return filteredPatients.slice(startIndex, startIndex + patientsPerPage);
  };

  const totalPages = Math.ceil(totalPatients / patientsPerPage);

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    setCreateError(null);
    setNewPatient({
      firstName: '',
      lastName: '',
      notes: ''
    });
  };

  const handleCreatePatient = async () => {
    if (!newPatient.firstName || !newPatient.lastName) {
      setCreateError('Please fill in first name and last name');
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      console.log('Creating patient with data:', newPatient);
      
      // Create patient case with minimal data
      const result = await createPatientCase({
        firstName: newPatient.firstName,
        lastName: newPatient.lastName,
        dateOfBirth: '2000-01-01', // Default date since it's required
        email: '',
        phone: '',
        address: '',
        notes: newPatient.notes,
        status: 'new' // Set status to 'new' for freshly created patients
      }, user.id);
      
      console.log('Create patient result:', result);
      
      if (result.success) {
        // Reset form
        setNewPatient({
          firstName: '',
          lastName: '',
          notes: ''
        });
        setShowCreateModal(false);
        // Refresh the patient list
        await refreshPatients();
      } else {
        console.error('Failed to create patient:', result.error);
        setCreateError('Failed to create patient case: ' + (result.error || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Error creating patient:', err);
      setCreateError(err.message || 'Failed to create patient');
    } finally {
      setIsCreating(false);
    }
  };

  // Open assign modal with current selections
  const openAssignModal = (patient: any) => {
    setAssignForCaseId(patient.caseId);
    setAssignSelectedIds(Array.isArray(patient.assignedAdmins) ? patient.assignedAdmins : (patient.createdBy ? [patient.createdBy] : []));
    setAssignSearchTerm('');
    setAssignResults([]);
    setAssignError(null);
    setIsAssignModalOpen(true);
  };

  // Debounced user search
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        if (!assignSearchTerm.trim()) {
          setAssignResults([]);
          return;
        }
        const { getDocs, collection } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const snap = await getDocs(collection(db, 'users'));
        const term = assignSearchTerm.toLowerCase();
        const results: any[] = [];
        snap.forEach((docSnap: any) => {
          const data = docSnap.data();
          // Exclude deleted users
          if (!data.deleted) {
          const name = (data.name || '').toLowerCase();
          const email = (data.email || '').toLowerCase();
          if (name.includes(term) || email.includes(term)) {
            results.push({
              id: data.userId || docSnap.id,
              name: data.name,
              email: data.email
            });
            }
          }
        });
        setAssignResults(results);
      } catch {
        // ignore
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [assignSearchTerm]);

  const toggleAssignSelection = (userId: string) => {
    setAssignSelectedIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const saveAssigned = async () => {
    if (!assignForCaseId) return;
    setIsAssignSaving(true);
    setAssignError(null);
    try {
      const { updatePatientAssignedAdmins } = await import('../firebase');
      const res = await updatePatientAssignedAdmins(assignForCaseId, assignSelectedIds);
      if (!res.success) throw new Error('Failed to update assigned admins');
      setIsAssignModalOpen(false);
      setAssignForCaseId(null);
      await refreshPatients();
    } catch (e: any) {
      setAssignError(e?.message || 'Failed to save assignment');
    } finally {
      setIsAssignSaving(false);
    }
  };
  
  return (
    <div className="patients-management" style={{ position: 'relative' }}>
      <div className="patients-header">
        <h2>{t('patients.title')}</h2>
        <div className="patients-controls">
          <input
            type="text"
            placeholder={t('patients.searchPlaceholder')}
            value={patientManagementSearchTerm}
            onChange={(e) => handlePatientManagementSearch(e.target.value)}
            className="patient-search-input"
          />
          <select
            value={patientStatusFilter}
            onChange={(e) => handlePatientStatusFilterChange(e.target.value)}
            className="patient-status-filter"
          >
            <option value="all">{t('patients.allPatients')}</option>
            <option value="new">{t('patients.statusNew')}</option>
            <option value="active">{t('patients.statusActive')}</option>
            <option value="inactive">{t('patients.statusArchive')}</option>
          </select>
          <button
            onClick={handleOpenCreateModal}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              minWidth: '200px',
              flex: '1 1 auto'
            }}
          >
            + {t('patients.createPatient')}
          </button>
        </div>
      </div>
      
      <div className="patients-table-container">
        {isPatientLoading ? (
          <div className="loading">
            {i18n.language === 'he' ? 'טוען מטופלים...' : 'Loading patients...'}
          </div>
        ) : (
          <table className="patients-table">
          <thead>
            <tr>
              <th>{t('patients.caseId')}</th>
              <th>{t('patients.patientName')}</th>
              <th>{t('patients.notes')}</th>
              <th>{t('patients.assigned')}</th>
              <th>{t('patients.status')}</th>
              <th>{t('patients.actions')}</th>
            </tr>
          </thead>
            <tbody>
              {getPaginatedPatients().map((patient) => (
                <tr 
                  key={patient.id} 
                  className="patient-row"
                  onClick={() => {
                    handlePatientSelect(patient.caseId);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="patient-case-id-cell">
                    <div className="case-id-with-icon">
                      <span className="document-icon">📄</span>
                      <span>{patient.caseId}</span>
                    </div>
                  </td>
                  <td className="patient-name-cell">
                    <PatientNameDisplay caseId={patient.caseId} />
                  </td>
                  <td className="patient-notes-cell">
                    <PatientNotesDisplay caseId={patient.caseId} />
                  </td>
                  <td className="patient-assigned-cell">
                    {Array.isArray(patient.assignedAdmins) && patient.assignedAdmins.length > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        {patient.assignedAdmins.slice(0, 4).map((uid: string) => (
                          <AssignedUserAvatar key={uid} userId={uid} />
                        ))}
                        {patient.assignedAdmins.length > 4 && (
                          <div style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#666',
                            color: 'white',
                            fontSize: '8px',
                            fontWeight: 'bold',
                            margin: '1px'
                          }}>
                            +{patient.assignedAdmins.length - 4}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <PatientCreatedByDisplay userId={patient.createdBy || ''} />
                      </div>
                    )}
                  </td>
                  <td className="patient-status-cell" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={patient.status?.toLowerCase() || 'active'}
                      onChange={(e) => handlePatientStatusChange(patient.caseId, e.target.value)}
                      className={`user-status-dropdown status-${patient.status?.toLowerCase()}`}
                    >
                      <option value="new">{t('patients.statusNew')}</option>
                      <option value="active">{t('patients.statusActive')}</option>
                      <option value="inactive">{t('patients.statusArchive')}</option>
                    </select>
                  </td>
                  <td className="patient-actions-cell" onClick={(e) => e.stopPropagation()}>
                    <div className="patient-actions">
                      {/* Three Dots Menu */}
                      <div className="patient-actions-menu">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const buttonRect = e.currentTarget.getBoundingClientRect();
                            const isOpen = showPatientMenu === patient.caseId;
                            
                            if (isOpen) {
                              setShowPatientMenu(null);
                            } else {
                              setShowPatientMenu(patient.caseId);
                              // Store button position for dropdown positioning
                              setDropdownPosition({
                                top: buttonRect.bottom + 4,
                                left: buttonRect.right - 160, // Align dropdown to right edge
                                caseId: patient.caseId
                              });
                            }
                          }}
                          className="three-dots-btn"
                          style={{
                            background: 'transparent',
                            color: '#666',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            width: '36px',
                            height: '36px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          ⋯
                        </button>
                        
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!isPatientLoading && totalPatients > 0 && (
          <div className="patients-pagination">
            <div className="pagination-controls">
              <button
                onClick={() => setPatientCurrentPage(Math.max(1, patientCurrentPage - 1))}
                disabled={patientCurrentPage === 1}
                className="pagination-btn"
              >
                {i18n.language === 'he' ? '→' : '←'}
              </button>
              <span className="pagination-current">
                {patientCurrentPage} / {totalPages}
              </span>
              <button
                onClick={() => setPatientCurrentPage(Math.min(totalPages, patientCurrentPage + 1))}
                disabled={patientCurrentPage === totalPages}
                className="pagination-btn"
              >
                {i18n.language === 'he' ? '←' : '→'}
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Assign Modal */}
      {isAssignModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsAssignModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2100
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              padding: '16px',
              borderRadius: '12px',
              width: 'min(680px, 92vw)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#000' }}>{i18n.language === 'he' ? 'שיוך מטפלות לתיק' : 'Assign Users to Case'}</h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '20px', color: '#666', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>
            <input
              type="text"
              value={assignSearchTerm}
              onChange={(e) => setAssignSearchTerm(e.target.value)}
              placeholder={i18n.language === 'he' ? 'חיפוש לפי שם או אימייל...' : 'Search by name or email...'}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '10px' }}
            />
            <div style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #eee', borderRadius: '8px' }}>
              {assignResults.length === 0 ? (
                <div style={{ padding: '12px', color: '#666' }}>
                  {i18n.language === 'he' ? 'אין תוצאות' : 'No results'}
                </div>
              ) : (
                assignResults.map((u) => (
                  <label key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #f1f3f5' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                      <span style={{ color: '#666', fontSize: '12px' }}>{u.email}</span>
                    </div>
                    <input type="checkbox" checked={assignSelectedIds.includes(u.id)} onChange={() => toggleAssignSelection(u.id)} />
                  </label>
                ))
              )}
            </div>
            {assignError && <div style={{ color: '#d9534f', marginTop: '8px' }}>{assignError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button onClick={saveAssigned} disabled={isAssignSaving} style={{ padding: '8px 12px', background: '#007acc', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                {isAssignSaving ? (i18n.language === 'he' ? 'שומר...' : 'Saving...') : (i18n.language === 'he' ? 'שמור שיוכים' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Patient Modal */}
      {showCreateModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowCreateModal(false)}
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
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              padding: '30px',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}
          >
            <div style={{ 
              display: 'flex', 
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              direction: i18n.language === 'he' ? 'rtl' : 'ltr'
            }}>
              <h2 style={{ margin: 0, color: '#000000', flex: 1, textAlign: 'center' }}>{t('patientDetail.createNewPatient')}</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError(null);
                  setNewPatient({ firstName: '', lastName: '', notes: '' });
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
                title={t('patientDetail.close')}
              >
                ×
              </button>
            </div>
            
            {createError && (
              <div style={{
                backgroundColor: '#ff6b6b',
                color: '#ffffff',
                padding: '12px',
                borderRadius: '6px',
                marginBottom: '20px'
              }}>
                {createError}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#000000' }}>
                {t('patientDetail.firstName')} *
              </label>
              <input
                type="text"
                value={newPatient.firstName}
                onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })}
                placeholder={t('patientDetail.enterFirstName')}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #ced4da',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#000000' }}>
                {t('patientDetail.lastName')} *
              </label>
              <input
                type="text"
                value={newPatient.lastName}
                onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })}
                placeholder={t('patientDetail.enterLastName')}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #ced4da',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#000000' }}>
                {t('patientDetail.notes')}
              </label>
              <textarea
                value={newPatient.notes}
                onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
                placeholder={t('patientDetail.enterNotesOptional')}
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #ced4da',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCreatePatient}
                disabled={isCreating}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#007acc',
                  color: '#ffffff',
                  cursor: isCreating ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: isCreating ? 0.6 : 1
                }}
              >
                {isCreating ? t('patientDetail.saving') : t('patientDetail.createPatient')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW DROPDOWN COMPONENT - POSITIONED FIXED */}
      {showPatientMenu && dropdownPosition && (
        <div
          className="patient-dropdown-new"
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 999999,
            width: 200,
            padding: 6
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={(e) => {
              e.stopPropagation();
              openAssignModal({ caseId: dropdownPosition.caseId });
              setShowPatientMenu(null);
              setDropdownPosition(null);
            }}
            className="dropdown-item assign-patient"
            style={{ width: '100%', textAlign: 'left', padding: 8, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            {i18n.language === 'he' ? 'שיוך מטפלות' : 'Assign'}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/patient/${dropdownPosition.caseId}`);
              setShowPatientMenu(null);
              setDropdownPosition(null);
            }}
            className="dropdown-item view-details"
            style={{ width: '100%', textAlign: 'left', padding: 8, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            {t('patients.viewDetails')}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleDeletePatient(dropdownPosition.caseId);
              setShowPatientMenu(null);
              setDropdownPosition(null);
            }}
            className="dropdown-item delete-patient"
            style={{ width: '100%', textAlign: 'left', padding: 8, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#d9534f' }}
          >
            {t('patients.deletePatient')}
          </button>
        </div>
      )}

    </div>
  );
}
