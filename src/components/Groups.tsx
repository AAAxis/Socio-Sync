import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User, UserManagementUser } from '../types';
import { getApiUrl } from '../config';

interface Group {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  managers: string[]; // Array of user IDs
  managerNames: string[]; // Array of user names for display
  maxMembers?: number;
  category: string; // e.g., 'therapy', 'support', 'training', 'social'
  status: 'active' | 'inactive' | 'full' | 'completed';
  meetingSchedule?: string;
  location?: string;
  createdBy: string;
  createdByEmail: string;
  createdAt: any;
}

interface GroupsProps {
  user: User;
}

type WizardStep = 'basic' | 'managers' | 'details';

export default function Groups({ user }: GroupsProps) {
  const { t, i18n } = useTranslation();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
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
    maxMembers: 10,
    category: 'therapy' as string,
    status: 'active' as Group['status'],
    meetingSchedule: '',
    location: ''
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
    maxMembers: 10,
    category: 'therapy',
    status: 'active' as Group['status'],
    meetingSchedule: '',
    location: ''
  });

  // Load groups
  useEffect(() => {
    const q = query(collection(db, 'groups'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Group[];
      setGroups(groupsData);
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
      const users = snapshot.docs
        .map(doc => ({
        id: doc.id,
        ...doc.data()
        }))
        .filter((user: any) => !user.deleted) as UserManagementUser[];

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

    setIsUploading(true);
    try {
      // Validate and resize image to max 1000x1000 JPG
      const { validateAndResizeIcon } = await import('../utils');
      const resizedFile = await validateAndResizeIcon(file);

      const formDataUpload = new FormData();
      formDataUpload.append('file', resizedFile);

      const response = await fetch(getApiUrl('/upload'), {
        method: 'POST',
        body: formDataUpload,
      });

      if (response.ok) {
        const result = await response.json();
        // Add cache-busting parameter to force image reload
        const imageUrl = result.file_url + (result.file_url.includes('?') ? '&' : '?') + 't=' + Date.now();
        setFormData(prev => ({ ...prev, logoUrl: imageUrl }));
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      alert(error.message || 'Failed to upload icon. Please ensure the image is JPG format and try again.');
    } finally {
      setIsUploading(false);
      // Reset file input to allow selecting the same file again
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Create group
  const handleCreateGroup = async () => {
    if (!formData.name.trim()) {
      return;
      return;
    }

    setIsCreating(true);
    try {
      await addDoc(collection(db, 'groups'), {
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
        maxMembers: 10,
        category: 'therapy',
        status: 'active',
        meetingSchedule: '',
        location: ''
      });
      setShowWizard(false);
      setCurrentStep('basic');
      // Group created successfully
    } catch (error) {
      console.error('Error creating group:', error);
      console.error('Create error');
    } finally {
      setIsCreating(false);
    }
  };

  // Logo upload handler for edit modal
  const handleDetailsLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Validate and resize image to max 1000x1000 JPG
      const { validateAndResizeIcon } = await import('../utils');
      const resizedFile = await validateAndResizeIcon(file);

      const formDataUpload = new FormData();
      formDataUpload.append('file', resizedFile);

      const response = await fetch(getApiUrl('/upload'), {
        method: 'POST',
        body: formDataUpload,
      });

      if (response.ok) {
        const result = await response.json();
        // Add cache-busting parameter to force image reload
        const imageUrl = result.file_url + (result.file_url.includes('?') ? '&' : '?') + 't=' + Date.now();
        setEditData(prev => ({ ...prev, logoUrl: imageUrl }));
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      alert(error.message || 'Failed to upload icon. Please ensure the image is JPG format and try again.');
    } finally {
      setIsUploading(false);
      // Reset file input to allow selecting the same file again
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Update group
  const handleUpdateGroup = async () => {
    if (!selectedGroup || !editData.name.trim()) return;

    setIsUpdating(true);
    try {
      const groupRef = doc(db, 'groups', selectedGroup.id);
      await updateDoc(groupRef, {
        name: editData.name,
        description: editData.description,
        logoUrl: editData.logoUrl
      });

      setShowDetailsModal(false);
      // Group updated successfully
    } catch (error) {
      console.error('Error updating group:', error);
      console.error('Update error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete group
  const handleDeleteGroup = async (groupId: string) => {
    // Delete group

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'groups', groupId));
      // Group deleted successfully - close modal and reset selected group
      setShowDetailsModal(false);
      setSelectedGroup(null);
    } catch (error) {
      console.error('Error deleting group:', error);
      console.error('Delete error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open details modal
  const handleOpenDetails = (group: Group) => {
    setSelectedGroup(group);
    setEditData({
      name: group.name,
      description: group.description || '',
      logoUrl: group.logoUrl || '',
      managers: group.managers || [],
      managerNames: group.managerNames || [],
      maxMembers: group.maxMembers || 10,
      category: group.category || 'therapy',
      status: group.status,
      meetingSchedule: group.meetingSchedule || '',
      location: group.location || ''
    });
    setShowDetailsModal(true);
  };


  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>
          {t('groups.loading')}...
        </div>
      </div>
    );
  }

  return (
    <div className="groups-container" style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 600, color: '#333' }}>
            {t('groups.title')}
          </h2>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '16px' }}>
            {t('groups.subtitle')}
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
          ➕ {t('groups.createNew')}
        </button>
      </div>

      {/* Groups Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '20px'
      }}>
        {groups.map((group) => {
          const isRTL = i18n.language === 'he';
          return (
          <div
            key={group.id}
            onClick={() => handleOpenDetails(group)}
            style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #dcfce7',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                transition: 'all 0.3s ease',
              cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.backgroundColor = '#ecfdf5';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.backgroundColor = '#f0fdf4';
            }}
          >
              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                marginBottom: '16px',
                flexDirection: isRTL ? 'row-reverse' : 'row'
              }}>
              {group.logoUrl ? (
                <img
                  src={group.logoUrl}
                  alt={`${group.name} logo`}
                  style={{
                      width: '60px',
                      height: '60px',
                    objectFit: 'cover',
                      borderRadius: '8px',
                      [isRTL ? 'marginLeft' : 'marginRight']: '16px',
                      border: '2px solid #dcfce7',
                      backgroundColor: 'white',
                      padding: '4px'
                  }}
                />
              ) : (
                <div
                  style={{
                      width: '60px',
                      height: '60px',
                      backgroundColor: '#dcfce7',
                      border: '2px solid #bbf7d0',
                      borderRadius: '8px',
                      [isRTL ? 'marginLeft' : 'marginRight']: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                      fontSize: '28px',
                      color: '#16a34a',
                      flexShrink: 0
                  }}
                >
                  👥
                </div>
              )}
                <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ 
                    margin: '0 0 10px 0', 
                    color: '#1e293b',
                    fontSize: '20px',
                    fontWeight: '600',
                    lineHeight: '1.3'
                }}>
                  {group.name}
                </h3>
                {group.description && (
                  <p style={{
                      margin: '0 0 14px 0',
                      color: '#64748b',
                    fontSize: '14px',
                      lineHeight: '1.5'
                  }}>
                    {group.description}
                  </p>
                )}
              </div>
            </div>
            
              <div style={{ 
                fontSize: '14px', 
                color: '#64748b', 
                lineHeight: '1.6',
                paddingTop: '12px',
                borderTop: '1px solid #dcfce7'
              }}>
              {group.managerNames && group.managerNames.length > 0 && (
                <div>
                    <strong style={{ color: '#475569', display: 'block', marginBottom: '8px' }}>
                      {t('groups.managers')}:
                    </strong>
                    <div style={{ 
                      marginTop: '4px', 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: '6px',
                      flexDirection: isRTL ? 'row-reverse' : 'row'
                    }}>
                    {group.managerNames.map((name, index) => (
                      <span
                        key={index}
                        style={{
                            backgroundColor: '#dcfce7',
                            color: '#166534',
                            padding: '4px 12px',
                            borderRadius: '16px',
                            fontSize: '12px',
                            fontWeight: '500',
                            border: '1px solid #bbf7d0'
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
          );
        })}
      </div>

      {groups.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#666'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>
            {t('groups.noGroups')}
          </h3>
          <p style={{ margin: 0, fontSize: '16px' }}>
            {t('groups.noGroupsDescription')}
          </p>
        </div>
      )}

      {/* Create Group Wizard Modal */}
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
            overflow: 'auto',
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
                  managers: [],
                  managerNames: [],
                  maxMembers: 10,
                  category: 'therapy',
                  status: 'active',
                  meetingSchedule: '',
                  location: ''
                });
              }}
              style={{
                position: 'absolute',
                top: '15px',
                ...(i18n.language === 'he' ? { left: '15px' } : { right: '15px' }),
                background: 'none',
                border: 'none',
                fontSize: '28px',
                color: '#666',
                cursor: 'pointer',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'all 0.2s ease',
                padding: 0,
                lineHeight: 1
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
                e.currentTarget.style.color = '#000';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#666';
              }}
              title={t('groups.close') || 'Close'}
            >
              ×
            </button>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '24px' }}>
              {t('groups.createNew')}
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
                <h4>{t('groups.wizard.basicInfo')}</h4>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    {t('groups.name')} *
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
                    placeholder={t('groups.enterName')}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    {t('groups.description')}
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
                    placeholder={t('groups.enterDescription')}
                  />
                </div>
              </div>
            )}

            {currentStep === 'managers' && (
              <div>
                <h4>{t('groups.wizard.managers')}</h4>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    {t('groups.searchManagers')}
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
                    placeholder={t('groups.searchUsersPlaceholder')}
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
                            <span style={{ color: '#28a745', fontSize: '14px' }}>✓ {t('groups.added')}</span>
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
                      {t('groups.selectedManagers')} ({formData.managerNames.length})
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
                <h4>{t('groups.wizard.details')}</h4>
                
                {/* Logo Upload */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    {t('groups.logo')}
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,.jpg,.jpeg"
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
                      {t('groups.wizard.uploading')}...
                    </div>
                  )}
                  {formData.logoUrl && (
                    <img
                      key={formData.logoUrl}
                      src={formData.logoUrl}
                      alt="Group logo"
                      style={{
                        marginTop: '12px',
                        width: '100px',
                        height: '100px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #ddd'
                      }}
                      onLoad={() => setIsUploading(false)}
                    />
                  )}
                </div>

              </div>
            )}

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '30px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
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
                    {t('groups.wizard.back')}
                  </button>
                )}
                {currentStep === 'details' ? (
                  <button
                    onClick={handleCreateGroup}
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
                    {isCreating ? t('groups.creating') : t('groups.create')}
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
                    {t('groups.wizard.next')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Details Modal */}
      {showDetailsModal && selectedGroup && (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', position: 'relative' }}>
              <h3 style={{ margin: 0, fontSize: '24px' }}>
                {selectedGroup.name}
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  color: '#666',
                  cursor: 'pointer',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease',
                  padding: 0,
                  lineHeight: 1,
                  ...(i18n.language === 'he' ? { order: -1 } : {})
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0';
                  e.currentTarget.style.color = '#000';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#666';
                }}
                title={t('groups.close') || 'Close'}
              >
                ×
              </button>
            </div>

            {/* Group Name */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('groups.name')} *
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
                {t('groups.description')}:
              </label>
              <textarea
                value={editData.description}
                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('groups.enterDescription')}
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
                {t('groups.logo')}
              </label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,.jpg,.jpeg"
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
                  {t('groups.wizard.uploading')}...
                </div>
              )}
              {editData.logoUrl && (
                <div style={{ marginTop: '12px' }}>
                  <img
                    key={editData.logoUrl}
                    src={editData.logoUrl}
                    alt="Group logo"
                    style={{
                      maxWidth: '200px',
                      maxHeight: '100px',
                      border: '1px solid #ddd',
                      borderRadius: '6px'
                    }}
                    onLoad={() => setIsUploading(false)}
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px' }}>
              <button
                onClick={() => handleDeleteGroup(selectedGroup.id)}
                disabled={isDeleting}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  background: '#dc3545',
                  color: 'white',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  opacity: isDeleting ? 0.6 : 1
                }}
              >
                {isDeleting ? t('groups.deleting') : t('groups.delete')}
              </button>
              <button
                onClick={handleUpdateGroup}
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
                {isUpdating ? t('groups.updating') : t('groups.update')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
