import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Import all the extracted components
import { LoginPage } from './components/LoginPage';
import { PasswordLoginPage } from './components/PasswordLoginPage';
import { CreateAccountPage } from './components/CreateAccountPage';
import { PasswordResetPage } from './components/PasswordResetPage';
import MainDashboard from './Dashboard';
import { EditUserPage } from './components/EditUserPage';
import { CreatePatientPage } from './components/CreatePatientPage';
import { PatientDetailPage } from './components/PatientDetailPage';
import { IntakeFormPage } from './components/IntakeFormPage';
import { CreateEventPage } from './components/CreateEventPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<PasswordLoginPage />} />
        <Route path="/reset-password" element={<PasswordResetPage />} />
        <Route path="/create" element={<CreateAccountPage />} />
        <Route path="/dashboard" element={<MainDashboard />} />
        <Route path="/edit-user/:userId" element={<EditUserPage />} />
        <Route path="/create-patient" element={<CreatePatientPage />} />
        <Route path="/patient/:caseId" element={<PatientDetailPage />} />
        <Route path="/intake/:caseId" element={<IntakeFormPage />} />
        <Route path="/create-event" element={<CreateEventPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;