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
  members: string[]; // Array of member IDs
  memberNames: string[]; // Array of member names for display
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

type WizardStep = 'basic' | 'managers' | 'members' | 'details';

export default function Groups({ user }: GroupsProps) {
  const { t } = useTranslation();
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
    members: [] as string[],
    memberNames: [] as string[],
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
    members: [] as string[],
    memberNames: [] as string[],
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

  // Add manager to group
  const addManager = (user: UserManagementUser) => {
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

  // Remove manager from group
  const removeManager = (userId: string) => {
    const userIndex = formData.managers.indexOf(userId);
    if (userIndex > -1) {
      setFormData(prev => ({
        ...prev,
        managers: prev.managers.filter(id => id !== userId),
        managerNames: prev.managerNames.filter((_, index) => index !== userIndex)
      }));
    }
  };

  // Add member to group
  const addMember = (user: UserManagementUser) => {
    if (!formData.members.includes(user.id)) {
      setFormData(prev => ({
        ...prev,
        members: [...prev.members, user.id],
        memberNames: [...prev.memberNames, user.name]
      }));
    }
    setUserSearchTerm('');
    setSearchResults([]);
  };

  // Remove member from group
  const removeMember = (userId: string) => {
    const userIndex = formData.members.indexOf(userId);
    if (userIndex > -1) {
      setFormData(prev => ({
        ...prev,
        members: prev.members.filter(id => id !== userId),
        memberNames: prev.memberNames.filter((_, index) => index !== userIndex)
      }));
    }
  };

  // Logo upload handler
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert(t('groups.invalidFileType'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(t('groups.fileTooLarge'));
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
      alert(t('groups.uploadError'));
    } finally {
      setIsUploading(false);
    }
  };

  // Create group
  const handleCreateGroup = async () => {
    if (!formData.name.trim()) {
      alert(t('groups.nameRequired'));
      return;
    }

    setIsCreating(true);
    try {
      await addDoc(collection(db, 'groups'), {
        name: formData.name,
        description: formData.description,
        logoUrl: formData.logoUrl,
        managers: formData.managers,
        managerNames: formData.managerNames,
        members: formData.members,
        memberNames: formData.memberNames,
        maxMembers: formData.maxMembers,
        category: formData.category,
        status: formData.status,
        meetingSchedule: formData.meetingSchedule,
        location: formData.location,
        createdBy: user.id,
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
        members: [],
        memberNames: [],
        maxMembers: 10,
        category: 'therapy',
        status: 'active',
        meetingSchedule: '',
        location: ''
      });
      setShowWizard(false);
      setCurrentStep('basic');
      alert(t('groups.createSuccess'));
    } catch (error) {
      console.error('Error creating group:', error);
      alert(t('groups.createError'));
    } finally {
      setIsCreating(false);
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
        logoUrl: editData.logoUrl,
        managers: editData.managers,
        managerNames: editData.managerNames,
        members: editData.members,
        memberNames: editData.memberNames,
        maxMembers: editData.maxMembers,
        category: editData.category,
        status: editData.status,
        meetingSchedule: editData.meetingSchedule,
        location: editData.location
      });

      setShowDetailsModal(false);
      alert(t('groups.updateSuccess'));
    } catch (error) {
      console.error('Error updating group:', error);
      alert(t('groups.updateError'));
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete group
  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm(t('groups.deleteConfirm'))) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'groups', groupId));
      alert(t('groups.deleteSuccess'));
    } catch (error) {
      console.error('Error deleting group:', error);
      alert(t('groups.deleteError'));
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
      members: group.members || [],
      memberNames: group.memberNames || [],
      maxMembers: group.maxMembers || 10,
      category: group.category || 'therapy',
      status: group.status,
      meetingSchedule: group.meetingSchedule || '',
      location: group.location || ''
    });
    setShowDetailsModal(true);
  };

  const getStatusColor = (status: Group['status']) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'completed': return '#6c757d';
      case 'inactive': return '#dc3545';
      case 'full': return '#ffc107';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status: Group['status']) => {
    switch (status) {
      case 'active': return t('groups.status.active');
      case 'completed': return t('groups.status.completed');
      case 'inactive': return t('groups.status.inactive');
      case 'full': return t('groups.status.full');
      default: return status;
    }
  };

  const getCategoryText = (category: string) => {
    switch (category) {
      case 'therapy': return t('groups.category.therapy');
      case 'support': return t('groups.category.support');
      case 'training': return t('groups.category.training');
      case 'social': return t('groups.category.social');
      default: return category;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'therapy': return '🧠';
      case 'support': return '🤝';
      case 'training': return '📚';
      case 'social': return '👥';
      default: return '👥';
    }
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
        {groups.map(group => (
          <div
            key={group.id}
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: '12px',
              padding: '20px',
              backgroundColor: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onClick={() => handleOpenDetails(group)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
          >
            {/* Group Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              {group.logoUrl ? (
                <img
                  src={group.logoUrl}
                  alt={group.name}
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '8px',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '8px',
                  backgroundColor: '#f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>
                  {getCategoryIcon(group.category)}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#333' }}>
                  {group.name}
                </h3>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <div style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: 'white',
                    backgroundColor: getStatusColor(group.status)
                  }}>
                    {getStatusText(group.status)}
                  </div>
                  <div style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#666',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e0e0e0'
                  }}>
                    {getCategoryText(group.category)}
                  </div>
                </div>
              </div>
            </div>

            {/* Group Description */}
            {group.description && (
              <p style={{
                margin: '0 0 16px 0',
                color: '#666',
                fontSize: '14px',
                lineHeight: '1.4',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {group.description}
              </p>
            )}

            {/* Group Stats */}
            <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#666', marginBottom: '12px' }}>
              <div>
                <strong>{group.managers?.length || 0}</strong> {t('groups.managers')}
              </div>
              <div>
                <strong>{group.members?.length || 0}</strong>
                {group.maxMembers && `/${group.maxMembers}`} {t('groups.members')}
              </div>
            </div>

            {/* Meeting Info */}
            {(group.meetingSchedule || group.location) && (
              <div style={{ fontSize: '12px', color: '#888' }}>
                {group.meetingSchedule && (
                  <div>📅 {group.meetingSchedule}</div>
                )}
                {group.location && (
                  <div>📍 {group.location}</div>
                )}
              </div>
            )}
          </div>
        ))}
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
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '24px' }}>
              {t('groups.createNew')}
            </h3>

            {/* Step Indicator */}
            <div style={{ display: 'flex', marginBottom: '30px', gap: '10px' }}>
              {(['basic', 'managers', 'members', 'details'] as WizardStep[]).map((step, index) => (
                <div
                  key={step}
                  style={{
                    flex: 1,
                    height: '4px',
                    backgroundColor: index <= (['basic', 'managers', 'members', 'details'] as WizardStep[]).indexOf(currentStep) ? '#007acc' : '#e0e0e0',
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      {t('groups.category')}
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '16px'
                      }}
                    >
                      <option value="therapy">{t('groups.category.therapy')}</option>
                      <option value="support">{t('groups.category.support')}</option>
                      <option value="training">{t('groups.category.training')}</option>
                      <option value="social">{t('groups.category.social')}</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      {t('groups.maxMembers')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.maxMembers}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxMembers: parseInt(e.target.value) || 10 }))}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '16px'
                      }}
                    />
                  </div>
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
                          onClick={() => addManager(user)}
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
                            onClick={() => removeManager(formData.managers[index])}
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

            {currentStep === 'members' && (
              <div>
                <h4>{t('groups.wizard.members')}</h4>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    {t('groups.searchMembers')}
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
                          onClick={() => addMember(user)}
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
                          {formData.members.includes(user.id) && (
                            <span style={{ color: '#28a745', fontSize: '14px' }}>✓ {t('groups.added')}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Members */}
                {formData.memberNames.length > 0 && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      {t('groups.selectedMembers')} ({formData.memberNames.length}/{formData.maxMembers})
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {formData.memberNames.map((name, index) => (
                        <div
                          key={formData.members[index]}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 12px',
                            backgroundColor: '#e8f5e8',
                            borderRadius: '20px',
                            fontSize: '14px'
                          }}
                        >
                          {name}
                          <button
                            onClick={() => removeMember(formData.members[index])}
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
                      {t('groups.wizard.uploading')}...
                    </div>
                  )}
                  {formData.logoUrl && (
                    <img
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
                    />
                  )}
                </div>

                {/* Meeting Schedule and Location */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    {t('groups.meetingSchedule')}
                  </label>
                  <input
                    type="text"
                    value={formData.meetingSchedule}
                    onChange={(e) => setFormData(prev => ({ ...prev, meetingSchedule: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '16px'
                    }}
                    placeholder={t('groups.enterSchedule')}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    {t('groups.location')}
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '16px'
                    }}
                    placeholder={t('groups.enterLocation')}
                  />
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
              <div>
                {currentStep !== 'basic' && (
                  <button
                    onClick={() => {
                      const steps: WizardStep[] = ['basic', 'managers', 'members', 'details'];
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
                      members: [],
                      memberNames: [],
                      maxMembers: 10,
                      category: 'therapy',
                      status: 'active',
                      meetingSchedule: '',
                      location: ''
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
                  {t('groups.wizard.cancel')}
                </button>
                
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
                      const steps: WizardStep[] = ['basic', 'managers', 'members', 'details'];
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '24px' }}>
                {selectedGroup.name}
              </h3>
              <button
                onClick={() => handleDeleteGroup(selectedGroup.id)}
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
                {isDeleting ? t('groups.deleting') : t('groups.delete')}
              </button>
            </div>

            {/* Edit Form */}
            <div style={{ display: 'grid', gap: '20px' }}>
              <div>
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
                    fontSize: '16px'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  {t('groups.description')}
                </label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '16px',
                    minHeight: '100px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    {t('groups.category')}
                  </label>
                  <select
                    value={editData.category}
                    onChange={(e) => setEditData(prev => ({ ...prev, category: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '16px'
                    }}
                  >
                    <option value="therapy">{t('groups.category.therapy')}</option>
                    <option value="support">{t('groups.category.support')}</option>
                    <option value="training">{t('groups.category.training')}</option>
                    <option value="social">{t('groups.category.social')}</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    {t('groups.status')}
                  </label>
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value as Group['status'] }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '16px'
                    }}
                  >
                    <option value="active">{t('groups.status.active')}</option>
                    <option value="inactive">{t('groups.status.inactive')}</option>
                    <option value="full">{t('groups.status.full')}</option>
                    <option value="completed">{t('groups.status.completed')}</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    {t('groups.maxMembers')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={editData.maxMembers}
                    onChange={(e) => setEditData(prev => ({ ...prev, maxMembers: parseInt(e.target.value) || 10 }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '16px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    {t('groups.meetingSchedule')}
                  </label>
                  <input
                    type="text"
                    value={editData.meetingSchedule}
                    onChange={(e) => setEditData(prev => ({ ...prev, meetingSchedule: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    {t('groups.location')}
                  </label>
                  <input
                    type="text"
                    value={editData.location}
                    onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '16px'
                    }}
                  />
                </div>
              </div>

              {/* Managers and Members Display */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    {t('groups.managers')} ({editData.managerNames.length})
                  </label>
                  <div style={{
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    padding: '12px',
                    minHeight: '100px',
                    backgroundColor: '#f8f9fa'
                  }}>
                    {editData.managerNames.length > 0 ? (
                      editData.managerNames.map((name, index) => (
                        <div key={index} style={{ padding: '4px 0', fontSize: '14px' }}>
                          👤 {name}
                        </div>
                      ))
                    ) : (
                      <div style={{ color: '#666', fontSize: '14px' }}>
                        {t('groups.noManagers')}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    {t('groups.members')} ({editData.memberNames.length}/{editData.maxMembers})
                  </label>
                  <div style={{
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    padding: '12px',
                    minHeight: '100px',
                    backgroundColor: '#f8f9fa'
                  }}>
                    {editData.memberNames.length > 0 ? (
                      editData.memberNames.map((name, index) => (
                        <div key={index} style={{ padding: '4px 0', fontSize: '14px' }}>
                          👥 {name}
                        </div>
                      ))
                    ) : (
                      <div style={{ color: '#666', fontSize: '14px' }}>
                        {t('groups.noMembers')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
                {t('groups.cancel')}
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
