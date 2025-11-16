import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User, UserManagementUser } from '../types';
import { getApiUrl } from '../config';

interface Organization {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  administrators: string[]; // Array of user IDs
  administratorNames: string[]; // Array of user names for display
  createdBy: string;
  createdByEmail: string;
  createdAt: any;
}

interface OrganizationsProps {
  user: User;
}

type WizardStep = 'basic' | 'administrators' | 'details';

export default function Organizations({ user }: OrganizationsProps) {
  const { t } = useTranslation();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logoUrl: '',
    administrators: [] as string[],
    administratorNames: [] as string[]
  });

  // User search
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserManagementUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Details modal state
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    logoUrl: '',
    administrators: [] as string[],
    administratorNames: [] as string[]
  });
  const [detailsUserSearchTerm, setDetailsUserSearchTerm] = useState('');
  const [detailsSearchResults, setDetailsSearchResults] = useState<UserManagementUser[]>([]);
  const [isDetailsSearching, setIsDetailsSearching] = useState(false);

  // Subscribe to organizations in real-time
  useEffect(() => {
    const organizationsRef = collection(db, 'organizations');
    const q = query(organizationsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orgs: Organization[] = [];
      snapshot.forEach((doc) => {
        orgs.push({ id: doc.id, ...doc.data() } as Organization);
      });
      setOrganizations(orgs);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Search users for administrator selection
  const searchUsers = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const users: UserManagementUser[] = [];
      
      snapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.role === 'admin' || userData.role === 'super_admin') {
          const user: UserManagementUser = {
            id: doc.id,
            name: userData.name || '',
            email: userData.email || '',
            role: userData.role,
            createdAt: userData.createdAt?.toDate?.()?.toISOString() || '',
            lastLoginAt: userData.lastLoginAt?.toDate?.()?.toISOString() || '',
            loginCount: userData.loginCount || 0,
            blocked: userData.blocked || false
          };
          
          // Filter by search term
          if (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              user.email.toLowerCase().includes(searchTerm.toLowerCase())) {
            users.push(user);
          }
        }
      });
      
      setSearchResults(users);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle user search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(userSearchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [userSearchTerm]);

  // Handle details modal user search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchDetailsUsers(detailsUserSearchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [detailsUserSearchTerm]);

  // Search users for details modal
  const searchDetailsUsers = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setDetailsSearchResults([]);
      return;
    }

    setIsDetailsSearching(true);
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const users: UserManagementUser[] = [];
      
      snapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.role === 'admin' || userData.role === 'super_admin') {
          const user: UserManagementUser = {
            id: doc.id,
            name: userData.name || '',
            email: userData.email || '',
            role: userData.role,
            createdAt: userData.createdAt?.toDate?.()?.toISOString() || '',
            lastLoginAt: userData.lastLoginAt?.toDate?.()?.toISOString() || '',
            loginCount: userData.loginCount || 0,
            blocked: userData.blocked || false
          };
          
          // Filter by search term and exclude already assigned users
          if ((user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
              !editData.administrators.includes(user.id)) {
            users.push(user);
          }
        }
      });
      
      setDetailsSearchResults(users);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsDetailsSearching(false);
    }
  };

  const handleAddAdministrator = (user: UserManagementUser) => {
    if (!formData.administrators.includes(user.id)) {
      setFormData(prev => ({
        ...prev,
        administrators: [...prev.administrators, user.id],
        administratorNames: [...prev.administratorNames, user.name]
      }));
    }
    setUserSearchTerm('');
    setSearchResults([]);
  };

  const handleRemoveAdministrator = (userId: string) => {
    const index = formData.administrators.indexOf(userId);
    if (index > -1) {
      setFormData(prev => ({
        ...prev,
        administrators: prev.administrators.filter(id => id !== userId),
        administratorNames: prev.administratorNames.filter((_, i) => i !== index)
      }));
    }
  };

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

  // Details modal handlers
  const handleOpenDetails = (org: Organization) => {
    setSelectedOrg(org);
    setEditData({
      name: org.name,
      description: org.description || '',
      logoUrl: org.logoUrl || '',
      administrators: org.administrators || [],
      administratorNames: org.administratorNames || []
    });
    setShowDetailsModal(true);
  };

  const handleCloseDetails = () => {
    setShowDetailsModal(false);
    setSelectedOrg(null);
    setDetailsUserSearchTerm('');
    setDetailsSearchResults([]);
  };

  const handleAddDetailsAdministrator = (user: UserManagementUser) => {
    if (!editData.administrators.includes(user.id)) {
      setEditData(prev => ({
        ...prev,
        administrators: [...prev.administrators, user.id],
        administratorNames: [...prev.administratorNames, user.name]
      }));
    }
    setDetailsUserSearchTerm('');
    setDetailsSearchResults([]);
  };

  const handleRemoveDetailsAdministrator = (userId: string) => {
    const index = editData.administrators.indexOf(userId);
    if (index > -1) {
      setEditData(prev => ({
        ...prev,
        administrators: prev.administrators.filter(id => id !== userId),
        administratorNames: prev.administratorNames.filter((_, i) => i !== index)
      }));
    }
  };

  const handleDetailsLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
        setEditData(prev => ({ ...prev, logoUrl: result.file_url }));
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

  const handleUpdateOrganization = async () => {
    if (!selectedOrg || !editData.name.trim()) return;

    setIsUpdating(true);
    try {
      const orgRef = doc(db, 'organizations', selectedOrg.id);
      await updateDoc(orgRef, {
        name: editData.name.trim(),
        description: editData.description.trim(),
        logoUrl: editData.logoUrl,
        administrators: editData.administrators,
        administratorNames: editData.administratorNames,
        updatedAt: serverTimestamp(),
      });
      
      handleCloseDetails();
    } catch (error) {
      console.error('Error updating organization:', error);
      console.error('Update error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!selectedOrg) return;

    // Delete organization

    setIsDeleting(true);
    try {
      const orgRef = doc(db, 'organizations', selectedOrg.id);
      await deleteDoc(orgRef);
      
      handleCloseDetails();
    } catch (error) {
      console.error('Error deleting organization:', error);
      console.error('Delete error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateOrganization = async () => {
    if (!formData.name.trim()) return;

    setIsCreating(true);
    try {
      await addDoc(collection(db, 'organizations'), {
        name: formData.name.trim(),
        description: formData.description.trim(),
        logoUrl: formData.logoUrl,
        administrators: formData.administrators,
        administratorNames: formData.administratorNames,
        createdBy: user.name,
        createdByEmail: user.email,
        createdAt: serverTimestamp(),
      });
      
      // Reset form and close wizard
      setFormData({
        name: '',
        description: '',
        logoUrl: '',
        administrators: [],
        administratorNames: []
      });
      setShowWizard(false);
      setCurrentStep('basic');
    } catch (error) {
      console.error('Error creating organization:', error);
      console.error('Create error');
    } finally {
      setIsCreating(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 'basic' && formData.name.trim()) {
      setCurrentStep('administrators');
    } else if (currentStep === 'administrators') {
      setCurrentStep('details');
    }
  };

  const prevStep = () => {
    if (currentStep === 'details') {
      setCurrentStep('administrators');
    } else if (currentStep === 'administrators') {
      setCurrentStep('basic');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return t('organizations.na');
    try {
      return new Date(timestamp.seconds * 1000).toLocaleDateString();
    } catch {
      return t('organizations.na');
    }
  };

  const renderWizardStep = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: '#333' }}>
              {t('organizations.wizard.basicInfo')}
            </h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('organizations.wizard.organizationName')} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('organizations.namePlaceholder')}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>
        );

      case 'administrators':
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: '#333' }}>
              {t('organizations.wizard.selectAdministrators')}
            </h3>
            
            {/* Selected Administrators */}
            {formData.administrators.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  {t('organizations.wizard.selectedAdministrators')}:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {formData.administratorNames.map((name, index) => (
                    <div
                      key={formData.administrators[index]}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: '#e3f2fd',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '14px'
                      }}
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() => handleRemoveAdministrator(formData.administrators[index])}
                        style={{
                          marginLeft: '8px',
                          background: 'none',
                          border: 'none',
                          color: '#666',
                          cursor: 'pointer',
                          fontSize: '16px'
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User Search */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('organizations.wizard.searchUsers')}:
              </label>
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder={t('organizations.wizard.searchUsersPlaceholder')}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div style={{
                  marginTop: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {searchResults.map((searchUser) => (
                    <div
                      key={searchUser.id}
                      onClick={() => handleAddAdministrator(searchUser)}
                      style={{
                        padding: '12px',
                        borderBottom: '1px solid #eee',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '500' }}>{searchUser.name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{searchUser.email}</div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {searchUser.role === 'super_admin' ? t('users.roles.super_admin') : t('users.roles.admin')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {isSearching && (
                <div style={{ marginTop: '8px', color: '#666', fontSize: '14px' }}>
                  {t('organizations.wizard.searching')}...
                </div>
              )}
            </div>
          </div>
        );

      case 'details':
        return (
          <div>
            <h3 style={{ marginBottom: '20px', color: '#333' }}>
              {t('organizations.wizard.logoAndDescription')}
            </h3>
            
            {/* Logo Upload */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('organizations.wizard.logo')}:
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
                  {t('organizations.wizard.uploading')}...
                </div>
              )}
              {formData.logoUrl && (
                <div style={{ marginTop: '12px' }}>
                  <img
                    src={formData.logoUrl}
                    alt="Organization logo"
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

            {/* Description */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('organizations.wizard.description')}:
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('organizations.wizard.descriptionPlaceholder')}
                rows={4}
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
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, color: '#333' }}>{t('organizations.title')}</h2>
        <button
          onClick={() => setShowWizard(true)}
          style={{
            padding: '12px 24px',
            backgroundColor: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{ fontSize: '18px' }}>+</span>
          {t('organizations.createNew')}
        </button>
      </div>

      {/* Create Organization Wizard */}
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
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            position: 'relative'
          }}>
            {/* Close X Button */}
            <button
              onClick={() => {
                setShowWizard(false);
                setCurrentStep('basic');
                setFormData({
                  name: '',
                  description: '',
                  logoUrl: '',
                  administrators: [],
                  administratorNames: []
                });
              }}
              style={{
                position: 'absolute',
                top: '15px',
                left: '15px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#666',
                cursor: 'pointer',
                padding: '5px',
                lineHeight: '1'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#333';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#666';
              }}
            >
              ×
            </button>
            {/* Progress Indicator */}
            <div style={{ marginBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                {['basic', 'administrators', 'details'].map((step, index) => (
                  <div
                    key={step}
                    style={{
                      flex: 1,
                      height: '4px',
                      backgroundColor: currentStep === step || 
                        (step === 'basic') ||
                        (step === 'administrators' && (currentStep === 'administrators' || currentStep === 'details')) ||
                        (step === 'details' && currentStep === 'details')
                        ? '#007acc' : '#e9ecef',
                      marginRight: index < 2 ? '8px' : 0,
                      borderRadius: '2px'
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
                {t(`organizations.wizard.step${currentStep === 'basic' ? '1' : currentStep === 'administrators' ? '2' : '3'}of3`)}
              </div>
            </div>

            {renderWizardStep()}

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
              <div>
                {currentStep !== 'basic' && (
                  <button
                    onClick={prevStep}
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
                    {t('organizations.wizard.back')}
                  </button>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                {currentStep === 'details' ? (
                  <button
                    onClick={handleCreateOrganization}
                    disabled={isCreating || !formData.name.trim()}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: isCreating ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      opacity: isCreating ? 0.6 : 1
                    }}
                  >
                    {isCreating ? t('organizations.creating') : t('organizations.wizard.create')}
                  </button>
                ) : (
                  <button
                    onClick={nextStep}
                    disabled={currentStep === 'basic' && !formData.name.trim()}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#007acc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: (currentStep === 'basic' && !formData.name.trim()) ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      opacity: (currentStep === 'basic' && !formData.name.trim()) ? 0.6 : 1
                    }}
                  >
                    {t('organizations.wizard.next')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Organization Details Modal */}
      {showDetailsModal && selectedOrg && (
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
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            position: 'relative'
          }}>
            {/* Close X Button */}
            <button
              onClick={handleCloseDetails}
              style={{
                position: 'absolute',
                top: '15px',
                left: '15px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#666',
                cursor: 'pointer',
                padding: '5px',
                lineHeight: '1'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#333';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#666';
              }}
            >
              ×
            </button>

            <h3 style={{ marginBottom: '30px', color: '#333', paddingRight: '40px' }}>
              {t('organizations.details.title')}
            </h3>

            {/* Organization Name */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('organizations.wizard.organizationName')} *
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
                {t('organizations.wizard.description')}:
              </label>
              <textarea
                value={editData.description}
                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('organizations.wizard.descriptionPlaceholder')}
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
                {t('organizations.wizard.logo')}:
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleDetailsLogoUpload}
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
                  {t('organizations.wizard.uploading')}...
                </div>
              )}
              {editData.logoUrl && (
                <div style={{ marginTop: '12px' }}>
                  <img
                    src={editData.logoUrl}
                    alt="Organization logo"
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

            {/* Administrators */}
            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('organizations.administrators')}:
              </label>
              
              {/* Current Administrators */}
              {editData.administrators.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {editData.administratorNames.map((name, index) => (
                      <div
                        key={editData.administrators[index]}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          backgroundColor: '#e3f2fd',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '14px'
                        }}
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => handleRemoveDetailsAdministrator(editData.administrators[index])}
                          style={{
                            marginLeft: '8px',
                            background: 'none',
                            border: 'none',
                            color: '#666',
                            cursor: 'pointer',
                            fontSize: '16px'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Administrator */}
              <input
                type="text"
                value={detailsUserSearchTerm}
                onChange={(e) => setDetailsUserSearchTerm(e.target.value)}
                placeholder={t('organizations.wizard.searchUsersPlaceholder')}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              
              {/* Search Results */}
              {detailsSearchResults.length > 0 && (
                <div style={{
                  marginTop: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  maxHeight: '150px',
                  overflowY: 'auto'
                }}>
                  {detailsSearchResults.map((searchUser) => (
                    <div
                      key={searchUser.id}
                      onClick={() => handleAddDetailsAdministrator(searchUser)}
                      style={{
                        padding: '12px',
                        borderBottom: '1px solid #eee',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '500' }}>{searchUser.name}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{searchUser.email}</div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {searchUser.role === 'super_admin' ? t('users.roles.super_admin') : t('users.roles.admin')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {isDetailsSearching && (
                <div style={{ marginTop: '8px', color: '#666', fontSize: '14px' }}>
                  {t('organizations.wizard.searching')}...
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <button
                onClick={handleDeleteOrganization}
                disabled={isDeleting}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: isDeleting ? 0.6 : 1
                }}
              >
                {isDeleting ? t('organizations.details.deleting') : t('organizations.details.delete')}
              </button>
              
              <button
                onClick={handleUpdateOrganization}
                disabled={isUpdating || !editData.name.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (isUpdating || !editData.name.trim()) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: (isUpdating || !editData.name.trim()) ? 0.6 : 1
                }}
              >
                {isUpdating ? t('organizations.details.updating') : t('organizations.details.update')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Organizations Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          {t('organizations.loading')}
        </div>
      ) : organizations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          {t('organizations.noOrganizations')}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '20px'
        }}>
          {organizations.map((org) => (
            <div
              key={org.id}
              onClick={() => handleOpenDetails(org)}
              style={{
                backgroundColor: 'white',
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                padding: '20px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'box-shadow 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px' }}>
                {org.logoUrl ? (
                  <img
                    src={org.logoUrl}
                    alt={`${org.name} logo`}
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
                    🏢
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <h3 style={{ 
                    margin: '0 0 8px 0', 
                    color: '#333',
                    fontSize: '18px',
                    fontWeight: '600'
                  }}>
                    {org.name}
                  </h3>
                  {org.description && (
                    <p style={{
                      margin: '0 0 12px 0',
                      color: '#666',
                      fontSize: '14px',
                      lineHeight: '1.4'
                    }}>
                      {org.description}
                    </p>
                  )}
                </div>
              </div>
              
              <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.5' }}>
                {org.administratorNames && org.administratorNames.length > 0 && (
                  <div>
                    <strong>{t('organizations.administrators')}:</strong>
                    <div style={{ marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {org.administratorNames.map((name, index) => (
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
      )}
    </div>
  );
}