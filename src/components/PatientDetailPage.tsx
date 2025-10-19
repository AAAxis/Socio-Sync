import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getActivityNotes, deletePatientCase, deleteActivityLog, onAuthStateChange, getUserData } from '../firebase';
import { User, ActivityNote } from '../types';
import { formatDate } from '../utils';
import { getApiUrl } from '../config';

// Patient Detail Page Component
export function PatientDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // Set document direction based on language
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // Helper function to translate stored values to display text
  const translateValue = (field: string, value: string) => {
    if (!value || value === '') return 'N/A';
    
    switch (field) {
      case 'gender':
        return value === 'male' ? t('intakeForm.male') : t('intakeForm.female');
      case 'marital_status':
        return value === 'single' ? t('patientDetail.single') : t('patientDetail.married');
      case 'education':
        switch (value) {
          case 'elementary': return t('patientDetail.elementarySchool');
          case 'high_school': return t('patientDetail.highSchool');
          case 'college': return t('patientDetail.college');
          case 'university': return t('patientDetail.university');
          case 'graduate': return t('patientDetail.graduateDegree');
          case 'other': return t('patientDetail.other');
          default: return value;
        }
      default:
        return value;
    }
  };
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [patientPII, setPatientPII] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [activeDetailTab, setActiveDetailTab] = useState<'documents' | 'activity' | 'patient-info' | 'notes' | 'progress'>('progress');
  const [isEditing, setIsEditing] = useState(false);
  const [editedPatientData, setEditedPatientData] = useState<any>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotesData, setEditedNotesData] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', progress: 0 });
  const [showAddMeetingModal, setShowAddMeetingModal] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ description: '', date: '', notes: '' });
  const [editingMeeting, setEditingMeeting] = useState<any>(null);
  const [meetingFilter, setMeetingFilter] = useState<'active' | 'archived'>('active');
  const [showMeetingMenu, setShowMeetingMenu] = useState<string | null>(null);

  // Function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Function to open meeting modal with today's date pre-selected
  const openAddMeetingModal = () => {
    setEditingMeeting(null);
    setNewMeeting({ description: '', date: getTodayDate(), notes: '' });
    setShowAddMeetingModal(true);
  };

  // Function to open meeting modal for editing
  const openEditMeetingModal = (activity: any) => {
    setEditingMeeting(activity);
    setNewMeeting({
      description: activity.meetingDescription || activity.note.replace('Meeting: ', '').split(' - ')[0],
      date: activity.meetingDate || '',
      notes: activity.meetingNotes || ''
    });
    setShowAddMeetingModal(true);
  };

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

  // Function to handle tab change and close mobile menu
  const handleTabChange = (tab: string) => {
    setIsMobileMenuOpen(false);
    if (tab === 'dashboard') {
      navigate('/dashboard');
    } else if (tab === 'projects') {
      navigate('/dashboard');
    } else if (tab === 'calendar') {
      navigate('/dashboard');
    } else if (tab === 'users') {
      navigate('/dashboard');
    } else if (tab === 'settings') {
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    if (caseId && user) {
      loadPatientData();
      loadMilestones();
    }
  }, [caseId, user]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu) {
        const target = event.target as Element;
        if (!target.closest('.patient-actions-menu')) {
          setShowMenu(false);
        }
      }
      if (showMeetingMenu) {
        const target = event.target as Element;
        if (!target.closest('.meeting-actions-menu')) {
          setShowMeetingMenu(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu, showMeetingMenu]);

  const loadPatientData = async () => {
    if (!caseId) return;
    
    try {
      // Load PII data from PostgreSQL via fileserver
      const piiResponse = await fetch(getApiUrl(`/api/patients/${caseId}`));
      if (piiResponse.ok) {
        const piiData = await piiResponse.json();
        setPatientPII(piiData.patient);
        
        // Load image URLs from PostgreSQL
        if (piiData.patient.image_urls) {
          try {
            const imageUrls = JSON.parse(piiData.patient.image_urls);
            setUploadedFiles(imageUrls);
          } catch (error) {
            console.error('Error parsing image URLs:', error);
            setUploadedFiles([]);
          }
        } else {
          setUploadedFiles([]);
        }
      } else if (piiResponse.status === 404) {
        setError('Patient PII data not found');
      } else {
        setError('Failed to load patient PII data');
      }

      // Load non-PII data from Firebase
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      const patientDocRef = doc(db, 'patients', caseId);
      const patientDoc = await getDoc(patientDocRef);
      
      if (patientDoc.exists()) {
        const firebaseData = patientDoc.data();
        // Merge Firebase data with PII data
        setPatientPII((prev: any) => ({
          ...prev,
          gender: firebaseData.gender || '',
          maritalStatus: firebaseData.maritalStatus || '',
          marital_status: firebaseData.maritalStatus || '', // Keep both for compatibility
          education: firebaseData.education || '',
          notes: firebaseData.notes || '',
          strengths: firebaseData.strengths || '',
          obstacles: firebaseData.obstacles || ''
        }));
      }

      // Load activity notes from Firebase and filter for meetings/events only
      const activitiesData = await getActivityNotes(caseId);
      // Filter to show only meetings, events, and appointments
      const filteredActivities = activitiesData.filter(activity => {
        const action = activity.action?.toLowerCase() || '';
        const note = activity.note?.toLowerCase() || '';
        return action.includes('event') || 
               action.includes('meeting') || 
               action.includes('appointment') ||
               note.includes('event') || 
               note.includes('meeting') || 
               note.includes('appointment');
      });
      setActivities(filteredActivities);
    } catch (err: any) {
      console.error('Error loading patient data:', err);
      setError('Failed to load patient data');
    }
  };

  const handleDeleteCase = async () => {
    if (!caseId || !user) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      const result = await deletePatientCase(caseId, user.id);
      
      if (result.success) {
        // Navigate back to dashboard after successful deletion
        navigate('/dashboard?tab=projects');
      } else {
        setError('Failed to delete patient case');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete patient case');
      console.error('Error deleting patient case:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteFile = async (fileUrl: string, index: number) => {
    if (!caseId) return;
    
    try {
      // Remove file from the uploaded files list
      const updatedFiles = uploadedFiles.filter((_, i) => i !== index);
      setUploadedFiles(updatedFiles);
      
      // Update the database with the new file list (remove from database only)
      const updateResponse = await fetch(getApiUrl(`/api/patients/${caseId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_urls: JSON.stringify(updatedFiles)
        })
      });

      if (updateResponse.ok) {
        console.log('File removed from database successfully');
        // Add activity note for the removal
        if (user) {
          const { addActivityNote } = await import('../firebase');
          await addActivityNote(caseId, `Document removed from patient record: ${fileUrl.split('/').pop()}`, 'removed', user.email);
        }
      } else {
        console.error('Failed to update database after file removal');
        // Revert the UI change if database update failed
        setUploadedFiles(uploadedFiles);
        setError('Failed to remove file from database');
      }
    } catch (error) {
      console.error('Error removing file:', error);
      // Revert the UI change if there was an error
      setUploadedFiles(uploadedFiles);
      setError('Failed to remove file');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    console.log('Starting file upload process...');
    setIsUploading(true);
    const newUploadedFiles: string[] = [];

    try {
      for (const file of Array.from(files)) {
        console.log(`Uploading file: ${file.name}, size: ${file.size}`);
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(getApiUrl('/upload'), {
          method: 'POST',
          body: formData,
        });

        console.log(`Upload response status: ${response.status}`);
        
        if (response.ok) {
          const result = await response.json();
          newUploadedFiles.push(result.file_url);
          console.log(`File uploaded successfully: ${result.file_url}`);
        } else {
          const errorText = await response.text();
          console.error(`Failed to upload file: ${file.name}, Status: ${response.status}, Error: ${errorText}`);
        }
      }

      // Save image URLs to PostgreSQL instead of local state
      if (newUploadedFiles.length > 0 && caseId) {
        const allImageUrls = [...uploadedFiles, ...newUploadedFiles];
        
        // Update patient data with image URLs
        const updateResponse = await fetch(getApiUrl(`/api/patients/${caseId}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_urls: JSON.stringify(allImageUrls)
          })
        });

        if (updateResponse.ok) {
          setUploadedFiles(allImageUrls);
          console.log('Image URLs saved to PostgreSQL successfully');
        } else {
          console.error('Failed to save image URLs to PostgreSQL');
          setError('Failed to save image URLs to database');
        }
      } else {
        setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setError(`Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedPatientData({ ...patientPII });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedPatientData(null);
  };

  const handleEditNotesClick = () => {
    setIsEditingNotes(true);
    setEditedNotesData({ 
      obstacles: patientPII?.obstacles || '',
      strengths: patientPII?.strengths || '',
      notes: patientPII?.notes || ''
    });
  };

  const handleCancelNotesEdit = () => {
    setIsEditingNotes(false);
    setEditedNotesData(null);
  };

  const handleNotesFieldChange = (field: string, value: string) => {
    setEditedNotesData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const loadMilestones = async () => {
    if (!caseId) {
      console.log('No caseId provided for loading milestones');
      return;
    }
    
    try {
      console.log('Loading milestones for caseId:', caseId);
      
      const { db } = await import('../firebase');
      const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
      
      const milestonesRef = collection(db, 'milestones');
      const q = query(milestonesRef, where('caseId', '==', caseId), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      console.log('Found', querySnapshot.docs.length, 'milestones in Firebase');
      
      const loadedMilestones = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Milestone data:', data);
        return {
          id: data.id,
          title: data.title,
          description: data.description,
          progress: data.progress,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          caseId: data.caseId
        };
      });
      
      console.log('Loaded milestones:', loadedMilestones);
      setMilestones(loadedMilestones);
    } catch (error) {
      console.error('Error loading milestones:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to load milestones: ${errorMessage}`);
    }
  };

  const handleAddMilestone = async () => {
    if (newMilestone.title.trim() && caseId) {
      const milestone = {
        id: Date.now().toString(),
        title: newMilestone.title,
        description: newMilestone.description,
        progress: newMilestone.progress,
        createdAt: new Date().toISOString(),
        caseId: caseId
      };
      
      try {
        // Add milestone to Firebase
        const { db } = await import('../firebase');
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        
        console.log('Adding milestone to Firebase:', milestone);
        
        const docRef = await addDoc(collection(db, 'milestones'), {
          ...milestone,
          createdAt: serverTimestamp()
        });
        
        console.log('Milestone added with ID:', docRef.id);
        
        setMilestones([...milestones, milestone]);
        setNewMilestone({ title: '', description: '', progress: 0 });
        setShowAddMilestone(false);
        
        console.log('Milestone added successfully');
      } catch (error) {
        console.error('Error adding milestone:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(`Failed to add milestone: ${errorMessage}`);
      }
    }
  };

  const handleUpdateMilestoneProgress = async (id: string, progress: number) => {
    // Update local state immediately for responsive UI
    setMilestones(milestones.map(milestone => 
      milestone.id === id ? { ...milestone, progress } : milestone
    ));

    try {
      // Update in Firebase
      const { db } = await import('../firebase');
      const { collection, query, where, getDocs, updateDoc, doc } = await import('firebase/firestore');
      
      console.log('Updating milestone progress:', id, 'to', progress);
      
      const milestonesRef = collection(db, 'milestones');
      const q = query(milestonesRef, where('id', '==', id));
      const querySnapshot = await getDocs(q);
      
      console.log('Found', querySnapshot.docs.length, 'milestones with id:', id);
      
      if (!querySnapshot.empty) {
        const milestoneDoc = querySnapshot.docs[0];
        console.log('Updating milestone document:', milestoneDoc.id);
        
        await updateDoc(doc(db, 'milestones', milestoneDoc.id), {
          progress: progress
        });
        
        console.log('Milestone progress updated successfully');
      } else {
        console.warn('No milestone found with id:', id);
        setError('Milestone not found in database');
      }
    } catch (error) {
      console.error('Error updating milestone progress:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to update milestone progress: ${errorMessage}`);
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    // Remove from local state immediately
    setMilestones(milestones.filter(milestone => milestone.id !== id));

    try {
      // Remove from Firebase
      const { db } = await import('../firebase');
      const { collection, query, where, getDocs, deleteDoc, doc } = await import('firebase/firestore');
      
      const milestonesRef = collection(db, 'milestones');
      const q = query(milestonesRef, where('id', '==', id));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const milestoneDoc = querySnapshot.docs[0];
        await deleteDoc(doc(db, 'milestones', milestoneDoc.id));
      }
    } catch (error) {
      console.error('Error deleting milestone:', error);
      setError('Failed to delete milestone');
    }
  };

  const handleAddMeeting = async () => {
    if (!newMeeting.description.trim() || !newMeeting.date.trim()) {
      setError('Please fill in description and date');
      return;
    }

    if (!caseId || !user?.email) {
      setError('Missing required information');
      return;
    }

    try {
      const { db } = await import('../firebase');
      const { collection, addDoc, updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
      
      const meetingNote = `Meeting: ${newMeeting.description}${newMeeting.notes ? ` - ${newMeeting.notes}` : ''}`;
      
      if (editingMeeting) {
        // Update existing meeting
        await updateDoc(doc(db, 'activities', editingMeeting.id), {
          note: meetingNote,
          meetingDate: newMeeting.date,
          meetingDescription: newMeeting.description,
          meetingNotes: newMeeting.notes,
          updatedAt: serverTimestamp()
        });
      } else {
        // Add new meeting
        await addDoc(collection(db, 'activities'), {
          caseId: caseId,
          note: meetingNote,
          action: 'meeting',
          createdBy: user.email,
          timestamp: serverTimestamp(),
          userEmail: user.email,
          meetingDate: newMeeting.date,
          meetingDescription: newMeeting.description,
          meetingNotes: newMeeting.notes
        });
      }
      
      // Close modal and reset form
      setShowAddMeetingModal(false);
      setNewMeeting({ description: '', date: getTodayDate(), notes: '' });
      setEditingMeeting(null);
      
      // Reload activities to show the changes
      await loadPatientData();
    } catch (error) {
      console.error('Error saving meeting record:', error);
      setError('Failed to save meeting record. Please try again.');
    }
  };

  const handleSaveEdit = async () => {
    if (!caseId || !editedPatientData) return;
    
    try {
      // Update patient data in PostgreSQL via fileserver
      const response = await fetch(getApiUrl(`/api/patients/${caseId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: editedPatientData.first_name,
          last_name: editedPatientData.last_name,
          date_of_birth: editedPatientData.date_of_birth,
          government_id: editedPatientData.government_id,
          email: editedPatientData.email,
          phone: editedPatientData.phone,
          address: editedPatientData.address
        })
      });

      if (response.ok) {
        // Save non-PII fields to Firebase
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const patientDocRef = doc(db, 'patients', caseId);
        await updateDoc(patientDocRef, {
          gender: editedPatientData.gender,
          maritalStatus: editedPatientData.marital_status,
          education: editedPatientData.education,
          notes: editedPatientData.notes,
          updatedAt: new Date()
        });
        
        // Update local state only after successful save
        setPatientPII(editedPatientData);
        setIsEditing(false);
        setEditedPatientData(null);
        
        // Add activity note for the update
        if (user) {
          const { addActivityNote } = await import('../firebase');
          await addActivityNote(caseId, 'Patient information updated', 'updated', user.email);
        }
        
        console.log('Patient data updated successfully');
      } else {
        const errorText = await response.text();
        console.error('Failed to update patient data:', errorText);
        setError('Failed to save patient data');
      }
    } catch (error) {
      console.error('Error saving patient data:', error);
      setError('Failed to save patient data');
    }
  };

  const handleSaveNotesEdit = async () => {
    if (!caseId || !editedNotesData) return;
    
    try {
      // Save notes data to Firebase
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      const patientDocRef = doc(db, 'patients', caseId);
      await updateDoc(patientDocRef, {
        obstacles: editedNotesData.obstacles,
        strengths: editedNotesData.strengths,
        notes: editedNotesData.notes,
        updatedAt: new Date()
      });

      // Update local state only after successful save
      setPatientPII((prev: any) => ({
        ...prev,
        obstacles: editedNotesData.obstacles,
        strengths: editedNotesData.strengths,
        notes: editedNotesData.notes
      }));
      setIsEditingNotes(false);
      setEditedNotesData(null);
      
      // Add activity note for the update
      if (user) {
          const { addActivityNote } = await import('../firebase');
          await addActivityNote(caseId, 'Patient notes updated', 'updated', user.email);
        }
        
      console.log('Patient notes updated successfully');
    } catch (error) {
      console.error('Error saving patient notes:', error);
      setError('Failed to save patient notes');
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setEditedPatientData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDeleteActivityLog = async (logId: string) => {
    if (!user || user.role !== 'super_admin') return;
    
    if (!window.confirm('Are you sure you want to delete this activity log? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteActivityLog(logId);
      
      // Reload activity logs to reflect the deletion
      await loadPatientData();
      setError('Activity log deleted successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to delete activity log');
      console.error('Delete activity log error:', err);
    }
  };

  const handleArchiveMeeting = async (activityId: string, archived: boolean) => {
    if (!caseId || !user) return;
    try {
      // Update the activity's archived status
      const activity = activities.find(a => a.id === activityId);
      if (activity) {
        // Here you would typically call an API to update the archived status
        // For now, we'll just update the local state
        const updatedActivities = activities.map(a => 
          a.id === activityId ? { ...a, archived } : a
        );
        setActivities(updatedActivities);
      }
    } catch (error) {
      console.error('Error archiving meeting:', error);
      setError(`Error archiving meeting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

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

  return (
    <>
    <div className="app">
        {/* Mobile Header */}
        <div className="mobile-header">
          <div className="mobile-header-content">
            <button 
              className="burger-menu-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <span className={`burger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
              <span className={`burger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
              <span className={`burger-line ${isMobileMenuOpen ? 'open' : ''}`}></span>
            </button>
            <h1 className="mobile-title">SocioSync</h1>
            {user && (
              <div className="mobile-user-info">
                {user.picture && !user.picture.includes('placeholder') && user.picture.startsWith('http') ? (
                  <img 
                    src={user.picture} 
                    alt={user.name} 
                    className="mobile-user-avatar"
                  />
                ) : (
                  <div className="mobile-user-avatar-icon">
                    <span className="person-icon">👤</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-container">
          <div className="dashboard">
            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
              <div 
                className="mobile-menu-overlay"
                onClick={() => setIsMobileMenuOpen(false)}
              ></div>
            )}
            
            <div className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
              <nav>
                <ul className="sidebar-nav">
                  <li className="welcome-nav-item">
                    <div className="welcome-nav-content">
                      {user.picture && !user.picture.includes('placeholder') && user.picture.startsWith('http') ? (
                        <img 
                          src={user.picture} 
                          alt={user.name} 
                          className="user-avatar"
                        />
                      ) : (
                        <div className="user-avatar-icon">
                          <span className="person-icon">👤</span>
                        </div>
                      )}
                      <div className="welcome-text">
                        <span className="welcome-label">{t('navigation.welcome')},</span>
                        <span className="user-name">{user.name}!</span>
                      </div>
                    </div>
                  </li>
                  <li>
                    <button 
                      onClick={() => handleTabChange('dashboard')}
                      className="nav-link"
                    >
                      <span className="nav-icon">📊</span>
                      {t('navigation.dashboard')}
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => handleTabChange('users')}
                      className="nav-link"
                    >
                      <span className="nav-icon">👥</span>
                      {t('navigation.users')}
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => handleTabChange('projects')}
                      className="nav-link active"
                    >
                      <span className="nav-icon">📁</span>
                      {t('navigation.projects')}
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => handleTabChange('calendar')}
                      className="nav-link"
                    >
                      <span className="nav-icon">📅</span>
                      {t('navigation.calendar')}
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => handleTabChange('settings')}
                      className="nav-link"
                    >
                      <span className="nav-icon">⚙️</span>
                      {t('navigation.settings')}
                    </button>
                  </li>
                  <li>
                    <button 
                      onClick={() => navigate('/')}
                      className="nav-link sign-out-nav-btn"
                    >
                      <span className="nav-icon">🚪</span>
                      {t('navigation.signOut')}
                    </button>
                  </li>
                </ul>
              </nav>
              
              {/* Logo at bottom */}
              <div style={{
                marginTop: 'auto',
                padding: '20px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <img 
                  src="/logo.jpeg" 
                  alt="Logo" 
                  style={{ 
                    height: '40px', 
                    width: 'auto',
                    opacity: 0.8
                  }} 
                />
              </div>
            </div>

            <div className="main-content" style={{ width: '100%', height: '100%', padding: '0' }}>
              <div className="create-patient-container" style={{ width: '100%', height: '100%', maxWidth: 'none' }}>
                <div className="create-patient-form" style={{ width: '100%', height: '100%', maxWidth: 'none' }}>
          <div className="login-header">
                    <div className="header-top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="header-left">
                        <p style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#333' }}>{caseId}</p>
                      </div>
              <div className="header-actions">
                <button
                  onClick={() => navigate('/dashboard?tab=projects')}
                  className="cancel-patient-btn"
                >
                  {t('patientDetail.back')}
                </button>
                
              </div>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {patientPII ? (
            <>
              {/* Tab Navigation */}
              <div className="patient-detail-tabs" style={{ width: '100%', height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
                <div className="tab-navigation">
                  <button
                    className={`tab-button ${activeDetailTab === 'progress' ? 'active' : ''}`}
                    onClick={() => setActiveDetailTab('progress')}
                  >
                    {t('patientDetail.progress')}
                  </button>
                  <button
                    className={`tab-button ${activeDetailTab === 'activity' ? 'active' : ''}`}
                    onClick={() => setActiveDetailTab('activity')}
                  >
                    📊 {t('patientDetail.meetings')}
                  </button>
                  <button
                    className={`tab-button ${activeDetailTab === 'notes' ? 'active' : ''}`}
                    onClick={() => setActiveDetailTab('notes')}
                  >
                    📝 {t('patientDetail.intakeForm')}
                  </button>
                  <button
                    className={`tab-button ${activeDetailTab === 'patient-info' ? 'active' : ''}`}
                    onClick={() => setActiveDetailTab('patient-info')}
                  >
                    👤 {t('patientDetail.information')}
                  </button>
                  <button
                    className={`tab-button ${activeDetailTab === 'documents' ? 'active' : ''}`}
                    onClick={() => setActiveDetailTab('documents')}
                  >
                    📄 {t('patientDetail.documents')}
                  </button>
                </div>

                {/* Tab Content */}
                <div className="tab-content" style={{ flex: 1, overflow: 'auto' }}>
                  {activeDetailTab === 'documents' && (
                    <div className="tab-panel">
                      <h3 className="form-block-title" style={{ color: '#000000' }}>📄 {t('patientDetail.documentUpload')}</h3>
                      <div className="form-fields-vertical">
                        <div className="form-group">
                          <label htmlFor="fileUpload" style={{ color: '#000000' }}>{t('patientDetail.uploadDocuments')}</label>
                          <div className="file-upload-container">
                            <input
                              type="file"
                              id="fileUpload"
                              multiple
                              onChange={handleFileUpload}
                              disabled={isUploading}
                              style={{ display: 'none' }}
                            />
                            <label
                              htmlFor="fileUpload"
                              className={`file-upload-label ${isUploading ? 'uploading' : ''}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '16px 20px',
                                border: '2px dashed #4a4a4a',
                                borderRadius: '8px',
                                backgroundColor: '#ffffff',
                                color: '#333333',
                                cursor: isUploading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s ease',
                                opacity: isUploading ? 0.6 : 1
                              }}
                            >
                              {isUploading ? (
                                <>
                                  <div className="loading-spinner" style={{ width: '20px', height: '20px' }}></div>
                                  <span>{t('patientDetail.uploading')}</span>
                                </>
                              ) : (
                                <>
                                  <span style={{ fontSize: '20px' }}>📁</span>
                                  <span>{t('patientDetail.clickToUpload')}</span>
                                </>
                              )}
                            </label>
                          </div>
                          
                          {uploadedFiles.length > 0 && (
                            <div style={{ 
                              marginTop: '16px',
                              maxHeight: '320px',
                              overflowY: 'auto',
                              border: '1px solid #e0e0e0',
                              borderRadius: '8px',
                              backgroundColor: '#fafafa'
                            }}>
                              {uploadedFiles.map((fileUrl, index) => {
                                const fileName = fileUrl.split('/').pop() || '';
                                const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);
                                const fileExtension = fileName.split('.').pop()?.toUpperCase() || 'FILE';
                                
                                return (
                                  <div 
                                    key={index} 
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '12px',
                                      padding: '12px 16px',
                                      borderBottom: index < uploadedFiles.length - 1 ? '1px solid #e0e0e0' : 'none',
                                      backgroundColor: 'white',
                                      transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'white';
                                    }}
                                  >
                                    {/* File icon/preview */}
                                    <div style={{
                                      width: '48px',
                                      height: '48px',
                                      flexShrink: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      borderRadius: '6px',
                                      backgroundColor: isImage ? '#e8f4fd' : '#f0f0f0',
                                      overflow: 'hidden'
                                    }}>
                                      {isImage ? (
                                        <img 
                                          src={fileUrl} 
                                          alt={fileName}
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover'
                                          }}
                                          onError={(e) => {
                                            // If image fails to load (CORS or 404), show fallback icon
                                            e.currentTarget.style.display = 'none';
                                            const parent = e.currentTarget.parentElement;
                                            if (parent && !parent.querySelector('.fallback-icon')) {
                                              const fallback = document.createElement('span');
                                              fallback.className = 'fallback-icon';
                                              fallback.textContent = '🖼️';
                                              fallback.style.fontSize = '24px';
                                              fallback.title = 'Image failed to load (CORS or network error)';
                                              parent.appendChild(fallback);
                                            }
                                          }}
                                          crossOrigin="anonymous"
                                        />
                                      ) : (
                                        <span style={{ fontSize: '24px' }}>📄</span>
                                      )}
                                    </div>

                                    {/* File info */}
                                    <div style={{ 
                                      flex: 1, 
                                      minWidth: 0,
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '2px'
                                    }}>
                                      <div style={{
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#333',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                      }}>
                                        {fileName}
                                      </div>
                                      <div style={{
                                        fontSize: '12px',
                                        color: '#666',
                                        textTransform: 'uppercase'
                                      }}>
                                        {fileExtension}
                                      </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div style={{ 
                                      display: 'flex', 
                                      gap: '8px',
                                      flexShrink: 0
                                    }}>
                                      {/* Download button */}
                                      <button
                                        onClick={() => {
                                          const link = document.createElement('a');
                                          link.href = fileUrl;
                                          link.download = fileName;
                                          link.click();
                                        }}
                                        style={{
                                          background: 'transparent',
                                          color: '#666',
                                          border: '1px solid #ddd',
                                          borderRadius: '6px',
                                          width: '36px',
                                          height: '36px',
                                          cursor: 'pointer',
                                          fontSize: '16px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#f5f5f5';
                                          e.currentTarget.style.borderColor = '#999';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = 'transparent';
                                          e.currentTarget.style.borderColor = '#ddd';
                                        }}
                                        title="Download file"
                                      >
                                        ⬇️
                                      </button>

                                      {/* Delete button */}
                                      <button
                                        onClick={() => handleDeleteFile(fileUrl, index)}
                                        style={{
                                          background: 'transparent',
                                          color: '#666',
                                          border: '1px solid #ddd',
                                          borderRadius: '6px',
                                          width: '36px',
                                          height: '36px',
                                          cursor: 'pointer',
                                          fontSize: '16px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#f5f5f5';
                                          e.currentTarget.style.borderColor = '#999';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = 'transparent';
                                          e.currentTarget.style.borderColor = '#ddd';
                                        }}
                                        title="Delete file"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeDetailTab === 'activity' && (
                    <div className="tab-panel" style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 className="form-block-title" style={{ color: '#000000', margin: 0 }}>📊 {t('patientDetail.meetings')}</h3>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <select
                            value={meetingFilter}
                            onChange={(e) => setMeetingFilter(e.target.value as 'active' | 'archived')}
                            style={{
                              padding: '8px 12px',
                              border: '1px solid #ddd',
                              borderRadius: '6px',
                              fontSize: '14px',
                              backgroundColor: 'white',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="active">{t('patientDetail.filterActive')}</option>
                            <option value="archived">{t('patientDetail.filterArchived')}</option>
                          </select>
                        <button
                          onClick={openAddMeetingModal}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#007acc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          + {t('patientDetail.addMeeting')}
                        </button>
                      </div>
                      </div>
                      {activities.filter(activity => activity.action === 'meeting').length > 0 ? (
                        <div className="activity-list">
                          {activities
                            .filter(activity => activity.action === 'meeting')
                            .filter(activity => {
                              if (meetingFilter === 'active') return !activity.archived;
                              if (meetingFilter === 'archived') return activity.archived;
                              return false;
                            })
                            .sort((a, b) => {
                              // Sort by timestamp in descending order (most recent first)
                              const dateA = new Date(a.timestamp);
                              const dateB = new Date(b.timestamp);
                              return dateB.getTime() - dateA.getTime();
                            })
                            .map((activity) => (
                            <div 
                              key={activity.id} 
                              className="activity-item"
                              onClick={() => openEditMeetingModal(activity)}
                              style={{ 
                                cursor: 'pointer',
                                opacity: activity.archived ? 0.7 : 1,
                                backgroundColor: activity.archived ? '#f8f9fa' : 'white'
                              }}
                            >
                              <div className="activity-header">
                                <span className="activity-action">
                                  {activity.archived ? '📦 ' : ''}{activity.action}
                                </span>
                                <div className="activity-header-right">
                                  <span className="activity-time">{formatDate(activity.timestamp)}</span>
                                  <div className="meeting-actions-menu" style={{ position: 'relative', display: 'inline-block' }}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowMeetingMenu(showMeetingMenu === activity.id ? null : activity.id);
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '16px',
                                        marginLeft: '8px',
                                        color: '#666'
                                      }}
                                      title="Meeting Actions"
                                    >
                                      ⋯
                                    </button>
                                    {showMeetingMenu === activity.id && (
                                      <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: '0',
                                        backgroundColor: 'white',
                                        border: '1px solid #ddd',
                                        borderRadius: '6px',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                        zIndex: 1000,
                                        minWidth: '120px',
                                        overflow: 'hidden'
                                      }}>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleArchiveMeeting(activity.id, !activity.archived);
                                            setShowMeetingMenu(null);
                                          }}
                                          style={{
                                            display: 'block',
                                            width: '100%',
                                            padding: '8px 12px',
                                            border: 'none',
                                            background: 'none',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            color: '#007acc',
                                            transition: 'background-color 0.2s ease'
                                          }}
                                          onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
                                          onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
                                        >
                                          {activity.archived ? '📤 Unarchive' : '📦 Archive'}
                                        </button>
                                        {user?.role === 'super_admin' && activity.archived && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteActivityLog(activity.id);
                                              setShowMeetingMenu(null);
                                            }}
                                            style={{
                                              display: 'block',
                                              width: '100%',
                                              padding: '8px 12px',
                                              border: 'none',
                                              background: 'none',
                                              textAlign: 'left',
                                              cursor: 'pointer',
                                              fontSize: '14px',
                                              color: '#dc3545',
                                              borderTop: '1px solid #f0f0f0',
                                              transition: 'background-color 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f8f9fa'}
                                            onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'}
                                          >
                                            🗑️ Delete
                                    </button>
                                  )}
                                </div>
                                    )}
                              </div>
                                </div>
                              </div>
                              <div className="activity-note" style={{ width: '100%', padding: '12px 0', fontSize: '15px', lineHeight: '1.5' }}>{activity.note}</div>
                              <div className="activity-author">👤 {activity.userEmail || activity.createdBy}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                          <h4 style={{ color: '#000000', marginBottom: '8px' }}>{t('patientDetail.noMeetingsYet')}</h4>
                          <p>{t('patientDetail.addFirstMeeting')}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeDetailTab === 'patient-info' && (
                    <div className="tab-panel">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 className="form-block-title" style={{ color: '#000000', margin: 0 }}>👤 {t('patientDetail.information')}</h3>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          {!isEditing ? (
                            <button
                              onClick={handleEditClick}
                              className="edit-patient-btn"
                              style={{
                                background: '#007acc',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              ✏️ {t('patientDetail.editPatient')}
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={handleCancelEdit}
                                className="cancel-edit-btn"
                                style={{
                                  background: '#6c757d',
                                  color: 'white',
                                  border: 'none',
                                  padding: '8px 16px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  fontWeight: '500'
                                }}
                              >
                                {t('patientDetail.cancel')}
                              </button>
                              <button
                                onClick={handleSaveEdit}
                                className="save-edit-btn"
                                style={{
                                  background: '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  padding: '8px 16px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  fontWeight: '500'
                                }}
                              >
                                {t('patientDetail.saveChanges')}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="form-fields-vertical">
                        <div className="form-group">
                          <label style={{ color: '#000000' }}>{t('patientDetail.firstName')}</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedPatientData?.first_name || ''}
                              onChange={(e) => handleFieldChange('first_name', e.target.value)}
                              className="patient-edit-input"
                              placeholder="Enter first name"
                            />
                          ) : (
                            <div className="patient-detail-value">{patientPII.first_name}</div>
                          )}
                        </div>
                        <div className="form-group">
                          <label style={{ color: '#000000' }}>{t('patientDetail.lastName')}</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedPatientData?.last_name || ''}
                              onChange={(e) => handleFieldChange('last_name', e.target.value)}
                              className="patient-edit-input"
                              placeholder="Enter last name"
                            />
                          ) : (
                            <div className="patient-detail-value">{patientPII.last_name}</div>
                          )}
                        </div>
                        <div className="form-group">
                          <label style={{ color: '#000000' }}>{t('patientDetail.dateOfBirth')}</label>
                          {isEditing ? (
                            <input
                              type="date"
                              value={editedPatientData?.date_of_birth || ''}
                              onChange={(e) => handleFieldChange('date_of_birth', e.target.value)}
                              className="patient-edit-input"
                            />
                          ) : (
                            <div className="patient-detail-value">{formatDate(patientPII.date_of_birth)}</div>
                          )}
                        </div>
                        <div className="form-group">
                          <label style={{ color: '#000000' }}>{t('patientDetail.governmentId')}</label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={editedPatientData?.government_id || ''}
                              onChange={(e) => handleFieldChange('government_id', e.target.value)}
                              className="patient-edit-input"
                              placeholder="Enter government ID"
                            />
                          ) : (
                            <div className="patient-detail-value">{patientPII.government_id || 'N/A'}</div>
                          )}
                        </div>
                        <div className="form-group">
                          <label style={{ color: '#000000' }}>{t('patientDetail.gender')}</label>
                          {isEditing ? (
                            <select
                              value={editedPatientData?.gender || ''}
                              onChange={(e) => handleFieldChange('gender', e.target.value)}
                              className="patient-edit-input"
                              style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ced4da', backgroundColor: '#ffffff', color: '#000000', fontSize: '14px' }}
                            >
                              <option value="">{t('intakeForm.selectGender')}</option>
                              <option value="male">{t('intakeForm.male')}</option>
                              <option value="female">{t('intakeForm.female')}</option>
                            </select>
                          ) : (
                            <div className="patient-detail-value">{translateValue('gender', patientPII.gender)}</div>
                          )}
                        </div>
                        <div className="form-group">
                          <label style={{ color: '#000000' }}>{t('patientDetail.maritalStatus')}</label>
                          {isEditing ? (
                            <select
                              value={editedPatientData?.marital_status || ''}
                              onChange={(e) => handleFieldChange('marital_status', e.target.value)}
                              className="patient-edit-input"
                              style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ced4da', backgroundColor: '#ffffff', color: '#000000', fontSize: '14px' }}
                            >
                              <option value="">{t('patientDetail.selectStatus')}</option>
                              <option value="single">{t('patientDetail.single')}</option>
                              <option value="married">{t('patientDetail.married')}</option>
                            </select>
                          ) : (
                            <div className="patient-detail-value">{translateValue('marital_status', patientPII.marital_status)}</div>
                          )}
                        </div>
                        <div className="form-group">
                          <label style={{ color: '#000000' }}>{t('patientDetail.education')}</label>
                          {isEditing ? (
                            <select
                              value={editedPatientData?.education || ''}
                              onChange={(e) => handleFieldChange('education', e.target.value)}
                              className="patient-edit-input"
                              style={{ padding: '12px', borderRadius: '6px', border: '1px solid #ced4da', backgroundColor: '#ffffff', color: '#000000', fontSize: '14px' }}
                            >
                              <option value="">{t('patientDetail.selectEducationLevel')}</option>
                              <option value="elementary">{t('patientDetail.elementarySchool')}</option>
                              <option value="high_school">{t('patientDetail.highSchool')}</option>
                              <option value="college">{t('patientDetail.college')}</option>
                              <option value="university">{t('patientDetail.university')}</option>
                              <option value="graduate">{t('patientDetail.graduateDegree')}</option>
                              <option value="other">{t('patientDetail.other')}</option>
                            </select>
                          ) : (
                            <div className="patient-detail-value">{translateValue('education', patientPII.education)}</div>
                          )}
                        </div>
                        <div className="form-group">
                          <label style={{ color: '#000000' }}>{t('patientDetail.email')}</label>
                          {isEditing ? (
                            <input
                              type="email"
                              value={editedPatientData?.email || ''}
                              onChange={(e) => handleFieldChange('email', e.target.value)}
                              className="patient-edit-input"
                              placeholder="Enter email address"
                            />
                          ) : (
                            <div className="patient-detail-value">{patientPII.email || 'N/A'}</div>
                          )}
                        </div>
                        <div className="form-group">
                          <label style={{ color: '#000000' }}>{t('patientDetail.phone')}</label>
                          {isEditing ? (
                            <input
                              type="tel"
                              value={editedPatientData?.phone || ''}
                              onChange={(e) => handleFieldChange('phone', e.target.value)}
                              className="patient-edit-input"
                              placeholder="Enter phone number"
                            />
                          ) : (
                            <div className="patient-detail-value">{patientPII.phone || 'N/A'}</div>
                          )}
                        </div>
                        <div className="form-group">
                          <label style={{ color: '#000000' }}>{t('patientDetail.address')}</label>
                          {isEditing ? (
                            <textarea
                              value={editedPatientData?.address || ''}
                              onChange={(e) => handleFieldChange('address', e.target.value)}
                              className="patient-edit-textarea"
                              rows={4}
                              placeholder="Enter full address"
                            />
                          ) : (
                            <div className="patient-detail-value" style={{ minHeight: '60px', padding: '16px' }}>
                              {patientPII.address || 'N/A'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeDetailTab === 'notes' && (
                    <div className="tab-panel">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 className="form-block-title" style={{ color: '#000000', margin: 0 }}>📝 {t('patientDetail.intakeForm')}</h3>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                          {!isEditingNotes ? (
                            <button
                              onClick={handleEditNotesClick}
                              className="edit-notes-btn"
                              style={{
                                background: '#007acc',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              ✏️ {t('patientDetail.editNotes')}
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={handleCancelNotesEdit}
                                className="cancel-edit-btn"
                                style={{
                                  background: '#6c757d',
                                  color: 'white',
                                  border: 'none',
                                  padding: '8px 16px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  fontWeight: '500'
                                }}
                              >
                                {t('patientDetail.cancel')}
                              </button>
                              <button
                                onClick={handleSaveNotesEdit}
                                className="save-edit-btn"
                                style={{
                                  background: '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  padding: '8px 16px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  fontWeight: '500'
                                }}
                              >
                                {t('patientDetail.saveChanges')}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="form-fields-vertical">
                        <div className="form-group">
                          <label style={{ color: '#000000' }}>{t('patientDetail.obstacles')}</label>
                          {isEditingNotes ? (
                            <textarea
                              value={editedNotesData?.obstacles || ''}
                              onChange={(e) => handleNotesFieldChange('obstacles', e.target.value)}
                              className="patient-edit-textarea"
                              rows={6}
                              placeholder="Describe obstacles and challenges..."
                            />
                          ) : (
                            <div className="patient-detail-value" style={{ minHeight: '100px', padding: '16px' }}>
                              {patientPII.obstacles || t('patientDetail.noObstacles')}
                            </div>
                          )}
                        </div>
                        
                        <div className="form-group">
                          <label style={{ color: '#000000' }}>{t('patientDetail.strengths')}</label>
                          {isEditingNotes ? (
                            <textarea
                              value={editedNotesData?.strengths || ''}
                              onChange={(e) => handleNotesFieldChange('strengths', e.target.value)}
                              className="patient-edit-textarea"
                              rows={6}
                              placeholder="Describe the patient's strengths..."
                            />
                          ) : (
                            <div className="patient-detail-value" style={{ minHeight: '100px', padding: '16px' }}>
                              {patientPII.strengths || t('patientDetail.noStrengths')}
                            </div>
                          )}
                        </div>
                        
                        <div className="form-group">
                          <label style={{ color: '#000000' }}>{t('patientDetail.notes')}</label>
                          {isEditingNotes ? (
                            <textarea
                              value={editedNotesData?.notes || ''}
                              onChange={(e) => handleNotesFieldChange('notes', e.target.value)}
                              className="patient-edit-textarea"
                              rows={8}
                              placeholder="Enter additional notes..."
                            />
                          ) : (
                            <div className="patient-detail-value" style={{ minHeight: '120px', padding: '16px' }}>
                              {patientPII.notes || 'No additional notes available.'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeDetailTab === 'progress' && (
                    <div className="tab-panel">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 className="form-block-title" style={{ color: '#000000', margin: 0 }}>{t('patientDetail.progressMilestones')}</h3>
                        <button
                          onClick={() => setShowAddMilestone(true)}
                          style={{
                            background: '#007acc',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {t('patientDetail.addMilestoneButton')}
                        </button>
                      </div>

                      {/* Add Milestone Form */}
                      {showAddMilestone && (
                        <div style={{
                          background: '#f8f9fa',
                          border: '1px solid #dee2e6',
                          borderRadius: '8px',
                          padding: '20px',
                          marginBottom: '20px'
                        }}>
                          <h4 style={{ color: '#000000', marginBottom: '15px' }}>{t('patientDetail.addNewMilestone')}</h4>
                          <div style={{ marginBottom: '15px' }}>
                            <label style={{ color: '#000000', display: 'block', marginBottom: '5px' }}>{t('patientDetail.title')}</label>
                            <input
                              type="text"
                              value={newMilestone.title}
                              onChange={(e) => setNewMilestone({...newMilestone, title: e.target.value})}
                              placeholder={t('patientDetail.enterMilestoneTitle')}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontSize: '14px'
                              }}
                            />
                          </div>
                          <div style={{ marginBottom: '15px' }}>
                            <label style={{ color: '#000000', display: 'block', marginBottom: '5px' }}>{t('patientDetail.description')}</label>
                            <textarea
                              value={newMilestone.description}
                              onChange={(e) => setNewMilestone({...newMilestone, description: e.target.value})}
                              placeholder={t('patientDetail.enterMilestoneDescription')}
                              rows={3}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontSize: '14px',
                                resize: 'vertical'
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => {
                                setShowAddMilestone(false);
                                setNewMilestone({ title: '', description: '', progress: 0 });
                              }}
                              style={{
                                background: '#6c757d',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              {t('patientDetail.cancel')}
                            </button>
                            <button
                              onClick={handleAddMilestone}
                              style={{
                                background: '#28a745',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              {t('patientDetail.addMilestoneButton')}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Milestones Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '20px'
                      }}>
                        {milestones.map((milestone) => (
                          <div
                            key={milestone.id}
                            style={{
                              background: 'white',
                              border: '2px solid #e9ecef',
                              borderRadius: '12px',
                              padding: '20px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              transition: 'all 0.3s ease',
                              cursor: 'pointer',
                              position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#007acc';
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#e9ecef';
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                            }}
                          >
                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteMilestone(milestone.id)}
                              style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                background: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Delete Milestone"
                            >
                              ×
                            </button>

                            {/* Milestone Title */}
                            <h4 style={{ 
                              color: '#000000', 
                              marginBottom: '10px',
                              marginRight: '30px',
                              fontSize: '16px',
                              fontWeight: '600'
                            }}>
                              {milestone.title}
                            </h4>

                            {/* Milestone Description */}
                            {milestone.description && (
                              <p style={{ 
                                color: '#6c757d', 
                                marginBottom: '15px',
                                fontSize: '14px',
                                lineHeight: '1.4'
                              }}>
                                {milestone.description}
                              </p>
                            )}

                            {/* Progress Section */}
                            <div style={{ marginBottom: '10px' }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                marginBottom: '12px'
                              }}>
                                <label style={{ 
                                  color: '#000000', 
                                  fontSize: '14px',
                                  fontWeight: '500'
                                }}>
                                  {t('patientDetail.milestoneProgress')}
                                </label>
                                <span style={{ 
                                  color: '#007acc', 
                                  fontSize: '14px',
                                  fontWeight: '600'
                                }}>
                                  {milestone.progress}%
                                </span>
                              </div>

                              {/* Progress Slider */}
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={milestone.progress}
                                onChange={(e) => handleUpdateMilestoneProgress(milestone.id, parseInt(e.target.value))}
                                style={{
                                  width: '100%',
                                  height: '8px',
                                  background: `linear-gradient(to right, #007acc ${milestone.progress}%, #e9ecef ${milestone.progress}%)`,
                                  outline: 'none',
                                  cursor: 'pointer',
                                  borderRadius: '4px',
                                  appearance: 'none'
                                }}
                              />
                            </div>

                            {/* Created Date */}
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#6c757d',
                              borderTop: '1px solid #e9ecef',
                              paddingTop: '10px'
                            }}>
                              {new Date(milestone.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Empty State */}
                      {milestones.length === 0 && (
                        <div style={{
                          textAlign: 'center',
                          padding: '60px 20px',
                          color: '#6c757d'
                        }}>
                          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
                          <h4 style={{ color: '#000000', marginBottom: '8px' }}>{t('patientDetail.noMilestonesYet')}</h4>
                          <p>{t('patientDetail.addFirstMilestone')}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '18px', color: '#666666' }}>Loading patient data...</div>
            </div>
          )}

          {/* Add Meeting Modal */}
          {showAddMeetingModal && (
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
                borderRadius: '12px',
                padding: '30px',
                width: '500px',
                maxWidth: '90vw',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
              }}>
                <h3 style={{ color: '#000000', marginBottom: '20px', textAlign: 'center' }}>
                  📊 {editingMeeting ? t('patientDetail.editMeetingRecord') : t('patientDetail.addMeetingRecord')}
                </h3>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ color: '#000000', display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    {t('patientDetail.meetingDescription')} *
                  </label>
                  <textarea
                    value={newMeeting.description}
                    onChange={(e) => setNewMeeting({...newMeeting, description: e.target.value})}
                    placeholder={t('patientDetail.meetingDescriptionPlaceholder')}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ced4da',
                      borderRadius: '6px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '30px' }}>
                  <label style={{ color: '#000000', display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    {t('patientDetail.meetingNotes')}
                  </label>
                  <textarea
                    value={newMeeting.notes}
                    onChange={(e) => setNewMeeting({...newMeeting, notes: e.target.value})}
                    placeholder={t('patientDetail.meetingNotesPlaceholder')}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #ced4da',
                      borderRadius: '6px',
                      fontSize: '14px',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setShowAddMeetingModal(false);
                      setNewMeeting({ description: '', date: getTodayDate(), notes: '' });
                      setEditingMeeting(null);
                    }}
                    style={{
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {t('patientDetail.cancel')}
                  </button>
                  <button
                    onClick={handleAddMeeting}
                    style={{
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    {editingMeeting ? t('patientDetail.saveChanges') : t('patientDetail.addMeetingButton')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Dialog */}
          {showDeleteConfirm && (
            <div className="delete-confirmation-overlay">
              <div className="delete-confirmation-dialog">
                <h3>Delete Patient Case</h3>
                <p>Are you sure you want to delete this patient case?</p>
                <p><strong>Note:</strong> This will only delete the case from Firebase. PII data in PostgreSQL will remain.</p>
                <div className="delete-confirmation-actions">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="cancel-patient-btn"
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteCase}
                    className="confirm-delete-btn"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Case'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
          </div>
        </div>
      </div>
    </>
  );
}
