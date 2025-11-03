import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCustomDialog } from './CustomDialog';
import { getActivityNotes, deletePatientCase, deleteActivityLog, onAuthStateChange, getUserData, updateActivityArchiveStatus } from '../firebase';
import { User, ActivityNote } from '../types';
import { formatDate } from '../utils';
import { getApiUrl } from '../config';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { RIGHTS_FIELDS } from './RightsIntakeForm';
import { emotionalQuestions } from './EmotionalIntakeLogic';
import { careerQuestions } from './CareerIntakeLogic';

// Patient Detail Page Component
export function PatientDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { showAlert, showConfirm, DialogComponent } = useCustomDialog();

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [intakeStatus, setIntakeStatus] = useState<{ rights?: boolean; emotional?: boolean; professional?: boolean }>({});
  const [activeDetailTab, setActiveDetailTab] = useState<'documents' | 'activity' | 'patient-info' | 'notes' | 'progress'>('progress');
  const [isEditing, setIsEditing] = useState(false);
  const [editedPatientData, setEditedPatientData] = useState<any>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotesData, setEditedNotesData] = useState<any>(null);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [showEditMilestoneModal, setShowEditMilestoneModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any>(null);
  const [newMilestone, setNewMilestone] = useState({ 
    title: '', 
    description: '', 
    progress: 0, 
    targetDate: '', 
    status: 'new',
    axis: 'emotional', // ציר - Emotional/Occupational/Rights
    successMetric: '', // מדד הצלחה - success criteria
    resources: '', // משאב רלוונטי - relevant resources
    barriers: '', // חסם פוטנציאלי - potential barriers
    notes: '', // הערות/מעקב שיחה - notes/conversation tracking
    therapistNotes: '' // הערת מטפל - therapist notes
  });
  const [showAddMeetingModal, setShowAddMeetingModal] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ description: '', date: '', notes: '' });
  const [editingMeeting, setEditingMeeting] = useState<any>(null);
  const [meetingFilter, setMeetingFilter] = useState<'active' | 'archived'>('active');
  const [milestoneStatusFilter, setMilestoneStatusFilter] = useState<'all' | 'in_progress' | 'achieved' | 'frozen' | 'maintenance' | 'stuck'>('all');
  const [draggedMilestone, setDraggedMilestone] = useState<any>(null);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [selectedMilestones, setSelectedMilestones] = useState<Set<string>>(new Set());

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

  // Functions for handling record selection
  const handleRecordSelect = (recordId: string, checked: boolean) => {
    const newSelected = new Set(selectedRecords);
    if (checked) {
      newSelected.add(recordId);
    } else {
      newSelected.delete(recordId);
    }
    setSelectedRecords(newSelected);
  };

  const handleSelectAllRecords = (checked: boolean) => {
    if (checked) {
      const allRecordIds = activities
        .filter(activity => activity.action === 'meeting')
        .filter(activity => {
          if (meetingFilter === 'active') return !activity.archived;
          if (meetingFilter === 'archived') return activity.archived;
          return false;
        })
        .map(activity => activity.id);
      setSelectedRecords(new Set(allRecordIds));
    } else {
      setSelectedRecords(new Set());
    }
  };

  // Functions for handling milestone selection and completion
  const handleMilestoneSelect = async (milestoneId: string, checked: boolean) => {
    // Update local state immediately for responsive UI
    const newSelected = new Set(selectedMilestones);
    if (checked) {
      newSelected.add(milestoneId);
      // Mark milestone as completed
      setMilestones(milestones.map(milestone => 
        milestone.id === milestoneId 
          ? { ...milestone, status: 'achieved', progress: 100 } 
          : milestone
      ));
    } else {
      newSelected.delete(milestoneId);
      // Mark milestone as in progress
      setMilestones(milestones.map(milestone => 
        milestone.id === milestoneId 
          ? { ...milestone, status: 'in_progress', progress: milestone.progress || 0 } 
          : milestone
      ));
    }
    setSelectedMilestones(newSelected);

    try {
      // Update in Firebase
      const { db } = await import('../firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      
      const milestoneRef = doc(db, 'milestones', milestoneId);
      
      if (checked) {
        // Mark as completed
        await updateDoc(milestoneRef, {
          status: 'achieved',
          progress: 100,
          updatedAt: new Date().toISOString()
        });
        console.log('Milestone marked as completed:', milestoneId);
      } else {
        // Mark as in progress
        const milestone = milestones.find(m => m.id === milestoneId);
        const originalProgress = milestone?.progress || 0;
        await updateDoc(milestoneRef, {
          status: 'in_progress',
          progress: originalProgress > 100 ? 0 : originalProgress, // Reset if it was 100%
          updatedAt: new Date().toISOString()
        });
        console.log('Milestone marked as in progress:', milestoneId);
      }
    } catch (error) {
      console.error('Error updating milestone completion status:', error);
      // Revert local state on error
      if (checked) {
        setMilestones(milestones.map(milestone => 
          milestone.id === milestoneId 
            ? { ...milestone, status: milestone.status, progress: milestone.progress } 
            : milestone
        ));
        newSelected.delete(milestoneId);
      } else {
        setMilestones(milestones.map(milestone => 
          milestone.id === milestoneId 
            ? { ...milestone, status: milestone.status, progress: milestone.progress } 
            : milestone
        ));
        newSelected.add(milestoneId);
      }
      setSelectedMilestones(newSelected);
    }
  };

  const handleSelectAllMilestones = (checked: boolean) => {
    if (checked) {
      const filteredMilestones = milestones.filter(milestone => {
        if (milestoneStatusFilter === 'all') return true;
        return milestone.status === milestoneStatusFilter;
      });
      const allMilestoneIds = filteredMilestones.map(milestone => milestone.id);
      setSelectedMilestones(new Set(allMilestoneIds));
    } else {
      setSelectedMilestones(new Set());
    }
  };

  // Function to open meeting modal for editing
  const openEditMeetingModal = (activity: any) => {
    setEditingMeeting(activity);
    setNewMeeting({
      description: activity.meetingDescription || activity.note.replace(/^Meeting: /, '').split(' - ')[0],
      date: activity.meetingDate || '',
      notes: activity.meetingNotes || ''
    });
    setShowAddMeetingModal(true);
  };

  useEffect(() => {
    console.log('Loading user from localStorage...');
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        console.log('User loaded from localStorage:', userData);
        setUser(userData);
      } catch (err) {
        console.log('Error parsing user from localStorage:', err);
        localStorage.removeItem('user');
      }
    } else {
      console.log('No user found in localStorage');
    }
    setIsLoading(false);
  }, []);

  // Load intake completion flags
  useEffect(() => {
    const loadIntakes = async () => {
      if (!caseId) return;
      try {
        const { db } = await import('../firebase');
        const { doc, getDoc } = await import('firebase/firestore');
        const rightsRef = doc(db, 'patients', String(caseId), 'intakes', 'rights');
        const emotionalRef = doc(db, 'patients', String(caseId), 'intakes', 'emotional');
        const professionalRef = doc(db, 'patients', String(caseId), 'intakes', 'professional');
        const [r, e, p] = await Promise.all([getDoc(rightsRef), getDoc(emotionalRef), getDoc(professionalRef)]);
        setIntakeStatus({
          rights: r.exists() && !!r.data()?.completed,
          emotional: e.exists() && !!e.data()?.completed,
          professional: p.exists() && !!p.data()?.completed
        });
      } catch (err) {
        console.log('Failed to load intake flags', err);
      }
    };
    loadIntakes();
  }, [caseId]);

  // Function to handle tab change and close mobile menu
  const handleTabChange = (tab: string) => {
    setIsMobileMenuOpen(false);
    if (tab === 'dashboard') {
      navigate('/dashboard');
    } else if (tab === 'projects') {
      navigate('/dashboard?tab=projects');
    } else if (tab === 'calendar') {
      navigate('/dashboard?tab=calendar');
    } else if (tab === 'users') {
      navigate('/dashboard?tab=users');
    } else if (tab === 'settings') {
      navigate('/dashboard?tab=settings');
    }
  };

  useEffect(() => {
    if (caseId && user) {
      loadPatientData();
      loadMilestones();
    }
  }, [caseId, user]);

  // Check URL hash on mount and when location changes to set active tab
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      if (hash === '#intake' || hash === '#notes') {
        setActiveDetailTab('notes');
      }
    };
    
    // Check on mount
    checkHash();
    
    // Listen for hash changes
    window.addEventListener('hashchange', checkHash);
    
    return () => {
      window.removeEventListener('hashchange', checkHash);
    };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu) {
        const target = event.target as Element;
        if (!target.closest('.patient-actions-menu')) {
          setShowMenu(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Debug tab switching
  useEffect(() => {
    console.log('Active tab changed to:', activeDetailTab);
  }, [activeDetailTab]);

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
        console.log('Patient PII data not found');
      } else {
        console.log('Failed to load patient PII data');
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
        console.log('Failed to load patient data');
    }
  };

  const handleDeleteCase = async () => {
    if (!caseId || !user) return;
    
    setIsDeleting(true);
    console.log('Starting deletion process...');
    
    try {
      const result = await deletePatientCase(caseId, user.id);
      console.log('Delete result:', result);
      
      if (result.success) {
        console.log('Deletion successful, navigating to dashboard');
        // Navigate back to dashboard after successful deletion
        navigate('/dashboard?tab=projects');
      } else {
        console.log('Failed to delete patient case:', result.error);
        showAlert('Failed to delete patient case. Please try again.');
      }
    } catch (err: any) {
      console.log('Error during deletion:', err.message || 'Failed to delete patient case');
      console.error('Error deleting patient case:', err);
      showAlert('An error occurred while deleting the patient case. Please try again.');
    } finally {
      setIsDeleting(false);
      console.log('Deletion process completed');
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
        console.log('Failed to remove file from database');
      }
    } catch (error) {
      console.error('Error removing file:', error);
      // Revert the UI change if there was an error
      setUploadedFiles(uploadedFiles);
      console.log('Failed to remove file');
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
          console.log('Failed to save image URLs to database');
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
      console.log(`Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  const handleDownloadPDF = async () => {
    if (!patientPII || !caseId) return;

    // Fetch all intake forms data
    let rightsIntakeData: any = null;
    let emotionalIntakeData: any = null;
    let professionalIntakeData: any = null;

    try {
      const { db } = await import('../firebase');
      const { doc, getDoc } = await import('firebase/firestore');
      
      const rightsRef = doc(db, 'patients', String(caseId), 'intakes', 'rights');
      const emotionalRef = doc(db, 'patients', String(caseId), 'intakes', 'emotional');
      const professionalRef = doc(db, 'patients', String(caseId), 'intakes', 'professional');
      
      const [rightsDoc, emotionalDoc, professionalDoc] = await Promise.all([
        getDoc(rightsRef),
        getDoc(emotionalRef),
        getDoc(professionalRef)
      ]);
      
      if (rightsDoc.exists()) {
        rightsIntakeData = rightsDoc.data().answers || {};
      }
      if (emotionalDoc.exists()) {
        emotionalIntakeData = emotionalDoc.data().answers || {};
      }
      if (professionalDoc.exists()) {
        professionalIntakeData = professionalDoc.data().answers || {};
      }
    } catch (error) {
      console.error('Error loading intake forms:', error);
    }

    // Create a hidden div with all patient data in Hebrew
    const pdfContent = document.createElement('div');
    pdfContent.style.position = 'absolute';
    pdfContent.style.left = '-9999px';
    pdfContent.style.width = '210mm'; // A4 width
    pdfContent.style.padding = '10mm';
    pdfContent.style.margin = '0';
    pdfContent.style.backgroundColor = 'white';
    pdfContent.style.fontFamily = 'Arial, sans-serif';
    pdfContent.style.direction = 'rtl';
    pdfContent.style.textAlign = 'right';
    pdfContent.style.fontSize = '11px';
    pdfContent.style.lineHeight = '1.4';
    pdfContent.style.boxSizing = 'border-box';
    
    // Add print styles for page breaks
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        .page-break {
          page-break-before: always;
          break-before: page;
        }
        .page-break-inside-avoid {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .page-break-after {
          page-break-after: always;
          break-after: page;
        }
      }
      .section {
        margin-bottom: 30px;
      }
      .subsection {
        margin-bottom: 20px;
        page-break-inside: avoid;
        break-inside: avoid;
      }
    `;
    document.head.appendChild(style);
    
    // Build HTML content
    let htmlContent = `
      <div class="section" style="text-align: center; margin: 0; padding: 0;">
        <h1 style="font-size: 18px; margin: 0 0 5px 0; padding: 0;">${t('patientDetail.patientDetails')}</h1>
        <p style="font-size: 12px; color: #666; margin: 2px 0; padding: 0;">${t('patientDetail.caseId')}: ${caseId}</p>
        <p style="font-size: 11px; color: #999; margin: 2px 0 0 0; padding: 0;">${t('patientDetail.generated')}: ${new Date().toLocaleDateString('he-IL')}</p>
      </div>
      
      <div class="section" style="margin: 0; padding: 15px;">
        <h2 style="font-size: 16px; margin: 0 0 15px 0; padding: 0 0 10px 0; border-bottom: 2px solid #333; font-weight: bold;">${t('patientDetail.information')}</h2>
        <table style="width: 100%; border-collapse: separate; border-spacing: 0 8px; margin: 0; padding: 0;">
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; width: 35%; font-size: 13px; border-right: 2px solid #e0e0e0; vertical-align: middle;">${t('patientDetail.firstName')}:</td>
            <td style="padding: 8px 12px; font-size: 13px; vertical-align: middle;">${patientPII.first_name || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; font-size: 13px; border-right: 2px solid #e0e0e0; vertical-align: middle;">${t('patientDetail.lastName')}:</td>
            <td style="padding: 8px 12px; font-size: 13px; vertical-align: middle;">${patientPII.last_name || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; font-size: 13px; border-right: 2px solid #e0e0e0; vertical-align: middle;">${t('patientDetail.email')}:</td>
            <td style="padding: 8px 12px; font-size: 13px; vertical-align: middle;">${patientPII.email || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; font-size: 13px; border-right: 2px solid #e0e0e0; vertical-align: middle;">${t('patientDetail.phone')}:</td>
            <td style="padding: 8px 12px; font-size: 13px; vertical-align: middle;">${patientPII.phone || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; font-size: 13px; border-right: 2px solid #e0e0e0; vertical-align: middle;">${t('patientDetail.address')}:</td>
            <td style="padding: 8px 12px; font-size: 13px; vertical-align: middle;">${patientPII.address || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; font-size: 13px; border-right: 2px solid #e0e0e0; vertical-align: middle;">${t('intakeForm.gender')}:</td>
            <td style="padding: 8px 12px; font-size: 13px; vertical-align: middle;">${translateValue('gender', patientPII.gender || '')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; font-size: 13px; border-right: 2px solid #e0e0e0; vertical-align: middle;">${t('patientDetail.education')}:</td>
            <td style="padding: 8px 12px; font-size: 13px; vertical-align: middle;">${translateValue('education', patientPII.education || '')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; font-size: 13px; border-right: 2px solid #e0e0e0; vertical-align: middle;">${t('patientDetail.maritalStatus')}:</td>
            <td style="padding: 8px 12px; font-size: 13px; vertical-align: middle;">${translateValue('marital_status', patientPII.maritalStatus || patientPII.marital_status || '')}</td>
          </tr>
        </table>
    `;

    if (patientPII.notes) {
      htmlContent += `
        <div class="subsection" style="margin: 15px 0 0 0; padding: 12px;">
          <h3 style="font-size: 13px; margin: 0 0 8px 0; padding: 0; font-weight: bold; color: #333;">${t('patientDetail.notes')}:</h3>
          <p style="margin: 0; padding: 8px; font-size: 12px; line-height: 1.5;">${patientPII.notes}</p>
        </div>
      `;
    }

    if (patientPII.strengths) {
      htmlContent += `
        <div class="subsection" style="margin: 15px 0 0 0; padding: 12px;">
          <h3 style="font-size: 13px; margin: 0 0 8px 0; padding: 0; font-weight: bold; color: #333;">${t('patientDetail.strengths')}:</h3>
          <p style="margin: 0; padding: 8px; font-size: 12px; line-height: 1.5;">${patientPII.strengths}</p>
        </div>
      `;
    }

    if (patientPII.obstacles) {
      htmlContent += `
        <div class="subsection" style="margin: 15px 0 0 0; padding: 12px;">
          <h3 style="font-size: 13px; margin: 0 0 8px 0; padding: 0; font-weight: bold; color: #333;">${t('patientDetail.obstacles')}:</h3>
          <p style="margin: 0; padding: 8px; font-size: 12px; line-height: 1.5;">${patientPII.obstacles}</p>
        </div>
      `;
    }

    htmlContent += `</div>`;

    // Rights Intake Form (separate page)
    if (rightsIntakeData && Object.keys(rightsIntakeData).length > 0) {
      htmlContent += `
        <div class="section intake-form-section" style="margin: 10px 0 0 0; padding: 0;">
          <h3 style="font-size: 12px; margin: 0 0 3px 0; padding: 0; color: #333;">${t('patientDetail.intakeRights')}</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 0; padding: 0;">
      `;
      
      RIGHTS_FIELDS.forEach(field => {
        const value = rightsIntakeData[field.field_name];
        if (value !== undefined && value !== null && value !== '') {
          const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
          const label = t(`intakeRights.fields.${field.field_name}`) || field.label;
          htmlContent += `
            <tr>
              <td style="padding: 3px 5px; font-weight: bold; width: 40%; vertical-align: top; font-size: 11px; margin: 0;">${label}:</td>
              <td style="padding: 3px 5px; vertical-align: top; font-size: 11px; margin: 0;">${displayValue}</td>
            </tr>
          `;
        }
      });
      
      htmlContent += `
          </table>
        </div>
      `;
    } else {
      htmlContent += `
        <div class="section intake-form-section" style="margin: 10px 0 0 0; padding: 0;">
          <p style="color: #999; margin: 0; padding: 0;">${t('patientDetail.intakeRights')}: ${t('patientDetail.notCompleted')}</p>
        </div>
      `;
    }

    // Emotional Intake Form (separate page)
    if (emotionalIntakeData && Object.keys(emotionalIntakeData).length > 0) {
      htmlContent += `
        <div class="section intake-form-section" style="margin: 10px 0 0 0; padding: 0;">
          <h3 style="font-size: 12px; margin: 0 0 3px 0; padding: 0; color: #333;">${t('patientDetail.intakeEmotional')}</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 0; padding: 0;">
      `;
      
      emotionalQuestions.forEach(question => {
        const value = emotionalIntakeData[question.field_name];
        if (value !== undefined && value !== null && value !== '') {
          const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
          const label = t(`intakeEmotional.questions.${question.field_name}`) || question.question_text;
          htmlContent += `
            <tr>
              <td style="padding: 3px 5px; font-weight: bold; width: 40%; vertical-align: top; font-size: 11px; margin: 0;">${label}:</td>
              <td style="padding: 3px 5px; vertical-align: top; font-size: 11px; margin: 0;">${displayValue}</td>
            </tr>
          `;
        }
      });
      
      htmlContent += `
          </table>
        </div>
      `;
    } else {
      htmlContent += `
        <div class="section intake-form-section" style="margin: 10px 0 0 0; padding: 0;">
          <p style="color: #999; margin: 0; padding: 0;">${t('patientDetail.intakeEmotional')}: ${t('patientDetail.notCompleted')}</p>
        </div>
      `;
    }

    // Professional Intake Form (separate page)
    if (professionalIntakeData && Object.keys(professionalIntakeData).length > 0) {
      htmlContent += `
        <div class="section intake-form-section" style="margin: 10px 0 0 0; padding: 0;">
          <h3 style="font-size: 12px; margin: 0 0 3px 0; padding: 0; color: #333;">${t('patientDetail.intakeProfessional')}</h3>
          <table style="width: 100%; border-collapse: collapse; margin: 0; padding: 0;">
      `;
      
      careerQuestions.forEach(question => {
        const value = professionalIntakeData[question.field_name];
        if (value !== undefined && value !== null && value !== '') {
          const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
          const label = t(`intakeProfessional.questions.${question.field_name}`) || question.field_label;
          htmlContent += `
            <tr>
              <td style="padding: 3px 5px; font-weight: bold; width: 40%; vertical-align: top; font-size: 11px; margin: 0;">${label}:</td>
              <td style="padding: 3px 5px; vertical-align: top; font-size: 11px; margin: 0;">${displayValue}</td>
            </tr>
          `;
        }
      });
      
      htmlContent += `
          </table>
        </div>
      `;
    } else {
      htmlContent += `
        <div class="section intake-form-section" style="margin: 10px 0 0 0; padding: 0;">
          <p style="color: #999; margin: 0; padding: 0;">${t('patientDetail.intakeProfessional')}: ${t('patientDetail.notCompleted')}</p>
        </div>
      `;
    }

    // Milestones Section
    if (milestones && milestones.length > 0) {
      htmlContent += `
        <div class="section" style="margin: 10px 0 0 0; padding: 0;">
          <h2 style="font-size: 14px; margin: 0 0 5px 0; padding: 0;">${t('patientDetail.treatmentPlan')}</h2>
      `;

      milestones.forEach((milestone, index) => {
        const axisLabel = milestone.axis === 'emotional' ? t('patientDetail.axisEmotional') : 
                          milestone.axis === 'occupational' ? t('patientDetail.axisOccupational') : 
                          t('patientDetail.axisRights');
        
        htmlContent += `
          <div class="subsection" style="margin: 3px 0; padding: 5px; border: 1px solid #ddd;">
            <h3 style="font-size: 12px; margin: 0 0 3px 0; padding: 0;">${index + 1}. ${milestone.title || t('patientDetail.untitledMilestone')}</h3>
            <p style="margin: 0 0 2px 0; padding: 0; font-size: 11px;"><strong>${t('patientDetail.axis')}:</strong> ${axisLabel}</p>
            ${milestone.description ? `<p style="margin: 0 0 2px 0; padding: 0; font-size: 11px;"><strong>${t('patientDetail.description')}:</strong> ${milestone.description}</p>` : ''}
            <p style="margin: 0 0 2px 0; padding: 0; font-size: 11px;"><strong>${t('patientDetail.progress')}:</strong> ${milestone.progress || 0}%</p>
            ${milestone.targetDate ? `<p style="margin: 0 0 2px 0; padding: 0; font-size: 11px;"><strong>${t('patientDetail.targetDate')}:</strong> ${new Date(milestone.targetDate).toLocaleDateString('he-IL')}</p>` : ''}
            ${milestone.successMetric ? `<p style="margin: 0 0 2px 0; padding: 0; font-size: 11px;"><strong>${t('patientDetail.successMetric')}:</strong> ${milestone.successMetric}</p>` : ''}
            ${milestone.resources ? `<p style="margin: 0 0 2px 0; padding: 0; font-size: 11px;"><strong>${t('patientDetail.resources')}:</strong> ${milestone.resources}</p>` : ''}
            ${milestone.barriers ? `<p style="margin: 0 0 2px 0; padding: 0; font-size: 11px;"><strong>${t('patientDetail.barriers')}:</strong> ${milestone.barriers}</p>` : ''}
          </div>
        `;
      });

      htmlContent += `</div>`;
    }

    // Activities/Meetings Section
    if (activities && activities.length > 0) {
      htmlContent += `
        <div class="section" style="margin: 10px 0 0 0; padding: 0;">
          <h2 style="font-size: 14px; margin: 0 0 5px 0; padding: 0;">${t('patientDetail.meetings')}</h2>
      `;

      activities.slice(0, 50).forEach((activity, index) => {
        let activityDate = 'N/A';
        if (activity.timestamp) {
          const timestamp = activity.timestamp as any;
          if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
            activityDate = timestamp.toDate().toLocaleDateString('he-IL');
          } else if (timestamp) {
            activityDate = new Date(timestamp).toLocaleDateString('he-IL');
          }
        }
        
        // Translate activity action
        const translatedAction = t(`actions.${activity.action}`) || activity.action;
        // Add archived indicator if needed
        const archivedLabel = activity.archived ? '📦 ' + t('patientDetail.archive') : '';
        
        htmlContent += `
          <div class="subsection" style="margin: 3px 0; padding: 5px; border: 1px solid #eee;">
            <p style="margin: 0 0 2px 0; padding: 0; font-weight: bold; font-size: 11px;">${activityDate} - ${archivedLabel ? archivedLabel + ' ' : ''}${translatedAction}</p>
            ${activity.note ? `<p style="margin: 0; padding: 0; color: #666; font-size: 11px;">${activity.note}</p>` : ''}
          </div>
        `;
      });

      htmlContent += `</div>`;
    }

    htmlContent += `</div>`;
    
    pdfContent.innerHTML = htmlContent;
    document.body.appendChild(pdfContent);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 15; // top/bottom margin in mm
      const usablePageHeight = pageHeight - 2 * margin; // usable height per page
      const linesPerPage = 20; // Target lines per page
      const lineHeight = usablePageHeight / linesPerPage; // Height per line in mm

      // Get all sections
      const sections = pdfContent.querySelectorAll('.section');
      let currentY = margin; // Current Y position on page
      let linesUsed = 0; // Track lines used on current page

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i] as HTMLElement;
        
        // Create a temporary container for this section
        const sectionContainer = document.createElement('div');
        sectionContainer.style.width = '210mm';
        sectionContainer.style.padding = '10mm';
        sectionContainer.style.margin = '0';
        sectionContainer.style.backgroundColor = 'white';
        sectionContainer.style.fontFamily = 'Arial, sans-serif';
        sectionContainer.style.direction = 'rtl';
        sectionContainer.style.textAlign = 'right';
        sectionContainer.style.fontSize = '11px';
        sectionContainer.style.lineHeight = '1.4';
        sectionContainer.style.boxSizing = 'border-box';
        sectionContainer.appendChild(section.cloneNode(true) as Node);
        document.body.appendChild(sectionContainer);

        try {
          // Wait a bit for rendering
          await new Promise(resolve => setTimeout(resolve, 100));

          // Render this section to canvas
          const canvas = await html2canvas(sectionContainer, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width: sectionContainer.offsetWidth,
            height: sectionContainer.offsetHeight
          });

          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          const sectionHeight = imgHeight;
          const imgData = canvas.toDataURL('image/png');
          
          // Calculate estimated lines for this section
          const estimatedLines = Math.ceil(sectionHeight / lineHeight);
          
          // Check if this is an intake form section - always start on new page
          const isIntakeForm = section.classList.contains('intake-form-section');

          // Check if we need a new page - always for intake forms, or based on line count
          if (isIntakeForm && linesUsed > 0) {
            // Always start a new page for intake forms
            pdf.addPage();
            currentY = margin;
            linesUsed = 0;
          } else if (linesUsed + estimatedLines > linesPerPage && linesUsed > 0) {
            // Start a new page if we exceed line limit
            pdf.addPage();
            currentY = margin;
            linesUsed = 0;
          }

          // Calculate lines available on current page
          const linesAvailable = linesPerPage - linesUsed;
          const maxHeightForPage = linesAvailable * lineHeight;

          // If section is taller than available space, split it
          if (sectionHeight > maxHeightForPage) {
            let sourceY = 0;
            let remainingSectionHeight = sectionHeight;

            while (remainingSectionHeight > 0) {
              // Check if we need a new page
              if (linesUsed >= linesPerPage) {
                pdf.addPage();
                currentY = margin;
                linesUsed = 0;
              }

              // Calculate how much fits on current page (in lines)
              const linesAvailableOnPage = linesPerPage - linesUsed;
              const heightForThisPage = linesAvailableOnPage * lineHeight;
              const renderHeight = Math.min(heightForThisPage, remainingSectionHeight);
              const sourceHeight = (renderHeight / sectionHeight) * canvas.height;
              const linesForThisPortion = Math.ceil(renderHeight / lineHeight);

              // Create a cropped canvas for this portion
              const pageCanvas = document.createElement('canvas');
              pageCanvas.width = canvas.width;
              pageCanvas.height = sourceHeight;
              const pageCtx = pageCanvas.getContext('2d');
              
              if (pageCtx) {
                pageCtx.drawImage(
                  canvas,
                  0, sourceY,
                  canvas.width, sourceHeight,
                  0, 0,
                  canvas.width, sourceHeight
                );
                
                const croppedImgData = pageCanvas.toDataURL('image/png');
                const croppedImgHeight = (sourceHeight * imgWidth) / canvas.width;
                
                pdf.addImage(croppedImgData, 'PNG', 0, currentY, imgWidth, croppedImgHeight);
                currentY += croppedImgHeight;
                linesUsed += linesForThisPortion;
              }

              sourceY += sourceHeight;
              remainingSectionHeight -= renderHeight;
            }
          } else {
            // Section fits on current page
            pdf.addImage(imgData, 'PNG', 0, currentY, imgWidth, sectionHeight);
            currentY += sectionHeight;
            linesUsed += estimatedLines;
          }

        } finally {
          document.body.removeChild(sectionContainer);
        }
      }

      pdf.save(`${t('patientDetail.patient')}_${caseId}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(t('patientDetail.pdfError') || 'שגיאה ביצירת PDF');
    } finally {
      document.body.removeChild(pdfContent);
      // Remove the style we added
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    }
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
          id: doc.id, // Use Firebase document ID instead of data.id
          title: data.title,
          description: data.description,
          progress: data.progress,
          targetDate: data.targetDate || '', // Include targetDate field
          status: data.status || 'new', // Include status field, default to 'new'
          axis: data.axis || 'emotional', // ציר - default to emotional
          successMetric: data.successMetric || '', // מדד הצלחה
          resources: data.resources || '', // משאב רלוונטי
          barriers: data.barriers || '', // חסם פוטנציאלי
          notes: data.notes || '', // הערות/מעקב שיחה
          therapistNotes: data.therapistNotes || '', // הערת מטפל
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          caseId: data.caseId
        };
      });
      
      console.log('Loaded milestones:', loadedMilestones);
      setMilestones(loadedMilestones);
      
      // Initialize selectedMilestones with completed milestones
      const completedMilestoneIds = loadedMilestones
        .filter(milestone => milestone.status === 'achieved')
        .map(milestone => milestone.id);
      setSelectedMilestones(new Set(completedMilestoneIds));
    } catch (error) {
      console.error('Error loading milestones:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`Failed to load milestones: ${errorMessage}`);
    }
  };

  const handleEditMilestone = (milestone: any) => {
    setEditingMilestone(milestone);
    setNewMilestone({
      title: milestone.title,
      description: milestone.description,
      progress: milestone.progress,
      targetDate: milestone.targetDate || '',
      status: milestone.status || 'new',
      axis: milestone.axis || 'emotional',
      successMetric: milestone.successMetric || '',
      resources: milestone.resources || '',
      barriers: milestone.barriers || '',
      notes: milestone.notes || '',
      therapistNotes: milestone.therapistNotes || ''
    });
    setShowEditMilestoneModal(true);
  };

  const handleUpdateMilestone = async () => {
    if (!editingMilestone || !newMilestone.title.trim()) return;
    
    try {
      const { db } = await import('../firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      
      const milestoneRef = doc(db, 'milestones', editingMilestone.id);
      await updateDoc(milestoneRef, {
        title: newMilestone.title,
        description: newMilestone.description,
        progress: newMilestone.progress,
        targetDate: newMilestone.targetDate,
        status: newMilestone.status,
        axis: newMilestone.axis,
        successMetric: newMilestone.successMetric,
        resources: newMilestone.resources,
        barriers: newMilestone.barriers,
        notes: newMilestone.notes,
        therapistNotes: newMilestone.therapistNotes,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setMilestones(milestones.map(m => 
        m.id === editingMilestone.id 
          ? { ...m, ...newMilestone, updatedAt: new Date().toISOString() }
          : m
      ));
      
      setShowEditMilestoneModal(false);
      setEditingMilestone(null);
      setNewMilestone({ 
        title: '', 
        description: '', 
        progress: 0, 
        targetDate: '', 
        status: 'in_progress',
        axis: 'emotional',
        successMetric: '',
        resources: '',
        barriers: '',
        notes: '',
        therapistNotes: ''
      });
      
      console.log('Milestone updated successfully');
    } catch (error) {
      console.error('Error updating milestone:', error);
      console.log(`Failed to update milestone: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddMilestone = async () => {
    if (newMilestone.title.trim() && caseId) {
      try {
        // Add milestone to Firebase first to get the document ID
        const { db } = await import('../firebase');
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        
        const milestoneData = {
          caseId: caseId,
          title: newMilestone.title,
          description: newMilestone.description,
          progress: newMilestone.progress,
          targetDate: newMilestone.targetDate,
          status: newMilestone.status,
          axis: newMilestone.axis,
          successMetric: newMilestone.successMetric,
          resources: newMilestone.resources,
          barriers: newMilestone.barriers,
          notes: newMilestone.notes,
          therapistNotes: newMilestone.therapistNotes,
          createdAt: serverTimestamp()
        };
        
        console.log('Adding milestone to Firebase:', milestoneData);
        
        const docRef = await addDoc(collection(db, 'milestones'), milestoneData);
        
        console.log('Milestone added with ID:', docRef.id);
        
        // Create local milestone object with the Firebase document ID
        const milestone = {
          id: docRef.id,
          ...milestoneData,
          createdAt: new Date().toISOString()
        };
        
        setMilestones([...milestones, milestone]);
        setNewMilestone({ 
          title: '', 
          description: '', 
          progress: 0, 
          targetDate: '', 
          status: 'in_progress',
          axis: 'emotional',
          successMetric: '',
          resources: '',
          barriers: '',
          notes: '',
          therapistNotes: ''
        });
        setShowAddMilestoneModal(false);
        
        console.log('Milestone added successfully');
      } catch (error) {
        console.error('Error adding milestone:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.log(`Failed to add milestone: ${errorMessage}`);
      }
    }
  };

  const handleUpdateMilestoneProgress = async (id: string, progress: number) => {
    // Update local state immediately for responsive UI
    setMilestones(milestones.map(milestone => 
      milestone.id === id ? { ...milestone, progress } : milestone
    ));

    try {
      // Update in Firebase using the document ID directly
      const { db } = await import('../firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      
      console.log('Updating milestone progress:', id, 'to', progress);
      
      const milestoneRef = doc(db, 'milestones', id);
      await updateDoc(milestoneRef, {
        progress: progress,
        updatedAt: new Date().toISOString()
      });
      
      console.log('Milestone progress updated successfully');
    } catch (error) {
      console.error('Error updating milestone progress:', error);
      // Revert local state on error
      setMilestones(milestones.map(milestone => 
        milestone.id === id ? { ...milestone, progress: milestone.progress } : milestone
      ));
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`Failed to update milestone progress: ${errorMessage}`);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (milestone: any) => {
    setDraggedMilestone(milestone);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newAxis: 'emotional' | 'occupational' | 'rights') => {
    e.preventDefault();
    
    try {
      const milestoneData = JSON.parse(e.dataTransfer.getData('text/plain'));
      
      // Don't do anything if dropped in the same column
      if (milestoneData.axis === newAxis) {
        setDraggedMilestone(null);
        return;
      }

      // Update milestone axis in Firebase
      const { db } = await import('../firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      
      const milestoneRef = doc(db, 'milestones', milestoneData.id);
      await updateDoc(milestoneRef, {
        axis: newAxis,
        updatedAt: new Date().toISOString()
      });
      
      // Update local state
      setMilestones(milestones.map(m => 
        m.id === milestoneData.id 
          ? { ...m, axis: newAxis, updatedAt: new Date().toISOString() }
          : m
      ));
      
      console.log(`Milestone "${milestoneData.title}" moved to ${newAxis} column`);
    } catch (error) {
      console.error('Error updating milestone axis:', error);
    }
    
    setDraggedMilestone(null);
  };

  // Missing handler functions
  const handleSaveClick = () => {
    // TODO: Implement save patient info functionality
    console.log('Save patient info clicked');
  };

  const handleCancelClick = () => {
    setIsEditing(false);
  };


  const handleUpdateMilestoneStatus = async (id: string, newStatus: string) => {
    // Update local state immediately for responsive UI
    setMilestones(milestones.map(milestone => 
      milestone.id === id ? { ...milestone, status: newStatus } : milestone
    ));

    try {
      // Update in Firebase using the document ID directly
      const { db } = await import('../firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      
      console.log('Updating milestone status:', id, 'to', newStatus);
      
      const milestoneRef = doc(db, 'milestones', id);
      await updateDoc(milestoneRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      
      console.log('Milestone status updated successfully');
    } catch (error) {
      console.error('Error updating milestone status:', error);
      // Revert local state on error
      setMilestones(milestones.map(milestone => 
        milestone.id === id ? { ...milestone, status: milestone.status } : milestone
      ));
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`Failed to update milestone status: ${errorMessage}`);
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    // Remove from local state immediately
    setMilestones(milestones.filter(milestone => milestone.id !== id));

    try {
      // Remove from Firebase using the document ID directly
      const { db } = await import('../firebase');
      const { doc, deleteDoc } = await import('firebase/firestore');
      
      const milestoneRef = doc(db, 'milestones', id);
      await deleteDoc(milestoneRef);
      
      console.log('Milestone deleted successfully');
    } catch (error) {
      console.error('Error deleting milestone:', error);
      // Revert local state on error
      setMilestones([...milestones]);
      console.log('Failed to delete milestone');
    }
  };

  const handleAddMeeting = async () => {
    if (!newMeeting.description.trim() || !newMeeting.date.trim()) {
      console.log('Please fill in description and date');
      return;
    }

    if (!caseId || !user?.email) {
      console.log('Missing required information');
      return;
    }

    try {
      const { db } = await import('../firebase');
      const { collection, addDoc, updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
      
      const meetingNote = `${newMeeting.description}${newMeeting.notes ? ` - ${newMeeting.notes}` : ''}`;
      
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
      console.log('Failed to save meeting record. Please try again.');
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
        console.log('Failed to save patient data');
      }
    } catch (error) {
      console.error('Error saving patient data:', error);
      console.log('Failed to save patient data');
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
      console.log('Failed to save patient notes');
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
    
    try {
      await deleteActivityLog(logId);
      
      // Reload activity logs to reflect the deletion
      await loadPatientData();
      console.log('Activity log deleted successfully');
    } catch (err: any) {
      console.log(err.message || 'Failed to delete activity log');
      console.error('Delete activity log error:', err);
    }
  };

  const handleArchiveMeeting = async (activityId: string, archived: boolean) => {
    if (!caseId || !user) return;
    try {
      console.log(`${archived ? 'Archiving' : 'Unarchiving'} meeting:`, activityId);
      
      // Update the activity's archived status in Firebase
      await updateActivityArchiveStatus(activityId, archived);
      
      console.log(`Meeting ${archived ? 'archived' : 'unarchived'} successfully`);
      
      // Refresh activities after archive/unarchive
      await loadPatientData();
    } catch (error) {
      console.error('Error archiving meeting:', error);
      console.log(`Error ${archived ? 'archiving' : 'unarchiving'} meeting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="app">
        <div className="container">
          <div className="login-card">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '18px', color: '#666666' }}>
                {i18n.language === 'he' ? 'טוען...' : 'Loading...'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user && !isLoading) {
    console.log('No user found and not loading, redirecting to login');
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
                      {user?.picture && !user.picture.includes('placeholder') && user.picture.startsWith('http') ? (
                        <img 
                          src={user.picture} 
                          alt={user.name || 'User'} 
                          className="user-avatar"
                        />
                      ) : (
                        <div className="user-avatar-icon">
                          <span className="person-icon">👤</span>
                        </div>
                      )}
                      <div className="welcome-text">
                        <span className="welcome-label">{t('navigation.welcome')},</span>
                        <span className="user-name">{user?.name || 'User'}</span>
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
                      onClick={() => showConfirm(t('navigation.confirmSignOut'), () => navigate('/'))}
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
                  src="/logo.png" 
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
                      <div className="header-right">
                        <button
                          onClick={handleDownloadPDF}
                          style={{
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'background-color 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#218838';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#28a745';
                          }}
                        >
                          📥 {i18n.language === 'he' ? 'הורד PDF' : 'Download PDF'}
                        </button>
                      </div>
            </div>
          </div>

          {patientPII ? (
            <>
              {/* Tab Navigation */}
              <div className="patient-detail-tabs" style={{ width: '100%', height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
                <div className="tab-navigation">
                  <button
                    className={`tab-button ${activeDetailTab === 'progress' ? 'active' : ''}`}
                    onClick={() => {
                      console.log('Switching to progress tab');
                      setActiveDetailTab('progress');
                    }}
                  >
                    🏥 {t('patientDetail.progress')}
                  </button>
                  <button
                    className={`tab-button ${activeDetailTab === 'activity' ? 'active' : ''}`}
                    onClick={() => {
                      console.log('Switching to activity tab');
                      setActiveDetailTab('activity');
                    }}
                  >
                    📊 {t('patientDetail.meetings')}
                  </button>
                  <button
                    className={`tab-button ${activeDetailTab === 'notes' ? 'active' : ''}`}
                    onClick={() => {
                      console.log('Switching to notes tab');
                      setActiveDetailTab('notes');
                    }}
                  >
                    📝 {t('patientDetail.intakeForm')}
                  </button>
                  <button
                    className={`tab-button ${activeDetailTab === 'patient-info' ? 'active' : ''}`}
                    onClick={() => {
                      console.log('Switching to patient-info tab');
                      setActiveDetailTab('patient-info');
                    }}
                  >
                    👤 {t('patientDetail.information')}
                  </button>
                  <button
                    className={`tab-button ${activeDetailTab === 'documents' ? 'active' : ''}`}
                    onClick={() => {
                      console.log('Switching to documents tab');
                      setActiveDetailTab('documents');
                    }}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <h3 className="form-block-title" style={{ color: '#000000', margin: 0 }}>📊 {t('patientDetail.meetings')}</h3>
                        </div>
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
                                backgroundColor: activity.archived ? '#f8f9fa' : 'white',
                                position: 'relative'
                              }}
                            >
                              <div className="activity-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="activity-action" style={{ flex: 1 }}>
                                  {activity.archived ? '📦 ' : ''}{t(`actions.${activity.action}`) || activity.action}
                                </span>
                                <div className="activity-header-right">
                                  <span className="activity-time">{formatDate(activity.timestamp)}</span>
                                </div>
                              </div>
                              <div className="activity-note" style={{ width: '100%', padding: '12px 0', fontSize: '15px', lineHeight: '1.5' }}>{activity.note.replace(/^Meeting: /, '')}</div>
                              <div className="activity-author">👤 {activity.userEmail || activity.createdBy || t('unknownUser')}</div>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px' }}>
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
                              placeholder={t('intakeForm.enterFirstName')}
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
                              placeholder={t('intakeForm.enterLastName')}
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
                        {/* Government ID field removed per request */}
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
                        {/* Marital Status field removed per request */}
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
                              placeholder={t('intakeForm.enterEmail')}
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
                              placeholder={t('intakeForm.enterPhone')}
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
                              placeholder={t('intakeForm.enterAddress')}
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
                      <div style={{ marginBottom: '20px' }}>
                        <h3 className="form-block-title" style={{ color: '#000000', margin: 0 }}>📝 {t('patientDetail.intakeForm')}</h3>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', width: '100%', maxWidth: '900px', margin: '0 auto' }}>
                        <button
                          onClick={() => { if (caseId) navigate(`/${i18n.language}/intake-rights/${caseId}`); }}
                          style={{
                            background: '#ffffff',
                            color: '#000000',
                            
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid #e9ecef',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            justifyContent: 'center',
                            aspectRatio: '1 / 1',
                            minHeight: '160px',
                            position: 'relative'
                          }}
                        >
                          <span style={{ fontSize: '28px' }}>📄</span>
                          <span style={{ fontSize: '16px' }}>{t('patientDetail.intakeRights')}</span>
                          {intakeStatus.rights && <span style={{ position: 'absolute', top: 8, left: 8 }}>✅</span>}
                          <span
                            onClick={(e) => { e.stopPropagation(); if (caseId) navigate(`/${i18n.language}/intake-rights/${caseId}`); }}
                            title={t('patientDetail.edit') || 'Edit'}
                            style={{ position: 'absolute', top: 8, right: 8, background: '#f1f3f5', border: '1px solid #e9ecef', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: '14px', color: '#000000' }}
                          >
                            ✏️
                          </span>
                        </button>
                        <button
                          onClick={() => { if (caseId) navigate(`/${i18n.language}/intake-emotional/${caseId}`); }}
                          style={{
                            background: '#ffffff',
                            color: '#000000',
                            
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid #e9ecef',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            justifyContent: 'center',
                            aspectRatio: '1 / 1',
                            minHeight: '160px',
                            position: 'relative'
                          }}
                        >
                          <span style={{ fontSize: '28px' }}>📄</span>
                          <span style={{ fontSize: '16px' }}>{t('patientDetail.intakeEmotional')}</span>
                          {intakeStatus.emotional && <span style={{ position: 'absolute', top: 8, left: 8 }}>✅</span>}
                          <span
                            onClick={(e) => { e.stopPropagation(); if (caseId) navigate(`/${i18n.language}/intake-emotional/${caseId}`); }}
                            title={t('patientDetail.edit') || 'Edit'}
                            style={{ position: 'absolute', top: 8, right: 8, background: '#f1f3f5', border: '1px solid #e9ecef', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: '14px', color: '#000000' }}
                          >
                            ✏️
                          </span>
                        </button>
                        <button
                          onClick={() => { if (caseId) navigate(`/${i18n.language}/intake-profesional/${caseId}`); }}
                          style={{
                            background: '#ffffff',
                            color: '#000000',
                            
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid #e9ecef',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            justifyContent: 'center',
                            aspectRatio: '1 / 1',
                            minHeight: '160px',
                            position: 'relative'
                          }}
                        >
                          <span style={{ fontSize: '28px' }}>📄</span>
                          <span style={{ fontSize: '16px' }}>{t('patientDetail.intakeProfessional')}</span>
                          {intakeStatus.professional && <span style={{ position: 'absolute', top: 8, left: 8 }}>✅</span>}
                          <span
                            onClick={(e) => { e.stopPropagation(); if (caseId) navigate(`/${i18n.language}/intake-profesional/${caseId}`); }}
                            title={t('patientDetail.edit') || 'Edit'}
                            style={{ position: 'absolute', top: 8, right: 8, background: '#f1f3f5', border: '1px solid #e9ecef', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: '14px', color: '#000000' }}
                          >
                            ✏️
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {activeDetailTab === 'progress' && (
                    <div className="tab-panel">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <h3 className="form-block-title" style={{ color: '#000000', margin: 0 }}>🏥 {t('patientDetail.progressMilestones')}</h3>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            onClick={() => setShowAddMilestoneModal(true)}
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
                      </div>

                      {/* Three Column Layout */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr 1fr', 
                        gap: '20px', 
                        marginBottom: '20px',
                        minWidth: 0 // Allow columns to shrink below content size
                      }}>
                        {/* Emotional Column */}
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <h4 style={{ 
                            textAlign: 'center', 
                            padding: '12px', 
                            background: '#e74c3c', 
                            color: 'white', 
                            borderRadius: '8px 8px 0 0',
                            margin: '0 0 0 0',
                            fontSize: '16px',
                            fontWeight: 'bold'
                          }}>
                            רגשי
                          </h4>
                          <div 
                            style={{ 
                              border: '2px solid #e74c3c', 
                              borderTop: 'none', 
                              borderRadius: '0 0 8px 8px', 
                              minHeight: '400px', 
                              padding: '15px',
                              background: '#fafafa',
                              transition: 'background-color 0.2s ease'
                            }}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, 'emotional')}
                            onDragEnter={(e) => {
                              e.preventDefault();
                              if (draggedMilestone && draggedMilestone.axis !== 'emotional') {
                                e.currentTarget.style.backgroundColor = '#ffebee';
                              }
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.currentTarget.style.backgroundColor = '#fafafa';
                            }}
                          >
                            {milestones.filter(m => m.axis === 'emotional').map((milestone) => (
                              <MilestoneCard 
                                key={milestone.id} 
                                milestone={milestone} 
                                onEdit={handleEditMilestone}
                                onDragStart={handleDragStart}
                                isSelected={milestone.status === 'achieved'}
                                onSelect={(checked) => handleMilestoneSelect(milestone.id, checked)}
                              />
                            ))}
                            {milestones.filter(m => m.axis === 'emotional').length === 0 && (
                              <div style={{ textAlign: 'center', color: '#666', padding: '40px 20px' }}>
                                אין אבני דרך רגשיות
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Occupational Column */}
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <h4 style={{ 
                            textAlign: 'center', 
                            padding: '12px', 
                            background: '#3498db', 
                            color: 'white', 
                            borderRadius: '8px 8px 0 0',
                            margin: '0 0 0 0',
                            fontSize: '16px',
                            fontWeight: 'bold'
                          }}>
                            תעסוקתי
                          </h4>
                          <div 
                            style={{ 
                              border: '2px solid #3498db', 
                              borderTop: 'none', 
                              borderRadius: '0 0 8px 8px', 
                              minHeight: '400px', 
                              padding: '15px',
                              background: '#fafafa',
                              transition: 'background-color 0.2s ease'
                            }}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, 'occupational')}
                            onDragEnter={(e) => {
                              e.preventDefault();
                              if (draggedMilestone && draggedMilestone.axis !== 'occupational') {
                                e.currentTarget.style.backgroundColor = '#e3f2fd';
                              }
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.currentTarget.style.backgroundColor = '#fafafa';
                            }}
                          >
                            {milestones.filter(m => m.axis === 'occupational').map((milestone) => (
                              <MilestoneCard 
                                key={milestone.id} 
                                milestone={milestone} 
                                onEdit={handleEditMilestone}
                                onDragStart={handleDragStart}
                                isSelected={milestone.status === 'achieved'}
                                onSelect={(checked) => handleMilestoneSelect(milestone.id, checked)}
                              />
                            ))}
                            {milestones.filter(m => m.axis === 'occupational').length === 0 && (
                              <div style={{ textAlign: 'center', color: '#666', padding: '40px 20px' }}>
                                אין אבני דרך תעסוקתיות
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Rights Column */}
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <h4 style={{ 
                            textAlign: 'center', 
                            padding: '12px', 
                            background: '#2ecc71', 
                            color: 'white', 
                            borderRadius: '8px 8px 0 0',
                            margin: '0 0 0 0',
                            fontSize: '16px',
                            fontWeight: 'bold'
                          }}>
                            זכויות
                          </h4>
                          <div 
                            style={{ 
                              border: '2px solid #2ecc71', 
                              borderTop: 'none', 
                              borderRadius: '0 0 8px 8px', 
                              minHeight: '400px', 
                              padding: '15px',
                              background: '#fafafa',
                              transition: 'background-color 0.2s ease'
                            }}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, 'rights')}
                            onDragEnter={(e) => {
                              e.preventDefault();
                              if (draggedMilestone && draggedMilestone.axis !== 'rights') {
                                e.currentTarget.style.backgroundColor = '#e8f5e8';
                              }
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.currentTarget.style.backgroundColor = '#fafafa';
                            }}
                          >
                            {milestones.filter(m => m.axis === 'rights').map((milestone) => (
                              <MilestoneCard 
                                key={milestone.id} 
                                milestone={milestone} 
                                onEdit={handleEditMilestone}
                                onDragStart={handleDragStart}
                                isSelected={milestone.status === 'achieved'}
                                onSelect={(checked) => handleMilestoneSelect(milestone.id, checked)}
                              />
                            ))}
                            {milestones.filter(m => m.axis === 'rights').length === 0 && (
                              <div style={{ textAlign: 'center', color: '#666', padding: '40px 20px' }}>
                                אין אבני דרך זכויות
                              </div>
                            )}
                          </div>
                        </div>
                      </div>


                      {/* Legacy milestones without axis - show separately */}
                      {milestones.filter(m => !m.axis).length > 0 && (
                        <div style={{ marginTop: '30px' }}>
                          <h4 style={{ color: '#666', marginBottom: '15px' }}>אבני דרך ללא ציר</h4>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '20px'
                          }}>
                            {milestones.filter(m => !m.axis).map((milestone) => (
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
                                onClick={() => handleEditMilestone(milestone)}
                              >
                                <h4 style={{ color: '#000000', marginBottom: '8px' }}>{milestone.title}</h4>
                                <p style={{ color: '#666', marginBottom: '12px' }}>{milestone.description}</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ color: '#007bff' }}>Progress: {milestone.progress}%</span>
                                  <span style={{ color: '#28a745' }}>Status: {milestone.status}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}


                  {activeDetailTab === 'documents' && (
                    <div className="tab-panel">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 className="form-block-title" style={{ color: '#000000', margin: 0 }}>📄 {t('patientDetail.documents')}</h3>
                      </div>
                      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        {t('patientDetail.documentsComingSoon')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '18px', color: '#666666' }}>
                {t('patientDetail.noPatientData')}
              </div>
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
                background: 'white',
                borderRadius: '12px',
                padding: '30px',
                width: '90%',
                maxWidth: '500px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
              }}>
                <h3 style={{ color: '#000000', marginBottom: '20px', textAlign: 'center' }}>
                  {editingMeeting ? t('patientDetail.editMeeting') : t('patientDetail.addNewMeeting')}
                </h3>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ color: '#000000', display: 'block', marginBottom: '5px' }}>{t('patientDetail.meetingDescription')}</label>
                  <input
                    type="text"
                    value={newMeeting.description}
                    onChange={(e) => setNewMeeting({...newMeeting, description: e.target.value})}
                    placeholder={t('patientDetail.enterMeetingDescription')}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ color: '#000000', display: 'block', marginBottom: '5px' }}>{t('patientDetail.meetingDate')}</label>
                  <input
                    type="date"
                    value={newMeeting.date}
                    onChange={(e) => setNewMeeting({...newMeeting, date: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ color: '#000000', display: 'block', marginBottom: '5px' }}>{t('patientDetail.meetingNotes')}</label>
                  <textarea
                    value={newMeeting.notes}
                    onChange={(e) => setNewMeeting({...newMeeting, notes: e.target.value})}
                    placeholder={t('patientDetail.enterMeetingNotes')}
                    rows={4}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: '6px',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setShowAddMeetingModal(false);
                      setEditingMeeting(null);
                      setNewMeeting({ description: '', date: getTodayDate(), notes: '' });
                    }}
                    style={{
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {t('patientDetail.cancel')}
                  </button>
                  <button
                    onClick={handleAddMeeting}
                    style={{
                      background: '#007acc',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {editingMeeting ? t('patientDetail.saveChanges') : t('patientDetail.addMeetingButton')}
                  </button>
                </div>
              </div>
            </div>
          )}

      {/* Add Milestone Modal */}
      {showAddMilestoneModal && (
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
            background: 'white',
            borderRadius: '12px',
            padding: '30px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              onClick={() => {
                setShowAddMilestoneModal(false);
                setNewMilestone({ 
                  title: '', 
                  description: '', 
                  progress: 0, 
                  targetDate: '', 
                  status: 'in_progress',
                  axis: 'emotional',
                  successMetric: '',
                  resources: '',
                  barriers: '',
                  notes: '',
                  therapistNotes: ''
                });
              }}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
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
            
            <h3 style={{ color: '#000000', marginBottom: '20px', textAlign: 'center', paddingRight: '40px' }}>
              {t('patientDetail.addNewMilestone')}
            </h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#000000', display: 'block', marginBottom: '5px' }}>{t('patientDetail.title')}</label>
              <input
                type="text"
                value={newMilestone.title}
                onChange={(e) => setNewMilestone({...newMilestone, title: e.target.value})}
                placeholder={t('patientDetail.enterMilestoneTitle')}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
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
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#000000', display: 'block', marginBottom: '5px' }}>ציר</label>
              <select
                value={newMilestone.axis}
                onChange={(e) => setNewMilestone({...newMilestone, axis: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="emotional">רגשי</option>
                <option value="occupational">תעסוקתי</option>
                <option value="rights">זכויות</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#000000', display: 'block', marginBottom: '5px' }}>מדד הצלחה</label>
              <input
                type="text"
                value={newMilestone.successMetric}
                onChange={(e) => setNewMilestone({...newMilestone, successMetric: e.target.value})}
                placeholder="למשל: הורדה של חרדה מ8 פעמים בשבוע ל4 פעמים בשבוע"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#000000', display: 'block', marginBottom: '5px' }}>משאבים</label>
              <textarea
                value={newMilestone.resources}
                onChange={(e) => setNewMilestone({...newMilestone, resources: e.target.value})}
                placeholder="חוזקות/משאבים זמינים"
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#000000', display: 'block', marginBottom: '5px' }}>חסמים אפשריים</label>
              <textarea
                value={newMilestone.barriers}
                onChange={(e) => setNewMilestone({...newMilestone, barriers: e.target.value})}
                placeholder="חסמים פוטנציאליים"
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#000000', display: 'block', marginBottom: '5px' }}>סטטוס</label>
              <select
                value={newMilestone.status}
                onChange={(e) => setNewMilestone({...newMilestone, status: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="in_progress">בתהליך</option>
                <option value="achieved">הושג</option>
                <option value="frozen">בהקפאה</option>
                <option value="maintenance">שימור</option>
                <option value="stuck">נתקע</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#000000', display: 'block', marginBottom: '5px' }}>{t('patientDetail.targetDate')}</label>
              <input
                type="date"
                value={newMilestone.targetDate}
                onChange={(e) => setNewMilestone({...newMilestone, targetDate: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleAddMilestone}
                style={{
                  background: '#007acc',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {t('patientDetail.addMilestoneButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Milestone Modal */}
      {showEditMilestoneModal && (
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
            background: 'white',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Fixed Header: Title and Close Button on same row */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 30px 15px 30px',
              borderBottom: '1px solid #e9ecef',
              background: 'white',
              borderRadius: '12px 12px 0 0',
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <h3 style={{ 
                color: '#000000', 
                margin: 0,
                textAlign: 'center',
                flex: 1
              }}>
                {t('patientDetail.editMilestone')}
              </h3>
              <button
                onClick={() => {
                  setShowEditMilestoneModal(false);
                  setEditingMilestone(null);
                  setNewMilestone({ 
                    title: '', 
                    description: '', 
                    progress: 0, 
                    targetDate: '', 
                    status: 'in_progress',
                    axis: 'emotional',
                    successMetric: '',
                    resources: '',
                    barriers: '',
                    notes: '',
                    therapistNotes: ''
                  });
                }}
                style={{
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
            </div>
            
            {/* Scrollable Content */}
            <div style={{
              padding: '30px',
              overflowY: 'auto',
              flex: 1
            }}>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#000000', display: 'block', marginBottom: '5px' }}>{t('patientDetail.title')}</label>
              <input
                type="text"
                value={newMilestone.title}
                onChange={(e) => setNewMilestone({...newMilestone, title: e.target.value})}
                placeholder={t('patientDetail.enterMilestoneTitle')}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
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
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#000000', display: 'block', marginBottom: '5px' }}>ציר</label>
              <select
                value={newMilestone.axis}
                onChange={(e) => setNewMilestone({...newMilestone, axis: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="emotional">רגשי</option>
                <option value="occupational">תעסוקתי</option>
                <option value="rights">זכויות</option>
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#000000', display: 'block', marginBottom: '5px' }}>מדד הצלחה</label>
              <input
                type="text"
                value={newMilestone.successMetric}
                onChange={(e) => setNewMilestone({...newMilestone, successMetric: e.target.value})}
                placeholder="למשל: הורדה של חרדה מ8 פעמים בשבוע ל4 פעמים בשבוע"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#000000', display: 'block', marginBottom: '5px' }}>משאבים</label>
              <textarea
                value={newMilestone.resources}
                onChange={(e) => setNewMilestone({...newMilestone, resources: e.target.value})}
                placeholder="חוזקות/משאבים זמינים"
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#000000', display: 'block', marginBottom: '5px' }}>חסמים אפשריים</label>
              <textarea
                value={newMilestone.barriers}
                onChange={(e) => setNewMilestone({...newMilestone, barriers: e.target.value})}
                placeholder="חסמים פוטנציאליים"
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#000000', display: 'block', marginBottom: '5px' }}>הערות מטפל</label>
              <textarea
                value={newMilestone.therapistNotes}
                onChange={(e) => setNewMilestone({...newMilestone, therapistNotes: e.target.value})}
                placeholder="הערות ומחשבות מטפל"
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#000000', display: 'block', marginBottom: '5px' }}>{t('patientDetail.progress')}</label>
              <div style={{ display: 'flex', gap: '2px', marginBottom: '10px' }}>
                {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((value) => (
                  <div
                    key={value}
                    onClick={() => setNewMilestone({...newMilestone, progress: value})}
                    style={{
                      flex: 1,
                      height: '30px',
                      backgroundColor: newMilestone.progress >= value ? '#007acc' : '#e9ecef',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: newMilestone.progress >= value ? 'white' : '#666',
                      borderRadius: value === 0 ? '4px 0 0 4px' : value === 100 ? '0 4px 4px 0' : '0',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (newMilestone.progress < value) {
                        e.currentTarget.style.backgroundColor = '#cce7ff';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (newMilestone.progress < value) {
                        e.currentTarget.style.backgroundColor = '#e9ecef';
                      }
                    }}
                  >
                    {value}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>
                {t('patientDetail.currentProgress')}: {newMilestone.progress}%
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: '#000000', display: 'block', marginBottom: '5px' }}>{t('patientDetail.status')}</label>
              <select
                value={newMilestone.status}
                onChange={(e) => setNewMilestone({...newMilestone, status: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="in_progress">בתהליך</option>
                <option value="achieved">הושג</option>
                <option value="frozen">בהקפאה</option>
                <option value="maintenance">שימור</option>
                <option value="stuck">נתקע</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ color: '#000000', display: 'block', marginBottom: '5px' }}>{t('patientDetail.targetDate')}</label>
              <input
                type="date"
                value={newMilestone.targetDate}
                onChange={(e) => setNewMilestone({...newMilestone, targetDate: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => editingMilestone && handleDeleteMilestone(editingMilestone.id)}
                style={{
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {t('patientDetail.deleteMilestone')}
              </button>
              <button
                onClick={handleUpdateMilestone}
                style={{
                  background: '#007acc',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {t('patientDetail.saveChanges')}
              </button>
            </div>
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
      <DialogComponent />
    </>
  );
}

// Milestone Card Component for 3-column layout
function MilestoneCard({ milestone, onEdit, onDragStart, isSelected, onSelect }: { 
  milestone: any; 
  onEdit: (milestone: any) => void;
  onDragStart?: (milestone: any) => void;
  isSelected?: boolean;
  onSelect?: (checked: boolean) => void;
}) {
  const { t } = useTranslation();
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'achieved': return '#28a745';
      case 'in_progress': return '#007bff';
      case 'frozen': return '#6c757d';
      case 'maintenance': return '#17a2b8';
      case 'stuck': return '#dc3545';
      case 'new': return '#007acc';
      default: return '#6c757d';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return t('patientDetail.statusNew');
      case 'in_progress': return t('patientDetail.statusInProgress');
      case 'achieved': return t('patientDetail.statusAchieved');
      case 'frozen': return t('patientDetail.statusFrozen');
      case 'maintenance': return t('patientDetail.statusMaintenance');
      case 'stuck': return t('patientDetail.statusStuck');
      default: return status;
    }
  };

  return (
    <div
      onClick={() => onEdit(milestone)}
      style={{
        background: 'white',
        border: '1px solid #e9ecef',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '12px',
        cursor: 'pointer',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.2s ease',
        minWidth: 0, // Allow card to shrink
        overflow: 'hidden' // Prevent content overflow
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      }}
    >
      {/* Card Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {onSelect && (
            <input
              type="checkbox"
              checked={isSelected || false}
              onChange={(e) => {
                e.stopPropagation();
                onSelect(e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
              style={{ 
                margin: 0,
                cursor: 'pointer',
                transform: 'scale(1.1)'
              }}
            />
          )}
          <h5 style={{ 
            margin: 0, 
            fontSize: '14px', 
            fontWeight: 'bold', 
            color: '#000000',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {milestone.title}
          </h5>
        </div>
      </div>

      {/* Description - Second position */}
      {milestone.description && (
        <div style={{ 
          fontSize: '12px', 
          color: '#000000',
          marginBottom: '10px',
          lineHeight: '1.4',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical'
        }}>
          <span style={{ color: '#000000' }}>
            {milestone.description}
          </span>
        </div>
      )}

      {/* Progress - Same style as edit dialog */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '2px', marginBottom: '10px' }}>
          {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((value) => (
            <div
              key={value}
              style={{
                flex: 1,
                height: '30px',
                backgroundColor: milestone.progress >= value ? '#007acc' : '#e9ecef',
                cursor: 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: milestone.progress >= value ? 'white' : '#000000',
                borderRadius: value === 0 ? '4px 0 0 4px' : value === 100 ? '0 4px 4px 0' : '0',
                transition: 'background-color 0.2s ease'
              }}
            >
              {value}
            </div>
          ))}
        </div>
        <div style={{ fontSize: '14px', color: '#000000', textAlign: 'center' }}>
          {t('patientDetail.currentProgress')}: {milestone.progress || 0}%
        </div>
      </div>

      {/* Success Metric */}
      {milestone.successMetric && (
        <div style={{ 
          fontSize: '11px', 
          color: '#000000', 
          marginBottom: '6px',
          fontWeight: 'bold',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          🎯 {milestone.successMetric}
        </div>
      )}

      {/* Resources */}
      {milestone.resources && (
        <div style={{ 
          fontSize: '11px', 
          color: '#000000', 
          marginBottom: '6px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          💪 {milestone.resources}
        </div>
      )}

      {/* Barriers */}
      {milestone.barriers && (
        <div style={{ 
          fontSize: '11px', 
          color: '#000000', 
          marginBottom: '6px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          ⚠️ {milestone.barriers}
        </div>
      )}

      {/* Bottom Row: Date, Drag Handle, Status */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '10px',
          paddingTop: '8px',
          borderTop: '1px solid #e9ecef'
        }}
        onClick={(e) => e.stopPropagation()} // Prevent card click when clicking bottom area
      >
        <div
          style={{
            color: '#000000',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {milestone.targetDate ? (
            <>
              📅 {new Date(milestone.targetDate).toLocaleDateString('he-IL')}
            </>
          ) : milestone.createdAt ? (
            <>
              📅 {new Date(milestone.createdAt).toLocaleDateString('he-IL')}
            </>
          ) : (
            <span style={{ color: '#000000' }}>אין תאריך</span>
          )}
        </div>

        <span
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            if (onDragStart) {
              onDragStart(milestone);
            }
            e.dataTransfer.setData('text/plain', JSON.stringify(milestone));
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragEnd={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          style={{
            color: '#999',
            fontSize: '14px',
            cursor: 'grab',
            padding: '4px 8px',
            borderRadius: '4px',
            transition: 'all 0.2s ease',
            userSelect: 'none'
          }}
          onMouseDown={(e) => e.stopPropagation()} // Prevent card click
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f8f9fa';
            e.currentTarget.style.color = '#666';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#999';
          }}
          title="גרור לעמודה אחרת"
        >
          ⋮⋮
        </span>

        <span
          style={{
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            background: getStatusColor(milestone.status),
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          {getStatusLabel(milestone.status)}
        </span>
      </div>
    </div>
  );
}
