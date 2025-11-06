import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCustomDialog } from './CustomDialog';
import { getAllUsers, updateUserRole, deleteUser } from '../firebase';
import { User } from '../types';

// Edit User Page Component
export function EditUserPage() {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const { t, i18n } = useTranslation();
  const { showConfirm, DialogComponent } = useCustomDialog();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    role: 'admin' as 'super_admin' | 'admin',
    status: 'active' as 'active' | 'blocked',
    password: ''
  });
  const [isUserLoading, setIsUserLoading] = useState(false);

  // Check for existing user session on component mount
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

  // Load user data to edit
  useEffect(() => {
    if (userId && user) {
      loadUserToEdit();
    }
  }, [userId, user]);

  const loadUserToEdit = async () => {
    if (!userId) return;
    
    try {
      const allUsers = await getAllUsers();
      const userToEdit = allUsers.find((u: any) => u.userId === userId);
      
      if (userToEdit) {
        setUserFormData({
          name: userToEdit.name,
          email: userToEdit.email,
          role: userToEdit.role === 'super_admin' ? 'super_admin' : 'admin',
          status: userToEdit.blocked || userToEdit.restricted ? 'blocked' : 'active',
          password: ''
        });
      } else {
        setError(t('editUser.userNotFound'));
      }
    } catch (err) {
      setError(t('editUser.failedToLoadUser'));
      console.error('Error loading user:', err);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setUserFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateUser = async () => {
    if (!userId || !userFormData.name || !userFormData.email) {
      setError(t('editUser.fillRequiredFields'));
      return;
    }

    setIsUserLoading(true);
    setError(null);

    try {
      await updateUserRole(userId, userFormData.role, userFormData.name, userFormData.email, userFormData.status);
      navigate('/dashboard?tab=users');
    } catch (err: any) {
      setError(err.message || t('editUser.failedToUpdateUser'));
      console.error('Error updating user:', err);
    } finally {
      setIsUserLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userId) return;
    
    showConfirm(t('editUser.confirmDeleteUser'), async () => {

    setIsUserLoading(true);
    setError(null);

    try {
      await deleteUser(userId);
      navigate('/dashboard?tab=users');
    } catch (err: any) {
      setError(err.message || t('editUser.failedToDeleteUser'));
      console.error('Error deleting user:', err);
    } finally {
      setIsUserLoading(false);
    }
    });
  };

  if (isLoading) {
    return (
      <div className="app">
        <div className="container">
          <div className="login-card">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '18px', color: '#666666' }}>{t('editUser.loading')}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="app">
      <div className="container">
        <div className="login-card">
          <div className="login-header" style={{ position: 'relative' }}>
            <button
              onClick={() => navigate('/dashboard?tab=users')}
              style={{
                position: 'absolute',
                top: '0',
                ...(i18n.language === 'he' ? { left: '0' } : { right: '0' }),
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
            <img src="/logo.png" alt="Logo" style={{ height: '40px', width: 'auto', marginRight: '20px' }} />
            <p>{t('editUser.title')}</p>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="login-options">
            <div className="form-group">
              <input
                type="text"
                id="editName"
                value={userFormData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={t('editUser.fullNamePlaceholder')}
              />
            </div>

            <div className="form-group">
              <input
                type="email"
                id="editEmail"
                value={userFormData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder={t('editUser.emailPlaceholder')}
              />
            </div>
            
            <div className="form-group">
              <select
                id="editRole"
                value={userFormData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
              >
                <option value="admin">{t('editUser.admin')}</option>
                <option value="super_admin">{t('editUser.superAdmin')}</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="editStatus" style={{ color: '#000000' }}>{t('editUser.status')}</label>
              <select
                id="editStatus"
                value={userFormData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
              >
                <option value="active">{t('editUser.statusActive')}</option>
                <option value="blocked">{t('editUser.statusBlocked')}</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="editPassword" style={{ color: '#000000' }}>{t('editUser.newPasswordLabel')}</label>
              <input
                type="password"
                id="editPassword"
                value={userFormData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder={t('editUser.newPasswordPlaceholder')}
              />
            </div>
            
            <div className="form-actions" style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <button
                onClick={handleUpdateUser}
                className="signin-btn"
                disabled={isUserLoading}
                style={{ background: '#28a745' }}
              >
                {isUserLoading ? t('editUser.updating') : t('editUser.updateUser')}
              </button>
              
            </div>
          </div>
        </div>
      </div>
      <DialogComponent />
    </div>
  );
}
