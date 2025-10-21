import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';

/**
 * Custom hook that provides language-aware navigation
 * Automatically prefixes paths with the current language
 */
export function useLanguageNavigate() {
  const navigate = useNavigate();
  const location = useLocation();

  const languageNavigate = useCallback((path: string, options?: any) => {
    // Extract current language from path
    const langMatch = location.pathname.match(/^\/(he|en)(\/|$)/);
    const currentLang = langMatch ? langMatch[1] : 'en';
    
    // Don't add language prefix if path already has one
    if (path.match(/^\/(he|en)(\/|$)/)) {
      navigate(path, options);
    } else {
      // Add current language prefix
      const langPath = `/${currentLang}${path}`;
      navigate(langPath, options);
    }
  }, [navigate, location.pathname]);

  return languageNavigate;
}

/**
 * Get the current language from the URL
 */
export function useCurrentLanguage(): 'en' | 'he' {
  const location = useLocation();
  const langMatch = location.pathname.match(/^\/(he|en)(\/|$)/);
  return langMatch && (langMatch[1] === 'he' || langMatch[1] === 'en') 
    ? langMatch[1] as 'en' | 'he'
    : 'en';
}

