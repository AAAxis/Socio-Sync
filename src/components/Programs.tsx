import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User, UserManagementUser } from '../types';
import { getApiUrl } from '../config';

interface Program {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  managers: string[]; // Array of user IDs
  managerNames: string[]; // Array of user names for display
  startDate?: string;
  endDate?: string;
  status: 'active' | 'inactive' | 'completed' | 'planned';
  createdBy: string;
  createdByEmail: string;
  createdAt: any;
}

interface ProgramsProps {
  user: User;
}

type WizardStep = 'basic' | 'managers' | 'details';

export default function Programs({ user }: ProgramsProps) {
  const { t } = useTranslation();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logoUrl: '',
    managers: [] as string[],
    managerNames: [] as string[],
    startDate: '',
    endDate: '',
    status: 'planned' as Program['status']
  });

  // User search
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserManagementUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Edit modal data
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    logoUrl: '',
    managers: [] as string[],
    managerNames: [] as string[],
    startDate: '',
    endDate: '',
    status: 'active' as Program['status']
  });

  // Load programs
  useEffect(() => {
    const q = query(collection(db, 'programs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const programsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Program[];
      setPrograms(programsData);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Search users
  const searchUsers = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserManagementUser[];

      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );

      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle user search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(userSearchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [userSearchTerm]);

  // Add manager to program
  const handleAddManager = (user: UserManagementUser) => {
    if (!formData.managers.includes(user.id)) {
      setFormData(prev => ({
        ...prev,
        managers: [...prev.managers, user.id],
        managerNames: [...prev.managerNames, user.name]
      }));
    }
    setUserSearchTerm('');
    setSearchResults([]);
  };

  const handleRemoveManager = (userId: string) => {
    const index = formData.managers.indexOf(userId);
    if (index > -1) {
      setFormData(prev => ({
        ...prev,
        managers: prev.managers.filter(id => id !== userId),
        managerNames: prev.managerNames.filter((_, i) => i !== index)
      }));
    }
  };


  // Logo upload handler
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error('Invalid file type');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error('File too large');
      return;
    }

    setIsUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch(getApiUrl('/upload'), {
        method: 'POST',
        body: formDataUpload,
      });

      if (response.ok) {
        const result = await response.json();
        setFormData(prev => ({ ...prev, logoUrl: result.file_url }));
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      console.error('Upload error');
    } finally {
      setIsUploading(false);
    }
  };

  // Create program
  const handleCreateProgram = async () => {
    if (!formData.name.trim()) {
      return;
      return;
    }

    setIsCreating(true);
    try {
      await addDoc(collection(db, 'programs'), {
        name: formData.name.trim(),
        description: formData.description.trim(),
        logoUrl: formData.logoUrl,
        managers: formData.managers,
        managerNames: formData.managerNames,
        createdBy: user.name,
        createdByEmail: user.email,
        createdAt: serverTimestamp()
      });

      // Reset form
      setFormData({
        name: '',
        description: '',
        logoUrl: '',
        managers: [],
        managerNames: [],
        startDate: '',
        endDate: '',
        status: 'planned'
      });
      setShowWizard(false);
      setCurrentStep('basic');
      // Program created successfully
    } catch (error) {
      console.error('Error creating program:', error);
      console.error('Create error');
    } finally {
      setIsCreating(false);
    }
  };

  // Update program
  const handleUpdateProgram = async () => {
    if (!selectedProgram || !editData.name.trim()) return;

    setIsUpdating(true);
    try {
      const programRef = doc(db, 'programs', selectedProgram.id);
      await updateDoc(programRef, {
        name: editData.name,
        description: editData.description
      });

      setShowDetailsModal(false);
      // Program updated successfully
    } catch (error) {
      console.error('Error updating program:', error);
      console.error('Update error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete program
  const handleDeleteProgram = async (programId: string) => {
    // Delete program

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'programs', programId));
      // Program deleted successfully
    } catch (error) {
      console.error('Error deleting program:', error);
      console.error('Delete error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open details modal
  const handleOpenDetails = (program: Program) => {
    setSelectedProgram(program);
    setEditData({
      name: program.name,
      description: program.description || '',
      logoUrl: program.logoUrl || '',
      managers: program.managers || [],
      managerNames: program.managerNames || [],
      startDate: program.startDate || '',
      endDate: program.endDate || '',
      status: program.status
    });
    setShowDetailsModal(true);
  };



  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>
          {t('programs.loading')}...
        </div>
      </div>
    );
  }

  return (
    <div className="programs-container" style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#333' }}>
            {t('programs.title')}
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '16px' }}>
            {t('programs.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          style={{
            background: '#007acc',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ➕ {t('programs.createNew')}
        </button>
      </div>

      {/* Programs Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '20px'
      }}>
        {programs.map((program) => (
          <div
            key={program.id}
            onClick={() => handleOpenDetails(program)}
            style={{
              border: '1px solid #e9ecef',
              borderRadius: '8px',
              padding: '20px',
              backgroundColor: 'white',
              cursor: 'pointer',
              transition: 'box-shadow 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px' }}>
              {program.logoUrl ? (
                <img
                  src={program.logoUrl}
                  alt={`${program.name} logo`}
                  style={{
                    width: '50px',
                    height: '50px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    marginRight: '12px',
                    border: '1px solid #e9ecef'
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    borderRadius: '6px',
                    marginRight: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: '#6c757d'
                  }}
                >
                  📋
                </div>
              )}
              <div style={{ flex: 1 }}>
                <h3 style={{ 
                  margin: '0 0 8px 0', 
                  color: '#333',
                  fontSize: '18px',
                  fontWeight: '600'
                }}>
                  {program.name}
                </h3>
                {program.description && (
                  <p style={{
                    margin: '0 0 12px 0',
                    color: '#666',
                    fontSize: '14px',
                    lineHeight: '1.4'
                  }}>
                    {program.description}
                  </p>
                )}
              </div>
            </div>
            
            <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
              {program.managerNames && program.managerNames.length > 0 && (
                <div>
                  <strong>{t('programs.managers')}:</strong>
                  <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {program.managerNames.map((name, index) => (
                      <span
                        key={index}
                        style={{
                          backgroundColor: '#e3f2fd',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {programs.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#666'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>
            {t('programs.noPrograms')}
          </h3>
          <p style={{ margin: 0, fontSize: '16px' }}>
            {t('programs.noProgramsDescription')}
          </p>
        </div>
      )}

      {/* Create Program Wizard Modal */}
      {showWizard && (
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
            padding: '30px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '24px' }}>
              {t('programs.createNew')}
            </h3>

            {/* Step Indicator */}
            <div style={{ display: 'flex', marginBottom: '30px', gap: '10px' }}>
              {(['basic', 'managers', 'details'] as WizardStep[]).map((step, index) => (
                <div
                  key={step}
                  style={{
                    flex: 1,
                    height: '4px',
                    backgroundColor: index <= (['basic', 'managers', 'details'] as WizardStep[]).indexOf(currentStep) ? '#007acc' : '#e0e0e0',
                    borderRadius: '2px'
                  }}
                />
              ))}
            </div>

            {/* Step Content */}
            {currentStep === 'basic' && (
              <div>
                <h4>{t('programs.wizard.basicInfo')}</h4>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    {t('programs.name')} *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '16px'
                    }}
                    placeholder={t('programs.enterName')}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    {t('programs.description')}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '16px',
                      minHeight: '100px',
                      resize: 'vertical'
                    }}
                    placeholder={t('programs.enterDescription')}
                  />
                </div>
              </div>
            )}

            {currentStep === 'managers' && (
              <div>
                <h4>{t('programs.wizard.managers')}</h4>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    {t('programs.searchManagers')}
                  </label>
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '16px'
                    }}
                    placeholder={t('programs.searchUsersPlaceholder')}
                  />
                  
                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div style={{
                      border: '1px solid #ddd',
                      borderTop: 'none',
                      borderRadius: '0 0 6px 6px',
                      maxHeight: '200px',
                      overflow: 'auto',
                      backgroundColor: 'white'
                    }}>
                      {searchResults.map(user => (
                        <div
                          key={user.id}
                          onClick={() => handleAddManager(user)}
                          style={{
                            padding: '12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f8f9fa';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'white';
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: '500' }}>{user.name}</div>
                            <div style={{ fontSize: '14px', color: '#666' }}>{user.email}</div>
                          </div>
                          {formData.managers.includes(user.id) && (
                            <span style={{ color: '#28a745', fontSize: '14px' }}>✓ {t('programs.added')}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Managers */}
                {formData.managerNames.length > 0 && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      {t('programs.selectedManagers')} ({formData.managerNames.length})
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {formData.managerNames.map((name, index) => (
                        <div
                          key={formData.managers[index]}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 12px',
                            backgroundColor: '#e3f2fd',
                            borderRadius: '20px',
                            fontSize: '14px'
                          }}
                        >
                          {name}
                          <button
                            onClick={() => handleRemoveManager(formData.managers[index])}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#666',
                              fontSize: '16px',
                              padding: 0
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}


            {currentStep === 'details' && (
              <div>
                <h4>{t('programs.wizard.details')}</h4>
                
                {/* Logo Upload */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    {t('programs.logo')}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={isUploading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px'
                    }}
                  />
                  {isUploading && (
                    <div style={{ marginTop: '8px', color: '#007acc' }}>
                      {t('programs.wizard.uploading')}...
                    </div>
                  )}
                  {formData.logoUrl && (
                    <img
                      src={formData.logoUrl}
                      alt="Program logo"
                      style={{
                        marginTop: '12px',
                        width: '100px',
                        height: '100px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #ddd'
                      }}
                    />
                  )}
                </div>

              </div>
            )}

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
              <div>
                {currentStep !== 'basic' && (
                  <button
                    onClick={() => {
                      const steps: WizardStep[] = ['basic', 'managers', 'details'];
                      const currentIndex = steps.indexOf(currentStep);
                      if (currentIndex > 0) {
                        setCurrentStep(steps[currentIndex - 1]);
                      }
                    }}
                    style={{
                      padding: '12px 24px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    {t('programs.wizard.back')}
                  </button>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => {
                    setShowWizard(false);
                    setCurrentStep('basic');
                    setFormData({
                      name: '',
                      description: '',
                      logoUrl: '',
                      managers: [],
                      managerNames: [],
                      startDate: '',
                      endDate: '',
                      status: 'planned'
                    });
                  }}
                  style={{
                    padding: '12px 24px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  {t('programs.wizard.cancel')}
                </button>
                
                {currentStep === 'details' ? (
                  <button
                    onClick={handleCreateProgram}
                    disabled={isCreating || !formData.name.trim()}
                    style={{
                      padding: '12px 24px',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: '#007acc',
                      color: 'white',
                      cursor: isCreating || !formData.name.trim() ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      opacity: isCreating || !formData.name.trim() ? 0.6 : 1
                    }}
                  >
                    {isCreating ? t('programs.creating') : t('programs.create')}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const steps: WizardStep[] = ['basic', 'managers', 'details'];
                      const currentIndex = steps.indexOf(currentStep);
                      if (currentIndex < steps.length - 1) {
                        setCurrentStep(steps[currentIndex + 1]);
                      }
                    }}
                    disabled={currentStep === 'basic' && !formData.name.trim()}
                    style={{
                      padding: '12px 24px',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: '#007acc',
                      color: 'white',
                      cursor: (currentStep === 'basic' && !formData.name.trim()) ? 'not-allowed' : 'pointer',
                      fontSize: '16px',
                      opacity: (currentStep === 'basic' && !formData.name.trim()) ? 0.6 : 1
                    }}
                  >
                    {t('programs.wizard.next')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Program Details Modal */}
      {showDetailsModal && selectedProgram && (
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
            padding: '30px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '24px' }}>
                {selectedProgram.name}
              </h3>
              <button
                onClick={() => handleDeleteProgram(selectedProgram.id)}
                disabled={isDeleting}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: isDeleting ? 0.6 : 1
                }}
              >
                {isDeleting ? t('programs.deleting') : t('programs.delete')}
              </button>
            </div>

            {/* Program Name */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('programs.name')} *
              </label>
              <input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('programs.description')}
              </label>
              <textarea
                value={editData.description}
                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('programs.enterDescription')}
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

            {/* Logo */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('programs.logo')}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={isUploading}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              {isUploading && (
                <div style={{ marginTop: '8px', color: '#666', fontSize: '14px' }}>
                  {t('programs.wizard.uploading')}...
                </div>
              )}
              {editData.logoUrl && (
                <div style={{ marginTop: '12px' }}>
                  <img
                    src={editData.logoUrl}
                    alt="Program logo"
                    style={{
                      maxWidth: '200px',
                      maxHeight: '100px',
                      border: '1px solid #ddd',
                      borderRadius: '6px'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px' }}>
              <button
                onClick={() => setShowDetailsModal(false)}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                {t('programs.cancel')}
              </button>
              <button
                onClick={handleUpdateProgram}
                disabled={isUpdating || !editData.name.trim()}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#007acc',
                  color: 'white',
                  cursor: isUpdating || !editData.name.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  opacity: isUpdating || !editData.name.trim() ? 0.6 : 1
                }}
              >
                {isUpdating ? t('programs.updating') : t('programs.update')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
