import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { createPatientCase } from '../firebase';
import { User } from '../types';
import { GooglePlacesSearch } from './PatientComponents';

// Create Patient Page Component
export function CreatePatientPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [patientFormData, setPatientFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });

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

  if (isLoading) {
    return (
      <div className="app">
        <div className="container">
          <div className="login-card">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '18px', color: '#666666' }}>Loading...</div>
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
    setPatientFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCreatePatient = async () => {
    if (!patientFormData.firstName || !patientFormData.lastName || !patientFormData.dateOfBirth) {
      setError('Please fill in all required fields (First Name, Last Name, Date of Birth)');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Create patient case in Firebase
      const result = await createPatientCase(patientFormData, user.id);
      
      if (result.success) {
        // TODO: Save PII data to PostgreSQL
        // For now, we'll just show success message
        setError('Patient created successfully! Case ID: ' + result.caseId);
        
        // Reset form
        setPatientFormData({
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          email: '',
          phone: '',
          address: '',
          notes: ''
        });
        
        // Navigate back to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard?tab=projects');
        }, 2000);
      } else {
        setError('Failed to create patient case');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create patient');
      console.error('Error creating patient:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="app">
      <div className="create-patient-container">
        <div className="create-patient-form">
          <div className="login-header">
            <h1>SocioSync</h1>
            <p>Create New Patient</p>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-actions-top">
            <button
              onClick={() => navigate('/dashboard?tab=projects')}
              className="cancel-patient-btn"
            >
              Cancel
            </button>
            
            <button
              onClick={handleCreatePatient}
              className="create-patient-btn"
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Patient'}
            </button>
          </div>

          <div className="form-blocks-three">
            {/* Name & Date of Birth Block */}
            <div className="form-block">
              <h3 className="form-block-title">Name & Date of Birth</h3>
              <div className="form-fields-vertical">
                <div className="form-group">
                  <label htmlFor="firstName">First Name *</label>
                  <div className="input-with-icon">
                    <span className="field-icon">👤</span>
                    <input
                      type="text"
                      id="firstName"
                      value={patientFormData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="Enter first name"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="lastName">Last Name *</label>
                  <div className="input-with-icon">
                    <span className="field-icon">👤</span>
                    <input
                      type="text"
                      id="lastName"
                      value={patientFormData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="dateOfBirth">Date of Birth *</label>
                  <div className="input-with-icon">
                    <span className="field-icon">📅</span>
                    <input
                      type="date"
                      id="dateOfBirth"
                      value={patientFormData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information Block */}
            <div className="form-block">
              <h3 className="form-block-title">Contact Information</h3>
              <div className="form-fields-vertical">
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <div className="input-with-icon">
                    <span className="field-icon">📧</span>
                    <input
                      type="email"
                      id="email"
                      value={patientFormData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter email address"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="phone">Phone</label>
                  <div className="input-with-icon">
                    <span className="field-icon">📞</span>
                    <input
                      type="tel"
                      id="phone"
                      value={patientFormData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="address">Address</label>
                  <div className="input-with-icon">
                    <span className="field-icon">🏠</span>
                    <GooglePlacesSearch
                      value={patientFormData.address}
                      onChange={(value) => handleInputChange('address', value)}
                      placeholder="Enter address (with suggestions)"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Block */}
            <div className="form-block">
              <h3 className="form-block-title">Notes</h3>
              <div className="form-fields-vertical">
                <div className="form-group">
                  <label htmlFor="notes">Notes</label>
                  <div className="input-with-icon">
                    <span className="field-icon">📝</span>
                    <textarea
                      id="notes"
                      value={patientFormData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Enter notes"
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
