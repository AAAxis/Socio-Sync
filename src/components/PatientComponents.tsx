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
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState<boolean>(false);

  useEffect(() => {
    // Prevent multiple calls for the same userId
    if (hasFetched) return;
    
    const fetchUserEmail = async () => {
      try {
        setHasFetched(true);
        
        // If userId is already an email, use it directly
        if (userId.includes('@')) {
          setEmail(userId);
          return;
        }
        
        // Fetch user email from Firebase
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data() as any;
          if (userData.email) {
            setEmail(userData.email);
          } else {
            setEmail('Unknown User');
          }
        } else {
          setEmail('User Not Found');
        }
      } catch (err) {
        console.error('Error fetching user email:', err);
        setEmail('Error Loading');
      }
    };

    if (userId) {
      fetchUserEmail();
    } else {
      setEmail('Unknown');
    }
  }, [userId, hasFetched]);

  if (error) {
    return <span style={{ color: '#ff6b6b' }}>Error</span>;
  }

  return <span>{email}</span>;
}
