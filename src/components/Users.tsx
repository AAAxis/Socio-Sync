import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { User, UserManagementUser } from '../types';

interface UsersProps {
  user: User;
  filteredUsers: UserManagementUser[];
  userSearchTerm: string;
  handleUserSearchChange: (term: string) => void;
  userStatusFilter: string;
  handleUserStatusFilterChange: (filter: string) => void;
  showUserDropdown: string | null;
  setShowUserDropdown: (userId: string | null) => void;
  handleToggle2FA: (userId: string) => void;
  handleDeleteUser: (userId: string) => void;
  handleEditUser?: (userId: string) => void;
  handleUserStatusChange: (userId: string, status: 'active' | 'blocked') => void;
  // Pagination props
  userCurrentPage: number;
  setUserCurrentPage: (page: number) => void;
  usersPerPage: number;
  totalUsers: number;
}

export default function Users({
  user,
  filteredUsers,
  userSearchTerm,
  handleUserSearchChange,
  userStatusFilter,
  handleUserStatusFilterChange,
  showUserDropdown,
  setShowUserDropdown,
  handleToggle2FA,
  handleDeleteUser,
  handleEditUser,
  handleUserStatusChange,
  // Pagination props
  userCurrentPage,
  setUserCurrentPage,
  usersPerPage,
  totalUsers
}: UsersProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [selectedRoleTab, setSelectedRoleTab] = React.useState<'all' | 'super_admin' | 'admin' | 'department_manager' | 'program_manager' | 'team_manager' | 'instructor'>('all');

  // Pagination logic
  const roleFilteredUsers = selectedRoleTab === 'all' ? filteredUsers : filteredUsers.filter(u => u.role === selectedRoleTab);
  const getPaginatedUsers = () => {
    const startIndex = (userCurrentPage - 1) * usersPerPage;
    return roleFilteredUsers.slice(startIndex, startIndex + usersPerPage);
  };

  const totalPages = Math.ceil((roleFilteredUsers.length || 0) / usersPerPage);
  const roleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return t('users.roles.super_admin');
      case 'admin': return t('users.roles.admin');
      case 'department_manager': return t('users.roles.department_manager');
      case 'program_manager': return t('users.roles.program_manager');
      case 'team_manager': return t('users.roles.team_manager');
      case 'instructor': return t('users.roles.instructor');
      default: return role;
    }
  };
  
  return (
    <div className="users-management" style={{ position: 'relative' }}>
      <div className="users-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2>{t('users.title')}</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="users-controls">
            <input
              type="text"
              placeholder={t('users.searchPlaceholder')}
              value={userSearchTerm}
              onChange={(e) => handleUserSearchChange(e.target.value)}
              className="user-search-input"
            />
            <select
              value={userStatusFilter}
              onChange={(e) => handleUserStatusFilterChange(e.target.value)}
              className="user-status-filter"
            >
              <option value="all">{t('users.allUsers')}</option>
              <option value="active">{t('users.statusActive')}</option>
              <option value="blocked">{t('users.statusBlocked')}</option>
            </select>
          </div>
          {(user.role === 'super_admin' || user.role === 'department_manager' || user.role === 'program_manager' || user.role === 'team_manager') && (
          <button
            onClick={() => navigate('/create')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#005a9e';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#007acc';
            }}
          >
            <span style={{ fontSize: '18px' }}>+</span>
            {t('users.addUser')}
          </button>
          )}
        </div>
      </div>
      
      {user.role === 'super_admin' && (
        <div style={{ margin: '10px 0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: t('users.allUsers') },
            { key: 'super_admin', label: t('users.roles.super_admin') },
            { key: 'admin', label: t('users.roles.admin') },
            { key: 'department_manager', label: t('users.roles.department_manager') },
            { key: 'program_manager', label: t('users.roles.program_manager') },
            { key: 'team_manager', label: t('users.roles.team_manager') },
            { key: 'instructor', label: t('users.roles.instructor') },
          ].map(tab => (
            <button
              key={String(tab.key)}
              onClick={() => { setUserCurrentPage(1); setSelectedRoleTab(tab.key as any); }}
              style={{
                padding: '6px 10px',
                borderRadius: '14px',
                border: selectedRoleTab === tab.key ? '1px solid #007acc' : '1px solid #ddd',
                background: selectedRoleTab === tab.key ? '#e6f2fb' : '#fff',
                color: '#333',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>{t('users.name')}</th>
              <th>{t('users.email')}</th>
              <th>{t('users.status')}</th>
              <th>{t('users.lastLogin')}</th>
              <th>{t('users.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {getPaginatedUsers().map((userItem) => (
              <tr key={userItem.id} className="user-row">
                <td className="user-name-cell">
                  <div className="user-name-with-avatar">
                    <div className="user-avatar">
                      {userItem.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{userItem.name}</span>
                  </div>
                </td>
                <td className="user-email-cell">{userItem.email}</td>
                <td className="user-status-cell" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={userItem.blocked || userItem.restricted ? 'blocked' : 'active'}
                    onChange={(e) => handleUserStatusChange(userItem.id, e.target.value as 'active' | 'blocked')}
                    className={`user-status-dropdown status-${userItem.blocked || userItem.restricted ? 'blocked' : 'active'}`}
                    disabled={userItem.id === user.id} // Prevent users from blocking themselves
                  >
                    <option value="active">{t('users.statusActive')}</option>
                    <option value="blocked">{t('users.statusBlocked')}</option>
                  </select>
                </td>
                <td className="user-login-cell">
                  {userItem.lastLoginAt 
                    ? new Date(userItem.lastLoginAt).toLocaleDateString('en-GB')
                    : t('users.never')
                  }
                </td>
                <td className="user-actions-cell">
                  <div className="user-actions">
                    <button
                      onClick={() => setShowUserDropdown(
                        showUserDropdown === userItem.id ? null : userItem.id
                      )}
                      className="user-action-btn"
                    >
                      ⋯
                    </button>
                    
                    {showUserDropdown === userItem.id && (
                      <div className="user-dropdown">
                        <button onClick={() => handleEditUser ? handleEditUser(userItem.id) : navigate(`/edit-user/${userItem.id}`)}>
                          {t('users.editUser')}
                        </button>
                        <button onClick={() => handleToggle2FA(userItem.id)}>
                          {userItem.twoFactorEnabled ? t('users.disable2FA') : t('users.enable2FA')}
                        </button>
                        {/* Only show delete option if user is not deleting themselves */}
                        {userItem.id !== user.id && (
                          <button onClick={() => handleDeleteUser(userItem.id)}>
                            {t('users.deleteUser')}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalUsers > 0 && (
          <div className="users-pagination">
            <div className="pagination-controls">
              <button
                onClick={() => setUserCurrentPage(Math.max(1, userCurrentPage - 1))}
                disabled={userCurrentPage === 1}
                className="pagination-btn"
              >
                {i18n.language === 'he' ? '→' : '←'}
              </button>
              <span className="pagination-current">
                {userCurrentPage} / {totalPages}
              </span>
              <button
                onClick={() => setUserCurrentPage(Math.min(totalPages, userCurrentPage + 1))}
                disabled={userCurrentPage === totalPages}
                className="pagination-btn"
              >
                {i18n.language === 'he' ? '←' : '→'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
