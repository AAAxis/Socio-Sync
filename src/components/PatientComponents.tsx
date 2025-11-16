import React, { useEffect, useState, useRef } from 'react';
import { formatDate } from '../utils';
import { getApiUrl } from '../config';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Component to display patient name from PostgreSQL
export function PatientNameDisplay({ caseId }: { caseId: string }) {
  const [name, setName] = useState<string>('Loading...');
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState<boolean>(false);

  useEffect(() => {
    // Prevent multiple calls for the same caseId
    if (hasFetched) return;
    
    const fetchPatientName = async () => {
      try {
        setHasFetched(true);
        const response = await fetch(getApiUrl(`/api/patients/${caseId}`));
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.patient && data.patient.first_name && data.patient.last_name) {
            setName(`${data.patient.first_name} ${data.patient.last_name}`);
          } else {
            setName('Name Not Available');
          }
        } else if (response.status === 404) {
          setName('Patient Not Found');
        } else {
          setName('Error Loading');
        }
      } catch (err) {
        setName('Error Loading');
      }
    };

    fetchPatientName();
  }, [caseId, hasFetched]);

  if (error) {
    return <span style={{ color: '#ff6b6b' }}>Error</span>;
  }

  return <span>{name}</span>;
}

// Component to display patient date of birth from PostgreSQL
export function PatientDOBDisplay({ caseId }: { caseId: string }) {
  const [dob, setDob] = useState<string>('Loading...');
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState<boolean>(false);

  useEffect(() => {
    // Prevent multiple calls for the same caseId
    if (hasFetched) return;
    
    const fetchPatientDOB = async () => {
      try {
        setHasFetched(true);
        const response = await fetch(getApiUrl(`/api/patients/${caseId}`));
        if (response.ok) {
          const data = await response.json();
          setDob(formatDate(data.patient.date_of_birth));
        } else if (response.status === 404) {
          setDob('Patient Not Found');
        } else {
          setDob('Error Loading');
        }
      } catch (err) {
        setDob('Error Loading');
      }
    };

    fetchPatientDOB();
  }, [caseId, hasFetched]);

  if (error) {
    return <span style={{ color: '#ff6b6b' }}>Error</span>;
  }

  return <span>{dob}</span>;
}

// Component to display patient notes from Firebase
export function PatientNotesDisplay({ caseId }: { caseId: string }) {
  const [notes, setNotes] = useState<string>('Loading...');
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState<boolean>(false);

  useEffect(() => {
    // Prevent multiple calls for the same caseId
    if (hasFetched) return;
    
    const fetchPatientNotes = async () => {
      try {
        setHasFetched(true);
        // Load notes from Firebase instead of PostgreSQL
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const patientDocRef = doc(db, 'patients', caseId);
        const patientDoc = await getDoc(patientDocRef);
        
        if (patientDoc.exists()) {
          const firebaseData = patientDoc.data();
          const patientNotes = firebaseData.notes || '';
          // Truncate notes if too long for table display
          setNotes(patientNotes.length > 50 ? patientNotes.substring(0, 50) + '...' : patientNotes);
        } else {
          setNotes('N/A');
        }
      } catch (err) {
        setNotes('Error Loading');
      }
    };

    fetchPatientNotes();
  }, [caseId, hasFetched]);

  if (error) {
    return <span style={{ color: '#ff6b6b' }}>Error</span>;
  }

  return <span title={notes === 'N/A' ? '' : notes}>{notes || 'No notes'}</span>;
}

// Google Places Search Component using working Autocomplete API
export function GooglePlacesSearch({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

  useEffect(() => {
    // Wait for Google Maps API to be fully loaded
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps && window.google.maps.places) {
        console.log('Google Maps API loaded successfully');
        setIsGoogleLoaded(true);
      } else {
        console.log('Waiting for Google Maps API...');
        setTimeout(checkGoogleMaps, 100);
      }
    };
    
    checkGoogleMaps();
  }, []);

  useEffect(() => {
    if (isGoogleLoaded && inputRef.current && !autocompleteRef.current) {
      console.log('Initializing Google Places Autocomplete');
      
      // Suppress the deprecation warning by catching it
      const originalWarn = console.warn;
      console.warn = (...args) => {
        if (args[0] && args[0].includes && args[0].includes('google.maps.places.Autocomplete')) {
          // Skip the deprecation warning
          return;
        }
        originalWarn.apply(console, args);
      };

      try {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          fields: ['formatted_address', 'geometry', 'name']
        });

        console.log('Autocomplete initialized successfully');

        // Add place selection listener
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          console.log('Place selected:', place);
          if (place?.formatted_address) {
            onChange(place.formatted_address);
          }
        });
      } catch (error) {
        console.error('Error initializing Google Places Autocomplete:', error);
      } finally {
        // Restore original console.warn
        console.warn = originalWarn;
      }
    }

    return () => {
      if (autocompleteRef.current && window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isGoogleLoaded, onChange]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="form-input"
      style={{ paddingLeft: '40px' }}
    />
  );
}

// Component to display user email from Firebase using user ID
export function PatientCreatedByDisplay({ userId }: { userId: string }) {
  const [email, setEmail] = useState<string>('Loading...');
  const [name, setName] = useState<string>('');
  const [picture, setPicture] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState<boolean>(false);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  useEffect(() => {
    // Prevent multiple calls for the same userId
    if (hasFetched) return;
    
    const fetchUserData = async () => {
      try {
        setHasFetched(true);
        
        // If userId is already an email, use it directly
        if (userId.includes('@')) {
          setEmail(userId);
          setName(userId.split('@')[0]); // Use part before @ as name
          setPicture(''); // No picture for email-only users
          return;
        }
        
        // Fetch user data from Firebase
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as any;
          if (userData.email) {
            setEmail(userData.email);
            setName(userData.name || userData.email.split('@')[0]);
            setPicture(userData.picture || '');
          } else {
            setEmail('Unknown User');
            setName('?');
            setPicture('');
          }
        } else {
          setEmail('User Not Found');
          setName('?');
          setPicture('');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setEmail('Error Loading');
        setName('?');
        setPicture('');
      }
    };

    if (userId) {
      fetchUserData();
    } else {
      setEmail('Unknown');
      setName('?');
      setPicture('');
    }
  }, [userId, hasFetched]);

  if (error) {
    return <span style={{ color: '#ff6b6b' }}>Error</span>;
  }

  // Show profile picture first, fallback to person icon
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block'
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: picture ? 'transparent' : '#6c757d',
          color: 'white',
          fontSize: '12px',
          cursor: 'pointer',
          overflow: 'hidden',
          border: picture ? '1px solid #ddd' : 'none'
        }}
      >
        {picture ? (
          <img
            src={picture}
            alt="Profile"
            onError={(e) => {
              // Hide the image and show icon instead when image fails to load
              e.currentTarget.style.display = 'none';
              setPicture('');
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <span style={{ fontSize: '12px' }}>👤</span>
        )}
      </div>
      
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#333',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          {email}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '4px solid #333'
            }}
          />
        </div>
      )}
    </div>
  );
}

// Component to display assigned user avatar with email on hover
export function AssignedUserAvatar({ userId }: { userId: string }) {
  const [email, setEmail] = useState<string>('Loading...');
  const [name, setName] = useState<string>('');
  const [picture, setPicture] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState<boolean>(false);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  useEffect(() => {
    // Prevent multiple calls for the same userId
    if (hasFetched) return;
    
    const fetchUserData = async () => {
      try {
        setHasFetched(true);
        
        // If userId is already an email, use it directly
        if (userId.includes('@')) {
          setEmail(userId);
          setName(userId.split('@')[0]); // Use part before @ as name
          setPicture(''); // No picture for email-only users
          return;
        }
        
        // Fetch user data from Firebase
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as any;
          if (userData.email) {
            setEmail(userData.email);
            setName(userData.name || userData.email.split('@')[0]);
            setPicture(userData.picture || '');
          } else {
            setEmail('Unknown User');
            setName('?');
            setPicture('');
          }
        } else {
          setEmail('User Not Found');
          setName('?');
          setPicture('');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setEmail('Error Loading');
        setName('?');
        setPicture('');
      }
    };

    if (userId) {
      fetchUserData();
    } else {
      setEmail('Unknown');
      setName('?');
      setPicture('');
    }
  }, [userId, hasFetched]);

  if (error) {
    return <span style={{ color: '#ff6b6b' }}>Error</span>;
  }

  // Show profile picture first, fallback to person icon
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block'
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: picture ? 'transparent' : '#6c757d',
          color: 'white',
          fontSize: '10px',
          cursor: 'pointer',
          margin: '1px',
          overflow: 'hidden',
          border: picture ? '1px solid #ddd' : 'none'
        }}
      >
        {picture ? (
          <img
            src={picture}
            alt="Profile"
            onError={(e) => {
              // Hide the image and show icon instead when image fails to load
              e.currentTarget.style.display = 'none';
              setPicture('');
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <span style={{ fontSize: '10px' }}>👤</span>
        )}
      </div>
      
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: '25px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#333',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          {email}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '4px solid #333'
            }}
          />
        </div>
      )}
    </div>
  );
}
