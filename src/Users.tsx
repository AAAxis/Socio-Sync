import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  blocked: boolean;
  lastLoginAt: string;
  twoFactorEnabled: boolean;
}

interface UsersProps {
  user: any;
  filteredUsers: User[];
  userSearchTerm: string;
  handleUserSearchChange: (term: string) => void;
  userStatusFilter: string;
  handleUserStatusFilterChange: (filter: string) => void;
  showUserDropdown: string | null;
  setShowUserDropdown: (userId: string | null) => void;
  handleToggle2FA: (userId: string, enabled: boolean) => void;
  handleToggleUserBlock: (userId: string, blocked: boolean) => void;
  handleDeleteUser: (userId: string) => void;
}

const Users: React.FC<UsersProps> = ({
  user,
  filteredUsers,
  userSearchTerm,
  handleUserSearchChange,
  userStatusFilter,
  handleUserStatusFilterChange,
  showUserDropdown,
  setShowUserDropdown,
  handleToggle2FA,
  handleToggleUserBlock,
  handleDeleteUser
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserDropdown) {
        const target = event.target as Element;
        if (!target.closest('.user-dropdown-container')) {
          setShowUserDropdown(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown, setShowUserDropdown]);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-title">{t('users.title')}</h2>
          <p className="dashboard-subtitle">Manage users and their roles</p>
        </div>
        <button 
          onClick={() => navigate('/create')}
          className="add-user-btn"
        >
          + {t('users.addUser')}
        </button>
      </div>
     
      {/* User Filter and Search Controls */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '20px', 
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        {/* Search Bar */}
        <div style={{ flex: '1', minWidth: '250px' }}>
          <input
            type="text"
            placeholder="Search users by name, email, or role..."
            value={userSearchTerm}
            onChange={(e) => handleUserSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #4a4a4a',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#333333',
              fontSize: '14px'
            }}
          />
        </div>
        
        {/* Status Filter */}
        <div style={{ minWidth: '150px' }}>
          <select
            value={userStatusFilter}
            onChange={(e) => handleUserStatusFilterChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #4a4a4a',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#333333',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
        
      </div>
     
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((tableUser) => (
              <tr key={tableUser.id}>
                <td>{tableUser.name}</td>
                <td>{tableUser.email}</td>
                <td>
                  <span className={`role-badge role-${tableUser.role}`}>
                    {tableUser.role === 'blocked' ? 'BLOCKED' : tableUser.role.replace('_', ' ').toUpperCase()}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${tableUser.blocked ? 'blocked' : 'active'}`}>
                    {tableUser.blocked ? 'Blocked' : 'Active'}
                  </span>
                </td>
                <td>{new Date(tableUser.lastLoginAt).toLocaleDateString('en-GB')}</td>
                <td>
                  <div className="user-dropdown-container">
                    <button 
                      className="user-dropdown-btn"
                      data-user-id={tableUser.id}
                      onClick={() => setShowUserDropdown(showUserDropdown === tableUser.id ? null : tableUser.id)}
                    >
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="2"/>
                        <circle cx="12" cy="12" r="2"/>
                        <circle cx="12" cy="19" r="2"/>
                      </svg>
                    </button>
                    
                    {showUserDropdown === tableUser.id && (
                      <div 
                        className="user-dropdown-menu"
                        style={{
                          top: `${(() => {
                            const element = document.querySelector(`[data-user-id="${tableUser.id}"]`);
                            return element ? element.getBoundingClientRect().bottom + window.scrollY + 5 : 0;
                          })()}px`,
                          left: `${(() => {
                            const element = document.querySelector(`[data-user-id="${tableUser.id}"]`);
                            return element ? element.getBoundingClientRect().right - 150 + window.scrollX : 0;
                          })()}px`
                        }}
                      >
                        <button 
                          className="user-dropdown-item edit"
                          onClick={() => {
                            navigate(`/edit-user/${tableUser.id}`);
                            setShowUserDropdown(null);
                          }}
                        >
                          {t('users.editUser')}
                        </button>
                        <button 
                          className="user-dropdown-item 2fa"
                          onClick={() => {
                            handleToggle2FA(tableUser.id, tableUser.twoFactorEnabled || false);
                            setShowUserDropdown(null);
                          }}
                        >
                          {tableUser.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                        </button>
                        <button 
                          className="user-dropdown-item block"
                          onClick={() => {
                            handleToggleUserBlock(tableUser.id, tableUser.blocked || false);
                            setShowUserDropdown(null);
                          }}
                        >
                          {tableUser.blocked ? 'Unblock User' : 'Block User'}
                        </button>
                        {tableUser.id !== user?.id && user?.role === 'super_admin' && (
                          <button 
                            className="user-dropdown-item delete"
                            onClick={() => {
                              handleDeleteUser(tableUser.id);
                              setShowUserDropdown(null);
                            }}
                          >
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
      </div>
    </>
  );
};

export default Users;
