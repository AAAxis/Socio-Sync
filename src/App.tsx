import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { CreateEventPage } from './components/CreateEventPage';
import { IntakeRightsPage } from './components/IntakeRightsPage';
import { IntakeEmotionalPage } from './components/IntakeEmotionalPage';
import { IntakeProfesionalPage } from './components/IntakeProfesionalPage';
import { EmailVerificationPage } from './components/EmailVerificationPage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsPage } from './components/TermsPage';

// Language wrapper component to handle language from URL
function LanguageWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  useEffect(() => {
    const path = location.pathname;
    const langMatch = path.match(/^\/(he|en)(\/|$)/);
    
    // Don't redirect verify-email paths as they need to work without language prefix
    if (path === '/verify-email' || path.startsWith('/verify-email')) {
      return;
    }
    
    if (langMatch) {
      const lang = langMatch[1];
      if (i18n.language !== lang) {
        i18n.changeLanguage(lang);
      }
    } else {
      // No language prefix - redirect to current language version, preserving search params
      const currentLang = i18n.language === 'he' ? 'he' : 'en';
      const search = location.search; // Preserve query parameters
      navigate(`/${currentLang}${path}${search}`, { replace: true });
    }
  }, [location.pathname, location.search, i18n, navigate]);

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Email verification route - must be before catch-all routes */}
      <Route path="/verify-email" element={<EmailVerificationPage />} />
      <Route path="/:lang/verify-email" element={<EmailVerificationPage />} />
      
      {/* Routes with language prefix */}
      <Route path="/:lang" element={<LoginPage />} />
      <Route path="/:lang/login" element={<PasswordLoginPage />} />
      <Route path="/:lang/reset-password" element={<PasswordResetPage />} />
      <Route path="/:lang/create" element={<CreateAccountPage />} />
      <Route path="/:lang/dashboard" element={<MainDashboard />} />
      <Route path="/:lang/edit-user/:userId" element={<EditUserPage />} />
      <Route path="/:lang/create-patient" element={<CreatePatientPage />} />
      <Route path="/:lang/patient/:caseId" element={<PatientDetailPage />} />
      <Route path="/:lang/intake-rights/:caseId" element={<IntakeRightsPage />} />
      <Route path="/:lang/intake-emotional/:caseId" element={<IntakeEmotionalPage />} />
      <Route path="/:lang/intake-profesional/:caseId" element={<IntakeProfesionalPage />} />
      <Route path="/:lang/create-event" element={<CreateEventPage />} />
      <Route path="/:lang/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/:lang/terms" element={<TermsPage />} />
      
      {/* Fallback routes without language prefix - will be redirected */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<PasswordLoginPage />} />
      <Route path="/reset-password" element={<PasswordResetPage />} />
      <Route path="/create" element={<CreateAccountPage />} />
      <Route path="/dashboard" element={<MainDashboard />} />
      <Route path="/edit-user/:userId" element={<EditUserPage />} />
      <Route path="/create-patient" element={<CreatePatientPage />} />
      <Route path="/patient/:caseId" element={<PatientDetailPage />} />
      <Route path="/intake-rights/:caseId" element={<IntakeRightsPage />} />
      <Route path="/intake-emotional/:caseId" element={<IntakeEmotionalPage />} />
      <Route path="/intake-profesional/:caseId" element={<IntakeProfesionalPage />} />
      <Route path="/create-event" element={<CreateEventPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/en" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <LanguageWrapper>
        <AppRoutes />
      </LanguageWrapper>
    </Router>
  );
}

export default App;