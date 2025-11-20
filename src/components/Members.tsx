import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User, UserManagementUser } from '../types';

interface Group {
  id: string;
  name: string;
  managers: string[];
  managerNames: string[];
}

interface Program {
  id: string;
  name: string;
  managers: string[];
  managerNames: string[];
}

interface Organization {
  id: string;
  name: string;
  administrators: string[];
  administratorNames: string[];
}

interface MembersProps {
  user: User;
}

type FilterType = 'groups' | 'programs' | 'organizations';

export default function Members({ user }: MembersProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('groups');
  
  // Data states
  const [groups, setGroups] = useState<Group[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [allUsers, setAllUsers] = useState<UserManagementUser[]>([]);
  
  // Selected entity
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [members, setMembers] = useState<UserManagementUser[]>([]);
  
  // Member management
  const [showAddMember, setShowAddMember] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserManagementUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load users (exclude deleted users)
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs
          .map(doc => ({
          id: doc.id,
          ...doc.data()
          }))
          .filter((user: any) => !user.deleted) as UserManagementUser[];
        setAllUsers(usersData);

        // Load groups where user is manager
        const groupsSnapshot = await getDocs(collection(db, 'groups'));
        const groupsData = groupsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((group: any) => group.managers?.includes(user.id)) as Group[];
        setGroups(groupsData);

        // Load programs where user is manager
        const programsSnapshot = await getDocs(collection(db, 'programs'));
        const programsData = programsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((program: any) => program.managers?.includes(user.id)) as Program[];
        setPrograms(programsData);

        // Load organizations where user is administrator
        const orgsSnapshot = await getDocs(collection(db, 'organizations'));
        const orgsData = orgsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((org: any) => org.administrators?.includes(user.id)) as Organization[];
        setOrganizations(orgsData);

        // Set default selection
        if (groupsData.length > 0) {
          setActiveFilter('groups');
          setSelectedEntityId(groupsData[0].id);
        } else if (programsData.length > 0) {
          setActiveFilter('programs');
          setSelectedEntityId(programsData[0].id);
        } else if (orgsData.length > 0) {
          setActiveFilter('organizations');
          setSelectedEntityId(orgsData[0].id);
        }

      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user.id]);

  // Search users for adding as members
  const searchUsers = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const filtered = allUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      ).filter(user => {
        // Filter out users who are already members
        const currentMemberIds = members.map(m => m.id);
        return !currentMemberIds.includes(user.id);
      });

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
  }, [userSearchTerm, allUsers, members]);

  // Update members when selection changes
  useEffect(() => {
    if (!selectedEntityId) {
      setMembers([]);
      return;
    }

    let memberIds: string[] = [];
    
    if (activeFilter === 'groups') {
      const group = groups.find(g => g.id === selectedEntityId);
      memberIds = group?.managers || [];
    } else if (activeFilter === 'programs') {
      const program = programs.find(p => p.id === selectedEntityId);
      memberIds = program?.managers || [];
    } else if (activeFilter === 'organizations') {
      const org = organizations.find(o => o.id === selectedEntityId);
      memberIds = org?.administrators || [];
    }

    const filteredMembers = allUsers.filter(user => memberIds.includes(user.id));
    setMembers(filteredMembers);
  }, [selectedEntityId, activeFilter, groups, programs, organizations, allUsers]);

  // Add member to entity
  const handleAddMember = async (newUser: UserManagementUser) => {
    if (!selectedEntityId || isUpdating) return;

    setIsUpdating(true);
    try {
      let collectionName = '';
      let currentEntity: any = null;

      if (activeFilter === 'groups') {
        collectionName = 'groups';
        currentEntity = groups.find(g => g.id === selectedEntityId);
      } else if (activeFilter === 'programs') {
        collectionName = 'programs';
        currentEntity = programs.find(p => p.id === selectedEntityId);
      } else if (activeFilter === 'organizations') {
        collectionName = 'organizations';
        currentEntity = organizations.find(o => o.id === selectedEntityId);
      }

      if (!currentEntity) return;

      const updatedManagers = [...(currentEntity.managers || currentEntity.administrators || []), newUser.id];
      const updatedManagerNames = [...(currentEntity.managerNames || currentEntity.administratorNames || []), newUser.name];

      const updateData: any = {};
      if (activeFilter === 'organizations') {
        updateData.administrators = updatedManagers;
        updateData.administratorNames = updatedManagerNames;
      } else {
        updateData.managers = updatedManagers;
        updateData.managerNames = updatedManagerNames;
      }

      await updateDoc(doc(db, collectionName, selectedEntityId), updateData);

      // Update local state
      if (activeFilter === 'groups') {
        setGroups(prev => prev.map(g => 
          g.id === selectedEntityId 
            ? { ...g, managers: updatedManagers, managerNames: updatedManagerNames }
            : g
        ));
      } else if (activeFilter === 'programs') {
        setPrograms(prev => prev.map(p => 
          p.id === selectedEntityId 
            ? { ...p, managers: updatedManagers, managerNames: updatedManagerNames }
            : p
        ));
      } else if (activeFilter === 'organizations') {
        setOrganizations(prev => prev.map(o => 
          o.id === selectedEntityId 
            ? { ...o, administrators: updatedManagers, administratorNames: updatedManagerNames }
            : o
        ));
      }

      setUserSearchTerm('');
      setSearchResults([]);
      setShowAddMember(false);
    } catch (error) {
      console.error('Error adding member:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Remove member from entity (but not yourself)
  const handleRemoveMember = async (userId: string) => {
    if (!selectedEntityId || isUpdating || userId === user.id) return;

    setIsUpdating(true);
    try {
      let collectionName = '';
      let currentEntity: any = null;

      if (activeFilter === 'groups') {
        collectionName = 'groups';
        currentEntity = groups.find(g => g.id === selectedEntityId);
      } else if (activeFilter === 'programs') {
        collectionName = 'programs';
        currentEntity = programs.find(p => p.id === selectedEntityId);
      } else if (activeFilter === 'organizations') {
        collectionName = 'organizations';
        currentEntity = organizations.find(o => o.id === selectedEntityId);
      }

      if (!currentEntity) return;

      const currentManagers = currentEntity.managers || currentEntity.administrators || [];
      const currentManagerNames = currentEntity.managerNames || currentEntity.administratorNames || [];
      
      const userIndex = currentManagers.indexOf(userId);
      if (userIndex === -1) return;

      const updatedManagers = currentManagers.filter((id: string) => id !== userId);
      const updatedManagerNames = currentManagerNames.filter((_: string, index: number) => index !== userIndex);

      const updateData: any = {};
      if (activeFilter === 'organizations') {
        updateData.administrators = updatedManagers;
        updateData.administratorNames = updatedManagerNames;
      } else {
        updateData.managers = updatedManagers;
        updateData.managerNames = updatedManagerNames;
      }

      await updateDoc(doc(db, collectionName, selectedEntityId), updateData);

      // Update local state
      if (activeFilter === 'groups') {
        setGroups(prev => prev.map(g => 
          g.id === selectedEntityId 
            ? { ...g, managers: updatedManagers, managerNames: updatedManagerNames }
            : g
        ));
      } else if (activeFilter === 'programs') {
        setPrograms(prev => prev.map(p => 
          p.id === selectedEntityId 
            ? { ...p, managers: updatedManagers, managerNames: updatedManagerNames }
            : p
        ));
      } else if (activeFilter === 'organizations') {
        setOrganizations(prev => prev.map(o => 
          o.id === selectedEntityId 
            ? { ...o, administrators: updatedManagers, administratorNames: updatedManagerNames }
            : o
        ));
      }
    } catch (error) {
      console.error('Error removing member:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Get available entities for current filter
  const getAvailableEntities = () => {
    switch (activeFilter) {
      case 'groups': return groups;
      case 'programs': return programs;
      case 'organizations': return organizations;
      default: return [];
    }
  };

  // Check if user has access to any entities
  const hasAccess = groups.length > 0 || programs.length > 0 || organizations.length > 0;

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>
          {t('members.loading')}...
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#333' }}>
          {t('members.noAccess')}
        </h3>
        <p style={{ margin: 0, fontSize: '16px', color: '#666' }}>
          {t('members.noAccessDescription')}
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '600', color: '#333' }}>
          {t('members.title')}
        </h2>
        <p style={{ margin: 0, fontSize: '16px', color: '#666' }}>
          {t('members.subtitle')}
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {groups.length > 0 && (
          <button
            onClick={() => {
              setActiveFilter('groups');
              setSelectedEntityId(groups[0]?.id || '');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: activeFilter === 'groups' ? '2px solid #007acc' : '1px solid #ddd',
              background: activeFilter === 'groups' ? '#e6f2fb' : '#fff',
              color: activeFilter === 'groups' ? '#007acc' : '#333',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeFilter === 'groups' ? '600' : '400'
            }}
          >
            👥 {t('members.groups')} ({groups.length})
          </button>
        )}
        {programs.length > 0 && (
          <button
            onClick={() => {
              setActiveFilter('programs');
              setSelectedEntityId(programs[0]?.id || '');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: activeFilter === 'programs' ? '2px solid #007acc' : '1px solid #ddd',
              background: activeFilter === 'programs' ? '#e6f2fb' : '#fff',
              color: activeFilter === 'programs' ? '#007acc' : '#333',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeFilter === 'programs' ? '600' : '400'
            }}
          >
            📋 {t('members.programs')} ({programs.length})
          </button>
        )}
        {organizations.length > 0 && (
          <button
            onClick={() => {
              setActiveFilter('organizations');
              setSelectedEntityId(organizations[0]?.id || '');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: activeFilter === 'organizations' ? '2px solid #007acc' : '1px solid #ddd',
              background: activeFilter === 'organizations' ? '#e6f2fb' : '#fff',
              color: activeFilter === 'organizations' ? '#007acc' : '#333',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeFilter === 'organizations' ? '600' : '400'
            }}
          >
            🏢 {t('members.organizations')} ({organizations.length})
          </button>
        )}
      </div>

      {/* Entity Selector */}
      {getAvailableEntities().length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
            {activeFilter === 'groups' && t('members.selectGroup')}
            {activeFilter === 'programs' && t('members.selectProgram')}
            {activeFilter === 'organizations' && t('members.selectOrganization')}
          </label>
          <select
            value={selectedEntityId}
            onChange={(e) => setSelectedEntityId(e.target.value)}
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '200px'
            }}
          >
            {getAvailableEntities().map((entity: any) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Members List */}
      {selectedEntityId && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#333' }}>
              {t('members.membersList')} ({members.length})
            </h3>
            <button
              onClick={() => setShowAddMember(true)}
              disabled={isUpdating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: '#007acc',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isUpdating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: isUpdating ? 0.6 : 1
              }}
            >
              + {t('members.addMember')}
            </button>
          </div>
          
          {members.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              border: '1px solid #e9ecef', 
              borderRadius: '8px',
              backgroundColor: '#f8f9fa'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>👥</div>
              <p style={{ margin: 0, color: '#666' }}>{t('members.noMembers')}</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px'
            }}>
              {members.map((member) => (
                <div
                  key={member.id}
                  style={{
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    padding: '16px',
                    backgroundColor: 'white'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #e9ecef',
                        borderRadius: '50%',
                        marginRight: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        color: '#6c757d'
                      }}
                    >
                      👤
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: '#333' }}>
                        {member.name} {member.id === user.id && '(You)'}
                      </h4>
                      <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                        {member.email}
                      </p>
                    </div>
                    {member.id !== user.id && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={isUpdating}
                        style={{
                          background: 'none',
                          border: '1px solid #dc3545',
                          borderRadius: '4px',
                          color: '#dc3545',
                          cursor: isUpdating ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          padding: '4px 8px',
                          opacity: isUpdating ? 0.6 : 1
                        }}
                        title={t('members.removeMember')}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    <div style={{ marginBottom: '4px' }}>
                      <strong>{t('members.role')}:</strong> {t(`users.roles.${member.role}`)}
                    </div>
                    <div>
                      <strong>{t('members.lastLogin')}:</strong> {
                        member.lastLoginAt && typeof member.lastLoginAt === 'object' && (member.lastLoginAt as any).seconds
                          ? new Date((member.lastLoginAt as any).seconds * 1000).toLocaleDateString()
                          : member.lastLoginAt && typeof member.lastLoginAt === 'string'
                          ? new Date(member.lastLoginAt).toLocaleDateString()
                          : t('members.never')
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
                {t('members.addMember')}
              </h3>
              <button
                onClick={() => {
                  setShowAddMember(false);
                  setUserSearchTerm('');
                  setSearchResults([]);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            {/* Search Input */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('members.searchUsers')}
              </label>
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder={t('members.searchPlaceholder')}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Search Results */}
            {isSearching && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                {t('members.searching')}...
              </div>
            )}

            {searchResults.length > 0 && (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
                  {t('members.searchResults')} ({searchResults.length})
                </h4>
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      border: '1px solid #e9ecef',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      backgroundColor: '#f8f9fa'
                    }}
                    onClick={() => handleAddMember(user)}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: '#e9ecef',
                        borderRadius: '50%',
                        marginRight: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px'
                      }}
                    >
                      👤
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', fontSize: '14px' }}>{user.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
                      <div style={{ fontSize: '11px', color: '#888' }}>
                        {t(`users.roles.${user.role}`)}
                      </div>
                    </div>
                    <button
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#007acc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      {t('members.add')}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {userSearchTerm.length >= 2 && !isSearching && searchResults.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                {t('members.noResults')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
