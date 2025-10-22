import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User } from '../types';
import { getApiUrl } from '../config';

// Intake Form Page Component
export function IntakeFormPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    governmentId: '',
    gender: '',
    maritalStatus: '',
    education: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    strengths: '',
    obstacles: ''
  });

  // Set document direction based on language
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (err) {
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  // Fetch existing patient data to pre-populate the form
  useEffect(() => {
    const fetchPatientData = async () => {
      if (!caseId) {
        console.log('No caseId provided');
        return;
      }
      
      console.log('Fetching patient data for caseId:', caseId);
      
      try {
        const response = await fetch(getApiUrl(`/api/patients/${caseId}`));
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const responseData = await response.json();
          console.log('Response data received:', responseData);
          
          // The API returns data wrapped in a 'patient' object
          const patientData = responseData.patient || responseData;
          console.log('Patient data:', patientData);
          
          setFormData(prev => ({
            ...prev,
            firstName: patientData.first_name || patientData.firstName || '',
            lastName: patientData.last_name || patientData.lastName || '',
            dateOfBirth: patientData.date_of_birth || patientData.dateOfBirth || '',
            governmentId: patientData.government_id || patientData.governmentId || '',
            email: patientData.email || '',
            phone: patientData.phone || '',
            address: patientData.address || ''
          }));
        } else {
          console.error('Failed to fetch patient data, status:', response.status);
          const errorText = await response.text();
          console.error('Error response:', errorText);
        }
        
        // Load non-PII data from Firebase
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const patientDocRef = doc(db, 'patients', caseId);
        const patientDoc = await getDoc(patientDocRef);
        
        if (patientDoc.exists()) {
          const firebaseData = patientDoc.data();
          setFormData(prev => ({
            ...prev,
            gender: firebaseData.gender || '',
            maritalStatus: firebaseData.maritalStatus || '',
            education: firebaseData.education || '',
            notes: firebaseData.notes || '',
            strengths: firebaseData.strengths || '',
            obstacles: firebaseData.obstacles || ''
          }));
        }
      } catch (error) {
        console.error('Error fetching patient data:', error);
        // Continue with empty form if fetch fails
      }
    };

    fetchPatientData();
  }, [caseId]);

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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.dateOfBirth) {
      console.log(t('intakeForm.fillRequiredFields'));
      return;
    }

    setIsSubmitting(true);

    try {
      const patientData = {
        case_id: caseId,
        first_name: formData.firstName,
        last_name: formData.lastName,
        date_of_birth: formData.dateOfBirth,
        government_id: formData.governmentId,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        gender: formData.gender,
        marital_status: formData.maritalStatus,
        education: formData.education,
        notes: formData.notes,
        strengths: formData.strengths,
        obstacles: formData.obstacles
      };

      // Try to update first
      let response = await fetch(getApiUrl(`/api/patients/${caseId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patientData)
      });

      // If patient doesn't exist (404), create them
      if (response.status === 404) {
        console.log('Patient not found, creating new record...');
        response = await fetch(getApiUrl('/api/patients'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(patientData)
        });
      }

      if (response.ok) {
        // Save non-PII fields to Firebase
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const patientDocRef = doc(db, 'patients', caseId!);
        await updateDoc(patientDocRef, {
          status: 'active',
          updatedAt: new Date(),
          gender: formData.gender,
          maritalStatus: formData.maritalStatus,
          education: formData.education,
          notes: formData.notes,
          strengths: formData.strengths,
          obstacles: formData.obstacles
        });
        
        console.log(t('intakeForm.submitSuccess'));
        
        // Add activity note for the intake form completion
        const { addActivityNote } = await import('../firebase');
        await addActivityNote(caseId!, 'Patient intake form completed', 'intake_completed', user.email);
        
        // Redirect to patient detail page after 2 seconds
        setTimeout(() => {
          navigate(`/patient/${caseId}`);
        }, 2000);
      } else {
        const errorText = await response.text();
        console.error('Failed to submit intake form:', errorText);
        console.log(t('intakeForm.submitError'));
      }
    } catch (error) {
      console.error('Error submitting intake form:', error);
      console.log(t('intakeForm.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app">
      <div className="create-patient-container">
        <div className="create-patient-form">
          <div className="login-header">
            <div className="header-top-row">
              <img src="/logo.jpeg" alt="Logo" style={{ height: '40px', width: 'auto' }} />
              <div className="header-actions">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    const form = document.querySelector('form');
                    if (form) {
                      form.requestSubmit();
                    }
                  }}
                  className="create-patient-btn"
                  disabled={isSubmitting}
                  type="button"
                >
                  {isSubmitting ? t('intakeForm.submitting') : t('intakeForm.submitIntakeForm')}
                </button>
              </div>
            </div>
            <p>{caseId}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-blocks-three">
              {/* Personal Information Block */}
              <div className="form-block">
                <h3 className="form-block-title" style={{ color: '#000000' }}>👤 {t('intakeForm.personalInformation')}</h3>
                <div className="form-fields-vertical">
                  <div className="form-group">
                    <label style={{ color: '#000000' }}>{t('intakeForm.firstName')} *</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder={t('intakeForm.enterFirstName')}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label style={{ color: '#000000' }}>{t('intakeForm.lastName')} *</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder={t('intakeForm.enterLastName')}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ color: '#000000' }}>{t('intakeForm.dateOfBirth')} *</label>
                    <div className="input-with-icon">
                      <span 
                        className="field-icon" 
                        onClick={() => {
                          const dateInput = document.querySelector('.date-picker-input') as HTMLInputElement;
                          if (dateInput) {
                            dateInput.showPicker();
                          }
                        }}
                        title={t('intakeForm.dateOfBirth')}
                      >📅</span>
                      <input
                        type="date"
                        className="date-picker-input"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                        required
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label style={{ color: '#000000' }}>{t('intakeForm.governmentId')}</label>
                    <input
                      type="text"
                      value={formData.governmentId}
                      onChange={(e) => handleInputChange('governmentId', e.target.value)}
                      placeholder={t('intakeForm.enterGovernmentId')}
                    />
                  </div>
                </div>
              </div>

              {/* Demographics Block */}
              <div className="form-block">
                <h3 className="form-block-title" style={{ color: '#000000' }}>📊 {t('intakeForm.demographics')}</h3>
                <div className="form-fields-vertical">
                  <div className="form-group">
                    <label style={{ color: '#000000' }}>{t('intakeForm.education')}</label>
                    <select
                      value={formData.education || ''}
                      onChange={(e) => handleInputChange('education', e.target.value)}
                      style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ced4da', backgroundColor: '#ffffff', color: '#000000', fontSize: '14px' }}
                    >
                      <option value="">{t('intakeForm.selectEducation')}</option>
                      <option value="elementary">{t('intakeForm.elementary')}</option>
                      <option value="high_school">{t('intakeForm.highSchool')}</option>
                      <option value="college">{t('intakeForm.college')}</option>
                      <option value="university">{t('intakeForm.university')}</option>
                      <option value="graduate">{t('intakeForm.graduate')}</option>
                      <option value="other">{t('intakeForm.other')}</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ color: '#000000' }}>{t('intakeForm.gender')}</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ced4da', backgroundColor: '#ffffff', color: '#000000', fontSize: '14px' }}
                    >
                      <option value="">{t('intakeForm.selectGender')}</option>
                      <option value="male">{t('intakeForm.male')}</option>
                      <option value="female">{t('intakeForm.female')}</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label style={{ color: '#000000' }}>{t('intakeForm.maritalStatus')}</label>
                    <select
                      value={formData.maritalStatus}
                      onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                      style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ced4da', backgroundColor: '#ffffff', color: '#000000', fontSize: '14px' }}
                    >
                      <option value="">{t('intakeForm.selectStatus')}</option>
                      <option value="single">{t('intakeForm.single')}</option>
                      <option value="married">{t('intakeForm.married')}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information Block */}
              <div className="form-block">
                <h3 className="form-block-title" style={{ color: '#000000' }}>📞 {t('intakeForm.contactInformation')}</h3>
                <div className="form-fields-vertical">
                  <div className="form-group">
                    <label style={{ color: '#000000' }}>{t('intakeForm.email')}</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder={t('intakeForm.enterEmail')}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label style={{ color: '#000000' }}>{t('intakeForm.phone')}</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder={t('intakeForm.enterPhone')}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label style={{ color: '#000000' }}>{t('intakeForm.address')}</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder={t('intakeForm.enterAddress')}
                      rows={4}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Wide blocks for additional fields */}
            <div style={{ marginTop: '30px' }}>
              {/* Obstacles Block */}
              <div className="form-block" style={{ marginBottom: '20px' }}>
                <h3 className="form-block-title" style={{ color: '#000000' }}>
                  🚧 {t('intakeForm.obstacles')}
                </h3>
                <div className="form-fields-vertical">
                  <div className="form-group">
                    <textarea
                      value={formData.obstacles || ''}
                      onChange={(e) => handleInputChange('obstacles', e.target.value)}
                      placeholder={t('intakeForm.describeObstacles')}
                      rows={6}
                      style={{ 
                        resize: 'vertical', 
                        direction: i18n.language === 'he' ? 'rtl' : 'ltr',
                        textAlign: i18n.language === 'he' ? 'right' : 'left'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Strengths Block */}
              <div className="form-block" style={{ marginBottom: '20px' }}>
                <h3 className="form-block-title" style={{ color: '#000000' }}>
                  💪 {t('intakeForm.strengths')}
                </h3>
                <div className="form-fields-vertical">
                  <div className="form-group">
                    <textarea
                      value={formData.strengths || ''}
                      onChange={(e) => handleInputChange('strengths', e.target.value)}
                      placeholder={t('intakeForm.describeStrengths')}
                      rows={6}
                      style={{ 
                        resize: 'vertical', 
                        direction: i18n.language === 'he' ? 'rtl' : 'ltr',
                        textAlign: i18n.language === 'he' ? 'right' : 'left'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Notes Block */}
              <div className="form-block">
                <h3 className="form-block-title" style={{ color: '#000000' }}>
                  📝 {t('intakeForm.notes')}
                </h3>
                <div className="form-fields-vertical">
                  <div className="form-group">
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder={t('intakeForm.enterNotes')}
                      rows={6}
                      style={{ 
                        resize: 'vertical',
                        direction: i18n.language === 'he' ? 'rtl' : 'ltr',
                        textAlign: i18n.language === 'he' ? 'right' : 'left'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
